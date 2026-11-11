import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// "…"-Button unten rechts in jeder Card (Figma: Icon Button mit Icon "More Horizontal") plus
// das kleine Menü, das darunter aufklappt (Figma: Bereich "Card-Optionen").
//
// items: [{ label, onClick, danger?, disabled?, title? }]
// Das Menü richtet sich an der Card aus (rechtsbündig direkt darunter) — dafür muss die Card
// selbst "position: relative" haben, was .entity-card und .recipe-card in index.css tun.
export default function CardOptionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Klick irgendwo außerhalb (auch auf eine andere Card) schließt das Menü wieder.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <span className="card-options" ref={wrapperRef}>
      <button
        type="button"
        className="entity-card-icon-btn"
        aria-label="Optionen"
        aria-expanded={open}
        onClick={(e) => {
          // Sonst würde der Klick auch die Card selbst öffnen.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="entity-card-menu" onClick={(e) => e.stopPropagation()}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`entity-card-menu-item${item.danger ? " entity-card-menu-danger" : ""}`}
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
