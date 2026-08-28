interface FurnitureRenderProps {
  material: string;
  legs: string;
}

const WOODS: Record<string, { base: string; grain: string; dark: string }> = {
  Walnut: { base: "#7a5236", grain: "#5e3d26", dark: "#4a2f1d" },
  "White Oak": { base: "#c9ab7f", grain: "#b2946a", dark: "#8f7351" },
  Ash: { base: "#d9c6a8", grain: "#c2ad8d", dark: "#9c8a6d" },
  "Matte Black": { base: "#33302c", grain: "#26241f", dark: "#1a1815" },
};

/** Product-style render of the custom sideboard (PRD §19 Step 3). */
export function FurnitureRender({ material, legs }: FurnitureRenderProps) {
  const wood = WOODS[material] ?? WOODS.Walnut;
  const metalLegs = legs.toLowerCase().includes("metal");

  return (
    <svg viewBox="0 0 760 420" role="img" aria-label={`Rendered ${material} sideboard`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="studio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7f5f0" />
          <stop offset="78%" stopColor="#efece5" />
          <stop offset="78.2%" stopColor="#e4e0d7" />
          <stop offset="100%" stopColor="#dad5ca" />
        </linearGradient>
        <linearGradient id="woodface" x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0%" stopColor={wood.base} />
          <stop offset="55%" stopColor={wood.grain} />
          <stop offset="100%" stopColor={wood.base} />
        </linearGradient>
        <linearGradient id="stonetop" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#efe9dd" />
          <stop offset="50%" stopColor="#e2d9c8" />
          <stop offset="100%" stopColor="#ece5d6" />
        </linearGradient>
      </defs>

      <rect width="760" height="420" fill="url(#studio)" />
      {/* Soft shadow */}
      <ellipse cx="380" cy="368" rx="270" ry="22" fill="#5a4f3f" opacity="0.18" />

      {/* Stone top */}
      <rect x="110" y="130" width="540" height="16" rx="3" fill="url(#stonetop)" stroke="#c9bfa9" strokeWidth="1" />
      <path d="M 130 138 q 60 4 120 -2 M 300 140 q 80 -4 150 2 M 500 136 q 60 4 120 -1" stroke="#cfc4ac" strokeWidth="1.2" fill="none" opacity="0.8" />

      {/* Carcass */}
      <rect x="118" y="146" width="524" height="176" rx="4" fill="url(#woodface)" />
      {/* Left door */}
      <rect x="126" y="154" width="150" height="160" rx="2" fill={wood.base} stroke={wood.dark} strokeWidth="1.5" />
      <path d="M 140 170 q 50 8 122 2 M 138 210 q 60 10 126 3 M 140 250 q 55 6 122 2 M 138 290 q 62 8 126 2" stroke={wood.grain} strokeWidth="2" fill="none" opacity="0.75" />
      {/* Center open shelf */}
      <rect x="284" y="154" width="192" height="160" fill={wood.dark} />
      <rect x="284" y="230" width="192" height="8" fill={wood.base} />
      <ellipse cx="340" cy="222" rx="26" ry="9" fill="#3b332b" />
      <ellipse cx="340" cy="219" rx="26" ry="9" fill="#57493c" />
      <rect x="392" y="196" width="64" height="10" rx="2" fill="#efe7d6" />
      <rect x="396" y="184" width="56" height="12" rx="2" fill="#ddd2ba" />
      <rect x="300" y="292" width="80" height="14" rx="2" fill="#d8cdb6" />
      <rect x="300" y="278" width="80" height="14" rx="2" fill="#cabfa5" />
      {/* Right door */}
      <rect x="484" y="154" width="150" height="160" rx="2" fill={wood.base} stroke={wood.dark} strokeWidth="1.5" />
      <path d="M 498 176 q 55 6 122 2 M 496 216 q 62 8 126 2 M 498 256 q 50 8 122 2 M 496 296 q 60 10 126 3" stroke={wood.grain} strokeWidth="2" fill="none" opacity="0.75" />

      {/* Legs */}
      {metalLegs ? (
        <g fill="#2b2926">
          <rect x="150" y="322" width="10" height="44" rx="2" />
          <rect x="600" y="322" width="10" height="44" rx="2" />
          <rect x="150" y="360" width="70" height="8" rx="3" />
          <rect x="540" y="360" width="70" height="8" rx="3" />
        </g>
      ) : (
        <g fill={wood.dark}>
          <path d="M 152 322 l 14 0 l -4 44 l -8 0 Z" />
          <path d="M 594 322 l 14 0 l -4 44 l -8 0 Z" />
          <path d="M 300 322 l 12 0 l -3 40 l -6 0 Z" opacity="0.9" />
        </g>
      )}

      {/* Highlight sweep */}
      <rect x="118" y="146" width="524" height="40" fill="#fff" opacity="0.07" />
    </svg>
  );
}
