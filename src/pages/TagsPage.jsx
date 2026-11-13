import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { renameEntity, deleteEntity, deleteConfirmText } from "../lib/entityActions.js";
import TagCard from "../components/TagCard.jsx";
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

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openTag, setOpenTag] = useState(null);
  // Ansicht (Cards | Liste | Tabelle) wird dauerhaft gemerkt, bis man sie wechselt
  const [view, setView] = useGemerkteAnsicht("ansicht:tags", "cards", ["cards", "list", "table"]);
  // Sortierung wird dauerhaft gemerkt, bis man sie wechselt
  const [sort, setSort] = useGemerkteAnsicht("sortierung:tags", "az", keys(LISTEN_SORTIERUNGEN));

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    const { data: tagRows } = await supabase.from("tags").select("id, name, created_at").order("name", { ascending: true });
    // Alle Zuordnungen zählen (seitenweise, Supabase liefert sonst nur 1000 Zeilen)
    const counts = await zaehleAlle("recipe_tags", "tag_id", ["recipe_id", "tag_id"]);

    setTags((tagRows || []).map((t) => ({ ...t, count: counts[t.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

  async function handleCreate(name) {
    await supabase.from("tags").insert({ name });
    await load();
  }

  async function handleRename(item, newName) {
    try {
      await renameEntity("tags", item.id, newName);
    } catch (err) {
      alert("Umbenennen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  async function handleDelete(item) {
    if (!(await bestaetigen({ titel: "Tag löschen?", text: deleteConfirmText(item.name, item.count) }))) return;
    try {
      await deleteEntity("tags", item.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  const filtered = useMemo(
    () => sortiereListe(tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())), sort),
    [tags, search, sort]
  );

  if (openTag) {
    return (
      <FilteredRecipesPage
        filterName={openTag.name}
        filterType="tag"
        filterId={openTag.id}
        onBack={async () => {
          setOpenTag(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Tags</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Tag suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateEntityButton label="+ Neuer Tag" onCreate={handleCreate} />
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
          {tags.length === 0 ? "Noch keine Tags angelegt." : "Keine Tags gefunden."}
        </p>
      ) : view === "cards" ? (
        <div className="tag-list">
          {filtered.map((t) => (
            <TagCard
              key={t.id}
              tag={t}
              onClick={() => setOpenTag(t)}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={filtered.map((t) => ({
            id: t.id,
            title: t.name,
            meta: `${t.count} Rezepte`,
            onClick: () => setOpenTag(t),
          }))}
        />
      ) : (
        <SimpleTable
          columns={[
            { key: "name", label: "Name", width: 400 },
            { key: "count", label: "Anzahl Rezepte", width: 200 },
          ]}
          rows={filtered.map((t) => ({
            id: t.id,
            name: t.name,
            count: t.count,
            onClick: () => setOpenTag(t),
          }))}
        />
      )}
    </div>
  );
}
