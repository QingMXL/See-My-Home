import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Breadcrumbs, Stepper } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { FrontViewDrawing, SideViewDrawing, TopViewDrawing } from "../../components/visuals/FurnitureDrawings";
import { FurnitureRender } from "../../components/visuals/FurnitureRender";
import { useI18n } from "../../i18n/LanguageContext";
import { FURNITURE_GENERATION_STEPS } from "../../lib/agents";
import {
  generateFurniture,
  refineFurniture,
  uploadFurnitureImage,
  type FurnitureGenerateInput,
  type FurnitureSourceKind,
  type FurnitureTableType,
  type FurnitureTopShape,
} from "../../lib/homeFurnitureApi";
import { useDesignStore } from "../../store/useDesignStore";
import "../layout-flow/layout-flow.css";
import "./furniture.css";

const TABLE_TYPES: { value: FurnitureTableType; en: string; zh: string }[] = [
  { value: "dining_table", en: "Dining table", zh: "餐桌" },
  { value: "coffee_table", en: "Coffee table", zh: "茶几" },
  { value: "console_table", en: "Console table", zh: "玄关桌" },
  { value: "side_table", en: "Side table", zh: "边几" },
  { value: "desk", en: "Desk", zh: "书桌" },
  { value: "bedside_table", en: "Bedside table", zh: "床头桌" },
  { value: "nesting_tables", en: "Nesting tables", zh: "套几" },
  { value: "bar_table", en: "Bar table", zh: "吧台桌" },
  { value: "other_table", en: "Other table", zh: "其他桌类" },
];

const SIZE_PRESETS = [
  { label: "1800 × 900 × 750 mm", dimensions: { width: 1800, depth: 900, height: 750 } },
  { label: "1600 × 800 × 750 mm", dimensions: { width: 1600, depth: 800, height: 750 } },
  { label: "1400 × 700 × 750 mm", dimensions: { width: 1400, depth: 700, height: 750 } },
  { label: "1200 × 600 × 450 mm", dimensions: { width: 1200, depth: 600, height: 450 } },
  { label: "1200 × 400 × 760 mm", dimensions: { width: 1200, depth: 400, height: 760 } },
  { label: "600 × 600 × 520 mm", dimensions: { width: 600, depth: 600, height: 520 } },
] as const;

const MATERIALS = ["Walnut", "White Oak", "Ash", "Cherry", "Travertine", "Matte Black"];
const SECONDARY_MATERIALS = ["Blackened Steel", "Brushed Brass", "Solid Wood", "Natural Stone", "None"];
const BASE_STYLES = ["Four Tapered Legs", "Trestle Base", "Twin Pedestal", "Central Pedestal", "Plinth Base"];
const TOP_SHAPES: FurnitureTopShape[] = ["rectangular", "round", "oval", "square", "freeform"];
const EDGE_PROFILES = ["Soft Radius", "Square Edge", "Bullnose", "Beveled Edge", "Live Edge"];
const FINISHES = ["Matte Clear Oil", "Satin Lacquer", "Natural Soap", "High Gloss", "Textured Powder Coat"];
const STORAGE_OPTIONS = ["No Storage", "One Drawer", "Two Drawers", "Open Shelf", "Cable Management"];

function sizeDimensions(size: string) {
  return SIZE_PRESETS.find((preset) => preset.label === size)?.dimensions ?? SIZE_PRESETS[0].dimensions;
}

function sourcePriorityLabel(hasSketch: boolean, hasInspiration: boolean, lang: "en" | "zh") {
  if (hasSketch && hasInspiration) return lang === "zh" ? "草图 80% · 灵感图 20%" : "Sketch 80% · inspiration 20%";
  if (hasSketch) return lang === "zh" ? "草图 100%" : "Sketch 100%";
  if (hasInspiration) return lang === "zh" ? "灵感图 100%" : "Inspiration 100%";
  return lang === "zh" ? "纯文字模式" : "Text-only mode";
}

export function FurniturePage() {
  const { t, tTag, lang } = useI18n();
  const furniture = useDesignStore((state) => state.furniture);
  const {
    setFurniturePrompt,
    setFurnitureSource,
    setFurnitureUploadedAsset,
    setFurnitureTableType,
    setFurnitureOption,
    setFurnitureAppearance,
    setFurniturePhase,
    setFurnitureAgentRun,
    setFurnitureAgentError,
    confirmFurniture,
    saveDesign,
  } = useDesignStore();
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const drawingsRef = useRef<HTMLElement>(null);
  const [uploading, setUploading] = useState<FurnitureSourceKind | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const steps = [
    { title: t("furn.step1"), hint: t("furn.step1hint") },
    { title: t("furn.step2"), hint: t("furn.step2hint") },
    { title: t("furn.step3"), hint: copy("Concept views", "概念三视图") },
  ];

  const makeInput = (): FurnitureGenerateInput => ({
    project_id: furniture.projectId ?? `furniture_${crypto.randomUUID()}`,
    ...(furniture.sketchAsset ? { sketch_asset_id: furniture.sketchAsset.asset_id } : {}),
    ...(furniture.inspirationAsset ? { inspiration_asset_id: furniture.inspirationAsset.asset_id } : {}),
    locale: lang === "zh" ? "zh-CN" : "en-US",
    table_type: furniture.tableType,
    description: furniture.prompt.trim(),
    dimensions_mm: { ...sizeDimensions(furniture.size) },
    primary_material: furniture.material,
    secondary_material: furniture.secondaryMaterial,
    top_shape: furniture.topShape,
    edge_profile: furniture.edgeProfile,
    base_style: furniture.legs,
    finish: furniture.finish,
    storage: furniture.shelves,
    component_notes: furniture.handles,
  });

  const onUpload = async (kind: FurnitureSourceKind, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const previousUrl = kind === "sketch" ? furniture.sketchUrl : furniture.inspirationUrl;
    if (previousUrl?.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
    const localUrl = URL.createObjectURL(file);
    setFurnitureSource(kind, file.name, localUrl);
    setFurnitureAgentError(null);
    setUploading(kind);
    try {
      const projectId = furniture.sketchAsset?.project_id ?? furniture.inspirationAsset?.project_id ?? furniture.projectId ?? undefined;
      const asset = await uploadFurnitureImage(file, kind, lang === "zh" ? "zh-CN" : "en-US", projectId);
      setFurnitureUploadedAsset(kind, asset);
    } catch (error) {
      setFurnitureAgentError(error instanceof Error ? error.message : copy("Image upload failed.", "图片上传失败。"));
    } finally {
      setUploading(null);
    }
  };

  const onGenerate = async () => {
    if (!furniture.sketchAsset && !furniture.inspirationAsset && !furniture.prompt.trim()) {
      setFurnitureAgentError(copy("Add a sketch, an inspiration image, or a written description.", "请添加草图、灵感图或文字描述。"));
      return;
    }
    if (uploading) {
      setFurnitureAgentError(copy("Wait for the image upload to finish.", "请等待图片上传完成。"));
      return;
    }
    const input = makeInput();
    setFurnitureAgentError(null);
    setFurniturePhase("generating", 0);
    const stepOne = window.setTimeout(() => setFurniturePhase("generating", 1), 1200);
    const stepTwo = window.setTimeout(() => setFurniturePhase("generating", 2), 3200);
    try {
      const result = furniture.agentRun?.request_context
        ? await refineFurniture(furniture.agentRun.request_context, input.locale, input, input.description)
        : await generateFurniture(input);
      setFurnitureAgentRun(result);
      setFurniturePhase("done");
    } catch (error) {
      setFurnitureAgentError(error instanceof Error ? error.message : copy("Furniture generation failed.", "家具生成失败。"));
      setFurniturePhase("error");
    } finally {
      window.clearTimeout(stepOne);
      window.clearTimeout(stepTwo);
    }
  };

  useEffect(() => {
    if (furniture.confirmed) drawingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [furniture.confirmed]);

  const currentStep = furniture.phase !== "done" ? 0 : furniture.confirmed ? 2 : 1;
  const generated = furniture.agentRun;
  const spec = generated?.response.design_spec;
  const drawingProps = spec
    ? { dimensions: spec.dimensions_mm, topShape: spec.top.shape, baseStyle: spec.base.style, supportCount: spec.base.support_count }
    : null;
  const tableLabel = TABLE_TYPES.find((option) => option.value === furniture.tableType);
  const canGenerate = Boolean(furniture.sketchAsset || furniture.inspirationAsset || furniture.prompt.trim()) && !uploading;

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  return (
    <main className="page flow-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("furn.crumb") }]} />
      <div className="flow-head">
        <div>
          <h1 className="flow-title">{t("furn.title")}</h1>
          <p className="flow-sub">{copy("V1 designs tables from a sketch, one inspiration image, and text.", "第一版专注各种桌子，支持草图、单张灵感图与文字描述。")}</p>
        </div>
        <div className="flow-stepper"><Stepper steps={steps} current={currentStep} /></div>
      </div>

      <div className="furniture-grid">
        <section className="card card--pad input-panel" aria-label={t("furn.input")}>
          <div><h2 className="input-panel__title">{t("furn.input")}</h2><p className="input-panel__priority">{sourcePriorityLabel(Boolean(furniture.sketchAsset), Boolean(furniture.inspirationAsset), lang)}</p></div>
          <input ref={sketchInputRef} className="furniture-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload("sketch", event)} />
          <input ref={inspirationInputRef} className="furniture-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload("inspiration", event)} />
          <button type="button" className="furniture-upload" disabled={Boolean(uploading)} onClick={() => sketchInputRef.current?.click()}>
            {furniture.sketchUrl ? <img src={furniture.sketchUrl} alt={furniture.sketchName ?? t("furn.sketch")} /> : <span className="furniture-upload__plus">+</span>}
            <span><strong>{t("furn.sketch")}</strong><small>{copy("Primary form source · 80% when both images are used", "主要造型依据 · 两张图同时使用时占 80%")}</small></span>
            <em>{uploading === "sketch" ? copy("Uploading…", "上传中…") : furniture.sketchName ?? copy("Choose image", "选择图片")}</em>
          </button>
          <button type="button" className="furniture-upload" disabled={Boolean(uploading)} onClick={() => inspirationInputRef.current?.click()}>
            {furniture.inspirationUrl ? <img src={furniture.inspirationUrl} alt={furniture.inspirationName ?? t("furn.inspiration")} /> : <span className="furniture-upload__plus">+</span>}
            <span><strong>{t("furn.inspiration")}</strong><small>{copy("Secondary material and style source · 20%", "辅助材质与风格依据 · 同时使用时占 20%")}</small></span>
            <em>{uploading === "inspiration" ? copy("Uploading…", "上传中…") : furniture.inspirationName ?? copy("Choose image", "选择图片")}</em>
          </button>
          <div className="input-panel__prompt">
            <label htmlFor="furniture-prompt" className="tag-group__name">{t("furn.prompt")}</label>
            <textarea id="furniture-prompt" rows={4} value={furniture.prompt} onChange={(event) => setFurniturePrompt(event.target.value)} placeholder={copy("Describe the table, key features, and what must stay unchanged.", "描述桌子的用途、关键造型，以及哪些部分必须保留。")}/>
          </div>
          <Button full onClick={onGenerate} disabled={!canGenerate || furniture.phase === "generating"}><Sparkle />{generated ? copy("Regenerate with changes", "按当前调整重新生成") : t("furn.generate")}</Button>
          {furniture.agentError && <p className="furniture-error" role="alert">{furniture.agentError}</p>}
        </section>

        <section className="card render-panel" aria-label={t("furn.step2")}>
          {generated ? (
            <>
              <img className="render-panel__image" src={generated.generated_image.url} alt={generated.response.design_summary} />
              <div className="render-panel__summary"><strong>{generated.response.design_summary}</strong><span>{copy("Source weighting", "输入权重")} · {Math.round(generated.source_priority.sketch * 100)}% / {Math.round(generated.source_priority.inspiration * 100)}%</span></div>
              <div className="render-panel__swatches">{spec?.materials.slice(0, 3).map((material) => <span className="swatch" key={`${material.part}-${material.material}`}><i className="swatch__dot swatch__dot--wood" aria-hidden="true" />{material.material}</span>)}</div>
            </>
          ) : (
            <div className="render-panel__empty"><Sparkle size={32} /><p>{t("furn.emptyTitle")}</p><span>{copy("Your ZooWork Agent render will appear here.", "ZooWork Agent 生成的家具效果图会显示在这里。")}</span><div className="render-panel__placeholder"><FurnitureRender material={furniture.material} legs={furniture.legs} /></div></div>
          )}
        </section>

        <aside className="card card--pad refine-panel" aria-label={t("furn.refine")}>
          <h2 className="input-panel__title">{t("furn.refine")}</h2>
          <ul className="refine-list">
            <li><label htmlFor="furniture-type">{copy("Table type", "桌子类型")}</label><select id="furniture-type" value={furniture.tableType} onChange={(event) => setFurnitureTableType(event.target.value as FurnitureTableType)}>{TABLE_TYPES.map((option) => <option value={option.value} key={option.value}>{lang === "zh" ? option.zh : option.en}</option>)}</select></li>
            <li><label htmlFor="furniture-size">{copy("Dimensions", "整体尺寸")}</label><select id="furniture-size" value={furniture.size} onChange={(event) => setFurnitureOption("size", event.target.value)}>{SIZE_PRESETS.map((option) => <option value={option.label} key={option.label}>{option.label}</option>)}</select></li>
            <li><label htmlFor="furniture-material">{copy("Primary material", "主材")}</label><select id="furniture-material" value={furniture.material} onChange={(event) => setFurnitureOption("material", event.target.value)}>{MATERIALS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-secondary">{copy("Secondary material", "辅材")}</label><select id="furniture-secondary" value={furniture.secondaryMaterial} onChange={(event) => setFurnitureAppearance("secondaryMaterial", event.target.value)}>{SECONDARY_MATERIALS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-shape">{copy("Top shape", "桌面形状")}</label><select id="furniture-shape" value={furniture.topShape} onChange={(event) => setFurnitureAppearance("topShape", event.target.value)}>{TOP_SHAPES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-edge">{copy("Edge profile", "边缘造型")}</label><select id="furniture-edge" value={furniture.edgeProfile} onChange={(event) => setFurnitureAppearance("edgeProfile", event.target.value)}>{EDGE_PROFILES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-base">{copy("Base / legs", "桌腿 / 底座")}</label><select id="furniture-base" value={furniture.legs} onChange={(event) => setFurnitureOption("legs", event.target.value)}>{BASE_STYLES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-finish">{copy("Finish", "表面处理")}</label><select id="furniture-finish" value={furniture.finish} onChange={(event) => setFurnitureAppearance("finish", event.target.value)}>{FINISHES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
            <li><label htmlFor="furniture-storage">{copy("Feature", "功能部件")}</label><select id="furniture-storage" value={furniture.shelves} onChange={(event) => setFurnitureOption("shelves", event.target.value)}>{STORAGE_OPTIONS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
          </ul>
          <Button full size="lg" disabled={!generated || generated.response.status === "failed"} onClick={() => { confirmFurniture(); saveDesign({ project: "My Home", title: `${lang === "zh" ? tableLabel?.zh : tableLabel?.en} · ${furniture.material}`, kind: "Furniture", detail: furniture.size }); }}>{t("furn.thisIsIt")}</Button>
          {generated?.response.warnings.map((warning) => <p className="furniture-warning" key={warning}>{warning}</p>)}
        </aside>
      </div>

      {furniture.confirmed && drawingProps && spec && generated && (
        <section className="drawings" ref={drawingsRef} aria-label={t("furn.drawings")}>
          <div className="drawings__grid">
            <div className="card card--pad drawings__views">
              <h2>{copy("Concept Orthographic Views", "概念级三视图")}</h2>
              <div className="drawings__row">
                <figure><figcaption>{t("furn.front")}</figcaption><FrontViewDrawing {...drawingProps} /></figure>
                <figure><figcaption>{t("furn.side")}</figcaption><SideViewDrawing {...drawingProps} /></figure>
                <figure><figcaption>{t("furn.top")}</figcaption><TopViewDrawing {...drawingProps} /></figure>
              </div>
              <p className="drawings__note">{copy("All three views use the same canonical dimensions in millimetres.", "三张视图共用同一组毫米制标准尺寸。")}</p>
            </div>
            <aside className="card card--pad spec">
              <h2>{t("furn.spec")}</h2>
              <ul className="spec__list">
                <li><strong>{copy("Table type", "桌子类型")}</strong><span>{lang === "zh" ? tableLabel?.zh : tableLabel?.en}</span></li>
                <li><strong>{t("furn.spec.dims")}</strong><span>{spec.dimensions_mm.width} × {spec.dimensions_mm.depth} × {spec.dimensions_mm.height} mm</span></li>
                <li><strong>{t("furn.spec.materials")}</strong><span>{spec.materials.map((item) => `${item.part}: ${item.material}`).join(" · ")}</span></li>
                <li><strong>{t("furn.spec.finish")}</strong><span>{furniture.finish}</span></li>
                <li><strong>{t("furn.spec.components")}</strong><span>{spec.components.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</span></li>
              </ul>
              <Button full onClick={() => window.print()}>{copy("Print / Save Views", "打印 / 保存三视图")}</Button>
              <Button full variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${generated.response.design_summary}\n${furniture.size}`); flash(copy("Specification copied.", "规格已复制。")); } catch { flash(copy("Clipboard is unavailable.", "暂时无法使用剪贴板。")); } }}>{copy("Copy Specification", "复制规格")}</Button>
              {feedback && <p className="drawings__note" role="status">{feedback}</p>}
              <p className="drawings__note">{copy("Concept only—not fabrication-ready. A furniture engineer or fabricator must verify structure, joints, tolerances, and final dimensions before production.", "当前为概念级图纸，不可直接下单生产。结构、节点、公差和最终尺寸需由家具工程师或制造商复核。")}</p>
            </aside>
          </div>
        </section>
      )}

      {furniture.phase === "generating" && <GeneratingOverlay title={copy("Designing your table", "正在设计你的桌子")} steps={FURNITURE_GENERATION_STEPS} activeIndex={furniture.stepIndex} />}
    </main>
  );
}
