import React, { useMemo } from "react";
import {
  Sun, Cloud, CloudRain, Moon, Snowflake, MapPin, ArrowUpRight, Coffee,
} from "lucide-react";
import { TERRACES, terraceStatus } from "./terraces-data.js";
import MiniMap from "./MiniMap.jsx";

// ═════════════════════════════════════════════════════════════════════════
// Terraces — which Ghent terraces are in the sun right now
// ═════════════════════════════════════════════════════════════════════════
//
// Sorts terraces by status (in sun → coming soon → grey → done → cold/rainy).
// Shows a map of top-rated ones, then a scrollable list.
// Click any tile to open in Google Maps.
// ═════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  sun:   "#F59E0B",  // warm yellow for "in sun"
  soon:  "#60A5FA",  // soft blue for "coming soon"
  later: "#94A3B8",  // muted for "later today"
  grey:  "#94A3B8",
  done:  "#64748B",  // very muted for "sun gone"
  night: "#64748B",
  cold:  "#60A5FA",
  rain:  "#60A5FA",
};

const STATUS_ICONS = {
  sun:   Sun,
  soon:  Sun,
  later: Cloud,
  grey:  Cloud,
  done:  Cloud,
  night: Moon,
  cold:  Snowflake,
  rain:  CloudRain,
};

export default function Terraces({ weather }) {
  // Compute status for every terrace; sort by "best right now"
  const ranked = useMemo(() => {
    return TERRACES
      .map((t) => ({ ...t, status: terraceStatus(t, weather) }))
      .sort((a, b) => a.status.order - b.status.order);
  }, [weather]);

  // Stats for the header
  const inSun = ranked.filter((t) => t.status.key === "sun").length;
  const total = ranked.length;

  // Build map markers from top 20 for performance
  const markers = ranked.slice(0, 20).map((t) => ({
    lng: t.coords.lng,
    lat: t.coords.lat,
    color: STATUS_COLORS[t.status.key] || "#94A3B8",
    size: t.status.key === "sun" ? 18 : 12,
    label: t.name,
    sublabel: `${t.status.label} · ${t.area}`,
    onClick: () => window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.mapsQuery)}`,
      "_blank", "noopener"
    ),
  }));

  // Overall headline
  let headline, headlineTone;
  if (weather.code >= 51) {
    headline = "Not a terrace day.";
    headlineTone = "rain";
  } else if (weather.temp < 10) {
    headline = "Too cold for most terraces.";
    headlineTone = "cold";
  } else if (!weather.isDay) {
    headline = "Dark out — no sun anywhere.";
    headlineTone = "night";
  } else if (inSun > 0) {
    headline = `${inSun} ${inSun === 1 ? "terrace is" : "terraces are"} in the sun right now.`;
    headlineTone = "sun";
  } else {
    headline = "No terraces in direct sun right now.";
    headlineTone = "grey";
  }

  return (
    <section className="panel terraces" aria-labelledby="terraces-h">
      <style>{css}</style>

      <header className="panel__head">
        <div>
          <span className="panel__kicker">TERRACES · SUN TRACKER</span>
          <h2 id="terraces-h" className="panel__title">Sunny terraces, right now</h2>
        </div>
        <span className={`terraces__badge terraces__badge--${headlineTone} tabular`}>
          {inSun}/{total} in sun
        </span>
      </header>

      {/* Headline */}
      <div className="terraces__headline">
        <div className={`terraces__headline-icon terraces__headline-icon--${headlineTone}`}>
          {headlineTone === "sun"   && <Sun size={22} strokeWidth={1.6} />}
          {headlineTone === "grey"  && <Cloud size={22} strokeWidth={1.6} />}
          {headlineTone === "rain"  && <CloudRain size={22} strokeWidth={1.6} />}
          {headlineTone === "cold"  && <Snowflake size={22} strokeWidth={1.6} />}
          {headlineTone === "night" && <Moon size={22} strokeWidth={1.6} />}
        </div>
        <div className="terraces__headline-text">
          <div className="terraces__headline-main">{headline}</div>
          <div className="terraces__headline-sub">
            {weather.temp}° · {weather.code <= 2 ? "clear" : weather.code === 3 ? "overcast" : weather.code >= 51 ? "wet" : "mixed"} · sorted by best right now
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="panel__map">
        <MiniMap height={200} markers={markers} />
      </div>

      {/* Grid */}
      <div className="terraces__grid">
        {ranked.map((t, i) => {
          const Icon = STATUS_ICONS[t.status.key] || Sun;
          const color = STATUS_COLORS[t.status.key];
          return (
            <a
              key={i}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.mapsQuery)}`}
              target="_blank" rel="noopener noreferrer"
              className={`terrace terrace--${t.status.key}`}
              aria-label={`${t.name} in ${t.area}. ${t.status.detail}`}
            >
              <div className="terrace__top">
                <div className="terrace__icon" style={{ color }}>
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <span className="terrace__type">{t.type}</span>
                <span className="terrace__price">{t.priceLevel}</span>
              </div>
              <div className="terrace__name">{t.name}</div>
              <div className="terrace__vibe">{t.vibe}</div>
              <div className="terrace__foot">
                <span className="terrace__area">
                  <MapPin size={10} aria-hidden="true" /> {t.area}
                </span>
                <span className="terrace__status" style={{ color }}>
                  {t.status.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="terraces__footnote">
        <Coffee size={11} aria-hidden="true" />
        <span>
          Sun windows are approximate, based on street orientation + typical patterns.
          Found a wrong one? A missed favourite? Let us know.
        </span>
      </div>
    </section>
  );
}

const css = `
.terraces__badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; padding: 5px 10px; border-radius: 99px;
}
.terraces__badge--sun   { background: rgba(245,158,11,0.15); color: #F59E0B; }
.terraces__badge--grey  { background: rgba(148,163,184,0.12); color: #94A3B8; }
.terraces__badge--rain  { background: rgba(96,165,250,0.12); color: #60A5FA; }
.terraces__badge--cold  { background: rgba(96,165,250,0.12); color: #60A5FA; }
.terraces__badge--night { background: rgba(100,116,139,0.12); color: #64748B; }

.terraces__headline {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px; border-bottom: 1px solid var(--border-soft, rgba(71,85,105,0.35));
}
.terraces__headline-icon {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.terraces__headline-icon--sun   { background: rgba(245,158,11,0.12); color: #F59E0B; }
.terraces__headline-icon--grey  { background: rgba(148,163,184,0.1); color: #94A3B8; }
.terraces__headline-icon--rain  { background: rgba(96,165,250,0.1); color: #60A5FA; }
.terraces__headline-icon--cold  { background: rgba(96,165,250,0.1); color: #60A5FA; }
.terraces__headline-icon--night { background: rgba(100,116,139,0.12); color: #64748B; }
.terraces__headline-main {
  font-size: 16px; font-weight: 500; color: var(--fg, #F8FAFC); line-height: 1.3;
}
.terraces__headline-sub {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 10px; letter-spacing: 0.1em; color: var(--fg-muted, #94A3B8);
  text-transform: uppercase; margin-top: 3px;
}

.terraces__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-soft, rgba(71,85,105,0.35));
}

.terrace {
  background: var(--bg-elev, #111C33);
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 6px;
  text-decoration: none; color: var(--fg, #F8FAFC);
  transition: background 200ms cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 130px;
  position: relative;
}
.terrace:hover { background: var(--surface, #15213D); }
.terrace--sun { background: linear-gradient(180deg, rgba(245,158,11,0.08) 0%, var(--bg-elev, #111C33) 60%); }
.terrace--sun:hover { background: linear-gradient(180deg, rgba(245,158,11,0.12) 0%, var(--surface, #15213D) 60%); }
.terrace--done, .terrace--night, .terrace--rain, .terrace--cold { opacity: 0.7; }
.terrace--done:hover, .terrace--night:hover, .terrace--rain:hover, .terrace--cold:hover { opacity: 1; }

.terrace__top {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--fg-dim, #64748B);
}
.terrace__icon {
  width: 22px; height: 22px; border-radius: 5px;
  background: rgba(255,255,255,0.03);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.terrace__type { flex: 1; font-weight: 500; }
.terrace__price { color: var(--fg-muted, #94A3B8); letter-spacing: 0.05em; }

.terrace__name {
  font-weight: 600; font-size: 14px; line-height: 1.25;
  color: var(--fg, #F8FAFC); letter-spacing: -0.005em;
}
.terrace__vibe {
  font-size: 12px; color: var(--fg-muted, #94A3B8);
  line-height: 1.35;
  flex: 1;
}
.terrace__foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-soft, rgba(71,85,105,0.35));
}
.terrace__area {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--fg-dim, #64748B);
}
.terrace__status {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
}

.terraces__footnote {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-soft, rgba(71,85,105,0.35));
  font-size: 11px; color: var(--fg-dim, #64748B); line-height: 1.5;
  font-style: italic;
}

@media (max-width: 1100px) {
  .terraces__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .terraces__grid { grid-template-columns: 1fr; }
  .terraces__headline { flex-direction: column; align-items: flex-start; gap: 10px; }
}
`;
