//
// Supabase client for the React app.
// Reads configuration from environment variables:
// - REACT_APP_SUPABASE_URL
// - REACT_APP_SUPABASE_KEY
//
// Do not hardcode secrets. Keys must be provided via .env at build time.
//

/**
// PUBLIC_INTERFACE
 * getSupabaseClient - Returns a singleton Supabase client instance
 * configured from environment variables.
 *
 * Security:
 * - No secrets are logged.
 * - If configuration is missing, a descriptive Error is thrown to the caller.
 */
import { createClient } from "@supabase/supabase-js";

let supabase = null;

function ensureEnv(name) {
  const val = process.env[name];
  if (!val) {
    // Do not include sensitive values in error messages.
    throw new Error(`[supabase] Missing required environment variable: ${name}`);
  }
  return val;
}

// PUBLIC_INTERFACE
export function getSupabaseClient() {
  /**
   * Creates or returns a singleton Supabase client with auth persistence enabled.
   * - persistSession: true -> saves session in localStorage
   * - autoRefreshToken: true -> keeps session fresh
   * - detectSessionInUrl: true -> handles email link flows if used
   */
  if (supabase) return supabase;

  const url = ensureEnv("REACT_APP_SUPABASE_URL");
  const key = ensureEnv("REACT_APP_SUPABASE_KEY");

  // Create a single client for the app lifecycle.
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sb-auth",
    },
    global: {
      headers: {
        "x-client-info": "react_kavia_frontend",
      },
    },
  });

  return supabase;
}

export default getSupabaseClient;
