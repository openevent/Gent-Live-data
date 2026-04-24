import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity, Wind, Car, Bike, CalendarDays, RefreshCw, Pause, Play,
  CircleAlert, CircleCheck, TrendingUp, TrendingDown, MapPin, ArrowUpRight,
  Zap, Radio, Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning,
  CloudFog, Droplets, Trash2, Train, Waves, Sparkles, Compass, Music, Disc3,
} from "lucide-react";
import MiniMap, { lookupVenue, lookupParking, lookupAirStation } from "./MiniMap.jsx";
import Terraces from "./Terraces.jsx";
import ThreeTowers from "./ThreeTowers.jsx";
import {
  fetchWeather, describeWeather, gemOfTheDay,
  WATER_SPOTS, TRANSIT_STOPS, WASTE_DISTRICTS, nextWasteDay,
  NIGHTLIFE_VENUES,
} from "./ghent-data.js";

// ═════════════════════════════════════════════════════════════════════════
// Gent · NOW — THE EVERYTHING DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

const API = "/api/gent";

const FALLBACK = {
  parking: [
    { name: "Kouter",            occupation: 78, total: 400,  free: 88 },
    { name: "Vrijdagmarkt",      occupation: 92, total: 600,  free: 48 },
    { name: "Sint-Pietersplein", occupation: 64, total: 680,  free: 245 },
    { name: "Ramen",             occupation: 41, total: 320,  free: 189 },
    { name: "Reep",              occupation: 85, total: 490,  free: 74 },
    { name: "Savaanstraat",      occupation: 56, total: 320,  free: 141 },
    { name: "B-Park The Loop",   occupation: 23, total: 2500, free: 1925 },
    { name: "Dampoort",          occupation: 71, total: 210,  free: 61 },
  ],
  air: [
    { station: "Baudelo",              no2: 18, pm25: 9,  pm10: 14 },
    { station: "Lange Violettestraat", no2: 24, pm25: 11, pm10: 16 },
    { station: "Muide",                no2: 31, pm25: 14, pm10: 22 },
    { station: "Gent Centrum",         no2: 27, pm25: 12, pm10: 19 },
  ],
  events: [
    { title: "Ghent Festivities — Opening",  where: "Sint-Baafsplein",  when: "Today · 20:00" },
    { title: "Light Festival Preview Walk",  where: "Korenmarkt",       when: "Tomorrow · 19:30" },
    { title: "Film Fest Ghent — Shorts",     where: "Sphinx Cinema",    when: "Sat · 21:00" },
    { title: "Jazz at Handelsbeurs",         where: "Kouter 29",        when: "Sun · 20:30" },
    { title: "Spring Book Fair",             where: "ICC Citadelpark",  when: "Next week" },
    { title: "NTGent — The Inspector",       where: "Sint-Baafsplein",  when: "Fri · 20:15" },
  ],
  weather: { temp: 12, feels: 10, humidity: 72, code: 2, wind: 14, precip: 0.2, rainChance: 35, hourlyTemp: [] },
  pumps: 24,
};

const STATUS = {
  ok:    { color: "#22C55E", label: "Clear",    ring: "rgba(34,197,94,0.25)"  },
  warn:  { color: "#F59E0B", label: "Moderate", ring: "rgba(245,158,11,0.25)" },
  alert: { color: "#EF4444", label: "Critical", ring: "rgba(239,68,68,0.25)"  },
  info:  { color: "#94A3B8", label: "Info",     ring: "rgba(148,163,184,0.25)" },
};

const occStatus = (o) => (o < 60 ? STATUS.ok : o < 85 ? STATUS.warn : STATUS.alert);
const airStatus = (n) => (n < 25 ? STATUS.ok : n < 40 ? STATUS.warn : STATUS.alert);

// English weather quip — same spirit, just not Dutch
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

async function fetchParking() {
  const r = await fetch(`${API}?dataset=bezetting-parkeergarages-real-time&limit=20`);
  if (!r.ok) throw new Error("parking");
  const d = await r.json();
  return (d.results || []).map((x) => {
    const total = Number(x.totalcapacity ?? x.totaalcapaciteit ?? 0);
    const free  = Number(x.availablecapacity ?? x.availablespaces ?? 0);
    const occ   = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    return { name: x.name || "Parking", total, free, occupation: occ };
  });
}
async function fetchAir() {
  const r = await fetch(`${API}?dataset=luchtkwaliteit-gent&limit=20`);
  if (!r.ok) throw new Error("air");
  const d = await r.json();
  return (d.results || []).map((x) => ({
    station: x.station_name || x.name || "Station",
    no2:  Number(x.no2 ?? x.value_no2 ?? 0),
    pm25: Number(x.pm25 ?? x.value_pm25 ?? 0),
    pm10: Number(x.pm10 ?? x.value_pm10 ?? 0),
  }));
}
async function fetchEvents() {
  const r = await fetch(`${API}?dataset=cultuur-events-gent&limit=8&order_by=startdate`);
  if (!r.ok) throw new Error("events");
  const d = await r.json();
  return (d.results || []).map((x) => ({
    title: x.title || x.titel || "Event",
    where: x.location || x.locatie || "Gent",
    when:  x.startdate || x.datum || "",
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════

const Skeleton = ({ w = "100%", h = 16, r = 4, style = {} }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

const BulletChart = ({ value, total, label, sublabel }) => {
  const pct = Math.min(100, Math.max(0, (value / total) * 100));
  const status = occStatus(pct);
  return (
    <div className="bullet" aria-label={`${label}: ${value} of ${total} occupied`}>
      <div className="bullet__head">
        <div>
          <div className="bullet__label">{label}</div>
          <div className="bullet__sub tabular">{sublabel}</div>
        </div>
        <div className="bullet__value tabular" style={{ color: status.color }}>
          {Math.round(pct)}<span style={{ opacity: 0.6, fontSize: "0.55em" }}>%</span>
        </div>
      </div>
      <div className="bullet__track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="bullet__zone" style={{ left: "0%",  width: "60%", background: "rgba(34,197,94,0.10)" }} />
        <div className="bullet__zone" style={{ left: "60%", width: "25%", background: "rgba(245,158,11,0.12)" }} />
        <div className="bullet__zone" style={{ left: "85%", width: "15%", background: "rgba(239,68,68,0.14)" }} />
        <div className="bullet__mark" style={{ left: "60%" }} aria-hidden="true" />
        <div className="bullet__mark" style={{ left: "85%" }} aria-hidden="true" />
        <div className="bullet__bar" style={{ width: `${pct}%`, background: status.color, boxShadow: `0 0 12px ${status.ring}` }} />
      </div>
    </div>
  );
};

const StreamingArea = ({ data, paused, accent = "#22C55E", height = 120 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = height;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!data.length) return;
    const max = Math.max(...data) * 1.1;
    const min = Math.min(...data) * 0.9;
    const span = max - min || 1;
    ctx.strokeStyle = "rgba(71,85,105,0.25)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 14) - 7]);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, accent + "55"); grad.addColorStop(1, accent + "00");
    ctx.fillStyle = grad; ctx.beginPath();
    ctx.moveTo(pts[0][0], h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
    const [lx, ly] = pts[pts.length - 1];
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    if (!paused) { ctx.fillStyle = accent + "44"; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill(); }
  }, [data, paused, accent, height]);
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} aria-hidden="true" />;
};

// ═════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════

export default function GhentOps() {
  const [parking, setParking] = useState(null);
  const [air, setAir]         = useState(null);
  const [events, setEvents]   = useState(null);
  const [weather, setWeather] = useState(null);
  const [liveMode, setLiveMode] = useState({ parking: false, air: false, events: false, weather: false });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [paused, setPaused]     = useState(false);
  const [wasteDistrict, setWasteDistrict] = useState("Binnenstad");

  const [bikeStream, setBikeStream] = useState(() => {
    const base = 4821;
    return Array.from({ length: 60 }, (_, i) =>
      base + Math.round(Math.sin(i / 6) * 80 + Math.random() * 40)
    );
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try { const p = await fetchParking(); if (p.length) { setParking(p); setLiveMode((m) => ({ ...m, parking: true })); } else setParking(FALLBACK.parking); }
    catch { setParking(FALLBACK.parking); }
    try { const a = await fetchAir(); if (a.length) { setAir(a); setLiveMode((m) => ({ ...m, air: true })); } else setAir(FALLBACK.air); }
    catch { setAir(FALLBACK.air); }
    try { const e = await fetchEvents(); if (e.length) { setEvents(e); setLiveMode((m) => ({ ...m, events: true })); } else setEvents(FALLBACK.events); }
    catch { setEvents(FALLBACK.events); }
    try { const w = await fetchWeather(); setWeather(w); setLiveMode((m) => ({ ...m, weather: true })); }
    catch { setWeather(FALLBACK.weather); }
    setLastUpdate(new Date()); setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 5 * 60 * 1000); return () => clearInterval(id); }, [loadAll]);

  useEffect(() => {
    if (paused) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setBikeStream((s) => {
        const last = s[s.length - 1];
        const next = Math.max(0, last + Math.round((Math.random() - 0.45) * 50));
        return [...s.slice(1), next];
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  const parkData = parking || FALLBACK.parking;
  const airData  = air     || FALLBACK.air;
  const evData   = events  || FALLBACK.events;
  const wxData   = weather || FALLBACK.weather;

  const totalSpaces = parkData.reduce((a, p) => a + p.total, 0);
  const freeSpaces  = parkData.reduce((a, p) => a + p.free, 0);
  const cityOcc     = totalSpaces ? Math.round(((totalSpaces - freeSpaces) / totalSpaces) * 100) : 0;
  const cityStatus  = occStatus(cityOcc);

  const avgNo2 = airData.length ? Math.round(airData.reduce((a, s) => a + s.no2, 0) / airData.length) : 0;
  const airKpiStatus = airStatus(avgNo2);

  const bikeNow  = bikeStream[bikeStream.length - 1];
  const bikePrev = bikeStream[0];
  const bikeTrend = bikeNow > bikePrev ? "up" : "down";
  const bikeDelta = Math.abs(Math.round(((bikeNow - bikePrev) / bikePrev) * 100));

  const emptiest = [...parkData].sort((a, b) => a.occupation - b.occupation)[0];
  const fullest  = [...parkData].sort((a, b) => b.occupation - a.occupation)[0];

  const wxDesc  = describeWeather(wxData.code);
  const quip    = weatherQuip(wxData);
  const gem     = gemOfTheDay();
  const waste   = WASTE_DISTRICTS.find((d) => d.district === wasteDistrict) || WASTE_DISTRICTS[0];

  const call = useMemo(() => {
    if (cityOcc > 85) return { level: "alert", head: "Leave the car — the city is packed.", body: `Garages at ${cityOcc}%. Take the tram or hop on a bike.` };
    if (avgNo2 > 35)  return { level: "warn",  head: "Air's a bit heavy today.",  body: `NO₂ around ${avgNo2} µg/m³. Quieter streets are kinder on the lungs.` };
    if (wxData.rainChance > 70) return { level: "warn", head: "Rain coming through.", body: "Grab an umbrella. The Lys won't mind, but you will." };
    if (avgNo2 < 20 && cityOcc < 70 && wxData.code <= 2) return { level: "ok", head: "A rare perfect day.", body: `Clean air (NO₂ ${avgNo2}), ${wxData.temp}°C, and the roads breathe. Graslei is calling.` };
    return { level: "ok", head: `${emptiest.name} is open — ${emptiest.free} spaces free.`, body: `Only ${emptiest.occupation}% full. Avoid ${fullest.name} (${fullest.occupation}%).` };
  }, [cityOcc, avgNo2, wxData, emptiest, fullest]);

  const isLoaded = parking && air && events && weather;

  return (
    <div className="ops-root">
      <style>{css}</style>
      <a href="#main" className="skip">Skip to main content</a>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header className="topbar" role="banner">
        <div className="topbar__left">
          <div className="logo">
            <Radio size={16} strokeWidth={2.5} aria-hidden="true" />
            <span className="logo__text">GENT · NOW</span>
          </div>
          <span className="topbar__sep" aria-hidden="true">/</span>
          <span className="topbar__crumb">{quip}</span>
        </div>
        <div className="topbar__right" role="status" aria-live="polite">
          <div className="conn">
            <span className={`conn__dot ${Object.values(liveMode).some(Boolean) ? "live" : "sample"}`} aria-hidden="true" />
            <span className="conn__label tabular">{Object.values(liveMode).some(Boolean) ? "LIVE" : "SAMPLE"}</span>
          </div>
          <div className="topbar__time tabular">
            {lastUpdate ? lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          </div>
          <button className="btn btn--ghost" onClick={loadAll} disabled={loading} aria-label="Refresh data">
            <RefreshCw size={13} className={loading ? "spin" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <main id="main" className="main">

        {/* ── HERO: TODAY'S CALL + KPI ──────────────────────────────── */}
        <section className="hero" aria-labelledby="call-h">
          <article className={`call call--${call.level}`} aria-live="polite">
            <div className="call__header">
              <span className={`call__badge call__badge--${call.level}`}>
                {call.level === "alert" ? <CircleAlert size={12} aria-hidden="true" /> :
                 call.level === "warn"  ? <CircleAlert size={12} aria-hidden="true" /> :
                                          <CircleCheck size={12} aria-hidden="true" />}
                {call.level === "alert" ? "CRITICAL" : call.level === "warn" ? "MODERATE" : "ALL CLEAR"}
              </span>
              <span className="call__kicker">TODAY'S CALL · {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
            <h1 id="call-h" className="call__head">{isLoaded ? call.head : <Skeleton h={38} w="85%" />}</h1>
            <p className="call__body">{isLoaded ? call.body : <Skeleton h={14} w="90%" />}</p>
            <div className="call__meta">
              <span><Zap size={11} aria-hidden="true" /> Updated from {Object.values(liveMode).filter(Boolean).length} live streams</span>
            </div>
          </article>

          <div className="kpi-grid" role="list">
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Car size={14} aria-hidden="true" /><span className="kpi__title">Parking</span>
                <span className={`dot dot--${cityStatus === STATUS.ok ? "ok" : cityStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" /></div>
              <div className="kpi__value tabular">{isLoaded ? cityOcc : "—"}<span className="kpi__unit">%</span></div>
              <div className="kpi__sub tabular">{isLoaded ? `${freeSpaces.toLocaleString()} / ${totalSpaces.toLocaleString()} free` : <Skeleton h={12} w={120} />}</div>
              <div className="kpi__mini-bar"><div className="kpi__mini-fill" style={{ width: `${cityOcc}%`, background: cityStatus.color }} /></div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Wind size={14} aria-hidden="true" /><span className="kpi__title">Air · NO₂</span>
                <span className={`dot dot--${airKpiStatus === STATUS.ok ? "ok" : airKpiStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" /></div>
              <div className="kpi__value tabular">{isLoaded ? avgNo2 : "—"}<span className="kpi__unit">µg/m³</span></div>
              <div className="kpi__sub">{isLoaded ? airKpiStatus.label : <Skeleton h={12} w={80} />}</div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head">{weatherIcon(wxDesc.icon, 14)}<span className="kpi__title">Weather</span>
                <span className="dot dot--ok" aria-hidden="true" /></div>
              <div className="kpi__value tabular">{wxData.temp}<span className="kpi__unit">°C</span></div>
              <div className="kpi__sub">feels {wxData.feels}° · {wxDesc.label.toLowerCase()}</div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Bike size={14} aria-hidden="true" /><span className="kpi__title">Bikes</span>
                <span className="dot dot--ok" aria-hidden="true" /></div>
              <div className="kpi__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="kpi__sub">
                <span className={`trend trend--${bikeTrend}`}>
                  {bikeTrend === "up" ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                  <span className="tabular">{bikeDelta}%</span>
                </span>
                <span className="kpi__sub-text"> past minute</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── WEATHER + AIR QUALITY ─────────────────────────────────── */}
        <section className="split-2" aria-label="Weather and air quality">
          <div className="panel" aria-labelledby="wx-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">01 · ENVIRONMENT</span>
                <h2 id="wx-h" className="panel__title">Right now</h2>
              </div>
              <div className="wx-icon-big">{weatherIcon(wxDesc.icon, 34)}</div>
            </header>
            <div className="wx-hero">
              <div className="wx-hero__temp tabular">{wxData.temp}<span>°C</span></div>
              <div className="wx-hero__desc">
                <div className="wx-hero__label">{wxDesc.label}</div>
                <div className="wx-hero__feels">feels like {wxData.feels}°</div>
              </div>
            </div>
            <div className="wx-grid">
              <div className="wx-stat">
                <span className="wx-stat__k">Wind</span>
                <span className="wx-stat__v tabular">{wxData.wind} <em>km/h</em></span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Humidity</span>
                <span className="wx-stat__v tabular">{wxData.humidity}%</span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Rain chance (6h)</span>
                <span className="wx-stat__v tabular" style={{ color: wxData.rainChance > 60 ? "#60A5FA" : "var(--fg)" }}>
                  {wxData.rainChance}%
                </span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Precipitation</span>
                <span className="wx-stat__v tabular">{wxData.precip} <em>mm</em></span>
              </div>
            </div>
          </div>

          <div className="panel" aria-labelledby="air-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">02 · AIR QUALITY</span>
                <h2 id="air-h" className="panel__title">What you're breathing</h2>
              </div>
              <span className="chip"><CircleAlert size={11} aria-hidden="true" /> Threshold 25 µg/m³</span>
            </header>
            <div className="panel__map">
              {isLoaded && (
                <MiniMap height={160} markers={airData.map((s) => {
                  const c = lookupAirStation(s.station); if (!c) return null;
                  const st = airStatus(s.no2);
                  return { lng: c.lng, lat: c.lat, color: st.color, size: 14 + s.no2 / 3, label: s.station, sublabel: `NO₂ ${s.no2} µg/m³ · ${st.label}` };
                }).filter(Boolean)} />
              )}
            </div>
            <div className="air-compact">
              {isLoaded ? airData.map((s, i) => {
                const st = airStatus(s.no2); const key = st === STATUS.ok ? "ok" : st === STATUS.warn ? "warn" : "alert";
                return (
                  <div key={i} className="air-compact__row">
                    <span className="air-compact__name">{s.station}</span>
                    <span className="air-compact__val tabular" style={{ color: st.color }}>{s.no2} <em>µg/m³</em></span>
                    <span className={`badge badge--${key}`}><span className={`dot dot--${key}`} aria-hidden="true" />{st.label}</span>
                  </div>
                );
              }) : <Skeleton h={80} />}
            </div>
          </div>
        </section>

        {/* ── PARKING ────────────────────────────────────────────────── */}
        <section className="panel" aria-labelledby="parking-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">03 · MOBILITY</span>
              <h2 id="parking-h" className="panel__title">Parking garages</h2>
            </div>
            <span className="chip"><Activity size={11} aria-hidden="true" /> Real-time · click pin for directions</span>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap height={220} markers={parkData.map((p) => {
                const c = lookupParking(p.name); if (!c) return null;
                const st = occStatus(p.occupation);
                return {
                  lng: c.lng, lat: c.lat, color: st.color,
                  size: 12 + Math.sqrt(p.total) / 4,
                  label: p.name, sublabel: `${p.occupation}% full · ${p.free} free`,
                  onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`, "_blank", "noopener"),
                };
              }).filter(Boolean)} />
            )}
          </div>
          <div className="bullet-grid">
            {isLoaded ? parkData.map((p, i) => (
              <BulletChart key={i} value={p.total - p.free} total={p.total} label={p.name} sublabel={`${p.free} free of ${p.total}`} />
            )) : Array.from({ length: 8 }).map((_, i) => <div key={i} className="bullet"><Skeleton h={70} /></div>)}
          </div>
        </section>

        {/* ── TRANSIT + BIKES ────────────────────────────────────────── */}
        <section className="split-2" aria-label="Transit and bikes">
          <div className="panel" aria-labelledby="transit-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">04 · TRANSIT</span>
                <h2 id="transit-h" className="panel__title">De Lijn · tram & bus</h2>
              </div>
              <span className="chip"><Train size={11} aria-hidden="true" /> Central stops</span>
            </header>
            <div className="transit-list">
              {TRANSIT_STOPS.map((s, i) => (
                <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " halte Gent")}`}
                   target="_blank" rel="noopener noreferrer" className="transit">
                  <div className="transit__icon"><Train size={14} aria-hidden="true" /></div>
                  <div className="transit__body">
                    <div className="transit__name">{s.name}</div>
                    <div className="transit__lines">
                      {s.lines.map((l) => <span key={l} className="line-badge">{l}</span>)}
                    </div>
                  </div>
                  <ArrowUpRight size={12} className="transit__arrow" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="panel panel--accent" aria-labelledby="bike-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">05 · CYCLING</span>
                <h2 id="bike-h" className="panel__title">Bike stream</h2>
              </div>
              <button className="btn btn--ghost" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                <span>{paused ? "Resume" : "Pause"}</span>
              </button>
            </header>
            <div className="stream-big">
              <div className="stream-big__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="stream-big__label">cyclists today · city centre</div>
            </div>
            <div className="stream-canvas"><StreamingArea data={bikeStream} paused={paused} accent="#22C55E" height={120} /></div>
            <div className="stream-foot">
              <div><span className="foot__k">Pumps</span><span className="foot__v tabular">{FALLBACK.pumps}</span></div>
              <div><span className="foot__k">Bike streets</span><span className="foot__v tabular">63 <em>km</em></span></div>
              <div><span className="foot__k">Repair pts</span><span className="foot__v tabular">47</span></div>
            </div>
          </div>
        </section>

        {/* ── WATER + GEM ────────────────────────────────────────────── */}
        <section className="split-2" aria-label="Outdoors">
          <div className="panel" aria-labelledby="water-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">06 · OUTDOORS</span>
                <h2 id="water-h" className="panel__title">Swim spots</h2>
              </div>
              <span className="chip"><Waves size={11} aria-hidden="true" /> Season</span>
            </header>
            <div className="water-list">
              {WATER_SPOTS.map((s, i) => {
                const st = STATUS[s.status] || STATUS.info;
                const key = s.status;
                return (
                  <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
                     target="_blank" rel="noopener noreferrer" className="water">
                    <Droplets size={18} style={{ color: st.color, flexShrink: 0 }} aria-hidden="true" />
                    <div className="water__body">
                      <div className="water__name">{s.name}</div>
                      <div className="water__kind">{s.kind}</div>
                      <div className="water__note">{s.note}</div>
                    </div>
                    <span className={`badge badge--${key}`}>{st.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="panel panel--gem" aria-labelledby="gem-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">07 · DISCOVER</span>
                <h2 id="gem-h" className="panel__title">Gem of the day</h2>
              </div>
              <Sparkles size={14} style={{ color: "var(--accent)" }} aria-hidden="true" />
            </header>
            <div className="gem">
              <div className="gem__name">{gem.name}</div>
              <p className="gem__tagline">{gem.tagline}</p>
              <div className="gem__tip">
                <Compass size={12} aria-hidden="true" />
                <span>{gem.tip}</span>
              </div>
              <a className="gem__link" href={`https://www.google.com/maps/search/?api=1&query=${gem.coords.lat},${gem.coords.lng}`}
                 target="_blank" rel="noopener noreferrer">
                <MapPin size={11} aria-hidden="true" />
                <span>Open in Maps</span>
                <ArrowUpRight size={11} aria-hidden="true" />
              </a>
              <div className="gem__mini-map">
                <MiniMap height={140} center={[gem.coords.lng, gem.coords.lat]} zoom={15} markers={[{ lng: gem.coords.lng, lat: gem.coords.lat, color: "#22C55E", size: 18, label: gem.name, sublabel: gem.tagline }]} />
              </div>
            </div>
          </div>
        </section>

        {/* ── EVENTS ─────────────────────────────────────────────────── */}
        <section className="panel" aria-labelledby="events-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">08 · CULTURE</span>
              <h2 id="events-h" className="panel__title">Upcoming in the city</h2>
            </div>
            <span className="chip"><CalendarDays size={11} aria-hidden="true" /> Click to open in Maps</span>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap height={200} markers={evData.slice(0, 6).map((e) => {
                const c = lookupVenue(e.where); if (!c) return null;
                return {
                  lng: c.lng, lat: c.lat, color: "#22C55E", size: 16, label: e.title, sublabel: `${e.where} · ${e.when}`,
                  onClick: () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.where + ", Gent")}`, "_blank", "noopener"),
                };
              }).filter(Boolean)} />
            )}
          </div>
          <div className="events-grid">
            {isLoaded ? evData.slice(0, 6).map((e, i) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((e.where || "Gent") + ", Gent")}`;
              return (
                <a key={i} href={mapsUrl} target="_blank" rel="noopener noreferrer" className="event" aria-label={`${e.title} at ${e.where}, ${e.when}`}>
                  <span className="event__num tabular">{String(i + 1).padStart(2, "0")}</span>
                  <div className="event__body">
                    <div className="event__when tabular">{e.when}</div>
                    <div className="event__title">{e.title}</div>
                    <div className="event__where"><MapPin size={11} aria-hidden="true" /> {e.where}</div>
                  </div>
                  <ArrowUpRight size={14} className="event__arrow" aria-hidden="true" />
                </a>
              );
            }) : Array.from({ length: 6 }).map((_, i) => <div key={i} className="event"><Skeleton h={56} /></div>)}
          </div>
        </section>

        {/* ── NIGHTLIFE ──────────────────────────────────────────────── */}
        <section className="panel" aria-labelledby="nightlife-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">09 · NIGHTLIFE</span>
              <h2 id="nightlife-h" className="panel__title">Tonight in the clubs</h2>
            </div>
            <span className="chip"><Disc3 size={11} aria-hidden="true" /> Tap for tonight's lineup</span>
          </header>
          <div className="nightlife-intro">
            Ghent's club and live-music scene isn't in the city's open data — so this is hand-picked. Each tile opens where the venue actually announces tonight (usually Instagram).
          </div>
          <div className="venues-grid">
            {NIGHTLIFE_VENUES.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                 className="venue" aria-label={`${v.name} — ${v.kind}, opens Instagram`}>
                <div className="venue__head">
                  <div className="venue__icon"><Music size={14} aria-hidden="true" /></div>
                  <span className="venue__tag">{v.tag}</span>
                </div>
                <div className="venue__name">{v.name}</div>
                <div className="venue__kind">{v.kind}</div>
                <div className="venue__vibe">{v.vibe}</div>
                <div className="venue__foot">
                  <span className="venue__area"><MapPin size={10} aria-hidden="true" /> {v.area}</span>
                  <ArrowUpRight size={12} className="venue__arrow" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── WASTE ──────────────────────────────────────────────────── */}
        <section className="panel" aria-labelledby="waste-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">10 · PRACTICAL</span>
              <h2 id="waste-h" className="panel__title">Waste pickup schedule</h2>
            </div>
            <span className="chip"><Trash2 size={11} aria-hidden="true" /> IVAGO · Select district</span>
          </header>
          <div className="waste">
            <div className="waste__selector">
              {WASTE_DISTRICTS.map((d) => (
                <button key={d.district}
                  className={`waste__chip ${wasteDistrict === d.district ? "waste__chip--active" : ""}`}
                  onClick={() => setWasteDistrict(d.district)}>
                  {d.district}
                </button>
              ))}
            </div>
            <div className="waste__grid">
              <div className="waste__card">
                <div className="waste__icon" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}>GFT</div>
                <div className="waste__k">Organic waste</div>
                <div className="waste__v">{waste.gft}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.gft)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__icon" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>PMD</div>
                <div className="waste__k">Plastic · Metal · Drinks</div>
                <div className="waste__v">{waste.pmd}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.pmd)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__icon" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>REST</div>
                <div className="waste__k">General waste</div>
                <div className="waste__v">{waste.rest}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.rest)}</div>
              </div>
            </div>
            <p className="waste__note">
              Your street not listed? Check <a href="https://ivago.be/afvalkalender" target="_blank" rel="noopener noreferrer">ivago.be/afvalkalender</a> for your exact address.
            </p>
          </div>
        </section>
<Terraces weather={wxData} />
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="foot" role="contentinfo">
        <div className="foot__skyline" aria-hidden="true">
          <ThreeTowers height={40} color="#1e293b" opacity={0.9} />
        </div>
        <div className="foot__content">
          <div className="foot__left">
            <div className="foot__title">Gent · Now</div>
            <div className="foot__tagline">Live data for the city, in one place.</div>
          </div>
          <div className="foot__mid">
            <div className="foot__meta">Sources · data.stad.gent · Open-Meteo · OpenStreetMap · CARTO</div>
            <div className="foot__meta tabular">
              {lastUpdate ? `Last refreshed · ${lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "—"}
            </div>
          </div>
          <div className="foot__right">
          
            <div className="foot__small">Ghent · {new Date().getFullYear()} · <span style={{ color: "#22C55E" }}>●</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// CSS — clean ops: Inter sans everywhere, green/slate, no red, subtle towers
// ═════════════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.ops-root {
  --bg:           #0F172A;
  --bg-elev:      #111C33;
  --surface:      #15213D;
  --surface-2:    #1B2847;
  --muted:        #272F42;
  --border:       #334155;
  --border-soft:  rgba(71,85,105,0.35);
  --fg:           #F8FAFC;
  --fg-muted:     #94A3B8;
  --fg-dim:       #64748B;
  --accent:       #22C55E;
  --warn:         #F59E0B;
  --alert:        #EF4444;
  --ring:         rgba(34,197,94,0.4);
  --sans:  'Inter', system-ui, -apple-system, sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, monospace;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --radius: 8px;
  --radius-lg: 12px;

  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
  font-feature-settings: 'cv11','ss01';
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.ops-root * { box-sizing: border-box; }
.ops-root .tabular { font-variant-numeric: tabular-nums; }

.skip {
  position: absolute; left: -9999px; top: 0;
  background: var(--accent); color: #0B1220;
  padding: 8px 14px; z-index: 100;
  font-family: var(--mono); font-size: 12px; font-weight: 600;
}
.skip:focus { left: 0; }
.ops-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  .ops-root *, .ops-root *::before, .ops-root *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ── TOP BAR ─────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; border-bottom: 1px solid var(--border);
  background: rgba(15,23,42,0.85); backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 10; gap: 16px; flex-wrap: wrap;
}
.topbar__left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
.logo { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; color: var(--accent); }
.logo__text { color: var(--fg); letter-spacing: 0.15em; }
.topbar__sep { color: var(--fg-dim); }
.topbar__crumb {
  font-size: 12px; color: var(--fg-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-style: italic;
}
.topbar__right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }

.conn { display: inline-flex; align-items: center; gap: 6px; }
.conn__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fg-dim); }
.conn__dot.live { background: var(--accent); animation: pulse 1.8s ease-in-out infinite; }
.conn__dot.sample { background: var(--warn); }
.conn__label { font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.15em; color: var(--fg-muted); }
.topbar__time { font-family: var(--mono); font-size: 11px; color: var(--fg-muted); }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 var(--ring); } 50% { box-shadow: 0 0 0 6px transparent; } }

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid var(--border); color: var(--fg);
  font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: 0.05em;
  padding: 7px 12px; border-radius: 4px; min-height: 32px; cursor: pointer;
  transition: all 150ms var(--ease);
}
.btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: rgba(34,197,94,0.06); }
.btn:active:not(:disabled) { transform: translateY(1px); opacity: 0.8; }
.btn:disabled { opacity: 0.5; cursor: wait; }
.btn--ghost { background: rgba(255,255,255,0.02); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── MAIN ─────────────────────────────────────────────────────── */
.main {
  max-width: 1440px; margin: 0 auto;
  padding: 24px; display: flex; flex-direction: column; gap: 24px;
}

/* ── HERO ─────────────────────────────────────────────────────── */
.hero { display: grid; grid-template-columns: 1.2fr 2fr; gap: 16px; }

.call {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 24px; position: relative; overflow: hidden;
}
.call::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.call--warn::before  { background: linear-gradient(90deg, transparent, var(--warn), transparent); }
.call--alert::before { background: linear-gradient(90deg, transparent, var(--alert), transparent); }
.call__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.call__badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.15em;
  padding: 4px 8px; border-radius: 4px;
}
.call__badge--ok    { background: rgba(34,197,94,0.12);  color: var(--accent); border: 1px solid rgba(34,197,94,0.3); }
.call__badge--warn  { background: rgba(245,158,11,0.12); color: var(--warn);   border: 1px solid rgba(245,158,11,0.3); }
.call__badge--alert { background: rgba(239,68,68,0.12);  color: var(--alert);  border: 1px solid rgba(239,68,68,0.3); }
.call__kicker { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em; color: var(--fg-dim); text-transform: uppercase; }
.call__head {
  font-weight: 600; font-size: 26px; line-height: 1.15;
  letter-spacing: -0.02em; margin: 0 0 10px; color: var(--fg);
}
.call__body { font-size: 14px; line-height: 1.55; color: var(--fg-muted); margin: 0 0 16px; max-width: 45ch; }
.call__meta {
  display: flex; align-items: center; gap: 12px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--fg-dim); padding-top: 14px; border-top: 1px solid var(--border-soft);
}
.call__meta span { display: inline-flex; align-items: center; gap: 4px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px;
  display: flex; flex-direction: column;
  transition: border-color 220ms var(--ease);
}
.kpi:hover { border-color: var(--fg-dim); }
.kpi__head { display: flex; align-items: center; gap: 6px; color: var(--fg-muted); margin-bottom: 8px; }
.kpi__title { font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; flex: 1; }
.kpi__value { font-weight: 600; font-size: 32px; line-height: 1; color: var(--fg); letter-spacing: -0.02em; margin-bottom: 4px; }
.kpi__unit { font-size: 13px; color: var(--fg-muted); margin-left: 3px; font-weight: 500; }
.kpi__sub { font-size: 11px; color: var(--fg-muted); min-height: 16px; display: flex; align-items: center; gap: 6px; }
.kpi__sub-text { color: var(--fg-dim); }
.kpi__mini-bar { margin-top: 10px; height: 3px; border-radius: 99px; background: var(--muted); overflow: hidden; }
.kpi__mini-fill { height: 100%; transition: width 220ms var(--ease); }

.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot--ok    { background: var(--accent); box-shadow: 0 0 8px var(--ring); }
.dot--warn  { background: var(--warn);   box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.dot--alert { background: var(--alert);  box-shadow: 0 0 8px rgba(239,68,68,0.4); }
.dot--info  { background: var(--fg-dim); }

.trend { display: inline-flex; align-items: center; gap: 3px; font-family: var(--mono); font-weight: 600; }
.trend--up   { color: var(--accent); }
.trend--down { color: var(--alert); }

/* ── PANEL ────────────────────────────────────────────────────── */
.panel {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}
.panel--accent { background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 60%); border-color: rgba(34,197,94,0.2); }
.panel--gem    { background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 60%); }

.panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border-soft);
  gap: 12px; flex-wrap: wrap;
}
.panel__kicker {
  display: block; font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-dim); margin-bottom: 2px; text-transform: uppercase;
}
.panel__title { font-weight: 600; font-size: 18px; line-height: 1.2; margin: 0; color: var(--fg); letter-spacing: -0.005em; }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--fg-muted); padding: 5px 9px;
  background: var(--muted); border: 1px solid var(--border-soft); border-radius: 99px;
}
.panel__map { padding: 12px 20px; border-bottom: 1px solid var(--border-soft); background: var(--bg); }

.split-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ── WEATHER ──────────────────────────────────────────────────── */
.wx-icon-big { color: var(--fg-muted); }
.wx-hero { display: flex; align-items: center; gap: 18px; padding: 20px; border-bottom: 1px solid var(--border-soft); }
.wx-hero__temp { font-weight: 600; font-size: 56px; line-height: 1; letter-spacing: -0.04em; color: var(--fg); }
.wx-hero__temp span { font-size: 22px; color: var(--fg-muted); margin-left: 3px; font-weight: 500; }
.wx-hero__label { font-size: 16px; font-weight: 500; color: var(--fg); }
.wx-hero__feels { font-size: 12px; color: var(--fg-muted); margin-top: 2px; }

.wx-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--border-soft); }
.wx-stat { padding: 14px 20px; background: var(--bg-elev); display: flex; flex-direction: column; gap: 4px; }
.wx-stat__k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; color: var(--fg-dim); text-transform: uppercase; }
.wx-stat__v { font-weight: 600; font-size: 20px; color: var(--fg); }
.wx-stat__v em { font-size: 11px; color: var(--fg-muted); margin-left: 3px; font-style: normal; font-weight: 400; }

/* ── AIR COMPACT ─────────────────────────────────────────────── */
.air-compact { padding: 10px 20px 16px; }
.air-compact__row {
  display: grid; grid-template-columns: 1.5fr auto auto;
  align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px dashed var(--border-soft);
}
.air-compact__row:last-child { border-bottom: none; }
.air-compact__name { font-weight: 500; }
.air-compact__val { font-weight: 600; font-size: 18px; }
.air-compact__val em { font-size: 10px; color: var(--fg-muted); font-style: normal; font-weight: 400; margin-left: 3px; }
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  padding: 3px 8px; border-radius: 99px;
}
.badge--ok    { background: rgba(34,197,94,0.10);  color: var(--accent); }
.badge--warn  { background: rgba(245,158,11,0.10); color: var(--warn); }
.badge--alert { background: rgba(239,68,68,0.10);  color: var(--alert); }
.badge--info  { background: rgba(148,163,184,0.10); color: var(--fg-muted); }

/* ── BULLET ──────────────────────────────────────────────────── */
.bullet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border-soft); padding: 1px; }
.bullet { background: var(--bg-elev); padding: 16px 18px; transition: background 220ms var(--ease); }
.bullet:hover { background: var(--surface); }
.bullet__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
.bullet__label { font-weight: 500; font-size: 13px; color: var(--fg); line-height: 1.3; }
.bullet__sub { font-size: 10px; color: var(--fg-muted); margin-top: 2px; }
.bullet__value { font-weight: 600; font-size: 22px; line-height: 1; letter-spacing: -0.02em; }
.bullet__track { position: relative; height: 10px; background: var(--muted); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
.bullet__zone { position: absolute; top: 0; bottom: 0; }
.bullet__mark { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--fg); opacity: 0.35; }
.bullet__bar { position: absolute; top: 2px; bottom: 2px; left: 0; border-radius: 1px; transition: width 600ms var(--ease); }

/* ── TRANSIT ─────────────────────────────────────────────────── */
.transit-list { padding: 10px 20px 16px; display: flex; flex-direction: column; }
.transit {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.transit:last-child { border-bottom: none; }
.transit:hover { padding-left: 6px; }
.transit__icon { width: 32px; height: 32px; border-radius: 6px; background: var(--muted); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.transit__body { flex: 1; min-width: 0; }
.transit__name { font-weight: 500; font-size: 14px; margin-bottom: 2px; }
.transit__lines { display: flex; gap: 4px; flex-wrap: wrap; }
.line-badge {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  padding: 2px 6px; border-radius: 3px;
  background: var(--accent); color: #0B1220;
  min-width: 20px; text-align: center;
}
.transit__arrow { color: var(--fg-dim); transition: color 150ms var(--ease); flex-shrink: 0; }
.transit:hover .transit__arrow { color: var(--accent); }

/* ── BIKE STREAM ─────────────────────────────────────────────── */
.stream-big { padding: 18px 20px 6px; }
.stream-big__value { font-weight: 600; font-size: 44px; line-height: 1; letter-spacing: -0.03em; color: var(--fg); }
.stream-big__label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-muted); margin-top: 6px; }
.stream-canvas { padding: 0 20px; }
.stream-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border-soft); margin-top: 10px; }
.foot__k { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-dim); margin-bottom: 4px; }
.foot__v { font-weight: 600; font-size: 18px; color: var(--fg); }
.foot__v em { font-size: 11px; font-style: normal; color: var(--fg-muted); margin-left: 2px; font-weight: 400; }

/* ── WATER ───────────────────────────────────────────────────── */
.water-list { padding: 10px 20px 16px; display: flex; flex-direction: column; }
.water {
  display: flex; align-items: center; gap: 14px; padding: 14px 0;
  border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.water:last-child { border-bottom: none; }
.water:hover { padding-left: 6px; }
.water__body { flex: 1; min-width: 0; }
.water__name { font-weight: 500; font-size: 14px; margin-bottom: 2px; }
.water__kind { font-size: 11px; color: var(--fg-muted); margin-bottom: 1px; }
.water__note { font-size: 11px; color: var(--fg-dim); font-style: italic; }

/* ── GEM ─────────────────────────────────────────────────────── */
.gem { padding: 20px; }
.gem__name { font-weight: 600; font-size: 24px; line-height: 1.1; color: var(--fg); margin-bottom: 6px; letter-spacing: -0.01em; }
.gem__tagline { font-size: 14px; color: var(--fg-muted); margin: 0 0 14px; line-height: 1.5; }
.gem__tip {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; background: rgba(34,197,94,0.08);
  border-left: 2px solid var(--accent);
  border-radius: 0 4px 4px 0;
  font-size: 13px; color: var(--fg); margin-bottom: 14px;
}
.gem__link {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  color: var(--accent); text-decoration: none;
  padding: 6px 10px; border: 1px solid var(--accent); border-radius: 4px;
  transition: all 150ms var(--ease); text-transform: uppercase;
}
.gem__link:hover { background: var(--accent); color: #0B1220; }
.gem__mini-map { margin-top: 16px; }

/* ── EVENTS ──────────────────────────────────────────────────── */
.events-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border-soft); }
.event {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 18px 20px; background: var(--bg-elev);
  color: var(--fg); text-decoration: none;
  transition: background 220ms var(--ease);
  min-height: 88px;
}
.event:hover { background: var(--surface); }
.event__num { font-weight: 600; font-size: 20px; color: var(--accent); line-height: 1; min-width: 22px; padding-top: 2px; }
.event__body { flex: 1; min-width: 0; }
.event__when { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-muted); text-transform: uppercase; margin-bottom: 4px; }
.event__title { font-weight: 500; font-size: 15px; line-height: 1.3; margin-bottom: 4px; color: var(--fg); }
.event__where { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--fg-muted); }
.event__arrow { color: var(--fg-dim); transition: color 150ms var(--ease), transform 150ms var(--ease); flex-shrink: 0; margin-top: 2px; }
.event:hover .event__arrow { color: var(--accent); transform: translate(2px, -2px); }

/* ── NIGHTLIFE ───────────────────────────────────────────────── */
.nightlife-intro {
  padding: 14px 20px;
  font-size: 12px;
  color: var(--fg-muted);
  border-bottom: 1px solid var(--border-soft);
  font-style: italic;
  line-height: 1.5;
  max-width: 70ch;
}
.venues-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-soft);
}
.venue {
  display: flex; flex-direction: column;
  gap: 6px; padding: 18px 20px 16px;
  background: var(--bg-elev);
  color: var(--fg); text-decoration: none;
  transition: background 220ms var(--ease);
  min-height: 160px;
  position: relative;
}
.venue:hover { background: var(--surface); }
.venue__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.venue__icon {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--muted);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  transition: background 180ms var(--ease), color 180ms var(--ease);
}
.venue:hover .venue__icon {
  background: rgba(34,197,94,0.15);
}
.venue__tag {
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.15em; color: var(--fg-dim);
  padding: 3px 6px; border-radius: 3px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-soft);
}
.venue__name {
  font-weight: 600; font-size: 15px;
  color: var(--fg); letter-spacing: -0.01em;
  line-height: 1.2;
}
.venue__kind {
  font-family: var(--mono); font-size: 10px;
  color: var(--accent); letter-spacing: 0.05em;
  text-transform: lowercase;
}
.venue__vibe {
  font-size: 12px; color: var(--fg-muted);
  line-height: 1.4;
  flex: 1;
}
.venue__foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-top: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-soft);
}
.venue__area {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--fg-dim);
}
.venue__arrow {
  color: var(--fg-dim);
  transition: color 150ms var(--ease), transform 150ms var(--ease);
}
.venue:hover .venue__arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}

/* ── WASTE ───────────────────────────────────────────────────── */
.waste { padding: 20px; }
.waste__selector { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.waste__chip {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  padding: 6px 10px; border-radius: 99px;
  background: var(--muted); border: 1px solid var(--border-soft);
  color: var(--fg-muted); cursor: pointer;
  transition: all 150ms var(--ease);
}
.waste__chip:hover { color: var(--fg); border-color: var(--fg-dim); }
.waste__chip--active { background: var(--accent); border-color: var(--accent); color: #0B1220; font-weight: 600; }
.waste__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.waste__card { background: var(--bg); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: 16px; }
.waste__icon {
  font-family: var(--mono); font-weight: 700; font-size: 11px; letter-spacing: 0.05em;
  padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 10px;
}
.waste__k { font-size: 11px; color: var(--fg-muted); margin-bottom: 4px; }
.waste__v { font-weight: 600; font-size: 20px; color: var(--fg); margin-bottom: 4px; }
.waste__when { font-family: var(--mono); font-size: 11px; color: var(--accent); letter-spacing: 0.05em; }
.waste__note { margin-top: 16px; font-size: 12px; color: var(--fg-muted); }
.waste__note a { color: var(--accent); }

/* ── SKELETON ────────────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, var(--muted) 0%, var(--surface-2) 50%, var(--muted) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── FOOTER ──────────────────────────────────────────────────── */
.foot {
  position: relative; margin-top: 40px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  overflow: hidden;
}
.foot__skyline {
  position: absolute; left: 0; right: 0; top: 0;
  pointer-events: none;
  display: flex; justify-content: center;
}
.foot__content {
  position: relative; z-index: 1;
  max-width: 1440px; margin: 0 auto;
  padding: 60px 24px 24px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;
  align-items: end;
}
.foot__title { font-weight: 700; font-size: 16px; color: var(--fg); margin-bottom: 4px; letter-spacing: -0.005em; }
.foot__tagline { font-size: 12px; color: var(--fg-muted); }
.foot__mid { text-align: center; }
.foot__meta { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-dim); margin-bottom: 6px; }
.foot__right { text-align: right; }
.foot__byline {
  font-size: 13px; color: var(--fg);
  padding-bottom: 6px; border-bottom: 1px solid var(--accent); display: inline-block;
}
.foot__byline strong { font-weight: 600; color: var(--accent); }
.foot__small { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-dim); margin-top: 6px; text-transform: uppercase; }

/* ── RESPONSIVE ──────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .topbar__crumb { display: none; }
  .hero { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bullet-grid { grid-template-columns: repeat(2, 1fr); }
  .events-grid { grid-template-columns: repeat(2, 1fr); }
  .venues-grid { grid-template-columns: repeat(2, 1fr); }
  .split-2 { grid-template-columns: 1fr; }
  .foot__content { grid-template-columns: 1fr; text-align: center; gap: 20px; }
  .foot__right { text-align: center; }
}
@media (max-width: 640px) {
  .main { padding: 16px; gap: 16px; }
  .topbar { padding: 10px 16px; }
  .kpi-grid { grid-template-columns: 1fr; }
  .bullet-grid { grid-template-columns: 1fr; }
  .events-grid { grid-template-columns: 1fr; }
  .venues-grid { grid-template-columns: 1fr; }
  .waste__grid { grid-template-columns: 1fr; }
  .wx-grid { grid-template-columns: 1fr; }
  .stream-foot { grid-template-columns: 1fr 1fr; }
  .call__head { font-size: 22px; }
  .wx-hero__temp { font-size: 42px; }
}
`;
