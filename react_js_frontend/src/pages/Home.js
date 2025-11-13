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
      {/* New Launch hero/card section */}
      <section
        className="card"
        aria-labelledby="new-launch-heading"
        style={{
          padding: 0,
          overflow: "hidden",
          marginBottom: 16,
          borderRadius: "var(--radius)",
          background: "linear-gradient(180deg, var(--surface), #fff)",
        }}
      >
        <div
          className="row"
          style={{
            alignItems: "stretch",
            gap: 0,
            flexWrap: "wrap",
          }}
        >
          <div className="center-col vcenter-col" style={{ flex: "1 1 360px", padding: 16 }}>
            <h2 id="new-launch-heading" className="section-title" style={{ marginBottom: 6 }}>
              New Launch | Vertesa
            </h2>
            <div className="subtitle" style={{ marginBottom: 10 }}>
              Introducing our latest model with refined aerodynamics and performance.
            </div>
            <p style={{ color: "var(--primary)", lineHeight: 1.6 }}>
              Experience precision engineering, elegant minimalism, and cutting-edge driver
              assistance. Built for efficiency and comfort, crafted for the road ahead.
            </p>
            <div style={{ height: 12 }} />
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <a className="btn" href="#latest-launch-details">Explore</a>
              <a className="btn secondary" href="#latest-launch-details" aria-label="Learn more about the new launch">
                Learn more
              </a>
            </div>
          </div>
          <div
            style={{
              flex: "1 1 420px",
              minHeight: 220,
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
            }}
          >
            {/* Use root-relative public path so it works in CRA and previews */}
            <img
              src="/assets/new-launch-car.png"
              alt="Ocean Motors latest car model"
              style={{
                width: "100%",
                maxWidth: 640,
                height: "auto",
                borderRadius: 8,
                objectFit: "contain",
                display: "block",
                background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
              }}
              width={640}
              height={220}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <h2 className="section-title" id="latest-launch-details">Latest Launches</h2>
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
