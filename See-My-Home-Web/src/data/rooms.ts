export interface DetectedRoom {
  id: string;
  label: string;
  /** Position of the label inside the sample floor plan SVG (viewBox 0 0 900 560). */
  x: number;
  y: number;
  polygon?: number[][];
  labelAnchor?: [number, number];
  confidence?: number;
  boundaryConfidence?: number;
  boundaryStatus?: "unconfirmed" | "confirmed" | "needs_correction";
  functionCode?: RoomFunctionCode;
  functionStatus?: "inferred" | "confirmed";
  currentUse?: string;
  targetUse?: string | null;
  planningStatus?: "included" | "excluded" | "uncertain";
  exclusionReason?: "lightwell" | "double_height" | "void" | "shaft" | "outside_envelope" | "user_excluded" | "other" | null;
  excludedBy?: "agent" | "user";
}

/** US residential room labels the user can assign (PRD §7 Step 2). */
export const ROOM_TAG_LIBRARY = [
  "Living Room",
  "Family Room",
  "Dining Room",
  "Kitchen",
  "Primary Bedroom",
  "Guest Bedroom",
  "Kids' Room",
  "Nursery",
  "Home Office",
  "Walk-in Closet",
  "Bathroom",
  "Powder Room",
  "Laundry Room",
  "Pantry",
  "Mudroom",
  "Balcony",
  "Den",
  "Storage",
  "Garage",
  "Home Theater",
  "Fitness Room",
  "Game Room",
] as const;

export type RoomTag = (typeof ROOM_TAG_LIBRARY)[number];

export const ROOM_FUNCTIONS = [
  { code: "living_room", label: "Living Room" },
  { code: "family_room", label: "Family Room" },
  { code: "dining_room", label: "Dining Room" },
  { code: "kitchen", label: "Kitchen" },
  { code: "primary_bedroom", label: "Primary Bedroom" },
  { code: "guest_bedroom", label: "Guest Bedroom" },
  { code: "kids_room", label: "Kids' Room" },
  { code: "nursery", label: "Nursery" },
  { code: "home_office", label: "Home Office" },
  { code: "walk_in_closet", label: "Walk-in Closet" },
  { code: "bathroom", label: "Bathroom" },
  { code: "powder_room", label: "Powder Room" },
  { code: "laundry_room", label: "Laundry Room" },
  { code: "pantry", label: "Pantry" },
  { code: "mudroom", label: "Mudroom" },
  { code: "entry", label: "Entry" },
  { code: "balcony", label: "Balcony" },
  { code: "den", label: "Den" },
  { code: "storage", label: "Storage" },
  { code: "garage", label: "Garage" },
  { code: "home_theater", label: "Home Theater" },
  { code: "fitness_room", label: "Fitness Room" },
  { code: "game_room", label: "Game Room" },
  { code: "other", label: "Other" },
  { code: "unknown", label: "Needs confirmation" },
] as const;

export type RoomFunctionCode = (typeof ROOM_FUNCTIONS)[number]["code"];

const FUNCTION_ALIASES: Record<string, RoomFunctionCode> = {
  "living room": "living_room", 客厅: "living_room",
  "family room": "family_room", 起居室: "family_room",
  "dining room": "dining_room", dining: "dining_room", 餐厅: "dining_room",
  kitchen: "kitchen", 厨房: "kitchen",
  "primary bedroom": "primary_bedroom", "master bedroom": "primary_bedroom", 主卧: "primary_bedroom", 主卧室: "primary_bedroom",
  "guest bedroom": "guest_bedroom", 客卧: "guest_bedroom", 次卧: "guest_bedroom", 卧室: "guest_bedroom",
  "kids' room": "kids_room", "kids room": "kids_room", 儿童房: "kids_room",
  nursery: "nursery", 婴儿房: "nursery",
  "home office": "home_office", office: "home_office", 书房: "home_office", 办公室: "home_office",
  "walk-in closet": "walk_in_closet", "walk in closet": "walk_in_closet", 衣帽间: "walk_in_closet",
  bathroom: "bathroom", bath: "bathroom", 卫生间: "bathroom", 浴室: "bathroom",
  "powder room": "powder_room", 客卫: "powder_room",
  "laundry room": "laundry_room", laundry: "laundry_room", 洗衣房: "laundry_room",
  pantry: "pantry", 食品储藏室: "pantry",
  mudroom: "mudroom", 入户间: "mudroom",
  entry: "entry", foyer: "entry", 玄关: "entry",
  balcony: "balcony", 阳台: "balcony", 露台: "balcony",
  den: "den", 多功能室: "den",
  storage: "storage", 储藏室: "storage",
  garage: "garage", 车库: "garage",
  "home theater": "home_theater", 影音室: "home_theater",
  "fitness room": "fitness_room", gym: "fitness_room", 健身房: "fitness_room",
  "game room": "game_room", 游戏室: "game_room",
  other: "other", 其他: "other",
};

export function roomFunctionFrom(value: string | undefined): RoomFunctionCode {
  if (!value) return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  return FUNCTION_ALIASES[normalized]
    ?? ROOM_FUNCTIONS.find((item) => item.code === value)?.code
    ?? "unknown";
}

export function roomFunctionLabel(code: RoomFunctionCode): string {
  return ROOM_FUNCTIONS.find((item) => item.code === code)?.label ?? "Needs confirmation";
}

/** Consumer-facing function choices shown in Step 2.1. */
export const ROOM_CONFIRMATION_OPTIONS = [
  "primary_bedroom",
  "guest_bedroom",
  "kids_room",
  "home_office",
  "living_room",
  "dining_room",
  "kitchen",
  "bathroom",
  "entry",
  "balcony",
  "storage",
  "laundry_room",
  "walk_in_closet",
  "family_room",
  "other",
] as const satisfies readonly RoomFunctionCode[];

export interface LifestyleTagGroup {
  group: string;
  tags: string[];
}

/** "Anything special we should design around?" (PRD §8). */
export const LIFESTYLE_TAG_GROUPS: LifestyleTagGroup[] = [
  { group: "Household", tags: ["Kids", "Baby / Nursery", "Aging Parents", "Pets"] },
  {
    group: "Lifestyle",
    tags: ["Work From Home", "Entertaining", "Extra Storage", "Reading", "Gaming", "Home Theater", "Fitness"],
  },
  { group: "Bedroom", tags: ["King Bed", "Queen Bed", "Twin Beds", "Desk"] },
  {
    group: "Bathroom",
    tags: ["Walk-in Shower", "Tub", "Double Vanity", "Aging-Friendly", "Separate Toilet Area"],
  },
  {
    group: "Kitchen",
    tags: ["Kitchen Island", "Breakfast Bar", "Large Pantry", "Open Kitchen"],
  },
];

/** A short, high-frequency set for Step 2.2. Keep this intentionally consumer-friendly. */
export const STEP_TWO_REQUIREMENT_GROUPS: LifestyleTagGroup[] = [
  {
    group: "Household & lifestyle",
    tags: [
      "Children at Home",
      "Older / Multi-generational Household",
      "Work From Home",
      "Extra Storage",
      "Pet Friendly",
      "Accessibility",
    ],
  },
  {
    group: "Space requirements",
    tags: [
      "Open Kitchen",
      "Kitchen Island",
      "Bathroom Wet / Dry Separation",
      "Bathroom Bathtub",
      "Twin Beds in Primary Bedroom",
      "Primary Walk-in Closet",
    ],
  },
];

/** Room types selectable in See My Style (PRD §13 Step 2). */
export const STYLE_ROOM_TYPES = [
  "Living Room",
  "Primary Bedroom",
  "Guest Bedroom",
  "Dining Room",
  "Kitchen",
  "Bathroom",
  "Home Office",
  "Kids' Room",
  "Entry",
  "Other",
] as const;

export type StyleRoomType = (typeof STYLE_ROOM_TYPES)[number];
