import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import Checkbox from "../components/Checkbox.jsx";
import Tag from "../components/Tag.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import CollapsibleGroupHeader from "../components/CollapsibleGroupHeader.jsx";
import {
  loadShoppingList,
  removeRecipeFromShoppingList,
  setShoppingItemsDone,
} from "../lib/shoppingList.js";

/**
 * Seite „Einkaufen“ (Figma: Screens – User → Einkaufsliste).
 * Tab „Nach Rezepten“: Akkordeon pro Rezept; abhaken; Mülleimer nimmt das Rezept von der Liste.
 * Tab „Alle Zutaten“: eine Zeile pro Zutat über alle Rezepte, Mengen summiert, Unterzeile mit
 *   den Rezepten; sortiert nach Zutaten-Kategorie oder alphabetisch. Abhaken gilt für alle Rezepte.
 * Abgehakte Zutaten wandern SOFORT in die Sektion „Eingekauft/Vorhanden“ (pro Rezept bzw. ganz
 *   unten bei „Alle Zutaten“), klappbar, standardmäßig offen. Haken raus → zurück nach oben.
 */

const OHNE_KATEGORIE = "Ohne Kategorie";
const EINGEKAUFT = "Eingekauft/Vorhanden";
const SORT_OPTIONS = [
  { key: "kategorie", label: "Nach Kategorie" },
  { key: "alphabetisch", label: "Alphabetisch" },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Mengen pro Einheit summieren: [{menge, einheit}] → "3 EL + 50 ml" (keine Umrechnung). */
function formatAmounts(items) {
  const sums = new Map(); // Einheit → Summe, in Reihenfolge des ersten Auftretens
  for (const i of items) {
    if (i.menge == null) continue;
    const unit = i.einheit || "";
    sums.set(unit, round2((sums.get(unit) || 0) + i.menge));
  }
  return [...sums].map(([unit, sum]) => (unit ? `${sum} ${unit}` : `${sum}`)).join(" + ");
}

/** Alle Einträge aller Rezepte zu einer Zeile pro Zutat zusammenfassen. */
function aggregateByIngredient(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const item of entry.shopping_list_items) {
      let row = map.get(item.ingredient_id);
      if (!row) {
        row = {
          ingredientId: item.ingredient_id,
          name: item.ingredients?.name || "",
          kategorie: item.ingredients?.ingredient_categories?.name || OHNE_KATEGORIE,
          items: [],
          recipes: new Map(), // Rezept-Eintrag → { titel, items }
        };
        map.set(item.ingredient_id, row);
      }
      row.items.push(item);
      if (!row.recipes.has(entry.id)) {
        row.recipes.set(entry.id, { titel: entry.recipes?.titel || "Rezept", items: [] });
      }
      row.recipes.get(entry.id).items.push(item);
    }
  }
  return [...map.values()].map((row) => ({
    ...row,
    total: formatAmounts(row.items),
    // Unterzeile: "Pasta Carbonara 50 g · Ofengemüse mit Feta 30 g"
    recipesLine: [...row.recipes.values()]
      .map((r) => [r.titel, formatAmounts(r.items)].filter(Boolean).join(" "))
      .join(" · "),
    // Erst durchgestrichen, wenn die Zutat in ALLEN Rezepten erledigt ist.
    done: row.items.every((i) => i.erledigt),
  }));
}

export default function ShoppingListPage() {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("rezepte"); // "rezepte" | "zutaten"
  const [sort, setSort] = useState("kategorie"); // "kategorie" | "alphabetisch"
  const [collapsed, setCollapsed] = useState(new Set()); // Rezepte UND Kategorien; standardmäßig alles offen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadShoppingList()
      .then(setEntries)
      .catch((err) => setError(err.message || "Einkaufsliste konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  const ingredientRows = useMemo(() => aggregateByIngredient(entries), [entries]);

  function toggleCollapsed(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Haken sofort anzeigen und im Hintergrund speichern; bei Fehler zurücknehmen.
  async function handleToggleItems(itemIds, erledigt) {
    const ids = new Set(itemIds);
    const apply = (value) =>
      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          shopping_list_items: e.shopping_list_items.map((i) =>
            ids.has(i.id) ? { ...i, erledigt: value } : i
          ),
        }))
      );
    apply(erledigt);
    try {
      await setShoppingItemsDone(itemIds, erledigt);
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

  const sortRows = (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name, "de"));

  function renderIngredientRow(row) {
    return (
      <div key={row.ingredientId} className="simple-list-row">
        <Checkbox
          checked={row.done}
          onChange={(checked) => handleToggleItems(row.items.map((i) => i.id), checked)}
          className="shopping-item"
        >
          <span className="shopping-all-text">
            <span className={`simple-list-title${row.done ? " shopping-item-done" : ""}`}>
              {row.name}
            </span>
            <span className="shopping-all-recipes">{row.recipesLine}</span>
          </span>
          {row.total && <span className="simple-list-meta">{row.total}</span>}
        </Checkbox>
      </div>
    );
  }

  // Sektion „Eingekauft/Vorhanden“ ganz unten im Tab „Alle Zutaten“
  function renderDoneSection(doneRows) {
    if (doneRows.length === 0) return null;
    const key = "eingekauft:alle";
    return (
      <div className="ingredient-group">
        <CollapsibleGroupHeader
          title={`${EINGEKAUFT} (${doneRows.length})`}
          muted
          collapsed={collapsed.has(key)}
          onToggle={() => toggleCollapsed(key)}
        />
        {!collapsed.has(key) && (
          <div className="simple-list">{sortRows(doneRows).map(renderIngredientRow)}</div>
        )}
      </div>
    );
  }

  function renderAllIngredients() {
    const openRows = ingredientRows.filter((r) => !r.done);
    const doneRows = ingredientRows.filter((r) => r.done);
    if (sort === "alphabetisch") {
      return (
        <>
          {openRows.length > 0 && (
            <div className="simple-list shopping-open-list">{sortRows(openRows).map(renderIngredientRow)}</div>
          )}
          {renderDoneSection(doneRows)}
        </>
      );
    }
    // Nach Kategorie gruppiert (Kategorien wie auf der Zutaten-Seite), "Ohne Kategorie" zuletzt.
    // Nur offene Zutaten — eine Kategorie, in der alles erledigt ist, verschwindet.
    const byKategorie = new Map();
    for (const row of openRows) {
      if (!byKategorie.has(row.kategorie)) byKategorie.set(row.kategorie, []);
      byKategorie.get(row.kategorie).push(row);
    }
    const kategorien = [...byKategorie.keys()]
      .filter((k) => k !== OHNE_KATEGORIE)
      .sort((a, b) => a.localeCompare(b, "de"));
    if (byKategorie.has(OHNE_KATEGORIE)) kategorien.push(OHNE_KATEGORIE);

    const groups = kategorien.map((kategorie) => {
      const key = "kategorie:" + kategorie;
      return (
        <div key={key} className="ingredient-group">
          <CollapsibleGroupHeader
            title={kategorie}
            muted={kategorie === OHNE_KATEGORIE}
            collapsed={collapsed.has(key)}
            onToggle={() => toggleCollapsed(key)}
          />
          {!collapsed.has(key) && (
            <div className="simple-list">{sortRows(byKategorie.get(kategorie)).map(renderIngredientRow)}</div>
          )}
        </div>
      );
    });
    return (
      <>
        {groups}
        {renderDoneSection(doneRows)}
      </>
    );
  }

  function renderRecipeItem(item) {
    return (
      <div key={item.id} className="simple-list-row">
        <Checkbox
          checked={item.erledigt}
          onChange={(checked) => handleToggleItems([item.id], checked)}
          className="shopping-item"
        >
          <span className={`simple-list-title${item.erledigt ? " shopping-item-done" : ""}`}>
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
    );
  }

  function renderByRecipe() {
    return entries.map((entry) => {
      const items = entry.shopping_list_items;
      const openItems = items.filter((i) => !i.erledigt);
      const doneItems = items.filter((i) => i.erledigt);
      const erledigt = doneItems.length;
      const isCollapsed = collapsed.has(entry.id);
      const doneKey = "eingekauft:" + entry.id;
      const doneCollapsed = collapsed.has(doneKey);
      const DoneChevron = doneCollapsed ? ChevronUp : ChevronDown;
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
              {openItems.map(renderRecipeItem)}
              {doneItems.length > 0 && (
                <button
                  type="button"
                  className="shopping-done-header"
                  onClick={() => toggleCollapsed(doneKey)}
                  aria-expanded={!doneCollapsed}
                >
                  {EINGEKAUFT} ({doneItems.length})
                  <DoneChevron size={16} className="ingredient-group-chevron" />
                </button>
              )}
              {!doneCollapsed && doneItems.map(renderRecipeItem)}
            </div>
          )}
        </div>
      );
    });
  }

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

          <div className="shopping-toolbar">
            <div className="modal-tabs">
              <Tag label="Nach Rezepten" selected={tab === "rezepte"} onClick={() => setTab("rezepte")} />
              <Tag label="Alle Zutaten" selected={tab === "zutaten"} onClick={() => setTab("zutaten")} />
            </div>
            {tab === "zutaten" && <ViewSwitcher view={sort} onChange={setSort} options={SORT_OPTIONS} />}
          </div>

          {tab === "rezepte" ? renderByRecipe() : renderAllIngredients()}
        </>
      )}
    </div>
  );
}
