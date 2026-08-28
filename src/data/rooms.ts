export interface DetectedRoom {
  id: string;
  label: string;
  /** Position of the label inside the sample floor plan SVG (viewBox 0 0 900 560). */
  x: number;
  y: number;
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
  "Den",
  "Storage",
  "Garage",
  "Home Theater",
  "Fitness Room",
  "Game Room",
] as const;

export type RoomTag = (typeof ROOM_TAG_LIBRARY)[number];

/** Rooms "detected" in the bundled sample floor plan. */
export const SAMPLE_DETECTED_ROOMS: DetectedRoom[] = [
  { id: "primary-bedroom", label: "Primary Bedroom", x: 165, y: 150 },
  { id: "bedroom-2", label: "Bedroom 2", x: 150, y: 420 },
  { id: "bathroom", label: "Bathroom", x: 385, y: 120 },
  { id: "laundry", label: "Laundry", x: 380, y: 440 },
  { id: "kitchen", label: "Kitchen", x: 590, y: 130 },
  { id: "dining", label: "Dining", x: 760, y: 165 },
  { id: "living-room", label: "Living Room", x: 660, y: 400 },
];

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
