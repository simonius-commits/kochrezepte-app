import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import ContactAdminModal from "../components/ContactAdminModal.jsx";

export default function ImpressumPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactingAdmin, setContactingAdmin] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("is_admin", true)
        .order("email", { ascending: true });
      setAdmins(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="screen">
      <div className="header">
        <h1>Impressum</h1>
      </div>
      <p className="impressum-intro">
        Fragen, Feedback oder einen Fehler gefunden? Ihr könnt die Admins direkt kontaktieren.
      </p>

      {loading ? (
        <p>Lädt …</p>
      ) : admins.length === 0 ? (
        <p className="empty-state">Aktuell sind keine Admins hinterlegt.</p>
      ) : (
        <div className="admin-list">
          {admins.map((admin) => (
            <div key={admin.id} className="admin-row">
              <div className="admin-row-avatar" aria-hidden="true" />
              <div className="admin-row-text">
                <span className="admin-row-name">{admin.email}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setContactingAdmin(admin)}
              >
                Kontaktieren
              </button>
            </div>
          ))}
        </div>
      )}

      {contactingAdmin && (
        <ContactAdminModal admin={contactingAdmin} onClose={() => setContactingAdmin(null)} />
      )}
    </div>
  );
}
