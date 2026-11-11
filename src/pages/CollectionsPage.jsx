import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { renameEntity, deleteEntity, deleteConfirmText } from "../lib/entityActions.js";
import CollectionCard from "../components/CollectionCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCollection, setOpenCollection] = useState(null);
  const [view, setView] = useState("cards");

  async function load() {
    setLoading(true);
    const { data: collectionRows } = await supabase
      .from("collections")
      .select("id, name")
      .order("created_at", { ascending: false });
    const { data: linkRows } = await supabase.from("recipe_collections").select("collection_id");

    const counts = {};
    (linkRows || []).forEach((r) => {
      counts[r.collection_id] = (counts[r.collection_id] || 0) + 1;
    });

    setCollections((collectionRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
    if (!window.confirm(deleteConfirmText(item.name, item.count))) return;
    try {
      await deleteEntity("collections", item.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  const filtered = useMemo(
    () => collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [collections, search]
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
        <ViewSwitcher view={view} onChange={setView} />
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
