import React, { useEffect, useState } from "react";
import { useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * VehicleStep - Step 1: Select/enter vehicle details.
 *
 * Validates: make, model. VIN optional.
 */
export default function VehicleStep({ onValidChange }) {
  const { vehicle, setVehicle } = useBooking();
  // Remove 'year' from local state shape
  const [local, setLocal] = useState(
    vehicle && typeof vehicle === "object"
      ? { make: vehicle.make || "", model: vehicle.model || "", vin: vehicle.vin || "" }
      : { make: "", model: "", vin: "" }
  );
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const valid = isValid(local);
    onValidChange?.(valid);
    // update global state live to persist across steps
    setVehicle(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  function isValid(v) {
    return !!(String(v.make || "").trim() && String(v.model || "").trim());
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
