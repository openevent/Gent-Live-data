import React from "react";
import { Link } from "wouter";
import { Moon, Sun, MapPin, ArrowRight, Zap, Wind, Car, Bike } from "lucide-react";
import { useData, occStatus, airStatus } from "../data/api.js";
import { describeWeather, weatherQuip } from "../data/api.js";

export default function Home() {
  const { parking, air, weather } = useData();

  const totalFree = parking.reduce((a, p) => a + p.free, 0);
  const cityOcc = parking.length ? Math.round(parking.reduce((a, p) => a + p.occupation, 0) / parking.length) : 0;
  const avgNo2 = air.length ? Math.round(air.reduce((a, s) => a + s.no2, 0) / air.length) : 0;
  const wxDesc = describeWeather(weather.code);
  const quip = weatherQuip(weather);

  const hour = new Date().getHours();
  const isEvening = hour >= 17 || hour < 6;

  // Opinionated "what to do" based on conditions
  const nudge = isEvening
    ? "Heading out? See what's on tonight."
    : "In the city today? Here's what's moving.";

  const modes = [
    {
      to: "/tonight",
      icon: Moon,
      title: "Tonight",
      desc: "What's on, where to go, how to get there",
      primary: isEvening,
    },
    {
      to: "/today",
      icon: Sun,
      title: "Today",
      desc: "Parking, transit, weather, practical stuff",
      primary: !isEvening,
    },
    {
      to: "/visiting",
      icon: MapPin,
      title: "Visiting",
      desc: "Routes and gems for 1 or 2 days",
      primary: false,
    },
  ];

  return (
    <main className="home">
      {/* Hero */}
      <section className="home__hero">
        <div className="home__eyebrow">
          <Zap size={11} aria-hidden="true" />
          <span className="tabular">LIVE · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <h1 className="home__title">
          The city,<br/>
          <span className="home__title-accent">right now.</span>
        </h1>
        <p className="home__sub">{nudge}</p>

        {/* Quick vital signs */}
        <div className="home__vitals">
          <div className="vital">
            <div className="vital__icon"><Car size={14} aria-hidden="true" /></div>
            <div className="vital__body">
              <div className="vital__label">Parking</div>
              <div className="vital__value tabular" style={{ color: occStatus(cityOcc).color }}>
                {cityOcc}%<span className="vital__sub">  {totalFree.toLocaleString()} free</span>
              </div>
            </div>
          </div>
          <div className="vital">
            <div className="vital__icon"><Wind size={14} aria-hidden="true" /></div>
            <div className="vital__body">
              <div className="vital__label">Air · NO₂</div>
              <div className="vital__value tabular" style={{ color: airStatus(avgNo2).color }}>
                {avgNo2}<span className="vital__sub">µg/m³ · {airStatus(avgNo2).label}</span>
              </div>
            </div>
          </div>
          <div className="vital">
            <div className="vital__icon">
              {/* simple emoji-less weather glyph via Sun as fallback */}
              <Sun size={14} aria-hidden="true" />
            </div>
            <div className="vital__body">
              <div className="vital__label">Weather</div>
              <div className="vital__value tabular">
                {weather.temp}°<span className="vital__sub">{wxDesc.label.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mode picker */}
      <section className="home__modes" aria-labelledby="modes-h">
        <h2 id="modes-h" className="home__h2">What brings you here?</h2>
        <div className="home__grid">
          {modes.map((m) => (
            <Link
              key={m.to}
              href={m.to}
              className={`mode ${m.primary ? "mode--primary" : ""}`}
            >
              <div className="mode__icon"><m.icon size={24} strokeWidth={1.5} aria-hidden="true" /></div>
              <div className="mode__body">
                <div className="mode__title">{m.title}</div>
                <div className="mode__desc">{m.desc}</div>
              </div>
              <ArrowRight size={16} className="mode__arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="home__quicklinks">
        <Link href="/events" className="quicklink">
          <span className="quicklink__label">Full events list</span>
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
        <Link href="/map" className="quicklink">
          <span className="quicklink__label">Open the map</span>
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
        <Link href="/about" className="quicklink">
          <span className="quicklink__label">About this project</span>
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
