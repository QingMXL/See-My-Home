import type { GenerateLayoutInput, LayoutAgentResponse, LayoutGenerationResult } from "../lib/homeLayoutApi";
import type { DetectedRoom, RoomFunctionCode } from "./rooms";

const DEMO_SOURCE_WIDTH = 700;
const DEMO_SOURCE_HEIGHT = 438;
const PLAN_VIEW_WIDTH = 900;
const PLAN_VIEW_HEIGHT = 560;

export const DEMO_LAYOUT_FILE_NAME = "Home Layout Demo";
export const DEMO_LAYOUT_SOURCE_URL = "/demo/home-layout/source-plan.png";
export const DEMO_LAYOUT_RESULT_URL = "/demo/home-layout/result-plan.png";
export const DEMO_LAYOUT_SESSION_ID = "demo_home_layout";

interface DemoRoomDefinition {
  id: string;
  label: string;
  functionCode: RoomFunctionCode;
  center: [number, number];
  polygon: [number, number][];
}

const DEMO_ROOM_DEFINITIONS: DemoRoomDefinition[] = [
  {
    id: "kitchen",
    label: "Kitchen",
    functionCode: "kitchen",
    center: [110, 112],
    polygon: [[18, 17], [215, 17], [215, 167], [18, 167]],
  },
  {
    id: "guest-bedroom",
    label: "Guest Bedroom",
    functionCode: "guest_bedroom",
    center: [300, 112],
    polygon: [[218, 17], [390, 17], [390, 215], [218, 215]],
  },
  {
    id: "primary-bedroom",
    label: "Primary Bedroom",
    functionCode: "primary_bedroom",
    center: [510, 112],
    polygon: [[391, 17], [665, 17], [665, 215], [391, 215]],
  },
  {
    id: "entry",
    label: "Entry",
    functionCode: "entry",
    center: [110, 245],
    polygon: [[18, 185], [218, 185], [218, 308], [18, 308]],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    functionCode: "bathroom",
    center: [115, 365],
    polygon: [[33, 315], [215, 315], [215, 421], [33, 421]],
  },
  {
    id: "living-room",
    label: "Living Room",
    functionCode: "living_room",
    center: [388, 325],
    polygon: [[218, 215], [558, 215], [558, 421], [218, 421]],
  },
  {
    id: "balcony",
    label: "Balcony",
    functionCode: "balcony",
    center: [621, 325],
    polygon: [[558, 232], [685, 232], [685, 421], [558, 421]],
  },
];

export function createDemoRooms(): DetectedRoom[] {
  return DEMO_ROOM_DEFINITIONS.map((room) => {
    const labelAnchor: [number, number] = [
      room.center[0] / DEMO_SOURCE_WIDTH,
      room.center[1] / DEMO_SOURCE_HEIGHT,
    ];
    return {
      id: room.id,
      label: room.label,
      currentUse: room.label,
      functionCode: room.functionCode,
      functionStatus: "confirmed",
      boundaryStatus: "confirmed",
      planningStatus: "included",
      x: labelAnchor[0] * PLAN_VIEW_WIDTH,
      y: labelAnchor[1] * PLAN_VIEW_HEIGHT,
      polygon: room.polygon.map(([x, y]) => [x / DEMO_SOURCE_WIDTH, y / DEMO_SOURCE_HEIGHT]),
      labelAnchor,
    };
  });
}

interface DemoResultOptions {
  rooms: DetectedRoom[];
  locale: "en-US" | "zh-CN";
  requestContext: GenerateLayoutInput;
  resultImageAvailable: boolean;
}

export function createDemoLayoutResult({
  rooms,
  locale,
  requestContext,
  resultImageAvailable,
}: DemoResultOptions): LayoutGenerationResult {
  const spaces = rooms.map((room) => ({
    id: room.id,
    label: room.label,
    architectural_type: room.functionCode ?? "other",
    actual_uses: [room.currentUse ?? room.label],
  }));
  const homeModel = {
    schema_version: "2.0" as const,
    home_id: requestContext.home_id,
    model_revision: 1,
    status: "confirmed",
    locale,
    spaces,
    problems: [
      { id: "demo-circulation", statement: "The route between the entry, kitchen, and living room should remain clear during everyday use.", impact: "medium" as const },
      { id: "demo-storage", statement: "Storage should be distributed near daily-use zones rather than concentrated in one room.", impact: "low" as const },
    ],
    opportunities: [
      { id: "demo-zoning", statement: "Use furniture orientation to reinforce the social and private zones without changing the walls." },
    ],
  };

  const baseResponse: LayoutAgentResponse = {
    schema_version: "1.0",
    request_id: "demo-layout-request",
    home_id: requestContext.home_id,
    operation: "intake",
    status: "completed",
    locale,
    message: locale === "zh-CN" ? "演示住宅模型已建立。" : "The demo Home Model is ready.",
    home_model: homeModel,
    diagnosis: null,
    visualization_brief: null,
    questions: [],
    warnings: [],
  };

  return {
    session_id: DEMO_LAYOUT_SESSION_ID,
    image_processing_status: "sample_geometry",
    intake: baseResponse,
    diagnosis: {
      ...baseResponse,
      operation: "diagnose",
      message: locale === "zh-CN" ? "演示布局评估已完成。" : "The demo layout assessment is ready.",
      diagnosis: {
        based_on_model_revision: 1,
        finding_refs: ["demo-circulation", "demo-storage"],
        opportunity_refs: ["demo-zoning"],
        summary: "A furniture-led layout strategy keeps the confirmed shell unchanged.",
        assessment_items: [
          {
            id: "demo-assessment-circulation",
            category: "circulation",
            impact: "medium",
            title: { "en-US": "Keep the main route clear", "zh-CN": "保持主要动线通畅" },
            statement: {
              "en-US": "Keep the path between the entry, kitchen, and living room free of furniture conflicts.",
              "zh-CN": "玄关、厨房与客厅之间的主要通道应避免与家具发生冲突。",
            },
            affects_refs: rooms.filter((room) => ["entry", "kitchen", "living_room"].includes(room.functionCode ?? "")).map((room) => room.id),
          },
          {
            id: "demo-assessment-zoning",
            category: "adjacency",
            impact: "low",
            title: { "en-US": "Organize the shared living zone", "zh-CN": "组织客厅内的共享功能" },
            statement: {
              "en-US": "Furniture orientation can distinguish seating and dining activities within the living room without adding partitions.",
              "zh-CN": "通过家具朝向区分客厅内的会客与用餐活动，无需增加隔断。",
            },
            affects_refs: rooms.filter((room) => room.functionCode === "living_room").map((room) => room.id),
          },
          {
            id: "demo-assessment-storage",
            category: "storage",
            impact: "low",
            title: { "en-US": "Place storage near daily use", "zh-CN": "让收纳靠近日常使用位置" },
            statement: {
              "en-US": "Use shallow storage at transition points without narrowing doors or circulation paths.",
              "zh-CN": "可在过渡区域布置浅柜，但不要挤占门口和主要通道。",
            },
            affects_refs: rooms.map((room) => room.id),
          },
        ],
      },
    },
    visualization: {
      ...baseResponse,
      operation: "visualize",
      message: locale === "zh-CN" ? "演示彩色布局已载入。" : "The pre-rendered demo layout is ready.",
      visualization_brief: { source: "pre_rendered_demo", preserves_confirmed_geometry: true },
    },
    generated_image: resultImageAvailable
      ? {
          asset_id: "demo-layout-result",
          url: DEMO_LAYOUT_RESULT_URL,
          mime_type: "image/png",
          size_bytes: 0,
          provider_model: "Pre-rendered demo",
          note: "Bundled sample result; no image model was called.",
        }
      : null,
    request_context: requestContext,
  };
}
