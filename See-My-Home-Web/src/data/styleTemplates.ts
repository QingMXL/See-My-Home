export interface StyleTemplate {
  id: string;
  /** Stable backend style identifier. */
  styleId: "modern_east";
  name: string;
  tags: [string, string, string];
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

/** Production-ready styles only. Research-source firm names never appear in the UI. */
export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "modern-east",
    styleId: "modern_east",
    name: "Modern East",
    tags: ["Refined", "Modern", "Serene"],
    palette: { from: "#eee9df", to: "#b9aa98", accent: "#755e48", line: "#302c28" },
    story: {
      direction:
        "Modern architectural clarity meets Eastern restraint through layered views, calibrated negative space, and one quiet focal gesture.",
      material: "Matte oak or walnut, honed pale stone, mineral plaster, linen, wool, and restrained satin bronze.",
      light: "Soft daylight with warm, concealed ambient light and low-glare accents.",
      furniture: "Low-profile tailored seating, slender dark frames, tactile neutral upholstery, and sparse handcrafted objects.",
      mood: "Composed, warm, residential, and quietly sophisticated.",
    },
    storyZh: {
      direction: "以现代建筑的清晰秩序承载东方克制，通过层叠视线、恰当留白和一个安静焦点建立空间节奏。",
      material: "哑光橡木或胡桃木、浅色亚光石材、矿物涂料、亚麻、羊毛与少量缎面古铜。",
      light: "柔和自然光，结合暖色隐藏式环境光和低眩光重点照明。",
      furniture: "低矮利落的座椅、纤细深色框架、中性触感面料与少量手作器物。",
      mood: "沉静、温暖、宜居，并带有克制的精致感。",
    },
  },
];
