import React from "react";

/**
// PUBLIC_INTERFACE
 * BookService - Routed page scaffold for scheduling maintenance or repairs.
 *
 * Purpose:
 * - Provide a minimalist, responsive layout that introduces a multi-step booking flow.
 * - Placeholder only; no API calls or business logic yet.
 *
 * Route: /book-service
 */
export default function BookService() {
  const steps = [
    "Select Vehicle",
    "Choose Service",
    "Pick Center",
    "Date & Time",
    "Contact & Review",
  ];

  return (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
        <h1 className="section-title" style={{ fontSize: 24, marginBottom: 6 }}>
          Book My Service
        </h1>
        <p className="subtitle" style={{ marginBottom: 0 }}>
          Schedule maintenance or repairs in a few simple steps. Start by selecting
          your vehicle, choose the service type, pick a nearby service center, and
          finish with your preferred date, time, and contact details.
        </p>
      </section>

      {/* Placeholder stepper */}
      <section className="card" aria-label="Booking steps">
        <div
          className="row"
          style={{
            flexWrap: "wrap",
            gap: 8,
            alignItems: "stretch",
            marginBottom: 12,
          }}
        >
          {steps.map((label, idx) => (
            <div
              key={label}
              className="card"
              style={{
                flex: "1 1 160px",
                minWidth: 140,
                background: "var(--bg)",
                border: "1px solid #E5E7EB",
                boxShadow: "none",
              }}
              aria-current={idx === 0 ? "step" : undefined}
            >
              <div
                className="row"
                style={{ gap: 10, alignItems: "center", justifyContent: "flex-start" }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: idx === 0 ? "var(--primary)" : "var(--surface)",
                    color: idx === 0 ? "#fff" : "var(--muted)",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <span
                  style={{
                    color: idx === 0 ? "var(--primary)" : "var(--muted)",
                    fontWeight: idx === 0 ? 600 : 500,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder CTA area */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid #E5E7EB",
            boxShadow: "none",
          }}
        >
          <h3 className="section-title" style={{ marginBottom: 6 }}>
            Get started
          </h3>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            This is a placeholder. In the full flow, you’ll select your vehicle and service details here.
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={() => alert("Step flow coming soon")}
              aria-label="Begin booking process"
            >
              Start Booking
            </button>
            <button
              className="btn secondary"
              onClick={() => alert("Learn more about services")}
              aria-label="Learn more about booking services"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
