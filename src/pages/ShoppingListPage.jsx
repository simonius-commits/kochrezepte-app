import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import Checkbox from "../components/Checkbox.jsx";
import {
  loadShoppingList,
  removeRecipeFromShoppingList,
  setShoppingItemDone,
} from "../lib/shoppingList.js";

/**
 * Seite „Einkaufen“ (Figma: Screens – User → Einkaufsliste → App-Shell: Einkaufen).
 * Akkordeon pro Rezept; Zutaten abhaken (durchgestrichen); Mülleimer nimmt das Rezept von der Liste.
 */
export default function ShoppingListPage() {
  const [entries, setEntries] = useState([]);
  const [collapsed, setCollapsed] = useState(new Set()); // standardmäßig alle aufgeklappt
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadShoppingList()
      .then(setEntries)
      .catch((err) => setError(err.message || "Einkaufsliste konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  function toggleCollapsed(id) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Haken sofort anzeigen und im Hintergrund speichern; bei Fehler zurücknehmen.
  async function handleToggleItem(entryId, itemId, erledigt) {
    const apply = (value) =>
      setEntries((prev) =>
        prev.map((e) =>
          e.id !== entryId
            ? e
            : {
                ...e,
                shopping_list_items: e.shopping_list_items.map((i) =>
                  i.id === itemId ? { ...i, erledigt: value } : i
                ),
              }
        )
      );
    apply(erledigt);
    try {
      await setShoppingItemDone(itemId, erledigt);
    } catch (err) {
      apply(!erledigt);
      setError(err.message || "Speichern fehlgeschlagen.");
    }
  }

  async function handleRemove(entryId) {
    try {
      await removeRecipeFromShoppingList(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      setError(err.message || "Entfernen fehlgeschlagen.");
    }
  }

  const offen = entries.reduce(
    (sum, e) => sum + e.shopping_list_items.filter((i) => !i.erledigt).length,
    0
  );

  return (
    <div className="screen">
      <div className="header">
        <h1>Einkaufen</h1>
      </div>

      {error && <p className="input-helper-error">{error}</p>}

      {loading ? (
        <p>Lädt …</p>
      ) : entries.length === 0 ? (
        <p className="page-intro">
          Deine Einkaufsliste ist leer. Öffne ein Rezept und klicke auf „Für das Rezept einkaufen“.
        </p>
      ) : (
        <>
          <p className="page-intro">
            {entries.length} {entries.length === 1 ? "Rezept" : "Rezepte"} · {offen}{" "}
            {offen === 1 ? "Zutat" : "Zutaten"} offen
          </p>

          {entries.map((entry) => {
            const items = entry.shopping_list_items;
            const erledigt = items.filter((i) => i.erledigt).length;
            const isCollapsed = collapsed.has(entry.id);
            // Gleiche Chevron-Logik wie bei den Zutaten-Gruppen (CollapsibleGroupHeader)
            const Chevron = isCollapsed ? ChevronUp : ChevronDown;
            return (
              <div key={entry.id} className="ingredient-group">
                <div className="shopping-group-header">
                  <button
                    type="button"
                    className="shopping-group-toggle"
                    onClick={() => toggleCollapsed(entry.id)}
                    aria-expanded={!isCollapsed}
                  >
                    <h2 className="ingredient-group-title">{entry.recipes?.titel || "Rezept"}</h2>
                    <span className="shopping-group-meta">
                      {entry.portionen} {entry.portionen === 1 ? "Portion" : "Portionen"} · {erledigt} von{" "}
                      {items.length} erledigt
                    </span>
                    <Chevron size={18} className="ingredient-group-chevron" />
                  </button>
                  <button
                    type="button"
                    className="entity-card-icon-btn"
                    onClick={() => handleRemove(entry.id)}
                    aria-label={`„${entry.recipes?.titel || "Rezept"}“ von der Einkaufsliste entfernen`}
                    title="Von der Einkaufsliste entfernen"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="simple-list">
                    {items.map((item) => (
                      <div key={item.id} className="simple-list-row">
                        <Checkbox
                          checked={item.erledigt}
                          onChange={(checked) => handleToggleItem(entry.id, item.id, checked)}
                          className="shopping-item"
                        >
                          <span
                            className={`simple-list-title${item.erledigt ? " shopping-item-done" : ""}`}
                          >
                            {item.ingredients?.name}
                          </span>
                          {item.menge != null && (
                            <span className="simple-list-meta">
                              {item.menge}
                              {item.einheit ? ` ${item.einheit}` : ""}
                            </span>
                          )}
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
