import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { RoomScene } from "../../components/visuals/RoomScene";
import { TemplateArt } from "../../components/visuals/TemplateArt";
import { STYLE_ROOM_TYPES, type StyleRoomType } from "../../data/rooms";
import { STYLE_TEMPLATES } from "../../data/styleTemplates";
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

const VISIBLE_ROOM_TYPES: StyleRoomType[] = ["Living Room", "Primary Bedroom", "Dining Room", "Home Office"];

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
          {style.uploadedAsset ? (
            <span className="room-panel__status" role="status">
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="m5.2 8.3 1.9 1.9 3.7-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("style.uploaded")}
            </span>
          ) : (
            <span className="room-panel__status room-panel__status--pending">
              {uploading ? t("style.uploading") : t("style.uploadPrompt")}
            </span>
          )}

          <div className="tag-grid room-panel__types" role="group" aria-label={t("style.crumb")}>
            {VISIBLE_ROOM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="tag"
                aria-pressed={style.roomType === type}
                onClick={() => setStyleRoomType(type)}
              >
                {tTag(type)}
              </button>
            ))}
            <select
              className="room-panel__more"
              aria-label={t("style.more")}
              value={STYLE_ROOM_TYPES.includes(style.roomType) && !VISIBLE_ROOM_TYPES.includes(style.roomType) ? style.roomType : ""}
              onChange={(e) => e.target.value && setStyleRoomType(e.target.value as StyleRoomType)}
            >
              <option value="">{t("style.more")}</option>
              {STYLE_ROOM_TYPES.filter((rt) => !VISIBLE_ROOM_TYPES.includes(rt)).map((rt) => (
                <option key={rt} value={rt}>
                  {tTag(rt)}
                </option>
              ))}
            </select>
          </div>

          <div className="room-panel__photo">
            {style.photoUrl ? (
              <img src={style.photoUrl} alt={tTag(style.roomType)} />
            ) : (
              <RoomScene variant="photo" />
            )}
          </div>

          <div className="room-panel__foot">
            <button type="button" className="room-panel__replace" onClick={() => fileInputRef.current?.click()}>
              {t("style.replace")}
            </button>
            <span aria-hidden="true">|</span>
            <span>{t("style.tips")}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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

      {style.phase === "generating" && (
        <GeneratingOverlay title={t("gen.styleTitle")} steps={STYLE_GENERATION_STEPS} activeIndex={style.stepIndex} />
      )}
    </main>
  );
}
