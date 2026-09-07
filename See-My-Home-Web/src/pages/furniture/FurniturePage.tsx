import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, X } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Breadcrumbs, Stepper } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { useI18n } from "../../i18n/LanguageContext";
import { FURNITURE_GENERATION_STEPS } from "../../lib/agents";
import {
  deleteFurnitureImage,
  generateFurniture,
  generateFurnitureOrthographic,
  refineFurniture,
  uploadFurnitureImage,
  type FurnitureControlKey,
  type FurnitureGenerateInput,
  type FurnitureSourceKind,
  type FurnitureTableType,
  type FurnitureTopShape,
} from "../../lib/homeFurnitureApi";
import {
  createAnnotatedOrthographicSheet,
  localizeComponentLine,
  localizeFinishLine,
  localizeFurnitureNarrative,
  localizeFurnitureTerm,
  localizeMaterialLine,
} from "../../lib/furniturePresentation";
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
const MATERIAL_COLORS: Record<string, string> = {
  Walnut: "#765037",
  "White Oak": "#cdb894",
  Ash: "#d8ccb1",
  Cherry: "#9a4d37",
  Travertine: "#d9cebd",
  "Matte Black": "#353330",
};
const SECONDARY_MATERIALS = ["Blackened Steel", "Brushed Brass", "Solid Wood", "Natural Stone", "None"];
const BASE_STYLES = ["Four Tapered Legs", "Trestle Base", "Twin Pedestal", "Central Pedestal", "Plinth Base"];
const TOP_SHAPES: FurnitureTopShape[] = ["rectangular", "round", "oval", "square", "freeform"];
const EDGE_PROFILES = ["Soft Radius", "Square Edge", "Bullnose", "Beveled Edge", "Live Edge"];
const FINISHES = ["Matte Clear Oil", "Satin Lacquer", "Natural Soap", "High Gloss", "Textured Powder Coat"];
const STORAGE_OPTIONS = ["No Storage", "One Drawer", "Two Drawers", "Open Shelf", "Cable Management"];
const HARDWARE_OPTIONS = ["No Hardware", "Round Knob", "Bar Pull", "Integrated Pull"];

type FurnitureStage = "input" | "render" | "drawings";

function sizeDimensions(size: string) {
  return SIZE_PRESETS.find((preset) => preset.label === size)?.dimensions ?? SIZE_PRESETS[0].dimensions;
}

function routeStage(pathname: string): FurnitureStage {
  if (pathname.endsWith("/drawings")) return "drawings";
  if (pathname.endsWith("/render")) return "render";
  return "input";
}

export function FurniturePage() {
  const { t, tTag, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const stage = routeStage(location.pathname);
  const furniture = useDesignStore((state) => state.furniture);
  const {
    setFurniturePrompt,
    setFurnitureRefinementPrompt,
    setFurnitureSource,
    removeFurnitureSource,
    setFurnitureUploadedAsset,
    setFurnitureSketchWeight,
    setFurnitureTableType,
    setFurnitureOption,
    setFurnitureAppearance,
    unlockFurnitureControl,
    setFurniturePhase,
    setFurnitureAgentRun,
    setFurnitureOrthographicRun,
    setFurnitureAgentError,
    confirmFurniture,
    saveDesign,
  } = useDesignStore();
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<FurnitureSourceKind | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [generatingOrthographic, setGeneratingOrthographic] = useState(false);
  const [orthographicStep, setOrthographicStep] = useState(0);
  const [orthographicError, setOrthographicError] = useState<string | null>(null);
  const [annotatedOrthographic, setAnnotatedOrthographic] = useState<{ url: string; blob: Blob } | null>(null);

  const copy = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const autoLabel = copy("Auto · follow inputs", "自动 · 跟随输入");
  const hasSketch = Boolean(furniture.sketchAsset);
  const hasInspiration = Boolean(furniture.inspirationAsset);
  const hasBothImages = hasSketch && hasInspiration;
  const sketchWeight = furniture.sketchWeight ?? 80;
  const visibleSketchWeight = hasBothImages ? sketchWeight : hasSketch ? 100 : hasInspiration ? 0 : sketchWeight;
  const visibleInspirationWeight = hasBothImages ? 100 - sketchWeight : hasInspiration ? 100 : hasSketch ? 0 : 100 - sketchWeight;
  const lockedControls = furniture.lockedControls ?? [];
  const isLocked = (control: FurnitureControlKey) => lockedControls.includes(control);
  const generated = furniture.agentRun;
  const orthographic = furniture.orthographicRun;
  const spec = generated?.response.design_spec;
  const tableLabel = TABLE_TYPES.find((option) => option.value === furniture.tableType);
  const canGenerate = Boolean(furniture.sketchAsset || furniture.inspirationAsset || furniture.prompt.trim()) && !uploading;
  const steps = [
    { title: copy("Collect", "收集灵感"), hint: copy("Images & brief", "图片与描述") },
    { title: t("furn.step2"), hint: copy("Render & refine", "渲染与调整") },
    { title: t("furn.step3"), hint: copy("Views & specification", "三视图与规格") },
  ];
  const localizedSummary = generated ? localizeFurnitureNarrative(generated.response.design_summary, lang, {
    en: "A furniture concept generated from your confirmed inputs and adjustments.",
    zh: "已根据你确认的输入和调整生成家具概念方案。",
  }) : "";

  useEffect(() => {
    if (!orthographic || !spec) return;
    let active = true;
    let objectUrl: string | null = null;
    void createAnnotatedOrthographicSheet({
      imageUrl: orthographic.orthographic_image.url,
      dimensions: spec.dimensions_mm,
      language: lang,
    }).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setAnnotatedOrthographic({ url: objectUrl, blob });
    }).catch(() => {
      if (active) setAnnotatedOrthographic(null);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lang, orthographic, spec]);

  const makeInput = (description: string): FurnitureGenerateInput => ({
    project_id: furniture.projectId ?? `furniture_${crypto.randomUUID()}`,
    ...(furniture.sketchAsset ? { sketch_asset_id: furniture.sketchAsset.asset_id } : {}),
    ...(furniture.inspirationAsset ? { inspiration_asset_id: furniture.inspirationAsset.asset_id } : {}),
    locale: lang === "zh" ? "zh-CN" : "en-US",
    table_type: furniture.tableType,
    description,
    locked_controls: lockedControls,
    dimensions_mm: { ...sizeDimensions(furniture.size) },
    primary_material: furniture.material,
    secondary_material: furniture.secondaryMaterial,
    top_shape: furniture.topShape,
    edge_profile: furniture.edgeProfile,
    base_style: furniture.legs,
    finish: furniture.finish,
    storage: furniture.shelves,
    component_notes: furniture.handles,
    ...(hasBothImages ? { source_priority: { sketch: sketchWeight / 100, inspiration: (100 - sketchWeight) / 100 } } : {}),
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

  const onRemoveSource = (kind: FurnitureSourceKind) => {
    const asset = kind === "sketch" ? furniture.sketchAsset : furniture.inspirationAsset;
    const localUrl = kind === "sketch" ? furniture.sketchUrl : furniture.inspirationUrl;
    if (localUrl?.startsWith("blob:")) URL.revokeObjectURL(localUrl);
    removeFurnitureSource(kind);
    if (asset) {
      void deleteFurnitureImage(asset).catch((error) => {
        setFurnitureAgentError(error instanceof Error ? error.message : copy("Image removal failed.", "图片删除失败。"));
      });
    }
  };

  const onGenerate = async (isRefinement = false) => {
    if (!isRefinement && !furniture.sketchAsset && !furniture.inspirationAsset && !furniture.prompt.trim()) {
      setFurnitureAgentError(copy("Add a sketch, an inspiration image, or a written description.", "请添加草图、灵感图或文字描述。"));
      return;
    }
    if (uploading) {
      setFurnitureAgentError(copy("Wait for the image upload to finish.", "请等待图片上传完成。"));
      return;
    }
    const originalDescription = furniture.prompt.trim();
    const previousDescription = furniture.agentRun?.request_context?.description?.trim() || originalDescription;
    const refinement = (furniture.refinementPrompt ?? "").trim();
    const description = isRefinement
      ? refinement ? `${previousDescription}\n\n${copy("Requested revision:", "本次调整：")} ${refinement}` : previousDescription
      : originalDescription;
    const input = makeInput(description);
    setOrthographicError(null);
    setAnnotatedOrthographic(null);
    setFurnitureAgentError(null);
    setFurniturePhase("generating", 0);
    navigate("/furniture/render");
    const stepOne = window.setTimeout(() => setFurniturePhase("generating", 1), 1200);
    const stepTwo = window.setTimeout(() => setFurniturePhase("generating", 2), 3200);
    try {
      const result = furniture.agentRun?.request_context
        ? await refineFurniture(furniture.agentRun.request_context, input.locale, input, input.description)
        : await generateFurniture(input);
      setFurnitureAgentRun(result);
      setFurnitureRefinementPrompt("");
      setFurniturePhase("done");
    } catch (error) {
      setFurnitureAgentError(error instanceof Error ? error.message : copy("Furniture generation failed.", "家具生成失败。"));
      setFurniturePhase("error");
    } finally {
      window.clearTimeout(stepOne);
      window.clearTimeout(stepTwo);
    }
  };

  const onConfirm = async () => {
    if (!generated || !spec) return;
    setOrthographicError(null);
    setAnnotatedOrthographic(null);
    setFurnitureOrthographicRun(null);
    setGeneratingOrthographic(true);
    setOrthographicStep(0);
    const stepOne = window.setTimeout(() => setOrthographicStep(1), 1200);
    const stepTwo = window.setTimeout(() => setOrthographicStep(2), 3200);
    try {
      const result = await generateFurnitureOrthographic({
        project_id: generated.project_id,
        locale: lang === "zh" ? "zh-CN" : "en-US",
        render_asset_id: generated.generated_image.asset_id,
        render_image_url: generated.generated_image.url,
        design_response: generated.response,
      });
      setFurnitureOrthographicRun(result);
      confirmFurniture();
      saveDesign({
        project: "My Home",
        title: `${lang === "zh" ? tableLabel?.zh : tableLabel?.en} · ${localizeFurnitureTerm(spec.materials[0]?.material ?? furniture.material, lang, copy("Custom material", "定制材质"))}`,
        kind: "Furniture",
        detail: `${spec.dimensions_mm.width} × ${spec.dimensions_mm.depth} × ${spec.dimensions_mm.height} mm`,
      });
      navigate("/furniture/drawings");
    } catch (error) {
      console.error("[furniture-orthographic]", error);
      setOrthographicError(copy("The concept views could not be completed. Please try again.", "概念三视图未能完成，请重试。"));
    } finally {
      window.clearTimeout(stepOne);
      window.clearTimeout(stepTwo);
      setGeneratingOrthographic(false);
    }
  };

  const downloadOrthographic = async () => {
    if (!orthographic || !spec) return;
    try {
      const blob = annotatedOrthographic?.blob ?? await createAnnotatedOrthographicSheet({
        imageUrl: orthographic.orthographic_image.url,
        dimensions: spec.dimensions_mm,
        language: lang,
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${generated?.table_type ?? "table"}-orthographic-views.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      flash(copy("Concept views downloaded.", "概念三视图已下载。"));
    } catch {
      flash(copy("The image could not be downloaded. Please try again.", "图片下载失败，请重试。"));
    }
  };

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  if (stage === "drawings" && (!generated || !spec || !orthographic || !furniture.confirmed)) {
    return <Navigate to={generated ? "/furniture/render" : "/furniture"} replace />;
  }
  if (stage === "render" && !generated && furniture.phase === "idle") {
    return <Navigate to="/furniture" replace />;
  }

  const currentStep = stage === "input" ? 0 : stage === "render" ? 1 : 2;
  const uniqueMaterials = spec?.materials.filter((material, index, items) =>
    items.findIndex((candidate) => candidate.material === material.material && candidate.finish === material.finish) === index,
  ).slice(0, 3) ?? [];

  return (
    <main className="page flow-page furniture-flow" aria-busy={furniture.phase === "generating" || generatingOrthographic}>
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("furn.crumb") }]} />
      <div className="flow-head">
        <div>
          <h1 className="flow-title">{t("furn.title")}</h1>
          <p className="flow-sub">{copy("V1 designs tables from a sketch, one inspiration image, and text.", "第一版专注各种桌子，支持草图、单张灵感图与文字描述。")}</p>
        </div>
        <div className="flow-stepper"><Stepper steps={steps} current={currentStep} /></div>
      </div>

      <input ref={sketchInputRef} className="furniture-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload("sketch", event)} />
      <input ref={inspirationInputRef} className="furniture-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload("inspiration", event)} />

      {stage === "input" && (
        <section className="card card--pad furniture-intake" aria-labelledby="furniture-intake-title">
          <header className="furniture-intake__head">
            <h2 id="furniture-intake-title">{copy("Collect your inspiration", "收集你的灵感")}</h2>
            <p>{copy("Upload either image or both. When both are present, choose which one should lead.", "手绘草图和灵感图可以二选一，也可以同时上传；两张都有时再决定更接近哪一张。")}</p>
          </header>
          <div className="furniture-source-grid">
            <div className="furniture-upload-shell">
              <button type="button" className="furniture-upload furniture-upload--large" disabled={Boolean(uploading)} onClick={() => sketchInputRef.current?.click()}>
                {furniture.sketchUrl ? <img src={furniture.sketchUrl} alt={furniture.sketchName ?? t("furn.sketch")} /> : <span className="furniture-upload__plus">+</span>}
                <span><strong>{t("furn.sketch")}</strong><small>{copy("Defines form and structure", "决定造型与结构")}</small></span>
                <em>{uploading === "sketch" ? copy("Uploading…", "上传中…") : furniture.sketchName ?? copy("Choose image", "选择图片")}</em>
              </button>
              {(furniture.sketchUrl || furniture.sketchAsset) && <button type="button" className="furniture-upload__remove" aria-label={copy("Remove sketch", "删除手绘草图")} disabled={Boolean(uploading)} onClick={() => onRemoveSource("sketch")}><X size={15} /></button>}
            </div>
            <div className="furniture-upload-shell">
              <button type="button" className="furniture-upload furniture-upload--large" disabled={Boolean(uploading)} onClick={() => inspirationInputRef.current?.click()}>
                {furniture.inspirationUrl ? <img src={furniture.inspirationUrl} alt={furniture.inspirationName ?? t("furn.inspiration")} /> : <span className="furniture-upload__plus">+</span>}
                <span><strong>{t("furn.inspiration")}</strong><small>{copy("Defines style and material", "决定风格与材质")}</small></span>
                <em>{uploading === "inspiration" ? copy("Uploading…", "上传中…") : furniture.inspirationName ?? copy("Choose image", "选择图片")}</em>
              </button>
              {(furniture.inspirationUrl || furniture.inspirationAsset) && <button type="button" className="furniture-upload__remove" aria-label={copy("Remove inspiration", "删除灵感图")} disabled={Boolean(uploading)} onClick={() => onRemoveSource("inspiration")}><X size={15} /></button>}
            </div>
          </div>
          <div className={`source-mix source-mix--intake${hasBothImages ? "" : " source-mix--disabled"}`}>
            <div className="source-mix__labels" aria-hidden="true">
              <span><strong>{copy("Sketch", "草图")}</strong><small>{visibleSketchWeight}%</small></span>
              <span><small>{visibleInspirationWeight}%</small><strong>{copy("Inspiration", "灵感")}</strong></span>
            </div>
            <input
              aria-label={copy("Balance sketch and inspiration", "调整草图与灵感图倾向")}
              aria-valuetext={copy(`Sketch ${visibleSketchWeight}%, inspiration ${visibleInspirationWeight}%`, `草图 ${visibleSketchWeight}%，灵感图 ${visibleInspirationWeight}%`)}
              type="range"
              min="5"
              max="95"
              step="5"
              disabled={!hasBothImages}
              value={hasBothImages ? 100 - sketchWeight : hasSketch ? 5 : hasInspiration ? 95 : 20}
              onChange={(event) => setFurnitureSketchWeight(100 - Number(event.target.value))}
            />
          </div>
          <div className="input-panel__prompt">
            <label htmlFor="furniture-prompt" className="tag-group__name">{t("furn.prompt")}</label>
            <textarea id="furniture-prompt" rows={5} value={furniture.prompt} onChange={(event) => setFurniturePrompt(event.target.value)} placeholder={copy("Describe the table, key features, dimensions, and what must stay unchanged.", "描述桌子的用途、关键造型、尺寸，以及哪些部分必须保留。")}/>
          </div>
          <Button full size="lg" onClick={() => onGenerate(false)} disabled={!canGenerate || furniture.phase === "generating"}><Sparkle />{t("furn.generate")}</Button>
          {furniture.agentError && <p className="furniture-error" role="alert">{furniture.agentError}</p>}
        </section>
      )}

      {stage === "render" && (
        <div className="furniture-grid furniture-grid--render">
          <aside className="card card--pad input-summary-panel" aria-labelledby="input-summary-title">
            <header>
              <h2 id="input-summary-title" className="input-panel__title">{copy("Your input", "你的输入")}</h2>
              <button type="button" className="text-action" onClick={() => navigate("/furniture")}>{copy("Edit", "修改")}</button>
            </header>
            <div className="input-summary-panel__body">
              <div className="input-summary__sources">
                {(furniture.sketchName || furniture.sketchUrl) && (
                  <figure>{furniture.sketchUrl ? <img src={furniture.sketchUrl} alt="" /> : <span>{copy("Ready", "已上传")}</span>}<figcaption>{copy("Sketch", "草图")} · {furniture.sketchName}</figcaption></figure>
                )}
                {(furniture.inspirationName || furniture.inspirationUrl) && (
                  <figure>{furniture.inspirationUrl ? <img src={furniture.inspirationUrl} alt="" /> : <span>{copy("Ready", "已上传")}</span>}<figcaption>{copy("Inspiration", "灵感")} · {furniture.inspirationName}</figcaption></figure>
                )}
              </div>
              {(hasSketch || hasInspiration || (generated && generated.source_priority.sketch + generated.source_priority.inspiration > 0)) && (
                <div className="input-summary__weight">
                  <span>{copy("Sketch", "草图")} {Math.round((generated?.source_priority.sketch ?? (hasSketch ? 1 : 0)) * 100)}%</span>
                  <i aria-hidden="true"><b style={{ width: `${Math.round((generated?.source_priority.sketch ?? (hasSketch ? 1 : 0)) * 100)}%` }} /></i>
                  <span>{copy("Inspiration", "灵感")} {Math.round((generated?.source_priority.inspiration ?? (hasInspiration ? 1 : 0)) * 100)}%</span>
                </div>
              )}
              <div className="input-summary__brief">
                <strong>{copy("Original brief", "原始描述")}</strong>
                <p>{furniture.prompt || copy("No written description", "未填写文字描述")}</p>
              </div>
            </div>
          </aside>

          <section className="card render-panel render-panel--stage" aria-label={t("furn.step2")}>
            {generated ? (
              <>
                <div className="render-panel__media"><img className="render-panel__image" src={generated.generated_image.url} alt={localizedSummary} /></div>
                <div className="render-panel__meta">
                  <div className="render-panel__decision">
                    <div className="render-panel__swatches">{uniqueMaterials.map((material) => <span className="swatch" key={`${material.material}-${material.finish}`}><i className="swatch__dot" style={{ background: MATERIAL_COLORS[material.material] ?? "#806044" }} aria-hidden="true" />{localizeFurnitureTerm(material.material, lang, copy("Custom material", "定制材质"))}</span>)}</div>
                    <Button disabled={furniture.phase === "generating" || generatingOrthographic || generated.response.status === "failed"} onClick={() => void onConfirm()}>{t("furn.thisIsIt")}</Button>
                  </div>
                  {orthographicError && (
                    <div className="render-panel__orthographic-error" role="alert">
                      <span>{orthographicError}</span>
                      <button type="button" onClick={() => void onConfirm()}>{copy("Try again", "重新生成")}</button>
                    </div>
                  )}
                  <details className="render-panel__details">
                    <summary>{copy("Design details", "设计说明")}</summary>
                    <p>{localizedSummary}</p>
                    {generated.response.warnings.length > 0 && <ul>{generated.response.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{localizeFurnitureNarrative(warning, lang, {
                      en: "Please review this concept before confirming it.",
                      zh: "确认前请检查这项概念提示。",
                    })}</li>)}</ul>}
                  </details>
                </div>
              </>
            ) : (
              <div className="render-panel__loading">
                <span className="render-panel__loading-mark"><Sparkle size={30} /></span>
                <strong>{furniture.phase === "error" ? copy("The render could not be completed", "效果图未能完成") : copy("Preparing your furniture render", "正在准备家具效果图")}</strong>
                <p>{furniture.phase === "error" ? copy("Return to your input or try again after checking the message on the left.", "请根据左侧提示返回修改输入，或重新尝试。") : copy("Your result will appear here without moving the page.", "生成完成后会在当前位置显示，不会让页面跳动。")}</p>
              </div>
            )}
          </section>

          <aside className="card card--pad refine-panel refine-panel--stage" aria-labelledby="refine-title">
            <header>
              <h2 id="refine-title" className="input-panel__title">{copy("Refine this piece", "调整这件家具")}</h2>
              <p className="refine-panel__hint">{copy("Change only what matters, then generate again.", "只调整重要的部分，然后重新生成。")}</p>
            </header>
            <div className="refine-panel__body">
              <fieldset className="material-picker">
                <legend>{copy("Color / material", "颜色 / 材质")}</legend>
                <div>{MATERIALS.map((material) => (
                  <button type="button" key={material} className="material-choice" aria-pressed={isLocked("primary_material") && furniture.material === material} onClick={() => setFurnitureOption("material", material)}>
                    <i style={{ background: MATERIAL_COLORS[material] }} aria-hidden="true" /><span>{tTag(material)}</span>
                  </button>
                ))}</div>
                {isLocked("primary_material") && <button type="button" className="text-action" onClick={() => unlockFurnitureControl("primary_material")}>{copy("Use input material", "恢复跟随输入")}</button>}
              </fieldset>

              <div className="refine-request">
                <label className="refine-label" htmlFor="furniture-refinement">{copy("What should change?", "还想怎么调整？")}</label>
                <textarea id="furniture-refinement" rows={5} value={furniture.refinementPrompt ?? ""} onChange={(event) => setFurnitureRefinementPrompt(event.target.value)} placeholder={copy("For example: keep both drawers, make the legs slimmer, and use a lighter wood.", "例如：保留两个抽屉、桌腿更细、木色再浅一点。")}/>
              </div>

              <details className="advanced-controls">
                <summary>{copy("Advanced adjustments", "高级调整")}</summary>
                <ul className="refine-list refine-list--advanced">
                  <li><label htmlFor="furniture-type">{copy("Table type", "桌子类型")}</label><select id="furniture-type" value={furniture.tableType} onChange={(event) => setFurnitureTableType(event.target.value as FurnitureTableType)}>{TABLE_TYPES.map((option) => <option value={option.value} key={option.value}>{lang === "zh" ? option.zh : option.en}</option>)}</select></li>
                  <li><label htmlFor="furniture-size">{copy("Dimensions", "整体尺寸")}</label><select id="furniture-size" value={isLocked("dimensions_mm") ? furniture.size : ""} onChange={(event) => event.target.value ? setFurnitureOption("size", event.target.value) : unlockFurnitureControl("dimensions_mm")}><option value="">{autoLabel}</option>{SIZE_PRESETS.map((option) => <option value={option.label} key={option.label}>{option.label}</option>)}</select></li>
                  <li><label htmlFor="furniture-secondary">{copy("Secondary material", "辅材")}</label><select id="furniture-secondary" value={isLocked("secondary_material") ? furniture.secondaryMaterial : ""} onChange={(event) => event.target.value ? setFurnitureAppearance("secondaryMaterial", event.target.value) : unlockFurnitureControl("secondary_material")}><option value="">{autoLabel}</option>{SECONDARY_MATERIALS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-shape">{copy("Top shape", "桌面形状")}</label><select id="furniture-shape" value={isLocked("top_shape") ? furniture.topShape : ""} onChange={(event) => event.target.value ? setFurnitureAppearance("topShape", event.target.value) : unlockFurnitureControl("top_shape")}><option value="">{autoLabel}</option>{TOP_SHAPES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-edge">{copy("Edge profile", "边缘造型")}</label><select id="furniture-edge" value={isLocked("edge_profile") ? furniture.edgeProfile : ""} onChange={(event) => event.target.value ? setFurnitureAppearance("edgeProfile", event.target.value) : unlockFurnitureControl("edge_profile")}><option value="">{autoLabel}</option>{EDGE_PROFILES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-base">{copy("Base / legs", "桌腿 / 底座")}</label><select id="furniture-base" value={isLocked("base_style") ? furniture.legs : ""} onChange={(event) => event.target.value ? setFurnitureOption("legs", event.target.value) : unlockFurnitureControl("base_style")}><option value="">{autoLabel}</option>{BASE_STYLES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-finish">{copy("Finish", "表面处理")}</label><select id="furniture-finish" value={isLocked("finish") ? furniture.finish : ""} onChange={(event) => event.target.value ? setFurnitureAppearance("finish", event.target.value) : unlockFurnitureControl("finish")}><option value="">{autoLabel}</option>{FINISHES.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-storage">{copy("Storage", "抽屉 / 收纳")}</label><select id="furniture-storage" value={isLocked("storage") ? furniture.shelves : ""} onChange={(event) => event.target.value ? setFurnitureOption("shelves", event.target.value) : unlockFurnitureControl("storage")}><option value="">{autoLabel}</option>{STORAGE_OPTIONS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                  <li><label htmlFor="furniture-hardware">{copy("Hardware", "拉手 / 五金")}</label><select id="furniture-hardware" value={isLocked("component_notes") ? furniture.handles : ""} onChange={(event) => event.target.value ? setFurnitureOption("handles", event.target.value) : unlockFurnitureControl("component_notes")}><option value="">{autoLabel}</option>{HARDWARE_OPTIONS.map((option) => <option value={option} key={option}>{tTag(option)}</option>)}</select></li>
                </ul>
              </details>
            </div>
            <Button full size="lg" disabled={!generated || Boolean(uploading) || furniture.phase === "generating"} onClick={() => onGenerate(true)}><Sparkle />{copy("Apply changes & regenerate", "应用调整并重新生成")}</Button>
          </aside>
        </div>
      )}

      {stage === "drawings" && generated && spec && orthographic && (
        <section className="furniture-drawings-stage" aria-label={t("furn.drawings")}>
          <div className="drawings-stage__toolbar"><button type="button" className="text-action" onClick={() => navigate("/furniture/render")}>← {copy("Back to render", "返回调整效果图")}</button></div>
          <div className="drawings__grid">
            <div className="card card--pad drawings__views">
              <h2>{copy("Concept Orthographic Views", "概念级三视图")}</h2>
              <div className="orthographic-sheet-frame">
                <img src={annotatedOrthographic?.url ?? orthographic.orthographic_image.url} alt={copy("One dimensioned black-and-white orthographic sheet showing the confirmed table from the front, side, and top", "与已确认效果图一致、带尺寸的黑白正视、侧视和顶视三视图合成图")} />
                {!annotatedOrthographic && <span className="orthographic-sheet-frame__status">{copy("Applying exact dimensions…", "正在标注精确尺寸…")}</span>}
              </div>
              <p className="drawings__note">{copy("Generated from the confirmed render; exact overall dimensions are applied from the confirmed specification.", "基于已确认效果图生成，并按确认规格标注准确的整体尺寸。")}</p>
            </div>
            <aside className="card card--pad spec">
              <h2>{t("furn.spec")}</h2>
              <ul className="spec__list">
                <li><strong>{copy("Table type", "桌子类型")}</strong><span>{lang === "zh" ? tableLabel?.zh : tableLabel?.en}</span></li>
                <li><strong>{t("furn.spec.dims")}</strong><span>{spec.dimensions_mm.width} × {spec.dimensions_mm.depth} × {spec.dimensions_mm.height} mm</span></li>
                <li><strong>{t("furn.spec.materials")}</strong><span>{localizeMaterialLine(spec.materials, lang)}</span></li>
                <li><strong>{t("furn.spec.finish")}</strong><span>{localizeFinishLine(spec.materials, lang)}</span></li>
                <li><strong>{t("furn.spec.components")}</strong><span>{localizeComponentLine(spec.components, lang)}</span></li>
              </ul>
              <Button full onClick={() => void downloadOrthographic()}><Download size={16} />{copy("Download views", "下载三视图")}</Button>
              <Button full variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${localizedSummary}\n${spec.dimensions_mm.width} × ${spec.dimensions_mm.depth} × ${spec.dimensions_mm.height} mm\n${localizeMaterialLine(spec.materials, lang)}`); flash(copy("Specification copied.", "规格已复制。")); } catch { flash(copy("Clipboard is unavailable.", "暂时无法使用剪贴板。")); } }}>{copy("Copy Specification", "复制规格")}</Button>
              {feedback && <p className="drawings__note" role="status">{feedback}</p>}
              <p className="drawings__note">{copy("Concept only—not fabrication-ready. A furniture engineer or fabricator must verify structure, joints, tolerances, and final dimensions before production.", "当前为概念级图纸，不可直接下单生产。结构、节点、公差和最终尺寸需由家具工程师或制造商复核。")}</p>
            </aside>
          </div>
        </section>
      )}

      {furniture.phase === "generating" && <GeneratingOverlay title={copy("Designing your table", "正在设计你的桌子")} steps={FURNITURE_GENERATION_STEPS} activeIndex={furniture.stepIndex} />}
      {generatingOrthographic && <GeneratingOverlay title={copy("Creating the concept views", "正在生成概念三视图")} steps={FURNITURE_GENERATION_STEPS} activeIndex={orthographicStep} />}
    </main>
  );
}
