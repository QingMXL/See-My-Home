import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n/LanguageContext";
import type { GenerationStep } from "../../lib/agents";
import { Sparkle } from "./Button";
import "./ui.css";

interface GeneratingOverlayProps {
  title: string;
  steps: GenerationStep[];
  activeIndex: number;
  startedAt?: number;
}

/** Full-screen generation state with lightweight staged progress (PRD §9). */
export function GeneratingOverlay({ title, steps, activeIndex, startedAt }: GeneratingOverlayProps) {
  const { t, lang } = useI18n();
  const [elapsedSeconds, setElapsedSeconds] = useState(() => startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const elapsed = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return createPortal(
    <div className="generating" role="dialog" aria-modal="true" aria-labelledby="generating-title">
      <div className="generating__panel" aria-live="polite">
        <div className="generating__spark" aria-hidden="true">
          <Sparkle size={48} />
        </div>
        <p className={`generating__title${startedAt ? " generating__title--timed" : ""}`} id="generating-title">{title}</p>
        {startedAt && <p className="generating__elapsed">{lang === "zh" ? `已用时 ${elapsed}` : `Elapsed ${elapsed}`}</p>}
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
    </div>,
    document.body,
  );
}
