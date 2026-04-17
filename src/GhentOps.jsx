import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity, Wind, Car, Bike, CalendarDays, RefreshCw, Pause, Play,
  CircleAlert, CircleCheck, TrendingUp, TrendingDown, MapPin, ArrowUpRight,
  Zap, Radio, Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning,
  CloudFog, Droplets, Trash2, Train, Waves, Sparkles, Compass,
} from "lucide-react";
import MiniMap, { lookupVenue, lookupParking, lookupAirStation } from "./MiniMap.jsx";
import ThreeTowers from "./ThreeTowers.jsx";
import {
  fetchWeather, describeWeather, flemishQuip, gemOfTheDay,
  WATER_SPOTS, TRANSIT_STOPS, WASTE_DISTRICTS, nextWasteDay,
} from "./ghent-data.js";

// ═════════════════════════════════════════════════════════════════════════
// GHENT · LIVE — a civic dashboard, in the character of the city
// ═════════════════════════════════════════════════════════════════════════

const API = "/api/gent";

// ── Realistic fallback data ──────────────────────────────────────────────
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
    { title: "Gentse Feesten — Opening",    where: "Sint-Baafsplein",  when: "Today · 20:00" },
    { title: "Lichtfestival Preview Walk",  where: "Korenmarkt",       when: "Tomorrow · 19:30" },
    { title: "Film Fest Gent — Shorts",     where: "Sphinx Cinema",    when: "Sat · 21:00" },
    { title: "Jazz at Handelsbeurs",        where: "Kouter 29",        when: "Sun · 20:30" },
    { title: "Boekenbeurs Voorjaar",        where: "ICC Citadelpark",  when: "Next week" },
    { title: "NTGent — De Revisor",         where: "Sint-Baafsplein",  when: "Fri · 20:15" },
  ],
  weather: { temp: 12, feels: 10, humidity: 72, code: 2, wind: 14, precip: 0.2, rainChance: 35, hourlyTemp: [] },
  pumps: 24,
};

// ── Status tokens ────────────────────────────────────────────────────────
const STATUS = {
  ok:    { color: "#22C55E", label: "Clear",    ring: "rgba(34,197,94,0.25)"  },
  warn:  { color: "#F59E0B", label: "Moderate", ring: "rgba(245,158,11,0.25)" },
  alert: { color: "#EF4444", label: "Critical", ring: "rgba(239,68,68,0.25)"  },
  info:  { color: "#94A3B8", label: "Info",     ring: "rgba(148,163,184,0.25)" },
};

const occStatus = (o) => (o < 60 ? STATUS.ok : o < 85 ? STATUS.warn : STATUS.alert);
const airStatus = (n) => (n < 25 ? STATUS.ok : n < 40 ? STATUS.warn : STATUS.alert);

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

// ── API fetchers ─────────────────────────────────────────────────────────
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
// Small components
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

// Small ornamental divider — a stylized dragon (Belfry's weathervane symbol)
const Ornament = () => (
  <div className="ornament" aria-hidden="true">
    <span className="ornament__line" />
    <svg viewBox="0 0 40 16" width="36" height="14" fill="currentColor">
      <path d="M 2 8 Q 8 2 14 8 Q 20 14 26 8 Q 32 2 38 8 L 36 8 Q 32 6 28 8 L 26 10 Q 20 14 14 10 L 12 8 Q 8 6 4 8 Z" />
      <circle cx="20" cy="8" r="1" />
    </svg>
    <span className="ornament__line" />
  </div>
);

// ═════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════

export default function GhentLive() {
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

  // Derived
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
  const quip    = flemishQuip(wxData);
  const gem     = gemOfTheDay();
  const waste   = WASTE_DISTRICTS.find((d) => d.district === wasteDistrict) || WASTE_DISTRICTS[0];

  const call = useMemo(() => {
    if (cityOcc > 85) return { level: "alert", head: "Laat de auto staan — het is druk.", body: `Garages ${cityOcc}% vol. Neem de tram of de fiets.` };
    if (avgNo2 > 35)  return { level: "warn",  head: "Lucht wat zwaarder vandaag.",  body: `NO₂ rond ${avgNo2} µg/m³ — rustige straten zijn een beter idee.` };
    if (wxData.rainChance > 70) return { level: "warn", head: "Regen op komst.", body: "Paraplu mee. De Leie wordt nat, maar zo is het hier nu eenmaal." };
    if (avgNo2 < 20 && cityOcc < 70 && wxData.code <= 2) return { level: "ok", head: "Een zeldzame perfecte dag.", body: `Lucht fris (NO₂ ${avgNo2}), ${wxData.temp}°C, en rustig op de baan. Graslei roept.` };
    return { level: "ok", head: `${emptiest.name} is open — ${emptiest.free} plaatsen vrij.`, body: `Slechts ${emptiest.occupation}% vol. Vermijd ${fullest.name} (${fullest.occupation}%).` };
  }, [cityOcc, avgNo2, wxData, emptiest, fullest]);

  const isLoaded = parking && air && events && weather;

  return (
    <div className="gl-root">
      <style>{css}</style>
      <a href="#main" className="skip">Ga naar inhoud</a>

      {/* ═══ MASTHEAD ═══════════════════════════════════════════════════ */}
      <header className="mast" role="banner">
        <div className="mast__skyline" aria-hidden="true">
          <ThreeTowers height={140} color="#2a3850" opacity={0.55} />
        </div>
        <div className="mast__content">
          <div className="mast__top">
            <div className="mast__left">
              <span className="mast__date">
                {new Date().toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <div className="mast__center">
              <div className="mast__eyebrow">
                {/* Heraldic lion glyph — stylized from Ghent's coat of arms */}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M 4 12 Q 4 6 10 4 L 12 6 L 14 4 Q 20 6 20 12 L 19 14 L 20 18 L 17 19 L 16 16 L 13 17 L 14 20 L 10 20 L 11 17 L 8 16 L 7 19 L 4 18 L 5 14 Z M 9 10 L 11 11 L 9 12 Z M 15 10 L 13 11 L 15 12 Z" />
                </svg>
                <span>De Stad · Real-Time · MMXXVI</span>
              </div>
              <h1 className="mast__title">
                <span className="mast__title-main">Gent</span>
                <span className="mast__title-sep">·</span>
                <span className="mast__title-sub">Live</span>
              </h1>
              <div className="mast__sub">{quip}</div>
            </div>
            <div className="mast__right" role="status" aria-live="polite">
              <div className="conn">
                <span className={`conn__dot ${Object.values(liveMode).some(Boolean) ? "live" : "sample"}`} aria-hidden="true" />
                <span className="conn__label tabular">{Object.values(liveMode).some(Boolean) ? "LIVE" : "SAMPLE"}</span>
              </div>
              <div className="mast__time tabular">
                {lastUpdate ? lastUpdate.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              <button className="btn btn--ghost" onClick={loadAll} disabled={loading} aria-label="Refresh data">
                <RefreshCw size={12} className={loading ? "spin" : ""} aria-hidden="true" />
                <span>Ververs</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="main">

        {/* ═══ TODAY'S CALL (hero) ══════════════════════════════════════ */}
        <section className="hero" aria-labelledby="call-h">
          <article className={`call call--${call.level}`} aria-live="polite">
            <div className="call__header">
              <span className={`call__badge call__badge--${call.level}`}>
                {call.level === "alert" ? <CircleAlert size={11} aria-hidden="true" /> :
                 call.level === "warn"  ? <CircleAlert size={11} aria-hidden="true" /> :
                                          <CircleCheck size={11} aria-hidden="true" />}
                {call.level === "alert" ? "OPGEPAST" : call.level === "warn" ? "LET OP" : "ALLES GOED"}
              </span>
              <span className="call__kicker">VANDAAG IN GENT</span>
            </div>
            <h2 id="call-h" className="call__head">{isLoaded ? call.head : <Skeleton h={38} w="85%" />}</h2>
            <p className="call__body">{isLoaded ? call.body : <Skeleton h={14} w="90%" />}</p>
            <div className="call__meta">
              <span><Zap size={11} aria-hidden="true" /> Gevoed door {Object.values(liveMode).filter(Boolean).length} live databronnen</span>
            </div>
          </article>

          {/* KPI strip */}
          <div className="kpi-grid" role="list">
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Car size={12} aria-hidden="true" /><span className="kpi__title">Parking</span>
                <span className={`dot dot--${cityStatus === STATUS.ok ? "ok" : cityStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" /></div>
              <div className="kpi__value tabular">{isLoaded ? cityOcc : "—"}<span className="kpi__unit">%</span></div>
              <div className="kpi__sub tabular">{isLoaded ? `${freeSpaces.toLocaleString()} vrij` : <Skeleton h={12} w={80} />}</div>
              <div className="kpi__mini-bar"><div className="kpi__mini-fill" style={{ width: `${cityOcc}%`, background: cityStatus.color }} /></div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Wind size={12} aria-hidden="true" /><span className="kpi__title">Lucht · NO₂</span>
                <span className={`dot dot--${airKpiStatus === STATUS.ok ? "ok" : airKpiStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" /></div>
              <div className="kpi__value tabular">{isLoaded ? avgNo2 : "—"}<span className="kpi__unit">µg/m³</span></div>
              <div className="kpi__sub">{isLoaded ? airKpiStatus.label : <Skeleton h={12} w={80} />}</div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head">{weatherIcon(wxDesc.icon, 12)}<span className="kpi__title">Weer</span>
                <span className="dot dot--ok" aria-hidden="true" /></div>
              <div className="kpi__value tabular">{wxData.temp}<span className="kpi__unit">°C</span></div>
              <div className="kpi__sub">voelt als {wxData.feels}° · {wxDesc.label.toLowerCase()}</div>
            </div>
            <div className="kpi" role="listitem">
              <div className="kpi__head"><Bike size={12} aria-hidden="true" /><span className="kpi__title">Fietsen</span>
                <span className="dot dot--ok" aria-hidden="true" /></div>
              <div className="kpi__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="kpi__sub">
                <span className={`trend trend--${bikeTrend}`}>
                  {bikeTrend === "up" ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                  <span className="tabular">{bikeDelta}%</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <Ornament />

        {/* ═══ RIGHT NOW: weather + air ═════════════════════════════════ */}
        <h3 className="section-title">
          <span className="section-title__num">I.</span>
          <span className="section-title__main">Op dit moment</span>
          <span className="section-title__sub">— wat hangt er in de lucht</span>
        </h3>
        <section className="split-2">
          {/* Weather card */}
          <div className="panel panel--weather" aria-labelledby="wx-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">Het Weer</span>
                <h2 id="wx-h" className="panel__title">{wxDesc.label} · {wxData.temp}°C</h2>
              </div>
              <div className="wx-icon">{weatherIcon(wxDesc.icon, 42)}</div>
            </header>
            <div className="wx-grid">
              <div className="wx-stat">
                <span className="wx-stat__k">Voelt als</span>
                <span className="wx-stat__v tabular">{wxData.feels}°</span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Wind</span>
                <span className="wx-stat__v tabular">{wxData.wind} <em>km/h</em></span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Vochtigheid</span>
                <span className="wx-stat__v tabular">{wxData.humidity}%</span>
              </div>
              <div className="wx-stat">
                <span className="wx-stat__k">Kans op regen (6u)</span>
                <span className="wx-stat__v tabular" style={{ color: wxData.rainChance > 60 ? "#60A5FA" : "var(--fg)" }}>
                  {wxData.rainChance}%
                </span>
              </div>
            </div>
          </div>

          {/* Air quality with map + table */}
          <div className="panel" aria-labelledby="air-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">Luchtkwaliteit</span>
                <h2 id="air-h" className="panel__title">Wat je ademt</h2>
              </div>
              <span className="chip"><CircleAlert size={10} aria-hidden="true" /> Drempel 25 µg/m³</span>
            </header>
            <div className="panel__map">
              {isLoaded && (
                <MiniMap height={180} markers={airData.map((s) => {
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

        <Ornament />

        {/* ═══ GETTING AROUND: parking + transit + bikes ════════════════ */}
        <h3 className="section-title">
          <span className="section-title__num">II.</span>
          <span className="section-title__main">Onderweg</span>
          <span className="section-title__sub">— hoe je door de stad beweegt</span>
        </h3>

        <section className="panel" aria-labelledby="parking-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">Parkeren</span>
              <h2 id="parking-h" className="panel__title">Waar je de auto kwijt kan</h2>
            </div>
            <span className="chip"><Activity size={10} aria-hidden="true" /> Real-time</span>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap height={220} markers={parkData.map((p) => {
                const c = lookupParking(p.name); if (!c) return null;
                const st = occStatus(p.occupation);
                return {
                  lng: c.lng, lat: c.lat, color: st.color,
                  size: 12 + Math.sqrt(p.total) / 4,
                  label: p.name, sublabel: `${p.occupation}% vol · ${p.free} vrij`,
                  onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`, "_blank", "noopener"),
                };
              }).filter(Boolean)} />
            )}
          </div>
          <div className="bullet-grid">
            {isLoaded ? parkData.map((p, i) => (
              <BulletChart key={i} value={p.total - p.free} total={p.total} label={p.name} sublabel={`${p.free} vrij van ${p.total}`} />
            )) : Array.from({ length: 8 }).map((_, i) => <div key={i} className="bullet"><Skeleton h={70} /></div>)}
          </div>
        </section>

        <section className="split-2" aria-label="Openbaar vervoer en fietsen">
          {/* Transit (De Lijn) */}
          <div className="panel" aria-labelledby="transit-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">De Lijn</span>
                <h2 id="transit-h" className="panel__title">Tram & bus haltes</h2>
              </div>
              <span className="chip"><Train size={10} aria-hidden="true" /> Centraal</span>
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

          {/* Bikes */}
          <div className="panel panel--accent" aria-labelledby="bike-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">Fietstelling</span>
                <h2 id="bike-h" className="panel__title">Op twee wielen</h2>
              </div>
              <button className="btn btn--ghost" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? <Play size={11} aria-hidden="true" /> : <Pause size={11} aria-hidden="true" />}
                <span>{paused ? "Verder" : "Pauzeer"}</span>
              </button>
            </header>
            <div className="stream-big">
              <div className="stream-big__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="stream-big__label">fietsers vandaag · centrum</div>
            </div>
            <div className="stream-canvas"><StreamingArea data={bikeStream} paused={paused} accent="#22C55E" height={120} /></div>
            <div className="stream-foot">
              <div><span className="foot__k">Pompen</span><span className="foot__v tabular">{FALLBACK.pumps}</span></div>
              <div><span className="foot__k">Fietsstraten</span><span className="foot__v tabular">63 <em>km</em></span></div>
              <div><span className="foot__k">Reparatiepunten</span><span className="foot__v tabular">47</span></div>
            </div>
          </div>
        </section>

        <Ornament />

        {/* ═══ THE CITY OUTDOORS: water + gem ═══════════════════════════ */}
        <h3 className="section-title">
          <span className="section-title__num">III.</span>
          <span className="section-title__main">Buiten de deur</span>
          <span className="section-title__sub">— water, plekken, een beetje ontdekken</span>
        </h3>
        <section className="split-2">
          {/* Water quality */}
          <div className="panel" aria-labelledby="water-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">Zwemwater</span>
                <h2 id="water-h" className="panel__title">Kan ik erin?</h2>
              </div>
              <span className="chip"><Waves size={10} aria-hidden="true" /> Seizoen</span>
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

          {/* Gem of the day */}
          <div className="panel panel--gem" aria-labelledby="gem-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">Plekje van de dag</span>
                <h2 id="gem-h" className="panel__title">Een minder bekende hoek</h2>
              </div>
              <Sparkles size={16} style={{ color: "var(--oxblood)" }} aria-hidden="true" />
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
                <span>Open op kaart</span>
                <ArrowUpRight size={11} aria-hidden="true" />
              </a>
              <div className="gem__mini-map">
                <MiniMap height={140} center={[gem.coords.lng, gem.coords.lat]} zoom={15} markers={[{ lng: gem.coords.lng, lat: gem.coords.lat, color: "#A8323A", size: 18, label: gem.name, sublabel: gem.tagline }]} />
              </div>
            </div>
          </div>
        </section>

        <Ornament />

        {/* ═══ WHAT'S ON: events ═══════════════════════════════════════ */}
        <h3 className="section-title">
          <span className="section-title__num">IV.</span>
          <span className="section-title__main">Wat is er te doen</span>
          <span className="section-title__sub">— cultuur, concerten, markten</span>
        </h3>
        <section className="panel" aria-labelledby="events-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">Agenda</span>
              <h2 id="events-h" className="panel__title">Komende dagen</h2>
            </div>
            <span className="chip"><CalendarDays size={10} aria-hidden="true" /> 6 events</span>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap height={200} markers={evData.slice(0, 6).map((e) => {
                const c = lookupVenue(e.where); if (!c) return null;
                return {
                  lng: c.lng, lat: c.lat, color: "#A8323A", size: 16, label: e.title, sublabel: `${e.where} · ${e.when}`,
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
                    <div className="event__where"><MapPin size={10} aria-hidden="true" /> {e.where}</div>
                  </div>
                  <ArrowUpRight size={12} className="event__arrow" aria-hidden="true" />
                </a>
              );
            }) : Array.from({ length: 6 }).map((_, i) => <div key={i} className="event"><Skeleton h={56} /></div>)}
          </div>
        </section>

        <Ornament />

        {/* ═══ PRACTICAL: waste pickup ═════════════════════════════════ */}
        <h3 className="section-title">
          <span className="section-title__num">V.</span>
          <span className="section-title__main">Praktisch</span>
          <span className="section-title__sub">— dingen die je moet weten</span>
        </h3>
        <section className="panel" aria-labelledby="waste-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">IVAGO · Afvalkalender</span>
              <h2 id="waste-h" className="panel__title">Wanneer komt het vuilnis?</h2>
            </div>
            <span className="chip"><Trash2 size={10} aria-hidden="true" /> Selecteer wijk</span>
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
                <div className="waste__k">Groenafval</div>
                <div className="waste__v">{waste.gft}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.gft)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__icon" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>PMD</div>
                <div className="waste__k">Plastic · Metaal · Drank</div>
                <div className="waste__v">{waste.pmd}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.pmd)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__icon" style={{ background: "rgba(168,50,58,0.15)", color: "#A8323A" }}>REST</div>
                <div className="waste__k">Restafval</div>
                <div className="waste__v">{waste.rest}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.rest)}</div>
              </div>
            </div>
            <p className="waste__note">
              Wijk niet in de lijst? Kijk op <a href="https://ivago.be/afvalkalender" target="_blank" rel="noopener noreferrer">ivago.be/afvalkalender</a> voor je exacte straat.
            </p>
          </div>
        </section>

      </main>

      {/* ═══ FOOTER + BYLINE ══════════════════════════════════════════ */}
      <footer className="foot" role="contentinfo">
        <div className="foot__skyline" aria-hidden="true">
          <ThreeTowers height={44} color="#1a2238" opacity={0.8} />
        </div>
        <div className="foot__content">
          <div className="foot__left">
            <div className="foot__title">Gent · Live</div>
            <div className="foot__tagline">Een civiel dashboard, gemaakt met en voor de stad.</div>
          </div>
          <div className="foot__mid">
            <div className="foot__meta">
              Bronnen: data.stad.gent · Open-Meteo · OpenStreetMap · CARTO
            </div>
            <div className="foot__meta tabular">
              {lastUpdate ? `Laatst ververst · ${lastUpdate.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}` : "—"}
            </div>
          </div>
          <div className="foot__right">
            <div className="foot__byline">
              Gecureerd door <strong>Faisal Alani</strong>
            </div>
            <div className="foot__small">Ghent, MMXXVI · <span style={{ color: "var(--oxblood)" }}>♥</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// CSS — Ghent-heavy: Fraunces display + Fira Sans, oxblood + status green
// indigo-tinted dark, grain overlay, heraldic ornamentation
// ═════════════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Fira+Sans:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap');

.gl-root {
  --bg:           #0E1422;          /* indigo-tinted night */
  --bg-elev:      #131A2D;
  --surface:      #182342;
  --surface-2:    #1F2C52;
  --muted:        #2A3350;
  --border:       #344066;
  --border-soft:  rgba(52,64,102,0.4);
  --fg:           #F5F1E8;          /* warm off-white, cream tint */
  --fg-muted:     #9AA3C0;
  --fg-dim:       #6B7499;
  --accent:       #22C55E;          /* status green */
  --oxblood:      #A8323A;          /* Ghent heraldic red */
  --oxblood-soft: rgba(168,50,58,0.2);
  --gold:         #C9A43D;          /* heraldic gold, used sparingly */
  --warn:         #F59E0B;
  --alert:        #EF4444;
  --display: 'Fraunces', Georgia, serif;
  --sans:    'Fira Sans', system-ui, sans-serif;
  --mono:    'Fira Code', ui-monospace, monospace;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --radius: 8px;
  --radius-lg: 12px;

  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
  font-feature-settings: 'ss01','cv11';
  -webkit-font-smoothing: antialiased;
  position: relative;
}
.gl-root * { box-sizing: border-box; }
.gl-root .tabular { font-variant-numeric: tabular-nums; }

/* Paper grain — gives warmth */
.gl-root::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: screen; opacity: 0.4;
}

.skip {
  position: absolute; left: -9999px; top: 0;
  background: var(--oxblood); color: white;
  padding: 8px 14px; z-index: 100;
  font-family: var(--mono); font-size: 12px;
}
.skip:focus { left: 0; }
.gl-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  .gl-root *, .gl-root *::before, .gl-root *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ═══ MASTHEAD ══════════════════════════════════════════════════════════ */
.mast {
  position: relative;
  padding: 36px 24px 26px;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(ellipse at 50% 100%, rgba(168,50,58,0.08) 0%, transparent 60%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%);
  overflow: hidden;
}
.mast__skyline {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  color: #2a3850;
  pointer-events: none;
}
.mast__content { position: relative; z-index: 2; max-width: 1440px; margin: 0 auto; }
.mast__top { display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center; gap: 24px; }

.mast__left, .mast__right { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; color: var(--fg-dim); text-transform: uppercase; }
.mast__right { text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-wrap: wrap; }
.mast__date { color: var(--fg-muted); }
.mast__time { color: var(--fg-muted); font-size: 11px; }

.mast__center { text-align: center; }
.mast__eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.25em;
  color: var(--oxblood);
  text-transform: uppercase; margin-bottom: 10px;
}
.mast__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: clamp(48px, 8vw, 96px);
  letter-spacing: -0.02em;
  line-height: 0.95;
  margin: 0;
  color: var(--fg);
}
.mast__title-main { font-style: normal; }
.mast__title-sep  { color: var(--oxblood); margin: 0 0.1em; font-weight: 500; }
.mast__title-sub  { font-style: italic; color: var(--fg-muted); font-weight: 400; }

.mast__sub {
  font-family: var(--display); font-style: italic;
  font-size: 16px; color: var(--fg-muted);
  margin-top: 8px;
}

.conn { display: inline-flex; align-items: center; gap: 6px; }
.conn__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--fg-dim); }
.conn__dot.live   { background: var(--accent); animation: pulse 1.8s ease-in-out infinite; }
.conn__dot.sample { background: var(--warn); }
.conn__label { font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.15em; color: var(--fg-muted); }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); } 50% { box-shadow: 0 0 0 6px transparent; } }

.btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: 1px solid var(--border); color: var(--fg);
  font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  padding: 6px 10px; border-radius: 4px; min-height: 28px; cursor: pointer;
  transition: all 150ms var(--ease);
}
.btn:hover:not(:disabled) { border-color: var(--oxblood); color: var(--oxblood); background: var(--oxblood-soft); }
.btn:disabled { opacity: 0.5; cursor: wait; }
.btn--ghost { background: rgba(255,255,255,0.02); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ MAIN LAYOUT ═══════════════════════════════════════════════════════ */
.main {
  position: relative; z-index: 1;
  max-width: 1440px; margin: 0 auto;
  padding: 40px 24px 60px;
  display: flex; flex-direction: column; gap: 28px;
}

.ornament {
  display: flex; align-items: center; gap: 14px;
  color: var(--oxblood); opacity: 0.55;
  margin: 8px 0;
}
.ornament__line { flex: 1; height: 1px; background: currentColor; }

/* ═══ SECTION TITLE ═════════════════════════════════════════════════════ */
.section-title {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(26px, 3vw, 34px);
  letter-spacing: -0.015em; line-height: 1.15;
  margin: 8px 0 0;
  color: var(--fg);
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
}
.section-title__num { color: var(--oxblood); font-style: italic; font-size: 0.85em; }
.section-title__main { font-weight: 500; }
.section-title__sub { color: var(--fg-muted); font-style: italic; font-weight: 400; font-size: 0.75em; }

/* ═══ HERO (call + KPI) ═════════════════════════════════════════════════ */
.hero {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 16px;
}

.call {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 26px;
  position: relative; overflow: hidden;
}
.call--warn  { border-left-color: var(--warn); }
.call--alert { border-left-color: var(--alert); }

.call__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.call__badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.15em;
  padding: 3px 8px; border-radius: 4px;
}
.call__badge--ok    { background: rgba(34,197,94,0.12);  color: var(--accent); }
.call__badge--warn  { background: rgba(245,158,11,0.12); color: var(--warn); }
.call__badge--alert { background: rgba(239,68,68,0.12);  color: var(--alert); }
.call__kicker { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; color: var(--fg-dim); text-transform: uppercase; }

.call__head {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(22px, 2.6vw, 32px);
  line-height: 1.15; letter-spacing: -0.01em;
  margin: 0 0 10px; color: var(--fg);
}
.call__body { font-size: 14px; line-height: 1.55; color: var(--fg-muted); margin: 0 0 14px; max-width: 50ch; }
.call__meta {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--fg-dim);
  padding-top: 12px; border-top: 1px solid var(--border-soft);
}

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px;
  display: flex; flex-direction: column;
  transition: border-color 220ms var(--ease);
}
.kpi:hover { border-color: var(--fg-dim); }
.kpi__head { display: flex; align-items: center; gap: 6px; color: var(--fg-muted); margin-bottom: 6px; }
.kpi__title { font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; flex: 1; }
.kpi__value { font-family: var(--display); font-weight: 500; font-size: 30px; line-height: 1; color: var(--fg); letter-spacing: -0.02em; margin-bottom: 4px; }
.kpi__unit { font-size: 13px; color: var(--fg-muted); margin-left: 3px; }
.kpi__sub { font-size: 11px; color: var(--fg-muted); min-height: 16px; display: flex; align-items: center; gap: 6px; }
.kpi__mini-bar { margin-top: 8px; height: 3px; border-radius: 99px; background: var(--muted); overflow: hidden; }
.kpi__mini-fill { height: 100%; transition: width 600ms var(--ease); }

.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot--ok    { background: var(--accent); box-shadow: 0 0 6px rgba(34,197,94,0.4); }
.dot--warn  { background: var(--warn);   box-shadow: 0 0 6px rgba(245,158,11,0.4); }
.dot--alert { background: var(--alert);  box-shadow: 0 0 6px rgba(239,68,68,0.4); }
.dot--info  { background: var(--fg-dim); }
.trend { display: inline-flex; align-items: center; gap: 3px; font-family: var(--mono); font-weight: 600; }
.trend--up   { color: var(--accent); }
.trend--down { color: var(--alert); }

/* ═══ PANELS ════════════════════════════════════════════════════════════ */
.panel {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
}
.panel--accent { background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 60%); border-color: rgba(34,197,94,0.2); }
.panel--weather {
  background:
    radial-gradient(ellipse at 85% 20%, rgba(168,50,58,0.1) 0%, transparent 60%),
    linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%);
}
.panel--gem {
  background:
    radial-gradient(ellipse at 20% 20%, rgba(168,50,58,0.15) 0%, transparent 50%),
    linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%);
  border-color: rgba(168,50,58,0.3);
}

.panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border-soft);
}
.panel__kicker {
  display: block; font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.2em; color: var(--oxblood); margin-bottom: 2px; text-transform: uppercase;
}
.panel__title { font-family: var(--display); font-weight: 500; font-size: 20px; line-height: 1.2; margin: 0; color: var(--fg); }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--fg-muted); padding: 4px 8px;
  background: var(--muted); border: 1px solid var(--border-soft); border-radius: 99px;
}
.panel__map { padding: 12px 20px; border-bottom: 1px solid var(--border-soft); background: var(--bg); }

/* ═══ WEATHER ═══════════════════════════════════════════════════════════ */
.wx-icon { color: var(--gold); }
.wx-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--border-soft); }
.wx-stat { padding: 16px 20px; background: var(--bg-elev); display: flex; flex-direction: column; gap: 4px; }
.wx-stat__k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; color: var(--fg-dim); text-transform: uppercase; }
.wx-stat__v { font-family: var(--display); font-size: 26px; font-weight: 500; color: var(--fg); }
.wx-stat__v em { font-size: 12px; color: var(--fg-muted); margin-left: 3px; font-style: normal; font-family: var(--sans); font-weight: 400; }

/* ═══ AIR COMPACT ═══════════════════════════════════════════════════════ */
.air-compact { padding: 10px 20px 16px; }
.air-compact__row {
  display: grid; grid-template-columns: 1.5fr auto auto;
  align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px dashed var(--border-soft);
}
.air-compact__row:last-child { border-bottom: none; }
.air-compact__name { font-weight: 500; }
.air-compact__val { font-family: var(--display); font-weight: 500; font-size: 18px; }
.air-compact__val em { font-size: 10px; color: var(--fg-muted); font-family: var(--sans); font-style: normal; font-weight: 400; margin-left: 3px; }
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  padding: 3px 7px; border-radius: 99px;
}
.badge--ok    { background: rgba(34,197,94,0.10);  color: var(--accent); }
.badge--warn  { background: rgba(245,158,11,0.10); color: var(--warn); }
.badge--alert { background: rgba(239,68,68,0.10);  color: var(--alert); }
.badge--info  { background: rgba(148,163,184,0.10); color: var(--fg-muted); }

/* ═══ SPLIT LAYOUTS ═════════════════════════════════════════════════════ */
.split-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ═══ BULLET (parking) ══════════════════════════════════════════════════ */
.bullet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border-soft); padding: 1px; }
.bullet { background: var(--bg-elev); padding: 14px 16px; transition: background 220ms var(--ease); }
.bullet:hover { background: var(--surface); }
.bullet__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.bullet__label { font-weight: 500; font-size: 13px; color: var(--fg); line-height: 1.3; }
.bullet__sub { font-size: 10px; color: var(--fg-muted); margin-top: 2px; }
.bullet__value { font-family: var(--display); font-weight: 500; font-size: 22px; line-height: 1; letter-spacing: -0.02em; }
.bullet__track { position: relative; height: 8px; background: var(--muted); border-radius: 2px; overflow: hidden; }
.bullet__zone { position: absolute; top: 0; bottom: 0; }
.bullet__mark { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--fg); opacity: 0.35; }
.bullet__bar { position: absolute; top: 2px; bottom: 2px; left: 0; border-radius: 1px; transition: width 600ms var(--ease); }

/* ═══ TRANSIT ═══════════════════════════════════════════════════════════ */
.transit-list { padding: 10px 20px 16px; display: flex; flex-direction: column; }
.transit {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.transit:last-child { border-bottom: none; }
.transit:hover { padding-left: 6px; }
.transit__icon { width: 32px; height: 32px; border-radius: 6px; background: var(--muted); display: flex; align-items: center; justify-content: center; color: var(--oxblood); flex-shrink: 0; }
.transit__body { flex: 1; min-width: 0; }
.transit__name { font-weight: 500; font-size: 14px; margin-bottom: 2px; }
.transit__lines { display: flex; gap: 4px; flex-wrap: wrap; }
.line-badge {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  padding: 2px 6px; border-radius: 3px;
  background: var(--oxblood); color: white;
  min-width: 20px; text-align: center;
}
.transit__arrow { color: var(--fg-dim); transition: color 150ms var(--ease); flex-shrink: 0; }
.transit:hover .transit__arrow { color: var(--oxblood); }

/* ═══ BIKE STREAM ══════════════════════════════════════════════════════ */
.stream-big { padding: 18px 20px 6px; }
.stream-big__value { font-family: var(--display); font-weight: 500; font-size: 44px; line-height: 1; letter-spacing: -0.03em; color: var(--fg); }
.stream-big__label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-muted); margin-top: 6px; }
.stream-canvas { padding: 0 20px; }
.stream-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border-soft); margin-top: 10px; }
.foot__k { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-dim); margin-bottom: 4px; }
.foot__v { font-family: var(--display); font-weight: 500; font-size: 18px; color: var(--fg); }
.foot__v em { font-size: 11px; font-style: normal; color: var(--fg-muted); font-family: var(--sans); margin-left: 2px; }

/* ═══ WATER ════════════════════════════════════════════════════════════ */
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

/* ═══ GEM ══════════════════════════════════════════════════════════════ */
.gem { padding: 20px; }
.gem__name { font-family: var(--display); font-weight: 500; font-size: 28px; line-height: 1.1; color: var(--fg); margin-bottom: 6px; letter-spacing: -0.01em; }
.gem__tagline { font-family: var(--display); font-style: italic; font-size: 15px; color: var(--fg-muted); margin: 0 0 14px; line-height: 1.4; }
.gem__tip {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; background: rgba(168,50,58,0.08);
  border-left: 2px solid var(--oxblood);
  font-size: 13px; color: var(--fg);
  margin-bottom: 14px;
}
.gem__link {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  color: var(--oxblood); text-decoration: none;
  padding: 6px 10px; border: 1px solid var(--oxblood); border-radius: 4px;
  transition: all 150ms var(--ease);
  text-transform: uppercase;
}
.gem__link:hover { background: var(--oxblood); color: white; }
.gem__mini-map { margin-top: 16px; }

/* ═══ EVENTS ═══════════════════════════════════════════════════════════ */
.events-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border-soft); }
.event {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 16px 18px; background: var(--bg-elev);
  color: var(--fg); text-decoration: none;
  transition: background 220ms var(--ease);
  min-height: 84px;
}
.event:hover { background: var(--surface); }
.event__num { font-family: var(--display); font-weight: 500; font-size: 20px; color: var(--oxblood); line-height: 1; min-width: 22px; padding-top: 2px; font-style: italic; }
.event__body { flex: 1; min-width: 0; }
.event__when { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-muted); text-transform: uppercase; margin-bottom: 4px; }
.event__title { font-weight: 500; font-size: 14px; line-height: 1.3; margin-bottom: 4px; color: var(--fg); }
.event__where { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--fg-muted); }
.event__arrow { color: var(--fg-dim); transition: color 150ms var(--ease), transform 150ms var(--ease); flex-shrink: 0; margin-top: 2px; }
.event:hover .event__arrow { color: var(--oxblood); transform: translate(2px, -2px); }

/* ═══ WASTE ════════════════════════════════════════════════════════════ */
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
.waste__chip--active { background: var(--oxblood); border-color: var(--oxblood); color: white; }
.waste__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.waste__card { background: var(--bg); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: 16px; }
.waste__icon {
  font-family: var(--mono); font-weight: 700; font-size: 12px; letter-spacing: 0.05em;
  padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 10px;
}
.waste__k { font-size: 11px; color: var(--fg-muted); margin-bottom: 4px; }
.waste__v { font-family: var(--display); font-weight: 500; font-size: 22px; color: var(--fg); margin-bottom: 4px; }
.waste__when { font-family: var(--mono); font-size: 11px; color: var(--oxblood); letter-spacing: 0.05em; }
.waste__note { margin-top: 16px; font-size: 12px; color: var(--fg-muted); }
.waste__note a { color: var(--oxblood); }

/* ═══ SKELETON ═════════════════════════════════════════════════════════ */
.skeleton {
  background: linear-gradient(90deg, var(--muted) 0%, var(--surface-2) 50%, var(--muted) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ═══ FOOTER ═══════════════════════════════════════════════════════════ */
.foot {
  position: relative; margin-top: 40px;
  background: linear-gradient(180deg, var(--bg) 0%, #08101e 100%);
  border-top: 2px solid var(--oxblood);
  overflow: hidden;
}
.foot__skyline { position: absolute; left: 0; right: 0; top: 8px; opacity: 0.4; pointer-events: none; }
.foot__content {
  position: relative; z-index: 1;
  max-width: 1440px; margin: 0 auto;
  padding: 60px 24px 30px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;
  align-items: end;
}
.foot__title { font-family: var(--display); font-weight: 500; font-size: 22px; color: var(--fg); margin-bottom: 4px; }
.foot__tagline { font-family: var(--display); font-style: italic; font-size: 13px; color: var(--fg-muted); }
.foot__mid { text-align: center; }
.foot__meta { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-dim); margin-bottom: 6px; }
.foot__right { text-align: right; }
.foot__byline {
  font-family: var(--display); font-size: 16px; font-style: italic; color: var(--fg);
  padding-bottom: 6px; border-bottom: 1px solid var(--oxblood); display: inline-block;
}
.foot__byline strong { font-weight: 500; font-style: normal; color: var(--oxblood); }
.foot__small { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--fg-dim); margin-top: 6px; text-transform: uppercase; }

/* ═══ RESPONSIVE ═══════════════════════════════════════════════════════ */
@media (max-width: 1100px) {
  .mast__top { grid-template-columns: 1fr; text-align: center; gap: 14px; }
  .mast__left, .mast__right { text-align: center; justify-content: center; }
  .hero { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bullet-grid { grid-template-columns: repeat(2, 1fr); }
  .events-grid { grid-template-columns: repeat(2, 1fr); }
  .split-2 { grid-template-columns: 1fr; }
  .foot__content { grid-template-columns: 1fr; text-align: center; gap: 20px; }
  .foot__right { text-align: center; }
  .foot__byline { display: inline-block; }
}
@media (max-width: 640px) {
  .main { padding: 24px 16px 40px; gap: 20px; }
  .mast { padding: 24px 16px 20px; }
  .kpi-grid { grid-template-columns: 1fr; }
  .bullet-grid { grid-template-columns: 1fr; }
  .events-grid { grid-template-columns: 1fr; }
  .waste__grid { grid-template-columns: 1fr; }
  .wx-grid { grid-template-columns: 1fr; }
  .stream-foot { grid-template-columns: 1fr 1fr; }
}
`;
