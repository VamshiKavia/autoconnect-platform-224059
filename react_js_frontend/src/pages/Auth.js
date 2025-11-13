import { useState } from "react";
import { apiPost } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Auth - login form (stub)
 */
export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiPost("/auth/login", { email, password });
      localStorage.setItem("access_token", res.access_token);
      if (onLogin) onLogin(res);
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h3 className="section-title">Sign In</h3>
        <p className="subtitle">Access your account to manage services and profile.</p>
        <form onSubmit={handleSubmit}>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <div style={{ height: 12 }} />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {error ? <div style={{ color: "var(--error)", marginTop: 8 }}>{error}</div> : null}
          <div style={{ height: 16 }} />
          <button type="submit" className="btn" style={{ width: "100%" }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
