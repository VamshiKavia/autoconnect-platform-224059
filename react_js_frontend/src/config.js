//
/**
 * Runtime configuration helpers for the React app.
 * Do not hardcode secrets; read via process.env.* prefixed with REACT_APP_.
 * Booking Supabase enablement is handled via utils/featureFlags.js
 */
//
// PUBLIC_INTERFACE
export function getFeatureFlags() {
  /** Returns feature flags as a normalized object from REACT_APP_FEATURE_FLAGS. */
  const raw = process.env.REACT_APP_FEATURE_FLAGS || "";
  // Accept JSON or comma-separated key:value
  try {
    if (raw.trim().startsWith("{")) {
      return JSON.parse(raw);
    }
  } catch {
    // fallthrough to parsing
  }
  const flags = {};
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [k, v] = pair.split(":").map((x) => (x || "").trim());
      if (!k) return;
      const lower = (v || "").toLowerCase();
      const boolVal =
        lower === "true" ? true : lower === "false" ? false : v || true;
      flags[k] = boolVal;
    });
  return flags;
}

// PUBLIC_INTERFACE
export function isMockBackendEnabled() {
  /** Returns true if mock backend fallback should be used when API calls fail. */
  const flags = getFeatureFlags();
  return !!flags.MOCK_BACKEND || !!flags.mock || false;
}

// PUBLIC_INTERFACE
export function getLogLevel() {
  /** Returns log level string */
  return process.env.REACT_APP_LOG_LEVEL || "info";
}

// PUBLIC_INTERFACE
export function validateRequiredEnv() {
  /**
   * Validates that a backend base URL is available; logs warnings instead of throwing to avoid blocking SPA.
   */
  const base =
    process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  if (!base) {
    // eslint-disable-next-line no-console
    console.warn(
      "[config] No REACT_APP_API_BASE or REACT_APP_BACKEND_URL set. Defaulting to http://localhost:3001"
    );
  }
  return true;
}
