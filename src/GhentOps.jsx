import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Activity, Wind, Car, Bike, RefreshCw,
  CircleAlert, CircleCheck, MapPin, ArrowUpRight,
  Zap, Radio, Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning,
  CloudFog, Droplets, Train, Waves, Sparkles, Compass, Music,
  ChevronDown, ArrowLeft, Menu, X,
} from "lucide-react";
import MiniMap, { lookupParking } from "./MiniMap.jsx";
import Terraces from "./Terraces.jsx";
import ThreeTowers from "./ThreeTowers.jsx";
import {
  fetchWeather, describeWeather, gemOfTheDay,
  WATER_SPOTS, TRANSIT_STOPS, NIGHTLIFE_VENUES,
} from "./ghent-data.js";

// ═══════════════════════════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════════════════════════

const ODS_BASE = "https://data.stad.gent/api/explore/v2.1";

const WEATHER_FALLBACK = {
  temp: null, feels: null, humidity: null, code: 0, wind: null,
  precip: 0, rainChance: 0, hourlyTemp: [],
};

const STATUS = {
  ok:    { color: "#00FF88", label: "Clear",    ring: "rgba(0,255,136,0.2)"    },
  warn:  { color: "#FF9500", label: "Moderate", ring: "rgba(255,149,0,0.2)"    },
  alert: { color: "#FF453A", label: "Critical", ring: "rgba(255,69,58,0.2)"    },
  info:  { color: "#64748B", label: "Info",     ring: "rgba(100,116,139,0.2)"  },
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
  if (temp < 5)  return "Gloves on — chilly out there.";
  if (temp < 10 && code <= 2) return "Crisp but clear — zip up.";
  if (wind > 25) return "Strong winds — careful on the bike.";
  if (code <= 2) return "Sunshine over the Three Towers.";
  return "An ordinary Ghent day.";
}

const weatherIcon = (iconName, size = 28) => {
  const p = { size, strokeWidth: 1.5, "aria-hidden": true };
  switch (iconName) {
    case "sun":             return <Sun {...p} />;
    case "cloud-sun":       return <Sun {...p} />;
    case "cloud":           return <Cloud {...p} />;
    case "cloud-rain":      return <CloudRain {...p} />;
    case "cloud-drizzle":   return <CloudDrizzle {...p} />;
    case "cloud-snow":      return <CloudSnow {...p} />;
    case "cloud-lightning": return <CloudLightning {...p} />;
    case "cloud-fog":       return <CloudFog {...p} />;
    default:                return <Cloud {...p} />;
  }
};

async function tryDatasets(slugs, query, parse, label) {
  for (const slug of slugs) {
    const url = `${ODS_BASE}/catalog/datasets/${encodeURIComponent(slug)}/records?${query}`;
    try {
      const r    = await fetch(url);
      const body = await r.json().catch(() => null);
      if (!r.ok) { console.warn(`[${label}] ${slug} → HTTP ${r.status}`, body); continue; }
      const rows   = Array.isArray(body?.results) ? body.results : [];
      console.info(`[${label}] ${slug} → ${rows.length} records`);
      if (!rows.length) continue;
      const parsed = rows.map(parse).filter(Boolean);
      if (parsed.length) return { rows: parsed, slug };
    } catch (err) { console.warn(`[${label}] ${slug} threw`, err); }
  }
  return { rows: [], slug: null };
}

async function discoverSlugs(keyword, label) {
  const cacheKey = `gent-slug:${keyword}`;
  try { const c = sessionStorage.getItem(cacheKey); if (c) return JSON.parse(c); } catch {}
  try {
    const where = encodeURIComponent(`search("${keyword}")`);
    const r = await fetch(`${ODS_BASE}/catalog/datasets?limit=20&where=${where}&select=dataset_id,metas`);
    const body = await r.json().catch(() => null);
    if (!r.ok) { console.warn(`[${label}] catalog search failed`, body); return []; }
    const ids = (body?.results || []).map(d => d.dataset_id).filter(Boolean);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(ids)); } catch {}
    return ids;
  } catch (err) { console.warn(`[${label}] catalog search threw`, err); return []; }
}

async function tryWithDiscovery({ hardcoded, keyword, query, parse, label }) {
  let result = await tryDatasets(hardcoded, query, parse, label);
  if (result.rows.length) return result;
  const discovered = (await discoverSlugs(keyword, label)).filter(s => !hardcoded.includes(s));
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
    hardcoded: ["bezetting-parkeergarages-real-time"],
    keyword:   "parkeer",
    query:     "limit=30",
    label:     "parking",
    parse: (x) => {
      const total = Number(x.totalcapacity ?? x.totaalcapaciteit ?? x.numberofspaces ?? 0);
      const free  = Number(x.availablecapacity ?? x.availablespaces ?? x.beschikbarecapaciteit ?? 0);
      if (!total) return null;
      return {
        name: x.name || x.description || x.naam || "Parking",
        total, free,
        occupation: Math.round(((total - free) / total) * 100),
        coords: pickCoords(x),
      };
    },
  });
  return rows;
}

async function fetchBikes() {
  const FLEETS = [
    { slug: "bolt-deelfietsen-gent",                                       label: "Bolt"           },
    { slug: "donkey-republic-beschikbaarheid-deelfietsen-per-station",     label: "Donkey Republic" },
    { slug: "blue-bike-deelfietsen-gent-dampoort",                         label: "Blue Bike (Dampoort)" },
    { slug: "blue-bike-deelfietsen-gent-sint-pieters-st-denijslaan",       label: "Blue Bike (Sint-Pieters · Denijslaan)" },
    { slug: "blue-bike-deelfietsen-gent-sint-pieters-m-hendrikaplein",     label: "Blue Bike (Sint-Pieters · Hendrikaplein)" },
    { slug: "blue-bike-deelfietsen-merelbeke-drongen-wondelgem",           label: "Blue Bike (Merelbeke · Drongen · Wondelgem)" },
  ];
  const PARKINGS = [
    { slug: "real-time-bezettingen-fietsenstallingen-gent",                label: "Korenmarkt + Braunplein" },
    { slug: "real-time-bezetting-fietsenstalling-stadskantoor-gent",       label: "Stadskantoor" },
  ];

  const fleets = await Promise.all(FLEETS.map(async ({ slug, label }) => {
    try {
      const r = await fetch(`${ODS_BASE}/catalog/datasets/${slug}/records?limit=100`);
      if (!r.ok) { console.warn(`[bikes] ${slug} → HTTP ${r.status}`); return null; }
      const d = await r.json();
      const rows = d.results || [];
      const available = rows.reduce((sum, x) => {
        if (x.bikes_available    != null) return sum + Number(x.bikes_available);
        if (x.num_bikes_available != null) return sum + Number(x.num_bikes_available);
        if (x.is_reserved != null || x.is_disabled != null)
          return (!x.is_reserved && !x.is_disabled) ? sum + 1 : sum;
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
      const total = rows.reduce((s, x) => s + Number(x.totalplaces ?? x.parkingcapacity ?? 0), 0);
      const free  = rows.reduce((s, x) => s + Number(x.freeplaces  ?? x.vacantspaces    ?? 0), 0);
      const facilities = rows.map(x => ({
        name:  x.facilityname || x.naam || x.name || label,
        total: Number(x.totalplaces ?? x.parkingcapacity ?? 0),
        free:  Number(x.freeplaces  ?? x.vacantspaces    ?? 0),
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
    freeParking:  liveParkings.reduce((s, p) => s + p.free,  0),
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
    { id: "BE.NMBS.008892007", name: "Gent-Sint-Pieters" },
    { id: "BE.NMBS.008892106", name: "Gent-Dampoort"     },
  ];
  const all = await Promise.all(STATIONS.map(async ({ id, name }) => {
    try {
      const url = `https://api.irail.be/liveboard/?id=${encodeURIComponent(id)}&arrdep=departure&format=json&lang=en`;
      const r = await fetch(url);
      if (!r.ok) { console.warn(`[trains] ${name} HTTP ${r.status}`); return []; }
      const d    = await r.json();
      const list = d?.departures?.departure || [];
      return list.map(t => ({
        station:   name,
        time:      t.time ? new Date(Number(t.time) * 1000) : null,
        delay:     Number(t.delay || 0),
        platform:  t.platform || "?",
        canceled:  t.canceled === "1",
        toStation: t.station || t.stationinfo?.name || "",
        vehicle:   t.vehicle?.replace(/^BE\.NMBS\./, "") || "",
      }));
    } catch (err) { console.warn(`[trains] ${name} threw`, err); return []; }
  }));
  return all.flat().filter(t => t.time).sort((a, b) => a.time - b.time).slice(0, 10);
}

async function fetchBikeCounters() {
  const SLUGS = [
    "fietstelpaal-bijlokekaai-2021-gent",
    "fietstelpaal-dampoort-noord-2024-gent",
    "fietstelpaal-gaardeniersbrug-2023",
    "fietstelpaal-groendreef-2021-gent",
  ];
  const all = await Promise.all(SLUGS.map(async slug => {
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
  const name = x.naam || x.location || x.locatie ||
    slug.replace(/^fietstelpaal-|-\d{4}.*$/g, "").replace(/-/g, " ");
  return { slug, name, count, time: x.ldatetime || x.datum || x.timestamp || null };
}

async function fetchWater() {
  try {
    const r = await fetch("https://marine-api.open-meteo.com/v1/marine?latitude=51.45&longitude=3.6&current=wave_height,sea_level_height_msl");
    if (!r.ok) { console.warn(`[water] HTTP ${r.status}`); return null; }
    const d = await r.json();
    const c = d.current || {};
    return {
      waveHeight: c.wave_height         != null ? Number(c.wave_height)         : null,
      seaLevel:   c.sea_level_height_msl != null ? Number(c.sea_level_height_msl) : null,
      time: c.time || null,
    };
  } catch (err) { console.warn("[water] threw", err); return null; }
}

async function fetchNightlifeEvents() {
  const pad = n => String(n).padStart(2, "0");
  const now     = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const d7       = new Date(now.getTime() + 7 * 86400000);
  const nextStr  = `${d7.getFullYear()}-${pad(d7.getMonth() + 1)}-${pad(d7.getDate())}`;
  const dateFilter = encodeURIComponent(`date_start >= date'${todayStr}' AND date_start <= date'${nextStr}'`);

  const { rows } = await tryWithDiscovery({
    hardcoded: ["uitdatabank-evenementen"],
    keyword:   "uitdatabank evenementen",
    query:     `limit=40&order_by=date_start+asc&where=${dateFilter}`,
    label:     "events",
    parse: (x) => {
      const name = x.name || x.naam || x.title || x.titel;
      if (!name || typeof name !== "string" || !name.trim()) return null;
      const date = x.date_start || x.startdatum || x.start;
      const end  = x.date_end   || x.einddatum  || x.end;
      return {
        name:     String(name).trim(),
        venue:    String(x.location_name || x.locatienaam || x.locatie || x.venue || "").trim(),
        date:     date && !isNaN(new Date(date)) ? new Date(date) : null,
        end:      end  && !isNaN(new Date(end))  ? new Date(end)  : null,
        category: String(x.type || x.categorie || x.tags || "").trim(),
        url:      x.url || x.website || x.link || null,
      };
    },
  });
  return rows
    .filter(e => !e.date || e.date >= now)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    .slice(0, 16);
}

// ═══════════════════════════════════════════════════════════════════════════
// NAV CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "sec-weather",   Icon: Sun,      label: "Weather",       liveKey: "weather",  secKey: "weather"   },
  { id: "sec-air",       Icon: Wind,     label: "Air Quality",   liveKey: "air",      secKey: "air"       },
  { id: "sec-trains",    Icon: Train,    label: "Trains",        liveKey: "trains",   secKey: "trains"    },
  { id: "sec-parking",   Icon: Car,      label: "Parking",       liveKey: "parking",  secKey: "parking"   },
  { id: "sec-bikes",     Icon: Bike,     label: "Bikes",         liveKey: "bikes",    secKey: "bikes"     },
  { id: "sec-counters",  Icon: Activity, label: "Counters",      liveKey: "counters", secKey: "counters"  },
  { id: "sec-sea",       Icon: Waves,    label: "North Sea",     liveKey: "water",    secKey: "sea"       },
  { id: "sec-nightlife", Icon: Music,    label: "Nightlife",     liveKey: "events",   secKey: "nightlife" },
];

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(null);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null || isNaN(Number(target))) { setVal(null); return; }
    const t = Number(target);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(e * t));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return val;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Skeleton = ({ w = "100%", h = 14, r = 6 }) => (
  <div className="skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />
);

const LivePill = ({ live }) => (
  <span className={`lpill ${live ? "lpill--on" : "lpill--off"}`}>
    <span className={`ldot ${live ? "ldot--on" : ""}`} />
    {live ? "LIVE" : "STATIC"}
  </span>
);

function Sparkline({ data, color = "#00FF88", width = 120, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="spk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spk-fill)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionCard({ id, num, title, src, liveKey, summary, isOpen, onToggle, children, liveMode }) {
  const live = liveKey ? liveMode[liveKey] : true;
  return (
    <section className="sc" id={id} aria-labelledby={`${id}-h`} scroll-margin-top="20px">
      <button
        className={`sc__hd${isOpen ? " sc__hd--open" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="sc__hd-l">
          <span className="sc__num">{num}</span>
          <div>
            <h2 id={`${id}-h`} className="sc__title">{title}</h2>
            <span className="sc__src">{src}</span>
          </div>
        </div>
        <div className="sc__hd-r">
          {!isOpen && summary && <span className="sc__sum">{summary}</span>}
          {liveKey && <LivePill live={live} />}
          <ChevronDown
            size={14}
            className={`sc__chev${isOpen ? " sc__chev--open" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>
      <div className={`sc__body${isOpen ? " sc__body--open" : ""}`} aria-hidden={!isOpen}>
        <div className="sc__body-in">{children}</div>
      </div>
    </section>
  );
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function GhentOps() {
  // ── data state ──────────────────────────────────────────────────────────
  const [parking,  setParking]  = useState(null);
  const [bikes,    setBikes]    = useState(null);
  const [weather,  setWeather]  = useState(null);
  const [air,      setAir]      = useState(null);
  const [trains,   setTrains]   = useState(null);
  const [counters, setCounters] = useState(null);
  const [water,    setWater]    = useState(null);
  const [events,   setEvents]   = useState(null);
  const [liveMode, setLiveMode] = useState({
    parking: false, bikes: false, weather: false,
    air: false, trains: false, counters: false, water: false, events: false,
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading,    setLoading]    = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [view,          setView]          = useState("dashboard"); // "dashboard" | "terraces"
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover,  setSidebarHover]  = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState({
    weather: true, air: true, trains: true, parking: true,
    bikes: false, counters: false, sea: false, swim: false, gem: true, nightlife: true,
  });

  const sidebarOpen = sidebarPinned || sidebarHover;
  const toggle = key => setExpanded(s => ({ ...s, [key]: !s[key] }));

  const handleNavClick = (id, secKey) => {
    if (secKey && expanded[secKey] === false)
      setExpanded(s => ({ ...s, [secKey]: true }));
    setMobileMenuOpen(false);
    setTimeout(() => scrollTo(id), 60);
  };

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try { const p = await fetchParking();  if (p.length) { setParking(p);  setLiveMode(m => ({ ...m, parking:  true  })); } else { setParking([]);  setLiveMode(m => ({ ...m, parking:  false })); } } catch { setParking([]);  setLiveMode(m => ({ ...m, parking:  false })); }
    try { const b = await fetchBikes();    const live = b.fleets.length > 0 || b.parkings.length > 0; setBikes(b); setLiveMode(m => ({ ...m, bikes: live })); }  catch { setBikes(null);  setLiveMode(m => ({ ...m, bikes:    false })); }
    try { const w = await fetchWeather();  setWeather(w); setLiveMode(m => ({ ...m, weather: true })); }  catch { setWeather(WEATHER_FALLBACK); setLiveMode(m => ({ ...m, weather: false })); }
    try { const a = await fetchAirQuality(); if (a) { setAir(a); setLiveMode(m => ({ ...m, air: true })); } else { setAir(null); setLiveMode(m => ({ ...m, air: false })); } } catch { setAir(null); setLiveMode(m => ({ ...m, air: false })); }
    try { const t = await fetchTrains();   if (t.length) { setTrains(t);   setLiveMode(m => ({ ...m, trains:   true  })); } else { setTrains([]);   setLiveMode(m => ({ ...m, trains:   false })); } } catch { setTrains([]);   setLiveMode(m => ({ ...m, trains:   false })); }
    try { const c = await fetchBikeCounters(); if (c.length) { setCounters(c); setLiveMode(m => ({ ...m, counters: true  })); } else { setCounters([]); setLiveMode(m => ({ ...m, counters: false })); } } catch { setCounters([]); setLiveMode(m => ({ ...m, counters: false })); }
    try { const wt = await fetchWater();   if (wt) { setWater(wt); setLiveMode(m => ({ ...m, water: true })); } else { setWater(null); setLiveMode(m => ({ ...m, water: false })); } } catch { setWater(null); setLiveMode(m => ({ ...m, water: false })); }
    try { const ev = await fetchNightlifeEvents(); setEvents(ev); setLiveMode(m => ({ ...m, events: ev.length > 0 })); } catch { setEvents([]); setLiveMode(m => ({ ...m, events: false })); }
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const parkData    = parking || [];
  const wxData      = weather || WEATHER_FALLBACK;
  const wxDesc      = describeWeather(wxData.code);
  const quip        = weatherQuip(wxData);
  const gem         = gemOfTheDay();
  const totalSpaces = parkData.reduce((a, p) => a + p.total, 0);
  const freeSpaces  = parkData.reduce((a, p) => a + p.free,  0);
  const cityOcc     = totalSpaces ? Math.round(((totalSpaces - freeSpaces) / totalSpaces) * 100) : 0;
  const cityStatus  = occStatus(cityOcc);
  const emptiest    = parkData.length ? [...parkData].sort((a, b) => a.occupation - b.occupation)[0] : null;
  const liveCount   = Object.values(liveMode).filter(Boolean).length;
  const aqiColor    = air?.aqi != null ? (air.aqi < 25 ? STATUS.ok.color : air.aqi < 50 ? STATUS.warn.color : STATUS.alert.color) : "var(--fg-muted)";
  const aqiLabel    = air?.aqi != null ? (air.aqi < 25 ? "Good" : air.aqi < 50 ? "Moderate" : air.aqi < 75 ? "Unhealthy" : "Very Poor") : "—";
  const parkingLoaded = !!(parking && parking.length);
  const bikesLoaded   = !!(bikes && (bikes.fleets.length || bikes.parkings.length));

  const call = useMemo(() => {
    if (!emptiest) return { level: "info", head: "Loading live data…", body: "Pulling from data.stad.gent and Open-Meteo." };
    if (cityOcc > 85) return { level: "alert", head: "Leave the car — city is packed.", body: `Garages at ${cityOcc}%. Take the tram or a bike.` };
    if (wxData.rainChance > 70) return { level: "warn", head: "Rain coming through.", body: "Grab an umbrella. The Lys won't mind, but you will." };
    if (cityOcc < 50 && wxData.code <= 2) return { level: "ok", head: "Quiet streets, clear sky.", body: `Garages ${cityOcc}%, ${wxData.temp}°C. Graslei is calling.` };
    return { level: "ok", head: `${emptiest.name} is your best bet.`, body: `${emptiest.free} spaces free (${emptiest.occupation}% full).` };
  }, [cityOcc, wxData, emptiest]);

  // ── Count-up values ───────────────────────────────────────────────────────
  const tempVal  = useCountUp(wxData.temp);
  const aqiVal   = useCountUp(air?.aqi);
  const occVal   = useCountUp(cityOcc);
  const bikeVal  = useCountUp(bikes?.totalBikes);
  const rainVal  = useCountUp(wxData.rainChance);

  // ── Section summaries ─────────────────────────────────────────────────────
  const summaries = {
    weather:   wxData.temp != null ? `${wxData.temp}°C · ${wxDesc.label}` : null,
    air:       air?.aqi    != null ? `AQI ${air.aqi} · ${aqiLabel}` : null,
    trains:    trains?.length > 0  ? `Next: ${trains[0].toStation} ${trains[0].time?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : null,
    parking:   parkingLoaded       ? `${cityOcc}% · ${freeSpaces.toLocaleString()} free` : null,
    bikes:     bikesLoaded         ? `${bikes.totalBikes.toLocaleString()} bikes available` : null,
    counters:  counters?.length    ? `${counters.length} counters reporting` : null,
    sea:       water?.waveHeight   != null ? `${water.waveHeight.toFixed(2)}m waves` : null,
    swim:      null,
    gem:       gem.name,
    nightlife: events != null ? `${events.length} events this week` : null,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ops">
      <style>{css}</style>
      <a href="#main" className="skip-link">Skip to content</a>

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside
        className={`sb${sidebarOpen ? " sb--open" : ""}${sidebarPinned ? " sb--pinned" : ""}`}
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
        aria-label="Dashboard navigation"
      >
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo__icon">
            <Radio size={15} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="sb-logo__text">
            <span className="sb-logo__city">GENT</span>
            <span className="sb-logo__now">NOW</span>
          </div>
          <span className="ldot ldot--on sb-logo__dot" aria-label="Live" />
        </div>

        {/* Quip */}
        <div className="sb-quip">{quip}</div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Sections">
          {NAV_ITEMS.map(({ id, Icon, label, liveKey, secKey }) => {
            const live = liveKey ? liveMode[liveKey] : false;
            return (
              <button
                key={id}
                className="sb-item"
                onClick={() => handleNavClick(id, secKey)}
                aria-label={`Go to ${label}`}
              >
                <span className="sb-item__icon">
                  <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="sb-item__label">{label}</span>
                <span className={`sb-item__dot${live ? " sb-item__dot--live" : ""}`} />
              </button>
            );
          })}

          {/* Terraces — switches view */}
          <button
            className={`sb-item sb-item--terraces${view === "terraces" ? " sb-item--active" : ""}`}
            onClick={() => { setView(v => v === "terraces" ? "dashboard" : "terraces"); setMobileMenuOpen(false); }}
            aria-label="Toggle terraces sun tracker"
          >
            <span className="sb-item__icon"><Sun size={14} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="sb-item__label">Terraces ☀</span>
            <span className="sb-item__dot" />
          </button>
        </nav>

        <div className="sb-spacer" />

        {/* Pin button */}
        <button
          className="sb-pin"
          onClick={() => setSidebarPinned(p => !p)}
          aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          <span className="sb-item__icon">
            <Menu size={13} aria-hidden="true" />
          </span>
          <span className="sb-item__label">{sidebarPinned ? "Unpin" : "Pin open"}</span>
        </button>

        {/* Footer */}
        <div className="sb-foot">
          <span className="sb-foot__time sb-item__label">
            {lastUpdate
              ? lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "—"}
          </span>
          <button
            className="sb-refresh"
            onClick={loadAll}
            disabled={loading}
            aria-label="Refresh all data"
          >
            <RefreshCw size={11} className={loading ? "spin" : ""} aria-hidden="true" />
            <span className="sb-item__label">{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════ BODY ═══════════════ */}
      <div className="ops-body">

        {/* Mobile top bar */}
        <div className="mob-bar">
          <div className="mob-bar__brand">
            <Radio size={14} aria-hidden="true" />
            <span>GENT · NOW</span>
            <span className="ldot ldot--on" />
          </div>
          <button className="mob-bar__menu" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="mob-menu">
            {NAV_ITEMS.map(({ id, Icon, label, secKey }) => (
              <button key={id} className="mob-menu__item" onClick={() => handleNavClick(id, secKey)}>
                <Icon size={13} aria-hidden="true" /> {label}
              </button>
            ))}
            <button className="mob-menu__item" onClick={() => { setView(v => v === "terraces" ? "dashboard" : "terraces"); setMobileMenuOpen(false); }}>
              <Sun size={13} aria-hidden="true" /> Terraces ☀
            </button>
          </div>
        )}

        {view === "terraces" ? (
          /* ═══════════════ TERRACES VIEW ═══════════════ */
          <div className="tv">
            <div className="tv__hd">
              <button className="tv__back" onClick={() => setView("dashboard")} aria-label="Back to dashboard">
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Dashboard</span>
              </button>
              <h1 className="tv__title">
                <Sun size={18} aria-hidden="true" />
                Terrace Sun Tracker
              </h1>
            </div>
            <Terraces weather={wxData} />
          </div>
        ) : (
          /* ═══════════════ DASHBOARD ═══════════════ */
          <main id="main" className="main">

            {/* ── STATUS BANNER ───────────────────── */}
            <div className={`banner banner--${call.level}`} role="status" aria-live="polite">
              <span className="banner__icon">
                {call.level === "ok"
                  ? <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
                  : <CircleAlert  size={15} strokeWidth={2} aria-hidden="true" />}
              </span>
              <div className="banner__text">
                <span className="banner__head">{call.head}</span>
                <span className="banner__body">{call.body}</span>
              </div>
              <span className="banner__tag">
                <Zap size={10} aria-hidden="true" />
                {liveCount} live
              </span>
            </div>

            {/* ── KPI ROW ─────────────────────────── */}
            <div className="kpi-row" role="list">

              <div className="kpi" role="listitem">
                <div className="kpi__label">
                  {weatherIcon(wxDesc.icon, 11)} TEMP
                </div>
                <div className="kpi__val">
                  {tempVal ?? "—"}<span className="kpi__unit">°C</span>
                </div>
                <div className="kpi__sub">{wxDesc.label}</div>
                <div className="kpi__bar">
                  <div className="kpi__fill kpi__fill--anim"
                    style={{ "--bar-w": `${Math.min(100, Math.max(0, ((wxData.temp ?? 0) + 10) / 45 * 100))}%`,
                      background: wxData.temp > 22 ? STATUS.alert.color : wxData.temp > 15 ? STATUS.warn.color : STATUS.ok.color }} />
                </div>
              </div>

              <div className="kpi" role="listitem">
                <div className="kpi__label"><Car size={11} aria-hidden="true" /> PARKING</div>
                <div className="kpi__val" style={{ color: cityStatus.color }}>
                  {parkingLoaded ? (occVal ?? "—") : "—"}<span className="kpi__unit">%</span>
                </div>
                <div className="kpi__sub">{parkingLoaded ? `${freeSpaces.toLocaleString()} free` : <Skeleton w={60} h={10} />}</div>
                <div className="kpi__bar">
                  <div className="kpi__fill kpi__fill--anim" style={{ "--bar-w": `${cityOcc}%`, background: cityStatus.color }} />
                </div>
              </div>

              <div className="kpi" role="listitem">
                <div className="kpi__label"><Wind size={11} aria-hidden="true" /> AIR AQI</div>
                <div className="kpi__val" style={{ color: aqiColor }}>
                  {aqiVal ?? "—"}
                </div>
                <div className="kpi__sub" style={{ color: aqiColor }}>{aqiLabel}</div>
                <div className="kpi__bar">
                  <div className="kpi__fill kpi__fill--anim" style={{ "--bar-w": `${Math.min(100, (air?.aqi ?? 0) / 100 * 100)}%`, background: aqiColor }} />
                </div>
              </div>

              <div className="kpi" role="listitem">
                <div className="kpi__label"><Bike size={11} aria-hidden="true" /> BIKES</div>
                <div className="kpi__val" style={{ color: STATUS.ok.color }}>
                  {bikesLoaded ? (bikeVal ?? "—") : "—"}
                </div>
                <div className="kpi__sub">{bikesLoaded ? `${bikes.fleets.length} fleets` : <Skeleton w={60} h={10} />}</div>
              </div>

              <div className="kpi" role="listitem">
                <div className="kpi__label"><Droplets size={11} aria-hidden="true" /> RAIN · 6H</div>
                <div className="kpi__val" style={{ color: wxData.rainChance > 60 ? "#4FC3F7" : undefined }}>
                  {rainVal ?? "—"}<span className="kpi__unit">%</span>
                </div>
                <div className="kpi__sub">
                  {wxData.rainChance > 70 ? "umbrella time" : wxData.rainChance > 40 ? "maybe pack one" : "staying dry"}
                </div>
                <div className="kpi__bar">
                  <div className="kpi__fill kpi__fill--anim" style={{ "--bar-w": `${wxData.rainChance}%`, background: "#4FC3F7" }} />
                </div>
              </div>

            </div>{/* end kpi-row */}

            {/* ── WEATHER ──────────────────────────── */}
            <SectionCard id="sec-weather" num="01" title="Weather" src="Open-Meteo · Ghent centre"
              liveKey="weather" summary={summaries.weather} isOpen={expanded.weather}
              onToggle={() => toggle("weather")} liveMode={liveMode}>
              <div className="wx-wrap">
                <div className="wx-hero">
                  <div className="wx-temp tabular">{wxData.temp ?? "—"}<sup>°C</sup></div>
                  <div className="wx-meta">
                    <div className="wx-meta__icon">{weatherIcon(wxDesc.icon, 36)}</div>
                    <div className="wx-meta__label">{wxDesc.label}</div>
                    <div className="wx-meta__feels">feels {wxData.feels ?? "—"}°</div>
                    {wxData.hourlyTemp?.length > 2 && (
                      <div style={{ marginTop: 10 }}>
                        <Sparkline data={wxData.hourlyTemp} color={STATUS.ok.color} width={110} height={30} />
                        <div style={{ fontSize: 9, color: "var(--fg-muted)", marginTop: 3, fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>
                          NEXT 12H
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="wx-stats">
                  {[
                    { k: "Wind",     v: wxData.wind     ?? "—", u: "km/h", hi: wxData.wind > 25 },
                    { k: "Humidity", v: wxData.humidity ?? "—", u: "%"    },
                    { k: "Rain 6h",  v: wxData.rainChance,       u: "%",   hi: wxData.rainChance > 60, hiColor: "#4FC3F7" },
                    { k: "Precip",   v: wxData.precip,            u: "mm"  },
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
            </SectionCard>

            {/* ── AIR QUALITY ──────────────────────── */}
            <SectionCard id="sec-air" num="02" title="Air Quality" src="European AQI · Open-Meteo"
              liveKey="air" summary={summaries.air} isOpen={expanded.air}
              onToggle={() => toggle("air")} liveMode={liveMode}>
              {air ? (
                <div className="air-wrap">
                  <div className="air-ring-wrap">
                    <div className="air-ring" style={{ "--aqi-c": aqiColor }}>
                      <div className="air-ring__num tabular" style={{ color: aqiColor }}>{air.aqi ?? "—"}</div>
                      <div className="air-ring__lbl">AQI</div>
                    </div>
                    <div className="air-ring__status" style={{ color: aqiColor }}>{aqiLabel.toUpperCase()}</div>
                  </div>
                  <div className="air-metrics">
                    {[
                      { k: "PM2.5", v: air.pm25, u: "μg/m³" },
                      { k: "PM10",  v: air.pm10,  u: "μg/m³" },
                      { k: "NO₂",   v: air.no2,   u: "μg/m³" },
                      { k: "Ozone", v: air.o3,    u: "μg/m³" },
                    ].map(({ k, v, u }) => (
                      <div key={k} className="air-m">
                        <span className="air-m__k">{k}</span>
                        <span className="air-m__v tabular">{v ?? "—"}<em>{u}</em></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sc__empty">Air quality data not available.</div>
              )}
            </SectionCard>

            {/* ── TRAINS ───────────────────────────── */}
            {trains && trains.length > 0 && (
              <SectionCard id="sec-trains" num="03" title="Train Departures" src="iRail · Sint-Pieters &amp; Dampoort"
                liveKey="trains" summary={summaries.trains} isOpen={expanded.trains}
                onToggle={() => toggle("trains")} liveMode={liveMode}>
                <div className="board" role="table" aria-label="Train departures">
                  <div className="board__hd" role="row">
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
                      <div key={i} className={`board__row${t.canceled ? " board__row--cxl" : ""}`} role="row">
                        <span className="board__time tabular" role="cell">{timeStr}</span>
                        <span className="board__dest"         role="cell">{t.toStation || "—"}</span>
                        <span className="board__from"         role="cell">
                          <span className="badge">{t.station.replace("Gent-", "")}</span>
                        </span>
                        <span className="board__plat"         role="cell">
                          <span className="plat-badge">{t.platform}</span>
                        </span>
                        <span className={`board__status tabular${t.canceled ? " s-cxl" : delayMin > 0 ? " s-late" : " s-ok"}`} role="cell">
                          {t.canceled ? "CANCELLED" : delayMin > 0 ? `+${delayMin}m` : "On time"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* ── PARKING ──────────────────────────── */}
            <SectionCard id="sec-parking" num="04" title="Parking Garages" src="Real-time · data.stad.gent · tap pin → directions"
              liveKey="parking" summary={summaries.parking} isOpen={expanded.parking}
              onToggle={() => toggle("parking")} liveMode={liveMode}>
              {parkingLoaded ? (
                <>
                  <div className="sc-map">
                    <MiniMap
                      height={270}
                      markers={parkData.map(p => {
                        const c  = p.coords || lookupParking(p.name);
                        if (!c) return null;
                        const st = occStatus(p.occupation);
                        return {
                          lng: c.lng, lat: c.lat,
                          color: st.color,
                          size:  12 + Math.sqrt(p.total) / 4,
                          label: p.name,
                          sublabel: `${p.occupation}% · ${p.free} free`,
                          mapsHref: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`,
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
                            <div className="park-row__fill kpi__fill--anim"
                              style={{ "--bar-w": `${p.occupation}%`, background: st.color, boxShadow: `0 0 8px ${st.ring}` }} />
                          </div>
                          <div className="park-row__pct tabular" style={{ color: st.color }}>{p.occupation}%</div>
                          <div className="park-row__free tabular">{p.free.toLocaleString()} free</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="sc__loading">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={48} r={4} />)}
                </div>
              )}
            </SectionCard>

            {/* ── BIKES ────────────────────────────── */}
            <SectionCard id="sec-bikes" num="05" title="Shared Bikes" src="Bolt · Donkey Republic · Blue Bike"
              liveKey="bikes" summary={summaries.bikes} isOpen={expanded.bikes}
              onToggle={() => toggle("bikes")} liveMode={liveMode}>
              <div className="bikes-wrap">
                <div className="bikes-hero">
                  <div className="bikes-hero__num tabular">{bikesLoaded ? bikes.totalBikes.toLocaleString() : "—"}</div>
                  <div className="bikes-hero__label">bikes available across Ghent</div>
                  {bikesLoaded && bikes.totalParking > 0 && (
                    <div className="bikes-hero__park">
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
            </SectionCard>

            {/* ── BIKE COUNTERS ────────────────────── */}
            {counters && counters.length > 0 && (
              <SectionCard id="sec-counters" num="06" title="Bike Counters" src="Fietstelpalen · data.stad.gent"
                liveKey="counters" summary={summaries.counters} isOpen={expanded.counters}
                onToggle={() => toggle("counters")} liveMode={liveMode}>
                <div className="counters-grid">
                  {counters.map((c, i) => (
                    <div key={i} className="counter-card">
                      <div className="counter-card__name">{c.name}</div>
                      <div className="counter-card__num tabular">{c.count.toLocaleString()}</div>
                      <div className="counter-card__sub">cyclists · last reading</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── NORTH SEA ────────────────────────── */}
            {water && (water.waveHeight != null || water.seaLevel != null) && (
              <SectionCard id="sec-sea" num="07" title="North Sea" src="Open-Meteo Marine · Scheldt mouth"
                liveKey="water" summary={summaries.sea} isOpen={expanded.sea}
                onToggle={() => toggle("sea")} liveMode={liveMode}>
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
              </SectionCard>
            )}

            {/* ── SWIM SPOTS ───────────────────────── */}
            <SectionCard id="sec-swim" num="08" title="Swim Spots" src="Curated · seasonal info"
              liveKey={null} summary={summaries.swim} isOpen={expanded.swim}
              onToggle={() => toggle("swim")} liveMode={liveMode}>
              <div className="swim-list">
                {WATER_SPOTS.map((s, i) => {
                  const st = STATUS[s.status] || STATUS.info;
                  return (
                    <a key={i}
                      href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="swim-row" aria-label={`${s.name} — ${st.label}`}>
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
            </SectionCard>

            {/* ── GEM OF THE DAY ───────────────────── */}
            <SectionCard id="sec-gem" num="09" title="Gem of the Day" src="Rotates daily · lesser-known Ghent"
              liveKey={null} summary={summaries.gem} isOpen={expanded.gem}
              onToggle={() => toggle("gem")} liveMode={liveMode}>
              <div className="gem-wrap">
                <div className="gem-info">
                  <div className="gem-info__name">{gem.name}</div>
                  <p className="gem-info__tagline">{gem.tagline}</p>
                  <div className="gem-info__tip">
                    <Compass size={12} aria-hidden="true" />
                    <span>{gem.tip}</span>
                  </div>
                  <a className="gem-info__link"
                    href={`https://www.google.com/maps/search/?api=1&query=${gem.coords.lat},${gem.coords.lng}`}
                    target="_blank" rel="noopener noreferrer">
                    <MapPin size={11} aria-hidden="true" />
                    Open in Maps
                    <ArrowUpRight size={11} aria-hidden="true" />
                  </a>
                </div>
                <div className="gem-map">
                  <MiniMap
                    height={180}
                    center={[gem.coords.lng, gem.coords.lat]}
                    zoom={15}
                    markers={[{
                      lng: gem.coords.lng, lat: gem.coords.lat,
                      color: "#00FF88", size: 20, pulse: true,
                      label: gem.name, sublabel: gem.tagline,
                    }]}
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── NIGHTLIFE ────────────────────────── */}
            <SectionCard id="sec-nightlife" num="10" title="Tonight in the Clubs" src="UiTdatabank · data.stad.gent · this week"
              liveKey="events" summary={summaries.nightlife} isOpen={expanded.nightlife}
              onToggle={() => toggle("nightlife")} liveMode={liveMode}>

              {events === null && (
                <div className="sc__loading">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={52} r={6} />)}
                </div>
              )}

              {events !== null && events.length > 0 && (
                <div className="ev-list" aria-label="Events this week">
                  {events.map((e, i) => {
                    const now2    = new Date();
                    const pad2    = n => String(n).padStart(2, "0");
                    const days    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    let dateLabel = null;
                    if (e.date) {
                      const diff = Math.floor((e.date - now2) / 86400000);
                      const t    = `${pad2(e.date.getHours())}:${pad2(e.date.getMinutes())}`;
                      dateLabel  = diff === 0 ? `Tonight · ${t}` : diff === 1 ? `Tomorrow · ${t}` : `${days[e.date.getDay()]} · ${t}`;
                    }
                    const El       = e.url ? "a" : "div";
                    const linkProps = e.url ? { href: e.url, target: "_blank", rel: "noopener noreferrer" } : {};
                    return (
                      <El key={i} className={`ev-row${e.url ? " ev-row--link" : ""}`} {...linkProps} aria-label={e.name}>
                        {dateLabel && <span className="ev-date tabular">{dateLabel}</span>}
                        <div className="ev-body">
                          <span className="ev-name">{e.name}</span>
                          {e.venue && <span className="ev-venue">{e.venue}</span>}
                        </div>
                        {e.category && <span className="ev-cat">{String(e.category).slice(0, 20)}</span>}
                        {e.url && <ArrowUpRight size={11} className="ev-arrow" aria-hidden="true" />}
                      </El>
                    );
                  })}
                </div>
              )}

              {events !== null && events.length === 0 && (
                <p className="sc__empty">No events in UiTdatabank this week — check venues directly.</p>
              )}

              <a className="ev-more" href="https://www.uitinvlaanderen.be/agenda/l/gent" target="_blank" rel="noopener noreferrer">
                <Zap size={11} aria-hidden="true" />
                Full Ghent agenda on UiT in Vlaanderen
                <ArrowUpRight size={11} aria-hidden="true" />
              </a>

              <div className="ev-divider" aria-hidden="true">WHERE THE MUSIC IS</div>

              <p className="sc__intro">Tap a card to check tonight's lineup — venues announce on Instagram first.</p>
              <div className="venues-grid">
                {NIGHTLIFE_VENUES.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                    className="venue-card" aria-label={`${v.name} — ${v.kind}`}>
                    <div className="venue-card__hd">
                      <span className="venue-card__tag">{v.tag}</span>
                      <ArrowUpRight size={12} className="venue-card__arrow" aria-hidden="true" />
                    </div>
                    <div className="venue-card__name">{v.name}</div>
                    <div className="venue-card__kind">{v.kind}</div>
                    <div className="venue-card__vibe">{v.vibe}</div>
                    <div className="venue-card__foot">
                      <span className="venue-card__area"><MapPin size={9} aria-hidden="true" /> {v.area}</span>
                      <a href={v.web} target="_blank" rel="noopener noreferrer"
                        className="venue-card__web" onClick={e => e.stopPropagation()} aria-label={`${v.name} website`}>
                        Web
                      </a>
                    </div>
                  </a>
                ))}
              </div>
            </SectionCard>

          </main>
        )}

        {/* FOOTER */}
        {view !== "terraces" && (
          <footer className="foot" role="contentinfo">
            <div className="foot__towers" aria-hidden="true">
              <ThreeTowers height={28} color="rgba(255,255,255,0.025)" opacity={1} />
            </div>
            <div className="foot__inner">
              <div className="foot__brand">GENT · NOW</div>
              <div className="foot__meta">data.stad.gent · Open-Meteo · iRail · OSM · CARTO</div>
              <div className="foot__time tabular" aria-live="polite">
                {lastUpdate
                  ? `↻ ${lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                  : "—"}
                {" · "}Ghent · {new Date().getFullYear()}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS — OLED dark + neon, collapsible sidebar, expandable cards
// ═══════════════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ── VARIABLES ──────────────────────────────────────────────────────── */
.ops {
  --bg:       #000000;
  --bg2:      #050505;
  --surface:  #080808;
  --card:     #0A0A0A;
  --card2:    #101010;
  --muted:    #161616;
  --border:   rgba(255,255,255,0.06);
  --border-s: rgba(255,255,255,0.035);
  --fg:       #DEDEDE;
  --fg-muted: #4A4A5C;
  --fg-dim:   #202028;
  --accent:   #00FF88;
  --acc-bg:   rgba(0,255,136,0.06);
  --acc-ring: rgba(0,255,136,0.22);
  --warn:     #FF9500;
  --alert:    #FF453A;
  --blue:     #4FC3F7;
  --sans:     'Inter', system-ui, sans-serif;
  --mono:     'JetBrains Mono', ui-monospace, monospace;
  --ease:     cubic-bezier(0.16, 1, 0.3, 1);
  --r:        10px;
  --sb-w:     64px;
  --sb-open:  242px;

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
.ops * { box-sizing: border-box; }
.ops .tabular { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.skip-link {
  position: absolute; left: -9999px; top: 0;
  background: var(--accent); color: #000;
  padding: 8px 14px; z-index: 999; font-family: var(--mono); font-size: 12px;
}
.skip-link:focus { left: 0; }
.ops :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  .ops *, .ops *::before, .ops *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ── LIVE DOTS ───────────────────────────────────────────────────────── */
.ldot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--fg-dim);
  flex-shrink: 0;
}
.ldot--on {
  background: var(--accent);
  animation: ldot-pulse 2s ease-in-out infinite;
}
@keyframes ldot-pulse {
  0%,100% { box-shadow: 0 0 0 0 var(--acc-ring); }
  50%      { box-shadow: 0 0 0 5px transparent; }
}

/* ── LIVE PILL ───────────────────────────────────────────────────────── */
.lpill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.15em; padding: 3px 8px; border-radius: 99px;
  flex-shrink: 0;
}
.lpill--on  { color: var(--accent); border: 1px solid rgba(0,255,136,0.28); background: rgba(0,255,136,0.06); }
.lpill--off { color: var(--fg-muted); border: 1px solid var(--border); background: transparent; }

/* ── SPIN ────────────────────────────────────────────────────────────── */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── SKELETON ────────────────────────────────────────────────────────── */
.skel {
  background: linear-gradient(90deg, var(--muted) 25%, var(--card2) 50%, var(--muted) 75%);
  background-size: 200% 100%;
  animation: skel-sweep 1.6s ease infinite;
}
@keyframes skel-sweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── BAR ANIMATION ───────────────────────────────────────────────────── */
@keyframes bar-in {
  from { width: 0; }
  to   { width: var(--bar-w, 0%); }
}
.kpi__fill--anim {
  animation: bar-in 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.park-row__fill.kpi__fill--anim {
  animation: bar-in 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* ── SIDEBAR ─────────────────────────────────────────────────────────── */
.sb {
  width: var(--sb-w);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 260ms var(--ease);
  z-index: 50;
}
.sb--open { width: var(--sb-open); }

/* Logo */
.sb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--border-s);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}
.sb-logo__icon {
  width: 32px; height: 32px; flex-shrink: 0;
  background: var(--acc-bg);
  border: 1px solid rgba(0,255,136,0.18);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.sb-logo__text { display: flex; flex-direction: column; line-height: 1; overflow: hidden; }
.sb-logo__city {
  font-family: var(--mono); font-weight: 700; font-size: 12px;
  letter-spacing: 0.22em; color: var(--fg);
  opacity: 0; transition: opacity 200ms ease;
}
.sb--open .sb-logo__city { opacity: 1; }
.sb-logo__now {
  font-family: var(--mono); font-weight: 500; font-size: 9px;
  letter-spacing: 0.25em; color: var(--accent);
  opacity: 0; transition: opacity 200ms ease 30ms;
}
.sb--open .sb-logo__now { opacity: 1; }
.sb-logo__dot { margin-left: auto; flex-shrink: 0; }

/* Quip */
.sb-quip {
  padding: 10px 16px;
  font-size: 11px;
  color: var(--fg-muted);
  font-style: italic;
  line-height: 1.5;
  border-bottom: 1px solid var(--border-s);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 200ms ease;
}
.sb--open .sb-quip { opacity: 1; }

/* Nav */
.sb-nav {
  display: flex; flex-direction: column;
  padding: 8px 6px 8px;
  gap: 2px;
  overflow: hidden;
}

.sb-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  text-align: left;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  transition: background 140ms var(--ease), color 140ms var(--ease);
  font-family: var(--sans);
  font-size: 13px;
}
.sb-item:hover { background: var(--muted); color: var(--fg); }
.sb-item--active { color: var(--accent) !important; background: var(--acc-bg) !important; }
.sb-item--terraces { margin-top: 4px; border-top: 1px solid var(--border-s); padding-top: 12px; }

.sb-item__icon {
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 6px;
  background: var(--muted);
  display: flex; align-items: center; justify-content: center;
  transition: background 140ms var(--ease);
}
.sb-item:hover .sb-item__icon { background: var(--card2); }
.sb-item--active .sb-item__icon { background: var(--acc-bg); color: var(--accent); }

.sb-item__label {
  flex: 1;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 200ms ease, transform 200ms ease;
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb--open .sb-item__label {
  opacity: 1;
  transform: translateX(0);
}

.sb-item__dot {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  background: var(--fg-dim);
  opacity: 0; transition: opacity 200ms ease;
}
.sb-item__dot--live { background: var(--accent); box-shadow: 0 0 5px var(--acc-ring); }
.sb--open .sb-item__dot { opacity: 1; }

.sb-spacer { flex: 1; }

.sb-pin {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px;
  border: none; border-top: 1px solid var(--border-s);
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  width: 100%;
  white-space: nowrap; overflow: hidden;
  transition: background 140ms var(--ease), color 140ms var(--ease);
  font-family: var(--sans); font-size: 12px;
}
.sb-pin:hover { background: var(--muted); color: var(--fg); }
.sb--pinned .sb-pin { color: var(--accent); }

.sb-foot {
  padding: 10px 6px 16px;
  border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 6px;
  flex-shrink: 0; overflow: hidden;
}
.sb-foot__time {
  font-family: var(--mono); font-size: 10px;
  color: var(--fg-muted); letter-spacing: 0.05em;
  padding: 0 10px;
}

.sb-refresh {
  display: flex; align-items: center; gap: 8px;
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--fg);
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.08em;
  padding: 7px 10px; border-radius: 6px; cursor: pointer;
  transition: all 150ms var(--ease); width: 100%; white-space: nowrap;
}
.sb-refresh:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--acc-bg); }
.sb-refresh:disabled { opacity: 0.4; cursor: wait; }

/* ── MOBILE TOP BAR ──────────────────────────────────────────────────── */
.mob-bar { display: none; }
.mob-menu { display: none; }

/* ── OPS BODY ────────────────────────────────────────────────────────── */
.ops-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

/* ── MAIN ────────────────────────────────────────────────────────────── */
.main {
  padding: 20px 24px 24px;
  display: flex; flex-direction: column; gap: 12px;
  max-width: 1080px; flex: 1;
}

/* ── TERRACES VIEW ───────────────────────────────────────────────────── */
.tv { display: flex; flex-direction: column; flex: 1; }
.tv__hd {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  position: sticky; top: 0; z-index: 10;
}
.tv__back {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; color: var(--fg-muted); text-decoration: none;
  background: var(--muted); border: 1px solid var(--border);
  padding: 6px 12px; border-radius: 6px; cursor: pointer;
  transition: all 150ms var(--ease);
}
.tv__back:hover { color: var(--fg); border-color: rgba(255,255,255,0.12); }
.tv__title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; margin: 0; color: var(--fg);
}
.tv__title svg { color: var(--warn); }

/* ── STATUS BANNER ───────────────────────────────────────────────────── */
.banner {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  border-radius: var(--r);
  border: 1px solid var(--border);
  background: var(--card);
  position: relative; overflow: hidden;
  transition: border-color 300ms var(--ease);
}
.banner::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 0 2px 2px 0;
}
.banner--ok    { border-color: rgba(0,255,136,0.12);  }
.banner--warn  { border-color: rgba(255,149,0,0.12);  }
.banner--alert { border-color: rgba(255,69,58,0.12);  }
.banner--ok    .banner__icon { color: var(--accent); }
.banner--warn  .banner__icon { color: var(--warn);   }
.banner--alert .banner__icon { color: var(--alert);  }
.banner--ok::before    { background: var(--accent); box-shadow: 0 0 12px var(--acc-ring); }
.banner--warn::before  { background: var(--warn);   box-shadow: 0 0 12px rgba(255,149,0,0.3); }
.banner--alert::before { background: var(--alert);  box-shadow: 0 0 12px rgba(255,69,58,0.3); }
.banner--info  .banner__icon { color: var(--fg-muted); }
.banner--info::before { background: var(--fg-dim); }

.banner__icon { flex-shrink: 0; }
.banner__text { flex: 1; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.banner__head { font-weight: 600; font-size: 14px; color: var(--fg); }
.banner__body { font-size: 12px; color: var(--fg-muted); }
.banner__tag {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.1em; color: var(--fg-muted);
  padding: 3px 8px; border-radius: 99px;
  border: 1px solid var(--border); background: var(--muted);
}

/* ── KPI ROW ─────────────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.kpi {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px 18px;
  display: flex; flex-direction: column;
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease), transform 200ms var(--ease);
  cursor: default;
}
.kpi:hover {
  border-color: rgba(255,255,255,0.11);
  box-shadow: 0 6px 28px rgba(0,0,0,0.55);
  transform: translateY(-1px);
}
.kpi__label {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-muted);
  text-transform: uppercase; margin-bottom: 10px;
}
.kpi__val {
  font-family: var(--mono); font-weight: 800;
  font-size: 32px; line-height: 1;
  letter-spacing: -0.03em; color: var(--fg);
  margin-bottom: 5px;
}
.kpi__unit { font-size: 14px; color: var(--fg-muted); margin-left: 2px; font-weight: 500; }
.kpi__sub {
  font-size: 11px; color: var(--fg-muted);
  display: flex; align-items: center; gap: 4px;
  min-height: 16px; flex: 1;
}
.kpi__bar {
  margin-top: 12px; height: 2px; border-radius: 99px;
  background: var(--muted); overflow: hidden;
}
.kpi__fill {
  height: 100%;
  border-radius: 99px;
  width: var(--bar-w, 0%);
}

/* ── SECTION CARD ────────────────────────────────────────────────────── */
.sc {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  scroll-margin-top: 20px;
  transition: border-color 200ms var(--ease);
}
.sc:hover { border-color: rgba(255,255,255,0.09); }

.sc__hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px;
  border: none; background: transparent; color: inherit;
  cursor: pointer; width: 100%; text-align: left;
  gap: 12px; flex-wrap: wrap;
  transition: background 140ms var(--ease);
  border-bottom: 1px solid transparent;
}
.sc__hd:hover { background: rgba(255,255,255,0.015); }
.sc__hd--open { border-bottom-color: var(--border-s); }

.sc__hd-l { display: flex; align-items: center; gap: 14px; min-width: 0; }
.sc__hd-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.sc__num {
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--fg-dim);
  background: var(--muted); padding: 3px 7px; border-radius: 5px;
  flex-shrink: 0;
}
.sc__title {
  font-weight: 600; font-size: 15px; line-height: 1.2;
  margin: 0; letter-spacing: -0.01em;
}
.sc__src {
  display: block; font-family: var(--mono); font-size: 9px;
  letter-spacing: 0.08em; color: var(--fg-muted);
  text-transform: uppercase; margin-top: 3px;
}
.sc__sum {
  font-family: var(--mono); font-size: 11px;
  color: var(--fg-muted); letter-spacing: 0.02em;
  white-space: nowrap;
}
.sc__chev {
  color: var(--fg-muted);
  transition: transform 360ms cubic-bezier(0.16,1,0.3,1), color 150ms ease;
  flex-shrink: 0;
}
.sc__chev--open { transform: rotate(180deg); color: var(--accent); }

/* Expand/collapse via CSS grid rows */
.sc__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 380ms cubic-bezier(0.16,1,0.3,1);
}
.sc__body--open { grid-template-rows: 1fr; }
.sc__body-in { overflow: hidden; }

.sc__empty   { padding: 18px 22px; color: var(--fg-muted); font-size: 13px; }
.sc__loading { padding: 14px 22px; display: flex; flex-direction: column; gap: 8px; }
.sc__intro   { padding: 14px 22px 2px; font-size: 13px; color: var(--fg-muted); line-height: 1.6; margin: 0; }

/* ── MAP IN SECTION ──────────────────────────────────────────────────── */
.sc-map {
  border-bottom: 1px solid var(--border-s);
  background: var(--bg);
  overflow: hidden;
}

/* ── WEATHER ─────────────────────────────────────────────────────────── */
.wx-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  border-bottom: 1px solid var(--border-s);
}
.wx-hero {
  display: flex; align-items: center; gap: 22px;
  padding: 24px 28px;
  border-right: 1px solid var(--border-s);
}
.wx-temp {
  font-family: var(--mono); font-weight: 800;
  font-size: 60px; line-height: 1; letter-spacing: -0.04em;
  color: var(--fg);
  text-shadow: 0 0 30px rgba(0,255,136,0.12);
}
.wx-temp sup { font-size: 20px; color: var(--fg-muted); font-weight: 500; vertical-align: super; }
.wx-meta { display: flex; flex-direction: column; gap: 4px; }
.wx-meta__icon { color: var(--fg-muted); margin-bottom: 4px; }
.wx-meta__label { font-weight: 600; font-size: 14px; color: var(--fg); }
.wx-meta__feels { font-size: 11px; color: var(--fg-muted); }
.wx-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1px; background: var(--border-s);
}
.wx-stat {
  background: var(--card); padding: 18px 22px;
  display: flex; flex-direction: column; gap: 5px;
}
.wx-stat__k {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em;
  color: var(--fg-dim); text-transform: uppercase;
}
.wx-stat__v {
  font-family: var(--mono); font-weight: 700; font-size: 22px;
  color: var(--fg); line-height: 1;
}
.wx-stat__v em { font-size: 10px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 4px; }

/* ── AIR QUALITY ─────────────────────────────────────────────────────── */
.air-wrap {
  display: flex; align-items: stretch; border-bottom: 1px solid var(--border-s);
}
.air-ring-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 28px 36px; border-right: 1px solid var(--border-s); flex-shrink: 0; gap: 8px;
}
.air-ring {
  width: 80px; height: 80px; border-radius: 50%;
  border: 3px solid var(--aqi-c, var(--accent));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 0 24px color-mix(in srgb, var(--aqi-c, var(--accent)) 18%, transparent);
  transition: border-color 400ms var(--ease), box-shadow 400ms var(--ease);
}
.air-ring__num { font-family: var(--mono); font-weight: 700; font-size: 26px; line-height: 1; letter-spacing: -0.02em; }
.air-ring__lbl { font-family: var(--mono); font-size: 8px; letter-spacing: 0.2em; color: var(--fg-muted); text-transform: uppercase; margin-top: 2px; }
.air-ring__status { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
.air-metrics {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr;
  gap: 1px; background: var(--border-s); align-self: stretch;
}
.air-m { background: var(--card); padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
.air-m__k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; color: var(--fg-dim); text-transform: uppercase; }
.air-m__v { font-family: var(--mono); font-weight: 700; font-size: 20px; color: var(--fg); }
.air-m__v em { font-size: 10px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 3px; }

/* ── DEPARTURE BOARD ─────────────────────────────────────────────────── */
.board { overflow-x: auto; }
.board__hd {
  display: grid; grid-template-columns: 64px 1fr 140px 88px 100px;
  padding: 9px 22px; background: var(--bg);
  border-bottom: 1px solid var(--border-s);
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-dim); text-transform: uppercase;
}
.board__row {
  display: grid; grid-template-columns: 64px 1fr 140px 88px 100px;
  padding: 12px 22px; border-bottom: 1px solid var(--border-s);
  align-items: center; transition: background 140ms var(--ease);
}
.board__row:last-child { border-bottom: none; }
.board__row:hover { background: var(--card2); }
.board__row--cxl { opacity: 0.4; }
.board__time { font-family: var(--mono); font-weight: 700; font-size: 16px; color: var(--accent); letter-spacing: 0.02em; }
.board__row--cxl .board__time { color: var(--alert); text-decoration: line-through; }
.board__dest { font-weight: 500; font-size: 13px; padding-right: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-family: var(--mono); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background: var(--muted); color: var(--fg-muted); letter-spacing: 0.05em; white-space: nowrap; }
.plat-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: var(--card2); border: 1px solid var(--border); font-family: var(--mono); font-weight: 700; font-size: 12px; color: var(--fg); }
.board__status { font-family: var(--mono); font-size: 11px; font-weight: 600; }
.s-ok   { color: var(--accent); }
.s-late { color: var(--warn);   }
.s-cxl  { color: var(--alert);  }

/* ── PARKING ─────────────────────────────────────────────────────────── */
.park-list { display: flex; flex-direction: column; }
.park-row {
  display: grid; grid-template-columns: 1fr 120px 52px 90px;
  gap: 12px; align-items: center;
  padding: 12px 22px; border-bottom: 1px solid var(--border-s);
  transition: background 140ms var(--ease);
}
.park-row:last-child { border-bottom: none; }
.park-row:hover { background: var(--card2); }
.park-row__name { font-weight: 500; font-size: 13px; }
.park-row__track { height: 3px; border-radius: 99px; background: var(--muted); overflow: hidden; position: relative; }
.park-row__fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; }
.park-row__pct  { font-family: var(--mono); font-weight: 700; font-size: 14px; text-align: right; }
.park-row__free { font-family: var(--mono); font-size: 11px; color: var(--fg-muted); text-align: right; }

/* ── BIKES ───────────────────────────────────────────────────────────── */
.bikes-wrap { display: flex; align-items: stretch; border-bottom: 1px solid var(--border-s); }
.bikes-hero {
  padding: 28px; border-right: 1px solid var(--border-s); flex-shrink: 0; min-width: 200px;
}
.bikes-hero__num {
  font-family: var(--mono); font-weight: 800;
  font-size: 52px; line-height: 1; letter-spacing: -0.04em;
  color: var(--accent);
  text-shadow: 0 0 28px rgba(0,255,136,0.25);
}
.bikes-hero__label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg-muted); margin-top: 8px; }
.bikes-hero__park  { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--fg-muted); margin-top: 10px; }
.fleet-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1px; background: var(--border-s); align-self: stretch; }
.fleet-card { background: var(--card); padding: 18px; display: flex; flex-direction: column; gap: 4px; }
.fleet-card__name { font-size: 11px; color: var(--fg-muted); line-height: 1.3; }
.fleet-card__num  { font-family: var(--mono); font-weight: 700; font-size: 26px; color: var(--fg); letter-spacing: -0.02em; line-height: 1; }
.fleet-card__sub  { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-dim); }

/* ── COUNTERS ────────────────────────────────────────────────────────── */
.counters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1px; background: var(--border-s); }
.counter-card { background: var(--card); padding: 20px; }
.counter-card__name { font-size: 12px; color: var(--fg-muted); margin-bottom: 6px; text-transform: capitalize; }
.counter-card__num  { font-family: var(--mono); font-weight: 700; font-size: 28px; color: var(--fg); letter-spacing: -0.02em; }
.counter-card__sub  { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-dim); margin-top: 4px; }

/* ── SEA ─────────────────────────────────────────────────────────────── */
.sea-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1px; background: var(--border-s); }
.sea-stat { background: var(--card); padding: 22px; display: flex; flex-direction: column; gap: 6px; }
.sea-stat__k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-dim); }
.sea-stat__v { font-family: var(--mono); font-weight: 600; font-size: 26px; color: var(--fg); }
.sea-stat__v em { font-size: 12px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 4px; }

/* ── SWIM SPOTS ──────────────────────────────────────────────────────── */
.swim-list { display: flex; flex-direction: column; }
.swim-row {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 22px; border-bottom: 1px solid var(--border-s);
  text-decoration: none; color: var(--fg);
  transition: background 140ms var(--ease), padding-left 140ms var(--ease);
}
.swim-row:last-child { border-bottom: none; }
.swim-row:hover { background: var(--card2); padding-left: 28px; }
.swim-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.swim-body { flex: 1; min-width: 0; }
.swim-name { font-weight: 500; font-size: 14px; }
.swim-kind { font-size: 11px; color: var(--fg-muted); margin-top: 1px; }
.swim-note { font-size: 11px; color: var(--fg-muted); }
.swim-badge { font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 99px; border: 1px solid; flex-shrink: 0; }
.swim-arrow { color: var(--fg-dim); flex-shrink: 0; transition: color 140ms var(--ease); }
.swim-row:hover .swim-arrow { color: var(--accent); }

/* ── GEM ─────────────────────────────────────────────────────────────── */
.gem-wrap { display: grid; grid-template-columns: 1fr auto; border-bottom: 1px solid var(--border-s); }
.gem-info { padding: 22px 24px; display: flex; flex-direction: column; gap: 10px; justify-content: center; }
.gem-info__name    { font-weight: 700; font-size: 22px; letter-spacing: -0.02em; color: var(--fg); }
.gem-info__tagline { font-size: 13px; color: var(--fg-muted); line-height: 1.5; margin: 0; }
.gem-info__tip     { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: var(--fg-muted); font-style: italic; }
.gem-info__tip svg { flex-shrink: 0; color: var(--accent); margin-top: 2px; }
.gem-info__link    {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; color: var(--accent); text-decoration: none;
  border-bottom: 1px solid transparent; transition: border-color 140ms var(--ease); width: fit-content;
}
.gem-info__link:hover { border-color: var(--accent); }
.gem-map { width: 260px; flex-shrink: 0; border-left: 1px solid var(--border-s); overflow: hidden; }

/* ── EVENTS ──────────────────────────────────────────────────────────── */
.ev-list { display: flex; flex-direction: column; border-bottom: 1px solid var(--border-s); }
.ev-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 22px; border-bottom: 1px solid var(--border-s);
  color: var(--fg); text-decoration: none;
  transition: background 140ms var(--ease);
}
.ev-row:last-child { border-bottom: none; }
.ev-row:hover { background: var(--card2); }
.ev-row--link { cursor: pointer; }
.ev-date  { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--fg-muted); letter-spacing: 0.04em; white-space: nowrap; flex-shrink: 0; min-width: 118px; }
.ev-body  { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ev-name  { font-weight: 500; font-size: 13px; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-venue { font-size: 11px; color: var(--fg-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-cat   { font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 99px; background: var(--muted); color: var(--fg-muted); white-space: nowrap; flex-shrink: 0; }
.ev-arrow { color: var(--fg-dim); flex-shrink: 0; transition: color 140ms var(--ease); }
.ev-row:hover .ev-arrow { color: var(--accent); }
.ev-more {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
  color: var(--accent); text-decoration: none;
  padding: 11px 22px; border-bottom: 1px solid var(--border-s);
  transition: background 140ms var(--ease);
}
.ev-more:hover { background: var(--acc-bg); }
.ev-divider {
  padding: 9px 22px;
  font-family: var(--mono); font-size: 9px; font-weight: 700;
  letter-spacing: 0.22em; color: var(--fg-dim); text-transform: uppercase;
  border-bottom: 1px solid var(--border-s); background: var(--bg);
}

/* ── VENUE CARDS ─────────────────────────────────────────────────────── */
.venues-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1px; background: var(--border-s); margin-top: 12px; }
.venue-card {
  background: var(--card); padding: 18px; text-decoration: none; color: var(--fg);
  display: flex; flex-direction: column; gap: 6px;
  transition: background 150ms var(--ease);
  position: relative; overflow: hidden;
}
.venue-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--accent); transform: scaleX(0); transform-origin: left;
  transition: transform 260ms var(--ease);
}
.venue-card:hover { background: var(--card2); }
.venue-card:hover::after { transform: scaleX(1); }
.venue-card__hd   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.venue-card__tag  { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; }
.venue-card__arrow{ color: var(--fg-dim); transition: color 140ms var(--ease); }
.venue-card:hover .venue-card__arrow { color: var(--accent); }
.venue-card__name { font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
.venue-card__kind { font-size: 11px; color: var(--fg-muted); }
.venue-card__vibe { font-size: 12px; color: var(--fg-muted); line-height: 1.45; flex: 1; }
.venue-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.venue-card__area { display: flex; align-items: center; gap: 4px; font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; color: var(--fg-dim); }
.venue-card__web  {
  font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: 0.08em;
  color: var(--fg-muted); text-decoration: none;
  padding: 2px 7px; border-radius: 4px; border: 1px solid var(--border);
  transition: color 140ms var(--ease), border-color 140ms var(--ease);
  flex-shrink: 0;
}
.venue-card__web:hover { color: var(--accent); border-color: rgba(0,255,136,0.3); }

/* ── FOOTER ──────────────────────────────────────────────────────────── */
.foot { position: relative; overflow: hidden; border-top: 1px solid var(--border); background: var(--bg2); }
.foot__towers { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: flex-end; pointer-events: none; }
.foot__inner  { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 16px 24px; }
.foot__brand  { font-family: var(--mono); font-weight: 700; font-size: 12px; letter-spacing: 0.2em; color: var(--fg); }
.foot__meta   { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; color: var(--fg-dim); }
.foot__time   { font-family: var(--mono); font-size: 10px; color: var(--fg-dim); }

/* ── RESPONSIVE ──────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .sb { display: none; }
  .mob-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px; background: var(--bg2);
    border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 40;
  }
  .mob-bar__brand { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-weight: 700; font-size: 13px; letter-spacing: 0.15em; }
  .mob-bar__menu  { background: var(--muted); border: 1px solid var(--border); color: var(--fg); padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; }
  .mob-menu {
    display: flex; flex-direction: column; gap: 1px;
    background: var(--bg2); border-bottom: 1px solid var(--border);
    position: sticky; top: 46px; z-index: 39;
  }
  .mob-menu__item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 18px; border: none; background: transparent;
    color: var(--fg-muted); cursor: pointer; font-family: var(--sans); font-size: 13px; font-weight: 500;
    border-bottom: 1px solid var(--border-s); text-align: left;
    transition: background 140ms ease, color 140ms ease;
  }
  .mob-menu__item:hover { background: var(--muted); color: var(--fg); }
  .main { padding: 14px 14px 20px; }
}
@media (max-width: 640px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .wx-wrap  { grid-template-columns: 1fr; }
  .wx-hero  { border-right: none; border-bottom: 1px solid var(--border-s); }
  .air-wrap { flex-direction: column; }
  .board__hd, .board__row { grid-template-columns: 56px 1fr 100px; }
  .board__from, .board__plat { display: none; }
  .park-row { grid-template-columns: 1fr 52px 70px; }
  .park-row__track { display: none; }
  .bikes-wrap { flex-direction: column; }
  .bikes-hero { border-right: none; border-bottom: 1px solid var(--border-s); }
  .gem-wrap { grid-template-columns: 1fr; }
  .gem-map  { width: 100%; border-left: none; border-top: 1px solid var(--border-s); }
  .sc__hd   { padding: 14px 16px; }
}
`;
