import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { renameEntity, deleteEntity, deleteConfirmText } from "../lib/entityActions.js";
import CookbookCard from "../components/CookbookCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";

export default function CookbooksPage() {
  const [cookbooks, setCookbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCookbook, setOpenCookbook] = useState(null);
  const [view, setView] = useState("cards");

  async function load() {
    setLoading(true);
    const { data: cookbookRows } = await supabase
      .from("cookbooks")
      .select("id, name")
      .order("created_at", { ascending: false });
    const { data: recipeRows } = await supabase.from("recipes").select("cookbook_id");

    const counts = {};
    (recipeRows || []).forEach((r) => {
      if (!r.cookbook_id) return;
      counts[r.cookbook_id] = (counts[r.cookbook_id] || 0) + 1;
    });

    setCookbooks((cookbookRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(name) {
    await supabase.from("cookbooks").insert({ name });
    await load();
  }

  async function handleRename(item, newName) {
    try {
      await renameEntity("cookbooks", item.id, newName);
    } catch (err) {
      alert("Umbenennen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  async function handleDelete(item) {
    if (!window.confirm(deleteConfirmText(item.name, item.count))) return;
    try {
      await deleteEntity("cookbooks", item.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  const filtered = useMemo(
    () => cookbooks.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [cookbooks, search]
  );

  if (openCookbook) {
    return (
      <FilteredRecipesPage
        filterName={openCookbook.name}
        filterType="cookbook"
        filterId={openCookbook.id}
        onBack={async () => {
          setOpenCookbook(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Kochbücher</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Kochbuch suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateEntityButton label="+ Neues Kochbuch" onCreate={handleCreate} />
        </div>
      </div>

      <div className="view-switcher-bar">
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {cookbooks.length === 0 ? "Noch keine Kochbücher angelegt." : "Keine Kochbücher gefunden."}
        </p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {filtered.map((c) => (
            <CookbookCard
              key={c.id}
              cookbook={c}
              onClick={() => setOpenCookbook(c)}
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
            thumbnail: <div className="simple-list-thumb simple-list-thumb-placeholder" />,
            onClick: () => setOpenCookbook(c),
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
            onClick: () => setOpenCookbook(c),
          }))}
        />
      )}
    </div>
  );
}
