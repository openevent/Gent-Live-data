import React from "react";
import { Link } from "wouter";
import { Database, Github, ExternalLink, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <main className="page page--prose">
      <header className="page__header">
        <div className="page__kicker">ABOUT</div>
        <h1 className="page__title">What is this?</h1>
      </header>

      <div className="prose">
        <p className="prose__lead">
          <strong>Gent · Now</strong> pulls together the signals of the city —
          parking, air, weather, events, transit, nightlife — into one place.
        </p>

        <p>
          Ghent has a huge amount of open data, but it sits across a dozen
          portals, apps, and PDFs. If you want to know whether to take the car,
          whether it'll rain in an hour, and what's on tonight, you end up with
          four tabs open. This is an attempt at one tab.
        </p>

        <h2>Three ways to use it</h2>
        <ul>
          <li>
            <Link href="/tonight"><strong>Tonight</strong></Link> — going out, where
            to go, what's on, where to park near it, last tram home.
          </li>
          <li>
            <Link href="/today"><strong>Today</strong></Link> — living in Ghent:
            parking, weather, air, transit, waste pickup, swim spots.
          </li>
          <li>
            <Link href="/visiting"><strong>Visiting</strong></Link> — one or two days
            here: a route that works, the gems, and the essentials.
          </li>
        </ul>

        <h2>Where the data comes from</h2>
        <div className="sources">
          <a href="https://data.stad.gent" target="_blank" rel="noopener noreferrer" className="source">
            <Database size={16} aria-hidden="true" />
            <div>
              <div className="source__name">data.stad.gent</div>
              <div className="source__kind">Parking, air quality, events, cycling · real-time</div>
            </div>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="source">
            <Database size={16} aria-hidden="true" />
            <div>
              <div className="source__name">Open-Meteo</div>
              <div className="source__kind">Weather forecast · free, no API key</div>
            </div>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="source">
            <Database size={16} aria-hidden="true" />
            <div>
              <div className="source__name">OpenStreetMap</div>
              <div className="source__kind">Maps · tiles via CARTO</div>
            </div>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>

        <h2>Honest caveats</h2>
        <ul>
          <li>
            Nightlife (clubs, live-music venues) isn't in the city's open data —
            those entries are curated and each links to the venue's own Instagram,
            which is where they actually post tonight's lineup.
          </li>
          <li>
            Waste pickup uses representative schedules by district. For your exact
            street, check{" "}
            <a href="https://ivago.be/afvalkalender" target="_blank" rel="noopener noreferrer">
              ivago.be/afvalkalender
            </a>.
          </li>
          <li>
            Air quality and parking data refresh every few minutes from the city.
            The "LIVE" dot at the top confirms a real fetch succeeded.
          </li>
          <li>
            Live data is cached at the edge for ~60s, so your clicks don't hammer
            the city's servers.
          </li>
        </ul>

        <h2>Roadmap</h2>
        <ul>
          <li>Real-time De Lijn arrivals (currently showing stop locations only)</li>
          <li>UiTdatabank integration for a fuller events feed</li>
          <li>A weekend view — Saturday plans, Sunday plans</li>
          <li>Saved locations: your parking garage, your waste district, your favourite venues, remembered</li>
        </ul>

        <div className="prose__foot">
          <Link href="/" className="btn-primary">
            <ArrowRight size={14} aria-hidden="true" />
            Back to the city
          </Link>
        </div>
      </div>
    </main>
  );
}
