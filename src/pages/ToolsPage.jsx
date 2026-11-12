import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import ToolCard from "../components/ToolCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import MergeToolModal from "../components/MergeToolModal.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openTool, setOpenTool] = useState(null);
  const [mergingTool, setMergingTool] = useState(null);
  const [view, setView] = useState("cards");

  async function load() {
    setLoading(true);
    // Hilfsmittel sind ein geteilter Pool (siehe Datenmodell) — die Liste zeigt daher alle,
    // aber die Rezept-Anzahl bezieht sich (durch Row Level Security) nur auf eigene Rezepte.
    const [{ data: toolRows }, { data: linkRows }] = await Promise.all([
      supabase.from("tools").select("id, name").order("name", { ascending: true }),
      supabase.from("recipe_tools").select("tool_id"),
    ]);

    const counts = {};
    (linkRows || []).forEach((r) => {
      counts[r.tool_id] = (counts[r.tool_id] || 0) + 1;
    });

    setTools((toolRows || []).map((t) => ({ ...t, count: counts[t.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(name) {
    const { error } = await supabase.from("tools").insert({ name });
    if (error) {
      alert("Anlegen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleRename(tool, newName) {
    const { error } = await supabase.from("tools").update({ name: newName }).eq("id", tool.id);
    if (error) {
      alert("Umbenennen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleDelete(tool) {
    if (tool.count > 0) return; // Button ist in diesem Fall ohnehin deaktiviert
    if (!(await bestaetigen({ titel: "Hilfsmittel löschen?", text: `„${tool.name}“ wird gelöscht.` }))) return;
    const { error } = await supabase.from("tools").delete().eq("id", tool.id);
    if (error) {
      alert("Löschen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  const filtered = useMemo(
    () => tools.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    [tools, search]
  );

  if (openTool) {
    return (
      <FilteredRecipesPage
        filterName={openTool.name}
        filterType="tool"
        filterId={openTool.id}
        onBack={async () => {
          setOpenTool(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Hilfsmittel</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Hilfsmittel suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateEntityButton label="+ Neues Hilfsmittel" onCreate={handleCreate} />
        </div>
      </div>

      <div className="view-switcher-bar">
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {/* Vorschlagsliste für das Ziel-Feld im Zusammenführen-Dialog */}
      <datalist id="tool-merge-suggestions">
        {tools
          .filter((t) => t.id !== mergingTool?.id)
          .map((t) => (
            <option key={t.id} value={t.name} />
          ))}
      </datalist>

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {tools.length === 0 ? "Noch keine Hilfsmittel vorhanden." : "Keine Hilfsmittel gefunden."}
        </p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {filtered.map((t) => (
            <ToolCard
              key={t.id}
              tool={t}
              onClick={() => setOpenTool(t)}
              onRename={handleRename}
              onDelete={handleDelete}
              onMergeRequest={setMergingTool}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={filtered.map((t) => ({
            id: t.id,
            title: t.name,
            meta: `${t.count} Rezepte`,
            onClick: () => setOpenTool(t),
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
            onClick: () => setOpenTool(t),
          }))}
        />
      )}

      {mergingTool && (
        <MergeToolModal
          tool={mergingTool}
          onClose={() => setMergingTool(null)}
          onMerged={async () => {
            setMergingTool(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
