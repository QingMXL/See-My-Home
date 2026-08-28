import { useI18n } from "../../i18n/LanguageContext";
import type { GenerationStep } from "../../lib/agents";
import { Sparkle } from "./Button";
import "./ui.css";

interface GeneratingOverlayProps {
  title: string;
  steps: GenerationStep[];
  activeIndex: number;
}

/** Full-screen generation state with lightweight staged progress (PRD §9). */
export function GeneratingOverlay({ title, steps, activeIndex }: GeneratingOverlayProps) {
  const { t } = useI18n();
  return (
    <div className="generating" role="status" aria-live="polite">
      <div className="generating__panel">
        <div className="generating__spark" aria-hidden="true">
          <Sparkle size={48} />
        </div>
        <p className="generating__title">{title}</p>
        <ol className="generating__steps">
          {steps.map((step, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
            return (
              <li key={step.labelKey} className="generating__step" data-state={state}>
                <span className="generating__dot" aria-hidden="true">
                  {state === "done" && (
                    <svg viewBox="0 0 12 12" width="8" height="8" fill="none">
                      <path d="m2.5 6.2 2.2 2.2L9.5 3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                {t(step.labelKey)}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
