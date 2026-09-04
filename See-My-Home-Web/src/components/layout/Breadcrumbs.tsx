import { Link } from "react-router-dom";
import "./chrome.css";

interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.label} className="breadcrumbs__item" style={{ display: "inline-flex", gap: "0.5rem" }}>
            {crumb.to && !isLast ? (
              <Link to={crumb.to}>{crumb.label}</Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{crumb.label}</span>
            )}
            {!isLast && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

interface StepperProps {
  steps: { title: string; hint: string }[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={step.title} className="stepper__step" data-state={state} style={{ flex: 1 }}>
            <div className="stepper__row">
              {i > 0 ? <span className="stepper__line" aria-hidden="true" /> : <span style={{ flex: 1 }} />}
              <span className="stepper__dot">
                {state === "done" ? (
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
                    <path d="m2.5 6.2 2.2 2.2L9.5 3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 ? <span className="stepper__line" aria-hidden="true" /> : <span style={{ flex: 1 }} />}
            </div>
            <span className="stepper__title">{step.title}</span>
            <span className="stepper__hint">{step.hint}</span>
          </li>
        );
      })}
    </ol>
  );
}
