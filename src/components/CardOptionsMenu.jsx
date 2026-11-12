import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// "…"-Button unten rechts in jeder Card (Figma: Icon Button mit Icon "More Horizontal") plus
// das kleine Menü, das darunter aufklappt (Figma: Bereich "Card-Optionen").
//
// items: [{ label, onClick, danger?, disabled?, title? }]
// Der Button sitzt in jeder Card an derselben Stelle (16 px vom rechten und unteren Rand), das
// Menü klappt direkt darunter auf, linke Kante bündig am Button. Dafür muss die Card selbst
// "position: relative" haben, was .entity-card und .recipe-card in index.css tun.
/**
 * Menü nach dem Öffnen messen: Ragt es rechts aus dem Fenster (z.B. Card ganz am rechten
 * Rand), klappt es ausnahmsweise nach links auf (rechte Kante bündig am Button).
 * Gibt die passende CSS-Klasse zurück. Wird auch von IngredientCard benutzt.
 */
export function useMenuNachLinks(menuRef, open) {
  const [nachLinks, setNachLinks] = useState(false);
  useLayoutEffect(() => {
    if (!open) {
      setNachLinks(false);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect && rect.right > window.innerWidth - 8) setNachLinks(true);
  }, [open, menuRef]);
  return nachLinks ? " entity-card-menu-nach-links" : "";
}

export default function CardOptionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const menuKlasse = useMenuNachLinks(menuRef, open);

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
        <div ref={menuRef} className={`entity-card-menu${menuKlasse}`} onClick={(e) => e.stopPropagation()}>
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
