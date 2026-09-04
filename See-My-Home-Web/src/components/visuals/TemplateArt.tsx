import type { StyleTemplate } from "../../data/styleTemplates";
import { mix } from "./RoomScene";

/** Abstract preview artwork for a design template card. */
export function TemplateArt({ template }: { template: StyleTemplate }) {
  const { from, to, accent, line } = template.palette;
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={`${template.name} style preview`} style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={`bg-${template.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#bg-${template.id})`} />
      {/* Room suggestion: floor line, window, furniture masses */}
      <rect y="140" width="320" height="60" fill={mix(to, "#8a6f4d", 0.35)} opacity="0.55" />
      <rect x="24" y="28" width="92" height="112" rx="4" fill={mix(from, "#ffffff", 0.55)} stroke={line} strokeWidth="4" opacity="0.9" />
      <line x1="70" y1="28" x2="70" y2="140" stroke={line} strokeWidth="3" opacity="0.9" />
      <line x1="24" y1="86" x2="116" y2="86" stroke={line} strokeWidth="3" opacity="0.9" />
      <rect x="150" y="96" width="120" height="34" rx="10" fill={mix(from, "#ffffff", 0.4)} stroke={line} strokeWidth="3" />
      <rect x="150" y="76" width="120" height="26" rx="9" fill={mix(from, "#ffffff", 0.6)} stroke={line} strokeWidth="3" />
      <circle cx="290" cy="70" r="20" fill={accent} />
      <rect x="196" y="140" width="52" height="16" rx="8" fill={line} opacity="0.8" />
      <path d="M 40 176 Q 160 158 300 176" stroke={mix(line, "#000", 0.1)} strokeWidth="2" fill="none" opacity="0.35" />
    </svg>
  );
}
