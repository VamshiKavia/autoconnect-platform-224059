import React, { useEffect, useState } from "react";
import { MockData, useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center from mock list.
 *
 * Validates: A center must be selected.
 */
export default function CenterStep({ onValidChange }) {
  const { center, setCenter } = useBooking();
  const [selected, setSelected] = useState(center?.id || "");

  useEffect(() => {
    const found = MockData.centers.find((c) => c.id === selected) || null;
    setCenter(found || null);
    onValidChange?.(!!found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="card" aria-labelledby="center-step-title">
      <h3 id="center-step-title" className="section-title">Choose Service Center</h3>
      <p className="subtitle">Nearby Ocean Motors service locations.</p>

      <div className="grid">
        {MockData.centers.map((c) => {
          const active = selected === c.id;
          return (
            <article
              key={c.id}
              className="card"
              style={{
                gridColumn: "span 6",
                borderColor: active ? "#93C5FD" : "#E5E7EB",
                background: active ? "#F3F4F6" : "var(--surface)",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="subtitle" style={{ marginTop: 4 }}>{c.address}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                    {c.distance_km.toFixed(1)} km • Rating {c.rating.toFixed(1)}★
                  </div>
                </div>
                <div>
                  <button
                    className="btn"
                    onClick={() => setSelected(c.id)}
                    aria-label={`Select ${c.name}`}
                  >
                    {active ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
