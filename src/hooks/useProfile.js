import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export function useProfile(session) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(session));

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, email, is_admin")
        .eq("id", session.user.id)
        .single();
      if (!cancelled) {
        setProfile(data || null);
        setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return { profile, loading };
}
