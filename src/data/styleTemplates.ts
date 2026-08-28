export interface StyleTemplate {
  id: string;
  name: string;
  tags: [string, string, string];
  /** Gradient + accent palette used to render the preview card artwork. */
  palette: { from: string; to: string; accent: string; line: string };
  story: StyleStory;
  /** Chinese rendition of the design story, shown when the UI language is zh. */
  storyZh: StyleStory;
}

export interface StyleStory {
  direction: string;
  material: string;
  light: string;
  furniture: string;
  mood: string;
}

/** Placeholder design templates (PRD §13 — names to be finalized before launch). */
export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "zaha-hadid",
    name: "Zaha Hadid",
    tags: ["Fluid", "Sculptural", "Futuristic"],
    palette: { from: "#f4f2ee", to: "#d8d4cc", accent: "#b7b0a4", line: "#8f887c" },
    story: {
      direction:
        "Sweeping curves and sculptural forms dissolve hard corners, turning the room into a single continuous gesture of light and surface.",
      material: "Seamless mineral surfaces, cast stone, and satin metals.",
      light: "Indirect coves wash curved walls with soft, continuous light.",
      furniture: "Sculptural seating with organic, flowing silhouettes.",
      mood: "Futuristic, serene, and quietly dramatic.",
    },
    storyZh: {
      direction: "流畅的曲线与雕塑般的形体消解了生硬的转角,让整个房间成为一段连续的光影与曲面。",
      material: "无缝矿物涂层、人造石与缎面金属。",
      light: "灯槽间接照明,柔和连续地洗亮弧形墙面。",
      furniture: "有机流线造型的雕塑感座椅。",
      mood: "未来、宁静,并带着克制的戏剧感。",
    },
  },
  {
    id: "jean-nouvel",
    name: "Jean Nouvel",
    tags: ["Refined", "Modern", "Architectural"],
    palette: { from: "#e8eaec", to: "#b9bfc6", accent: "#5d6670", line: "#3c434b" },
    story: {
      direction:
        "Precise architectural framing and deep shadow play give the room a gallery-like calm, where every object earns its place.",
      material: "Smoked glass, dark steel, and honed concrete.",
      light: "Sharp daylight cuts balanced by warm, focused accents.",
      furniture: "Low, tailored pieces with strict geometry.",
      mood: "Composed, urban, and quietly powerful.",
    },
    storyZh: {
      direction: "精准的建筑框景与深邃的光影,让房间拥有画廊般的沉静,每一件物品都各得其所。",
      material: "烟熏玻璃、深色钢材与打磨混凝土。",
      light: "锐利的日光切面,辅以温暖聚焦的重点照明。",
      furniture: "低矮、剪裁利落、几何严谨的家具。",
      mood: "沉着、都市,安静而有力量。",
    },
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    tags: ["Geometric", "Minimal", "Functional"],
    palette: { from: "#f5f1e8", to: "#ddd3c0", accent: "#c8452c", line: "#2d4d8f" },
    story: {
      direction:
        "Clean lines, functional forms, and a balance of warmth and minimalism. This Bauhaus-inspired space emphasizes simplicity, quality materials, and harmony between light and form.",
      material: "Wood, stone, linen, and matte black metals.",
      light: "Maximized natural light with warm accent lighting.",
      furniture: "Low-profile silhouettes with functional elegance.",
      mood: "Calm, warm, and effortlessly sophisticated.",
    },
    storyZh: {
      direction: "干净的线条、功能化的形体,以及温暖与极简之间的平衡。这个包豪斯风格的空间强调简洁、优质的材料,以及光与形的和谐。",
      material: "木材、石材、亚麻与哑光黑金属。",
      light: "最大化自然采光,辅以温暖的重点照明。",
      furniture: "低矮利落、优雅实用的家具轮廓。",
      mood: "平静、温暖,毫不费力的精致。",
    },
  },
  {
    id: "studio-a",
    name: "Studio A",
    tags: ["Warm", "Natural", "Timeless"],
    palette: { from: "#f6efe4", to: "#e0cdb2", accent: "#a97e50", line: "#7c5c3a" },
    story: {
      direction:
        "A layered, lived-in warmth built from natural textures and soft earth tones that make the room feel instantly like home.",
      material: "White oak, travertine, linen, and woven fibers.",
      light: "Golden-hour daylight with layered lamp light at night.",
      furniture: "Deep, comfortable seating with rounded oak pieces.",
      mood: "Warm, grounded, and inviting.",
    },
    storyZh: {
      direction: "层层叠叠的自然肌理与柔和的大地色调,营造出一种被生活浸润的温暖,让房间立刻有了家的感觉。",
      material: "白橡木、洞石、亚麻与编织纤维。",
      light: "黄昏般的暖阳,夜晚以多层次灯光接续。",
      furniture: "深坐感的舒适沙发与圆润的橡木件。",
      mood: "温暖、踏实、令人想留下来。",
    },
  },
  {
    id: "studio-b",
    name: "Studio B",
    tags: ["Modern", "Minimal", "Serene"],
    palette: { from: "#f2f4f1", to: "#ccd4cb", accent: "#7e8f7c", line: "#57624f" },
    story: {
      direction:
        "A quiet modern calm: pale surfaces, soft greens, and generous negative space give the room breathing room and clarity.",
      material: "Pale ash, matte plaster, boucle, and brushed nickel.",
      light: "Diffused, even daylight with minimal visible fixtures.",
      furniture: "Simple, low pieces with soft rounded edges.",
      mood: "Serene, airy, and uncluttered.",
    },
    storyZh: {
      direction: "安静的现代感:浅色表面、柔和的绿意与大量留白,让房间得以呼吸,思路也随之清晰。",
      material: "浅色白蜡木、哑光灰泥、羊羔绒与拉丝镍。",
      light: "均匀柔和的漫射日光,尽量隐藏灯具。",
      furniture: "简单低矮、边缘圆润的家具。",
      mood: "宁静、通透、井井有条。",
    },
  },
  {
    id: "studio-c",
    name: "Studio C",
    tags: ["Industrial", "Raw", "Urban"],
    palette: { from: "#e4ded6", to: "#8f857b", accent: "#4a413a", line: "#2b2620" },
    story: {
      direction:
        "Exposed structure and honest materials give the room a raw, editorial character softened by warm leather and aged wood.",
      material: "Blackened steel, reclaimed timber, brick, and leather.",
      light: "Dramatic contrast: big windows, dark frames, warm pools of light.",
      furniture: "Robust, low-slung pieces with visible structure.",
      mood: "Bold, urban, and characterful.",
    },
    storyZh: {
      direction: "裸露的结构与诚实的材料赋予房间原始而具编辑感的性格,再以温暖的皮革与老木柔化。",
      material: "发黑钢材、回收木料、砖墙与皮革。",
      light: "强烈对比:大窗、深色框架、温暖的光池。",
      furniture: "低矮敦实、结构外露的家具。",
      mood: "大胆、都市、有性格。",
    },
  },
];
