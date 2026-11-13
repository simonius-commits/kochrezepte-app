import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { renameEntity, deleteEntity, deleteConfirmText } from "../lib/entityActions.js";
import CollectionCard from "../components/CollectionCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";
import { useGemerkteAnsicht } from "../lib/gemerkteAnsicht.js";
import SortSelect from "../components/SortSelect.jsx";
import { LISTEN_SORTIERUNGEN, keys, sortiereListe } from "../lib/sortierung.js";
import { ladeAlle, zaehleAlle } from "../lib/ladeAlle.js";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCollection, setOpenCollection] = useState(null);
  // Ansicht (Cards | Liste | Tabelle) wird dauerhaft gemerkt, bis man sie wechselt
  const [view, setView] = useGemerkteAnsicht("ansicht:sammlungen", "cards", ["cards", "list", "table"]);
  // Sortierung wird dauerhaft gemerkt, bis man sie wechselt
  const [sort, setSort] = useGemerkteAnsicht("sortierung:sammlungen", "neueste", keys(LISTEN_SORTIERUNGEN));

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    const { data: collectionRows } = await supabase
      .from("collections")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    // Alle Zuordnungen zählen (seitenweise, Supabase liefert sonst nur 1000 Zeilen)
    const counts = await zaehleAlle("recipe_collections", "collection_id", ["recipe_id", "collection_id"]);

    setCollections((collectionRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

  async function handleCreate(name) {
    await supabase.from("collections").insert({ name });
    await load();
  }

  async function handleRename(item, newName) {
    try {
      await renameEntity("collections", item.id, newName);
    } catch (err) {
      alert("Umbenennen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  async function handleDelete(item) {
    if (!(await bestaetigen({ titel: "Sammlung löschen?", text: deleteConfirmText(item.name, item.count) }))) return;
    try {
      await deleteEntity("collections", item.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  const filtered = useMemo(
    () => sortiereListe(collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())), sort),
    [collections, search, sort]
  );

  if (openCollection) {
    return (
      <FilteredRecipesPage
        filterName={openCollection.name}
        filterType="collection"
        filterId={openCollection.id}
        onBack={async () => {
          setOpenCollection(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Sammlungen</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Sammlung suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateEntityButton label="+ Neue Sammlung" onCreate={handleCreate} />
        </div>
      </div>

      <div className="view-switcher-bar">
        <div className="sort-view-group">
          <SortSelect value={sort} onChange={setSort} options={LISTEN_SORTIERUNGEN} />
          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {collections.length === 0 ? "Noch keine Sammlungen angelegt." : "Keine Sammlungen gefunden."}
        </p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {filtered.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onClick={() => setOpenCollection(c)}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={filtered.map((c) => ({
            id: c.id,
            title: c.name,
            meta: `${c.count} Rezepte`,
            thumbnail: <div className="simple-list-thumb simple-list-thumb-color" />,
            onClick: () => setOpenCollection(c),
          }))}
        />
      ) : (
        <SimpleTable
          columns={[
            { key: "name", label: "Name", width: 400 },
            { key: "count", label: "Anzahl Rezepte", width: 200 },
          ]}
          rows={filtered.map((c) => ({
            id: c.id,
            name: c.name,
            count: c.count,
            onClick: () => setOpenCollection(c),
          }))}
        />
      )}
    </div>
  );
}
