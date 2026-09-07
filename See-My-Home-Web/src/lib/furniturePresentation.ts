import type { FurnitureDimensions, FurnitureDesignSpec } from "./homeFurnitureApi";

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
  "blackened steel": "发黑钢",
  "brushed brass": "拉丝黄铜",
  "solid wood": "实木",
  "natural stone": "天然石材",
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

function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The orthographic image could not be decoded."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("The annotated sheet could not be exported.")),
    "image/png",
  ));
}

function drawDimensionLine(
  context: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  label: string,
  fontSize: number,
): void {
  const arrow = Math.max(7, Math.round(fontSize * 0.38));
  context.strokeStyle = "#000000";
  context.fillStyle = "#000000";
  context.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
  context.beginPath();
  context.moveTo(x1, y);
  context.lineTo(x2, y);
  context.moveTo(x1, y);
  context.lineTo(x1 + arrow, y - arrow * 0.55);
  context.moveTo(x1, y);
  context.lineTo(x1 + arrow, y + arrow * 0.55);
  context.moveTo(x2, y);
  context.lineTo(x2 - arrow, y - arrow * 0.55);
  context.moveTo(x2, y);
  context.lineTo(x2 - arrow, y + arrow * 0.55);
  context.stroke();
  context.font = `600 ${fontSize}px Arial, "PingFang SC", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  const textWidth = context.measureText(label).width;
  context.fillStyle = "#ffffff";
  context.fillRect((x1 + x2 - textWidth) / 2 - arrow, y - fontSize - arrow, textWidth + arrow * 2, fontSize + arrow);
  context.fillStyle = "#000000";
  context.fillText(label, (x1 + x2) / 2, y - arrow * 0.45);
}

/**
 * Turns the ZooWork-generated drawing into one downloadable concept sheet.
 * The furniture pixels remain Agent-generated; exact dimension text is applied
 * from the confirmed specification so the image model cannot mistype numbers.
 */
export async function createAnnotatedOrthographicSheet(input: {
  imageUrl: string;
  dimensions: FurnitureDimensions;
  language: FurnitureDisplayLanguage;
}): Promise<Blob> {
  const response = await fetch(input.imageUrl);
  if (!response.ok) throw new Error(`Orthographic image download failed (${response.status})`);
  const image = await imageFromBlob(await response.blob());
  const width = Math.max(900, image.naturalWidth || image.width);
  const sourceHeight = Math.max(500, image.naturalHeight || image.height);
  const bandHeight = Math.max(150, Math.round(sourceHeight * 0.2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = sourceHeight + bandHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, width, sourceHeight);

  // Normalize the generated pixels to a strict black-on-white concept line drawing.
  const pixels = context.getImageData(0, 0, width, sourceHeight);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const alpha = pixels.data[index + 3] ?? 255;
    const red = pixels.data[index] ?? 255;
    const green = pixels.data[index + 1] ?? 255;
    const blue = pixels.data[index + 2] ?? 255;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const value = alpha > 32 && luminance < 215 ? 0 : 255;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);

  const labels = input.language === "zh"
    ? [
        ["正视图", `宽 ${input.dimensions.width} × 高 ${input.dimensions.height} mm`],
        ["侧视图", `深 ${input.dimensions.depth} × 高 ${input.dimensions.height} mm`],
        ["顶视图", `宽 ${input.dimensions.width} × 深 ${input.dimensions.depth} mm`],
      ]
    : [
        ["FRONT", `W ${input.dimensions.width} × H ${input.dimensions.height} mm`],
        ["SIDE", `D ${input.dimensions.depth} × H ${input.dimensions.height} mm`],
        ["TOP", `W ${input.dimensions.width} × D ${input.dimensions.depth} mm`],
      ];
  const columnWidth = width / 3;
  const fontSize = Math.max(18, Math.round(width / 62));
  const labelY = sourceHeight + Math.round(bandHeight * 0.33);
  const dimensionY = sourceHeight + Math.round(bandHeight * 0.76);

  context.fillStyle = "#000000";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px Arial, "PingFang SC", sans-serif`;
  labels.forEach(([view, dimension], index) => {
    const left = index * columnWidth + columnWidth * 0.1;
    const right = (index + 1) * columnWidth - columnWidth * 0.1;
    context.fillText(view, (left + right) / 2, labelY);
    drawDimensionLine(context, left, right, dimensionY, dimension, fontSize);
  });

  return canvasBlob(canvas);
}
