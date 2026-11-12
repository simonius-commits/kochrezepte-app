// Ersatz für window.confirm: zeigt unseren eigenen Dialog (folgt Light/Dark Mode) statt des
// Browser-Fensters. Benutzung wie vorher, nur mit await:
//
//   if (!(await bestaetigen({ titel: "Rezept löschen?", text: "…" }))) return;
//
// Der Dialog selbst wird einmal in App.jsx eingebunden (<ConfirmDialogHost />) und meldet sich
// hier an. Ist er (noch) nicht da, fällt die Funktion auf window.confirm zurück.

let zeigeDialog = null;

export function registriereBestaetigenDialog(fn) {
  zeigeDialog = fn;
  return () => {
    if (zeigeDialog === fn) zeigeDialog = null;
  };
}

/** Gibt ein Promise zurück: true = bestätigt, false = abgebrochen. */
export function bestaetigen({ titel, text, bestaetigenLabel = "Löschen" }) {
  if (!zeigeDialog) return Promise.resolve(window.confirm([titel, text].filter(Boolean).join("\n\n")));
  return new Promise((resolve) => zeigeDialog({ titel, text, bestaetigenLabel, resolve }));
}
