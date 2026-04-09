let publicSupabasePromise: Promise<any> | null = null;

export async function getPublicSupabase() {
  if (!publicSupabasePromise) {
    publicSupabasePromise = import("@/integrations/supabase/client").then(
      (module) => module.supabase,
    );
  }

  return publicSupabasePromise;
}
