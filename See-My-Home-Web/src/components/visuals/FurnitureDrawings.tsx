import type { FurnitureDimensions, FurnitureTopShape } from "../../lib/homeFurnitureApi";

const INK = "#1c1a17";
const DIM = "#6d675d";

export interface FurnitureDrawingProps {
  dimensions: FurnitureDimensions;
  topShape: FurnitureTopShape;
  baseStyle: string;
  supportCount: number;
}

function mm(value: number) {
  return `${value.toLocaleString()} mm`;
}

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={DIM} strokeWidth="1" fill="none">
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fontSize="12" fill={DIM} stroke="none" fontFamily="Inter, sans-serif">
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
      <text x={x + 8} y={(y1 + y2) / 2 + 4} fontSize="12" fill={DIM} stroke="none" fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  );
}

function BaseElevation({ baseStyle, supportCount, left, right, top, bottom }: {
  baseStyle: string;
  supportCount: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  const style = baseStyle.toLowerCase();
  const mid = (left + right) / 2;
  if (style.includes("pedestal") || style.includes("tulip")) {
    return <path d={`M ${mid - 8} ${top} L ${mid + 8} ${top} L ${mid + 14} ${bottom - 5} L ${mid + 55} ${bottom} L ${mid - 55} ${bottom} L ${mid - 14} ${bottom - 5} Z`} />;
  }
  if (style.includes("trestle")) {
    return (
      <>
        <path d={`M ${left + 42} ${top} L ${left + 58} ${top} L ${left + 68} ${bottom} L ${left + 30} ${bottom} Z`} />
        <path d={`M ${right - 58} ${top} L ${right - 42} ${top} L ${right - 30} ${bottom} L ${right - 68} ${bottom} Z`} />
        <line x1={left + 48} y1={(top + bottom) / 2} x2={right - 48} y2={(top + bottom) / 2} />
      </>
    );
  }
  const supports = Math.max(2, Math.min(4, supportCount));
  return (
    <>
      <path d={`M ${left + 25} ${top} L ${left + 38} ${top} L ${left + 34} ${bottom} L ${left + 27} ${bottom} Z`} />
      <path d={`M ${right - 38} ${top} L ${right - 25} ${top} L ${right - 27} ${bottom} L ${right - 34} ${bottom} Z`} />
      {supports > 2 && <line x1={mid - 5} y1={top} x2={mid - 5} y2={bottom} opacity="0.45" />}
    </>
  );
}

export function FrontViewDrawing({ dimensions, baseStyle, supportCount }: FurnitureDrawingProps) {
  const left = 48;
  const right = 382;
  const top = 62;
  const topBottom = 78;
  const bottom = 202;
  return (
    <svg viewBox="0 0 440 260" role="img" aria-label={`Front view ${mm(dimensions.width)} by ${mm(dimensions.height)}`} style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none" strokeLinejoin="round">
        <rect x={left} y={top} width={right - left} height={topBottom - top} rx="3" />
        <BaseElevation baseStyle={baseStyle} supportCount={supportCount} left={left} right={right} top={topBottom} bottom={bottom} />
      </g>
      <DimH x1={left} x2={right} y={40} label={mm(dimensions.width)} />
      <DimV y1={top} y2={bottom} x={408} label={mm(dimensions.height)} />
    </svg>
  );
}

export function SideViewDrawing({ dimensions, baseStyle, supportCount }: FurnitureDrawingProps) {
  const left = 70;
  const right = 226;
  const top = 62;
  const topBottom = 78;
  const bottom = 202;
  return (
    <svg viewBox="0 0 300 260" role="img" aria-label={`Side view ${mm(dimensions.depth)} by ${mm(dimensions.height)}`} style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none" strokeLinejoin="round">
        <rect x={left} y={top} width={right - left} height={topBottom - top} rx="3" />
        <BaseElevation baseStyle={baseStyle} supportCount={supportCount} left={left} right={right} top={topBottom} bottom={bottom} />
      </g>
      <DimH x1={left} x2={right} y={40} label={mm(dimensions.depth)} />
      <DimV y1={top} y2={bottom} x={254} label={mm(dimensions.height)} />
    </svg>
  );
}

export function TopViewDrawing({ dimensions, topShape, baseStyle }: FurnitureDrawingProps) {
  const x = 54;
  const y = 62;
  const width = 328;
  const height = 88;
  const shape = topShape === "round" || topShape === "oval"
    ? <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} />
    : topShape === "freeform"
      ? <path d={`M ${x + 12} ${y + 8} Q ${x + width * 0.35} ${y - 8}, ${x + width - 8} ${y + 12} Q ${x + width + 8} ${y + height * 0.55}, ${x + width - 18} ${y + height - 5} Q ${x + width * 0.45} ${y + height + 8}, ${x + 8} ${y + height - 10} Q ${x - 8} ${y + height * 0.4}, ${x + 12} ${y + 8} Z`} />
      : <rect x={x} y={y} width={width} height={height} rx={topShape === "square" ? 2 : 8} />;
  return (
    <svg viewBox="0 0 440 210" role="img" aria-label={`Top view ${mm(dimensions.width)} by ${mm(dimensions.depth)}`} style={{ width: "100%", height: "auto" }}>
      <g stroke={INK} strokeWidth="2" fill="none">{shape}</g>
      <g stroke={DIM} strokeWidth="1" fill="none" strokeDasharray="5 4" opacity="0.7">
        <rect x={x + 20} y={y + 14} width={width - 40} height={height - 28} rx="4" />
      </g>
      <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize="11" fill={DIM}>{baseStyle}</text>
      <DimH x1={x} x2={x + width} y={40} label={mm(dimensions.width)} />
      <DimV y1={y} y2={y + height} x={408} label={mm(dimensions.depth)} />
    </svg>
  );
}
