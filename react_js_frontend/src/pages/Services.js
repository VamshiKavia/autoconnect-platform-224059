import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Services - shows available services
 */
export default function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/services")
      .then(setServices)
      .catch((e) => setError(e?.message || "Failed to load services"));
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">Services</h2>
      <p className="subtitle">Professional maintenance and care.</p>
      {error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="grid">
          {services.map((s) => (
            <div key={s.id} className="card" style={{ gridColumn: "span 4" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{s.name}</strong>
                <span className="subtitle">${s.price}</span>
              </div>
              <div style={{ marginTop: 6, color: "var(--muted)" }}>
                Duration: {s.duration_min} min
              </div>
              <button className="btn" style={{ marginTop: 12 }}>Book</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
