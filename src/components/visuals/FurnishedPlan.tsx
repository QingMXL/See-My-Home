import type { DetectedRoom } from "../../data/rooms";
import { PLAN_VIEWBOX, PRIMARY_FLOW, ROOM_RECTS, SECONDARY_FLOWS } from "./planGeometry";

export type PlanView = "design" | "furniture" | "circulation" | "labels";

interface FurnishedPlanProps {
  view: PlanView;
  rooms: DetectedRoom[];
}

const FLOOR_FILLS: Record<string, string> = {
  wood: "url(#wood)",
  tile: "url(#tile)",
  stone: "#e8e4dc",
};

/**
 * The generated result: still a top-down floor plan, but furnished with
 * materials, furniture, and light depth (PRD §10 layers 1–4).
 */
export function FurnishedPlan({ view, rooms }: FurnishedPlanProps) {
  const muted = view === "furniture";
  const showCirculation = view === "circulation";
  const showLabels = view === "labels";

  return (
    <svg viewBox={PLAN_VIEWBOX} role="img" aria-label={`Generated home layout — ${view} view`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <pattern id="wood" width="46" height="14" patternUnits="userSpaceOnUse">
          <rect width="46" height="14" fill="#d9bb90" />
          <rect width="46" height="7" y="7" fill="#000" opacity="0.03" />
          <line x1="0" y1="0" x2="46" y2="0" stroke="#c3a175" strokeWidth="1" />
          <line x1="23" y1="0" x2="23" y2="7" stroke="#c3a175" strokeWidth="0.8" />
          <line x1="0" y1="7" x2="46" y2="7" stroke="#c3a175" strokeWidth="1" />
          <line x1="8" y1="7" x2="8" y2="14" stroke="#c3a175" strokeWidth="0.8" />
        </pattern>
        <pattern id="tile" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#eceae4" />
          <path d="M 24 0 H 0 V 24" fill="none" stroke="#d8d5cc" strokeWidth="1.2" />
        </pattern>
        <radialGradient id="roomlight" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#5a4a30" stopOpacity="0.16" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#3a2f1e" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="0" y="0" width="900" height="560" fill="#f4f1ea" />

      {/* Layer 2 — material floors */}
      <g opacity={muted ? 0.25 : 1}>
        {ROOM_RECTS.map((r) => (
          <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={FLOOR_FILLS[r.floor]} />
        ))}
        {/* Rugs */}
        <rect x="560" y="300" width="220" height="150" rx="10" fill="#b9c4b1" opacity="0.85" />
        <rect x="572" y="312" width="196" height="126" rx="8" fill="none" stroke="#98a68e" strokeWidth="2" />
        <rect x="86" y="110" width="160" height="120" rx="8" fill="#cbd2c4" opacity="0.8" />
        <ellipse cx="120" cy="420" rx="55" ry="42" fill="#ccc4b2" opacity="0.85" />
        {/* Ambient light */}
        <rect x="40" y="40" width="820" height="480" fill="url(#roomlight)" />
      </g>

      {/* Layer 3 — furnishing */}
      <g filter="url(#soft)">
        {/* Primary bedroom */}
        <g>
          <rect x="70" y="80" width="130" height="160" rx="8" fill="#f0ead9" stroke="#c9bd9f" strokeWidth="2" />
          <rect x="70" y="80" width="130" height="34" rx="8" fill="#dfd4ba" />
          <rect x="80" y="88" width="50" height="22" rx="5" fill="#fdfbf4" />
          <rect x="140" y="88" width="50" height="22" rx="5" fill="#fdfbf4" />
          <rect x="82" y="196" width="106" height="30" rx="5" fill="#9caf88" opacity="0.9" />
          <rect x="46" y="90" width="16" height="34" rx="3" fill="#8a6f4d" />
          <rect x="212" y="90" width="16" height="34" rx="3" fill="#8a6f4d" />
          <rect x="230" y="150" width="70" height="26" rx="4" fill="#8a6f4d" />
        </g>
        {/* Bedroom 2 — twin beds */}
        <g>
          <rect x="60" y="350" width="70" height="110" rx="6" fill="#f0ead9" stroke="#c9bd9f" strokeWidth="2" />
          <rect x="60" y="350" width="70" height="24" rx="6" fill="#dfd4ba" />
          <rect x="160" y="350" width="70" height="110" rx="6" fill="#f0ead9" stroke="#c9bd9f" strokeWidth="2" />
          <rect x="160" y="350" width="70" height="24" rx="6" fill="#dfd4ba" />
          <rect x="240" y="430" width="34" height="80" rx="4" fill="#8a6f4d" />
          <rect x="56" y="480" width="90" height="26" rx="4" fill="#a58a5e" />
        </g>
        {/* Bathroom */}
        <g>
          <rect x="322" y="50" width="70" height="32" rx="5" fill="#fdfcf8" stroke="#c2beb2" strokeWidth="1.5" />
          <circle cx="340" cy="66" r="9" fill="#e3e0d6" />
          <circle cx="374" cy="66" r="9" fill="#e3e0d6" />
          <rect x="400" y="48" width="52" height="66" rx="8" fill="#dce4e6" stroke="#aab8bc" strokeWidth="1.5" />
          <rect x="326" y="140" width="54" height="58" rx="6" fill="#fdfcf8" stroke="#c2beb2" strokeWidth="1.5" />
          <circle cx="353" cy="169" r="14" fill="#e6ecee" />
          <rect x="412" y="150" width="34" height="48" rx="10" fill="#fdfcf8" stroke="#c2beb2" strokeWidth="1.5" />
        </g>
        {/* Kitchen */}
        <g>
          <rect x="468" y="46" width="228" height="38" rx="4" fill="#e9e2d2" stroke="#c6bba2" strokeWidth="1.5" />
          <rect x="560" y="50" width="46" height="30" rx="3" fill="#c9cdd2" />
          <circle cx="500" cy="64" r="10" fill="#d7dade" />
          <rect x="660" y="50" width="30" height="30" rx="3" fill="#b9bfc6" />
          <rect x="510" y="128" width="150" height="52" rx="8" fill="#f3efe6" stroke="#cfc4ab" strokeWidth="2" />
          <circle cx="540" cy="196" r="9" fill="#4b4237" />
          <circle cx="570" cy="196" r="9" fill="#4b4237" />
          <circle cx="600" cy="196" r="9" fill="#4b4237" />
          <circle cx="630" cy="196" r="9" fill="#4b4237" />
        </g>
        {/* Dining */}
        <g>
          <rect x="722" y="100" width="110" height="140" rx="10" fill="#a58a5e" />
          <rect x="732" y="110" width="90" height="120" rx="8" fill="#b89a6a" />
          {[125, 165, 205].map((y) => (
            <g key={y}>
              <rect x="700" y={y} width="18" height="24" rx="5" fill="#5d5548" />
              <rect x="836" y={y} width="18" height="24" rx="5" fill="#5d5548" />
            </g>
          ))}
          <ellipse cx="777" cy="170" rx="16" ry="12" fill="#7c8a68" />
        </g>
        {/* Living room */}
        <g>
          <rect x="600" y="300" width="200" height="56" rx="12" fill="#efe9dc" stroke="#cec2a8" strokeWidth="2" />
          <rect x="600" y="356" width="56" height="94" rx="12" fill="#efe9dc" stroke="#cec2a8" strokeWidth="2" />
          {[612, 660, 708, 756].map((x) => (
            <rect key={x} x={x} y="306" width="40" height="22" rx="6" fill="#faf7ef" />
          ))}
          <circle cx="700" cy="405" r="26" fill="#8a6f4d" />
          <circle cx="700" cy="405" r="18" fill="#a58a5e" />
          <rect x="820" y="310" width="26" height="130" rx="4" fill="#4b4237" />
          <rect x="826" y="320" width="14" height="110" rx="2" fill="#20242a" />
          <circle cx="530" cy="480" r="24" fill="#93a687" />
          <rect x="470" y="240" width="72" height="26" rx="5" fill="#8a6f4d" />
        </g>
        {/* Laundry */}
        <g>
          <rect x="320" y="398" width="44" height="44" rx="6" fill="#f2f2f0" stroke="#bcbcb6" strokeWidth="1.5" />
          <circle cx="342" cy="420" r="13" fill="#cfd4d8" />
          <rect x="372" y="398" width="44" height="44" rx="6" fill="#f2f2f0" stroke="#bcbcb6" strokeWidth="1.5" />
          <circle cx="394" cy="420" r="13" fill="#cfd4d8" />
          <rect x="322" y="460" width="94" height="24" rx="4" fill="#e0dccf" />
        </g>
        {/* Plants */}
        <circle cx="480" cy="500" r="14" fill="#6f8760" />
        <circle cx="845" cy="60" r="12" fill="#6f8760" />
      </g>

      {/* Layer 1 — black architectural lines on top */}
      <g stroke="#181614" strokeWidth="8" fill="none">
        <rect x="40" y="40" width="820" height="480" />
      </g>
      <g stroke="#181614" strokeWidth="5" fill="none">
        <line x1="310" y1="40" x2="310" y2="140" />
        <line x1="310" y1="200" x2="310" y2="270" />
        <line x1="40" y1="270" x2="200" y2="270" />
        <line x1="260" y1="270" x2="310" y2="270" />
        <line x1="40" y1="310" x2="120" y2="310" />
        <line x1="180" y1="310" x2="280" y2="310" />
        <line x1="280" y1="310" x2="280" y2="520" />
        <line x1="310" y1="210" x2="460" y2="210" />
        <line x1="460" y1="40" x2="460" y2="120" />
        <line x1="460" y1="170" x2="460" y2="210" />
        <line x1="460" y1="230" x2="560" y2="230" />
        <line x1="620" y1="230" x2="700" y2="230" />
        <line x1="700" y1="40" x2="700" y2="120" />
        <line x1="700" y1="180" x2="700" y2="230" />
        <line x1="310" y1="390" x2="400" y2="390" />
        <line x1="310" y1="270" x2="310" y2="520" />
        <line x1="460" y1="390" x2="460" y2="520" />
        <line x1="400" y1="390" x2="460" y2="390" />
      </g>

      {/* Circulation overlay */}
      {showCirculation && (
        <g fill="none" strokeLinecap="round">
          <path d={PRIMARY_FLOW} stroke="#2563eb" strokeWidth="5" strokeDasharray="2 14" />
          {SECONDARY_FLOWS.map((d) => (
            <path key={d} d={d} stroke="#16a34a" strokeWidth="4" strokeDasharray="2 12" />
          ))}
          <circle cx="870" cy="380" r="14" fill="#2563eb" />
          <text x="870" y="385" textAnchor="middle" fontSize="12" fontWeight={700} fill="#fff" fontFamily="Inter, sans-serif">
            E
          </text>
        </g>
      )}

      {/* Room label overlay */}
      {showLabels &&
        rooms.map((room) => {
          const width = room.label.length * 7.6 + 28;
          return (
            <g key={room.id}>
              <rect
                x={room.x - width / 2}
                y={room.y - 16}
                width={width}
                height={32}
                rx={8}
                fill="#141414"
                opacity="0.88"
              />
              <text x={room.x} y={room.y + 5} textAnchor="middle" fontSize="14" fontWeight={600} fill="#fff" fontFamily="Inter, sans-serif">
                {room.label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
