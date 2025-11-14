import React, { useEffect, useState } from "react";
import { MockData, useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from mock list.
 *
 * Validates: One service type must be selected.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();
  const [selected, setSelected] = useState(serviceType?.id || "");

  useEffect(() => {
    const found = MockData.serviceTypes.find((s) => s.id === selected) || null;
    setServiceType(found || null);
    onValidChange?.(!!found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">Pick a service to continue. Pricing and durations are estimates.</p>

      <div className="grid">
        {MockData.serviceTypes.map((svc) => {
          const active = selected === svc.id;
          return (
            <button
              key={svc.id}
              className="card"
              style={{
                gridColumn: "span 4",
                textAlign: "left",
                borderColor: active ? "#93C5FD" : "#E5E7EB",
                background: active ? "#F3F4F6" : "var(--surface)",
                cursor: "pointer",
              }}
              onClick={() => setSelected(svc.id)}
              aria-pressed={active}
              aria-label={`Select ${svc.name}`}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{svc.name}</strong>
                <span className="subtitle">${svc.price}</span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                Approx. {svc.duration_min} min
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
