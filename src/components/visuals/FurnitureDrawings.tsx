const INK = "#1c1a17";
const DIM = "#6d675d";

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={DIM} strokeWidth="1" fill="none">
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fontSize="13" fill={DIM} stroke="none" fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  );
}

function DimV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  return (
    <g stroke={DIM} strokeWidth="1" fill="none">
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} />
      <line x1={x - 5} y1={y2} x2={x + 5} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <text x={x + 8} y={(y1 + y2) / 2 + 4} fontSize="13" fill={DIM} stroke="none" fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  );
}

/** Dimensioned front elevation (96" W × 30" H, legs 5"). */
export function FrontViewDrawing() {
  return (
    <svg viewBox="0 0 440 260" role="img" aria-label="Front view drawing with dimensions" style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none">
        <rect x="60" y="60" width="320" height="110" />
        <line x1="60" y1="72" x2="380" y2="72" />
        <rect x="70" y="80" width="88" height="82" />
        <rect x="282" y="80" width="88" height="82" />
        <line x1="166" y1="120" x2="274" y2="120" />
        <line x1="80" y1="170" x2="80" y2="200" />
        <line x1="360" y1="170" x2="360" y2="200" />
        <line x1="66" y1="200" x2="110" y2="200" />
        <line x1="330" y1="200" x2="374" y2="200" />
      </g>
      <DimH x1={60} x2={380} y={40} label={'96"'} />
      <DimH x1={70} x2={158} y={225} label={'21 ¼"'} />
      <DimH x1={166} x2={274} y={225} label={'48"'} />
      <DimH x1={282} x2={370} y={225} label={'21 ¼"'} />
      <DimV y1={60} y2={170} x={404} label={'30"'} />
      <DimV y1={170} y2={200} x={40} label={'5"'} />
    </svg>
  );
}

/** Dimensioned side elevation (20" D × 30" H). */
export function SideViewDrawing() {
  return (
    <svg viewBox="0 0 300 260" role="img" aria-label="Side view drawing with dimensions" style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none">
        <rect x="100" y="60" width="90" height="110" />
        <line x1="100" y1="72" x2="190" y2="72" />
        <line x1="100" y1="120" x2="190" y2="120" />
        <line x1="112" y1="170" x2="112" y2="200" />
        <line x1="178" y1="170" x2="178" y2="200" />
        <line x1="104" y1="200" x2="140" y2="200" />
        <line x1="150" y1="200" x2="186" y2="200" />
      </g>
      <DimH x1={100} x2={190} y={40} label={'20"'} />
      <DimV y1={60} y2={170} x={220} label={'30"'} />
      <DimV y1={170} y2={200} x={76} label={'5"'} />
    </svg>
  );
}

/** Dimensioned top view (96" W × 20" D). */
export function TopViewDrawing() {
  return (
    <svg viewBox="0 0 440 200" role="img" aria-label="Top view drawing with dimensions" style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none">
        <rect x="60" y="70" width="320" height="70" />
        <rect x="66" y="76" width="308" height="58" strokeDasharray="5 4" strokeWidth="1.2" />
      </g>
      <DimH x1={60} x2={380} y={46} label={'96"'} />
      <DimV y1={70} y2={140} x={404} label={'20"'} />
    </svg>
  );
}
