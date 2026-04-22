// Global stylesheet, kept in JS so it ships alongside the component tree.
// Uses the same clean ops palette (slate + green accent, Inter + JetBrains Mono).

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg:           #0F172A;
  --bg-elev:      #111C33;
  --surface:      #15213D;
  --surface-2:    #1B2847;
  --muted:        #272F42;
  --border:       #334155;
  --border-soft:  rgba(71,85,105,0.35);
  --fg:           #F8FAFC;
  --fg-muted:     #94A3B8;
  --fg-dim:       #64748B;
  --accent:       #22C55E;
  --warn:         #F59E0B;
  --alert:        #EF4444;
  --sans:  'Inter', system-ui, -apple-system, sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, monospace;
  --ease:  cubic-bezier(0.16, 1, 0.3, 1);
  --radius: 8px;
  --radius-lg: 12px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--fg);
  font-family: var(--sans); font-size: 14px; line-height: 1.5;
  min-height: 100vh;
  font-feature-settings: 'cv11','ss01';
  -webkit-font-smoothing: antialiased;
}
.tabular { font-variant-numeric: tabular-nums; }
a { color: inherit; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ NAV ═══════════════════════════════════════════════════════════════ */
.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(15,23,42,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav__inner {
  max-width: 1440px; margin: 0 auto;
  padding: 12px 24px;
  display: flex; align-items: center; gap: 16px;
}
.nav__brand {
  display: inline-flex; align-items: center; gap: 8px;
  text-decoration: none; color: var(--accent);
  font-family: var(--mono); font-weight: 700; font-size: 13px;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.nav__brand-text { color: var(--fg); letter-spacing: 0.15em; }
.nav__brand:hover { color: var(--accent); }

.nav__burger {
  display: none;
  background: transparent; border: 1px solid var(--border);
  color: var(--fg); cursor: pointer;
  width: 36px; height: 36px; border-radius: 6px;
  align-items: center; justify-content: center;
  margin-left: auto;
  transition: border-color 150ms var(--ease);
}
.nav__burger:hover { border-color: var(--accent); color: var(--accent); }

.nav__links {
  display: flex; align-items: center; gap: 4px;
  flex: 1;
}
.nav__link {
  font-family: var(--sans); font-size: 13px; font-weight: 500;
  color: var(--fg-muted); text-decoration: none;
  padding: 8px 12px; border-radius: 6px;
  transition: color 150ms var(--ease), background 150ms var(--ease);
}
.nav__link:hover { color: var(--fg); background: rgba(255,255,255,0.03); }
.nav__link--active { color: var(--accent); background: rgba(34,197,94,0.08); }

.nav__status {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border: 1px solid var(--border); border-radius: 99px;
  flex-shrink: 0;
}
.nav__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--fg-dim); }
.nav__dot.live { background: var(--accent); animation: pulse 1.8s ease-in-out infinite; }
.nav__dot.sample { background: var(--warn); }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50%      { box-shadow: 0 0 0 4px transparent; }
}
.nav__status-text {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; color: var(--fg-muted);
}
.nav__time { color: var(--fg-dim); margin-left: 2px; letter-spacing: 0; }
.nav__refresh {
  background: transparent; border: none; cursor: pointer;
  color: var(--fg-muted); padding: 2px 4px; border-radius: 3px;
  display: flex; align-items: center;
}
.nav__refresh:hover { color: var(--accent); }
.nav__refresh:disabled { opacity: 0.5; cursor: wait; }

/* ═══ PAGE SHELLS ═══════════════════════════════════════════════════════ */
.app { min-height: 100vh; display: flex; flex-direction: column; }
.home, .page {
  max-width: 1440px; margin: 0 auto;
  padding: 40px 24px 60px;
  flex: 1; width: 100%;
  display: flex; flex-direction: column; gap: 28px;
}
.page--prose { max-width: 820px; }

.page__header { padding-bottom: 20px; border-bottom: 1px solid var(--border-soft); }
.page__kicker {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.2em; color: var(--accent);
  margin-bottom: 10px;
}
.page__title {
  font-weight: 700; font-size: clamp(32px, 5vw, 48px);
  line-height: 1.05; letter-spacing: -0.025em;
  margin: 0 0 10px;
}
.page__sub {
  font-size: 16px; color: var(--fg-muted); margin: 0; max-width: 60ch;
}

/* ═══ HOME ══════════════════════════════════════════════════════════════ */
.home__hero {
  padding: 20px 0;
  border-bottom: 1px solid var(--border-soft);
}
.home__eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.2em; color: var(--accent);
  padding: 5px 10px; border-radius: 99px;
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
  margin-bottom: 24px;
}
.home__title {
  font-weight: 700; font-size: clamp(48px, 8vw, 84px);
  line-height: 0.95; letter-spacing: -0.035em;
  margin: 0 0 16px;
}
.home__title-accent { color: var(--accent); }
.home__sub {
  font-size: 18px; color: var(--fg-muted);
  margin: 0 0 32px; max-width: 40ch;
}

.home__vitals {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 12px; margin-top: 20px;
}
.vital {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.vital__icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--muted); display: flex;
  align-items: center; justify-content: center;
  color: var(--fg-muted); flex-shrink: 0;
}
.vital__label {
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.15em; text-transform: uppercase; color: var(--fg-muted);
  margin-bottom: 2px;
}
.vital__value {
  font-weight: 600; font-size: 20px; letter-spacing: -0.01em;
}
.vital__sub {
  font-size: 11px; font-weight: 400; color: var(--fg-muted);
  margin-left: 6px;
}

.home__h2 {
  font-weight: 700; font-size: 24px; margin: 0 0 4px;
  letter-spacing: -0.015em;
}
.home__grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 12px; margin-top: 16px;
}
.mode {
  display: flex; align-items: center; gap: 14px;
  padding: 20px; border-radius: var(--radius-lg);
  background: var(--bg-elev); border: 1px solid var(--border);
  text-decoration: none; color: var(--fg);
  transition: all 200ms var(--ease);
}
.mode:hover { border-color: var(--accent); background: var(--surface); transform: translateY(-2px); }
.mode--primary { background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elev) 100%); border-color: rgba(34,197,94,0.3); }
.mode__icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(34,197,94,0.1); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mode__title { font-weight: 600; font-size: 16px; margin-bottom: 2px; }
.mode__desc { font-size: 12px; color: var(--fg-muted); }
.mode__arrow { color: var(--fg-dim); margin-left: auto; transition: transform 150ms var(--ease), color 150ms var(--ease); flex-shrink: 0; }
.mode:hover .mode__arrow { color: var(--accent); transform: translateX(4px); }

.home__quicklinks {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding-top: 16px; border-top: 1px solid var(--border-soft);
}
.quicklink {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px;
  padding: 8px 12px; border-radius: 99px;
  background: var(--muted); border: 1px solid var(--border-soft);
  color: var(--fg-muted); text-decoration: none;
  transition: all 150ms var(--ease);
}
.quicklink:hover { color: var(--accent); border-color: var(--accent); }

/* ═══ PANELS (shared) ═══════════════════════════════════════════════════ */
.panel {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}
.panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border-soft);
}
.panel__kicker {
  display: block; font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--fg-dim); margin-bottom: 2px; text-transform: uppercase;
}
.panel__title { font-weight: 600; font-size: 18px; line-height: 1.2; margin: 0; letter-spacing: -0.005em; }
.panel__icon { color: var(--fg-muted); }
.panel__map { padding: 12px 20px; border-bottom: 1px solid var(--border-soft); background: var(--bg); }

.chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--fg-muted); padding: 5px 9px;
  background: var(--muted); border: 1px solid var(--border-soft); border-radius: 99px;
}
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  padding: 3px 8px; border-radius: 99px;
}
.badge--ok    { background: rgba(34,197,94,0.1);  color: var(--accent); }
.badge--warn  { background: rgba(245,158,11,0.1); color: var(--warn); }
.badge--alert { background: rgba(239,68,68,0.1);  color: var(--alert); }
.badge--info  { background: rgba(148,163,184,0.1); color: var(--fg-muted); }

.split-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ═══ WEATHER STATS ═════════════════════════════════════════════════════ */
.wx-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border-soft); }
.wx-stat { padding: 16px 20px; background: var(--bg-elev); display: flex; flex-direction: column; gap: 4px; }
.wx-stat__k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.15em; color: var(--fg-dim); text-transform: uppercase; }
.wx-stat__v { font-weight: 600; font-size: 22px; letter-spacing: -0.01em; }

/* ═══ PARKING ROWS ══════════════════════════════════════════════════════ */
.parking-list { padding: 6px 20px 16px; display: flex; flex-direction: column; }
.parking-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0; border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.parking-row:last-child { border-bottom: none; }
.parking-row:hover { padding-left: 6px; }
.parking-row__main { min-width: 140px; flex-shrink: 0; }
.parking-row__name { font-weight: 500; font-size: 14px; }
.parking-row__sub { font-size: 11px; color: var(--fg-muted); margin-top: 2px; }
.parking-row__meter { display: flex; align-items: center; gap: 10px; flex: 1; }
.parking-row__meter-track { flex: 1; height: 4px; background: var(--muted); border-radius: 99px; overflow: hidden; }
.parking-row__meter-fill { height: 100%; transition: width 400ms var(--ease); }
.parking-row__pct { font-family: var(--mono); font-weight: 600; font-size: 12px; min-width: 40px; text-align: right; }
.parking-row__arrow { color: var(--fg-dim); flex-shrink: 0; }

/* ═══ AIR ROWS ══════════════════════════════════════════════════════════ */
.air-list { padding: 10px 20px 16px; }
.air-row {
  display: grid; grid-template-columns: 1.5fr auto auto;
  align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px dashed var(--border-soft);
}
.air-row:last-child { border-bottom: none; }
.air-row__name { font-weight: 500; }
.air-row__val { font-weight: 600; font-size: 18px; }
.air-row__val em { font-size: 10px; color: var(--fg-muted); font-style: normal; margin-left: 3px; font-weight: 400; }

/* ═══ TRANSIT ═══════════════════════════════════════════════════════════ */
.transit-list { padding: 10px 20px 16px; }
.transit {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.transit:last-child { border-bottom: none; }
.transit:hover { padding-left: 6px; }
.transit__icon { width: 32px; height: 32px; border-radius: 6px; background: var(--muted); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.transit__body { flex: 1; min-width: 0; }
.transit__name { font-weight: 500; font-size: 14px; margin-bottom: 2px; }
.transit__lines { display: flex; gap: 4px; flex-wrap: wrap; }
.line-badge {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  padding: 2px 6px; border-radius: 3px;
  background: var(--accent); color: #0B1220;
  min-width: 20px; text-align: center;
}
.transit__arrow { color: var(--fg-dim); flex-shrink: 0; }
.transit:hover .transit__arrow { color: var(--accent); }

/* ═══ WATER ═════════════════════════════════════════════════════════════ */
.water-list { padding: 10px 20px 16px; }
.water {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px dashed var(--border-soft);
  text-decoration: none; color: var(--fg);
  transition: padding 180ms var(--ease);
}
.water:last-child { border-bottom: none; }
.water:hover { padding-left: 6px; }
.water__body { flex: 1; min-width: 0; }
.water__name { font-weight: 500; font-size: 14px; margin-bottom: 2px; }
.water__kind { font-size: 11px; color: var(--fg-muted); margin-bottom: 1px; }
.water__note { font-size: 11px; color: var(--fg-dim); font-style: italic; }

/* ═══ WASTE ═════════════════════════════════════════════════════════════ */
.waste { padding: 20px; }
.waste__selector { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
.waste__chip {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  padding: 6px 10px; border-radius: 99px;
  background: var(--muted); border: 1px solid var(--border-soft);
  color: var(--fg-muted); cursor: pointer;
  transition: all 150ms var(--ease);
}
.waste__chip:hover { color: var(--fg); border-color: var(--fg-dim); }
.waste__chip--active { background: var(--accent); border-color: var(--accent); color: #0B1220; font-weight: 600; }
.waste__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.waste__card { background: var(--bg); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: 14px; }
.waste__tag {
  font-family: var(--mono); font-weight: 700; font-size: 11px; letter-spacing: 0.05em;
  padding: 3px 7px; border-radius: 4px; display: inline-block; margin-bottom: 10px;
}
.waste__day { font-weight: 600; font-size: 18px; margin-bottom: 4px; }
.waste__when { font-family: var(--mono); font-size: 11px; color: var(--accent); letter-spacing: 0.05em; }
.waste__note { margin-top: 16px; font-size: 12px; color: var(--fg-muted); }
.waste__note a { color: var(--accent); }

/* ═══ PLACEHOLDER ═══════════════════════════════════════════════════════ */
.placeholder {
  padding: 60px 40px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.placeholder__icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(34,197,94,0.1); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(34,197,94,0.2);
}
.placeholder__title { font-weight: 600; font-size: 22px; margin: 0; }
.placeholder__body { font-size: 14px; color: var(--fg-muted); max-width: 52ch; margin: 0; line-height: 1.55; }
.placeholder__eta {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em;
  color: var(--accent); padding: 5px 10px;
  border: 1px solid rgba(34,197,94,0.3); border-radius: 99px;
  background: rgba(34,197,94,0.05); margin-top: 4px;
}
.placeholder__back {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.05em;
  color: var(--fg-muted); text-decoration: none;
  padding: 8px 14px; border-radius: 99px;
  border: 1px solid var(--border); margin-top: 12px;
  transition: all 150ms var(--ease);
}
.placeholder__back:hover { color: var(--accent); border-color: var(--accent); }

/* ═══ PROSE (About) ═════════════════════════════════════════════════════ */
.prose { font-size: 15px; line-height: 1.7; color: var(--fg); }
.prose__lead { font-size: 17px; color: var(--fg); margin-bottom: 20px; }
.prose p { margin: 0 0 16px; color: var(--fg-muted); }
.prose p strong { color: var(--fg); font-weight: 500; }
.prose h2 { font-weight: 700; font-size: 22px; margin: 36px 0 14px; letter-spacing: -0.015em; }
.prose ul { margin: 0 0 20px; padding-left: 20px; color: var(--fg-muted); }
.prose ul li { margin-bottom: 10px; }
.prose a { color: var(--accent); text-decoration: underline; text-decoration-color: rgba(34,197,94,0.4); text-underline-offset: 3px; }
.prose a:hover { text-decoration-color: var(--accent); }
.sources { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 24px; }
.source {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border-radius: var(--radius-lg);
  background: var(--bg-elev); border: 1px solid var(--border);
  text-decoration: none; color: var(--fg);
  transition: border-color 150ms var(--ease);
}
.source:hover { border-color: var(--accent); }
.source > div { flex: 1; }
.source__name { font-weight: 500; font-size: 14px; }
.source__kind { font-size: 12px; color: var(--fg-muted); margin-top: 2px; }
.prose__foot { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border-soft); }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 10px 16px; border-radius: 99px;
  background: var(--accent); color: #0B1220;
  text-decoration: none;
  transition: transform 150ms var(--ease);
}
.btn-primary:hover { transform: translateY(-1px); }

/* ═══ FOOTER ════════════════════════════════════════════════════════════ */
.footer {
  position: relative; margin-top: 60px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  overflow: hidden;
}
.footer__skyline {
  position: absolute; top: 0; left: 0; right: 0;
  pointer-events: none;
  display: flex; justify-content: center;
  opacity: 0.5;
}
.footer__content {
  position: relative; z-index: 1;
  max-width: 1440px; margin: 0 auto;
  padding: 60px 24px 28px;
  display: grid; grid-template-columns: 1.2fr 2fr 1fr; gap: 32px;
  align-items: end;
}
.footer__brand { font-weight: 700; font-size: 15px; letter-spacing: -0.005em; margin-bottom: 4px; }
.footer__tagline { font-size: 12px; color: var(--fg-muted); }
.footer__nav { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.footer__nav a {
  font-size: 12px; color: var(--fg-muted); text-decoration: none;
  padding: 4px 0;
}
.footer__nav a:hover { color: var(--accent); }
.footer__meta { text-align: right; }
.footer__meta-line {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  color: var(--fg-dim); margin-bottom: 4px;
}

/* ═══ RESPONSIVE ════════════════════════════════════════════════════════ */
@media (max-width: 900px) {
  .nav__inner { flex-wrap: wrap; }
  .nav__burger { display: inline-flex; order: 1; }
  .nav__links {
    order: 3;
    flex-basis: 100%;
    flex-direction: column;
    align-items: stretch; gap: 0;
    max-height: 0; overflow: hidden;
    transition: max-height 300ms var(--ease);
  }
  .nav__links--open { max-height: 500px; padding-top: 8px; }
  .nav__link { padding: 10px 12px; border-radius: 0; border-bottom: 1px solid var(--border-soft); }
  .nav__status { order: 2; margin-left: auto; }
  .home__grid, .home__vitals { grid-template-columns: 1fr; }
  .split-2 { grid-template-columns: 1fr; }
  .wx-row { grid-template-columns: repeat(2, 1fr); }
  .footer__content { grid-template-columns: 1fr; text-align: center; gap: 20px; }
  .footer__meta { text-align: center; }
  .footer__nav { justify-content: center; }
}
@media (max-width: 640px) {
  .home, .page { padding: 24px 16px 40px; gap: 20px; }
  .wx-row { grid-template-columns: 1fr; }
  .waste__grid { grid-template-columns: 1fr; }
  .parking-row__main { min-width: 100px; }
}
`;

export default css;
