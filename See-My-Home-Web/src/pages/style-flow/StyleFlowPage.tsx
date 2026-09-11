import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { UploadGuide } from "../../components/ui/UploadGuide";
import { STYLE_ROOM_TYPES, type StyleRoomType } from "../../data/rooms";
import {
  createDemoStyleResult,
  DEMO_STYLE_ASSET,
  DEMO_STYLE_FILE_NAME,
  DEMO_STYLE_SOURCE_URL,
  isDemoStyleAsset,
} from "../../data/styleDemo";
import { STYLE_TEMPLATES } from "../../data/styleTemplates";
import { useI18n } from "../../i18n/LanguageContext";
import { runGeneration, STYLE_GENERATION_STEPS } from "../../lib/agents";
import { generateStyle, roomTypeToCode, uploadStylePhoto } from "../../lib/homeStyleApi";
import { useDesignStore } from "../../store/useDesignStore";
import "../layout-flow/layout-flow.css";
import "./style-flow.css";

async function imageAssetAvailable(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

export function StyleFlowPage() {
  const navigate = useNavigate();
  const { lang, t, tTag } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const style = useDesignStore((s) => s.style);
  const {
    setStylePhoto,
    setStyleRoomType,
    setStyleTemplate,
    setStyleCustomRequirements,
    setStyleSource,
    setStyleReference,
    setStyleReferenceAsset,
    setStylePhase,
    setStyleUploadedAsset,
    setStyleAgentRun,
    setStyleAgentError,
  } = useDesignStore();
  const [uploading, setUploading] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const selectedTemplate = STYLE_TEMPLATES.find((candidate) => candidate.id === style.templateId) ?? STYLE_TEMPLATES[0];
  const isDemo = isDemoStyleAsset(style.uploadedAsset);
  const usesCustomReference = style.styleSource === "reference" && Boolean(style.referenceAsset);

  const openPhotoPicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const onRemovePhoto = () => {
    if (style.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(style.photoUrl);
    if (style.referenceUrl?.startsWith("blob:")) URL.revokeObjectURL(style.referenceUrl);
    setStylePhoto(null, null);
    setStyleAgentError(null);
    setShowDemoPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openDemoPreview = async () => {
    const assetsAvailable = await Promise.all([
      imageAssetAvailable(DEMO_STYLE_SOURCE_URL),
      ...STYLE_TEMPLATES.map((template) => imageAssetAvailable(template.demoResultUrl)),
    ]);
    if (assetsAvailable.some((available) => !available)) {
      setStyleAgentError(lang === "zh" ? "风格案例暂时无法读取。" : "The style example is unavailable.");
      return;
    }
    setStyleAgentError(null);
    for (const template of STYLE_TEMPLATES) {
      const preload = new Image();
      preload.src = template.demoResultUrl;
    }
    setShowDemoPreview(true);
  };

  const confirmDemoInput = () => {
    if (style.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(style.photoUrl);
    setStylePhoto(DEMO_STYLE_FILE_NAME, DEMO_STYLE_SOURCE_URL);
    setStyleUploadedAsset(DEMO_STYLE_ASSET);
    setStyleRoomType("Living Room");
    setStyleAgentError(null);
    setShowDemoPreview(false);
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    if (style.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(style.photoUrl);
    if (style.referenceUrl?.startsWith("blob:")) URL.revokeObjectURL(style.referenceUrl);
    setStylePhoto(file.name, URL.createObjectURL(file));
    setStyleUploadedAsset(null);
    setStyleAgentError(null);
    setShowDemoPreview(false);
    setUploading(true);
    try {
      const asset = await uploadStylePhoto(file, lang === "zh" ? "zh-CN" : "en-US");
      setStyleUploadedAsset(asset);
    } catch (error) {
      setStyleAgentError(error instanceof Error ? error.message : t("style.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const openReferencePicker = () => {
    if (!referenceInputRef.current || !style.uploadedAsset || isDemo) return;
    referenceInputRef.current.value = "";
    referenceInputRef.current.click();
  };

  const onReferenceChosen = async (file: File | undefined) => {
    if (!file || !style.uploadedAsset || isDemo) return;
    if (style.referenceUrl?.startsWith("blob:")) URL.revokeObjectURL(style.referenceUrl);
    setStyleReference(file.name, URL.createObjectURL(file));
    setStyleAgentError(null);
    setUploadingReference(true);
    try {
      const asset = await uploadStylePhoto(file, lang === "zh" ? "zh-CN" : "en-US", style.uploadedAsset.project_id, "reference");
      setStyleReferenceAsset(asset);
    } catch (error) {
      setStyleAgentError(error instanceof Error ? error.message : t("style.referenceUploadError"));
    } finally {
      setUploadingReference(false);
    }
  };

  const onRemoveReference = () => {
    if (style.referenceUrl?.startsWith("blob:")) URL.revokeObjectURL(style.referenceUrl);
    setStyleReference(null, null);
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  };

  const onGenerate = async () => {
    if (!style.uploadedAsset) {
      setStyleAgentError(t("style.uploadError"));
      return;
    }
    const template = selectedTemplate;
    if (!template) return;
    if (!isDemo && !usesCustomReference && !template.styleId) {
      setStyleAgentError(lang === "zh"
        ? "这个风格目前可以在风格案例中查看，上传照片生成正在准备中。"
        : "This style is available in the Style Example while generation for uploaded rooms is being prepared.");
      return;
    }
    const input = {
      project_id: style.uploadedAsset.project_id,
      asset_id: style.uploadedAsset.asset_id,
      locale: lang === "zh" ? "zh-CN" as const : "en-US" as const,
      room_type: roomTypeToCode(style.roomType),
      style_id: template.styleId ?? "modern_east" as const,
      style_profile: template.styleProfile,
      renovation_scope: "finishes_and_furnishing" as const,
      preferences: style.customRequirements.trim() ? [style.customRequirements.trim()] : [],
      ...(usesCustomReference && style.referenceAsset ? { reference_asset_id: style.referenceAsset.asset_id } : {}),
    };
    setStylePhase("generating", 0);
    setStyleAgentError(null);
    try {
      const run = isDemo
        ? await runGeneration(STYLE_GENERATION_STEPS, (stepIndex) => setStylePhase("generating", stepIndex))
            .then(() => createDemoStyleResult(template, input))
        : await generateStyle(input);
      setStyleAgentRun(run);
      setStylePhase("done");
      navigate("/style/result");
    } catch (error) {
      setStyleAgentError(error instanceof Error ? error.message : t("style.agentError"));
      setStylePhase("error");
    }
  };

  return (
    <main className="page flow-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("style.crumb") }]} />

      <div className="flow-head">
        <div>
          <h1 className="flow-title">
            {t("style.titleA")}
            <br />
            {t("style.titleB")}
          </h1>
          <p className="flow-sub">{t("style.sub")}</p>
        </div>
      </div>

      <div className="style-grid">
        <section className="card card--pad room-panel" aria-label={t("style.uploadPrompt")}>
          <div className="room-panel__room-field">
            <label htmlFor="style-room-type">{lang === "zh" ? "房间类型" : "Room type"}</label>
            <select
              id="style-room-type"
              value={style.roomType}
              onChange={(e) => setStyleRoomType(e.target.value as StyleRoomType)}
            >
              {STYLE_ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {tTag(rt)}
                </option>
              ))}
            </select>
          </div>

          {showDemoPreview ? (
            <div className="style-demo-preview" aria-labelledby="style-demo-preview-title">
              <header>
                <span>{lang === "zh" ? "原始房间" : "Original room"}</span>
                <h2 id="style-demo-preview-title">{lang === "zh" ? "查看风格案例" : "Review the Style Example"}</h2>
                <p>{lang === "zh"
                  ? "从这张未经设计的房间照片开始，再选择右侧的三个风格查看变化。"
                  : "Start with this undesigned room, then choose one of the three styles to see the transformation."}</p>
              </header>
              <img src={DEMO_STYLE_SOURCE_URL} alt={lang === "zh" ? "风格案例的原始房间" : "Original room for the style example"} />
              <div className="style-demo-preview__actions">
                <Button variant="secondary" onClick={() => setShowDemoPreview(false)}>{lang === "zh" ? "返回" : "Back"}</Button>
                <Button onClick={confirmDemoInput}><Sparkle />{lang === "zh" ? "使用这个案例" : "Use this example"}</Button>
              </div>
            </div>
          ) : style.photoUrl ? (
            <div className="room-panel__uploaded">
              <div className="room-panel__photo">
                <img src={style.photoUrl} alt={tTag(style.roomType)} />
                <button
                  type="button"
                  className="room-panel__photo-remove"
                  onClick={onRemovePhoto}
                  disabled={uploading}
                  aria-label={lang === "zh" ? "删除房间照片" : "Remove room photo"}
                  title={lang === "zh" ? "删除房间照片" : "Remove room photo"}
                >
                  <X size={17} aria-hidden="true" />
                </button>
                {style.uploadedAsset && (
                  <span className="room-panel__status room-panel__photo-status" role="status">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {isDemo ? (lang === "zh" ? "案例已准备好" : "Example ready") : t("style.uploaded")}
                  </span>
                )}
                {uploading && (
                  <span className="room-panel__status room-panel__status--pending room-panel__photo-status" role="status">
                    {t("style.uploading")}
                  </span>
                )}
              </div>
              <div className="room-panel__filebar">
                <div>
                  <strong>{isDemo ? (lang === "zh" ? "风格案例" : DEMO_STYLE_FILE_NAME) : style.photoName ?? t("style.uploadPrompt")}</strong>
                  <span>{style.uploadedAsset
                    ? isDemo
                      ? (lang === "zh" ? "选择右侧风格查看案例效果" : "Choose a style to view the example result")
                      : (lang === "zh" ? "照片已准备好" : "Photo ready")
                    : uploading
                      ? t("style.uploading")
                      : (lang === "zh" ? "上传未完成，请替换照片后重试" : "Upload incomplete — replace the photo to try again")}</span>
                </div>
                <div className="room-panel__actions">
                  <button type="button" onClick={openPhotoPicker} disabled={uploading}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {lang === "zh" ? "替换" : "Replace"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="room-panel__dropzone">
              <span className="room-panel__upload-icon"><ImagePlus size={26} aria-hidden="true" /></span>
              <strong>{uploading ? t("style.uploading") : t("style.uploadPrompt")}</strong>
              <span>{lang === "zh" ? "选择一张明亮、正对房间的 JPG、PNG 或 WebP 照片" : "Choose a bright, straight-on JPG, PNG, or WebP room photo"}</span>
              <div className="room-panel__dropzone-actions">
                <Button onClick={openPhotoPicker} disabled={uploading}>{lang === "zh" ? "选择照片" : "Choose photo"}</Button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />

          <label className="style-requirements" htmlFor="style-custom-requirements">
            <span className="style-requirements__heading">
              <strong>{t("style.requirementsTitle")}</strong>
              <small>{style.customRequirements.length}/240</small>
            </span>
            <span className="style-requirements__hint">{t("style.requirementsHint")}</span>
            <textarea
              id="style-custom-requirements"
              rows={4}
              maxLength={240}
              value={style.customRequirements}
              placeholder={t("style.requirementsPlaceholder")}
              onChange={(event) => setStyleCustomRequirements(event.target.value)}
            />
          </label>
        </section>

        <section className="card card--pad template-panel" aria-label={t("style.choose")}>
          <div className="template-panel__header">
            <h2 className="confirm-panel__title">{t("style.choose")}</h2>
            <Button
              variant="secondary"
              onClick={() => void openDemoPreview()}
              disabled={uploading || uploadingReference || style.phase === "generating"}
            >
              {t("style.example")}
            </Button>
          </div>
          <div className="template-grid" role="group" aria-label={t("style.choose")}>
            {STYLE_TEMPLATES.map((template) => {
              const selected = !usesCustomReference && selectedTemplate?.id === template.id;
              const templateName = lang === "zh" ? template.nameZh : template.name;
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected}
                  className="style-card"
                  onClick={() => setStyleTemplate(template.id)}
                >
                  <span className="style-card__art">
                    <img src={template.previewUrl} alt={`${templateName} ${lang === "zh" ? "风格效果图" : "style result"}`} />
                    {selected && (
                      <span className="style-card__check" aria-hidden="true">
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="style-card__name">{templateName}</span>
                  <span className="style-card__tagline">{lang === "zh" ? template.taglineZh : template.tagline}</span>
                </button>
              );
            })}
            <article className={`style-card style-reference-card${usesCustomReference ? " style-reference-card--selected" : ""}`}>
              <div className="style-card__art style-reference-card__art">
                {style.referenceUrl ? (
                  <>
                    <button
                      type="button"
                      className="style-reference-card__image"
                      onClick={() => style.referenceAsset && setStyleSource("reference")}
                      disabled={uploadingReference || !style.referenceAsset}
                      aria-pressed={usesCustomReference}
                      aria-label={t("style.referenceUse")}
                    >
                      <img src={style.referenceUrl} alt={t("style.referencePreviewAlt")} />
                    </button>
                    {usesCustomReference && (
                      <span className="style-card__check" aria-hidden="true">
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                    <button
                      type="button"
                      className="style-reference-card__remove"
                      onClick={onRemoveReference}
                      disabled={uploadingReference}
                      aria-label={t("style.referenceRemove")}
                      title={t("style.referenceRemove")}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="style-reference-card__upload"
                    onClick={openReferencePicker}
                    disabled={!style.uploadedAsset || isDemo || uploadingReference}
                  >
                    <ImagePlus size={24} aria-hidden="true" />
                    <strong>{t("style.referenceChoose")}</strong>
                    <small>{style.uploadedAsset && !isDemo ? t("style.referenceFileHint") : t("style.referenceUploadFirst")}</small>
                  </button>
                )}
              </div>
              <span className="style-card__name" id="style-reference-title">{t("style.referenceTitle")}</span>
              <span className="style-card__tagline">
                {uploadingReference ? t("style.referenceUploading") : t("style.referenceCardDescription")}
              </span>
            </article>
          </div>

          <input
            ref={referenceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={(event) => onReferenceChosen(event.target.files?.[0])}
          />

          {style.uploadedAsset && !isDemo && !usesCustomReference && selectedTemplate && !selectedTemplate.styleId && (
            <p className="style-availability-note" role="status">
              {lang === "zh"
                ? `${selectedTemplate.nameZh}目前可在风格案例中查看；上传照片生成正在准备中。`
                : `${selectedTemplate.name} is available in the Style Example; generation for uploaded rooms is being prepared.`}
            </p>
          )}

          {style.agentError && <p className="layout-agent-error" role="alert">{style.agentError}</p>}

          <Button
            size="lg"
            full
            onClick={onGenerate}
            disabled={
              !style.uploadedAsset
              || uploading
              || uploadingReference
              || style.phase === "generating"
              || (!isDemo && !usesCustomReference && !selectedTemplate?.styleId)
            }
          >
            <Sparkle />
            {t("style.cta")}
          </Button>
        </section>
      </div>

      <UploadGuide kind="style" />

      {style.phase === "generating" && (
        <GeneratingOverlay title={t("gen.styleTitle")} steps={STYLE_GENERATION_STEPS} activeIndex={style.stepIndex} />
      )}
    </main>
  );
}
