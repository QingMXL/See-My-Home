import type { DetectedRoom } from "../../data/rooms";
import type { AnalyzedLayoutBoundary, AnalyzedLayoutOpening, LayoutPlacement, LayoutRenderPlan } from "../../lib/homeLayoutApi";
import type { PlanView } from "./FurnishedPlan";
import {
  Armchair,
  Archive,
  Bath,
  BedDouble,
  BookOpen,
  Boxes,
  CookingPot,
  Laptop,
  Refrigerator,
  ShowerHead,
  Sofa,
  Table2,
  Toilet,
  Tv,
  WashingMachine,
  Waves,
  type LucideIcon,
} from "lucide-react";

interface ConfirmedLayoutPlanProps {
  imageUrl: string;
  imageAlt: string;
  rooms: DetectedRoom[];
  boundaries: AnalyzedLayoutBoundary[];
  openings: AnalyzedLayoutOpening[];
  renderPlan: LayoutRenderPlan;
  view: PlanView;
  roomLabel: (room: DetectedRoom) => string;
}

const ROOM_COLORS: Record<string, string> = {
  living_room: "#d9e9df",
  family_room: "#d9e9df",
  dining_room: "#f2e2c7",
  kitchen: "#d7e3ef",
  primary_bedroom: "#eadce7",
  guest_bedroom: "#e7ddec",
  kids_room: "#f2dfd0",
  nursery: "#f3e3d9",
  home_office: "#dce7e4",
  walk_in_closet: "#e4ded6",
  bathroom: "#d6e8e8",
  powder_room: "#d6e8e8",
  laundry_room: "#dedfe5",
  balcony: "#dce8d3",
};

const PLACEMENT_ICONS: Record<LayoutPlacement["kind"], LucideIcon> = {
  sofa: Sofa,
  tv: Tv,
  coffee_table: Table2,
  dining_table: Table2,
  bed: BedDouble,
  wardrobe: Archive,
  desk: Laptop,
  bookshelf: BookOpen,
  counter: Boxes,
  sink: Waves,
  cooktop: CookingPot,
  refrigerator: Refrigerator,
  toilet: Toilet,
  vanity: Archive,
  shower: ShowerHead,
  bathtub: Bath,
  washer: WashingMachine,
  storage: Boxes,
  outdoor_seating: Armchair,
};

function PlacementIcon({ placement }: { placement: LayoutPlacement }) {
  const Icon = PLACEMENT_ICONS[placement.kind];
  return (
    <span
      className={`confirmed-layout-furniture confirmed-layout-furniture--${placement.kind}`}
      style={{
        left: `${(placement.x - placement.width / 2) * 100}%`,
        top: `${(placement.y - placement.height / 2) * 100}%`,
        width: `${placement.width * 100}%`,
        height: `${placement.height * 100}%`,
        transform: `rotate(${placement.rotation_deg}deg)`,
      }}
      title={placement.kind.replaceAll("_", " ")}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} />
    </span>
  );
}

export function ConfirmedLayoutPlan({
  imageUrl,
  imageAlt,
  rooms,
  boundaries,
  openings,
  renderPlan,
  view,
  roomLabel,
}: ConfirmedLayoutPlanProps) {
  const showLabels = view === "design";
  return (
    <div className="confirmed-layout-stage">
      <img className="confirmed-layout-source" src={imageUrl} alt={imageAlt} />
      <svg className="confirmed-layout-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        {rooms.map((room) => room.polygon && (
          <polygon
            key={room.id}
            points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
            fill={ROOM_COLORS[room.functionCode ?? ""] ?? "#e8e4dc"}
            className="confirmed-layout-room"
          />
        ))}
        {boundaries.map((boundary) => <polyline key={boundary.id} points={boundary.path.map(([x, y]) => `${x},${y}`).join(" ")} className={`confirmed-layout-boundary confirmed-layout-boundary--${boundary.kind}`} />)}
        {openings.map((opening) => <circle key={opening.id} cx={opening.position[0]} cy={opening.position[1]} r={opening.kind === "window" ? 0.008 : 0.006} className={`confirmed-layout-opening confirmed-layout-opening--${opening.kind}`} />)}
      </svg>
      <div className="confirmed-layout-furniture-layer">{renderPlan.placements.map((placement) => <PlacementIcon key={placement.id} placement={placement} />)}</div>
      {showLabels && (
        <div className="confirmed-layout-labels">
          {rooms.map((room) => {
            const anchor = room.labelAnchor ?? [room.x / 900, room.y / 560];
            return <span key={room.id} style={{ left: `${anchor[0] * 100}%`, top: `${anchor[1] * 100}%` }}>{roomLabel(room)}</span>;
          })}
        </div>
      )}
    </div>
  );
}
