import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ═══════════════════════════════════════════════════════════════════════════
// MiniMap — CARTO dark-matter vector tiles, neon glow markers, ripple pulse
// Free, no API key required.
// ═══════════════════════════════════════════════════════════════════════════

const GHENT_CENTER = [3.7250, 51.0536];
const DARK_STYLE   = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ── Venue coordinates ────────────────────────────────────────────────────
export const VENUE_COORDS = {
  "Sint-Baafsplein":  { lng: 3.7265, lat: 51.0533 },
  "Korenmarkt":       { lng: 3.7214, lat: 51.0541 },
  "Sphinx Cinema":    { lng: 3.7207, lat: 51.0542 },
  "Kouter 29":        { lng: 3.7237, lat: 51.0508 },
  "Handelsbeurs":     { lng: 3.7237, lat: 51.0508 },
  "ICC Citadelpark":  { lng: 3.7243, lat: 51.0390 },
  "Citadelpark":      { lng: 3.7243, lat: 51.0390 },
  "Vrijdagmarkt":     { lng: 3.7279, lat: 51.0568 },
  "Graslei":          { lng: 3.7215, lat: 51.0549 },
  "Kouter":           { lng: 3.7227, lat: 51.0510 },
  "NTGent":           { lng: 3.7266, lat: 51.0533 },
};

export const PARKING_COORDS = {
  "Kouter":            { lng: 3.7227, lat: 51.0510 },
  "Vrijdagmarkt":      { lng: 3.7279, lat: 51.0568 },
  "Sint-Pietersplein": { lng: 3.7264, lat: 51.0435 },
  "Ramen":             { lng: 3.7170, lat: 51.0526 },
  "Reep":              { lng: 3.7290, lat: 51.0532 },
  "Savaanstraat":      { lng: 3.7261, lat: 51.0476 },
  "B-Park The Loop":   { lng: 3.6804, lat: 51.0159 },
  "The Loop":          { lng: 3.6804, lat: 51.0159 },
  "Dampoort":          { lng: 3.7440, lat: 51.0599 },
};

export const AIR_STATION_COORDS = {
  "Baudelo":              { lng: 3.7313, lat: 51.0569 },
  "Lange Violettestraat": { lng: 3.7288, lat: 51.0478 },
  "Muide":                { lng: 3.7165, lat: 51.0666 },
  "Gent Centrum":         { lng: 3.7250, lat: 51.0536 },
};

export function lookupVenue(name) {
  if (!name) return null;
  if (VENUE_COORDS[name]) return VENUE_COORDS[name];
  for (const k of Object.keys(VENUE_COORDS))
    if (name.toLowerCase().includes(k.toLowerCase())) return VENUE_COORDS[k];
  return null;
}

export function lookupParking(name) {
  if (!name) return null;
  if (PARKING_COORDS[name]) return PARKING_COORDS[name];
  for (const k of Object.keys(PARKING_COORDS))
    if (name.toLowerCase().includes(k.toLowerCase())) return PARKING_COORDS[k];
  return null;
}

export function lookupAirStation(name) {
  if (!name) return null;
  if (AIR_STATION_COORDS[name]) return AIR_STATION_COORDS[name];
  for (const k of Object.keys(AIR_STATION_COORDS))
    if (name.toLowerCase().includes(k.toLowerCase())) return AIR_STATION_COORDS[k];
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MiniMap component
// props:
//   markers  [{ lng, lat, color, size, label, sublabel, pulse, mapsHref, onClick }]
//   height   px  (default 260)
//   center   [lng, lat]
//   zoom     number
// ═══════════════════════════════════════════════════════════════════════════

export default function MiniMap({
  markers = [],
  height  = 260,
  center  = GHENT_CENTER,
  zoom    = 12,
}) {
  const containerRef     = useRef(null);
  const mapRef           = useRef(null);
  const markerObjectsRef = useRef([]);

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container:          containerRef.current,
      style:              DARK_STYLE,
      center,
      zoom,
      attributionControl: false,
      dragRotate:         false,
      pitchWithRotate:    false,
      touchZoomRotate:    false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerObjectsRef.current.forEach(m => m.remove());
    markerObjectsRef.current = [];
    if (!markers.length) return;

    markers.forEach(m => {
      const size  = m.size  || 22;
      const color = m.color || "#00FF88";

      const el = document.createElement("div");
      el.className = `mm-mk${m.pulse ? " mm-mk--pulse" : ""}`;
      el.style.cssText = `width:${size}px;height:${size}px;`;
      el.style.setProperty("--mc", color);
      el.innerHTML = `<div class="mm-mk__dot"></div>`;

      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.45)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)";    });

      if (m.onClick)    el.onclick = m.onClick;
      else if (m.mapsHref)
        el.onclick = () => window.open(m.mapsHref, "_blank", "noopener");

      const popup = new maplibregl.Popup({
        offset:       20,
        closeButton:  false,
        closeOnClick: false,
        className:    "mm-pop",
      }).setHTML(`
        <div style="font-family:system-ui,sans-serif;font-size:12px;min-width:130px;">
          <div style="font-weight:700;color:#E8E8E8;margin-bottom:3px;line-height:1.3;">${m.label || ""}</div>
          ${m.sublabel
            ? `<div style="color:#505060;font-size:10px;font-variant-numeric:tabular-nums;margin-bottom:${m.mapsHref ? 7 : 0}px;">${m.sublabel}</div>`
            : ""}
          ${m.mapsHref ? `
          <a href="${m.mapsHref}" target="_blank" rel="noopener noreferrer"
             style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#00FF88;text-decoration:none;font-weight:600;letter-spacing:0.04em;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            Directions
          </a>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("mouseenter", () => marker.togglePopup());
      el.addEventListener("mouseleave", () => {
        if (marker.getPopup()?.isOpen()) marker.togglePopup();
      });

      markerObjectsRef.current.push(marker);
    });

    // Fit to pulse markers first, else all markers
    const fit = markers.filter(m => m.pulse).length
      ? markers.filter(m => m.pulse)
      : markers;

    if (fit.length > 1) {
      const b = new maplibregl.LngLatBounds();
      fit.forEach(m => b.extend([m.lng, m.lat]));
      map.fitBounds(b, { padding: 52, maxZoom: 15, duration: 700 });
    } else if (fit.length === 1) {
      map.flyTo({ center: [fit[0].lng, fit[0].lat], zoom: 15, duration: 700 });
    } else if (markers.length > 1) {
      const b = new maplibregl.LngLatBounds();
      markers.forEach(m => b.extend([m.lng, m.lat]));
      map.fitBounds(b, { padding: 44, maxZoom: 14, duration: 700 });
    }
  }, [markers]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: "100%", height, background: "#040404", overflow: "hidden" }}
      />
      <style>{MARKER_CSS}</style>
    </>
  );
}

// ── Marker + popup CSS ────────────────────────────────────────────────────
const MARKER_CSS = `
.mm-mk {
  position: relative;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms cubic-bezier(0.16,1,0.3,1);
  will-change: transform;
}
.mm-mk::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--mc, #00FF88);
  opacity: 0.28;
  transition: opacity 180ms ease;
}
.mm-mk:hover::before { opacity: 0.65; }
.mm-mk__dot {
  width: 48%;
  height: 48%;
  border-radius: 50%;
  background: var(--mc, #00FF88);
  box-shadow: 0 0 7px var(--mc, #00FF88), 0 0 16px var(--mc, #00FF88);
}
.mm-mk--pulse::after {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 1.5px solid var(--mc, #00FF88);
  opacity: 0;
  animation: mm-ripple 2.4s ease-out infinite;
  pointer-events: none;
}
@keyframes mm-ripple {
  0%   { transform: scale(0.65); opacity: 0.75; }
  100% { transform: scale(2.3);  opacity: 0;    }
}
.mm-pop .maplibregl-popup-content {
  background:    rgba(4,4,4,0.97)                !important;
  border:        1px solid rgba(255,255,255,0.07) !important;
  padding:       10px 13px                        !important;
  border-radius: 9px                              !important;
  box-shadow:    0 10px 40px rgba(0,0,0,0.9)      !important;
}
.mm-pop .maplibregl-popup-tip {
  border-top-color:    rgba(4,4,4,0.97) !important;
  border-bottom-color: rgba(4,4,4,0.97) !important;
}
.maplibregl-ctrl-bottom-right .maplibregl-ctrl { background: rgba(4,4,4,0.85) !important; }
.maplibregl-ctrl-attrib-inner,
.maplibregl-ctrl-attrib-inner a { color: rgba(70,70,85,0.9) !important; font-size: 9px !important; }
.maplibregl-ctrl-group { background: rgba(4,4,4,0.96) !important; border: 1px solid rgba(255,255,255,0.06) !important; }
.maplibregl-ctrl-group button       { background: transparent !important; }
.maplibregl-ctrl-group button:hover { background: rgba(255,255,255,0.05) !important; }
.maplibregl-ctrl-group button span  { filter: invert(1) brightness(0.55); }
`;
