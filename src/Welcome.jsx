import React, { useEffect, useState } from "react";
import ThreeTowers from "./ThreeTowers.jsx";

// ═════════════════════════════════════════════════════════════════════════
// Welcome — opening sequence before the dashboard reveals
// ═════════════════════════════════════════════════════════════════════════
//
// Shows once per browser session (uses sessionStorage).
// Respects prefers-reduced-motion — skips straight to dashboard.
// Timing:
//   0.0s → towers fade in from below
//   0.8s → title types in letter by letter
//   1.2s → subtitle fades in
//   2.2s → live-pulse dot pulses on "NOW"
//   2.8s → whole intro fades out + slides up
//   3.1s → Welcome unmounts, dashboard takes over
// ═════════════════════════════════════════════════════════════════════════

export default function Welcome({ onDone }) {
  const [phase, setPhase] = useState("enter"); // "enter" → "exit" → "done"

  useEffect(() => {
    // Accessibility: skip for reduced motion
    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onDone?.();
      return;
    }

    // Skip if already shown in this session
    try {
      if (sessionStorage.getItem("gentnow_welcomed") === "1") {
        onDone?.();
        return;
      }
      sessionStorage.setItem("gentnow_welcomed", "1");
    } catch {
      // sessionStorage blocked — show anyway, no harm
    }

    const exitTimer  = setTimeout(() => setPhase("exit"),  2800);
    const doneTimer  = setTimeout(() => { setPhase("done"); onDone?.(); }, 3300);

    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  // allow click-to-skip
  const skip = () => { setPhase("exit"); setTimeout(() => onDone?.(), 300); };

  if (phase === "done") return null;

  return (
    <div
      className={`welcome welcome--${phase}`}
      onClick={skip}
      role="presentation"
      aria-hidden="true"
    >
      <style>{css}</style>

      <div className="welcome__inner">
        {/* Three Towers skyline — big and centered */}
        <div className="welcome__towers">
          <ThreeTowers height={180} color="#22C55E" opacity={0.9} />
        </div>

        {/* Title */}
        <h1 className="welcome__title">
          <span className="welcome__word welcome__word--1">Gent</span>
          <span className="welcome__dot">·</span>
          <span className="welcome__word welcome__word--2">
            Now
            <span className="welcome__pulse" aria-hidden="true" />
          </span>
        </h1>

        {/* Subtitle */}
        <p className="welcome__sub">Real-time civic dashboard · Ghent</p>

        {/* Tiny connecting indicator */}
        <div className="welcome__status">
          <span className="welcome__status-dot" />
          <span className="welcome__status-text">connecting to the city</span>
        </div>
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.welcome {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at center, #0F172A 0%, #020617 100%);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: opacity 380ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* Subtle atmospheric glow at top (the stars) */
.welcome::before {
  content: '';
  position: absolute; top: -20%; left: 50%; transform: translateX(-50%);
  width: 80%; height: 60%;
  background: radial-gradient(ellipse at center, rgba(34,197,94,0.08) 0%, transparent 70%);
  pointer-events: none;
}

/* Grain overlay for depth */
.welcome::after {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.03 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: screen;
}

.welcome--exit {
  opacity: 0;
  transform: translateY(-30px);
  pointer-events: none;
}

.welcome__inner {
  position: relative; z-index: 2;
  text-align: center;
  padding: 24px;
  max-width: 640px;
  width: 100%;
}

/* ── Three Towers ── */
.welcome__towers {
  margin: 0 auto 40px;
  max-width: 520px;
  opacity: 0;
  transform: translateY(20px);
  animation: towers-in 900ms cubic-bezier(0.16, 1, 0.3, 1) 100ms forwards;
}
@keyframes towers-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Title — letter-by-letter fade-in ── */
.welcome__title {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  font-size: clamp(56px, 10vw, 112px);
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 0 0 16px;
  color: #F8FAFC;
  display: inline-flex;
  align-items: baseline;
  gap: 0.15em;
}
.welcome__word {
  display: inline-block;
  opacity: 0;
  transform: translateY(14px);
  animation: word-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.welcome__word--1 { animation-delay: 850ms; }
.welcome__word--2 { animation-delay: 1050ms; color: #22C55E; position: relative; }

.welcome__dot {
  color: #22C55E;
  opacity: 0;
  animation: word-in 600ms cubic-bezier(0.16, 1, 0.3, 1) 950ms forwards;
  margin: 0 0.05em;
}
@keyframes word-in {
  to { opacity: 1; transform: translateY(0); }
}

/* Live-pulse dot next to "Now" */
.welcome__pulse {
  position: absolute;
  top: 0.15em;
  right: -0.35em;
  width: 0.12em;
  height: 0.12em;
  border-radius: 50%;
  background: #22C55E;
  opacity: 0;
  animation:
    word-in 400ms cubic-bezier(0.16, 1, 0.3, 1) 2000ms forwards,
    pulse 1.4s ease-in-out 2400ms infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
  50%      { box-shadow: 0 0 0 8px transparent; }
}

/* ── Subtitle ── */
.welcome__sub {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 400;
  font-size: clamp(13px, 1.4vw, 15px);
  color: #94A3B8;
  margin: 0 0 32px;
  letter-spacing: 0.01em;
  opacity: 0;
  transform: translateY(8px);
  animation: sub-in 700ms cubic-bezier(0.16, 1, 0.3, 1) 1250ms forwards;
}
@keyframes sub-in {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Connecting status ── */
.welcome__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(71,85,105,0.4);
  border-radius: 99px;
  background: rgba(15,23,42,0.6);
  opacity: 0;
  animation: sub-in 500ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms forwards;
}
.welcome__status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #22C55E;
  animation: pulse 1.4s ease-in-out infinite;
}
.welcome__status-text {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #94A3B8;
  text-transform: uppercase;
}

/* Accessibility — should never render anyway, but defensive */
@media (prefers-reduced-motion: reduce) {
  .welcome, .welcome * {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;
