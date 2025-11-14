import React, { useEffect, useState } from "react";
import { useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * VehicleStep - Step 1: Select/enter vehicle details.
 *
 * Validates: make, model, year (yyyy). VIN optional.
 */
export default function VehicleStep({ onValidChange }) {
  const { vehicle, setVehicle } = useBooking();
  const [local, setLocal] = useState(vehicle || { make: "", model: "", year: "", vin: "" });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const valid = isValid(local);
    onValidChange?.(valid);
    // update global state live to persist across steps
    setVehicle(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  function isValid(v) {
    const y = String(v.year || "").trim();
    const yOk = /^\d{4}$/.test(y) && Number(y) >= 1990 && Number(y) <= new Date().getFullYear() + 1;
    return !!(v.make && v.model && yOk);
  }

  return (
    <div className="card" aria-labelledby="vehicle-step-title">
      <h3 id="vehicle-step-title" className="section-title">Select Vehicle</h3>
      <p className="subtitle">Enter your vehicle details to tailor the service.</p>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-make">Make</label>
          <input
            id="vehicle-make"
            className="input"
            value={local.make}
            onChange={(e) => setLocal((s) => ({ ...s, make: e.target.value }))}
            placeholder="e.g., Hyundai"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && !local.make && <FieldError text="Make is required" />}
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-model">Model</label>
          <input
            id="vehicle-model"
            className="input"
            value={local.model}
            onChange={(e) => setLocal((s) => ({ ...s, model: e.target.value }))}
            placeholder="e.g., i20"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && !local.model && <FieldError text="Model is required" />}
        </div>
      </div>

      <div className="row" style={{ flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ width: 160, minWidth: 140 }}>
          <label className="label" htmlFor="vehicle-year">Year</label>
          <input
            id="vehicle-year"
            className="input"
            value={local.year}
            onChange={(e) => setLocal((s) => ({ ...s, year: e.target.value }))}
            placeholder="YYYY"
            inputMode="numeric"
            pattern="\d{4}"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && (!/^\d{4}$/.test(String(local.year)) || Number(local.year) < 1990) && (
            <FieldError text="Enter a valid year (1990+)" />
          )}
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-vin">VIN (optional)</label>
          <input
            id="vehicle-vin"
            className="input"
            value={local.vin}
            onChange={(e) => setLocal((s) => ({ ...s, vin: e.target.value }))}
            placeholder="17-character VIN (optional)"
            maxLength={24}
          />
        </div>
      </div>
    </div>
  );
}

function FieldError({ text }) {
  return <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>{text}</div>;
}
