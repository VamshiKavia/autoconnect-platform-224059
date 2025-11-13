import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Home - shows latest car launches
 */
export default function Home() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/cars")
      .then(setCars)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">Latest Launches</h2>
      <p className="subtitle">Discover our newest models and innovations.</p>
      {loading ? (
        <div className="card">Loading...</div>
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
