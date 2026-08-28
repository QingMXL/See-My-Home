import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { RoomScene } from "../../components/visuals/RoomScene";
import { STYLE_TEMPLATES, type StyleStory } from "../../data/styleTemplates";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { buildRefinementReplyKey, runGeneration, STYLE_GENERATION_STEPS } from "../../lib/agents";
import { downloadSvgIn } from "../../lib/download";
import { useDesignStore } from "../../store/useDesignStore";
import "../layout-flow/layout-flow.css";
import "./style-result.css";

const SUGGESTIONS = ["Warmer palette", "Replace sofa", "Keep existing floor", "Simpler wall"];

const STORY_SECTIONS: { key: keyof Omit<StyleStory, "direction">; labelKey: MsgKey }[] = [
  { key: "material", labelKey: "story.material" },
  { key: "light", labelKey: "story.light" },
  { key: "furniture", labelKey: "story.furniture" },
  { key: "mood", labelKey: "story.mood" },
];

export function StyleResultPage() {
  const { t, tTag, lang } = useI18n();
  const style = useDesignStore((s) => s.style);
  const { addRefinement, setStylePhase, saveDesign } = useDesignStore();
  const [selectedFrame, setSelectedFrame] = useState<number>(-1);
  const [request, setRequest] = useState("");
  const [replyKey, setReplyKey] = useState<MsgKey | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const template = useMemo(
    () => STYLE_TEMPLATES.find((tpl) => tpl.id === style.templateId) ?? STYLE_TEMPLATES[0],
    [style.templateId],
  );
  const story = lang === "zh" ? template.storyZh : template.story;

  if (style.phase !== "done" && style.phase !== "generating") return <Navigate to="/style" replace />;

  const frames = [t("styleResult.current"), ...style.refinements.map((_, i) => t("styleResult.refinementN", { n: i + 1 }))];
  const shownRefinementLevel = selectedFrame === -1 ? style.refinements.length : selectedFrame;
  const showOriginal = selectedFrame === -2;

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const onRefine = async (text?: string) => {
    const ask = (text ?? request).trim();
    if (!ask) return;
    setStylePhase("generating", 0);
    setReplyKey(null);
    try {
      await runGeneration(STYLE_GENERATION_STEPS, (i) => setStylePhase("generating", i));
      addRefinement(ask);
      setStylePhase("done");
      setSelectedFrame(-1);
      setReplyKey(buildRefinementReplyKey(ask));
      setRequest("");
    } catch {
      setStylePhase("error");
    }
  };

  const onSave = () => {
    saveDesign({
      project: "My Home",
      title: `${style.roomType} · ${template.name}`,
      kind: "Style",
      detail: `${style.refinements.length} refinements`,
    });
    flash(t("result.saved"));
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText("https://seemyhome.app/share/style-demo");
      flash(t("result.copied"));
    } catch {
      flash(t("result.shareUnavailable"));
    }
  };

  return (
    <main className="page flow-page">
      <Breadcrumbs
        crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("style.crumb"), to: "/style" }, { label: tTag(style.roomType) }]}
      />

      <header className="result-head">
        <h1 className="flow-title">{t("styleResult.title")}</h1>
        <p className="flow-sub">{t("styleResult.sub")}</p>
      </header>

      <div className="style-result-grid">
        <section aria-label={t("styleResult.title")}>
          <div className="card render-canvas" ref={canvasRef}>
            {showOriginal && style.photoUrl ? (
              <img src={style.photoUrl} alt={t("styleResult.original")} style={{ width: "100%", display: "block" }} />
            ) : (
              <RoomScene
                variant={showOriginal ? "photo" : "render"}
                template={template}
                refinementLevel={showOriginal ? 0 : shownRefinementLevel}
              />
            )}
          </div>

          <ul className="frames" aria-label={t("styleResult.suggestions")}>
            <li>
              <button type="button" className="frame" aria-pressed={showOriginal} onClick={() => setSelectedFrame(-2)}>
                <span className="frame__thumb">
                  <RoomScene variant="photo" />
                </span>
                {t("styleResult.original")}
              </button>
            </li>
            {frames.map((label, i) => {
              const level = i;
              const isCurrent = selectedFrame === -1 ? i === frames.length - 1 : selectedFrame === level;
              return (
                <li key={label}>
                  <button type="button" className="frame" aria-pressed={isCurrent} onClick={() => setSelectedFrame(level)}>
                    <span className="frame__thumb">
                      <RoomScene variant="render" template={template} refinementLevel={level} />
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="style-actions">
            <Button onClick={() => onRefine()} disabled={!request.trim()}>
              <Sparkle /> {t("styleResult.refine")}
            </Button>
            <Button variant="secondary" onClick={onSave}>
              {t("result.save")}
            </Button>
            <Button variant="secondary" onClick={onShare}>
              {t("result.share")}
            </Button>
            <Button variant="secondary" onClick={() => downloadSvgIn(canvasRef.current, "see-my-home-style")}>
              {t("result.download")}
            </Button>
          </div>
          {feedback && (
            <p className="result-feedback" role="status">
              {feedback}
            </p>
          )}
        </section>

        <aside className="style-side" aria-label={t("styleResult.story")}>
          <section className="card card--pad story">
            <span className="story__kicker">{t("styleResult.story")}</span>
            <h2 className="story__name">{template.name}</h2>
            <p className="story__direction">{story.direction}</p>
            <ul className="story__list">
              {STORY_SECTIONS.map((s) => (
                <li key={s.key}>
                  <strong>{t(s.labelKey)}</strong>
                  <span>{story[s.key]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card card--pad refine-box">
            <h2 className="refine-box__title">{t("styleResult.whatChange")}</h2>
            <textarea
              rows={3}
              placeholder={t("styleResult.placeholder")}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              aria-label={t("styleResult.whatChange")}
            />
            <div className="refine-box__suggestions">
              <span className="tag-group__name">{t("styleResult.suggestions")}</span>
              <div className="tag-grid">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="tag" onClick={() => onRefine(s)}>
                    {tTag(s)}
                  </button>
                ))}
              </div>
            </div>
            {replyKey && (
              <p className="refine-box__reply" role="status">
                <Sparkle size={14} /> {t(replyKey)}
              </p>
            )}
          </section>
        </aside>
      </div>

      {style.phase === "generating" && (
        <GeneratingOverlay title={t("gen.refineTitle")} steps={STYLE_GENERATION_STEPS} activeIndex={style.stepIndex} />
      )}
    </main>
  );
}
