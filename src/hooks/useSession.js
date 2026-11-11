import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/**
 * Liefert die aktuelle Supabase-Session und hält sie automatisch aktuell
 * (Login, Logout, Token-Refresh). Ohne konfiguriertes Supabase (Demo-Modus)
 * liefert er sofort session=null, loading=false — die App bleibt nutzbar.
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
