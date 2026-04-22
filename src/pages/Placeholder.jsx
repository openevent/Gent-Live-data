import React from "react";
import { Link } from "wouter";
import { Construction, ArrowLeft, Sparkles } from "lucide-react";

function Placeholder({ kicker, title, tagline, whats, eta }) {
  return (
    <main className="page">
      <header className="page__header">
        <div className="page__kicker">{kicker}</div>
        <h1 className="page__title">{title}</h1>
        <p className="page__sub">{tagline}</p>
      </header>

      <section className="panel">
        <div className="placeholder">
          <div className="placeholder__icon"><Construction size={22} strokeWidth={1.5} aria-hidden="true" /></div>
          <h2 className="placeholder__title">Building this next</h2>
          <p className="placeholder__body">{whats}</p>
          {eta && <div className="placeholder__eta">Coming · {eta}</div>}
          <Link href="/" className="placeholder__back">
            <ArrowLeft size={12} aria-hidden="true" />
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

export function Tonight() {
  return (
    <Placeholder
      kicker="GOING OUT · TONIGHT"
      title="Tonight in Ghent."
      tagline="What's on, where, and how to get there."
      whats="A dedicated view for evening: tonight's events, club lineups, venues sorted by what's open now, parking that's still available nearby, and last-tram times. Being built next."
      eta="This week"
    />
  );
}

export function Visiting() {
  return (
    <Placeholder
      kicker="VISITING · GUIDE"
      title="One or two days."
      tagline="Routes and gems for visitors."
      whats="Two curated routes — a classic day of Ghent's big sights, and a slower second-day itinerary through neighbourhoods most people miss. Plus the weather for your stay and which gems are nearby."
      eta="This week"
    />
  );
}

export function Events() {
  return (
    <Placeholder
      kicker="EVENTS · AGENDA"
      title="What's on, everywhere."
      tagline="Full events + nightlife, filterable."
      whats="The full events feed plus every curated nightlife venue, with filters for date, type (concert, club, theatre, market), neighbourhood, and price. Tap any card to open the venue."
      eta="This week"
    />
  );
}

export function MapPage() {
  return (
    <Placeholder
      kicker="MAP · FULL VIEW"
      title="Everything on the map."
      tagline="All layers, one screen."
      whats="Full-screen map with toggle-able layers — parking (colored by occupancy), air quality stations, venues, gems, transit stops, swim spots. Click anything for a full info panel with directions."
      eta="This week"
    />
  );
}
