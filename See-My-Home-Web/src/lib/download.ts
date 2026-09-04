/** Serializes the first SVG inside `container` and downloads it as a file. */
export function downloadSvgIn(container: HTMLElement | null, baseName: string): void {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const markup = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadImageWithLabels(
  imageUrl: string,
  labels: { text: string; anchor: [number, number] }[],
  baseName: string,
): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Image download failed (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0);

  const fontSize = Math.max(14, Math.round(canvas.width * 0.014));
  context.font = `700 ${fontSize}px Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const { text, anchor } of labels) {
    const x = anchor[0] * canvas.width;
    const y = anchor[1] * canvas.height;
    const paddingX = fontSize * 0.65;
    const paddingY = fontSize * 0.42;
    const width = context.measureText(text).width + paddingX * 2;
    const height = fontSize + paddingY * 2;
    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.beginPath();
    context.roundRect(x - width / 2, y - height / 2, width, height, fontSize * 0.35);
    context.fill();
    context.strokeStyle = "rgba(71, 85, 105, 0.25)";
    context.lineWidth = Math.max(1, canvas.width * 0.001);
    context.stroke();
    context.fillStyle = "#1f2937";
    context.fillText(text, x, y);
  }

  bitmap.close();
  const blob = await new Promise<Blob>((resolveBlob, reject) => {
    canvas.toBlob((value) => value ? resolveBlob(value) : reject(new Error("Could not encode image")), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
