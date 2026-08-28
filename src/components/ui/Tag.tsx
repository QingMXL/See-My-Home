import "./ui.css";

interface TagProps {
  label: string;
  selected: boolean;
  onToggle: (label: string) => void;
}

export function Tag({ label, selected, onToggle }: TagProps) {
  return (
    <button type="button" className="tag" aria-pressed={selected} onClick={() => onToggle(label)}>
      {label}
      {selected && (
        <span className="tag__check" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#fff" />
            <path d="m5 8.2 2 2 4-4.4" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
