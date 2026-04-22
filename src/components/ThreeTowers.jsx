import React from "react";

// ═════════════════════════════════════════════════════════════════════════
// The Three Towers of Ghent — Saint Nicholas · Belfry · Saint Bavo
// A stylized SVG silhouette, the signature skyline of the city
// ═════════════════════════════════════════════════════════════════════════
//
// Proportions from east to west along the old city axis:
//   - Saint Bavo's Cathedral  (89 m, squared Gothic tower)
//   - The Belfry              (91 m, dragon on top)
//   - Saint Nicholas' Church  (76 m, lantern tower)
//
// This is an abstracted silhouette — not architecturally precise, but
// immediately recognizable to anyone who's stood on Sint-Michielsbrug.

export default function ThreeTowers({ height = 60, color = "currentColor", opacity = 1 }) {
  return (
    <svg
      viewBox="0 0 600 120"
      height={height}
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block", width: "100%", opacity }}
      aria-label="The Three Towers of Ghent skyline"
    >
      <g fill={color}>
        {/* Horizon line of rooftops (subtle, connects the towers) */}
        <path
          d="M 0 115 L 60 115 L 65 105 L 100 105 L 105 115 L 145 115 L 150 100 L 170 100 L 175 115 L 200 115 L 200 120 L 0 120 Z"
          opacity="0.4"
        />

        {/* Saint Nicholas' Church (left, lantern tower) */}
        <g transform="translate(80, 0)">
          {/* base */}
          <rect x="24" y="70" width="32" height="50" />
          {/* upper stage */}
          <rect x="28" y="50" width="24" height="22" />
          {/* lantern */}
          <rect x="32" y="30" width="16" height="22" />
          {/* octagonal spire base */}
          <path d="M 28 30 L 52 30 L 48 22 L 32 22 Z" />
          {/* spire */}
          <path d="M 34 22 L 46 22 L 42 8 L 40 4 L 38 8 Z" />
          {/* cross on top */}
          <rect x="39.2" y="0" width="1.6" height="8" />
          <rect x="37" y="2" width="6" height="1.6" />
          {/* small turrets at corners */}
          <rect x="22" y="48" width="3" height="8" />
          <rect x="55" y="48" width="3" height="8" />
          <path d="M 22 48 L 25 48 L 23.5 44 Z" />
          <path d="M 55 48 L 58 48 L 56.5 44 Z" />
        </g>

        {/* The Belfry (centre, tallest — 91m) */}
        <g transform="translate(255, 0)">
          {/* main tower base */}
          <rect x="30" y="85" width="40" height="35" />
          {/* mid stage */}
          <rect x="32" y="55" width="36" height="32" />
          {/* upper stage */}
          <rect x="34" y="30" width="32" height="26" />
          {/* window slits */}
          <rect x="38" y="36" width="2" height="6" fill="#0E1422" />
          <rect x="45" y="36" width="2" height="6" fill="#0E1422" />
          <rect x="53" y="36" width="2" height="6" fill="#0E1422" />
          <rect x="60" y="36" width="2" height="6" fill="#0E1422" />
          {/* octagonal crown base */}
          <path d="M 34 30 L 66 30 L 62 22 L 38 22 Z" />
          {/* tapering spire — the Belfry has a distinctive crown+spire */}
          <path d="M 40 22 L 60 22 L 58 12 L 54 8 L 50 2 L 46 8 L 42 12 Z" />
          {/* dragon finial (stylized) */}
          <path d="M 48 2 L 52 2 L 51 -2 L 49 -2 Z" />
          {/* corner turrets */}
          <rect x="27" y="52" width="4" height="10" />
          <rect x="69" y="52" width="4" height="10" />
          <path d="M 27 52 L 31 52 L 29 46 Z" />
          <path d="M 69 52 L 73 52 L 71 46 Z" />
          <rect x="31" y="27" width="3" height="6" />
          <rect x="66" y="27" width="3" height="6" />
        </g>

        {/* Saint Bavo's Cathedral (right, squared Gothic tower — 89m) */}
        <g transform="translate(430, 0)">
          {/* wider base */}
          <rect x="18" y="90" width="44" height="30" />
          {/* tower shaft */}
          <rect x="22" y="45" width="36" height="46" />
          {/* Gothic window indents */}
          <rect x="26" y="60" width="3" height="18" fill="#0E1422" />
          <rect x="32" y="60" width="3" height="18" fill="#0E1422" />
          <rect x="45" y="60" width="3" height="18" fill="#0E1422" />
          <rect x="51" y="60" width="3" height="18" fill="#0E1422" />
          {/* top gallery */}
          <rect x="20" y="38" width="40" height="8" />
          {/* crenellations — Saint Bavo's signature feature */}
          <rect x="20" y="32" width="4" height="8" />
          <rect x="28" y="32" width="4" height="8" />
          <rect x="36" y="32" width="4" height="8" />
          <rect x="44" y="32" width="4" height="8" />
          <rect x="52" y="32" width="4" height="8" />
          <rect x="56" y="32" width="4" height="8" />
          {/* four corner turrets — tall, slender */}
          <rect x="18" y="25" width="4" height="18" />
          <rect x="58" y="25" width="4" height="18" />
          <path d="M 17 25 L 23 25 L 20 18 Z" />
          <path d="M 57 25 L 63 25 L 60 18 Z" />
        </g>

        {/* Subtle surrounding rooftops */}
        <g opacity="0.35">
          <rect x="0" y="100" width="60" height="20" />
          <rect x="5" y="95" width="30" height="6" />
          <rect x="160" y="102" width="50" height="18" />
          <rect x="170" y="96" width="25" height="7" />
          <rect x="360" y="100" width="60" height="20" />
          <rect x="370" y="92" width="40" height="9" />
          <rect x="530" y="102" width="70" height="18" />
          <rect x="545" y="94" width="35" height="9" />
        </g>

        {/* A few tiny "stars" or lights in the sky (barely visible) */}
        <g opacity="0.4">
          <circle cx="40" cy="20" r="0.6" />
          <circle cx="200" cy="15" r="0.6" />
          <circle cx="390" cy="25" r="0.6" />
          <circle cx="550" cy="18" r="0.6" />
          <circle cx="130" cy="45" r="0.4" />
          <circle cx="350" cy="50" r="0.4" />
        </g>
      </g>
    </svg>
  );
}
