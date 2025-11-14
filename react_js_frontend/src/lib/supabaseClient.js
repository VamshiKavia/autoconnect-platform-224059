//
//
// Supabase client for the React app.
// Reads configuration from environment variables:
// - REACT_APP_SUPABASE_URL
// - REACT_APP_SUPABASE_KEY
//
// Do not hardcode secrets. Keys must be provided via .env at build time.
//
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

/**
 * Ensure required env var exists without logging its value.
 * Throws a clear error if missing.
 */
function ensureEnv(name) {
  const val = process.env[name];
  if (!val) {
    // Do not include sensitive values in error messages.
    throw new Error(`[supabase] Missing required environment variable: ${name}`);
  }
  return val;
}

/**
 * Normalize a URL string:
 * - Validate absolute URL
 * - Remove trailing slash from pathname
 */
function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return u;
  }
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

  const rawUrl = ensureEnv("REACT_APP_SUPABASE_URL");
  const key = ensureEnv("REACT_APP_SUPABASE_KEY");

  if (!/^https?:\/\//i.test(rawUrl)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[supabase] REACT_APP_SUPABASE_URL should be an absolute URL, e.g. https://xyz.supabase.co"
    );
  }

  const url = normalizeUrl(rawUrl);

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
