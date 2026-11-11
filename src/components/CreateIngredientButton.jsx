import { useState } from "react";

export default function CreateIngredientButton({ categories, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name.trim(), categoryId);
    setSaving(false);
    setName("");
    setCategoryId("");
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
    setName("");
    setCategoryId("");
  }

  if (!open) {
    return (
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
        + Neue Zutat
      </button>
    );
  }

  return (
    <div className="inline-create-row">
      <input
        className="input-field"
        autoFocus
        value={name}
        placeholder="Name …"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreate();
          }
          if (e.key === "Escape") handleCancel();
        }}
      />
      <select
        className="input-field"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">Kategorie wählen …</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button className="btn btn-primary btn-small" type="button" onClick={handleCreate} disabled={saving}>
        {saving ? "…" : "Anlegen"}
      </button>
      <button className="btn btn-ghost btn-small" type="button" onClick={handleCancel}>
        Abbrechen
      </button>
    </div>
  );
}
