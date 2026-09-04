/** Shared geometry for the sample floor plan (viewBox 0 0 900 560). */

export interface RoomRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: "wood" | "tile" | "stone";
}

export const PLAN_VIEWBOX = "0 0 900 560";

export const ROOM_RECTS: RoomRect[] = [
  { id: "primary-bedroom", x: 40, y: 40, w: 270, h: 230, floor: "wood" },
  { id: "bedroom-2", x: 40, y: 310, w: 240, h: 210, floor: "wood" },
  { id: "bathroom", x: 310, y: 40, w: 150, h: 170, floor: "tile" },
  { id: "laundry", x: 310, y: 390, w: 150, h: 130, floor: "tile" },
  { id: "kitchen", x: 460, y: 40, w: 240, h: 190, floor: "stone" },
  { id: "dining", x: 700, y: 40, w: 160, h: 250, floor: "wood" },
  { id: "living-room", x: 460, y: 230, w: 400, h: 290, floor: "wood" },
];

/** Circulation flows drawn in the Circulation view. */
export const PRIMARY_FLOW = "M 870 380 L 640 380 L 640 250 L 560 250";
export const SECONDARY_FLOWS = [
  "M 640 380 L 400 380 L 400 260 L 310 200",
  "M 400 380 L 160 380 L 160 310",
  "M 400 260 L 400 150 L 460 150",
];
