//
// PUBLIC INTERFACE
// getFeatureFlags provides runtime feature flags for the app.
//
// NOTE: Do not import environment variables directly in multiple places.
// Use this utility to centralize flag handling.
//
/**
 * Provides application feature flags and helpers.
 *
 * - Flags are controlled via environment variables.
 * - REACT_APP_FEATURE_FLAGS can be a JSON string to override defaults.
 * - REACT_APP_ENABLE_SUPABASE toggles DB-backed behavior in booking flow.
 */
export function getFeatureFlags() {
  // Base flags with defaults
  const base = {
    ENABLE_SUPABASE: String(process.env.REACT_APP_ENABLE_SUPABASE || 'false') === 'true',
  };

  // Optional JSON overrides from REACT_APP_FEATURE_FLAGS
  let overrides = {};
  try {
    if (process.env.REACT_APP_FEATURE_FLAGS) {
      overrides = JSON.parse(process.env.REACT_APP_FEATURE_FLAGS);
    }
  } catch (e) {
    // Gracefully ignore invalid JSON and continue with base defaults
    // eslint-disable-next-line no-console
    console.warn('Invalid REACT_APP_FEATURE_FLAGS JSON, using defaults.');
  }

  return {
    ...base,
    ...overrides,
  };
}

// PUBLIC_INTERFACE
export function isSupabaseEnabled() {
  /** Returns true when Supabase-backed features are enabled via flags. */
  return getFeatureFlags().ENABLE_SUPABASE === true;
}
