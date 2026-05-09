/**
 * Supabase service-role client for MVP API routes.
 * Paradigm-HP convention: NEXT_PUBLIC_SUPABASE_URL (publishable) + SUPABASE_SERVICE_ROLE_KEY (secret).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _service: SupabaseClient | null = null;

export function getMvpSupabase(): SupabaseClient {
  if (_service) return _service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[mvp/supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  }
  _service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}
