import { useEffect, useRef, useState } from "react";
import CardOptionsMenu from "./CardOptionsMenu.jsx";

export default function ToolCard({ tool, onClick, onRename, onDelete, onMergeRequest }) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(tool.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  async function saveRename() {
    setRenaming(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== tool.name) {
      await onRename(tool, trimmed);
    } else {
      setNameValue(tool.name);
    }
  }

  return (
    <div
      className="entity-card"
      onClick={renaming ? undefined : onClick}
      role={onClick && !renaming ? "button" : undefined}
      tabIndex={onClick && !renaming ? 0 : undefined}
    >
      <div className="entity-card-header">
        {renaming ? (
          <input
            ref={inputRef}
            className="input-field entity-card-rename-input"
            value={nameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveRename();
              }
              if (e.key === "Escape") {
                setNameValue(tool.name);
                setRenaming(false);
              }
            }}
            onBlur={saveRename}
          />
        ) : (
          <h3 className="entity-card-title">{tool.name}</h3>
        )}
      </div>

      <div className="entity-card-footer">
        <p className="entity-card-meta">{tool.count} Rezepte</p>
        <CardOptionsMenu
          items={[
            { label: "Umbenennen", onClick: () => setRenaming(true) },
            { label: "Mit anderem Hilfsmittel zusammenführen", onClick: () => onMergeRequest(tool) },
            {
              label: "Löschen",
              danger: true,
              disabled: tool.count > 0,
              title: tool.count > 0 ? "Wird noch in Rezepten verwendet" : undefined,
              onClick: () => onDelete(tool),
            },
          ]}
        />
      </div>
    </div>
  );
}
