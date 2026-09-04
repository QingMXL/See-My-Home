import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { FurnishedPlan, type PlanView } from "../../components/visuals/FurnishedPlan";
import { ConfirmedLayoutPlan } from "../../components/visuals/ConfirmedLayoutPlan";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { LAYOUT_GENERATION_STEPS } from "../../lib/agents";
import { downloadImageWithLabels, downloadSvgIn } from "../../lib/download";
import { refineLayout } from "../../lib/homeLayoutApi";
import { useDesignStore } from "../../store/useDesignStore";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import "./layout-flow.css";
import "./layout-result.css";

const VIEWS: { id: PlanView; labelKey: MsgKey }[] = [
  { id: "design", labelKey: "result.view.design" },
  { id: "furniture", labelKey: "result.view.furniture" },
  { id: "circulation", labelKey: "result.view.circulation" },
  { id: "labels", labelKey: "result.view.labels" },
];

export function LayoutResultPage() {
  const { lang, t, tTag } = useI18n();
  const layout = useDesignStore((s) => s.layout);
  const { saveDesign, setLayoutAgentRun, setLayoutPhase, setLayoutAgentError } = useDesignStore();
  const [view, setView] = useState<PlanView>("design");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  if (layout.phase !== "done" || !layout.agentRun) return <Navigate to="/layout" replace />;

  const agentRun = layout.agentRun;
  const generatedImage = agentRun.generated_image;
  const hasLockedPlan = Boolean(layout.fileUrl && agentRun.render_plan && layout.rooms.every((room) => room.polygon));
  const homeModel = agentRun.intake.home_model;
  const assessmentItems = agentRun.diagnosis.diagnosis?.assessment_items ?? [];

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const onSave = () => {
    saveDesign({
      project: "My Home",
      title: "Furnished Layout",
      kind: "Layout",
      detail: `${homeModel?.spaces.length ?? layout.rooms.length} rooms · Home Model r${homeModel?.model_revision ?? 1}`,
    });
    flash(t("result.saved"));
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText("https://seemyhome.app/share/layout-demo");
      flash(t("result.copied"));
    } catch {
      flash(t("result.shareUnavailable"));
    }
  };

  const onDownload = async () => {
    if (!generatedImage) {
      downloadSvgIn(canvasRef.current, "see-my-home-layout");
      return;
    }
    try {
      await downloadImageWithLabels(
        generatedImage.url,
        layout.rooms.map((room) => ({
          text: tTag(room.label),
          anchor: room.labelAnchor ?? [room.x / 900, room.y / 560],
        })),
        "see-my-home-layout",
      );
    } catch {
      flash(t("result.downloadError"));
    }
  };

  const onRefine = async () => {
    const request = refinement.trim();
    if (!request) {
      setRefineError(t("result.refineRequired"));
      return;
    }
    setRefining(true);
    setRefineError(null);
    try {
      const result = await refineLayout(
        agentRun.intake.home_id,
        lang === "zh" ? "zh-CN" : "en-US",
        request,
      );
      setLayoutAgentRun(result);
      setLayoutPhase("done");
      setRefinement("");
      setRefineOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("result.refineError");
      setRefineError(message);
      setLayoutAgentError(message);
      setLayoutPhase("done");
    } finally {
      setRefining(false);
    }
  };

  return (
    <main className="page flow-page">
      <Breadcrumbs
        crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("layout.crumb"), to: "/layout" }, { label: tTag("My Home") }]}
      />

      <header className="result-head">
        <div>
          <h1 className="flow-title">{t("result.title")}</h1>
          <p className="flow-sub">{t("result.sub")}</p>
        </div>
      </header>

      <div className="result-grid">
        <section aria-label={t("result.view.design")}>
          <div className="view-tabs" role="tablist" aria-label={t("result.view.design")}>
            {VIEWS.map((v) => (
              <button key={v.id} role="tab" aria-selected={view === v.id} className="view-tab" onClick={() => setView(v.id)}>
                {t(v.labelKey)}
              </button>
            ))}
          </div>
          <div className="card result-canvas" ref={canvasRef}>
            {generatedImage && view !== "circulation" ? (
              <div className="generated-layout-stage">
                <img
                  className="generated-layout-image"
                  src={generatedImage.url}
                  alt={t("result.title")}
                />
                {(view === "design" || view === "labels") && (
                  <div className="generated-room-labels">
                    {layout.rooms.map((room) => {
                      const anchor = room.labelAnchor ?? [room.x / 900, room.y / 560];
                      return (
                        <span key={room.id} style={{ left: `${anchor[0] * 100}%`, top: `${anchor[1] * 100}%` }}>
                          {tTag(room.label)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : hasLockedPlan && layout.fileUrl && agentRun.render_plan ? (
              <ConfirmedLayoutPlan
                imageUrl={layout.fileUrl}
                imageAlt={layout.fileName ?? t("result.title")}
                rooms={layout.rooms}
                boundaries={layout.imageAnalysis?.boundaries ?? []}
                openings={layout.imageAnalysis?.openings ?? []}
                renderPlan={agentRun.render_plan}
                view={view}
                roomLabel={(room) => tTag(room.label)}
              />
            ) : (
              <FurnishedPlan view={view} rooms={layout.rooms.map((r) => ({ ...r, label: tTag(r.label) }))} />
            )}
            {view === "circulation" && (
              <div className="legend card--pad">
                <strong>{t("result.circulation")}</strong>
                <span className="legend__item legend__item--primary">{t("result.primaryFlow")}</span>
                <span className="legend__item legend__item--secondary">{t("result.secondaryFlow")}</span>
              </div>
            )}
          </div>
        </section>

        <aside className="card card--pad result-side" aria-label={t("result.notes")}>
          <h2 className="result-side__title">{t("result.agentSummary")}</h2>
          {assessmentItems.length > 0 ? (
            <ol className="notes assessment-list">
              {assessmentItems.slice(0, 5).map((item, i) => (
                <li key={item.id} className="notes__item">
                  <span className="notes__num">{i + 1}</span>
                  <div>
                    <strong>{item.title[lang === "zh" ? "zh-CN" : "en-US"]}</strong>
                    <p>{item.statement[lang === "zh" ? "zh-CN" : "en-US"]}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="assessment-empty">{t("result.assessmentEmpty")}</p>
          )}

          <div className="result-actions">
            <Button variant="secondary" onClick={() => setRefineOpen(true)}>
              {t("result.refineLayout")}
            </Button>
            <Button variant="secondary" onClick={onSave}>
              {t("result.save")}
            </Button>
            <Button variant="secondary" onClick={onShare}>
              {t("result.share")}
            </Button>
            <Button variant="secondary" onClick={onDownload}>
              {t("result.download")}
            </Button>
          </div>
          <Link to="/style">
            <Button size="lg" full>
              <Sparkle />
              {t("result.tryStyle")}
            </Button>
          </Link>
          {feedback && (
            <p className="result-feedback" role="status">
              {feedback}
            </p>
          )}
        </aside>
      </div>

      {refineOpen && (
        <div className="refine-dialog-backdrop" role="presentation" onMouseDown={() => !refining && setRefineOpen(false)}>
          <section className="refine-dialog" role="dialog" aria-modal="true" aria-labelledby="refine-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="refine-dialog-title">{t("result.refineTitle")}</h2>
            <p>{t("result.refineHint")}</p>
            <textarea
              autoFocus
              value={refinement}
              onChange={(event) => setRefinement(event.target.value)}
              placeholder={t("result.refinePlaceholder")}
              rows={5}
              disabled={refining}
            />
            {refineError && <p className="layout-agent-error" role="alert">{refineError}</p>}
            <div className="refine-dialog__actions">
              <Button variant="secondary" onClick={() => setRefineOpen(false)} disabled={refining}>{t("result.cancel")}</Button>
              <Button onClick={onRefine} disabled={refining}><Sparkle />{t("result.regenerate")}</Button>
            </div>
          </section>
        </div>
      )}
      {refining && <GeneratingOverlay title={t("gen.layoutTitle")} steps={LAYOUT_GENERATION_STEPS} activeIndex={2} />}
    </main>
  );
}
