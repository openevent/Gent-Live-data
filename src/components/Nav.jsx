import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Radio, Menu, X, RefreshCw } from "lucide-react";
import { useData } from "../data/api.jsx";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { liveMode, lastUpdate, loading, refresh } = useData();

  const isLive = Object.values(liveMode).some(Boolean);

  const links = [
    { to: "/",         label: "Home",     short: "Home" },
    { to: "/tonight",  label: "Tonight",  short: "Tonight" },
    { to: "/today",    label: "Today",    short: "Today" },
    { to: "/visiting", label: "Visiting", short: "Visit" },
    { to: "/events",   label: "Events",   short: "Events" },
    { to: "/map",      label: "Map",      short: "Map" },
    { to: "/about",    label: "About",    short: "About" },
  ];

  return (
    <header className="nav" role="banner">
      <div className="nav__inner">
        <Link href="/" className="nav__brand" onClick={() => setOpen(false)}>
          <Radio size={16} strokeWidth={2.5} aria-hidden="true" />
          <span className="nav__brand-text">GENT · NOW</span>
        </Link>

        <button
          className="nav__burger"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <nav className={`nav__links ${open ? "nav__links--open" : ""}`} aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className={`nav__link ${location === l.to ? "nav__link--active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav__status" role="status" aria-live="polite">
          <span className={`nav__dot ${isLive ? "live" : "sample"}`} aria-hidden="true" />
          <span className="nav__status-text tabular">
            {isLive ? "LIVE" : "SAMPLE"}
            {lastUpdate && <span className="nav__time">
              · {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>}
          </span>
          <button
            className="nav__refresh"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh data"
          >
            <RefreshCw size={12} className={loading ? "spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
