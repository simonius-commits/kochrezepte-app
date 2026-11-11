import { useEffect, useRef, useState } from "react";
import CardOptionsMenu from "./CardOptionsMenu.jsx";

export default function IngredientCategoryCard({ category, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(category.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  async function saveRename() {
    setRenaming(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== category.name) {
      await onRename(category, trimmed);
    } else {
      setNameValue(category.name);
    }
  }

  return (
    <div className="entity-card">
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
                setNameValue(category.name);
                setRenaming(false);
              }
            }}
            onBlur={saveRename}
          />
        ) : (
          <h3 className="entity-card-title">{category.name}</h3>
        )}
      </div>

      <div className="entity-card-footer">
        <p className="entity-card-meta">{category.count} Zutaten</p>
        <CardOptionsMenu
          items={[
            { label: "Umbenennen", onClick: () => setRenaming(true) },
            {
              label: "Löschen",
              danger: true,
              disabled: category.count > 0,
              title: category.count > 0 ? "Wird noch von Zutaten verwendet" : undefined,
              onClick: () => onDelete(category),
            },
          ]}
        />
      </div>
    </div>
  );
}
