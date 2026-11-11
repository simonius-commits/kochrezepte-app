import { useState } from "react";
import CardOptionsMenu from "./CardOptionsMenu.jsx";
import RenamableTitle from "./RenamableTitle.jsx";

export default function TagCard({ tag, onClick, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const clickable = onClick && !renaming;

  return (
    <div
      className="entity-card entity-card-row"
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <RenamableTitle
        name={tag.name}
        renaming={renaming}
        onDone={(newName) => {
          setRenaming(false);
          if (newName) onRename(tag, newName);
        }}
      />
      <div className="entity-card-end">
        <span className="entity-card-count">{tag.count}</span>
        <CardOptionsMenu
          items={[
            { label: "Umbenennen", onClick: () => setRenaming(true) },
            { label: "Löschen", danger: true, onClick: () => onDelete(tag) },
          ]}
        />
      </div>
    </div>
  );
}
