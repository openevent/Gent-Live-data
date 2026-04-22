// ═════════════════════════════════════════════════════════════════════════
// Curated venues — nightlife, gems, swim spots, food, restaurants
// All coordinates verified against OpenStreetMap / Google Maps
// ═════════════════════════════════════════════════════════════════════════

// ─── Nightlife (accuracy-checked) ───────────────────────────────────────
export const NIGHTLIFE = [
  {
    name: "Kompass Klub",
    kind: "Techno · industrial",
    vibe: "Warehouse scale, proper sound, goes till sunrise",
    area: "Dok-Noord",
    address: "Koopvaardijlaan 15, 9000 Gent",
    coords: { lat: 51.0646, lng: 3.7349 },
    url: "https://www.instagram.com/kompassklub/",
    web: "https://www.kompassklub.com",
    tag: "TECHNO",
    openTypically: "Fri–Sat from 23:00",
  },
  {
    name: "Decadance",
    kind: "House · disco",
    vibe: "Long-runner on the student strip, eclectic lineups",
    area: "Overpoortstraat",
    address: "Overpoortstraat 76, 9000 Gent",
    coords: { lat: 51.0428, lng: 3.7244 },
    url: "https://www.instagram.com/decadance_ghent/",
    web: "https://www.decadance.be",
    tag: "HOUSE",
    openTypically: "Thu–Sat",
  },
  {
    name: "Viernulvier (Vooruit)",
    kind: "Concerts · arts · café",
    vibe: "Historic venue, everything from jazz to noise",
    area: "Sint-Pietersnieuwstraat",
    address: "Sint-Pietersnieuwstraat 23, 9000 Gent",
    coords: { lat: 51.0440, lng: 3.7253 },
    url: "https://www.instagram.com/viernulvier/",
    web: "https://viernulvier.gent",
    tag: "LIVE",
    openTypically: "Daily, varied",
  },
  {
    name: "Charlatan",
    kind: "Rock · indie · DJs",
    vibe: "Small, sweaty, free entry most nights",
    area: "Vlasmarkt",
    address: "Vlasmarkt 6, 9000 Gent",
    coords: { lat: 51.0555, lng: 3.7283 },
    url: "https://www.instagram.com/charlatan_gent/",
    web: "https://www.charlatan.be",
    tag: "INDIE",
    openTypically: "Wed–Sat",
  },
  {
    name: "Democrazy",
    kind: "Concert booker",
    vibe: "They book the good shows — see what's playing where",
    area: "Various venues",
    address: "Various",
    coords: { lat: 51.0536, lng: 3.7250 }, // city centre fallback
    url: "https://www.instagram.com/democrazygent/",
    web: "https://democrazy.be",
    tag: "LIVE",
    openTypically: "Check schedule",
  },
  {
    name: "Kinky Star",
    kind: "Alt · punk · underground",
    vibe: "Cult spot, local bands + DJs",
    area: "Vlasmarkt",
    address: "Vlasmarkt 9, 9000 Gent",
    coords: { lat: 51.0554, lng: 3.7285 },
    url: "https://www.instagram.com/kinkystar_gent/",
    web: "https://www.kinkystar.com",
    tag: "UNDERGROUND",
    openTypically: "Wed–Sat",
  },
  {
    name: "Trefpunt",
    kind: "Folk · café · free shows",
    vibe: "At Bij Sint-Jacobs, always something on",
    area: "Bij Sint-Jacobs",
    address: "Bij Sint-Jacobs 18, 9000 Gent",
    coords: { lat: 51.0557, lng: 3.7301 },
    url: "https://www.instagram.com/trefpuntgent/",
    web: "https://trefpunt.be",
    tag: "LIVE",
    openTypically: "Most evenings",
  },
  {
    name: "Handelsbeurs",
    kind: "Concert hall",
    vibe: "Acoustic, jazz, world music in a beautiful 19th-c. hall",
    area: "Kouter",
    address: "Kouter 29, 9000 Gent",
    coords: { lat: 51.0506, lng: 3.7234 },
    url: "https://www.instagram.com/handelsbeursconcerts/",
    web: "https://www.handelsbeurs.be",
    tag: "LIVE",
    openTypically: "Ticketed shows",
  },
];

// ─── Hidden gems (curated, rotates daily) ──────────────────────────────
export const GEMS = [
  { name: "Patershol",                tagline: "Medieval lanes, tiny bistros, no tourist traps", coords: { lat: 51.0574, lng: 3.7220 }, tip: "Go at dusk — lanterns, no crowds." },
  { name: "Prinsenhof",               tagline: "Birthplace of Emperor Charles V, quiet square",  coords: { lat: 51.0593, lng: 3.7169 }, tip: "Look for the tortoise fountain." },
  { name: "Sint-Pietersabdij Garden", tagline: "Walled medieval garden + vineyard in the city",  coords: { lat: 51.0416, lng: 3.7275 }, tip: "Free entry, ruins + herbs + silence." },
  { name: "Werregarenstraat",         tagline: "Official graffiti alley, repainted constantly",  coords: { lat: 51.0531, lng: 3.7252 }, tip: "Never looks the same twice." },
  { name: "Portus Ganda",             tagline: "Marina where the Scheldt meets the Lys",         coords: { lat: 51.0568, lng: 3.7340 }, tip: "Swim here in summer — clean water." },
  { name: "Het Rasphuis",             tagline: "1600s prison, now STAM museum courtyard",        coords: { lat: 51.0422, lng: 3.7201 }, tip: "Sit in the courtyard, skip the entry." },
  { name: "Bijloke Site",             tagline: "13th-c. hospital, now music + art campus",       coords: { lat: 51.0457, lng: 3.7127 }, tip: "Free lunchtime concerts on Fridays." },
  { name: "Dulle Griet",              tagline: "15th-c. cannon on the Grasbrug",                 coords: { lat: 51.0556, lng: 3.7259 }, tip: "Easy photo stop with a weird backstory." },
  { name: "Groot Vleeshuis",          tagline: "1416 meat hall, now regional-product shop",      coords: { lat: 51.0565, lng: 3.7235 }, tip: "Hams hanging from the ceiling. Yes, taste them." },
  { name: "Campo Santo",              tagline: "Hilltop cemetery, cypress-lined, sweeping views", coords: { lat: 51.0649, lng: 3.7486 }, tip: "10 min tram, worth it at sunset." },
];

export function gemOfTheDay() {
  const dayIndex = Math.floor(Date.now() / 86400000) % GEMS.length;
  return GEMS[dayIndex];
}

// ─── Swim + water spots ─────────────────────────────────────────────────
export const WATER_SPOTS = [
  { name: "Blaarmeersen",   kind: "Lake · official swim zone",     status: "ok",   note: "Lifeguards · May–Sep", coords: { lat: 51.0396, lng: 3.6848 } },
  { name: "Portus Ganda",   kind: "Urban canal · designated swim", status: "ok",   note: "Open-air pool feel",   coords: { lat: 51.0568, lng: 3.7340 } },
  { name: "Houtdok",        kind: "Harbour dock · summer swim",    status: "warn", note: "Check for algae",      coords: { lat: 51.0680, lng: 3.7257 } },
  { name: "Watersportbaan", kind: "Rowing lake · no swim",         status: "info", note: "Rowing + SUP only",    coords: { lat: 51.0392, lng: 3.6928 } },
];

// ─── Restaurants worth knowing ──────────────────────────────────────────
export const EATS = [
  { name: "'t Klokhuys",            kind: "Flemish stew · lunch",     area: "Corduwaniersstraat", coords: { lat: 51.0578, lng: 3.7232 }, priceLevel: "€€"  },
  { name: "Balls & Glory",          kind: "Belgian meatballs, casual", area: "Jakobijnenstraat",   coords: { lat: 51.0549, lng: 3.7257 }, priceLevel: "€"    },
  { name: "Soup'R",                 kind: "Soup bar, quick + good",    area: "Sint-Niklaasstraat", coords: { lat: 51.0544, lng: 3.7228 }, priceLevel: "€"    },
  { name: "Publiek",                kind: "Michelin-star modern",      area: "Ham",                coords: { lat: 51.0502, lng: 3.7364 }, priceLevel: "€€€€" },
  { name: "Pakhuis",                kind: "Brasserie in former warehouse", area: "Schuurkenstraat", coords: { lat: 51.0543, lng: 3.7200 }, priceLevel: "€€€" },
  { name: "Bar Bask",               kind: "Basque small plates",       area: "Vrijdagmarkt",       coords: { lat: 51.0567, lng: 3.7276 }, priceLevel: "€€€"  },
  { name: "Café Labath",            kind: "Third-wave coffee",         area: "Oude Houtlei",       coords: { lat: 51.0525, lng: 3.7186 }, priceLevel: "€"    },
  { name: "Mokabon",                kind: "Old-school coffee roaster", area: "Donkersteeg",        coords: { lat: 51.0541, lng: 3.7231 }, priceLevel: "€"    },
];

// ─── Transit ───────────────────────────────────────────────────────────
export const TRANSIT_STOPS = [
  { name: "Korenmarkt",          lines: ["1", "2", "4"],       kind: "tram",     coords: { lat: 51.0541, lng: 3.7214 } },
  { name: "Gent Zuid",           lines: ["1", "2", "4", "42"], kind: "tram+bus", coords: { lat: 51.0484, lng: 3.7266 } },
  { name: "Sint-Pietersstation", lines: ["1", "4"],            kind: "tram",     coords: { lat: 51.0363, lng: 3.7106 } },
  { name: "Gravensteen",         lines: ["3"],                 kind: "tram",     coords: { lat: 51.0575, lng: 3.7201 } },
  { name: "Dampoort",            lines: ["3", "17", "18"],     kind: "tram+bus", coords: { lat: 51.0597, lng: 3.7435 } },
  { name: "Rabot",               lines: ["1"],                 kind: "tram",     coords: { lat: 51.0610, lng: 3.7149 } },
];

// ─── Waste (IVAGO by district) ──────────────────────────────────────────
export const WASTE_DISTRICTS = [
  { district: "Binnenstad",      gft: "Mon", pmd: "Wed", rest: "Fri" },
  { district: "Ledeberg",        gft: "Tue", pmd: "Thu", rest: "Mon" },
  { district: "Gentbrugge",      gft: "Wed", pmd: "Fri", rest: "Tue" },
  { district: "Sint-Amandsberg", gft: "Thu", pmd: "Mon", rest: "Wed" },
  { district: "Muide",           gft: "Fri", pmd: "Tue", rest: "Thu" },
  { district: "Brugse Poort",    gft: "Mon", pmd: "Thu", rest: "Sat" },
  { district: "Rabot",           gft: "Tue", pmd: "Fri", rest: "Mon" },
  { district: "Watersportbaan",  gft: "Wed", pmd: "Mon", rest: "Thu" },
];

export function nextWasteDay(dayName) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const target = days.indexOf(dayName);
  if (target < 0) return "—";
  let diff = target - today;
  if (diff < 0) diff += 7;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

// ─── Tourist routes (for /visiting) ─────────────────────────────────────
export const TOURIST_ROUTES = {
  oneDay: {
    title: "One day in Ghent",
    tagline: "The classic route if you only have a few hours",
    duration: "6–8 hours",
    stops: [
      { time: "09:30", name: "Sint-Baafskathedraal",  note: "See the Ghent Altarpiece early, before the queue", coords: { lat: 51.0533, lng: 3.7267 } },
      { time: "11:00", name: "Belfry + Cloth Hall",    note: "Climb for the skyline",                             coords: { lat: 51.0536, lng: 3.7254 } },
      { time: "12:30", name: "Graslei + Korenlei",     note: "Canal-side lunch — Korenmarkt or 't Oud Clooster",  coords: { lat: 51.0551, lng: 3.7207 } },
      { time: "14:30", name: "Gravensteen Castle",     note: "Skip the audio tour, walk the ramparts",            coords: { lat: 51.0575, lng: 3.7201 } },
      { time: "16:00", name: "Patershol",              note: "Wander the medieval quarter",                        coords: { lat: 51.0574, lng: 3.7220 } },
      { time: "17:30", name: "Werregarenstraat",       note: "Graffiti alley — camera ready",                      coords: { lat: 51.0531, lng: 3.7252 } },
      { time: "19:00", name: "Vrijdagmarkt",           note: "Drinks at Dulle Griet or 't Galgenhuisje",           coords: { lat: 51.0568, lng: 3.7279 } },
    ],
  },
  twoDay: {
    title: "Two days in Ghent",
    tagline: "Do the classics on day one, go deeper on day two",
    duration: "2 days",
    day1: "Same as 'One day' route above",
    day2Stops: [
      { time: "10:00", name: "STAM Museum",             note: "City history, genuinely good",                    coords: { lat: 51.0422, lng: 3.7201 } },
      { time: "11:30", name: "Bijloke Site",            note: "Free entry to the cloister + gardens",             coords: { lat: 51.0457, lng: 3.7127 } },
      { time: "13:00", name: "Sint-Pietersabdij",       note: "Abbey gardens + vineyard + lunch",                 coords: { lat: 51.0416, lng: 3.7275 } },
      { time: "15:00", name: "Citadelpark + S.M.A.K.",  note: "Modern art, garden, a breather",                   coords: { lat: 51.0397, lng: 3.7243 } },
      { time: "17:00", name: "Portus Ganda",            note: "Marina walk, swim in summer",                      coords: { lat: 51.0568, lng: 3.7340 } },
      { time: "18:30", name: "Dok-Noord",               note: "Ex-industrial quarter, craft beer, street food",    coords: { lat: 51.0646, lng: 3.7349 } },
      { time: "21:00", name: "Nightcap: Vooruit café",  note: "Historic, always something on",                    coords: { lat: 51.0440, lng: 3.7253 } },
    ],
  },
};
