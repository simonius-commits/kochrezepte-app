import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const BETREFF_OPTIONS = ["Feature Request", "Report a Bug", "Feedback", "Sonstiges"];

// Es gibt aktuell keinen E-Mail-Versand-Service in der App (kein SMTP/Edge Function
// eingerichtet). Damit "Senden" trotzdem tatsächlich eine Nachricht auf den Weg bringt, ohne
// dass wir dafür extra Backend-Infrastruktur aufbauen müssen, wird ein vorausgefüllter
// mailto:-Link geöffnet — das Standard-Mailprogramm der Person übernimmt den eigentlichen
// Versand. Zusätzlich landet die Nachricht im User-Feedback-Backlog (Tabelle
// `feedback_items`), damit Admins sie dort abarbeiten können. Falls später ein echter
// In-App-Versand gewünscht ist (z.B. über eine Supabase Edge Function + E-Mail-Anbieter),
// können wir das nachrüsten.
export default function ContactAdminModal({ admin, onClose }) {
  const [betreff, setBetreff] = useState(BETREFF_OPTIONS[0]);
  const [nachricht, setNachricht] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from("feedback_items").insert({
          category: betreff,
          message: nachricht,
          source: "user",
          created_by: user.id,
          sender_email: user.email,
        });
        if (error) {
          // Nicht blockieren — die E-Mail soll trotzdem rausgehen, auch wenn das Speichern im
          // Backlog fehlschlägt (z.B. Netzwerkproblem).
          console.error("Konnte Nachricht nicht im Backlog speichern:", error.message);
        }
      }
    } finally {
      const subject = encodeURIComponent(`[Kochrezepte App] ${betreff}`);
      const body = encodeURIComponent(nachricht);
      window.location.href = `mailto:${admin.email}?subject=${subject}&body=${body}`;
      setSending(false);
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Nachricht an {admin.email}</h2>
        <p className="modal-subtitle">
          Wählt einen Betreff und schreibt eure Nachricht — euer Mailprogramm öffnet sich
          vorausgefüllt, die Nachricht landet außerdem im Backlog der Admins.
        </p>

        <div className="input-group">
          <label htmlFor="contact-betreff">Betreff</label>
          <select
            id="contact-betreff"
            className="input-field"
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
          >
            {BETREFF_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="contact-nachricht">Nachricht</label>
          <textarea
            id="contact-nachricht"
            className="input-field textarea-field"
            rows={5}
            placeholder="Eure Nachricht …"
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
          />
        </div>

        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? "Wird gesendet …" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
