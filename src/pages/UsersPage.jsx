import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import Tag from "../components/Tag.jsx";

export default function UsersPage({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, is_admin")
      .order("email", { ascending: true });
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAdmin(user) {
    const { error } = await supabase.from("profiles").update({ is_admin: !user.is_admin }).eq("id", user.id);
    if (error) {
      alert("Ändern fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Nutzer:innen</h1>
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : users.length === 0 ? (
        <p className="empty-state">Keine Nutzer:innen gefunden.</p>
      ) : (
        <div className="user-list">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="user-row">
                <div className="user-row-email-group">
                  <span className="user-row-email">{u.email}</span>
                  {u.is_admin && <Tag label="Admin" selected />}
                </div>
                <button
                  type="button"
                  className={u.is_admin ? "btn btn-ghost user-row-remove-admin" : "btn btn-secondary"}
                  onClick={() => toggleAdmin(u)}
                  disabled={isSelf && u.is_admin}
                  title={
                    isSelf && u.is_admin
                      ? "Du kannst dir selbst nicht die Admin-Rechte entziehen"
                      : undefined
                  }
                >
                  {u.is_admin ? "Admin entfernen" : "Zum Admin machen"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
