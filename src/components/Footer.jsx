import React from "react";
import { Link } from "wouter";
import ThreeTowers from "./ThreeTowers.jsx";
import { useData } from "../data/api.jsx";

export default function Footer() {
  const { lastUpdate, liveMode } = useData();
  const liveCount = Object.values(liveMode).filter(Boolean).length;

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__skyline" aria-hidden="true">
        <ThreeTowers height={36} color="#1e293b" opacity={0.9} />
      </div>
      <div className="footer__content">
        <div className="footer__left">
          <div className="footer__brand">Gent · Now</div>
          <div className="footer__tagline">Live data for the city, in one place.</div>
        </div>

        <nav className="footer__nav" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/tonight">Tonight</Link>
          <Link href="/today">Today</Link>
          <Link href="/visiting">Visiting</Link>
          <Link href="/events">Events</Link>
          <Link href="/map">Map</Link>
          <Link href="/about">About</Link>
        </nav>

        <div className="footer__meta">
          <div className="footer__meta-line tabular">
            {liveCount > 0 ? `${liveCount} live ${liveCount === 1 ? "stream" : "streams"}` : "sample mode"}
            {lastUpdate && ` · ${lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
          </div>
          <div className="footer__meta-line">
            Data · data.stad.gent · Open-Meteo · OpenStreetMap
          </div>
        </div>
      </div>
    </footer>
  );
}
