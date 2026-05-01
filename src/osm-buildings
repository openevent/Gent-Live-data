// ═══════════════════════════════════════════════════════════════════════
// osm-buildings.js  –  Fetch + cache Ghent building footprints
//                      from the OpenStreetMap Overpass API
// ═══════════════════════════════════════════════════════════════════════

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Bounding box covering Ghent old town + immediate surroundings.
// Format: south, west, north, east
const GHENT_BBOX = [51.035, 3.690, 51.075, 3.745];

const CACHE_KEY = 'gent-buildings-v2';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

// Module-level memory cache — survives React re-renders, cleared on page reload.
let _memCache = null;

// ── Height parsing ───────────────────────────────────────────────────────

function parseHeight(tags) {
  if (tags.height) {
    // height tag may include "m" suffix, e.g. "12 m" or "12.5"
    const h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
  }
  if (tags['building:levels']) {
    const levels = parseFloat(tags['building:levels']);
    if (!isNaN(levels) && levels > 0) return levels * 3.5;
  }
  // Fallback: assume 2-storey building (~7m) for unknown buildings in a city centre
  return 7;
}

// ── Overpass response parser ─────────────────────────────────────────────

function parseOSMResponse(data) {
  // Build a node lookup map
  const nodeMap = {};
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeMap[el.id] = { lat: el.lat, lng: el.lon };
    }
  }

  const buildings = [];
  for (const el of data.elements) {
    if (el.type !== 'way') continue;
    if (!el.tags || !el.tags.building) continue;
    if (!el.nodes || el.nodes.length < 4) continue; // need ≥3 vertices + closing node

    // OSM ways are closed (first node = last node); drop the duplicate.
    const polygon = el.nodes
      .slice(0, -1)
      .map(id => nodeMap[id])
      .filter(Boolean);

    if (polygon.length < 3) continue;

    buildings.push({
      id:      el.id,
      polygon,
      height:  parseHeight(el.tags),
    });
  }

  return buildings;
}

// ── Overpass fetch ───────────────────────────────────────────────────────

async function fetchFromOverpass() {
  const [s, w, n, e] = GHENT_BBOX;

  // Fetch all building ways in the bbox, then resolve their node coordinates.
  const query = [
    '[out:json][timeout:30];',
    `(way["building"](${s},${w},${n},${e}););`,
    'out body;>;out skel qt;',
  ].join('');

  const res = await fetch(OVERPASS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = await res.json();
  return parseOSMResponse(data);
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Load all buildings in the Ghent bbox.
 * Checks in-memory cache first, then sessionStorage, then fetches from Overpass.
 * Returns an array of { id, polygon: [{lat, lng}], height } objects.
 */
export async function loadBuildings() {
  // 1. In-memory (fastest — within same page load)
  if (_memCache) return _memCache;

  // 2. sessionStorage (persists across soft navigations within tab)
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, buildings } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) {
        _memCache = buildings;
        return buildings;
      }
    }
  } catch (_) {
    // sessionStorage unavailable or parse error — just fetch fresh
  }

  // 3. Fetch from Overpass API
  const buildings = await fetchFromOverpass();
  _memCache = buildings;

  // Cache in sessionStorage (may fail if quota exceeded — that's fine)
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), buildings }));
  } catch (_) {
    // Silently ignore — the in-memory cache is still active
  }

  return buildings;
}

/**
 * Filter `allBuildings` to those within `radiusM` metres of (lat, lng).
 *
 * Uses a quick bounding-box pre-filter (cheap), then accepts buildings whose
 * ANY polygon vertex falls within the expanded bbox.  For shadow casting we
 * use 120 m by default — a 20 m building at 10° sun altitude casts a ~113 m
 * shadow, so this covers nearly all realistic cases in a city centre.
 */
export function getBuildingsNear(allBuildings, lat, lng, radiusM = 120) {
  const dLat = radiusM / 110540;
  const dLng = radiusM / (111320 * Math.cos(lat * Math.PI / 180));

  const minLat = lat - dLat, maxLat = lat + dLat;
  const minLng = lng - dLng, maxLng = lng + dLng;

  return allBuildings.filter(b =>
    b.polygon.some(p =>
      p.lat >= minLat && p.lat <= maxLat &&
      p.lng >= minLng && p.lng <= maxLng
    )
  );
}
