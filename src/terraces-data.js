// ═════════════════════════════════════════════════════════════════════════
// Ghent terraces — curated list for terrace sun calculator
// ═════════════════════════════════════════════════════════════════════════
//
// Each entry includes:
//   coords       — lat/lng of the terrace location
//   facing       — compass direction the terrace faces (N/NE/E/SE/S/SW/W/NW)
//                  (the direction SEATING opens toward — i.e. where the sun
//                  comes FROM to hit the terrace)
//   obstructions — height in meters of buildings that could shade the terrace
//                  at different sun azimuths (rough estimate, not surveyed)
//   sunWindow    — typical local-sun hours as [startHour, endHour] (24h)
//                  pre-computed for this location; overrides azimuth math
//                  when present (more reliable than pure geometry)
//   type         — café | bar | restaurant | brasserie
//   priceLevel   — €, €€, €€€
//   area         — neighbourhood name
//
// Orientations and sun windows are approximated from:
// - Street axis + building layout (Ghent's old center runs roughly NW-SE)
// - Known public photos showing the terrace
// - General knowledge of the venue
// These are STARTING POINTS, not surveyed truth. Corrections welcome.

export const TERRACES = [
  // ─── Graslei & Korenlei (canal, west-facing = afternoon/evening sun) ──
  {
    name: "Het Galgenhuisje", area: "Groentenmarkt", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0551, lng: 3.7229 }, facing: "W",
    sunWindow: [13, 20], vibe: "Tiny, historic — claims to be Ghent's oldest pub",
    mapsQuery: "Het Galgenhuisje Gent",
  },
  {
    name: "Café Labath", area: "Oude Houtlei", type: "café", priceLevel: "€",
    coords: { lat: 51.0525, lng: 3.7186 }, facing: "S",
    sunWindow: [10, 16], vibe: "Third-wave coffee, courtyard seating",
    mapsQuery: "Café Labath Gent",
  },
  {
    name: "Tempus", area: "Graslei", type: "brasserie", priceLevel: "€€€",
    coords: { lat: 51.0552, lng: 3.7210 }, facing: "W",
    sunWindow: [14, 21], vibe: "Canal-side, priciest terrace in town",
    mapsQuery: "Tempus Gent Graslei",
  },
  {
    name: "'t Dreupelkot", area: "Groentenmarkt", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0555, lng: 3.7223 }, facing: "W",
    sunWindow: [13, 19], vibe: "Genever bar — 200+ varieties, tiny street-side",
    mapsQuery: "'t Dreupelkot Gent",
  },

  // ─── Vrijdagmarkt (huge square, multi-facing) ──────────────────────────
  {
    name: "Dulle Griet", area: "Vrijdagmarkt", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0568, lng: 3.7275 }, facing: "SW",
    sunWindow: [12, 19], vibe: "Kwak glasses, hostage your shoe",
    mapsQuery: "Dulle Griet Gent",
  },
  {
    name: "Bar Bask", area: "Vrijdagmarkt", type: "restaurant", priceLevel: "€€€",
    coords: { lat: 51.0567, lng: 3.7276 }, facing: "SW",
    sunWindow: [12, 19], vibe: "Basque small plates, great for aperitivo",
    mapsQuery: "Bar Bask Vrijdagmarkt Gent",
  },
  {
    name: "De Foyer", area: "Vrijdagmarkt", type: "brasserie", priceLevel: "€€",
    coords: { lat: 51.0565, lng: 3.7281 }, facing: "W",
    sunWindow: [13, 19], vibe: "Old-school brasserie, reliable lunch",
    mapsQuery: "De Foyer Vrijdagmarkt Gent",
  },

  // ─── Korenmarkt / Sint-Niklaaskerk area ───────────────────────────────
  {
    name: "Mokabon", area: "Donkersteeg", type: "café", priceLevel: "€",
    coords: { lat: 51.0541, lng: 3.7231 }, facing: "E",
    sunWindow: [8, 13], vibe: "Classic Gentse coffee roaster, morning spot",
    mapsQuery: "Mokabon Gent",
  },
  {
    name: "Groot Vleeshuis", area: "Groentenmarkt", type: "café", priceLevel: "€€",
    coords: { lat: 51.0565, lng: 3.7235 }, facing: "S",
    sunWindow: [11, 17], vibe: "Hams hanging from ceiling, Flemish products",
    mapsQuery: "Groot Vleeshuis Gent",
  },

  // ─── Kouter / Sint-Pietersplein ───────────────────────────────────────
  {
    name: "Café Parti", area: "Kouter", type: "café", priceLevel: "€€",
    coords: { lat: 51.0506, lng: 3.7232 }, facing: "S",
    sunWindow: [10, 18], vibe: "Big terrace on the flower market square",
    mapsQuery: "Café Parti Kouter Gent",
  },
  {
    name: "De Karper", area: "Kouter", type: "brasserie", priceLevel: "€€",
    coords: { lat: 51.0509, lng: 3.7237 }, facing: "S",
    sunWindow: [10, 17], vibe: "Square-side brasserie, classic",
    mapsQuery: "De Karper Kouter Gent",
  },
  {
    name: "Simon Says", area: "Sluizeken", type: "café", priceLevel: "€€",
    coords: { lat: 51.0592, lng: 3.7241 }, facing: "SE",
    sunWindow: [9, 14], vibe: "Breakfast, B&B, morning sun",
    mapsQuery: "Simon Says Gent",
  },
  {
    name: "De Brouwzaele", area: "Sint-Pietersplein", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0435, lng: 3.7264 }, facing: "W",
    sunWindow: [14, 20], vibe: "Square-side, evening-sun winner",
    mapsQuery: "De Brouwzaele Gent",
  },

  // ─── Patershol (medieval quarter) ─────────────────────────────────────
  {
    name: "Het Rosenhof", area: "Patershol", type: "restaurant", priceLevel: "€€€",
    coords: { lat: 51.0573, lng: 3.7225 }, facing: "SW",
    sunWindow: [12, 19], vibe: "Romantic courtyard, reservations",
    mapsQuery: "Rosenhof Patershol Gent",
  },
  {
    name: "'t Klokhuys", area: "Corduwaniersstraat", type: "restaurant", priceLevel: "€€",
    coords: { lat: 51.0578, lng: 3.7232 }, facing: "S",
    sunWindow: [12, 18], vibe: "Flemish stew lunches, street terrace",
    mapsQuery: "t Klokhuys Gent",
  },
  {
    name: "De Drie Biggetjes", area: "Patershol", type: "restaurant", priceLevel: "€€€",
    coords: { lat: 51.0576, lng: 3.7219 }, facing: "SE",
    sunWindow: [11, 15], vibe: "Picture-perfect cobbled terrace",
    mapsQuery: "De Drie Biggetjes Gent",
  },

  // ─── Gravensteen / Sint-Veerleplein ───────────────────────────────────
  {
    name: "Het Waterhuis aan de Bierkant", area: "Groentenmarkt", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0557, lng: 3.7241 }, facing: "S",
    sunWindow: [11, 18], vibe: "200+ beers, canal view, tourist-heavy",
    mapsQuery: "Het Waterhuis aan de Bierkant Gent",
  },
  {
    // De Planck — real bar at Sint-Veerleplein with castle views
    name: "De Planck", area: "Sint-Veerleplein", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0576, lng: 3.7207 }, facing: "E",
    sunWindow: [9, 14], vibe: "Castle-side terrace, morning sun, local crowd",
    mapsQuery: "De Planck Sint-Veerleplein Gent",
  },

  // ─── Sint-Jacobs / Bij Sint-Jacobs ────────────────────────────────────
  {
    name: "Trefpunt", area: "Bij Sint-Jacobs", type: "café", priceLevel: "€",
    coords: { lat: 51.0557, lng: 3.7301 }, facing: "S",
    sunWindow: [11, 18], vibe: "Folk music café, always something on",
    mapsQuery: "Trefpunt Gent",
  },
  {
    name: "'t Velootje", area: "Kalversteeg", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0582, lng: 3.7230 }, facing: "SW",
    sunWindow: [13, 19], vibe: "Bicycle-themed, eccentric, small terrace",
    mapsQuery: "Velootje Gent",
  },

  // ─── Portus Ganda / Lousbergskaai ─────────────────────────────────────
  {
    name: "Café Rosa", area: "Portus Ganda", type: "café", priceLevel: "€€",
    coords: { lat: 51.0571, lng: 3.7336 }, facing: "W",
    sunWindow: [13, 20], vibe: "Marina view, evening crowd",
    mapsQuery: "Café Rosa Portus Ganda Gent",
  },
  {
    name: "Bar Babeth", area: "Portus Ganda", type: "bar", priceLevel: "€€",
    coords: { lat: 51.0564, lng: 3.7348 }, facing: "W",
    sunWindow: [14, 20], vibe: "Summer-only-ish, waterside",
    mapsQuery: "Bar Babeth Gent",
  },

  // ─── Dok-Noord / industrial quarter ────────────────────────────────────
  {
    name: "Bar Bidon", area: "Dok-Noord", type: "bar", priceLevel: "€",
    coords: { lat: 51.0680, lng: 3.7307 }, facing: "SW",
    sunWindow: [12, 19], vibe: "Converted warehouse, craft beer, food trucks",
    mapsQuery: "Bar Bidon Dok-Noord Gent",
  },
  {
    name: "Café Le Baron", area: "Dok-Noord", type: "café", priceLevel: "€€",
    coords: { lat: 51.0671, lng: 3.7321 }, facing: "S",
    sunWindow: [11, 18], vibe: "Terrace by the water basin",
    mapsQuery: "Le Baron Dok Gent",
  },

  // ─── Overpoort (student quarter) ───────────────────────────────────────
  {
    name: "Café Kastart", area: "Overpoortstraat", type: "bar", priceLevel: "€",
    coords: { lat: 51.0429, lng: 3.7246 }, facing: "W",
    sunWindow: [14, 20], vibe: "Student hangout, sunny afternoon scene",
    mapsQuery: "Café Kastart Overpoort Gent",
  },
  {
    name: "De Loge", area: "Overpoortstraat", type: "bar", priceLevel: "€",
    coords: { lat: 51.0427, lng: 3.7247 }, facing: "E",
    sunWindow: [8, 13], vibe: "Morning sun, study-spot tables",
    mapsQuery: "De Loge Overpoort Gent",
  },

  // ─── Citadelpark / S.M.A.K. ────────────────────────────────────────────
  {
    name: "Café Museum (S.M.A.K.)", area: "Citadelpark", type: "café", priceLevel: "€€",
    coords: { lat: 51.0397, lng: 3.7243 }, facing: "SE",
    sunWindow: [9, 15], vibe: "Modern art museum café, park views",
    mapsQuery: "SMAK Café Gent",
  },

  // ─── Blaarmeersen ──────────────────────────────────────────────────────
  {
    name: "Strandcafé Blaarmeersen", area: "Blaarmeersen", type: "café", priceLevel: "€€",
    coords: { lat: 51.0390, lng: 3.6854 }, facing: "S",
    sunWindow: [10, 19], vibe: "Lake terrace, open water-facing",
    mapsQuery: "Strandcafé Blaarmeersen Gent",
  },

  // ─── Ham / Kramersplein ────────────────────────────────────────────────
  {
    name: "Ferment", area: "Ham", type: "restaurant", priceLevel: "€€€",
    coords: { lat: 51.0503, lng: 3.7362 }, facing: "SW",
    sunWindow: [13, 19], vibe: "Natural wine bar, small terrace",
    mapsQuery: "Ferment Ham Gent",
  },

  // ─── Prinsenhof / Rabot ────────────────────────────────────────────────
  {
    // Café Vlissinghe — oldest brown café in Belgium (1515), famous back garden
    name: "Café Vlissinghe", area: "Blekerijstraat", type: "café", priceLevel: "€€",
    coords: { lat: 51.0608, lng: 3.7271 }, facing: "SE",
    sunWindow: [10, 15], vibe: "Belgium's oldest café, huge walled garden out back",
    mapsQuery: "Café Vlissinghe Gent Blekerijstraat",
  },
  {
    // Brasserie Pakhuis — converted warehouse, large terrace on Schuurkenstraat
    name: "Brasserie Pakhuis", area: "Schuurkenstraat", type: "brasserie", priceLevel: "€€€",
    coords: { lat: 51.0538, lng: 3.7238 }, facing: "S",
    sunWindow: [11, 17], vibe: "Stunning iron-and-glass interior, terrace spills onto street",
    mapsQuery: "Brasserie Pakhuis Gent Schuurkenstraat",
  },
  {
    // Café Vooruit — iconic arts centre with large south-facing terrace
    name: "Café Vooruit", area: "Sint-Pietersnieuwstraat", type: "café", priceLevel: "€",
    coords: { lat: 51.0438, lng: 3.7252 }, facing: "S",
    sunWindow: [11, 18], vibe: "Art-deco monument, student crowd, big terrace",
    mapsQuery: "Café Vooruit Sint-Pietersnieuwstraat Gent",
  },
];

// ─── Sun-state computation ─────────────────────────────────────────────
// Uses the sunWindow [start, end] as the primary signal.
// If we're inside the window: "in sun now"
// Before: "sun in X hours"
// After: "shaded now" (or "morning-sun terrace" as context)
// Weather modifier: if it's overcast/rainy/cold, we downgrade everything.

export function terraceStatus(terrace, weather, now = new Date()) {
  // Always compute local Ghent time regardless of the user's browser timezone.
  // Without this, visitors from other time zones see wrong terrace status.
  const gentFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = gentFormatter.formatToParts(now);
  const hPart = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const mPart = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const hour = hPart + mPart / 60;
  const [start, end] = terrace.sunWindow;

  // Weather gating: if clouds or rain, no point talking about sun
  const overcast = weather.code >= 3 && weather.code <= 3;       // fully overcast
  const raining  = weather.code >= 51;                            // drizzle, rain, thunderstorm
  const cold     = weather.temp < 10;                             // too cold for terraces
  const night    = !weather.isDay;

  if (raining) return { key: "rain",   label: "Too wet",       detail: "Rain. Maybe later.",          order: 5 };
  if (cold)    return { key: "cold",   label: "Too cold",      detail: `${weather.temp}°, inside is kinder.`, order: 4 };
  if (night)   return { key: "night",  label: "After dark",    detail: "No sun anywhere right now.",   order: 3 };

  if (hour >= start && hour <= end) {
    if (overcast) return { key: "grey", label: "Cloudy", detail: "Would be sunny but clouds today.", order: 2 };
    return { key: "sun", label: "In sun now", detail: `Sunny until ~${Math.floor(end)}:${String(Math.round((end % 1) * 60)).padStart(2, "0")}`, order: 0 };
  }

  if (hour < start) {
    const wait = start - hour;
    if (wait < 1) return { key: "soon", label: "Sun in <1h", detail: `Warms up around ${Math.floor(start)}:00`, order: 1 };
    if (wait < 3) return { key: "soon", label: `Sun in ${Math.ceil(wait)}h`, detail: `From ~${Math.floor(start)}:00`, order: 1 };
    return { key: "later", label: "Later today", detail: `Sun from ${Math.floor(start)}:00`, order: 2 };
  }

  // hour > end
  return { key: "done", label: "Sun's gone", detail: `Sunny earlier until ${Math.floor(end)}:00`, order: 3 };
}
