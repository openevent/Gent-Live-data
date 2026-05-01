// ═══════════════════════════════════════════════════════════════════════
// sun-shadow.js  –  Solar position + building-shadow intersection math
//
// No external dependencies: the solar-position algorithm is embedded here
// (same equations as the suncalc library by Vladimir Agafonkin, MIT).
// ═══════════════════════════════════════════════════════════════════════

// ── Solar position ───────────────────────────────────────────────────────
// Returns { azimuth, altitude } in radians.
//   azimuth  : angle from south toward west (SunCalc convention)
//              0 = south, π/2 = west, π = north, −π/2 = east
//   altitude : angle above horizon; negative means below horizon (night)

export function getSolarPosition(date, lat, lng) {
  const rad = Math.PI / 180;
  const J1970 = 2440588, J2000 = 2451545;
  const toJulian = d => d.valueOf() / 86400000 - 0.5 + J1970;
  const toDays   = d => toJulian(d) - J2000;

  const e = rad * 23.4397; // Earth's axial tilt

  const rightAscension = (l, b) =>
    Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const declination = (l, b) =>
    Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const azimuth = (H, phi, dec) =>
    Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const altitude = (H, phi, dec) =>
    Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const siderealTime = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const eclipticLong = M => {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
  };

  const d   = toDays(date);
  const lw  = rad * -lng;
  const phi = rad * lat;
  const M   = rad * (357.5291 + 0.98560028 * d);
  const L   = eclipticLong(M);
  const dec = declination(L, 0);
  const ra  = rightAscension(L, 0);
  const H   = siderealTime(d, lw) - ra;

  return {
    azimuth:  azimuth(H, phi, dec),
    altitude: altitude(H, phi, dec),
  };
}

// ── Local coordinate system ──────────────────────────────────────────────
// Converts a lat/lng to metres offset from a reference point.
//   x = east (metres), y = north (metres)

function toLocal(lat, lng, refLat, refLng) {
  return {
    x: (lng - refLng) * 111320 * Math.cos(refLat * Math.PI / 180),
    y: (lat - refLat) * 110540,
  };
}

// ── Ray–segment intersection ─────────────────────────────────────────────
// Ray from origin (0,0) in direction (dx, dy).
// Segment from (ax, ay) to (bx, by).
// Returns positive distance t along the ray, or null if no intersection.

function raySegmentDist(dx, dy, ax, ay, bx, by) {
  const cx = bx - ax, cy = by - ay;
  const denom = dy * cx - dx * cy;
  if (Math.abs(denom) < 1e-10) return null; // parallel
  const t = (ay * cx - ax * cy) / denom;
  const s = (ay * dx - ax * dy) / denom;
  if (t > 1e-4 && s >= -1e-6 && s <= 1 + 1e-6) return t;
  return null;
}

// ── Does a single building block the sun? ────────────────────────────────
// building: { polygon: [{lat, lng}], height: number }

function buildingBlocksSun(building, refLat, refLng, sunAzimuth, sunAltitude) {
  if (sunAltitude <= 0.01) return false; // sun too low / below horizon

  const tanAlt = Math.tan(sunAltitude);
  if (tanAlt <= 0) return false;

  // Ray direction from terrace TOWARD the sun.
  // SunCalc azimuth: 0 = south, measures toward west.
  // Compass bearing from N (clockwise): azimuth + π
  // In local coords (x = east, y = north):
  //   dx = sin(bearing), dy = cos(bearing)
  const bearing = sunAzimuth + Math.PI;
  const dx = Math.sin(bearing);
  const dy = Math.cos(bearing);

  const poly = building.polygon;
  let minDist = Infinity;

  for (let i = 0; i < poly.length; i++) {
    const a = toLocal(poly[i].lat, poly[i].lng, refLat, refLng);
    const b = toLocal(poly[(i + 1) % poly.length].lat, poly[(i + 1) % poly.length].lng, refLat, refLng);
    const d = raySegmentDist(dx, dy, a.x, a.y, b.x, b.y);
    if (d !== null && d < minDist) minDist = d;
  }

  if (!isFinite(minDist)) return false; // ray misses this building

  // The building casts a shadow of length = height / tan(altitude).
  // If that shadow length ≥ distance from terrace to building → terrace is in shadow.
  return building.height / tanAlt >= minDist;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Returns true if the terrace is in shadow (or night) at `date`.
 * `buildings` should be pre-filtered to nearby buildings only.
 */
export function isTerraceInShadow(terrace, buildings, date = new Date()) {
  const pos = getSolarPosition(date, terrace.coords.lat, terrace.coords.lng);
  if (pos.altitude <= 0) return true; // sun below horizon

  for (const b of buildings) {
    if (buildingBlocksSun(b, terrace.coords.lat, terrace.coords.lng, pos.azimuth, pos.altitude)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the first future time the terrace enters shadow (steps of 5 min).
 * Returns null if it stays sunny for the next `maxHours`.
 */
export function getSunUntil(terrace, buildings, now = new Date(), maxHours = 8) {
  const stepMs = 5 * 60 * 1000;
  const maxMs  = maxHours * 60 * 60 * 1000;
  for (let dt = stepMs; dt <= maxMs; dt += stepMs) {
    const t = new Date(now.getTime() + dt);
    if (isTerraceInShadow(terrace, buildings, t)) return t;
  }
  return null;
}

/**
 * Returns the first future time the terrace comes into sun (steps of 5 min).
 * Returns null if it stays in shadow for the next `maxHours`.
 */
export function getNextSun(terrace, buildings, now = new Date(), maxHours = 8) {
  const stepMs = 5 * 60 * 1000;
  const maxMs  = maxHours * 60 * 60 * 1000;
  for (let dt = stepMs; dt <= maxMs; dt += stepMs) {
    const t = new Date(now.getTime() + dt);
    if (!isTerraceInShadow(terrace, buildings, t)) return t;
  }
  return null;
}
