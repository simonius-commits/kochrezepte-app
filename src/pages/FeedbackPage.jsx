import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import NewFeedbackModal from "../components/NewFeedbackModal.jsx";
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";

const CATEGORY_CLASS = {
  "Feature Request": "feedback-badge-feature",
  "Report a Bug": "feedback-badge-bug",
  Feedback: "feedback-badge-feedback",
  Sonstiges: "feedback-badge-sonstiges",
};

// Reihenfolge + Anzeige-Texte der drei Backlog-Gruppen.
const STATUS_GROUPS = [
  { key: "offen", title: "Unbearbeitetes Feedback" },
  { key: "abgearbeitet", title: "Abgearbeitet" },
  { key: "abgelehnt", title: "Abgelehnt/Idle" },
];

const STATUS_LABELS = {
  offen: "Unbearbeitet",
  abgearbeitet: "Abgearbeitet",
  abgelehnt: "Abgelehnt/Idle",
};

// Kein E-Mail-Versand-Service angebunden (siehe ContactAdminModal) — beim Statuswechsel auf
// "Abgearbeitet"/"Abgelehnt" öffnet sich wie dort ein vorausgefüllter mailto:-Link an die
// einreichende Person, die Admin-Person muss nur noch auf "Senden" im Mailprogramm klicken.
const STATUS_EMAIL_BODY = {
  abgearbeitet:
    "Danke! Wir haben Dein Feedback eingearbeitet! Vielen Dank für Deine Mithilfe. Mit Deinem Feedback wurde die App ein Stück besser! Danke!",
  abgelehnt: "Danke für Dein Feedback. Wir checken das! Danke für Deine Mithilfe!",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    const { data } = await supabase
      .from("feedback_items")
      .select("id, category, message, status, source, sender_email, created_at")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

  async function changeStatus(item, newStatus) {
    if (newStatus === item.status) return;

    // Optimistisch aktualisieren, damit der Wechsel sofort spürbar reagiert.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
    const { error } = await supabase.from("feedback_items").update({ status: newStatus }).eq("id", item.id);
    if (error) {
      alert("Status ändern fehlgeschlagen: " + error.message);
      await load(); // bei Fehler zurücksetzen
      return;
    }

    // Nur bei den beiden "abgeschlossenen" Status eine Rückmeldung schicken, und nur wenn wir
    // überhaupt eine Absender-E-Mail kennen (bei eigenen Admin-Einträgen gibt es keine).
    const emailBody = STATUS_EMAIL_BODY[newStatus];
    if (emailBody && item.sender_email) {
      const subject = encodeURIComponent("Update zu deinem Feedback — Kochrezepte App");
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:${item.sender_email}?subject=${subject}&body=${body}`, "_blank");
    }
  }

  const groupedItems = STATUS_GROUPS.map((group) => ({
    ...group,
    items: items.filter((i) => i.status === group.key),
  }));

  return (
    <div className="screen">
      <div className="header">
        <h1>User-Feedback</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          + Neuer Eintrag
        </button>
      </div>
      <p className="impressum-intro">
        Nachrichten von Nutzer:innen sowie eigene Einträge — als Backlog zum Abarbeiten.
      </p>

      {loading ? (
        <p>Lädt …</p>
      ) : items.length === 0 ? (
        <p className="empty-state">Noch keine Einträge vorhanden.</p>
      ) : (
        <div className="feedback-groups">
          {groupedItems.map((group) => (
            <div key={group.key} className="feedback-group">
              <h2 className="feedback-group-title">
                {group.title} ({group.items.length})
              </h2>
              {group.items.length === 0 ? (
                <p className="feedback-group-empty">Keine Einträge in dieser Gruppe.</p>
              ) : (
                <div className="feedback-list">
                  {group.items.map((item) => (
                    <div key={item.id} className="feedback-row">
                      <div className="feedback-row-text">
                        <div className="feedback-row-meta">
                          <span className={`feedback-badge ${CATEGORY_CLASS[item.category] || ""}`}>
                            {item.category}
                          </span>
                          <span className="feedback-row-date">{formatDate(item.created_at)}</span>
                        </div>
                        <p className="feedback-row-message">{item.message}</p>
                        <span className="feedback-row-from">
                          Von:{" "}
                          {item.source === "admin"
                            ? "Team (eigener Eintrag)"
                            : item.sender_email || "Unbekannt"}
                        </span>
                      </div>
                      <select
                        className="input-field feedback-status-select"
                        value={item.status}
                        onChange={(e) => changeStatus(item, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewFeedbackModal
          onClose={() => setShowNewModal(false)}
          onCreated={async () => {
            setShowNewModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
