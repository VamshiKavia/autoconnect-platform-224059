import React, { useMemo, useRef, useState } from "react";
import { BOOKING_STEPS, BookingProvider } from "./context";
import VehicleStep from "./VehicleStep";
import ServiceTypeStep from "./ServiceTypeStep";
import CenterStep from "./CenterStep";
import DateTimeStep from "./DateTimeStep";
import DetailsStep from "./DetailsStep";
import ReviewStep from "./ReviewStep";

/**
// PUBLIC_INTERFACE
 * BookServicePage - Multi-step booking UI wired to Supabase for reads and booking insert.
 */
export default function BookServicePage() {
  return (
    <BookingProvider>
      <div className="container">
        <header className="card" style={{ marginBottom: 12 }}>
          <h1 className="section-title" style={{ fontSize: 22, marginBottom: 6 }}>
            Book My Service
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Schedule maintenance or repairs in a few simple steps.
          </p>
        </header>

        <StepperArea />
      </div>
    </BookingProvider>
  );
}

function StepperArea() {
  const [step, setStep] = useState(0);
  const [validMap, setValidMap] = useState({ 0: false, 1: false, 2: false, 3: false, 4: false });
  const atFirst = step === 0;
  const atLast = step === 5;

  const canNext = useMemo(() => !!validMap[step], [step, validMap]);
  const canSubmit = useMemo(() => Object.values(validMap).every(Boolean), [validMap]);

  function updateValidity(idx, isValid) {
    setValidMap((m) => (m[idx] === isValid ? m : { ...m, [idx]: isValid }));
  }

  function next() {
    if (!canNext) return;
    setStep((s) => Math.min(BOOKING_STEPS.length - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  // We let ReviewStep own the actual insert; the Submit button in nav is removed for simplicity
  return (
    <>
      <Stepper current={step} />

      <section aria-live="polite" aria-atomic="true" style={{ marginBottom: 12 }}>
        {step === 0 && <VehicleStep onValidChange={(v) => updateValidity(0, v)} />}
        {step === 1 && <ServiceTypeStep onValidChange={(v) => updateValidity(1, v)} />}
        {step === 2 && <CenterStep onValidChange={(v) => updateValidity(2, v)} />}
        {step === 3 && <DateTimeStep onValidChange={(v) => updateValidity(3, v)} />}
        {step === 4 && <DetailsStep onValidChange={(v) => updateValidity(4, v)} />}
        {step === 5 && <ReviewStep canSubmit={canSubmit} />}
      </section>

      {/* Navigation controls */}
      <nav aria-label="Booking navigation" className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn secondary" onClick={back} disabled={atFirst} aria-disabled={atFirst}>
          Back
        </button>
        {atLast ? (
          <button className="btn" disabled aria-disabled>
            Review & Confirm
          </button>
        ) : (
          <button className="btn" onClick={next} disabled={!canNext} aria-disabled={!canNext}>
            Next
          </button>
        )}
      </nav>
    </>
  );
}

function Stepper({ current }) {
  return (
    <div className="card" aria-label="Progress" style={{ marginBottom: 12 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {BOOKING_STEPS.map((label, idx) => {
          const isActive = idx === current;
          const isDone = idx < current;
          return (
            <div
              key={label}
              className="card"
              style={{
                flex: "1 1 160px",
                minWidth: 150,
                background: "var(--bg)",
                border: "1px solid #E5E7EB",
                boxShadow: "none",
                padding: 10,
              }}
              aria-current={isActive ? "step" : undefined}
            >
              <div className="row" style={{ justifyContent: "flex-start" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDone ? "var(--success)" : isActive ? "var(--primary)" : "var(--surface)",
                    color: isDone || isActive ? "#fff" : "var(--muted)",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isDone ? "✓" : idx + 1}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    color: isActive ? "var(--primary)" : isDone ? "var(--success)" : "var(--muted)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
