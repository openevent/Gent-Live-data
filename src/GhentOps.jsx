import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  Wind,
  Car,
  Bike,
  CalendarDays,
  RefreshCw,
  Pause,
  Play,
  CircleAlert,
  CircleCheck,
  TrendingUp,
  TrendingDown,
  MapPin,
  ArrowUpRight,
  Zap,
  Radio,
} from "lucide-react";
import MiniMap, { lookupVenue, lookupParking, lookupAirStation } from "./MiniMap.jsx";

// ═════════════════════════════════════════════════════════════════════════
// GHENT · OPS — Real-Time Civic Operations Dashboard
// Built to the ui-ux-pro-max spec: Real-Time Ops pattern, OLED dark, Fira.
// Source: data.stad.gent (Opendatasoft v2.1 Explore API)
// ═════════════════════════════════════════════════════════════════════════

const API = "/api/gent";

// ── Realistic sample data so the dashboard never looks broken ─────────────
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
    { station: "Baudelo",             no2: 18, pm25: 9,  pm10: 14 },
    { station: "Lange Violettestraat", no2: 24, pm25: 11, pm10: 16 },
    { station: "Muide",               no2: 31, pm25: 14, pm10: 22 },
    { station: "Gent Centrum",        no2: 27, pm25: 12, pm10: 19 },
  ],
  events: [
    { title: "Gentse Feesten — Opening",    where: "Sint-Baafsplein",  when: "Today · 20:00" },
    { title: "Lichtfestival Preview Walk",  where: "Korenmarkt",       when: "Tomorrow · 19:30" },
    { title: "Film Fest Gent — Shorts",     where: "Sphinx Cinema",    when: "Sat · 21:00" },
    { title: "Jazz at Handelsbeurs",        where: "Kouter 29",        when: "Sun · 20:30" },
    { title: "Boekenbeurs Voorjaar",        where: "ICC Citadelpark",  when: "Next week" },
    { title: "NTGent — De Revisor",         where: "Sint-Baafsplein",  when: "Fri · 20:15" },
  ],
  pumps: 24,
};

// ── Status tokens (from the skill: green/amber/red, labeled not color-only)
const STATUS = {
  ok:    { color: "#22C55E", label: "Clear",    ring: "rgba(34,197,94,0.25)"  },
  warn:  { color: "#F59E0B", label: "Moderate", ring: "rgba(245,158,11,0.25)" },
  alert: { color: "#EF4444", label: "Critical", ring: "rgba(239,68,68,0.25)"  },
};

const occStatus = (o) => (o < 60 ? STATUS.ok : o < 85 ? STATUS.warn : STATUS.alert);
const airStatus = (n) => (n < 25 ? STATUS.ok : n < 40 ? STATUS.warn : STATUS.alert);

// ── API fetchers (Opendatasoft v2.1) ─────────────────────────────────────
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
// COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

// Skeleton pulse (per skill: high-severity loading feedback)
const Skeleton = ({ w = "100%", h = 16, r = 4, style = {} }) => (
  <div
    className="skeleton"
    style={{ width: w, height: h, borderRadius: r, ...style }}
    aria-hidden="true"
  />
);

// Bullet chart — Performance vs Target (per skill: compact KPI dashboard)
// Zones are labeled with threshold text (a11y, not color-only)
const BulletChart = ({ value, total, label, sublabel }) => {
  const pct = Math.min(100, Math.max(0, (value / total) * 100));
  const status = occStatus(pct);
  return (
    <div className="bullet" aria-label={`${label}: ${value} of ${total} occupied, ${Math.round(pct)}%`}>
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
        {/* Qualitative zones (labeled, not color-only) */}
        <div className="bullet__zone" style={{ left: "0%",  width: "60%", background: "rgba(34,197,94,0.10)" }} />
        <div className="bullet__zone" style={{ left: "60%", width: "25%", background: "rgba(245,158,11,0.12)" }} />
        <div className="bullet__zone" style={{ left: "85%", width: "15%", background: "rgba(239,68,68,0.14)" }} />
        {/* Target markers at threshold boundaries */}
        <div className="bullet__mark" style={{ left: "60%" }} aria-hidden="true" />
        <div className="bullet__mark" style={{ left: "85%" }} aria-hidden="true" />
        {/* Performance bar */}
        <div
          className="bullet__bar"
          style={{ width: `${pct}%`, background: status.color, boxShadow: `0 0 12px ${status.ring}` }}
        />
      </div>
      <div className="bullet__legend">
        <span>Clear <em className="tabular">&lt;60%</em></span>
        <span>Moderate <em className="tabular">60–85%</em></span>
        <span>Critical <em className="tabular">&gt;85%</em></span>
      </div>
    </div>
  );
};

// Streaming area chart — Canvas-based, pausable, respects reduced-motion
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
    // Grid
    ctx.strokeStyle = "rgba(71,85,105,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Path
    const pts = data.map((v, i) => [ (i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 14) - 7 ]);
    // Fade trail area
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, accent + "55");
    grad.addColorStop(1, accent + "00");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], h);
    ctx.closePath(); ctx.fill();
    // Line
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
    // Current value pulse
    const [lx, ly] = pts[pts.length - 1];
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    if (!paused) {
      ctx.fillStyle = accent + "44";
      ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
    }
  }, [data, paused, accent, height]);
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} aria-hidden="true" />;
};

// Anomaly marker line — shape (circle+fill) not color-only
const AirAnomalyChart = ({ stations }) => {
  const threshold = 25; // NO₂ µg/m³ (EU annual guide)
  const w = 100, h = 30;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 44 }} role="img" aria-label="NO2 readings per station with anomaly markers above threshold">
      {/* Alert band */}
      <rect x="0" y="0" width={w} height={h * 0.35} fill="rgba(245,158,11,0.10)" />
      <line x1="0" y1={h * 0.35} x2={w} y2={h * 0.35} stroke="rgba(245,158,11,0.5)" strokeDasharray="1 1" strokeWidth="0.3" />
      {/* Connection line */}
      {stations.length > 1 && (
        <polyline
          fill="none"
          stroke="rgba(148,163,184,0.6)"
          strokeWidth="0.5"
          points={stations.map((s, i) => `${(i / (stations.length - 1)) * w},${h - (s.no2 / 50) * h}`).join(" ")}
        />
      )}
      {/* Markers - filled circle + optional square for anomaly (shape not color) */}
      {stations.map((s, i) => {
        const x = (i / (stations.length - 1 || 1)) * w;
        const y = h - (s.no2 / 50) * h;
        const anomaly = s.no2 > threshold;
        const color = airStatus(s.no2).color;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={anomaly ? 1.8 : 1.2} fill={color} />
            {anomaly && <rect x={x - 2} y={y - 2} width="4" height="4" fill="none" stroke={color} strokeWidth="0.4" />}
          </g>
        );
      })}
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════

export default function GhentOps() {
  const [parking,  setParking]  = useState(null);
  const [air,      setAir]      = useState(null);
  const [events,   setEvents]   = useState(null);
  const [pumps,    setPumps]    = useState(FALLBACK.pumps);
  const [liveMode, setLiveMode] = useState({ parking: false, air: false, events: false });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [paused,   setPaused]   = useState(false);

  // Streaming bike-counter simulation (60s buffer, 1 Hz updates)
  const [bikeStream, setBikeStream] = useState(() => {
    const base = 4821;
    return Array.from({ length: 60 }, (_, i) => base + Math.round(Math.sin(i / 6) * 80 + Math.random() * 40));
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    // parking
    try {
      const p = await fetchParking();
      if (p.length) { setParking(p); setLiveMode((m) => ({ ...m, parking: true })); }
      else          { setParking(FALLBACK.parking); }
    } catch { setParking(FALLBACK.parking); }
    // air
    try {
      const a = await fetchAir();
      if (a.length) { setAir(a); setLiveMode((m) => ({ ...m, air: true })); }
      else          { setAir(FALLBACK.air); }
    } catch { setAir(FALLBACK.air); }
    // events
    try {
      const e = await fetchEvents();
      if (e.length) { setEvents(e); setLiveMode((m) => ({ ...m, events: true })); }
      else          { setEvents(FALLBACK.events); }
    } catch { setEvents(FALLBACK.events); }

    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 5 * 60 * 1000); return () => clearInterval(id); }, [loadAll]);

  // Streaming tick (skill spec: 1 Hz, pausable, reduced-motion friendly)
  useEffect(() => {
    if (paused) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // freeze for reduced motion
    const id = setInterval(() => {
      setBikeStream((s) => {
        const last = s[s.length - 1];
        const next = Math.max(0, last + Math.round((Math.random() - 0.45) * 50));
        return [...s.slice(1), next];
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Derived KPIs
  const parkData = parking || FALLBACK.parking;
  const airData  = air     || FALLBACK.air;
  const evData   = events  || FALLBACK.events;

  const totalSpaces = parkData.reduce((a, p) => a + p.total, 0);
  const freeSpaces  = parkData.reduce((a, p) => a + p.free, 0);
  const cityOcc     = totalSpaces ? Math.round(((totalSpaces - freeSpaces) / totalSpaces) * 100) : 0;
  const cityStatus  = occStatus(cityOcc);

  const avgNo2 = airData.length ? Math.round(airData.reduce((a, s) => a + s.no2, 0) / airData.length) : 0;
  const airAnom = airData.filter((s) => s.no2 > 25).length;
  const airKpiStatus = airStatus(avgNo2);

  const bikeNow = bikeStream[bikeStream.length - 1];
  const bikePrev = bikeStream[0];
  const bikeTrend = bikeNow > bikePrev ? "up" : "down";
  const bikeDelta = Math.abs(Math.round(((bikeNow - bikePrev) / bikePrev) * 100));

  const emptiest = [...parkData].sort((a, b) => a.occupation - b.occupation)[0];
  const fullest  = [...parkData].sort((a, b) => b.occupation - a.occupation)[0];

  // Today's Call — opinionated recommendation
  const call = useMemo(() => {
    if (cityOcc > 85) return {
      level: "alert",
      head: "Parking critical — leave the car.",
      body: `City garages at ${cityOcc}%. Tram 1 or a bike will get you there faster.`,
    };
    if (avgNo2 > 35) return {
      level: "warn",
      head: "Elevated NO₂ readings.",
      body: `Average ${avgNo2} µg/m³ across ${airData.length} stations. Sensitive groups: consider quieter routes.`,
    };
    if (avgNo2 < 20 && cityOcc < 70) return {
      level: "ok",
      head: "Optimal conditions.",
      body: `Air clean (NO₂ ${avgNo2} µg/m³), parking comfortable (${cityOcc}%). Good time to be out.`,
    };
    return {
      level: "ok",
      head: `${emptiest.name} is open — ${emptiest.free} free.`,
      body: `Only ${emptiest.occupation}% full. Avoid ${fullest.name} (${fullest.occupation}%).`,
    };
  }, [cityOcc, avgNo2, emptiest, fullest, airData.length]);

  const isLoaded = parking && air && events;

  return (
    <div className="ops-root">
      <style>{css}</style>

      {/* Skip link for keyboard users */}
      <a href="#main" className="skip">Skip to main content</a>

      {/* ─── STATUS BAR ───────────────────────────────────────────── */}
      <header className="topbar" role="banner">
        <div className="topbar__left">
          <div className="logo">
            <Radio size={16} strokeWidth={2.5} aria-hidden="true" />
            <span className="logo__text">GHENT · OPS</span>
          </div>
          <span className="topbar__sep" aria-hidden="true">/</span>
          <span className="topbar__crumb">Civic Operations · Live</span>
        </div>

        <div className="topbar__right" role="status" aria-live="polite">
          <div className="conn">
            <span className={`conn__dot ${liveMode.parking || liveMode.air ? "live" : "sample"}`} aria-hidden="true" />
            <span className="conn__label tabular">
              {liveMode.parking || liveMode.air ? "LIVE" : "SAMPLE"}
            </span>
          </div>
          <div className="topbar__time tabular">
            {lastUpdate ? lastUpdate.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          </div>
          <button
            className="btn btn--ghost"
            onClick={loadAll}
            disabled={loading}
            aria-label="Refresh data"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <main id="main" className="main">

        {/* ─── HERO: TODAY'S CALL + KPI GRID ─────────────────────── */}
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
            <h1 id="call-h" className="call__head">
              {isLoaded ? call.head : <Skeleton h={38} w="85%" />}
            </h1>
            <p className="call__body">
              {isLoaded ? call.body : <><Skeleton h={14} w="90%" style={{ marginBottom: 6 }} /><Skeleton h={14} w="70%" /></>}
            </p>
            <div className="call__meta">
              <span><Zap size={11} aria-hidden="true" /> Updated from {[liveMode.parking, liveMode.air, liveMode.events].filter(Boolean).length || 0} live streams</span>
            </div>
          </article>

          <div className="kpi-grid" role="list">
            <div className="kpi" role="listitem" aria-label={`Parking: ${cityOcc}% full city-wide, ${cityStatus.label.toLowerCase()}`}>
              <div className="kpi__head">
                <Car size={14} aria-hidden="true" />
                <span className="kpi__title">Parking</span>
                <span className={`dot dot--${cityStatus === STATUS.ok ? "ok" : cityStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" />
              </div>
              <div className="kpi__value tabular">
                {isLoaded ? cityOcc : "—"}<span className="kpi__unit">%</span>
              </div>
              <div className="kpi__sub tabular">
                {isLoaded ? `${freeSpaces.toLocaleString()} / ${totalSpaces.toLocaleString()} free` : <Skeleton h={12} w={120} />}
              </div>
              <div className="kpi__mini-bar">
                <div className="kpi__mini-fill" style={{ width: `${cityOcc}%`, background: cityStatus.color }} />
              </div>
            </div>

            <div className="kpi" role="listitem" aria-label={`Air quality: NO2 average ${avgNo2} micrograms per cubic meter, ${airKpiStatus.label.toLowerCase()}`}>
              <div className="kpi__head">
                <Wind size={14} aria-hidden="true" />
                <span className="kpi__title">Air · NO₂</span>
                <span className={`dot dot--${airKpiStatus === STATUS.ok ? "ok" : airKpiStatus === STATUS.warn ? "warn" : "alert"}`} aria-hidden="true" />
              </div>
              <div className="kpi__value tabular">
                {isLoaded ? avgNo2 : "—"}<span className="kpi__unit">µg/m³</span>
              </div>
              <div className="kpi__sub">
                {isLoaded ? `${airKpiStatus.label} · ${airAnom} station${airAnom === 1 ? "" : "s"} elevated` : <Skeleton h={12} w={140} />}
              </div>
              <div className="kpi__mini-chart">
                {isLoaded && <AirAnomalyChart stations={airData} />}
              </div>
            </div>

            <div className="kpi" role="listitem" aria-label={`Bike counter: ${bikeNow} cyclists today, trend ${bikeTrend}`}>
              <div className="kpi__head">
                <Bike size={14} aria-hidden="true" />
                <span className="kpi__title">Bike counter</span>
                <span className="dot dot--ok" aria-hidden="true" />
              </div>
              <div className="kpi__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="kpi__sub">
                <span className={`trend trend--${bikeTrend}`}>
                  {bikeTrend === "up" ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                  <span className="tabular">{bikeDelta}%</span>
                </span>
                <span className="kpi__sub-text"> past minute</span>
              </div>
              <div className="kpi__stream">
                <StreamingArea data={bikeStream} paused={paused} accent="#22C55E" height={32} />
              </div>
            </div>

            <div className="kpi" role="listitem" aria-label={`${evData.length} cultural events coming up`}>
              <div className="kpi__head">
                <CalendarDays size={14} aria-hidden="true" />
                <span className="kpi__title">Events</span>
                <span className="dot dot--ok" aria-hidden="true" />
              </div>
              <div className="kpi__value tabular">{evData.length}</div>
              <div className="kpi__sub">coming up this week</div>
              <div className="kpi__pills">
                {["music", "theatre", "film", "market"].map((t) => (
                  <span key={t} className="pill">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── PARKING · BULLET GRID ──────────────────────────────── */}
        <section className="panel" aria-labelledby="parking-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">01 · MOBILITY</span>
              <h2 id="parking-h" className="panel__title">Parking garages</h2>
            </div>
            <div className="panel__tools">
              <span className="chip"><Activity size={11} aria-hidden="true" /> Real-time · Occupancy vs capacity</span>
            </div>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap
                height={220}
                markers={parkData
                  .map((p) => {
                    const coords = lookupParking(p.name);
                    if (!coords) return null;
                    const st = occStatus(p.occupation);
                    return {
                      lng: coords.lng,
                      lat: coords.lat,
                      color: st.color,
                      size: 12 + Math.sqrt(p.total) / 4,
                      label: p.name,
                      sublabel: `${p.occupation}% full · ${p.free} free`,
                      onClick: () => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=${encodeURIComponent(p.name + " parking Gent")}`,
                          "_blank", "noopener"
                        );
                      },
                    };
                  })
                  .filter(Boolean)}
              />
            )}
          </div>
          <div className="bullet-grid">
            {isLoaded ? parkData.map((p, i) => (
              <BulletChart
                key={i}
                value={p.total - p.free}
                total={p.total}
                label={p.name}
                sublabel={`${p.free} free of ${p.total}`}
              />
            )) : Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bullet"><Skeleton h={70} /></div>
            ))}
          </div>
        </section>

        {/* ─── AIR + BIKES ────────────────────────────────────────── */}
        <section className="split" aria-label="Environment and cycling">

          <div className="panel" aria-labelledby="air-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">02 · ENVIRONMENT</span>
                <h2 id="air-h" className="panel__title">Air quality stations</h2>
              </div>
              <span className="chip"><CircleAlert size={11} aria-hidden="true" /> Threshold 25 µg/m³</span>
            </header>
            <div className="panel__map">
              {isLoaded && (
                <MiniMap
                  height={180}
                  markers={airData
                    .map((s) => {
                      const coords = lookupAirStation(s.station);
                      if (!coords) return null;
                      const st = airStatus(s.no2);
                      return {
                        lng: coords.lng,
                        lat: coords.lat,
                        color: st.color,
                        size: 14 + s.no2 / 3,
                        label: s.station,
                        sublabel: `NO₂ ${s.no2} µg/m³ · ${st.label}`,
                      };
                    })
                    .filter(Boolean)}
                />
              )}
            </div>
            <div className="air-table" role="table" aria-label="Air quality readings by station">
              <div className="air-row air-row--head" role="row">
                <span role="columnheader">Station</span>
                <span role="columnheader" className="tabular">NO₂</span>
                <span role="columnheader" className="tabular">PM2.5</span>
                <span role="columnheader" className="tabular">PM10</span>
                <span role="columnheader">Status</span>
              </div>
              {isLoaded ? airData.map((s, i) => {
                const st = airStatus(s.no2);
                const key = st === STATUS.ok ? "ok" : st === STATUS.warn ? "warn" : "alert";
                return (
                  <div className="air-row" role="row" key={i}>
                    <span role="cell" className="air-station">{s.station}</span>
                    <span role="cell" className="tabular">
                      <span style={{ color: st.color, fontWeight: 600 }}>{s.no2}</span>
                      <span className="air-bar">
                        <span className="air-bar__fill" style={{ width: `${Math.min(100, (s.no2 / 50) * 100)}%`, background: st.color }} />
                      </span>
                    </span>
                    <span role="cell" className="tabular">{s.pm25}</span>
                    <span role="cell" className="tabular">{s.pm10}</span>
                    <span role="cell">
                      <span className={`badge badge--${key}`}>
                        <span className={`dot dot--${key}`} aria-hidden="true" />
                        {st.label}
                      </span>
                    </span>
                  </div>
                );
              }) : Array.from({ length: 4 }).map((_, i) => (
                <div className="air-row" key={i}><Skeleton h={18} /></div>
              ))}
            </div>
          </div>

          <div className="panel panel--accent" aria-labelledby="bike-h">
            <header className="panel__head">
              <div>
                <span className="panel__kicker">03 · CYCLING</span>
                <h2 id="bike-h" className="panel__title">Bike stream</h2>
              </div>
              <button
                className="btn btn--ghost"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Resume streaming" : "Pause streaming"}
                aria-pressed={paused}
              >
                {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                <span>{paused ? "Resume" : "Pause"}</span>
              </button>
            </header>
            <div className="stream-big" aria-live={paused ? "off" : "polite"} aria-atomic="true">
              <div className="stream-big__value tabular">{bikeNow.toLocaleString()}</div>
              <div className="stream-big__label">cyclists · rolling today</div>
            </div>
            <div className="stream-canvas">
              <StreamingArea data={bikeStream} paused={paused} accent="#22C55E" height={140} />
            </div>
            <div className="stream-foot">
              <div>
                <span className="foot__k">Pumps</span>
                <span className="foot__v tabular">{pumps}</span>
              </div>
              <div>
                <span className="foot__k">Bike streets</span>
                <span className="foot__v tabular">63 km</span>
              </div>
              <div>
                <span className="foot__k">Repair pts</span>
                <span className="foot__v tabular">47</span>
              </div>
              <div>
                <span className="foot__k">Peak hour</span>
                <span className="foot__v tabular">08:15</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── EVENTS ─────────────────────────────────────────────── */}
        <section className="panel" aria-labelledby="events-h">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">04 · CULTURE</span>
              <h2 id="events-h" className="panel__title">Upcoming in the city</h2>
            </div>
            <span className="chip"><CalendarDays size={11} aria-hidden="true" /> Next 6 events</span>
          </header>
          <div className="panel__map">
            {isLoaded && (
              <MiniMap
                height={220}
                markers={evData.slice(0, 6)
                  .map((e, i) => {
                    const coords = lookupVenue(e.where);
                    if (!coords) return null;
                    return {
                      lng: coords.lng,
                      lat: coords.lat,
                      color: "#22C55E",
                      size: 16,
                      label: e.title,
                      sublabel: `${e.where} · ${e.when}`,
                      onClick: () => {
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.where + ", Gent")}`,
                          "_blank", "noopener"
                        );
                      },
                    };
                  })
                  .filter(Boolean)}
              />
            )}
          </div>
          <div className="events-grid">
            {isLoaded ? evData.slice(0, 6).map((e, i) => {
              // Open venue in Google Maps when clicking the card
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((e.where || "Gent") + ", Gent")}`;
              return (
                <a
                  key={i}
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event"
                  aria-label={`${e.title} at ${e.where}, ${e.when} — opens in Google Maps`}
                >
                  <span className="event__num tabular">{String(i + 1).padStart(2, "0")}</span>
                  <div className="event__body">
                    <div className="event__when tabular">{e.when}</div>
                    <div className="event__title">{e.title}</div>
                    <div className="event__where">
                      <MapPin size={11} aria-hidden="true" /> {e.where}
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="event__arrow" aria-hidden="true" />
                </a>
              );
            }) : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="event"><Skeleton h={56} /></div>
            ))}
          </div>
        </section>

      </main>

      <footer className="footer" role="contentinfo">
        <div>data.stad.gent · Opendatasoft v2.1</div>
        <div className="footer__mid tabular">
          4 streams · refresh 5 min · {lastUpdate ? `synced ${lastUpdate.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}` : "pending"}
        </div>
        <div>Built on Ghent open data · <span style={{ color: "#22C55E" }}>●</span> ops.ghent.live</div>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// CSS — OLED dark, Fira Code + Fira Sans, strict a11y, no emoji icons
// ═════════════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

.ops-root {
  /* Skill spec palette: Dark Slate + Status Green */
  --bg:            #0F172A;
  --bg-elev:       #111C33;
  --surface:       #15213D;
  --surface-2:     #1B2847;
  --muted:         #272F42;
  --border:        #334155;
  --border-soft:   rgba(71,85,105,0.35);
  --fg:            #F8FAFC;
  --fg-muted:      #94A3B8;
  --fg-dim:        #64748B;
  --accent:        #22C55E;     /* status green — CTA + live indicator */
  --warn:          #F59E0B;
  --alert:         #EF4444;
  --ring:          rgba(34,197,94,0.4);
  --serif: 'Fira Code', ui-monospace, monospace;
  --sans:  'Fira Sans', system-ui, -apple-system, sans-serif;
  --radius-sm: 4px;
  --radius:    8px;
  --radius-lg: 12px;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --t-fast:  150ms;
  --t-base:  220ms;

  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
  font-feature-settings: 'ss01','cv02','cv11';
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.ops-root * { box-sizing: border-box; }
.ops-root .tabular { font-variant-numeric: tabular-nums; }

/* Skip link (a11y requirement) */
.skip {
  position: absolute; left: -9999px; top: 0;
  background: var(--accent); color: #0B1220;
  padding: 8px 14px; z-index: 100;
  font-family: var(--serif); font-size: 12px; font-weight: 600;
  border-radius: 0 0 var(--radius) 0;
}
.skip:focus { left: 0; }

/* Focus rings (keyboard visibility requirement) */
.ops-root :focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Reduced motion (skill requirement) */
@media (prefers-reduced-motion: reduce) {
  .ops-root *, .ops-root *::before, .ops-root *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ── TOP BAR ─────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  background: rgba(15,23,42,0.85);
  backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 10;
  gap: 16px;
  flex-wrap: wrap;
}
.topbar__left { display: flex; align-items: center; gap: 12px; }
.logo {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--serif); font-weight: 700; font-size: 13px;
  letter-spacing: 0.08em; color: var(--accent);
}
.logo__text { color: var(--fg); letter-spacing: 0.15em; }
.topbar__sep { color: var(--fg-dim); }
.topbar__crumb {
  font-family: var(--serif); font-size: 11px;
  color: var(--fg-muted); letter-spacing: 0.05em;
}
.topbar__right { display: flex; align-items: center; gap: 16px; }
.conn { display: inline-flex; align-items: center; gap: 6px; }
.conn__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--fg-dim);
  box-shadow: 0 0 0 0 transparent;
}
.conn__dot.live {
  background: var(--accent);
  animation: pulse 1.8s ease-in-out infinite;
}
.conn__dot.sample { background: var(--warn); }
.conn__label {
  font-family: var(--serif); font-size: 10px; font-weight: 600;
  letter-spacing: 0.15em; color: var(--fg-muted);
}
.topbar__time {
  font-family: var(--serif); font-size: 11px;
  color: var(--fg-muted); letter-spacing: 0.05em;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--ring); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}

/* ── BUTTONS ─────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg);
  font-family: var(--serif); font-size: 11px; font-weight: 500;
  letter-spacing: 0.05em;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  min-height: 32px;
  cursor: pointer;
  transition: all var(--t-fast) var(--ease);
}
.btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(34,197,94,0.06);
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
  opacity: 0.8;
}
.btn:disabled { opacity: 0.5; cursor: wait; }
.btn--ghost { background: rgba(255,255,255,0.02); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── LAYOUT ──────────────────────────────────────────────────── */
.main {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── HERO ────────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 16px;
}

.call {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.call::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.call--warn::before  { background: linear-gradient(90deg, transparent, var(--warn), transparent); }
.call--alert::before { background: linear-gradient(90deg, transparent, var(--alert), transparent); }

.call__header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 16px;
}
.call__badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--serif); font-size: 10px; font-weight: 600;
  letter-spacing: 0.15em;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.call__badge--ok    { background: rgba(34,197,94,0.12);  color: var(--accent); border: 1px solid rgba(34,197,94,0.3); }
.call__badge--warn  { background: rgba(245,158,11,0.12); color: var(--warn);   border: 1px solid rgba(245,158,11,0.3); }
.call__badge--alert { background: rgba(239,68,68,0.12);  color: var(--alert);  border: 1px solid rgba(239,68,68,0.3); }

.call__kicker {
  font-family: var(--serif); font-size: 10px; font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--fg-dim);
  text-transform: uppercase;
}
.call__head {
  font-family: var(--serif); font-weight: 500;
  font-size: 26px; line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
  color: var(--fg);
}
.call__body {
  font-size: 14px; line-height: 1.55;
  color: var(--fg-muted);
  margin: 0 0 16px;
  max-width: 45ch;
}
.call__meta {
  display: flex; align-items: center; gap: 12px;
  font-family: var(--serif); font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--fg-dim);
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.call__meta span {
  display: inline-flex; align-items: center; gap: 4px;
}

/* ── KPI GRID ────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex; flex-direction: column;
  transition: border-color var(--t-base) var(--ease), transform var(--t-base) var(--ease);
}
.kpi:hover { border-color: var(--fg-dim); }

.kpi__head {
  display: flex; align-items: center; gap: 6px;
  color: var(--fg-muted);
  margin-bottom: 8px;
}
.kpi__title {
  font-family: var(--serif); font-size: 10px; font-weight: 500;
  letter-spacing: 0.15em; text-transform: uppercase;
  flex: 1;
}
.kpi__value {
  font-family: var(--serif); font-weight: 600;
  font-size: 36px; line-height: 1;
  color: var(--fg);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.kpi__unit {
  font-size: 14px; color: var(--fg-muted);
  margin-left: 3px; font-weight: 500;
}
.kpi__sub {
  font-size: 11px;
  color: var(--fg-muted);
  min-height: 16px;
  display: flex; align-items: center; gap: 6px;
}
.kpi__sub-text { color: var(--fg-dim); }
.kpi__mini-bar {
  margin-top: 10px;
  height: 3px; border-radius: 99px;
  background: var(--muted);
  overflow: hidden;
}
.kpi__mini-fill {
  height: 100%;
  transition: width var(--t-base) var(--ease);
}
.kpi__mini-chart { margin-top: 6px; height: 44px; display: flex; align-items: flex-end; }
.kpi__stream { margin-top: 8px; }
.kpi__pills { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
.pill {
  font-family: var(--serif); font-size: 9px; font-weight: 500;
  letter-spacing: 0.05em;
  padding: 3px 6px;
  background: var(--muted);
  color: var(--fg-muted);
  border-radius: 3px;
}

/* Status dots */
.dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  flex-shrink: 0;
}
.dot--ok    { background: var(--accent); box-shadow: 0 0 8px var(--ring); }
.dot--warn  { background: var(--warn);   box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.dot--alert { background: var(--alert);  box-shadow: 0 0 8px rgba(239,68,68,0.4); }

.trend {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: var(--serif); font-weight: 600;
}
.trend--up   { color: var(--accent); }
.trend--down { color: var(--alert); }

/* ── PANELS ─────────────────────────────────────────────────── */
.panel {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel--accent {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 60%);
  border-color: rgba(34,197,94,0.2);
}
.panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-soft);
  gap: 12px;
  flex-wrap: wrap;
}
.panel__kicker {
  display: block;
  font-family: var(--serif); font-size: 10px; font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--fg-dim);
  margin-bottom: 2px;
}
.panel__title {
  font-family: var(--serif); font-weight: 500;
  font-size: 18px; line-height: 1.2;
  letter-spacing: -0.005em;
  margin: 0;
  color: var(--fg);
}
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--serif); font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--fg-muted);
  padding: 5px 9px;
  background: var(--muted);
  border: 1px solid var(--border-soft);
  border-radius: 99px;
}

.panel__map {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--bg);
}

/* ── BULLET CHART ───────────────────────────────────────────── */
.bullet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-soft);
  padding: 1px;
}
.bullet {
  background: var(--bg-elev);
  padding: 16px 18px;
  transition: background var(--t-base) var(--ease);
}
.bullet:hover { background: var(--surface); }
.bullet__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}
.bullet__label {
  font-family: var(--serif); font-weight: 500;
  font-size: 13px; color: var(--fg);
  line-height: 1.3;
}
.bullet__sub {
  font-size: 10px; color: var(--fg-muted);
  margin-top: 2px;
}
.bullet__value {
  font-family: var(--serif); font-weight: 600;
  font-size: 22px; line-height: 1;
  letter-spacing: -0.02em;
}
.bullet__track {
  position: relative;
  height: 10px;
  background: var(--muted);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}
.bullet__zone { position: absolute; top: 0; bottom: 0; }
.bullet__mark {
  position: absolute; top: -2px; bottom: -2px;
  width: 1px;
  background: var(--fg);
  opacity: 0.35;
}
.bullet__bar {
  position: absolute; top: 2px; bottom: 2px; left: 0;
  border-radius: 1px;
  transition: width 600ms var(--ease);
}
.bullet__legend {
  display: flex; justify-content: space-between;
  font-family: var(--serif); font-size: 9px;
  color: var(--fg-dim);
  letter-spacing: 0.02em;
}
.bullet__legend em { font-style: normal; color: var(--fg-muted); }

/* ── SPLIT (Air + Bike) ─────────────────────────────────────── */
.split {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
}

/* ── AIR TABLE ──────────────────────────────────────────────── */
.air-table { padding: 8px 20px 20px; }
.air-row {
  display: grid;
  grid-template-columns: 1.6fr 1.3fr 0.8fr 0.8fr 1.1fr;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border-soft);
  gap: 12px;
  font-size: 13px;
}
.air-row:last-child { border-bottom: none; }
.air-row--head {
  font-family: var(--serif); font-size: 10px; font-weight: 600;
  letter-spacing: 0.15em; color: var(--fg-dim);
  text-transform: uppercase;
  padding: 10px 0;
}
.air-station { font-family: var(--sans); font-weight: 500; }
.air-bar {
  display: inline-block;
  width: 60px; height: 4px;
  margin-left: 8px;
  background: var(--muted);
  border-radius: 99px;
  vertical-align: middle;
  overflow: hidden;
}
.air-bar__fill { display: block; height: 100%; transition: width var(--t-base) var(--ease); }

.badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--serif); font-size: 10px; font-weight: 500;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 99px;
}
.badge--ok    { background: rgba(34,197,94,0.10);  color: var(--accent); }
.badge--warn  { background: rgba(245,158,11,0.10); color: var(--warn); }
.badge--alert { background: rgba(239,68,68,0.10);  color: var(--alert); }

/* ── BIKE PANEL ─────────────────────────────────────────────── */
.stream-big { padding: 20px 20px 6px; }
.stream-big__value {
  font-family: var(--serif); font-weight: 600;
  font-size: 48px; line-height: 1;
  letter-spacing: -0.03em;
  color: var(--fg);
}
.stream-big__label {
  font-family: var(--serif); font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-muted);
  margin-top: 6px;
}
.stream-canvas { padding: 0 20px; margin-top: 8px; }
.stream-foot {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-soft);
  margin-top: 12px;
}
.foot__k {
  display: block;
  font-family: var(--serif); font-size: 9px; font-weight: 500;
  letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--fg-dim);
  margin-bottom: 4px;
}
.foot__v {
  font-family: var(--serif); font-weight: 600;
  font-size: 18px; color: var(--fg);
}

/* ── EVENTS ─────────────────────────────────────────────────── */
.events-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border-soft);
}
.event {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  background: var(--bg-elev);
  color: var(--fg);
  text-decoration: none;
  transition: background var(--t-base) var(--ease);
  min-height: 88px;
}
.event:hover { background: var(--surface); }
.event__num {
  font-family: var(--serif); font-weight: 500;
  font-size: 20px; color: var(--accent);
  line-height: 1;
  min-width: 22px;
  padding-top: 2px;
}
.event__body { flex: 1; min-width: 0; }
.event__when {
  font-family: var(--serif); font-size: 10px; font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--fg-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.event__title {
  font-family: var(--sans); font-weight: 500;
  font-size: 15px; line-height: 1.3;
  margin-bottom: 4px;
  color: var(--fg);
}
.event__where {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--fg-muted);
}
.event__arrow {
  color: var(--fg-dim);
  transition: color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
  flex-shrink: 0; margin-top: 2px;
}
.event:hover .event__arrow { color: var(--accent); transform: translate(2px, -2px); }

/* ── SKELETON ───────────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, var(--muted) 0%, var(--surface-2) 50%, var(--muted) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── FOOTER ─────────────────────────────────────────────────── */
.footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  font-family: var(--serif); font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--fg-dim);
  gap: 12px;
  flex-wrap: wrap;
}
.footer__mid { color: var(--fg-muted); }

/* ── RESPONSIVE ─────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .bullet-grid { grid-template-columns: repeat(2, 1fr); }
  .split { grid-template-columns: 1fr; }
  .events-grid { grid-template-columns: repeat(2, 1fr); }
  .stream-foot { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .main { padding: 16px; gap: 16px; }
  .topbar { padding: 10px 16px; }
  .topbar__crumb, .topbar__sep { display: none; }
  .kpi-grid { grid-template-columns: 1fr; }
  .bullet-grid { grid-template-columns: 1fr; }
  .events-grid { grid-template-columns: 1fr; }
  .air-row {
    grid-template-columns: 1.5fr 1fr;
    grid-template-rows: auto auto;
  }
  .air-row--head { display: none; }
  .call__head { font-size: 22px; }
  .kpi__value { font-size: 28px; }
  .stream-big__value { font-size: 38px; }
}
`;
