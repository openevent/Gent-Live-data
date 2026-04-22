import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ═════════════════════════════════════════════════════════════════════════
// Central data layer — every page reads from here, nothing re-fetches
// ═════════════════════════════════════════════════════════════════════════

const API = "/api/gent";

// ─── Real API fetchers ──────────────────────────────────────────────────

export async function fetchParking() {
  const r = await fetch(`${API}?dataset=bezetting-parkeergarages-real-time&limit=30`);
  if (!r.ok) throw new Error("parking");
  const d = await r.json();
  return (d.results || []).map((x) => {
    const total = Number(x.totalcapacity ?? x.totaalcapaciteit ?? 0);
    const free  = Number(x.availablecapacity ?? x.availablespaces ?? 0);
    const occ   = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    // The Opendatasoft API returns coordinates in several possible shapes —
    // try all of them. This is the fix for "locations not accurate".
    let coords = null;
    if (x.location?.lon != null && x.location?.lat != null) {
      coords = { lng: Number(x.location.lon), lat: Number(x.location.lat) };
    } else if (x.geo_point_2d?.lon != null) {
      coords = { lng: Number(x.geo_point_2d.lon), lat: Number(x.geo_point_2d.lat) };
    } else if (Array.isArray(x.geo_point_2d) && x.geo_point_2d.length === 2) {
      coords = { lat: Number(x.geo_point_2d[0]), lng: Number(x.geo_point_2d[1]) };
    } else if (x.longitude != null && x.latitude != null) {
      coords = { lng: Number(x.longitude), lat: Number(x.latitude) };
    }
    return {
      name: x.name || x.description || "Parking",
      total, free, occupation: occ,
      coords,
      urlLinkAddress: x.urllinkaddress || null,
      openNow: x.isopennow !== false && x.isopennow !== "false",
    };
  });
}

export async function fetchAir() {
  const r = await fetch(`${API}?dataset=luchtkwaliteit-gent&limit=20`);
  if (!r.ok) throw new Error("air");
  const d = await r.json();
  return (d.results || []).map((x) => ({
    station: x.station_name || x.name || "Station",
    no2:  Number(x.no2 ?? x.value_no2 ?? 0),
    pm25: Number(x.pm25 ?? x.value_pm25 ?? 0),
    pm10: Number(x.pm10 ?? x.value_pm10 ?? 0),
    coords: x.geo_point_2d
      ? { lng: Number(x.geo_point_2d.lon ?? x.geo_point_2d[1]), lat: Number(x.geo_point_2d.lat ?? x.geo_point_2d[0]) }
      : null,
  }));
}

export async function fetchEvents() {
  const r = await fetch(`${API}?dataset=cultuur-events-gent&limit=20&order_by=startdate`);
  if (!r.ok) throw new Error("events");
  const d = await r.json();
  return (d.results || []).map((x) => ({
    title: x.title || x.titel || "Event",
    where: x.location || x.locatie || "Gent",
    when:  x.startdate || x.datum || "",
    url:   x.url || x.link || null,
    description: x.description || x.beschrijving || null,
  }));
}

// ─── Open-Meteo weather (free, no key) ─────────────────────────────────
export async function fetchWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=51.0536&longitude=3.7250" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day" +
    "&hourly=precipitation_probability,temperature_2m,weather_code" +
    "&forecast_days=2" +
    "&timezone=Europe%2FBrussels";
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather");
  const d = await r.json();
  return {
    temp: Math.round(d.current?.temperature_2m ?? 0),
    feels: Math.round(d.current?.apparent_temperature ?? 0),
    humidity: Math.round(d.current?.relative_humidity_2m ?? 0),
    code: d.current?.weather_code ?? 0,
    wind: Math.round(d.current?.wind_speed_10m ?? 0),
    precip: d.current?.precipitation ?? 0,
    isDay: !!d.current?.is_day,
    rainChance: Math.max(
      ...(d.hourly?.precipitation_probability?.slice(0, 6) ?? [0])
    ),
    hourlyTemp: d.hourly?.temperature_2m?.slice(0, 24) ?? [],
    hourlyCode: d.hourly?.weather_code?.slice(0, 24) ?? [],
    hourlyRain: d.hourly?.precipitation_probability?.slice(0, 24) ?? [],
  };
}

// ─── Weather helpers ───────────────────────────────────────────────────
export function describeWeather(code) {
  if (code === 0)                 return { label: "Clear",          icon: "sun" };
  if (code <= 2)                  return { label: "Partly cloudy",  icon: "cloud-sun" };
  if (code === 3)                 return { label: "Overcast",       icon: "cloud" };
  if (code >= 45 && code <= 48)   return { label: "Foggy",          icon: "cloud-fog" };
  if (code >= 51 && code <= 57)   return { label: "Drizzle",        icon: "cloud-drizzle" };
  if (code >= 61 && code <= 67)   return { label: "Rain",           icon: "cloud-rain" };
  if (code >= 71 && code <= 77)   return { label: "Snow",           icon: "cloud-snow" };
  if (code >= 80 && code <= 82)   return { label: "Showers",        icon: "cloud-rain" };
  if (code >= 85 && code <= 86)   return { label: "Snow showers",   icon: "cloud-snow" };
  if (code >= 95)                 return { label: "Thunderstorm",   icon: "cloud-lightning" };
  return { label: "Weather", icon: "cloud" };
}

export function weatherQuip({ code, temp, wind, rainChance, isDay }) {
  if (code >= 95) return "Thunderstorm — probably stay in.";
  if (code >= 61 && code <= 82) return "Rain out there — jacket up.";
  if (code >= 51 && code <= 57) return "Light drizzle. Typical.";
  if (code >= 45 && code <= 48) return "Mist over the canals.";
  if (rainChance > 60) return "Umbrella for later, just in case.";
  if (temp >= 22 && code <= 2) return "Terrace weather.";
  if (temp >= 18 && code <= 2) return "Perfect for a bike ride.";
  if (temp < 5) return "Cold. Gloves.";
  if (temp < 10 && code <= 2) return "Crisp but clear.";
  if (wind > 25) return "Strong wind — cycle with care.";
  if (!isDay && code <= 2) return "Clear night over the towers.";
  if (code <= 2) return "Sun out.";
  return "Mild day.";
}

// ═════════════════════════════════════════════════════════════════════════
// DataContext — providing live data to every page
// ═════════════════════════════════════════════════════════════════════════

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

// Fallbacks so UI never feels broken while fetching
const FALLBACK = {
  parking: [
    { name: "Kouter",            occupation: 78, total: 400,  free: 88,  coords: { lng: 3.7227, lat: 51.0510 } },
    { name: "Vrijdagmarkt",      occupation: 92, total: 600,  free: 48,  coords: { lng: 3.7279, lat: 51.0568 } },
    { name: "Sint-Pietersplein", occupation: 64, total: 680,  free: 245, coords: { lng: 3.7264, lat: 51.0435 } },
    { name: "Ramen",             occupation: 41, total: 320,  free: 189, coords: { lng: 3.7170, lat: 51.0526 } },
    { name: "Reep",              occupation: 85, total: 490,  free: 74,  coords: { lng: 3.7290, lat: 51.0532 } },
    { name: "Savaanstraat",      occupation: 56, total: 320,  free: 141, coords: { lng: 3.7261, lat: 51.0476 } },
    { name: "B-Park The Loop",   occupation: 23, total: 2500, free: 1925, coords: { lng: 3.6804, lat: 51.0159 } },
    { name: "Dampoort",          occupation: 71, total: 210,  free: 61,  coords: { lng: 3.7440, lat: 51.0599 } },
  ],
  air: [
    { station: "Baudelo",              no2: 18, pm25: 9,  pm10: 14, coords: { lng: 3.7313, lat: 51.0569 } },
    { station: "Lange Violettestraat", no2: 24, pm25: 11, pm10: 16, coords: { lng: 3.7288, lat: 51.0478 } },
    { station: "Muide",                no2: 31, pm25: 14, pm10: 22, coords: { lng: 3.7165, lat: 51.0666 } },
    { station: "Gent Centrum",         no2: 27, pm25: 12, pm10: 19, coords: { lng: 3.7250, lat: 51.0536 } },
  ],
  events: [
    { title: "Ghent Festivities — Opening",  where: "Sint-Baafsplein",  when: "Today · 20:00" },
    { title: "Light Festival Preview Walk",  where: "Korenmarkt",       when: "Tomorrow · 19:30" },
    { title: "Film Fest Ghent — Shorts",     where: "Sphinx Cinema",    when: "Sat · 21:00" },
    { title: "Jazz at Handelsbeurs",         where: "Kouter 29",        when: "Sun · 20:30" },
    { title: "Spring Book Fair",             where: "ICC Citadelpark",  when: "Next week" },
    { title: "NTGent — The Inspector",       where: "Sint-Baafsplein",  when: "Fri · 20:15" },
    { title: "Opera Flanders — La Traviata", where: "Opera Gent",       when: "Thu · 19:45" },
    { title: "STAM — Night at the Museum",   where: "Godshuizenlaan",   when: "Sat · 18:00" },
  ],
  weather: { temp: 12, feels: 10, humidity: 72, code: 2, wind: 14, precip: 0.2, rainChance: 35, isDay: true, hourlyTemp: [], hourlyCode: [], hourlyRain: [] },
};

export function DataProvider({ children }) {
  const [parking, setParking] = useState(FALLBACK.parking);
  const [air, setAir]         = useState(FALLBACK.air);
  const [events, setEvents]   = useState(FALLBACK.events);
  const [weather, setWeather] = useState(FALLBACK.weather);
  const [liveMode, setLiveMode] = useState({ parking: false, air: false, events: false, weather: false });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      fetchParking(), fetchAir(), fetchEvents(), fetchWeather(),
    ]);

    if (results[0].status === "fulfilled" && results[0].value.length) {
      setParking(results[0].value);
      setLiveMode((m) => ({ ...m, parking: true }));
    }
    if (results[1].status === "fulfilled" && results[1].value.length) {
      setAir(results[1].value);
      setLiveMode((m) => ({ ...m, air: true }));
    }
    if (results[2].status === "fulfilled" && results[2].value.length) {
      setEvents(results[2].value);
      setLiveMode((m) => ({ ...m, events: true }));
    }
    if (results[3].status === "fulfilled") {
      setWeather(results[3].value);
      setLiveMode((m) => ({ ...m, weather: true }));
    }

    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  const value = { parking, air, events, weather, liveMode, lastUpdate, loading, refresh: loadAll };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ─── Derived status helpers ────────────────────────────────────────────
export const STATUS = {
  ok:    { color: "#22C55E", label: "Clear",    key: "ok" },
  warn:  { color: "#F59E0B", label: "Moderate", key: "warn" },
  alert: { color: "#EF4444", label: "Critical", key: "alert" },
  info:  { color: "#94A3B8", label: "Info",     key: "info" },
};

export const occStatus = (o) => (o < 60 ? STATUS.ok : o < 85 ? STATUS.warn : STATUS.alert);
export const airStatus = (n) => (n < 25 ? STATUS.ok : n < 40 ? STATUS.warn : STATUS.alert);
