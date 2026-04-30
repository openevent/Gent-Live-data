import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity, Wind, Car, Bike, RefreshCw,
  CircleAlert, CircleCheck, MapPin, ArrowUpRight,
  Zap, Radio, Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning,
  CloudFog, Droplets, Trash2, Train, Waves, Sparkles, Compass, Disc3, Music,
} from "lucide-react";
import MiniMap, { lookupVenue, lookupParking, lookupAirStation } from "./MiniMap.jsx";
import Terraces from "./Terraces.jsx";
import ThreeTowers from "./ThreeTowers.jsx";
import {
  fetchWeather, describeWeather, gemOfTheDay,
  WATER_SPOTS, TRANSIT_STOPS, NIGHTLIFE_VENUES,
} from "./ghent-data.js";

// ═══════════════════════════════════════════════════════════════════════════
// DATA LAYER — unchanged from original
// ═══════════════════════════════════════════════════════════════════════════

const ODS_BASE = "https://data.stad.gent/api/explore/v2.1";

const WEATHER_FALLBACK = {
  temp: null, feels: null, humidity: null, code: 0, wind: null,
  precip: 0, rainChance: 0, hourlyTemp: [],
};

const STATUS = {
  ok:    { color: "#22C55E", label: "Clear",    ring: "rgba(34,197,94,0.25)"  },
  warn:  { color: "#F59E0B", label: "Moderate", ring: "rgba(245,158,11,0.25)" },
  alert: { color: "#EF4444", label: "Critical", ring: "rgba(239,68,68,0.25)"  },
  info:  { color: "#94A3B8", label: "Info",     ring: "rgba(148,163,184,0.25)" },
};

const occStatus = (o) => (o < 60 ? STATUS.ok : o < 85 ? STATUS.warn : STATUS.alert);
const airStatus = (n) => (n < 25 ? STATUS.ok : n < 40 ? STATUS.warn : STATUS.alert);

function weatherQuip({ code, temp, wind, rainChance }) {
  if (code >= 95) return "Thunderstorm incoming — head inside.";
  if (code >= 61 && code <= 82) return "Rain jacket required today.";
  if (code >= 51 && code <= 57) return "Light drizzle — classic Ghent.";
  if (code >= 45 && code <= 48) return "Mist over the Lys.";
  if (rainChance > 60) return "Grab an umbrella, just in case.";
  if (temp >= 22 && code <= 2) return "Terrace weather in the Patershol.";
  if (temp >= 18 && code <= 2) return "Perfect day for a bike ride.";
  if (temp < 5) return "Gloves on — chilly out there.";
  if (temp < 10 && code <= 2) return "Crisp but clear — zip up.";
  if (wind > 25) return "Strong winds — careful on the bike.";
  if (code <= 2) return "Sunshine over the Three Towers.";
  return "An ordinary Ghent day.";
}

const weatherIcon = (iconName, size = 28) => {
  const props = { size, strokeWidth: 1.5, "aria-hidden": true };
  switch (iconName) {
    case "sun":             return <Sun {...props} />;
    case "cloud-sun":       return <Sun {...props} />;
    case "cloud":           return <Cloud {...props} />;
    case "cloud-rain":      return <CloudRain {...props} />;
    case "cloud-drizzle":   return <CloudDrizzle {...props} />;
    case "cloud-snow":      return <CloudSnow {...props} />;
    case "cloud-lightning": return <CloudLightning {...props} />;
    case "cloud-fog":       return <CloudFog {...props} />;
    default:                return <Cloud {...props} />;
  }
};

async function tryDatasets(slugs, query, parse, label) {
  for (const slug of slugs) {
    const url = `${ODS_BASE}/catalog/datasets/${encodeURIComponent(slug)}/records?${query}`;
    try {
      const r = await fetch(url);
      const body = await r.json().catch(() => null);
      if (!r.ok) { console.warn(`[${label}] ${slug} → HTTP ${r.status}`, body); continue; }
      const rows = Array.isArray(body?.results) ? body.results : [];
      console.info(`[${label}] ${slug} → ${rows.length} records`, url);
      if (!rows.length) continue;
      const parsed = rows.map(parse).filter(Boolean);
      if (parsed.length) return { rows: parsed, slug };
    } catch (err) {
      console.warn(`[${label}] ${slug} threw`, err);
    }
  }
  return { rows: [], slug: null };
}

async function discoverSlugs(keyword, label) {
  const cacheKey = `gent-slug:${keyword}`;
  try { const cached = sessionStorage.getItem(cacheKey); if (cached) return JSON.parse(cached); } catch {}
  try {
    const where = encodeURIComponent(`search("${keyword}")`);
    const r = await fetch(`${ODS_BASE}/catalog/datasets?limit=20&where=${where}&select=dataset_id,metas`);
    const body = await r.json().catch(() => null);
    if (!r.ok) { console.warn(`[${label}] catalog search "${keyword}" failed`, body); return []; }
    const ids = (body?.results || []).map((d) => d.dataset_id).filter(Boolean);
    console.info(`[${label}] catalog search "${keyword}" → ${ids.length} candidates`, ids);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(ids)); } catch {}
    return ids;
  } catch (err) { console.warn(`[${label}] catalog search threw`, err); return []; }
}

async function tryWithDiscovery({ hardcoded, keyword, query, parse, label }) {
  let result = await tryDatasets(hardcoded, query, parse, label);
  if (result.rows.length) return result;
  const discovered = (await discoverSlugs(keyword, label)).filter((s) => !hardcoded.includes(s));
  if (!discovered.length) return result;
  return tryDatasets(discovered, query, parse, label);
}

function pickCoords(x) {
  if (x.location?.lon != null && x.location?.lat != null)
    return { lng: Number(x.location.lon), lat: Number(x.location.lat) };
  if (x.geo_point_2d?.lon != null && x.geo_point_2d?.lat != null)
    return { lng: Number(x.geo_point_2d.lon), lat: Number(x.geo_point_2d.lat) };
  if (Array.isArray(x.geo_point_2d) && x.geo_point_2d.length === 2)
    return { lat: Number(x.geo_point_2d[0]), lng: Number(x.geo_point_2d[1]) };
  if (x.longitude != null && x.latitude != null)
    return { lng: Number(x.longitude), lat: Number(x.latitude) };
  if (x.lon != null && x.lat != null)
    return { lng: Number(x.lon), lat: Number(x.lat) };
  return null;
}

async function fetchParking() {
  const { rows } = await tryWithDiscovery({
    hardcoded: ['bezetting-parkeergarages-real-time'],
    keyword: 'parkeer',
    query: 'limit=30',
    label: 'parking',
    parse: (x) => {
      const total = Number(x.totalcapacity ?? x.totaalcapaciteit ?? x.numberofspaces ?? 0);
      const free  = Number(x.availablecapacity ?? x.availablespaces ?? x.beschikbarecapaciteit ?? 0);
      if (!total) return null;
      const occ = Math.round(((total - free) / total) * 100);
      return {
        name: x.name || x.description || x.naam || 'Parking',
        total, free, occupation: occ,
        coords: pickCoords(x),
      };
    },
  });
  return rows;
}

async function fetchBikes() {
  const FLEETS = [
    { slug: 'bolt-deelfietsen-gent',                                        label: 'Bolt'           },
    { slug: 'donkey-republic-beschikbaarheid-deelfietsen-per-station',      label: 'Donkey Republic' },
    { slug: 'blue-bike-deelfietsen-gent-dampoort',                          label: 'Blue Bike (Dampoort)' },
    { slug: 'blue-bike-deelfietsen-gent-sint-pieters-st-denijslaan',        label: 'Blue Bike (Sint-Pieters · Denijslaan)' },
    { slug: 'blue-bike-deelfietsen-gent-sint-pieters-m-hendrikaplein',      label: 'Blue Bike (Sint-Pieters · Hendrikaplein)' },
    { slug: 'blue-bike-deelfietsen-merelbeke-drongen-wondelgem',            label: 'Blue Bike (Merelbeke · Drongen · Wondelgem)' },
  ];
  const PARKINGS = [
    { slug: 'real-time-bezettingen-fietsenstallingen-gent',                 label: 'Korenmarkt + Braunplein' },
    { slug: 'real-time-bezetting-fietsenstalling-stadskantoor-gent',        label: 'Stadskantoor' },
  ];

  const fleets = await Promise.all(FLEETS.map(async ({ slug, label }) => {
    try {
      const r = await fetch(`${ODS_BASE}/catalog/datasets/${slug}/records?limit=100`);
      if (!r.ok) { console.warn(`[bikes] ${slug} → HTTP ${r.status}`); return null; }
      const d = await r.json();
      const rows = d.results || [];
      console.info(`[bikes] ${slug} → ${rows.length} records`);
      const available = rows.reduce((sum, x) => {
        if (x.bikes_available != null) return sum + Number(x.bikes_available);
        if (x.num_bikes_available != null) return sum + Number(x.num_bikes_available);
        if (x.is_reserved != null || x.is_disabled != null) {
          return (!x.is_reserved && !x.is_disabled) ? sum + 1 : sum;
        }
        return sum + 1;
      }, 0);
      return { label, slug, available, raw: rows };
    } catch (err) { console.warn(`[bikes] ${slug} threw`, err); return null; }
  }));

  const parkings = await Promise.all(PARKINGS.map(async ({ slug, label }) => {
    try {
      const r = await fetch(`${ODS_BASE}/catalog/datasets/${slug}/records?limit=20`);
      if (!r.ok) { console.warn(`[bike-parking] ${slug} → HTTP ${r.status}`); return null; }
      const d = await r.json();
      const rows = d.results || [];
      console.info(`[bike-parking] ${slug} → ${rows.length} records`);
      const total = rows.reduce((s, x) => s + Number(x.totalplaces ?? x.parkingcapacity ?? 0), 0);
      const free  = rows.reduce((s, x) => s + Number(x.freeplaces ?? x.vacantspaces ?? 0), 0);
      const facilities = rows.map((x) => ({
        name: x.facilityname || x.naam || x.name || label,
        total: Number(x.totalplaces ?? x.parkingcapacity ?? 0),
        free:  Number(x.freeplaces ?? x.vacantspaces ?? 0),
        occupation: Number(x.bezetting ?? x.occupation ?? 0),
      }));
      return { label, slug, total, free, facilities };
    } catch (err) { console.warn(`[bike-parking] ${slug} threw`, err); return null; }
  }));

  const liveFleets   = fleets.filter(Boolean);
  const liveParkings = parkings.filter(Boolean);
  return {
    totalBikes:   liveFleets.reduce((s, f) => s + (f.available || 0), 0),
    fleets:       liveFleets,
    parkings:     liveParkings,
    totalParking: liveParkings.reduce((s, p) => s + p.total, 0),
    freeParking:  liveParkings.reduce((s, p) => s + p.free, 0),
  };
}

async function fetchAirQuality() {
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    "?latitude=51.0536&longitude=3.7250" +
    "&current=pm2_5,pm10,nitrogen_dioxide,ozone,european_aqi,european_aqi_pm2_5,european_aqi_no2";
  const r = await fetch(url);
  if (!r.ok) { console.warn(`[air] open-meteo HTTP ${r.status}`); return null; }
  const d = await r.json();
  const c = d.current || {};
  console.info('[air] open-meteo air quality', c);
  return {
    pm25:  c.pm2_5 != null ? Math.round(c.pm2_5) : null,
    pm10:  c.pm10  != null ? Math.round(c.pm10)  : null,
    no2:   c.nitrogen_dioxide != null ? Math.round(c.nitrogen_dioxide) : null,
    o3:    c.ozone != null ? Math.round(c.ozone) : null,
    aqi:   c.european_aqi != null ? Math.round(c.european_aqi) : null,
    aqiPm: c.european_aqi_pm2_5 != null ? Math.round(c.european_aqi_pm2_5) : null,
    aqiNo: c.european_aqi_no2   != null ? Math.round(c.european_aqi_no2)   : null,
    time:  c.time || null,
  };
}

async function fetchTrains() {
  const STATIONS = [
    { id: 'BE.NMBS.008892007', name: 'Gent-Sint-Pieters' },
    { id: 'BE.NMBS.008892106', name: 'Gent-Dampoort' },
  ];
  const all = await Promise.all(STATIONS.map(async ({ id, name }) => {
    try {
      const url = `https://api.irail.be/liveboard/?id=${encodeURIComponent(id)}&arrdep=departure&format=json&lang=en`;
      const r = await fetch(url);
      if (!r.ok) { console.warn(`[trains] ${name} HTTP ${r.status}`); return []; }
      const d = await r.json();
      const list = d?.departures?.departure || [];
      console.info(`[trains] ${name} → ${list.length} departures`);
      return list.map((t) => ({
        station: name,
        time:     t.time ? new Date(Number(t.time) * 1000) : null,
        delay:    Number(t.delay || 0),
        platform: t.platform || '?',
        canceled: t.canceled === '1',
        toStation: t.station || t.stationinfo?.name || '',
        vehicle:  t.vehicle?.replace(/^BE\.NMBS\./, '') || '',
      }));
    } catch (err) { console.warn(`[trains] ${name} threw`, err); return []; }
  }));
  return all.flat().filter((t) => t.time).sort((a, b) => a.time - b.time).slice(0, 10);
}

async function fetchBikeCounters() {
  const SLUGS = [
    'fietstelpaal-bijlokekaai-2021-gent',
    'fietstelpaal-dampoort-noord-2024-gent',
    'fietstelpaal-gaardeniersbrug-2023',
    'fietstelpaal-groendreef-2021-gent',
  ];
  const all = await Promise.all(SLUGS.map(async (slug) => {
    try {
      const r = await fetch(`${ODS_BASE}/catalog/datasets/${slug}/records?limit=1&order_by=ldatetime%20desc`);
      if (!r.ok) {
        const r2 = await fetch(`${ODS_BASE}/catalog/datasets/${slug}/records?limit=1`);
        if (!r2.ok) { console.warn(`[counters] ${slug} HTTP ${r2.status}`); return null; }
        const d2 = await r2.json();
        return parseCounter(slug, d2.results?.[0]);
      }
      const d = await r.json();
      return parseCounter(slug, d.results?.[0]);
    } catch (err) { console.warn(`[counters] ${slug} threw`, err); return null; }
  }));
  return all.filter(Boolean);
}

function parseCounter(slug, x) {
  if (!x) return null;
  const count = Number(
    x.aantal ?? x.count ?? x.fietsers ?? x.cyclists ??
    x.totaal ?? x.value ?? x.aantal_fietsers ?? 0
  );
  const name = x.naam || x.location || x.locatie || slug.replace(/^fietstelpaal-|-\d{4}.*$/g, '').replace(/-/g, ' ');
  return { slug, name, count, time: x.ldatetime || x.datum || x.timestamp || null };
}

async function fetchWater() {
  try {
    const r = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=51.45&longitude=3.6&current=wave_height,sea_level_height_msl');
    if (!r.ok) { console.warn(`[water] HTTP ${r.status}`); return null; }
    const d = await r.json();
    const c = d.current || {};
    console.info('[water] open-meteo marine', c);
    return {
      waveHeight: c.wave_height != null ? Number(c.wave_height) : null,
      seaLevel:   c.sea_level_height_msl != null ? Number(c.sea_level_height_msl) : null,
      time: c.time || null,
    };
  } catch (err) { console.warn('[water] threw', err); return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR NAV CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "sec-weather",   Icon: Sun,      label: "Weather",       liveKey: "weather"  },
  { id: "sec-air",       Icon: Wind,     label: "Air Quality",   liveKey: "air"      },
  { id: "sec-trains",    Icon: Train,    label: "Trains",        liveKey: "trains"   },
  { id: "sec-parking",   Icon: Car,      label: "Parking",       liveKey: "parking"  },
  { id: "sec-bikes",     Icon: Bike,     label: "Bikes",         liveKey: "bikes"    },
  { id: "sec-counters",  Icon: Activity, label: "Bike Counters", liveKey: "counters" },
  { id: "sec-sea",       Icon: Waves,    label: "North Sea",     liveKey: "water"    },
  { id: "sec-nightlife", Icon: Music,    label: "Nightlife",     liveKey: null       },
];

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Skeleton = ({ w = "100%", h = 14, r = 6 }) => (
  <div className="skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />
);

const LivePill = ({ live }) => (
  <span className={`live-pill ${live ? "live-pill--on" : "live-pill--off"}`}>
    <span className={`ldot ${live ? "ldot--pulse" : ""}`} />
    {live ? "LIVE" : "STATIC"}
  </span>
);

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function GhentOps() {
  const [parking,  setParking]  = useState(null);
  const [bikes,    setBikes]    = useState(null);
  const [weather,  setWeather]  = useState(null);
  const [air,      setAir]      = useState(null);
  const [trains,   setTrains]   = useState(null);
  const [counters, setCounters] = useState(null);
  const [water,    setWater]    = useState(null);
  const [liveMode, setLiveMode] = useState({
    parking: false, bikes: false, weather: false,
    air: false, trains: false, counters: false, water: false,
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try { const p = await fetchParking(); if (p.length) { setParking(p); setLiveMode(m => ({ ...m, parking: true })); } else { setParking([]); setLiveMode(m => ({ ...m, parking: false })); } }
    catch { setParking([]); setLiveMode(m => ({ ...m, parking: false })); }
    try { const b = await fetchBikes(); const isLive = b.fleets.length > 0 || b.parkings.length > 0; setBikes(b); setLiveMode(m => ({ ...m, bikes: isLive })); }
    catch { setBikes(null); setLiveMode(m => ({ ...m, bikes: false })); }
    try { const w = await fetchWeather(); setWeather(w); setLiveMode(m => ({ ...m, weather: true })); }
    catch { setWeather(WEATHER_FALLBACK); setLiveMode(m => ({ ...m, weather: false })); }
    try { const a = await fetchAirQuality(); if (a) { setAir(a); setLiveMode(m => ({ ...m, air: true })); } else { setAir(null); setLiveMode(m => ({ ...m, air: false })); } }
    catch { setAir(null); setLiveMode(m => ({ ...m, air: false })); }
    try { const t = await fetchTrains(); if (t.length) { setTrains(t); setLiveMode(m => ({ ...m, trains: true })); } else { setTrains([]); setLiveMode(m => ({ ...m, trains: false })); } }
    catch { setTrains([]); setLiveMode(m => ({ ...m, trains: false })); }
    try { const c = await fetchBikeCounters(); if (c.length) { setCounters(c); setLiveMode(m => ({ ...m, counters: true })); } else { setCounters([]); setLiveMode(m => ({ ...m, counters: false })); } }
    catch { setCounters([]); setLiveMode(m => ({ ...m, counters: false })); }
    try { const wat = await fetchWater(); if (wat) { setWater(wat); setLiveMode(m => ({ ...m, water: true })); } else { setWater(null); setLiveMode(m => ({ ...m, water: false })); } }
    catch { setWater(null); setLiveMode(m => ({ ...m, water: false })); }
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  // ── Derived values ───────────────────────────────────────────────────────
  const parkData = parking || [];
  const wxData   = weather || WEATHER_FALLBACK;
  const wxDesc   = describeWeather(wxData.code);
  const quip     = weatherQuip(wxData);
  const gem      = gemOfTheDay();

  const totalSpaces = parkData.reduce((a, p) => a + p.total, 0);
  const freeSpaces  = parkData.reduce((a, p) => a + p.free, 0);
  const cityOcc     = totalSpaces ? Math.round(((totalSpaces - freeSpaces) / totalSpaces) * 100) : 0;
  const cityStatus  = occStatus(cityOcc);
  const emptiest    = parkData.length ? [...parkData].sort((a, b) => a.occupation - b.occupation)[0] : null;

  const parkingLoaded = !!(parking && parking.length);
  const bikesLoaded   = !!(bikes && (bikes.fleets.length || bikes.parkings.length));
  const liveCount     = Object.values(liveMode).filter(Boolean).length;

  const aqiColor = air?.aqi != null
    ? (air.aqi < 25 ? STATUS.ok.color : air.aqi < 50 ? STATUS.warn.color : STATUS.alert.color)
    : "var(--fg-muted)";
  const aqiLabel = air?.aqi != null
    ? (air.aqi < 25 ? "Good" : air.aqi < 50 ? "Moderate" : air.aqi < 75 ? "Unhealthy" : "Very Poor")
    : "—";

  const call = useMemo(() => {
    if (!emptiest) return { level: "info", head: "Loading live data…", body: "Pulling from data.stad.gent and Open-Meteo." };
    if (cityOcc > 85) return { level: "alert", head: "Leave the car — city is packed.", body: `Garages at ${cityOcc}%. Take the tram or hop on a bike.` };
    if (wxData.rainChance > 70) return { level: "warn", head: "Rain coming through.", body: "Grab an umbrella. The Lys won't mind, but you will." };
    if (cityOcc < 50 && wxData.code <= 2) return { level: "ok", head: "Quiet streets, clear sky.", body: `Garages at ${cityOcc}%, ${wxData.temp}°C. Graslei is calling.` };
    return { level: "ok", head: `${emptiest.name} is your best bet.`, body: `${emptiest.free} spaces free (${emptiest.occupation}% full).` };
  }, [cityOcc, wxData, emptiest]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ops-root">
      <style>{css}</style>
      <a href="#main" className="skip-link">Skip to content</a>

      {/* ════════════════════ SIDEBAR ════════════════════ */}
      <aside className="sidebar" role="navigation" aria-label="Dashboard navigation">

        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo__icon">
            <Radio size={18} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="sb-logo__text">
            <span className="sb-logo__city">GENT</span>
            <span className="sb-logo__now">NOW</span>
          </div>
          <span className="ldot ldot--pulse sb-logo__pulse" aria-label="Live" />
        </div>

        {/* Quip */}
        <div className="sb-quip">{quip}</div>

        {/* Nav links */}
        <div className="sb-section-label">NAVIGATE</div>
        <nav className="sb-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map(({ id, Icon, label, liveKey }) => {
            const isLive = liveKey ? liveMode[liveKey] : true;
            return (
              <button
                key={id}
                className="sb-nav__item"
                onClick={() => scrollTo(id)}
                aria-label={`Scroll to ${label}`}
              >
                <span className="sb-nav__icon">
                  <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="sb-nav__label">{label}</span>
                {liveKey !== null && (
                  <span className={`sb-nav__status ${isLive ? "sb-nav__status--live" : "sb-nav__status--off"}`} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sb-divider" />

        {/* Stream status */}
        <div className="sb-section-label">DATA FEEDS</div>
        <div className="sb-feeds">
          {[
            { key: "weather",  label: "Weather"  },
            { key: "parking",  label: "Parking"  },
            { key: "air",      label: "Air Qual" },
            { key: "trains",   label: "Trains"   },
            { key: "bikes",    label: "Bikes"    },
            { key: "counters", label: "Counters" },
            { key: "water",    label: "Sea"      },
          ].map(({ key, label }) => (
            <div key={key} className="sb-feed-row">
              <span className={`ldot ${liveMode[key] ? "ldot--pulse" : "ldot--off"}`} />
              <span className="sb-feed-name">{label}</span>
              <span className={`sb-feed-status ${liveMode[key] ? "sb-feed-status--live" : "sb-feed-status--off"}`}>
                {liveMode[key] ? "LIVE" : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sb-foot">
          <div className="sb-foot__time" aria-live="polite">
            {lastUpdate
              ? lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—"}
          </div>
          <button
            className="sb-refresh"
            onClick={loadAll}
            disabled={loading}
            aria-label="Refresh all data"
          >
            <RefreshCw size={11} className={loading ? "spin" : ""} aria-hidden="true" />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </aside>

      {/* ════════════════════ BODY ════════════════════ */}
      <div className="ops-body">
        <main id="main" className="main">

          {/* ── STATUS BANNER ─────────────────────────── */}
          <div className={`call-banner call-banner--${call.level}`} role="status" aria-live="polite">
            <span className="call-banner__icon">
              {call.level === "ok"
                ? <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
                : <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />}
            </span>
            <div className="call-banner__text">
              <span className="call-banner__head">{call.head}</span>
              <span className="call-banner__body">{call.body}</span>
            </div>
            <span className="call-banner__tag">
              <Zap size={10} aria-hidden="true" />
              {liveCount} live
            </span>
          </div>

          {/* ── KPI ROW ───────────────────────────────── */}
          <div className="kpi-row" role="list">

            <div className="kpi-card" role="listitem">
              <div className="kpi-card__label">
                {weatherIcon(wxDesc.icon, 12)}
                TEMP
              </div>
              <div className="kpi-card__value">
                {wxData.temp ?? "—"}<span className="kpi-card__unit">°C</span>
              </div>
              <div className="kpi-card__sub">{wxDesc.label}</div>
              <div className="kpi-card__bar">
                <div className="kpi-card__bar-fill" style={{ width: `${Math.min(100, Math.max(0, ((wxData.temp ?? 0) + 10) / 45 * 100))}%`, background: wxData.temp > 22 ? STATUS.alert.color : wxData.temp > 15 ? STATUS.warn.color : STATUS.ok.color }} />
              </div>
            </div>

            <div className="kpi-card" role="listitem">
              <div className="kpi-card__label"><Car size={12} aria-hidden="true" /> PARKING</div>
              <div className="kpi-card__value" style={{ color: cityStatus.color }}>
                {parkingLoaded ? cityOcc : "—"}<span className="kpi-card__unit">%</span>
              </div>
              <div className="kpi-card__sub">{parkingLoaded ? `${freeSpaces.toLocaleString()} free` : <Skeleton w={60} h={10} />}</div>
              <div className="kpi-card__bar">
                <div className="kpi-card__bar-fill" style={{ width: `${cityOcc}%`, background: cityStatus.color }} />
              </div>
            </div>

            <div className="kpi-card" role="listitem">
              <div className="kpi-card__label"><Wind size={12} aria-hidden="true" /> AIR AQI</div>
              <div className="kpi-card__value" style={{ color: aqiColor }}>
                {air?.aqi ?? "—"}
              </div>
              <div className="kpi-card__sub" style={{ color: aqiColor }}>{aqiLabel}</div>
              <div className="kpi-card__bar">
                <div className="kpi-card__bar-fill" style={{ width: `${Math.min(100, (air?.aqi ?? 0) / 100 * 100)}%`, background: aqiColor }} />
              </div>
            </div>

            <div className="kpi-card" role="listitem">
              <div className="kpi-card__label"><Bike size={12} aria-hidden="true" /> BIKES</div>
              <div className="kpi-card__value" style={{ color: "#22C55E" }}>
                {bikesLoaded ? bikes.totalBikes.toLocaleString() : "—"}
              </div>
              <div className="kpi-card__sub">{bikesLoaded ? `${bikes.fleets.length} fleets` : <Skeleton w={60} h={10} />}</div>
            </div>

            <div className="kpi-card" role="listitem">
              <div className="kpi-card__label"><Droplets size={12} aria-hidden="true" /> RAIN · 6H</div>
              <div className="kpi-card__value" style={{ color: wxData.rainChance > 60 ? "#60A5FA" : undefined }}>
                {wxData.rainChance}<span className="kpi-card__unit">%</span>
              </div>
              <div className="kpi-card__sub">
                {wxData.rainChance > 70 ? "umbrella time" : wxData.rainChance > 40 ? "maybe pack one" : "staying dry"}
              </div>
              <div className="kpi-card__bar">
                <div className="kpi-card__bar-fill" style={{ width: `${wxData.rainChance}%`, background: "#60A5FA" }} />
              </div>
            </div>

          </div>

          {/* ── WEATHER ───────────────────────────────── */}
          <section className="section" id="sec-weather" aria-labelledby="wx-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">01</span>
                <div>
                  <h2 id="wx-h" className="section__title">Weather</h2>
                  <span className="section__src">Open-Meteo · Ghent center</span>
                </div>
              </div>
              <LivePill live={liveMode.weather} />
            </div>
            <div className="wx-layout">
              <div className="wx-hero">
                <div className="wx-temp tabular">
                  {wxData.temp ?? "—"}<sup>°C</sup>
                </div>
                <div className="wx-meta">
                  <div className="wx-meta__icon">{weatherIcon(wxDesc.icon, 40)}</div>
                  <div className="wx-meta__label">{wxDesc.label}</div>
                  <div className="wx-meta__feels">feels {wxData.feels ?? "—"}°</div>
                </div>
              </div>
              <div className="wx-stats">
                {[
                  { k: "Wind",           v: wxData.wind   ?? "—", u: "km/h",        hi: wxData.wind > 25 },
                  { k: "Humidity",       v: wxData.humidity ?? "—", u: "%",           hi: false },
                  { k: "Rain chance 6h", v: wxData.rainChance, u: "%",               hi: wxData.rainChance > 60, hiColor: "#60A5FA" },
                  { k: "Precipitation",  v: wxData.precip,     u: "mm",              hi: false },
                ].map(({ k, v, u, hi, hiColor }) => (
                  <div key={k} className="wx-stat">
                    <span className="wx-stat__k">{k}</span>
                    <span className="wx-stat__v tabular" style={hi ? { color: hiColor || STATUS.warn.color } : {}}>
                      {v}<em>{u}</em>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── AIR QUALITY ───────────────────────────── */}
          <section className="section" id="sec-air" aria-labelledby="air-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">02</span>
                <div>
                  <h2 id="air-h" className="section__title">Air Quality</h2>
                  <span className="section__src">European AQI · Open-Meteo</span>
                </div>
              </div>
              <LivePill live={liveMode.air} />
            </div>
            {air ? (
              <div className="air-layout">
                <div className="air-aqi">
                  <div className="air-aqi__ring" style={{ "--aqi-color": aqiColor }}>
                    <div className="air-aqi__num tabular" style={{ color: aqiColor }}>{air.aqi ?? "—"}</div>
                    <div className="air-aqi__lbl">AQI</div>
                  </div>
                  <div className="air-aqi__status" style={{ color: aqiColor }}>{aqiLabel.toUpperCase()}</div>
                </div>
                <div className="air-metrics">
                  {[
                    { k: "PM2.5",  v: air.pm25, u: "μg/m³" },
                    { k: "PM10",   v: air.pm10,  u: "μg/m³" },
                    { k: "NO₂",    v: air.no2,   u: "μg/m³" },
                    { k: "Ozone",  v: air.o3,    u: "μg/m³" },
                  ].map(({ k, v, u }) => (
                    <div key={k} className="air-metric">
                      <span className="air-metric__k">{k}</span>
                      <span className="air-metric__v tabular">{v ?? "—"}<em>{u}</em></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="section__empty">Air quality data not available right now.</div>
            )}
          </section>

          {/* ── TRAINS ────────────────────────────────── */}
          {trains && trains.length > 0 && (
            <section className="section" id="sec-trains" aria-labelledby="trains-h">
              <div className="section__hd">
                <div className="section__hd-l">
                  <span className="section__num">03</span>
                  <div>
                    <h2 id="trains-h" className="section__title">Train Departures</h2>
                    <span className="section__src">iRail · Sint-Pieters &amp; Dampoort</span>
                  </div>
                </div>
                <LivePill live={liveMode.trains} />
              </div>
              <div className="board" role="table" aria-label="Train departures">
                <div className="board__head" role="row">
                  <span role="columnheader">TIME</span>
                  <span role="columnheader">DESTINATION</span>
                  <span role="columnheader">FROM</span>
                  <span role="columnheader">PLATFORM</span>
                  <span role="columnheader">STATUS</span>
                </div>
                {trains.map((t, i) => {
                  const delayMin = Math.round(t.delay / 60);
                  const timeStr  = t.time
                    ? t.time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                    : "—";
                  return (
                    <div
                      key={i}
                      className={`board__row ${t.canceled ? "board__row--cxl" : ""}`}
                      role="row"
                    >
                      <span className="board__time tabular" role="cell">{timeStr}</span>
                      <span className="board__dest" role="cell">{t.toStation || "—"}</span>
                      <span className="board__from" role="cell">
                        <span className="station-badge">
                          {t.station.replace("Gent-", "")}
                        </span>
                      </span>
                      <span className="board__platform" role="cell">
                        <span className="plat-badge">{t.platform}</span>
                      </span>
                      <span
                        className={`board__status tabular ${t.canceled ? "s-cxl" : delayMin > 0 ? "s-late" : "s-ok"}`}
                        role="cell"
                      >
                        {t.canceled ? "CANCELLED" : delayMin > 0 ? `+${delayMin}m` : "On time"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── PARKING ───────────────────────────────── */}
          <section className="section" id="sec-parking" aria-labelledby="parking-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">04</span>
                <div>
                  <h2 id="parking-h" className="section__title">Parking Garages</h2>
                  <span className="section__src">Real-time · data.stad.gent · click pin for directions</span>
                </div>
              </div>
              <LivePill live={liveMode.parking} />
            </div>
            {parkingLoaded ? (
              <>
                <div className="map-wrap">
                  <MiniMap
                    height={230}
                    markers={parkData.map((p) => {
                      const c = p.coords || lookupParking(p.name);
                      if (!c) return null;
                      const st = occStatus(p.occupation);
                      return {
                        lng: c.lng, lat: c.lat, color: st.color,
                        size: 12 + Math.sqrt(p.total) / 4,
                        label: p.name, sublabel: `${p.occupation}% · ${p.free} free`,
                        onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`, "_blank", "noopener"),
                      };
                    }).filter(Boolean)}
                  />
                </div>
                <div className="park-list">
                  {[...parkData].sort((a, b) => a.occupation - b.occupation).map((p, i) => {
                    const st = occStatus(p.occupation);
                    return (
                      <div key={i} className="park-row">
                        <div className="park-row__name">{p.name}</div>
                        <div className="park-row__track">
                          <div
                            className="park-row__fill"
                            style={{ width: `${p.occupation}%`, background: st.color, boxShadow: `0 0 8px ${st.ring}` }}
                          />
                        </div>
                        <div className="park-row__pct tabular" style={{ color: st.color }}>{p.occupation}%</div>
                        <div className="park-row__free tabular">{p.free.toLocaleString()} free</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="section__loading">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={48} r={4} />)}
              </div>
            )}
          </section>

          {/* ── BIKES ─────────────────────────────────── */}
          <section className="section" id="sec-bikes" aria-labelledby="bike-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">05</span>
                <div>
                  <h2 id="bike-h" className="section__title">Shared Bikes</h2>
                  <span className="section__src">Bolt · Donkey Republic · Blue Bike</span>
                </div>
              </div>
              <LivePill live={liveMode.bikes} />
            </div>
            <div className="bikes-layout">
              <div className="bikes-hero">
                <div className="bikes-hero__num tabular">
                  {bikesLoaded ? bikes.totalBikes.toLocaleString() : "—"}
                </div>
                <div className="bikes-hero__label">bikes available across Ghent right now</div>
                {bikesLoaded && bikes.totalParking > 0 && (
                  <div className="bikes-hero__parking">
                    <Droplets size={11} aria-hidden="true" />
                    {bikes.freeParking.toLocaleString()} bike-parking spots free of {bikes.totalParking.toLocaleString()}
                  </div>
                )}
              </div>
              {bikesLoaded && bikes.fleets.length > 0 && (
                <div className="fleet-grid">
                  {bikes.fleets.map((f, i) => (
                    <div key={i} className="fleet-card">
                      <div className="fleet-card__name">{f.label}</div>
                      <div className="fleet-card__num tabular">{f.available.toLocaleString()}</div>
                      <div className="fleet-card__sub">available</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── BIKE COUNTERS ─────────────────────────── */}
          {counters && counters.length > 0 && (
            <section className="section" id="sec-counters" aria-labelledby="cnt-h">
              <div className="section__hd">
                <div className="section__hd-l">
                  <span className="section__num">06</span>
                  <div>
                    <h2 id="cnt-h" className="section__title">Bike Counters</h2>
                    <span className="section__src">Fietstelpalen · data.stad.gent</span>
                  </div>
                </div>
                <LivePill live={liveMode.counters} />
              </div>
              <div className="counters-grid">
                {counters.map((c, i) => (
                  <div key={i} className="counter-card">
                    <div className="counter-card__name">{c.name}</div>
                    <div className="counter-card__num tabular">{c.count.toLocaleString()}</div>
                    <div className="counter-card__sub">cyclists · last reading</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── NORTH SEA ─────────────────────────────── */}
          {water && (water.waveHeight != null || water.seaLevel != null) && (
            <section className="section" id="sec-sea" aria-labelledby="sea-h">
              <div className="section__hd">
                <div className="section__hd-l">
                  <span className="section__num">07</span>
                  <div>
                    <h2 id="sea-h" className="section__title">North Sea</h2>
                    <span className="section__src">Open-Meteo Marine · Scheldt mouth (Vlissingen)</span>
                  </div>
                </div>
                <LivePill live={liveMode.water} />
              </div>
              <div className="sea-grid">
                {water.waveHeight != null && (
                  <div className="sea-stat">
                    <span className="sea-stat__k">Wave Height</span>
                    <span className="sea-stat__v tabular">{water.waveHeight.toFixed(2)}<em>m</em></span>
                  </div>
                )}
                {water.seaLevel != null && (
                  <div className="sea-stat">
                    <span className="sea-stat__k">Sea Level (MSL)</span>
                    <span className="sea-stat__v tabular">{water.seaLevel.toFixed(2)}<em>m</em></span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── SWIM SPOTS ────────────────────────────── */}
          <section className="section" aria-labelledby="swim-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">08</span>
                <div>
                  <h2 id="swim-h" className="section__title">Swim Spots</h2>
                  <span className="section__src">Curated · seasonal info</span>
                </div>
              </div>
            </div>
            <div className="swim-list">
              {WATER_SPOTS.map((s, i) => {
                const st = STATUS[s.status] || STATUS.info;
                return (
                  <a
                    key={i}
                    href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="swim-row"
                    aria-label={`${s.name} — ${st.label}`}
                  >
                    <span className="swim-dot" style={{ background: st.color, boxShadow: `0 0 10px ${st.ring}` }} />
                    <div className="swim-body">
                      <div className="swim-name">{s.name}</div>
                      <div className="swim-kind">{s.kind}</div>
                    </div>
                    <div className="swim-note">{s.note}</div>
                    <span className="swim-badge" style={{ color: st.color, borderColor: `${st.color}40` }}>{st.label}</span>
                    <ArrowUpRight size={12} className="swim-arrow" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </section>

          {/* ── GEM OF THE DAY ────────────────────────── */}
          <section className="section" aria-labelledby="gem-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">09</span>
                <div>
                  <h2 id="gem-h" className="section__title">Gem of the Day</h2>
                  <span className="section__src">Rotates daily · lesser-known Ghent</span>
                </div>
              </div>
              <Sparkles size={14} style={{ color: "var(--accent)" }} aria-hidden="true" />
            </div>
            <div className="gem-layout">
              <div className="gem-info">
                <div className="gem-info__name">{gem.name}</div>
                <p className="gem-info__tagline">{gem.tagline}</p>
                <div className="gem-info__tip">
                  <Compass size={12} aria-hidden="true" />
                  <span>{gem.tip}</span>
                </div>
                <a
                  className="gem-info__link"
                  href={`https://www.google.com/maps/search/?api=1&query=${gem.coords.lat},${gem.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={11} aria-hidden="true" />
                  Open in Maps
                  <ArrowUpRight size={11} aria-hidden="true" />
                </a>
              </div>
              <div className="gem-map">
                <MiniMap
                  height={160}
                  center={[gem.coords.lng, gem.coords.lat]}
                  zoom={15}
                  markers={[{
                    lng: gem.coords.lng, lat: gem.coords.lat,
                    color: "#22C55E", size: 18,
                    label: gem.name, sublabel: gem.tagline,
                  }]}
                />
              </div>
            </div>
          </section>

          {/* ── NIGHTLIFE ─────────────────────────────── */}
          <section className="section" id="sec-nightlife" aria-labelledby="nlt-h">
            <div className="section__hd">
              <div className="section__hd-l">
                <span className="section__num">10</span>
                <div>
                  <h2 id="nlt-h" className="section__title">Tonight in the Clubs</h2>
                  <span className="section__src">Hand-picked · tap for tonight's lineup</span>
                </div>
              </div>
              <Disc3 size={15} style={{ color: "var(--fg-dim)" }} aria-hidden="true" />
            </div>
            <p className="section__intro">
              Ghent's club scene isn't in the city's open data — these are hand-picked. Each card opens where the venue actually announces tonight's lineup (usually Instagram).
            </p>
            <div className="venues-grid">
              {NIGHTLIFE_VENUES.map((v, i) => (
                <a
                  key={i}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="venue-card"
                  aria-label={`${v.name} — ${v.kind}`}
                >
                  <div className="venue-card__hd">
                    <span className="venue-card__tag">{v.tag}</span>
                    <ArrowUpRight size={12} className="venue-card__arrow" aria-hidden="true" />
                  </div>
                  <div className="venue-card__name">{v.name}</div>
                  <div className="venue-card__kind">{v.kind}</div>
                  <div className="venue-card__vibe">{v.vibe}</div>
                  <div className="venue-card__area">
                    <MapPin size={9} aria-hidden="true" />
                    {v.area}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* ── TERRACES ─────────────────────────────── */}
          <Terraces weather={wxData} />

        </main>

        {/* FOOTER */}
        <footer className="foot" role="contentinfo">
          <div className="foot__towers" aria-hidden="true">
            <ThreeTowers height={32} color="rgba(255,255,255,0.035)" opacity={1} />
          </div>
          <div className="foot__inner">
            <div className="foot__brand">GENT · NOW</div>
            <div className="foot__meta">
              data.stad.gent · Open-Meteo · iRail · OpenStreetMap · CARTO
            </div>
            <div className="foot__time tabular" aria-live="polite">
              {lastUpdate
                ? `↻ ${lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                : "—"}
              {" · "}Ghent · {new Date().getFullYear()}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS — dark & sleek, sidebar + main, Inter + JetBrains Mono
// ═══════════════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ── VARIABLES ────────────────────────────────────────────────── */
.ops-root {
  --bg:         #06091A;
  --bg2:        #080C1F;
  --surface:    #0B1022;
  --card:       #0D1428;
  --card2:      #10192F;
  --muted:      #182135;
  --border:     rgba(255,255,255,0.07);
  --border-s:   rgba(255,255,255,0.04);
  --fg:         #CBD5E1;
  --fg-muted:   #475569;
  --fg-dim:     #283347;
  --accent:     #22C55E;
  --acc-bg:     rgba(34,197,94,0.08);
  --acc-ring:   rgba(34,197,94,0.3);
  --warn:       #F59E0B;
  --alert:      #EF4444;
  --blue:       #60A5FA;
  --sans:       'Inter', system-ui, sans-serif;
  --mono:       'JetBrains Mono', ui-monospace, monospace;
  --ease:       cubic-bezier(0.16, 1, 0.3, 1);
  --r:          10px;
  --sb:         248px;

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'cv11','ss01';
}
.ops-root * { box-sizing: border-box; }
.ops-root .tabular { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.skip-link {
  position: absolute; left: -9999px; top: 0;
  background: var(--accent); color: #0A1520;
  padding: 8px 14px; z-index: 200; font-family: var(--mono); font-size: 12px;
}
.skip-link:focus { left: 0; }
.ops-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  .ops-root *, .ops-root *::before, .ops-root *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ── SIDEBAR ──────────────────────────────────────────────────── */
.sidebar {
  width: var(--sb);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--muted) transparent;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 4px; }

.sb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 18px 16px;
  border-bottom: 1px solid var(--border-s);
}
.sb-logo__icon {
  width: 34px; height: 34px;
  background: var(--acc-bg);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}
.sb-logo__text { display: flex; flex-direction: column; line-height: 1; }
.sb-logo__city {
  font-family: var(--mono); font-weight: 700; font-size: 13px;
  letter-spacing: 0.2em; color: var(--fg);
}
.sb-logo__now {
  font-family: var(--mono); font-weight: 500; font-size: 10px;
  letter-spacing: 0.25em; color: var(--accent);
}
.sb-logo__pulse { margin-left: auto; }

.sb-quip {
  padding: 12px 18px;
  font-size: 11px;
  color: var(--fg-muted);
  font-style: italic;
  line-height: 1.5;
  border-bottom: 1px solid var(--border-s);
}

.sb-section-label {
  padding: 14px 18px 6px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--fg-dim);
  text-transform: uppercase;
}

.sb-nav { display: flex; flex-direction: column; padding: 0 8px 8px; gap: 2px; }

.sb-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 150ms var(--ease), color 150ms var(--ease);
  font-family: var(--sans);
  font-size: 13px;
}
.sb-nav__item:hover {
  background: var(--muted);
  color: var(--fg);
}
.sb-nav__icon {
  width: 26px; height: 26px;
  border-radius: 6px;
  background: var(--muted);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 150ms var(--ease);
}
.sb-nav__item:hover .sb-nav__icon { background: var(--card2); }
.sb-nav__label { flex: 1; font-weight: 500; }
.sb-nav__status {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.sb-nav__status--live { background: var(--accent); box-shadow: 0 0 6px var(--acc-ring); }
.sb-nav__status--off  { background: var(--fg-dim); }

.sb-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}

.sb-feeds { padding: 0 18px 8px; display: flex; flex-direction: column; gap: 6px; }
.sb-feed-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px;
}
.sb-feed-name { flex: 1; color: var(--fg-muted); }
.sb-feed-status {
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.1em;
}
.sb-feed-status--live { color: var(--accent); }
.sb-feed-status--off  { color: var(--fg-dim); }

.sb-foot {
  margin-top: auto;
  padding: 12px 18px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sb-foot__time {
  font-family: var(--mono); font-size: 11px;
  color: var(--fg-muted); letter-spacing: 0.05em;
}
.sb-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--fg);
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.08em;
  padding: 7px 12px; border-radius: 6px; cursor: pointer;
  transition: all 150ms var(--ease); width: 100%; justify-content: center;
}
.sb-refresh:hover:not(:disabled) {
  border-color: var(--accent); color: var(--accent);
  background: var(--acc-bg);
}
.sb-refresh:disabled { opacity: 0.45; cursor: wait; }

/* ── LIVE DOTS ────────────────────────────────────────────────── */
.ldot {
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: var(--fg-dim); flex-shrink: 0;
}
.ldot--pulse {
  background: var(--accent);
  animation: ldot-pulse 2s ease-in-out infinite;
}
.ldot--off { background: var(--fg-dim); }
@keyframes ldot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--acc-ring); }
  50%       { box-shadow: 0 0 0 5px transparent; }
}

.live-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.15em; padding: 4px 9px; border-radius: 99px;
  flex-shrink: 0;
}
.live-pill--on  {
  color: var(--accent);
  border: 1px solid rgba(34,197,94,0.3);
  background: rgba(34,197,94,0.07);
}
.live-pill--off {
  color: var(--fg-muted);
  border: 1px solid var(--border);
  background: transparent;
}

/* ── SPIN ─────────────────────────────────────────────────────── */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── SKELETON ─────────────────────────────────────────────────── */
.skel {
  background: linear-gradient(90deg, var(--muted) 25%, var(--card2) 50%, var(--muted) 75%);
  background-size: 200% 100%;
  animation: skel-sweep 1.6s ease infinite;
}
@keyframes skel-sweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── BODY & MAIN ──────────────────────────────────────────────── */
.ops-body {
  flex: 1;
  min-width: 0;
}
.main {
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1060px;
}

/* ── CALL BANNER ──────────────────────────────────────────────── */
.call-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  border-radius: var(--r);
  border: 1px solid var(--border);
  background: var(--card);
  position: relative; overflow: hidden;
}
.call-banner::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
}
.call-banner--ok::before    { background: var(--accent); }
.call-banner--warn::before  { background: var(--warn); }
.call-banner--alert::before { background: var(--alert); }
.call-banner--info::before  { background: var(--fg-dim); }

.call-banner__icon {
  flex-shrink: 0;
}
.call-banner--ok    .call-banner__icon { color: var(--accent); }
.call-banner--warn  .call-banner__icon { color: var(--warn); }
.call-banner--alert .call-banner__icon { color: var(--alert); }
.call-banner--info  .call-banner__icon { color: var(--fg-muted); }

.call-banner__text { flex: 1; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.call-banner__head { font-weight: 600; font-size: 14px; color: var(--fg); }
.call-banner__body { font-size: 12px; color: var(--fg-muted); }
.call-banner__tag {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.1em; color: var(--fg-muted);
  padding: 3px 8px; border-radius: 99px;
  border: 1px solid var(--border); background: var(--muted);
}

/* ── KPI ROW ──────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px;
  display: flex; flex-direction: column;
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
}
.kpi-card:hover {
  border-color: rgba(255,255,255,0.14);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
.kpi-card__label {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-muted);
  text-transform: uppercase; margin-bottom: 10px;
}
.kpi-card__value {
  font-family: var(--mono); font-weight: 700;
  font-size: 30px; line-height: 1;
  letter-spacing: -0.02em; color: var(--fg);
  margin-bottom: 4px;
}
.kpi-card__unit {
  font-size: 14px; color: var(--fg-muted);
  margin-left: 2px; font-weight: 500;
}
.kpi-card__sub {
  font-size: 11px; color: var(--fg-muted);
  display: flex; align-items: center; gap: 4px;
  min-height: 16px; flex: 1;
}
.kpi-card__bar {
  margin-top: 10px; height: 2px; border-radius: 99px;
  background: var(--muted); overflow: hidden;
}
.kpi-card__bar-fill { height: 100%; transition: width 500ms var(--ease); border-radius: 99px; }

/* ── SECTIONS ─────────────────────────────────────────────────── */
.section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  scroll-margin-top: 20px;
  transition: border-color 200ms var(--ease);
}
.section:hover { border-color: rgba(255,255,255,0.10); }

.section__hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border-s);
  gap: 12px; flex-wrap: wrap;
}
.section__hd-l {
  display: flex; align-items: center; gap: 14px; min-width: 0;
}
.section__num {
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--fg-dim);
  background: var(--muted); padding: 4px 8px; border-radius: 5px;
  flex-shrink: 0;
}
.section__title {
  font-weight: 600; font-size: 16px; line-height: 1.2;
  margin: 0; letter-spacing: -0.01em;
}
.section__src {
  display: block; font-family: var(--mono); font-size: 9px;
  letter-spacing: 0.08em; color: var(--fg-muted);
  text-transform: uppercase; margin-top: 3px;
}
.section__empty {
  padding: 20px 22px; color: var(--fg-muted); font-size: 13px;
}
.section__loading {
  padding: 16px 22px; display: flex; flex-direction: column; gap: 8px;
}
.section__intro {
  padding: 14px 22px 0; font-size: 13px; color: var(--fg-muted);
  line-height: 1.6; margin: 0;
}

/* ── WEATHER ──────────────────────────────────────────────────── */
.wx-layout {
  display: grid; grid-template-columns: auto 1fr;
  border-bottom: 1px solid var(--border-s);
}
.wx-hero {
  display: flex; align-items: center; gap: 20px;
  padding: 24px 28px; border-right: 1px solid var(--border-s);
}
.wx-temp {
  font-family: var(--mono); font-weight: 700;
  font-size: 64px; line-height: 1; letter-spacing: -0.04em; color: var(--fg);
}
.wx-temp sup {
  font-size: 22px; color: var(--fg-muted); font-weight: 500; vertical-align: super;
}
.wx-meta { display: flex; flex-direction: column; gap: 4px; }
.wx-meta__icon { color: var(--fg-muted); margin-bottom: 4px; }
.wx-meta__label { font-weight: 600; font-size: 15px; color: var(--fg); }
.wx-meta__feels { font-size: 12px; color: var(--fg-muted); }

.wx-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1px; background: var(--border-s);
}
.wx-stat {
  background: var(--card); padding: 16px 22px;
  display: flex; flex-direction: column; gap: 5px;
}
.wx-stat__k {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em;
  color: var(--fg-dim); text-transform: uppercase;
}
.wx-stat__v {
  font-family: var(--mono); font-weight: 600; font-size: 22px;
  color: var(--fg); line-height: 1;
}
.wx-stat__v em {
  font-size: 11px; color: var(--fg-muted); font-style: normal;
  font-weight: 400; margin-left: 4px;
}

/* ── AIR QUALITY ──────────────────────────────────────────────── */
.air-layout {
  display: flex; align-items: stretch;
  gap: 0; border-bottom: 1px solid var(--border-s);
}
.air-aqi {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 28px 36px; border-right: 1px solid var(--border-s);
  flex-shrink: 0; gap: 6px;
}
.air-aqi__ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 3px solid var(--aqi-color, var(--accent));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 0 20px color-mix(in srgb, var(--aqi-color, var(--accent)) 20%, transparent);
  transition: border-color 400ms var(--ease), box-shadow 400ms var(--ease);
}
.air-aqi__num {
  font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1;
  letter-spacing: -0.02em;
}
.air-aqi__lbl {
  font-family: var(--mono); font-size: 8px; letter-spacing: 0.2em;
  color: var(--fg-muted); text-transform: uppercase; margin-top: 2px;
}
.air-aqi__status {
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
}
.air-metrics {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr;
  gap: 1px; background: var(--border-s); align-self: stretch;
}
.air-metric {
  background: var(--card); padding: 16px 20px;
  display: flex; flex-direction: column; gap: 4px;
}
.air-metric__k {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em;
  color: var(--fg-dim); text-transform: uppercase;
}
.air-metric__v {
  font-family: var(--mono); font-weight: 600; font-size: 20px; color: var(--fg);
}
.air-metric__v em {
  font-size: 10px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 3px;
}

/* ── TRAINS DEPARTURE BOARD ────────────────────────────────────── */
.board { overflow-x: auto; }
.board__head {
  display: grid;
  grid-template-columns: 64px 1fr 140px 88px 100px;
  gap: 0; padding: 10px 22px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-s);
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-dim);
  text-transform: uppercase;
}
.board__row {
  display: grid;
  grid-template-columns: 64px 1fr 140px 88px 100px;
  gap: 0; padding: 13px 22px;
  border-bottom: 1px solid var(--border-s);
  align-items: center;
  transition: background 150ms var(--ease);
}
.board__row:last-child { border-bottom: none; }
.board__row:hover { background: var(--card2); }
.board__row--cxl { opacity: 0.45; }
.board__time {
  font-family: var(--mono); font-weight: 700; font-size: 16px;
  color: var(--accent); letter-spacing: 0.02em;
}
.board__row--cxl .board__time { color: var(--alert); text-decoration: line-through; }
.board__dest { font-weight: 500; font-size: 14px; padding-right: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.station-badge {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 4px;
  background: var(--muted); color: var(--fg-muted);
  letter-spacing: 0.05em; white-space: nowrap;
}
.plat-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  background: var(--card2); border: 1px solid var(--border);
  font-family: var(--mono); font-weight: 700; font-size: 12px; color: var(--fg);
}
.board__status { font-family: var(--mono); font-size: 11px; font-weight: 600; }
.s-ok   { color: var(--accent); }
.s-late { color: var(--warn); }
.s-cxl  { color: var(--alert); }

/* ── MAP WRAP ─────────────────────────────────────────────────── */
.map-wrap {
  border-bottom: 1px solid var(--border-s);
  background: var(--bg);
}

/* ── PARKING LIST ─────────────────────────────────────────────── */
.park-list { display: flex; flex-direction: column; }
.park-row {
  display: grid;
  grid-template-columns: 1fr 120px 52px 90px;
  gap: 12px; align-items: center;
  padding: 12px 22px;
  border-bottom: 1px solid var(--border-s);
  transition: background 150ms var(--ease);
}
.park-row:last-child { border-bottom: none; }
.park-row:hover { background: var(--card2); }
.park-row__name { font-weight: 500; font-size: 13px; }
.park-row__track {
  height: 4px; border-radius: 99px;
  background: var(--muted); overflow: hidden; position: relative;
}
.park-row__fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 99px; transition: width 600ms var(--ease);
}
.park-row__pct {
  font-family: var(--mono); font-weight: 700; font-size: 14px; text-align: right;
}
.park-row__free {
  font-family: var(--mono); font-size: 11px; color: var(--fg-muted); text-align: right;
}

/* ── BIKES ────────────────────────────────────────────────────── */
.bikes-layout {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--border-s);
}
.bikes-hero {
  padding: 28px 28px; border-right: 1px solid var(--border-s);
  flex-shrink: 0; min-width: 200px;
}
.bikes-hero__num {
  font-family: var(--mono); font-weight: 800;
  font-size: 56px; line-height: 1; letter-spacing: -0.04em; color: var(--accent);
}
.bikes-hero__label {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--fg-muted); margin-top: 8px;
}
.bikes-hero__parking {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--fg-muted); margin-top: 10px;
}
.fleet-grid {
  flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1px; background: var(--border-s); align-self: stretch;
}
.fleet-card {
  background: var(--card); padding: 18px;
  display: flex; flex-direction: column; gap: 4px;
}
.fleet-card__name { font-size: 11px; color: var(--fg-muted); line-height: 1.3; }
.fleet-card__num {
  font-family: var(--mono); font-weight: 700; font-size: 26px;
  color: var(--fg); letter-spacing: -0.02em; line-height: 1;
}
.fleet-card__sub {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--fg-dim);
}

/* ── BIKE COUNTERS ────────────────────────────────────────────── */
.counters-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1px; background: var(--border-s);
}
.counter-card { background: var(--card); padding: 20px; }
.counter-card__name { font-size: 12px; color: var(--fg-muted); margin-bottom: 6px; text-transform: capitalize; }
.counter-card__num {
  font-family: var(--mono); font-weight: 700; font-size: 28px;
  color: var(--fg); letter-spacing: -0.02em;
}
.counter-card__sub {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--fg-dim); margin-top: 4px;
}

/* ── SEA ──────────────────────────────────────────────────────── */
.sea-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1px; background: var(--border-s);
}
.sea-stat { background: var(--card); padding: 22px; display: flex; flex-direction: column; gap: 6px; }
.sea-stat__k {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--fg-dim);
}
.sea-stat__v {
  font-family: var(--mono); font-weight: 600; font-size: 26px; color: var(--fg);
}
.sea-stat__v em { font-size: 12px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 4px; }

/* ── SWIM SPOTS ───────────────────────────────────────────────── */
.swim-list { display: flex; flex-direction: column; }
.swim-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 22px; border-bottom: 1px solid var(--border-s);
  text-decoration: none; color: var(--fg);
  transition: background 150ms var(--ease), padding-left 150ms var(--ease);
}
.swim-row:last-child { border-bottom: none; }
.swim-row:hover { background: var(--card2); padding-left: 28px; }
.swim-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.swim-body { flex: 1; min-width: 0; }
.swim-name { font-weight: 500; font-size: 14px; }
.swim-kind { font-size: 11px; color: var(--fg-muted); margin-top: 1px; }
.swim-note { font-size: 11px; color: var(--fg-muted); }
.swim-badge {
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.12em; padding: 3px 8px; border-radius: 99px;
  border: 1px solid; flex-shrink: 0;
}
.swim-arrow { color: var(--fg-dim); flex-shrink: 0; transition: color 150ms var(--ease); }
.swim-row:hover .swim-arrow { color: var(--accent); }

/* ── GEM ──────────────────────────────────────────────────────── */
.gem-layout {
  display: grid; grid-template-columns: 1fr auto;
  border-bottom: 1px solid var(--border-s);
}
.gem-info {
  padding: 22px 24px; display: flex; flex-direction: column; gap: 10px; justify-content: center;
}
.gem-info__name { font-weight: 700; font-size: 22px; letter-spacing: -0.02em; color: var(--fg); }
.gem-info__tagline { font-size: 13px; color: var(--fg-muted); line-height: 1.5; margin: 0; }
.gem-info__tip {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 12px; color: var(--fg-muted); font-style: italic;
}
.gem-info__tip svg { flex-shrink: 0; color: var(--accent); margin-top: 2px; }
.gem-info__link {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; color: var(--accent); text-decoration: none;
  border-bottom: 1px solid transparent; transition: border-color 150ms var(--ease); width: fit-content;
}
.gem-info__link:hover { border-color: var(--accent); }
.gem-map { width: 260px; flex-shrink: 0; border-left: 1px solid var(--border-s); overflow: hidden; }

/* ── NIGHTLIFE ────────────────────────────────────────────────── */
.venues-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1px; background: var(--border-s); margin-top: 14px;
}
.venue-card {
  background: var(--card); padding: 18px; text-decoration: none; color: var(--fg);
  display: flex; flex-direction: column; gap: 6px;
  transition: background 150ms var(--ease);
  position: relative; overflow: hidden;
}
.venue-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--accent); transform: scaleX(0); transform-origin: left;
  transition: transform 250ms var(--ease);
}
.venue-card:hover { background: var(--card2); }
.venue-card:hover::after { transform: scaleX(1); }
.venue-card__hd {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;
}
.venue-card__tag {
  font-family: var(--mono); font-size: 9px; font-weight: 700;
  letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase;
}
.venue-card__arrow { color: var(--fg-dim); transition: color 150ms var(--ease); }
.venue-card:hover .venue-card__arrow { color: var(--accent); }
.venue-card__name { font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
.venue-card__kind { font-size: 11px; color: var(--fg-muted); }
.venue-card__vibe { font-size: 12px; color: var(--fg-muted); line-height: 1.45; flex: 1; }
.venue-card__area {
  display: flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; color: var(--fg-dim); margin-top: 4px;
}

.foot { position: relative; overflow: hidden; border-top: 1px solid var(--border); background: var(--bg2); }
.foot__towers { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: flex-end; pointer-events: none; }
.foot__inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 18px 28px; }
.foot__brand { font-family: var(--mono); font-weight: 700; font-size: 12px; letter-spacing: 0.2em; color: var(--fg); }
.foot__meta { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; color: var(--fg-dim); }
.foot__time { font-family: var(--mono); font-size: 10px; color: var(--fg-dim); }
@media (max-width: 900px) {
  .ops-root { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: static; flex-direction: row; flex-wrap: wrap; align-items: center; padding: 12px 16px; gap: 12px; border-right: none; border-bottom: 1px solid var(--border); }
  .sb-logo { padding: 0; border-bottom: none; }
  .sb-quip, .sb-section-label, .sb-feeds, .sb-foot { display: none; }
  .sb-nav { flex-direction: row; padding: 0; flex-wrap: wrap; gap: 4px; flex: 1; }
  .sb-nav__item { padding: 6px 10px; font-size: 12px; }
  .sb-divider { display: none; }
  .main { padding: 16px; }
}
@media (max-width: 640px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .wx-layout { grid-template-columns: 1fr; }
  .wx-hero { border-right: none; border-bottom: 1px solid var(--border-s); }
  .air-layout { flex-direction: column; }
  .board__head, .board__row { grid-template-columns: 56px 1fr 100px; }
  .board__from, .board__platform { display: none; }
  .park-row { grid-template-columns: 1fr 52px 70px; }
  .park-row__track { display: none; }
  .bikes-layout { flex-direction: column; }
  .bikes-hero { border-right: none; border-bottom: 1px solid var(--border-s); }
  .gem-layout { grid-template-columns: 1fr; }
  .gem-map { width: 100%; border-left: none; border-top: 1px solid var(--border-s); }
}
`;
