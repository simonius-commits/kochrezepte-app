import { Heart } from "lucide-react";
import Tag from "./Tag.jsx";
import CardOptionsMenu from "./CardOptionsMenu.jsx";

// onEdit/onDuplicate/onDelete sind optional — fehlen sie (z.B. bei Demo-Rezepten ohne
// Datenbank), wird der "…"-Button nicht angezeigt.
export default function RecipeCard({ recipe, onClick, onEdit, onDuplicate, onDelete }) {
  const { titel, kategorie, zubereitungszeit_min, kochzeit_min, gesamtzeit_min, bild_url, favorit, tags = [] } =
    recipe;

  // Gesamtzeit aus dem Rezept (inkl. Ruhezeit), sonst Zubereitung + Kochen
  const gesamtzeit = gesamtzeit_min || (zubereitungszeit_min || 0) + (kochzeit_min || 0);
  const hasMenu = Boolean(onEdit && onDuplicate && onDelete);

  return (
    <div className="recipe-card" onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="recipe-card-image-wrap">
        {bild_url ? (
          <img className="recipe-card-image" src={bild_url} alt={titel} />
        ) : (
          <div className="recipe-card-image" />
        )}
        {favorit && (
          <span className="recipe-card-favorit" title="Favorit" aria-label="Favorit">
            <Heart size={14} fill="currentColor" />
          </span>
        )}
        {gesamtzeit > 0 && (
          <span className="recipe-card-time-badge">{gesamtzeit} Min</span>
        )}
      </div>
      <h3 className="recipe-card-title">{titel}</h3>
      {kategorie && <p className="recipe-card-category">{kategorie}</p>}
      {(tags.length > 0 || hasMenu) && (
        <div className="recipe-card-footer">
          <div className="recipe-card-tags">
            {tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
          {hasMenu && (
            <CardOptionsMenu
              items={[
                { label: "Bearbeiten", onClick: () => onEdit(recipe) },
                { label: "Duplizieren", onClick: () => onDuplicate(recipe) },
                { label: "Löschen", danger: true, onClick: () => onDelete(recipe) },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
