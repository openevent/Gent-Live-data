// ═════════════════════════════════════════════════════════════════════════
// Data helpers for weather, Flemish quips, tourist gems, transit stops
// ═════════════════════════════════════════════════════════════════════════

// ── Open-Meteo: free, no API key, CORS-enabled ──────────────────────────
// Ghent center: 51.0536, 3.7250
export async function fetchWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=51.0536&longitude=3.7250" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation" +
    "&hourly=precipitation_probability,temperature_2m" +
    "&forecast_days=1" +
    "&timezone=Europe%2FBrussels";
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather");
  const d = await r.json();
  return {
    temp: Math.round(d.current?.temperature_2m ?? 0),
    feels: Math.round(d.current?.apparent_temperature ?? 0),
    humidity: Math.round(d.current?.relative_humidity_2m ?? 0),
    code: d.current?.weather_code ?? 0,
    wind: Math.round(d.current?.wind_speed_10m ?? 0),
    precip: d.current?.precipitation ?? 0,
    rainChance: Math.max(
      ...(d.hourly?.precipitation_probability?.slice(0, 6) ?? [0])
    ),
    hourlyTemp: d.hourly?.temperature_2m?.slice(0, 12) ?? [],
  };
}

// ── WMO weather codes → text + icon name ────────────────────────────────
export function describeWeather(code) {
  if (code === 0)            return { label: "Clear",          icon: "sun" };
  if (code <= 2)             return { label: "Partly cloudy",  icon: "cloud-sun" };
  if (code === 3)            return { label: "Overcast",       icon: "cloud" };
  if (code >= 45 && code <= 48) return { label: "Foggy",       icon: "cloud-fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle",     icon: "cloud-drizzle" };
  if (code >= 61 && code <= 67) return { label: "Rain",        icon: "cloud-rain" };
  if (code >= 71 && code <= 77) return { label: "Snow",        icon: "cloud-snow" };
  if (code >= 80 && code <= 82) return { label: "Showers",     icon: "cloud-rain" };
  if (code >= 85 && code <= 86) return { label: "Snow showers",icon: "cloud-snow" };
  if (code >= 95)            return { label: "Thunderstorm",   icon: "cloud-lightning" };
  return { label: "Weather", icon: "cloud" };
}

// ── Tourist "gems of the day" — curated lesser-known Ghent spots ───────
// Rotates daily; these are real places tourists usually miss
export const GHENT_GEMS = [
  {
    name: "Patershol",
    tagline: "Medieval cobbles, tiny bistros, zero tourist traps",
    coords: { lat: 51.0574, lng: 3.7220 },
    tip: "Go at dusk — lanterns, no crowds.",
  },
  {
    name: "Prinsenhof",
    tagline: "Birthplace of Emperor Charles V, quiet today",
    coords: { lat: 51.0593, lng: 3.7169 },
    tip: "Look for the tortoise fountain.",
  },
  {
    name: "Sint-Pietersabdij Gardens",
    tagline: "Walled medieval garden + vineyard in the city",
    coords: { lat: 51.0416, lng: 3.7275 },
    tip: "Free entry, ruins + herbs + silence.",
  },
  {
    name: "Werregarenstraat (Graffiti Street)",
    tagline: "Official street-art alley, repainted constantly",
    coords: { lat: 51.0531, lng: 3.7252 },
    tip: "Never looks the same twice.",
  },
  {
    name: "Portus Ganda",
    tagline: "Marina where the Scheldt meets the Lys",
    coords: { lat: 51.0568, lng: 3.7340 },
    tip: "Swim here in summer — clean water.",
  },
  {
    name: "Het Rasphuis (STAM courtyard)",
    tagline: "1600s prison turned city museum courtyard",
    coords: { lat: 51.0422, lng: 3.7201 },
    tip: "Skip the museum, sit in the courtyard.",
  },
  {
    name: "Bijloke Site",
    tagline: "13th-c. hospital, now music + art campus",
    coords: { lat: 51.0457, lng: 3.7127 },
    tip: "Free lunchtime concerts on Fridays.",
  },
];

export function gemOfTheDay() {
  const dayIndex = Math.floor(Date.now() / 86400000) % GHENT_GEMS.length;
  return GHENT_GEMS[dayIndex];
}

// ── Water quality / swim spots ──────────────────────────────────────────
// Curated list of Ghent's known swim + water-monitored locations
export const WATER_SPOTS = [
  { name: "Blaarmeersen",   kind: "Lake · official swim zone",       status: "ok",   note: "Lifeguards · May–Sep",             coords: { lat: 51.0396, lng: 3.6848 } },
  { name: "Portus Ganda",   kind: "Urban canal · designated swim",   status: "ok",   note: "Open-air pool feel",                coords: { lat: 51.0568, lng: 3.7340 } },
  { name: "Houtdok",        kind: "Harbour dock · summer swim",      status: "warn", note: "Check before — algae possible",     coords: { lat: 51.0680, lng: 3.7257 } },
  { name: "Watersportbaan", kind: "Rowing lake · no swimming",       status: "info", note: "Rowing + SUP only",                 coords: { lat: 51.0392, lng: 3.6928 } },
];

// ── De Lijn tram/bus stops near Ghent centre ────────────────────────────
// Static list — full realtime requires De Lijn API key
export const TRANSIT_STOPS = [
  { name: "Korenmarkt",       lines: ["1", "2", "4"],      kind: "tram" },
  { name: "Gent Zuid",        lines: ["1", "2", "4", "42"], kind: "tram+bus" },
  { name: "Sint-Pietersstation", lines: ["1", "4"],         kind: "tram" },
  { name: "Gravensteen",      lines: ["3"],                 kind: "tram" },
  { name: "Dampoort",         lines: ["3", "17", "18"],     kind: "tram+bus" },
  { name: "Rabot",            lines: ["1"],                 kind: "tram" },
];

// ── Nightlife venues — curated Ghent club + music scene ─────────────────
// Real venues, real links. Click goes to wherever their lineup lives
// (Instagram is most reliable — they update it first).
export const NIGHTLIFE_VENUES = [
  {
    name: "Kompass Klub",
    kind: "Techno · industrial",
    vibe: "Warehouse, proper sound system, up to sunrise",
    area: "Dok-Noord",
    url: "https://www.instagram.com/kompassklub/",
    web: "https://www.kompassklub.com",
    tag: "TECHNO",
  },
  {
    name: "Decadance",
    kind: "House · disco",
    vibe: "Long-runner, eclectic, Friday residents",
    area: "Overpoortstraat",
    url: "https://www.instagram.com/decadance_ghent/",
    web: "https://www.decadance.be",
    tag: "HOUSE",
  },
  {
    name: "De Vooruit",
    kind: "Concerts · art · café",
    vibe: "Socialist-era palace, everything from jazz to noise",
    area: "Sint-Pietersnieuwstraat",
    url: "https://www.instagram.com/viernulvier/",
    web: "https://viernulvier.gent",
    tag: "LIVE",
  },
  {
    name: "Charlatan",
    kind: "Rock · indie · DJs",
    vibe: "Small, sweaty, free entry most nights",
    area: "Vlasmarkt",
    url: "https://www.instagram.com/charlatan_gent/",
    web: "https://www.charlatan.be",
    tag: "INDIE",
  },
  {
    name: "Democrazy",
    kind: "Booker · concerts citywide",
    vibe: "They book the good ones — check who's playing where",
    area: "Various venues",
    url: "https://www.instagram.com/democrazygent/",
    web: "https://democrazy.be",
    tag: "LIVE",
  },
  {
    name: "Kinky Star",
    kind: "Alt · punk · underground",
    vibe: "Cult spot near Vrijdagmarkt, local bands + DJs",
    area: "Vlasmarkt",
    url: "https://www.instagram.com/kinkystar_gent/",
    web: "https://www.kinkystar.com",
    tag: "UNDERGROUND",
  },
  {
    name: "Trefpunt",
    kind: "Folk · café · free shows",
    vibe: "At the Bij Sint-Jacobs — always something on",
    area: "Bij Sint-Jacobs",
    url: "https://www.instagram.com/trefpuntgent/",
    web: "https://trefpunt.be",
    tag: "LIVE",
  },
];
