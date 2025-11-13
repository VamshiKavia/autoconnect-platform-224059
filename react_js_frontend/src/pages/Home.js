import { useEffect, useState } from "react";
import { apiGet, apiHealth, getApiBase } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Home - shows latest car launches
 */
export default function Home() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState({ ok: null, status: null, error: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    // Kick off healthcheck in parallel
    apiHealth().then((h) => setHealth(h));

    apiGet("/cars")
      .then(setCars)
      .catch((e) => setError(e?.message || "Failed to load cars"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">Latest Launches</h2>
      <p className="subtitle">Discover our newest models and innovations.</p>

      {/* Health status banner */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            Backend: {getApiBase()}
            {health.ok === false ? (
              <span style={{ color: "var(--error)", marginLeft: 8 }}>
                Unreachable (status {health.status || "n/a"})
              </span>
            ) : health.ok === true ? (
              <span style={{ color: "var(--success)", marginLeft: 8 }}>
                Online (status {health.status})
              </span>
            ) : (
              <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                Checking...
              </span>
            )}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Paths auto-prefixed with /api
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading...</div>
      ) : error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="grid">
          {cars.map((c) => (
            <div key={c.id} className="card" style={{ gridColumn: "span 4" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{c.name}</strong>
                {c.is_new ? (
                  <span style={{ color: "var(--success)", fontSize: 12 }}>NEW</span>
                ) : null}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
                {c.type} • {c.year}
              </div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>
                ${Number(c.price).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
