import type { StyleTemplate } from "../../data/styleTemplates";

interface RoomSceneProps {
  /** "photo" renders the neutral uploaded room; "render" applies a template's palette. */
  variant: "photo" | "render";
  template?: StyleTemplate;
  /** Refinement count nudges the render warmer so iterations feel alive. */
  refinementLevel?: number;
}

const NEUTRAL = { wall: "#eeeae2", accent: "#c9c2b4", sofa: "#e6e0d3", floor: "#d9c4a3", art: "#b8b0a1" };

/**
 * A flat editorial illustration of a living room. The same scene is used for
 * the "uploaded photo" and the generated render — the palette shift sells the
 * before/after transformation without shipping raster images.
 */
export function RoomScene({ variant, template, refinementLevel = 0 }: RoomSceneProps) {
  const p = variant === "render" && template ? template.palette : null;
  const warm = Math.min(refinementLevel * 0.06, 0.2);
  const wall = p ? p.from : NEUTRAL.wall;
  const wallDeep = p ? p.to : NEUTRAL.accent;
  const sofa = p ? mix(p.from, "#ffffff", 0.5) : NEUTRAL.sofa;
  const accent = p ? p.accent : NEUTRAL.art;
  const line = p ? p.line : "#6b6558";
  const floor = p ? mix(p.accent, "#e4c99b", 0.65) : NEUTRAL.floor;

  return (
    <svg viewBox="0 0 800 520" role="img" aria-label={variant === "photo" ? "Uploaded room photo" : "Generated room render"} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id={`wall-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mix(wall, "#ffffff", 0.4)} />
          <stop offset="100%" stopColor={wall} />
        </linearGradient>
        <linearGradient id={`glow-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7e0" stopOpacity={0.55 + warm} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Walls + floor */}
      <rect width="800" height="380" fill={`url(#wall-${variant})`} />
      <rect y="380" width="800" height="140" fill={floor} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={i * 100 - 40} y1="380" x2={i * 100 + 10} y2="520" stroke={mix(floor, "#000", 0.12)} strokeWidth="1.5" />
      ))}

      {/* Window */}
      <rect x="40" y="60" width="220" height="300" rx="6" fill="#dfe8e2" stroke={line} strokeWidth="6" />
      <ellipse cx="115" cy="240" rx="90" ry="130" fill="#a9c29a" opacity="0.7" />
      <ellipse cx="190" cy="180" rx="70" ry="110" fill="#8fae7f" opacity="0.6" />
      <line x1="150" y1="60" x2="150" y2="360" stroke={line} strokeWidth="5" />
      <line x1="40" y1="210" x2="260" y2="210" stroke={line} strokeWidth="5" />
      <rect x="40" y="60" width="220" height="300" rx="6" fill="url(#glow-photo)" opacity="0.5" />

      {/* Wall art */}
      {variant === "render" ? (
        <g>
          <rect x="470" y="90" width="150" height="110" rx="4" fill="#fdfbf6" stroke={line} strokeWidth="4" />
          <circle cx="520" cy="140" r="26" fill={accent} />
          <rect x="556" y="118" width="40" height="60" fill={wallDeep} />
          <rect x="650" y="110" width="70" height="90" rx="4" fill={wallDeep} opacity="0.7" />
        </g>
      ) : (
        <rect x="500" y="100" width="120" height="90" rx="4" fill="#f6f4ee" stroke="#c9c2b4" strokeWidth="4" />
      )}

      {/* Pendant lights (render only) */}
      {variant === "render" && (
        <g>
          {[380, 440].map((x) => (
            <g key={x}>
              <line x1={x} y1="0" x2={x} y2="80" stroke={line} strokeWidth="3" />
              <path d={`M ${x - 22} 80 Q ${x} 118 ${x + 22} 80 Z`} fill={line} />
              <circle cx={x} cy="92" r="6" fill="#ffd98a" />
            </g>
          ))}
        </g>
      )}

      {/* Sofa */}
      <g>
        <rect x="300" y="270" width="300" height="80" rx="18" fill={sofa} stroke={mix(sofa, "#000", 0.18)} strokeWidth="3" />
        <rect x="300" y="238" width="300" height="52" rx="16" fill={mix(sofa, "#fff", 0.25)} stroke={mix(sofa, "#000", 0.15)} strokeWidth="3" />
        <rect x="286" y="256" width="34" height="90" rx="12" fill={sofa} stroke={mix(sofa, "#000", 0.18)} strokeWidth="3" />
        <rect x="580" y="256" width="34" height="90" rx="12" fill={sofa} stroke={mix(sofa, "#000", 0.18)} strokeWidth="3" />
        <rect x="330" y="250" width="54" height="34" rx="8" fill={variant === "render" ? accent : "#d6cfc0"} />
        <rect x="512" y="250" width="54" height="34" rx="8" fill={variant === "render" ? wallDeep : "#cfc8b8"} />
        {[330, 470, 585].map((x) => (
          <rect key={x} x={x} y="350" width="10" height="22" rx="3" fill={line} />
        ))}
      </g>

      {/* Rug */}
      <ellipse cx="460" cy="428" rx="230" ry="52" fill={variant === "render" ? mix(accent, "#fff", 0.6) : "#e3ddcf"} opacity="0.9" />

      {/* Coffee table */}
      <g>
        <ellipse cx="450" cy="408" rx="80" ry="26" fill={variant === "render" ? line : "#b9a684"} />
        <ellipse cx="450" cy="402" rx="80" ry="26" fill={variant === "render" ? mix(line, "#fff", 0.15) : "#c8b593"} />
        <ellipse cx="430" cy="398" rx="18" ry="7" fill={variant === "render" ? accent : "#efe9db"} />
        <rect x="482" y="392" width="30" height="8" rx="2" fill="#f3efe6" />
      </g>

      {/* Side chair */}
      <g>
        <rect x="650" y="280" width="90" height="26" rx="10" fill={mix(sofa, "#fff", 0.2)} stroke={mix(sofa, "#000", 0.16)} strokeWidth="3" transform="rotate(-8 695 293)" />
        <rect x="648" y="300" width="94" height="52" rx="14" fill={sofa} stroke={mix(sofa, "#000", 0.16)} strokeWidth="3" />
        <line x1="662" y1="352" x2="654" y2="384" stroke={line} strokeWidth="6" strokeLinecap="round" />
        <line x1="728" y1="352" x2="736" y2="384" stroke={line} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Plant */}
      <g>
        <path d="M 90 392 q -6 46 12 66 h 36 q 18 -20 12 -66 Z" fill={variant === "render" ? line : "#b9a684"} />
        <g stroke="#5f7d4f" strokeWidth="7" fill="none" strokeLinecap="round">
          <path d="M 120 392 Q 118 320 90 290" />
          <path d="M 120 392 Q 124 310 150 280" />
          <path d="M 120 392 Q 108 340 70 330" />
          <path d="M 120 392 Q 134 336 168 322" />
        </g>
      </g>

      {/* Sunlight wash */}
      <rect width="800" height="520" fill={`url(#glow-${variant})`} />
    </svg>
  );
}

/** Naive hex mix — good enough for illustration tinting. */
export function mix(hexA: string, hexB: string, amountOfB: number): string {
  const parse = (h: string) => {
    const s = h.replace("#", "");
    const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const a = parse(hexA);
  const b = parse(hexB);
  const t = Math.max(0, Math.min(1, amountOfB));
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
