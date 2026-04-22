import React, { useState } from "react";
import {
  Car, Wind, Train, Waves, Trash2, Sun, Cloud, CloudRain, CloudDrizzle,
  CloudSnow, CloudLightning, CloudFog, ArrowUpRight, MapPin, CircleAlert,
  CircleCheck, Droplets,
} from "lucide-react";
import {
  useData, describeWeather, weatherQuip, occStatus, airStatus, STATUS,
} from "../data/api.js";
import {
  TRANSIT_STOPS, WATER_SPOTS, WASTE_DISTRICTS, nextWasteDay,
} from "../data/venues.js";
import MiniMap from "../components/MiniMap.jsx";

const weatherIcon = (iconName, size = 22) => {
  const p = { size, strokeWidth: 1.5, "aria-hidden": true };
  switch (iconName) {
    case "sun":             return <Sun {...p} />;
    case "cloud-sun":       return <Sun {...p} />;
    case "cloud-rain":      return <CloudRain {...p} />;
    case "cloud-drizzle":   return <CloudDrizzle {...p} />;
    case "cloud-snow":      return <CloudSnow {...p} />;
    case "cloud-lightning": return <CloudLightning {...p} />;
    case "cloud-fog":       return <CloudFog {...p} />;
    default:                return <Cloud {...p} />;
  }
};

export default function Today() {
  const { parking, air, weather } = useData();
  const [wasteDistrict, setWasteDistrict] = useState("Binnenstad");

  const totalSpaces = parking.reduce((a, p) => a + p.total, 0);
  const freeSpaces  = parking.reduce((a, p) => a + p.free, 0);
  const cityOcc     = totalSpaces ? Math.round(((totalSpaces - freeSpaces) / totalSpaces) * 100) : 0;
  const avgNo2 = air.length ? Math.round(air.reduce((a, s) => a + s.no2, 0) / air.length) : 0;

  const wxDesc = describeWeather(weather.code);
  const quip = weatherQuip(weather);
  const waste = WASTE_DISTRICTS.find((d) => d.district === wasteDistrict) || WASTE_DISTRICTS[0];

  const emptiest = [...parking].sort((a, b) => a.occupation - b.occupation)[0];

  return (
    <main className="page">
      <header className="page__header">
        <div className="page__kicker">LOCALS · TODAY</div>
        <h1 className="page__title">Gent, today.</h1>
        <p className="page__sub">{quip} · city is {cityOcc < 60 ? "moving freely" : cityOcc < 85 ? "moderately busy" : "packed"}</p>
      </header>

      {/* Weather block */}
      <section className="panel">
        <header className="panel__head">
          <div>
            <span className="panel__kicker">Weather</span>
            <h2 className="panel__title">{wxDesc.label} · {weather.temp}°C</h2>
          </div>
          <div className="panel__icon">{weatherIcon(wxDesc.icon, 28)}</div>
        </header>
        <div className="wx-row">
          <div className="wx-stat"><span className="wx-stat__k">Feels</span><span className="wx-stat__v tabular">{weather.feels}°</span></div>
          <div className="wx-stat"><span className="wx-stat__k">Wind</span><span className="wx-stat__v tabular">{weather.wind} km/h</span></div>
          <div className="wx-stat"><span className="wx-stat__k">Humidity</span><span className="wx-stat__v tabular">{weather.humidity}%</span></div>
          <div className="wx-stat"><span className="wx-stat__k">Rain (6h)</span><span className="wx-stat__v tabular" style={{ color: weather.rainChance > 60 ? "#60A5FA" : "inherit" }}>{weather.rainChance}%</span></div>
        </div>
      </section>

      {/* Parking */}
      <section className="panel">
        <header className="panel__head">
          <div>
            <span className="panel__kicker">Parking · Real-time</span>
            <h2 className="panel__title">Where there's space</h2>
          </div>
          <div className="chip">{freeSpaces.toLocaleString()} free citywide</div>
        </header>
        <div className="panel__map">
          <MiniMap height={200} markers={parking.filter(p => p.coords).map((p) => {
            const st = occStatus(p.occupation);
            return {
              lng: p.coords.lng, lat: p.coords.lat, color: st.color,
              size: 12 + Math.sqrt(p.total) / 3,
              label: p.name, sublabel: `${p.occupation}% full · ${p.free} free`,
              onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.coords.lat},${p.coords.lng}`, "_blank", "noopener"),
            };
          })} />
        </div>
        <div className="parking-list">
          {[...parking].sort((a, b) => a.occupation - b.occupation).map((p, i) => {
            const st = occStatus(p.occupation);
            return (
              <a key={i}
                 href={p.coords ? `https://www.google.com/maps/dir/?api=1&destination=${p.coords.lat},${p.coords.lng}` : "#"}
                 target="_blank" rel="noopener noreferrer"
                 className="parking-row">
                <div className="parking-row__main">
                  <div className="parking-row__name">{p.name}</div>
                  <div className="parking-row__sub tabular">{p.free} free of {p.total}</div>
                </div>
                <div className="parking-row__meter">
                  <div className="parking-row__meter-track">
                    <div className="parking-row__meter-fill" style={{ width: `${p.occupation}%`, background: st.color }} />
                  </div>
                  <div className="parking-row__pct tabular" style={{ color: st.color }}>{p.occupation}%</div>
                </div>
                <ArrowUpRight size={12} className="parking-row__arrow" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </section>

      {/* Air quality + Transit (2-col) */}
      <section className="split-2">
        <div className="panel">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">Air quality</span>
              <h2 className="panel__title">What you're breathing</h2>
            </div>
            <span className="chip"><CircleAlert size={11} aria-hidden="true" /> Threshold 25 µg/m³</span>
          </header>
          <div className="air-list">
            {air.map((s, i) => {
              const st = airStatus(s.no2);
              return (
                <div key={i} className="air-row">
                  <span className="air-row__name">{s.station}</span>
                  <span className="air-row__val tabular" style={{ color: st.color }}>{s.no2} <em>µg/m³</em></span>
                  <span className={`badge badge--${st.key}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">De Lijn</span>
              <h2 className="panel__title">Tram & bus stops</h2>
            </div>
            <span className="chip"><Train size={11} aria-hidden="true" /> Central</span>
          </header>
          <div className="transit-list">
            {TRANSIT_STOPS.map((s, i) => (
              <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
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
      </section>

      {/* Swim + Waste */}
      <section className="split-2">
        <div className="panel">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">Swim spots</span>
              <h2 className="panel__title">Water in the city</h2>
            </div>
            <span className="chip"><Waves size={11} aria-hidden="true" /> Seasonal</span>
          </header>
          <div className="water-list">
            {WATER_SPOTS.map((s, i) => {
              const st = STATUS[s.status] || STATUS.info;
              return (
                <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
                   target="_blank" rel="noopener noreferrer" className="water">
                  <Droplets size={16} style={{ color: st.color, flexShrink: 0 }} aria-hidden="true" />
                  <div className="water__body">
                    <div className="water__name">{s.name}</div>
                    <div className="water__kind">{s.kind}</div>
                    <div className="water__note">{s.note}</div>
                  </div>
                  <span className={`badge badge--${st.key}`}>{st.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <header className="panel__head">
            <div>
              <span className="panel__kicker">IVAGO · Waste pickup</span>
              <h2 className="panel__title">When's my collection?</h2>
            </div>
            <span className="chip"><Trash2 size={11} aria-hidden="true" /> Select district</span>
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
                <div className="waste__tag" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}>GFT</div>
                <div className="waste__day">{waste.gft}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.gft)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__tag" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>PMD</div>
                <div className="waste__day">{waste.pmd}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.pmd)}</div>
              </div>
              <div className="waste__card">
                <div className="waste__tag" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>REST</div>
                <div className="waste__day">{waste.rest}</div>
                <div className="waste__when tabular">{nextWasteDay(waste.rest)}</div>
              </div>
            </div>
            <p className="waste__note">
              Street not listed? See <a href="https://ivago.be/afvalkalender" target="_blank" rel="noopener noreferrer">ivago.be/afvalkalender</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
