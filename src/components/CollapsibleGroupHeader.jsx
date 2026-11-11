import { ChevronDown, ChevronUp } from "lucide-react";

export default function CollapsibleGroupHeader({ title, muted, collapsed, onToggle }) {
  const Icon = collapsed ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      className="ingredient-group-header"
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      <h2 className={muted ? "ingredient-group-title ingredient-group-title-muted" : "ingredient-group-title"}>
        {title}
      </h2>
      <Icon size={18} className="ingredient-group-chevron" />
    </button>
  );
}
