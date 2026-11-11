import { useState } from "react";
import CardOptionsMenu from "./CardOptionsMenu.jsx";
import RenamableTitle from "./RenamableTitle.jsx";

export default function CategoryCard({ category, onClick, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const clickable = onClick && !renaming;

  return (
    <div
      className="entity-card entity-card-compact"
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <RenamableTitle
        name={category.name}
        renaming={renaming}
        onDone={(newName) => {
          setRenaming(false);
          if (newName) onRename(category, newName);
        }}
      />
      <p className="entity-card-meta">{category.count} Rezepte</p>
      {/* Inhalt ist zentriert — der Button sitzt deshalb frei in der Ecke unten rechts. */}
      <div className="entity-card-corner">
        <CardOptionsMenu
          items={[
            { label: "Umbenennen", onClick: () => setRenaming(true) },
            { label: "Löschen", danger: true, onClick: () => onDelete(category) },
          ]}
        />
      </div>
    </div>
  );
}
