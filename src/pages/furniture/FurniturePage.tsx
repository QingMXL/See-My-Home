import { useEffect, useRef } from "react";
import { Breadcrumbs, Stepper } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { FrontViewDrawing, SideViewDrawing, TopViewDrawing } from "../../components/visuals/FurnitureDrawings";
import { FurnitureRender } from "../../components/visuals/FurnitureRender";
import { useI18n } from "../../i18n/LanguageContext";
import { FURNITURE_GENERATION_STEPS, runGeneration } from "../../lib/agents";
import { useDesignStore } from "../../store/useDesignStore";
import "../layout-flow/layout-flow.css";
import "./furniture.css";

const OPTIONS: { key: "material" | "size" | "legs" | "handles" | "shelves"; label: string; choices: string[] }[] = [
  { key: "material", label: "Material", choices: ["Walnut", "White Oak", "Ash", "Matte Black"] },
  { key: "size", label: "Size", choices: ['96" W × 20" D × 30" H', '84" W × 18" D × 28" H', '72" W × 18" D × 30" H'] },
  { key: "legs", label: "Legs", choices: ["Metal Base", "Wood Tapered", "Plinth Base"] },
  { key: "handles", label: "Handles", choices: ["Push-to-Open", "Brass Pulls", "Leather Tabs"] },
  { key: "shelves", label: "Shelves", choices: ["Open Shelf in Center", "Closed Cabinet", "Two Open Shelves"] },
];

function SketchThumb() {
  return (
    <svg viewBox="0 0 200 110" aria-hidden="true" style={{ width: "100%", height: "auto" }}>
      <rect width="200" height="110" fill="#fdfcf9" />
      <g stroke="#3c3a36" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M 28 34 L 174 32 L 173 78 L 29 80 Z" />
        <path d="M 30 40 L 172 38" />
        <path d="M 70 39 L 71 79 M 130 38 L 131 78" />
        <path d="M 72 58 L 129 57" />
        <path d="M 38 80 L 36 96 M 164 78 L 166 94" />
        <path d="M 33 30 q 70 -6 144 0" strokeWidth="0.8" />
        <path d="M 90 66 q 12 4 22 0" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function FurniturePage() {
  const { t, tTag } = useI18n();
  const furniture = useDesignStore((s) => s.furniture);
  const { setFurniturePrompt, setFurnitureOption, setFurniturePhase, confirmFurniture, saveDesign } = useDesignStore();
  const drawingsRef = useRef<HTMLElement>(null);

  const steps = [
    { title: t("furn.step1"), hint: t("furn.step1hint") },
    { title: t("furn.step2"), hint: t("furn.step2hint") },
    { title: t("furn.step3"), hint: t("furn.step3hint") },
  ];

  const onGenerate = async () => {
    setFurniturePhase("generating", 0);
    try {
      await runGeneration(FURNITURE_GENERATION_STEPS, (i) => setFurniturePhase("generating", i));
      setFurniturePhase("done");
    } catch {
      setFurniturePhase("error");
    }
  };

  useEffect(() => {
    if (furniture.confirmed) drawingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [furniture.confirmed]);

  const currentStep = furniture.phase !== "done" ? 0 : furniture.confirmed ? 2 : 1;

  return (
    <main className="page flow-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("furn.crumb") }]} />

      <div className="flow-head">
        <div>
          <h1 className="flow-title">{t("furn.title")}</h1>
          <p className="flow-sub">{t("furn.sub")}</p>
        </div>
        <div className="flow-stepper">
          <Stepper steps={steps} current={currentStep} />
        </div>
      </div>

      <div className="furniture-grid">
        <section className="card card--pad input-panel" aria-label={t("furn.input")}>
          <h2 className="input-panel__title">{t("furn.input")}</h2>
          <figure className="input-panel__figure">
            <SketchThumb />
            <figcaption>{t("furn.sketch")}</figcaption>
          </figure>
          <figure className="input-panel__figure input-panel__figure--render">
            <FurnitureRender material="Walnut" legs="Wood Tapered" />
            <figcaption>{t("furn.inspiration")}</figcaption>
          </figure>
          <div className="input-panel__prompt">
            <label htmlFor="furniture-prompt" className="tag-group__name">
              {t("furn.prompt")}
            </label>
            <textarea
              id="furniture-prompt"
              rows={3}
              value={furniture.prompt}
              onChange={(e) => setFurniturePrompt(e.target.value)}
            />
          </div>
          {furniture.phase !== "done" && (
            <Button full onClick={onGenerate}>
              <Sparkle />
              {t("furn.generate")}
            </Button>
          )}
        </section>

        <section className="card render-panel" aria-label={t("furn.step2")}>
          {furniture.phase === "done" ? (
            <>
              <FurnitureRender material={furniture.material} legs={furniture.legs} />
              <div className="render-panel__swatches">
                <span className="swatch">
                  <i className="swatch__dot swatch__dot--wood" aria-hidden="true" /> {tTag(furniture.material)}
                </span>
                <span className="swatch">
                  <i className="swatch__dot swatch__dot--stone" aria-hidden="true" /> {tTag("Light Stone")}
                </span>
                <span className="swatch">
                  <i className="swatch__dot swatch__dot--matte" aria-hidden="true" /> {tTag("Matte Finish")}
                </span>
              </div>
            </>
          ) : (
            <div className="render-panel__empty">
              <Sparkle size={32} />
              <p>{t("furn.emptyTitle")}</p>
              <span>{t("furn.emptyText")}</span>
            </div>
          )}
        </section>

        <aside className="card card--pad refine-panel" aria-label={t("furn.refine")}>
          <h2 className="input-panel__title">{t("furn.refine")}</h2>
          <ul className="refine-list">
            {OPTIONS.map((opt) => (
              <li key={opt.key}>
                <label htmlFor={`opt-${opt.key}`}>{tTag(opt.label)}</label>
                <select
                  id={`opt-${opt.key}`}
                  value={furniture[opt.key]}
                  disabled={furniture.phase !== "done"}
                  onChange={(e) => setFurnitureOption(opt.key, e.target.value)}
                >
                  {opt.choices.map((c) => (
                    <option key={c} value={c}>
                      {tTag(c)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <Button
            full
            size="lg"
            disabled={furniture.phase !== "done"}
            onClick={() => {
              confirmFurniture();
              saveDesign({
                project: "My Home",
                title: `Custom Sideboard · ${furniture.material}`,
                kind: "Furniture",
                detail: furniture.size,
              });
            }}
          >
            {t("furn.thisIsIt")}
          </Button>
        </aside>
      </div>

      {furniture.confirmed && (
        <section className="drawings" ref={drawingsRef} aria-label={t("furn.drawings")}>
          <div className="drawings__grid">
            <div className="card card--pad drawings__views">
              <h2>{t("furn.drawings")}</h2>
              <div className="drawings__row">
                <figure>
                  <figcaption>{t("furn.front")}</figcaption>
                  <FrontViewDrawing />
                </figure>
                <figure>
                  <figcaption>{t("furn.side")}</figcaption>
                  <SideViewDrawing />
                </figure>
                <figure>
                  <figcaption>{t("furn.top")}</figcaption>
                  <TopViewDrawing />
                </figure>
              </div>
              <p className="drawings__note">{t("furn.dimNote")}</p>
            </div>

            <aside className="card card--pad spec">
              <h2>{t("furn.spec")}</h2>
              <ul className="spec__list">
                <li>
                  <strong>{t("furn.spec.dims")}</strong>
                  <span>{furniture.size}</span>
                </li>
                <li>
                  <strong>{t("furn.spec.materials")}</strong>
                  <span>{t("furn.spec.materialsValue", { material: tTag(furniture.material) })}</span>
                </li>
                <li>
                  <strong>{t("furn.spec.finish")}</strong>
                  <span>{tTag("Matte Finish")}</span>
                </li>
                <li>
                  <strong>{t("furn.spec.components")}</strong>
                  <span>{t("furn.spec.componentsValue", { shelves: tTag(furniture.shelves), legs: tTag(furniture.legs) })}</span>
                </li>
              </ul>
              <Button full>{t("furn.downloadDrawings")}</Button>
              <Button full variant="secondary">
                {t("furn.shareFabricator")}
              </Button>
              <p className="drawings__note">{t("furn.disclaimer")}</p>
            </aside>
          </div>
        </section>
      )}

      {furniture.phase === "generating" && (
        <GeneratingOverlay title={t("gen.furnitureTitle")} steps={FURNITURE_GENERATION_STEPS} activeIndex={furniture.stepIndex} />
      )}
    </main>
  );
}
