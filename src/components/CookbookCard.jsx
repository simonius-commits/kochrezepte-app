import { useState } from "react";
import CardOptionsMenu from "./CardOptionsMenu.jsx";
import RenamableTitle from "./RenamableTitle.jsx";

export default function CookbookCard({ cookbook, onClick, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const clickable = onClick && !renaming;

  return (
    <div
      className="entity-card"
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="entity-card-cover entity-card-cover-grey" />
      <RenamableTitle
        name={cookbook.name}
        renaming={renaming}
        onDone={(newName) => {
          setRenaming(false);
          if (newName) onRename(cookbook, newName);
        }}
      />
      <div className="entity-card-footer">
        <p className="entity-card-meta">{cookbook.count} Rezepte</p>
        <CardOptionsMenu
          items={[
            { label: "Umbenennen", onClick: () => setRenaming(true) },
            { label: "Löschen", danger: true, onClick: () => onDelete(cookbook) },
          ]}
        />
      </div>
    </div>
  );
}
