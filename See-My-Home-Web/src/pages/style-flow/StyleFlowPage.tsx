import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { UploadGuide } from "../../components/ui/UploadGuide";
import { TemplateArt } from "../../components/visuals/TemplateArt";
import { STYLE_ROOM_TYPES, type StyleRoomType } from "../../data/rooms";
import { STYLE_PLACEHOLDER_SLOTS, STYLE_TEMPLATES } from "../../data/styleTemplates";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { STYLE_GENERATION_STEPS } from "../../lib/agents";
import { generateStyle, roomTypeToCode, uploadStylePhoto } from "../../lib/homeStyleApi";
import { useDesignStore } from "../../store/useDesignStore";
import "../layout-flow/layout-flow.css";
import "./style-flow.css";

const WHAT_YOU_GET: { titleKey: MsgKey; textKey: MsgKey }[] = [
  { titleKey: "style.get1.title", textKey: "style.get1.text" },
  { titleKey: "style.get2.title", textKey: "style.get2.text" },
  { titleKey: "style.get3.title", textKey: "style.get3.text" },
];

export function StyleFlowPage() {
  const navigate = useNavigate();
  const { lang, t, tTag } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const style = useDesignStore((s) => s.style);
  const {
    setStylePhoto,
    setStyleRoomType,
    setStyleTemplate,
    setStylePhase,
    setStyleUploadedAsset,
    setStyleAgentRun,
    setStyleAgentError,
  } = useDesignStore();
  const [uploading, setUploading] = useState(false);

  const openPhotoPicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const onRemovePhoto = () => {
    if (style.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(style.photoUrl);
    setStylePhoto(null, null);
    setStyleAgentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    if (style.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(style.photoUrl);
    setStylePhoto(file.name, URL.createObjectURL(file));
    setStyleUploadedAsset(null);
    setStyleAgentError(null);
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

  const onGenerate = async () => {
    if (!style.uploadedAsset) {
      setStyleAgentError(t("style.uploadError"));
      return;
    }
    const template = STYLE_TEMPLATES.find((candidate) => candidate.id === style.templateId) ?? STYLE_TEMPLATES[0];
    if (!template) return;
    setStylePhase("generating", 0);
    setStyleAgentError(null);
    try {
      const run = await generateStyle({
        project_id: style.uploadedAsset.project_id,
        asset_id: style.uploadedAsset.asset_id,
        locale: lang === "zh" ? "zh-CN" : "en-US",
        room_type: roomTypeToCode(style.roomType),
        style_id: template.styleId,
        style_profile: "quiet-poise",
        renovation_scope: "finishes_and_furnishing",
      });
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

          {style.photoUrl ? (
            <div className="room-panel__uploaded">
              <div className="room-panel__photo">
                <img src={style.photoUrl} alt={tTag(style.roomType)} />
                {style.uploadedAsset && (
                  <span className="room-panel__status room-panel__photo-status" role="status">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {t("style.uploaded")}
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
                  <strong>{style.photoName ?? t("style.uploadPrompt")}</strong>
                  <span>{style.uploadedAsset
                    ? (lang === "zh" ? "照片已准备好" : "Photo ready")
                    : uploading
                      ? t("style.uploading")
                      : (lang === "zh" ? "上传未完成，请替换照片后重试" : "Upload incomplete — replace the photo to try again")}</span>
                </div>
                <div className="room-panel__actions">
                  <button type="button" onClick={openPhotoPicker} disabled={uploading}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {lang === "zh" ? "替换" : "Replace"}
                  </button>
                  <button type="button" onClick={onRemovePhoto} disabled={uploading}>
                    <Trash2 size={15} aria-hidden="true" />
                    {lang === "zh" ? "删除" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" className="room-panel__dropzone" onClick={openPhotoPicker} disabled={uploading}>
              <span className="room-panel__upload-icon"><ImagePlus size={26} aria-hidden="true" /></span>
              <strong>{uploading ? t("style.uploading") : t("style.uploadPrompt")}</strong>
              <span>{lang === "zh" ? "选择一张明亮、正对房间的 JPG、PNG 或 WebP 照片" : "Choose a bright, straight-on JPG, PNG, or WebP room photo"}</span>
              <span className="room-panel__choose">{lang === "zh" ? "选择照片" : "Choose photo"}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
        </section>

        <section className="card card--pad template-panel" aria-label={t("style.choose")}>
          <h2 className="confirm-panel__title">{t("style.choose")}</h2>
          <div className="template-grid" role="listbox" aria-label={t("style.choose")}>
            {STYLE_TEMPLATES.map((template) => {
              const selected = style.templateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="style-card"
                  onClick={() => setStyleTemplate(template.id)}
                >
                  <span className="style-card__art">
                    <TemplateArt template={template} />
                    {selected && (
                      <span className="style-card__check" aria-hidden="true">
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="style-card__name">{template.name}</span>
                  <span className="style-card__tags">
                    {template.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tTag(tag)}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
            {STYLE_PLACEHOLDER_SLOTS.map((slot, index) => (
              <button
                key={slot.id}
                type="button"
                role="option"
                aria-selected="false"
                aria-label={`${t("style.comingSoon")} ${index + 1}`}
                className="style-card style-card--placeholder"
                disabled
              >
                <span className="style-card__art style-card__placeholder-art" aria-hidden="true">
                  <span className="style-card__placeholder-orbit" />
                  <span className="style-card__placeholder-mark">+</span>
                </span>
                <span className="style-card__name">{t("style.comingSoon")}</span>
                <span className="style-card__tags">
                  <span className="chip">{t("style.inDevelopment")}</span>
                </span>
              </button>
            ))}
          </div>

          <h3 className="template-panel__what">{t("style.whatGet")}</h3>
          <ul className="what-list">
            {WHAT_YOU_GET.map((item) => (
              <li key={item.titleKey}>
                <strong>{t(item.titleKey)}</strong>
                <span>{t(item.textKey)}</span>
              </li>
            ))}
          </ul>

          {style.agentError && <p className="layout-agent-error" role="alert">{style.agentError}</p>}

          <Button size="lg" full onClick={onGenerate} disabled={!style.uploadedAsset || uploading || style.phase === "generating"}>
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
