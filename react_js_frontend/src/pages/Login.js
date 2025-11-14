import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
// PUBLIC_INTERFACE
 * Login - Combined Sign In / Sign Up page for Supabase email/password.
 *
 * - Uses AuthProvider actions (signIn/signUp)
 * - Redirects back to prior route via location.state.from if provided
 */
export default function Login() {
  const { signIn, signUp, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  // Removed avatarUrl state as part of deprecating avatar support in signup
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (mode === "signup") {
      return !!displayName && password === confirm;
    }
    return true;
  }, [email, password, confirm, mode, displayName]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        // Only pass display_name metadata if present; avatar_url removed
        const meta = displayName ? { display_name: displayName } : {};
        await signUp(email, password, meta);
      }
      navigate(from, { replace: true });
    } catch (e2) {
      const raw = (e2?.message || authError || "Authentication failed").toString();
      const lower = raw.toLowerCase();
      let friendly = raw;
      if (lower.includes("invalid") && lower.includes("credentials")) {
        friendly = mode === "signup"
          ? "Signup failed: please ensure your email is valid and your password meets the policy."
          : "Invalid email or password.";
      } else if (lower.includes("password")) {
        friendly = "Password does not meet policy requirements.";
      } else if (lower.includes("rate") && lower.includes("limit")) {
        friendly = "Too many attempts. Try again later.";
      }
      setErr(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "24px auto" }}>
        <div className="row" role="tablist" aria-label="Auth options" style={{ gap: 8, marginBottom: 12 }}>
          <button
            role="tab"
            aria-selected={mode === "signin"}
            className={"btn " + (mode === "signin" ? "" : "secondary")}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={"btn " + (mode === "signup" ? "" : "secondary")}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        {mode === "signin" ? (
          <>
            <h3 className="section-title">Welcome back</h3>
            <p className="subtitle">Sign in to access your profile and parts.</p>
          </>
        ) : (
          <>
            <h3 className="section-title">Create your account</h3>
            <p className="subtitle">Join to manage services, parts, and your profile.</p>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <>
              <label className="label" htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                required={mode === "signup"}
              />
              <div style={{ height: 10 }} />
            </>
          )}

          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <div style={{ height: 10 }} />

          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />

          {mode === "signup" && (
            <>
              <div style={{ height: 10 }} />
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={6}
              />
              {confirm && confirm !== password ? (
                <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>
                  Passwords do not match.
                </div>
              ) : null}
            </>
          )}

          {(err || authError) && (
            <div style={{ color: "var(--error)", marginTop: 10 }}>{err || authError}</div>
          )}

          <div style={{ height: 16 }} />
          <button type="submit" className="btn" style={{ width: "100%" }} disabled={!canSubmit || loading}>
            {loading ? (mode === "signin" ? "Signing in..." : "Signing up...") : (mode === "signin" ? "Sign In" : "Sign Up")}
          </button>
        </form>
      </div>
    </div>
  );
}
