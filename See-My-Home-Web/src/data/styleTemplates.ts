import type { StyleGenerationResult } from "../lib/homeStyleApi";

export interface StyleTemplate {
  id: "modern-oriental" | "california-modern" | "maximal-luxe";
  styleId: "modern_east" | "california_modern" | "maximal_luxe";
  styleProfile: StyleGenerationResult["style_profile"];
  name: string;
  nameZh: string;
  tagline: string;
  taglineZh: string;
  previewUrl: string;
  demoResultUrl: string;
  palette: { from: string; to: string; accent: string; line: string };
  story: StyleStory;
  storyZh: StyleStory;
}

export interface StyleStory {
  direction: string;
  material: string;
  light: string;
  furniture: string;
  mood: string;
}

/**
 * Three visible presets share one bundled source room and map to independent
 * server-owned ZooWork style Skills.
 */
export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "modern-oriental",
    styleId: "modern_east",
    styleProfile: "quiet-poise",
    name: "Modern East",
    nameZh: "摩登东方",
    tagline: "Quiet grandeur, sculptural forms, and refined Eastern restraint.",
    taglineZh: "东方意境、雕塑感与克制静奢。",
    previewUrl: "/demo/home-style/preview-modern-oriental.png",
    demoResultUrl: "/demo/home-style/result-modern-oriental.png",
    palette: { from: "#eee9df", to: "#7b6754", accent: "#755e48", line: "#302c28" },
    story: {
      direction: "Modern architectural clarity meets Oriental restraint through layered views, calibrated negative space, and one quiet focal gesture.",
      material: "Dark walnut, honed stone, mineral plaster, linen, wool, and restrained aged bronze.",
      light: "Warm concealed ambient light balances the soft city daylight and creates a composed evening atmosphere.",
      furniture: "Low-profile tailored seating, slender dark frames, tactile neutral upholstery, and sparse handcrafted objects.",
      mood: "Composed, warm, residential, and quietly sophisticated.",
    },
    storyZh: {
      direction: "以现代建筑的清晰秩序承载东方克制，通过层叠视线、恰当留白和一个安静焦点建立空间节奏。",
      material: "深色胡桃木、亚光石材、矿物涂料、亚麻、羊毛与少量做旧古铜。",
      light: "暖色隐藏式环境光与城市自然光彼此平衡，形成沉静的傍晚氛围。",
      furniture: "低矮利落的座椅、纤细深色框架、中性触感面料与少量手作器物。",
      mood: "沉静、温暖、宜居，并带有克制的精致感。",
    },
  },
  {
    id: "california-modern",
    styleId: "california_modern",
    styleProfile: "sunlit-casual",
    name: "California Modern",
    nameZh: "加州现代",
    tagline: "Sunlit California minimalism with a relaxed gallery feel.",
    taglineZh: "阳光、松弛，带有画廊感的加州简约。",
    previewUrl: "/demo/home-style/result-california-modern.png",
    demoResultUrl: "/demo/home-style/result-california-modern.png",
    palette: { from: "#f3eee4", to: "#cbb89d", accent: "#9b7d57", line: "#55483a" },
    story: {
      direction: "An open, sunlit plan pairs relaxed California living with clean modern lines and an easy connection to the balcony.",
      material: "Pale oak, creamy plaster, travertine, bouclé, woven linen, and softly aged brass.",
      light: "Abundant daylight is softened by sheer curtains and supported by warm, discreet evening light.",
      furniture: "Deep casual seating, rounded stone tables, woven timber chairs, and generous indoor planting.",
      mood: "Airy, tactile, optimistic, and effortlessly comfortable.",
    },
    storyZh: {
      direction: "以开放通透的格局结合加州式松弛感与现代线条，让室内生活自然延伸到阳台。",
      material: "浅色橡木、奶油色涂料、洞石、羊羔绒、织纹亚麻与柔和做旧黄铜。",
      light: "充足日光经过纱帘柔化，并由克制温暖的夜间照明补充。",
      furniture: "宽松舒适的沙发、圆润石材茶几、木质编织椅与充足绿植。",
      mood: "明亮、自然、轻松，并具有舒适的触感层次。",
    },
  },
  {
    id: "maximal-luxe",
    styleId: "maximal_luxe",
    styleProfile: "edited-glamour",
    name: "Maximal Luxe",
    nameZh: "极繁奢华",
    tagline: "High-glamour layering with bold color and artistic drama.",
    taglineZh: "高奢层次、浓郁色彩与戏剧化艺术感。",
    previewUrl: "/demo/home-style/preview-maximal-luxe.png",
    demoResultUrl: "/demo/home-style/result-maximal-luxe.png",
    palette: { from: "#6f1f2c", to: "#1f1816", accent: "#b88a46", line: "#261713" },
    story: {
      direction: "A richly layered salon brings together dramatic color, art, sculptural lighting, and a strong central gathering space.",
      material: "Burgundy velvet, dark figured stone, antique brass, patterned wool, smoked timber, and decorative plaster.",
      light: "A statement chandelier and warm perimeter lighting create depth against the cooler city horizon.",
      furniture: "Curved lounge seating, polished sculptural tables, expressive textiles, and collected art objects.",
      mood: "Dramatic, enveloping, glamorous, and confidently personal.",
    },
    storyZh: {
      direction: "以浓郁色彩、艺术陈设、雕塑灯具和明确的围合中心，构成层次丰富的会客空间。",
      material: "酒红丝绒、深色纹理石材、复古黄铜、图案羊毛、烟熏木材与装饰性涂料。",
      light: "标志性吊灯与暖色周边照明形成深度，并与窗外偏冷的城市天际线对比。",
      furniture: "弧形休闲座椅、抛光雕塑茶几、表现力强的织物与收藏式艺术陈设。",
      mood: "戏剧化、包裹感强、华丽，并具有鲜明的个人表达。",
    },
  },
];
