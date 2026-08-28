import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { FurnishedPlan, type PlanView } from "../../components/visuals/FurnishedPlan";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { buildLayoutResult } from "../../lib/agents";
import { downloadSvgIn } from "../../lib/download";
import { useDesignStore } from "../../store/useDesignStore";
import "./layout-flow.css";
import "./layout-result.css";

const VIEWS: { id: PlanView; labelKey: MsgKey }[] = [
  { id: "design", labelKey: "result.view.design" },
  { id: "furniture", labelKey: "result.view.furniture" },
  { id: "circulation", labelKey: "result.view.circulation" },
  { id: "labels", labelKey: "result.view.labels" },
];

export function LayoutResultPage() {
  const navigate = useNavigate();
  const { t, tTag } = useI18n();
  const layout = useDesignStore((s) => s.layout);
  const saveDesign = useDesignStore((s) => s.saveDesign);
  const [view, setView] = useState<PlanView>("design");
  const [feedback, setFeedback] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => buildLayoutResult(layout.rooms.map((r) => r.label), layout.lifestyleTags),
    [layout.rooms, layout.lifestyleTags],
  );

  if (layout.phase !== "done") return <Navigate to="/layout" replace />;

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const onSave = () => {
    saveDesign({
      project: "My Home",
      title: "Furnished Layout",
      kind: "Layout",
      detail: `${layout.rooms.length} rooms · ${layout.lifestyleTags.length} preferences`,
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
            <FurnishedPlan view={view} rooms={layout.rooms.map((r) => ({ ...r, label: tTag(r.label) }))} />
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
          <h2 className="result-side__title">{t("result.notes")}</h2>
          <ol className="notes">
            {result.notes.map((note, i) => (
              <li key={note.room} className="notes__item">
                <span className="notes__num">{i + 1}</span>
                <div>
                  <strong>{tTag(note.room)}</strong>
                  <p>{t(note.noteKey)}</p>
                </div>
              </li>
            ))}
          </ol>

          {result.keyDecisions.length > 0 && (
            <>
              <h3 className="result-side__subtitle">{t("result.keyDecisions")}</h3>
              <div className="tag-grid">
                {result.keyDecisions.map((d) => (
                  <span key={d} className="chip">
                    {tTag(d)}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="result-actions">
            <Button variant="secondary" onClick={() => navigate("/layout")}>
              {t("result.refineLayout")}
            </Button>
            <Button variant="secondary" onClick={onSave}>
              {t("result.save")}
            </Button>
            <Button variant="secondary" onClick={onShare}>
              {t("result.share")}
            </Button>
            <Button variant="secondary" onClick={() => downloadSvgIn(canvasRef.current, "see-my-home-layout")}>
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
    </main>
  );
}
