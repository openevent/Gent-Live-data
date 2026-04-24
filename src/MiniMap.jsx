import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ═════════════════════════════════════════════════════════════════════════
// MiniMap — reusable dark-themed map for each dashboard section
// Uses CARTO dark-matter vector tiles (free, no API key needed)
// ═════════════════════════════════════════════════════════════════════════

const GHENT_CENTER = [3.7250, 51.0536]; // [lng, lat] — central Ghent

// CARTO dark matter — free tiles that match our OLED aesthetic
const DARK_STYLE = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// ── Venue coordinates for events (Ghent landmarks) ──────────────────────
// Fallback lookup since the events API often lacks coordinates
// Coordinates verified against OpenStreetMap.
export const VENUE_COORDS = {
  "Sint-Baafsplein":    { lng: 3.7265, lat: 51.0533 },
  "Korenmarkt":         { lng: 3.7214, lat: 51.0541 },
  "Sphinx Cinema":      { lng: 3.7207, lat: 51.0542 },
  "Kouter 29":          { lng: 3.7237, lat: 51.0508 },
  "Handelsbeurs":       { lng: 3.7237, lat: 51.0508 },
  "ICC Citadelpark":    { lng: 3.7243, lat: 51.0390 },
  "Citadelpark":        { lng: 3.7243, lat: 51.0390 },
  "Vrijdagmarkt":       { lng: 3.7279, lat: 51.0568 },
  "Graslei":            { lng: 3.7215, lat: 51.0549 },
  "Kouter":             { lng: 3.7227, lat: 51.0510 },
  "NTGent":             { lng: 3.7266, lat: 51.0533 },
};

export function lookupVenue(name) {
  if (!name) return null;
  // direct match
  if (VENUE_COORDS[name]) return VENUE_COORDS[name];
  // fuzzy match — is any known venue name a substring?
  for (const key of Object.keys(VENUE_COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return VENUE_COORDS[key];
  }
  return null;
}

// ── Parking garage coordinates (city centre, known from data.stad.gent) ─
export const PARKING_COORDS = {
  "Kouter":              { lng: 3.7227, lat: 51.0510 },
  "Vrijdagmarkt":        { lng: 3.7279, lat: 51.0568 },
  "Sint-Pietersplein":   { lng: 3.7264, lat: 51.0435 },
  "Ramen":               { lng: 3.7170, lat: 51.0526 },
  "Reep":                { lng: 3.7290, lat: 51.0532 },
  "Savaanstraat":        { lng: 3.7261, lat: 51.0476 },
  "B-Park The Loop":     { lng: 3.6804, lat: 51.0159 },
  "The Loop":            { lng: 3.6804, lat: 51.0159 },
  "Dampoort":            { lng: 3.7440, lat: 51.0599 },
};

export function lookupParking(name) {
  if (!name) return null;
  if (PARKING_COORDS[name]) return PARKING_COORDS[name];
  for (const key of Object.keys(PARKING_COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return PARKING_COORDS[key];
  }
  return null;
}

// ── Air quality station coordinates ─────────────────────────────────────
export const AIR_STATION_COORDS = {
  "Baudelo":                { lng: 3.7313, lat: 51.0569 },
  "Lange Violettestraat":   { lng: 3.7288, lat: 51.0478 },
  "Muide":                  { lng: 3.7165, lat: 51.0666 },
  "Gent Centrum":           { lng: 3.7250, lat: 51.0536 },
};

export function lookupAirStation(name) {
  if (!name) return null;
  if (AIR_STATION_COORDS[name]) return AIR_STATION_COORDS[name];
  for (const key of Object.keys(AIR_STATION_COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return AIR_STATION_COORDS[key];
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════
// The MiniMap component itself
// ═════════════════════════════════════════════════════════════════════════
// props:
//   markers: [{ lng, lat, color, size, label, sublabel, onClick? }]
//   height:  number (pixels)
//   center?: [lng, lat] (defaults to Ghent centre)
//   zoom?:   number (defaults to 12)
// ═════════════════════════════════════════════════════════════════════════

export default function MiniMap({
  markers = [],
  height = 200,
  center = GHENT_CENTER,
  zoom = 12,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjectsRef = useRef([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center,
      zoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers whenever the prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markerObjectsRef.current.forEach((m) => m.remove());
    markerObjectsRef.current = [];

    if (!markers.length) return;

    // Build new markers
    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mm-marker";
      el.setAttribute("aria-label", m.label || "");
      el.style.cssText = `
        width: ${m.size || 14}px;
        height: ${m.size || 14}px;
        border-radius: 50%;
        background: ${m.color || "#22C55E"};
        border: 2px solid rgba(15,23,42,0.9);
        box-shadow: 0 0 0 1px ${m.color || "#22C55E"}66, 0 0 12px ${m.color || "#22C55E"}88;
        cursor: ${m.onClick ? "pointer" : "default"};
        transition: transform 180ms cubic-bezier(0.16,1,0.3,1);
      `;
      el.onmouseenter = () => { el.style.transform = "scale(1.25)"; };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };
      if (m.onClick) el.onclick = m.onClick;

      // Tooltip as popup on hover
      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        closeOnClick: false,
        className: "mm-popup",
      }).setHTML(`
        <div style="font-family: 'Fira Sans', system-ui, sans-serif; font-size: 12px;">
          <div style="font-weight:600; color:#F8FAFC; margin-bottom:2px;">${m.label || ""}</div>
          ${m.sublabel ? `<div style="color:#94A3B8; font-size:10px; font-variant-numeric:tabular-nums;">${m.sublabel}</div>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);

      // Show popup on hover
      el.addEventListener("mouseenter", () => marker.togglePopup());
      el.addEventListener("mouseleave", () => marker.togglePopup());

      markerObjectsRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 30, maxZoom: 14, duration: 600 });
    } else if (markers.length === 1) {
      map.flyTo({ center: [markers[0].lng, markers[0].lat], zoom: 14, duration: 600 });
    }
  }, [markers]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height,
          borderRadius: 8,
          overflow: "hidden",
          background: "#0F172A",
        }}
      />
      <style>{`
        .mm-popup .maplibregl-popup-content {
          background: rgba(15, 23, 42, 0.96) !important;
          border: 1px solid rgba(71, 85, 105, 0.5) !important;
          padding: 8px 10px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }
        .mm-popup .maplibregl-popup-tip {
          border-top-color: rgba(15, 23, 42, 0.96) !important;
          border-bottom-color: rgba(15, 23, 42, 0.96) !important;
        }
        .maplibregl-ctrl-bottom-right .maplibregl-ctrl {
          background: rgba(15,23,42,0.7) !important;
        }
        .maplibregl-ctrl-attrib-inner, .maplibregl-ctrl-attrib-inner a {
          color: rgba(148,163,184,0.8) !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(15,23,42,0.9) !important;
          border: 1px solid rgba(71,85,105,0.5) !important;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(71,85,105,0.3) !important;
        }
        .maplibregl-ctrl-group button span {
          filter: invert(1);
        }
      `}</style>
    </>
  );
}
