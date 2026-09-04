import type { DetectedRoom } from "../../data/rooms";
import { PLAN_VIEWBOX } from "./planGeometry";

interface FloorPlanSketchProps {
  rooms: DetectedRoom[];
  onRoomClick?: (roomId: string) => void;
  activeRoomId?: string | null;
}

/**
 * Black-and-white 2D architectural floor plan (the "uploaded" sample),
 * with clickable detected-room labels layered on top.
 */
export function FloorPlanSketch({ rooms, onRoomClick, activeRoomId }: FloorPlanSketchProps) {
  return (
    <svg viewBox={PLAN_VIEWBOX} role="img" aria-label="Uploaded floor plan with detected room labels" style={{ width: "100%", height: "auto" }}>
      <rect x="0" y="0" width="900" height="560" fill="#fff" />

      {/* Outer walls */}
      <g stroke="#141414" strokeWidth="8" fill="none">
        <rect x="40" y="40" width="820" height="480" />
      </g>

      {/* Interior walls */}
      <g stroke="#141414" strokeWidth="5" fill="none">
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

      {/* Windows (double lines on outer wall) */}
      <g stroke="#141414" strokeWidth="1.5">
        {[
          [90, 40, 200, 40],
          [520, 40, 640, 40],
          [740, 40, 830, 40],
          [40, 90, 40, 200],
          [40, 350, 40, 470],
          [560, 520, 700, 520],
          [740, 520, 830, 520],
          [860, 120, 860, 240],
        ].map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="8" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <line
              x1={x1 === x2 ? x1 - 3 : x1}
              y1={y1 === y2 ? y1 - 3 : y1}
              x2={x1 === x2 ? x2 - 3 : x2}
              y2={y1 === y2 ? y2 - 3 : y2}
            />
            <line
              x1={x1 === x2 ? x1 + 3 : x1}
              y1={y1 === y2 ? y1 + 3 : y1}
              x2={x1 === x2 ? x2 + 3 : x2}
              y2={y1 === y2 ? y2 + 3 : y2}
            />
          </g>
        ))}
      </g>

      {/* Door swings */}
      <g stroke="#141414" strokeWidth="1.5" fill="none">
        <path d="M 230 270 A 30 30 0 0 1 200 300" />
        <line x1="230" y1="270" x2="230" y2="300" strokeWidth="2.5" />
        <path d="M 150 310 A 30 30 0 0 1 120 280" />
        <line x1="150" y1="310" x2="150" y2="280" strokeWidth="2.5" />
        <path d="M 310 170 A 30 30 0 0 0 280 140" />
        <line x1="310" y1="170" x2="280" y2="170" strokeWidth="2.5" />
        <path d="M 590 230 A 30 30 0 0 1 560 200" />
        <path d="M 700 150 A 30 30 0 0 0 670 120" />
        <path d="M 460 145 A 25 25 0 0 1 435 120" />
        <path d="M 430 390 A 30 30 0 0 1 400 360" />
        {/* Entry door */}
        <path d="M 860 330 A 45 45 0 0 0 815 375" strokeWidth="2" />
        <line x1="860" y1="330" x2="860" y2="375" strokeWidth="4" />
      </g>

      {/* Light fixture-line furniture hints */}
      <g stroke="#8a8a8a" strokeWidth="1.5" fill="none">
        {/* Primary bed */}
        <rect x="70" y="90" width="120" height="150" rx="4" />
        <rect x="78" y="98" width="46" height="30" rx="3" />
        <rect x="136" y="98" width="46" height="30" rx="3" />
        {/* Bedroom 2 bed */}
        <rect x="66" y="360" width="100" height="130" rx="4" />
        <rect x="74" y="368" width="84" height="26" rx="3" />
        {/* Bath fixtures */}
        <rect x="330" y="52" width="60" height="34" rx="4" />
        <circle cx="360" cy="69" r="8" />
        <rect x="400" y="52" width="48" height="60" rx="6" />
        <rect x="330" y="140" width="56" height="56" rx="4" />
        {/* Kitchen counter + island */}
        <rect x="470" y="48" width="220" height="34" />
        <rect x="520" y="130" width="120" height="44" rx="3" />
        {/* Dining table */}
        <rect x="730" y="110" width="100" height="120" rx="6" />
        {/* Living sofa */}
        <rect x="620" y="300" width="180" height="60" rx="8" />
        <rect x="620" y="360" width="60" height="70" rx="8" />
        <circle cx="590" cy="420" r="26" />
        {/* Laundry machines */}
        <rect x="322" y="400" width="42" height="42" rx="4" />
        <rect x="370" y="400" width="42" height="42" rx="4" />
      </g>

      {/* Detected room labels */}
      {rooms.map((room) => {
        const width = room.label.length * 7.6 + 28;
        const isActive = activeRoomId === room.id;
        return (
          <g
            key={room.id}
            role={onRoomClick ? "button" : undefined}
            tabIndex={onRoomClick ? 0 : undefined}
            style={{ cursor: onRoomClick ? "pointer" : "default" }}
            onClick={() => onRoomClick?.(room.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onRoomClick?.(room.id);
            }}
            aria-label={`Room label: ${room.label}. Click to change.`}
          >
            <rect
              x={room.x - width / 2}
              y={room.y - 16}
              width={width}
              height={32}
              rx={8}
              fill={isActive ? "#141414" : "#fff"}
              stroke={isActive ? "#141414" : "#d6d3cc"}
              strokeWidth="1.5"
              filter="drop-shadow(0 2px 4px rgb(0 0 0 / 0.12))"
            />
            <text
              x={room.x}
              y={room.y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight={600}
              fontFamily="Inter, sans-serif"
              fill={isActive ? "#fff" : "#141414"}
            >
              {room.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
