import { useEffect, useRef, useState } from "react";
import { CornerDownRight } from "lucide-react";
import CardOptionsMenu, { useMenuNachLinks } from "./CardOptionsMenu.jsx";

// categories: [{id, name}] — für das Kategorie-Zuordnen-Dropdown hinter dem Pfeil-Icon.
// onAssignCategory(ingredient, categoryId | null) — categoryId ist null bei "Keine Kategorie".
export default function IngredientCard({
  ingredient,
  categories = [],
  onClick,
  onRename,
  onDelete,
  onMergeRequest,
  onAssignCategory,
}) {
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const kategorieMenuRef = useRef(null);
  const kategorieMenuKlasse = useMenuNachLinks(kategorieMenuRef, categoryMenuOpen);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(ingredient.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    function handleClickOutside() {
      setCategoryMenuOpen(false);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [categoryMenuOpen]);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  async function saveRename() {
    setRenaming(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== ingredient.name) {
      await onRename(ingredient, trimmed);
    } else {
      setNameValue(ingredient.name);
    }
  }

  async function handleAssignCategory(categoryId) {
    setCategoryMenuOpen(false);
    if (categoryId === (ingredient.category_id || null)) return;
    await onAssignCategory(ingredient, categoryId);
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
                setNameValue(ingredient.name);
                setRenaming(false);
              }
            }}
            onBlur={saveRename}
          />
        ) : (
          <h3 className="entity-card-title">{ingredient.name}</h3>
        )}
      </div>

      <div className="entity-card-footer">
        <p className="entity-card-meta">{ingredient.count} Rezepte</p>
        <div className="entity-card-icon-group">
          {/* Anker: das Kategorie-Menü klappt direkt unter diesem Button auf (linksbündig) */}
          <span className="card-menu-anchor">
            <button
              type="button"
              className="entity-card-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                setCategoryMenuOpen((open) => !open);
              }}
              aria-label="Kategorie zuordnen"
              title="Kategorie zuordnen"
            >
              <CornerDownRight size={16} />
            </button>
            {categoryMenuOpen && (
              <div ref={kategorieMenuRef} className={`entity-card-menu${kategorieMenuKlasse}`} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="entity-card-menu-item entity-card-menu-item-muted"
                  onClick={() => handleAssignCategory(null)}
                >
                  Keine Kategorie
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="entity-card-menu-item"
                    onClick={() => handleAssignCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </span>
          <CardOptionsMenu
            items={[
              { label: "Umbenennen", onClick: () => setRenaming(true) },
              { label: "Mit anderer Zutat zusammenführen", onClick: () => onMergeRequest(ingredient) },
              {
                label: "Löschen",
                danger: true,
                disabled: ingredient.count > 0,
                title: ingredient.count > 0 ? "Wird noch in Rezepten verwendet" : undefined,
                onClick: () => onDelete(ingredient),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
