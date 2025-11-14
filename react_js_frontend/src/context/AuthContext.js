import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import getSupabaseClient from "../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * AuthContext - React context providing Supabase auth session and actions.
 *
 * Exposes:
 * - session: current Supabase session or null
 * - user: current Supabase user or null
 * - loading: boolean while initializing/auth state transitions
 * - error: last auth error message (string) or ""
 * - signIn(email, password)
 * - signUp(email, password, metadata?)
 * - signOut()
 * - refreshUser() to reload user data
 */
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  error: "",
  signIn: async (_email, _password) => {},
  signUp: async (_email, _password, _metadata) => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access authentication context values. */
  return useContext(AuthContext);
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /**
   * Provides auth state using Supabase session and onAuthStateChange.
   * Persists session by saving access token and refresh token to localStorage for API client reuse.
   */
  const supabase = getSupabaseClient();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Initialize: get current session and subscribe to changes
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        setSession(data?.session || null);
        setUser(data?.session?.user || null);

        // Store access token for API client Authorization header compatibility
        const token = data?.session?.access_token;
        if (token) {
          localStorage.setItem("access_token", token);
        } else {
          localStorage.removeItem("access_token");
        }
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to initialize session");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      const token = newSession?.access_token;
      if (token) {
        localStorage.setItem("access_token", token);
      } else {
        localStorage.removeItem("access_token");
      }
    });

    init();

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email, password) => {
      setErr("");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        throw error;
      }
      // session state will be updated by onAuthStateChange
      return data;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email, password, metadata = {}) => {
      setErr("");
      // Use redirect URL from env for email-confirm flows if needed
      let siteUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
      try {
        // Ensure absolute URL and no trailing slash, then append /login
        const u = new URL(siteUrl);
        u.pathname = u.pathname.replace(/\/+$/, "");
        siteUrl = u.toString();
      } catch {
        // eslint-disable-next-line no-console
        console.warn("[auth] REACT_APP_FRONTEND_URL is not a valid absolute URL. Falling back to window.location.origin");
        siteUrl = window.location.origin;
      }

      // Only include display_name if provided; do not send avatar_url
      const meta = {};
      if (typeof metadata?.display_name === "string" && metadata.display_name.trim().length > 0) {
        meta.display_name = metadata.display_name;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/login`,
          data: meta,
        },
      });
      if (error) {
        // Map common Supabase auth errors to friendlier messages
        const code = (error?.name || error?.status || "").toString().toLowerCase();
        let friendly = error.message;
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("invalid") && msg.includes("credentials")) {
          friendly = "Invalid signup details. Check password policy and email format.";
        } else if (msg.includes("password")) {
          friendly = "Password does not meet policy. Use a stronger password.";
        } else if (msg.includes("rate") && msg.includes("limit")) {
          friendly = "Too many attempts. Please try again later.";
        }
        setErr(friendly);
        const err = new Error(friendly);
        err.original = error;
        throw err;
      }
      return data;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    setErr("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErr(error.message);
      throw error;
    }
    // onAuthStateChange will clear tokens
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    setErr("");
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setErr(error.message);
      throw error;
    }
    setUser(data?.user || null);
    return data?.user || null;
  }, [supabase]);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      error: err,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [session, user, loading, err, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
