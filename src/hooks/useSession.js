import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured, openedViaRecoveryLink } from "../lib/supabaseClient.js";

/**
 * Liefert die aktuelle Supabase-Session und hält sie automatisch aktuell
 * (Login, Logout, Token-Refresh). Ohne konfiguriertes Supabase (Demo-Modus)
 * liefert er sofort session=null, loading=false — die App bleibt nutzbar.
 *
 * passwordRecovery ist true, wenn die App über den "Passwort zurücksetzen"-Link
 * aus der E-Mail geöffnet wurde. Dann ist man zwar schon eingeloggt, soll aber
 * zuerst ein neues Passwort festlegen (Screen "Neues Passwort festlegen").
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(openedViaRecoveryLink);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    session,
    loading,
    passwordRecovery,
    finishPasswordRecovery: () => setPasswordRecovery(false),
  };
}
