import type { FurnitureDesignSpec } from "./homeFurnitureApi";

export type FurnitureDisplayLanguage = "en" | "zh";

const ZH_TERMS: Record<string, string> = {
  walnut: "胡桃木",
  "solid walnut": "实心胡桃木",
  "walnut veneer": "胡桃木饰面",
  "white oak": "白橡木",
  "solid white oak": "实心白橡木",
  ash: "白蜡木",
  cherry: "樱桃木",
  travertine: "洞石",
  "matte black": "哑光黑",
  "matte black stain": "哑光黑色染色",
  "blackened steel": "发黑钢",
  "brushed brass": "拉丝黄铜",
  "solid wood": "实木",
  "natural stone": "天然石材",
  glass: "玻璃",
  "tempered glass": "钢化玻璃",
  clear: "透明",
  none: "无",
  top: "桌面",
  "table top": "桌面",
  "top panel": "桌面板",
  "case sides and curved brackets": "柜体侧板与弧形托架",
  legs: "桌腿",
  "table legs": "桌腿",
  "drawer fronts": "抽屉面板",
  drawers: "抽屉",
  knobs: "圆形拉手",
  hardware: "五金",
  apron: "围板",
  stretcher: "横撑",
  shelf: "层板",
  support: "支撑件",
  "matte hand-rubbed oil": "哑光手擦油",
  "matte clear oil": "哑光清油",
  "matte blackened": "哑光发黑处理",
  "satin lacquer": "缎面漆",
  "natural soap": "天然皂面处理",
  "high gloss": "高光处理",
  "textured powder coat": "纹理粉末涂层",
  "rectangular walnut top": "长方形胡桃木桌面",
  "front case rail with drawer openings": "带抽屉开口的前柜框",
  "back case rail": "后柜框",
  "end case rail with concave arch": "带内凹弧形的侧柜框",
  "tapered square leg with integrated bracket": "带一体托架的锥形方腿",
  "inset drawer": "嵌入式抽屉",
  "vertical drawer divider": "抽屉竖向分隔件",
  "round blackened steel knob": "圆形发黑钢拉手",
  "freeform ash top": "自由曲面白蜡木桌面",
  "sculpted slab leg": "弧形板式桌腿",
  "freeform glass shelf": "自由曲面玻璃层板",
};

const ROLE_ZH: Record<FurnitureDesignSpec["components"][number]["role"], string> = {
  top: "桌面",
  support: "支撑件",
  apron: "围板",
  stretcher: "横撑",
  shelf: "层板",
  drawer: "抽屉",
  hardware: "五金",
  other: "家具部件",
};

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function containsLatinWords(value: string): boolean {
  return /[a-z]{2,}/i.test(value);
}

function containsChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

export function localizeFurnitureTerm(
  value: string,
  language: FurnitureDisplayLanguage,
  fallback?: string,
): string {
  const cleaned = value.trim();
  if (!cleaned) return fallback ?? "";
  if (language === "en") return containsChinese(cleaned) ? (fallback ?? "Custom") : cleaned;
  if (containsChinese(cleaned) && !containsLatinWords(cleaned)) return cleaned;
  return ZH_TERMS[normalized(cleaned)] ?? fallback ?? "定制选项";
}

export function localizeFurnitureNarrative(
  value: string,
  language: FurnitureDisplayLanguage,
  fallback: { en: string; zh: string },
): string {
  const cleaned = value.trim();
  if (!cleaned) return language === "zh" ? fallback.zh : fallback.en;
  if (language === "zh" && containsLatinWords(cleaned)) return fallback.zh;
  if (language === "en" && containsChinese(cleaned)) return fallback.en;
  return cleaned;
}

export function localizeMaterialLine(
  materials: FurnitureDesignSpec["materials"],
  language: FurnitureDisplayLanguage,
): string {
  return materials.map((item, index) => {
    const part = localizeFurnitureTerm(item.part, language, language === "zh" ? `部件 ${index + 1}` : `Part ${index + 1}`);
    const material = localizeFurnitureTerm(item.material, language, language === "zh" ? "定制材质" : "Custom material");
    return `${part}: ${material}`;
  }).join(" · ");
}

export function localizeFinishLine(
  materials: FurnitureDesignSpec["materials"],
  language: FurnitureDisplayLanguage,
): string {
  return [...new Set(materials.map((item) => localizeFurnitureTerm(
    item.finish,
    language,
    language === "zh" ? "定制表面处理" : "Custom finish",
  )))].join(" · ");
}

export function localizeComponentLine(
  components: FurnitureDesignSpec["components"],
  language: FurnitureDisplayLanguage,
): string {
  return components.map((item) => {
    const fallback = language === "zh" ? ROLE_ZH[item.role] : item.role;
    return `${localizeFurnitureTerm(item.name, language, fallback)} × ${item.quantity}`;
  }).join(" · ");
}
