import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type PublicSupabaseClient = SupabaseClient<Database>;

let publicSupabasePromise: Promise<PublicSupabaseClient> | null = null;

export async function getPublicSupabase() {
  if (!publicSupabasePromise) {
    publicSupabasePromise = import("@/integrations/supabase/client").then(
      (module) => module.supabase,
    );
  }

  return publicSupabasePromise;
}
