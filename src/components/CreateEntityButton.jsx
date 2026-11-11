import { useState } from "react";

export default function CreateEntityButton({ label, onCreate }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!value.trim()) return;
    setSaving(true);
    await onCreate(value.trim());
    setSaving(false);
    setValue("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className="inline-create-row">
      <input
        className="input-field"
        autoFocus
        value={value}
        placeholder="Name …"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreate();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
      />
      <button className="btn btn-primary btn-small" type="button" onClick={handleCreate} disabled={saving}>
        {saving ? "…" : "Anlegen"}
      </button>
      <button
        className="btn btn-ghost btn-small"
        type="button"
        onClick={() => {
          setOpen(false);
          setValue("");
        }}
      >
        Abbrechen
      </button>
    </div>
  );
}
