import { useMemo, useState } from "react";
import { apiPost } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Auth - Authentication entry page with Sign In and Create Account tabs.
 * 
 * Behavior:
 * - Two tabs: "Sign In" and "Create Account"
 * - On success: stores access_token in localStorage and calls onLogin
 * - Displays validation and backend errors
 */
export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({
    email: "demo@example.com",
    password: "password",
    name: "",
  });
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    if (!form.email || !form.password) return false;
    if (mode === "register") {
      return !!form.name && confirm === form.password;
    }
    return true;
  }, [form, confirm, mode]);

  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!canSubmit) {
      setErr("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, name: form.name };
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await apiPost(path, payload);
      if (res?.access_token) {
        localStorage.setItem("access_token", res.access_token);
      }
      if (onLogin) onLogin(res);
    } catch (e) {
      // Friendlier error mapping
      const message = String(e?.message || "").toLowerCase();
      if (message.includes("404")) {
        setErr("Service unavailable. Please try again later.");
      } else if (message.includes("409")) {
        setErr("Account already exists. Try signing in instead.");
      } else if (message.includes("network")) {
        setErr("Network error. Check your connection and backend URL.");
      } else {
        setErr(e?.message || "Authentication failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: "24px auto" }}>
        <div className="row" role="tablist" aria-label="Authentication options" style={{ gap: 8, marginBottom: 12 }}>
          <button
            role="tab"
            aria-selected={mode === "login"}
            className={"btn " + (mode === "login" ? "" : "secondary")}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === "register"}
            className={"btn " + (mode === "register" ? "" : "secondary")}
            onClick={() => setMode("register")}
          >
            Create Account
          </button>
        </div>

        {mode === "login" ? (
          <>
            <h3 className="section-title">Welcome back</h3>
            <p className="subtitle">Sign in to access your services and profile.</p>
          </>
        ) : (
          <>
            <h3 className="section-title">Create your account</h3>
            <p className="subtitle">Join Ocean Motors to manage services and more.</p>
          </>
        )}

        <form onSubmit={submit} noValidate>
          {mode === "register" ? (
            <>
              <label className="label" htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Your full name"
                required={mode === "register"}
              />
              <div style={{ height: 12 }} />
            </>
          ) : null}

          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="you@example.com"
            required
          />
          <div style={{ height: 12 }} />

          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
          {mode === "register" ? (
            <>
              <div style={{ height: 12 }} />
              <label className="label" htmlFor="confirm">Confirm Password</label>
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
              {confirm && confirm !== form.password ? (
                <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>
                  Passwords do not match.
                </div>
              ) : null}
            </>
          ) : null}

          {err ? (
            <div style={{ color: "var(--error)", marginTop: 10 }}>{err}</div>
          ) : null}

          <div style={{ height: 16 }} />
          <button type="submit" className="btn" style={{ width: "100%" }} disabled={!canSubmit || loading}>
            {loading ? (mode === "login" ? "Signing in..." : "Creating...") : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
