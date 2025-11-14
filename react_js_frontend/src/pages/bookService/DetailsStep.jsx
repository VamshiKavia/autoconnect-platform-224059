import React, { useEffect, useState } from "react";
import { useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * DetailsStep - Step 5: Enter contact details and preferences.
 *
 * Validates: name, phone (basic), email (basic).
 */
export default function DetailsStep({ onValidChange }) {
  const { details, setDetails } = useBooking();
  const [local, setLocal] = useState(details || { name: "", phone: "", email: "", notes: "", pickup: false, loaner: false });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setDetails(local);
    onValidChange?.(isValid(local));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  function isValid(d) {
    const nameOk = (d.name || "").trim().length > 1;
    const phoneOk = /^[\d\s()+-]{7,}$/.test(d.phone || "");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "");
    return nameOk && phoneOk && emailOk;
  }

  return (
    <form className="card" aria-labelledby="details-step-title" onSubmit={(e) => e.preventDefault()} noValidate>
      <h3 id="details-step-title" className="section-title">Enter Details & Preferences</h3>
      <p className="subtitle">We’ll use these details to confirm your booking.</p>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <label className="label" htmlFor="cust-name">Full name</label>
          <input
            id="cust-name"
            className="input"
            value={local.name}
            onBlur={() => setTouched(true)}
            onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))}
            placeholder="Your name"
            required
          />
          {touched && !(local.name || "").trim() && <FieldError text="Name is required" />}
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          <label className="label" htmlFor="cust-phone">Phone</label>
          <input
            id="cust-phone"
            className="input"
            value={local.phone}
            onBlur={() => setTouched(true)}
            onChange={(e) => setLocal((s) => ({ ...s, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            required
          />
          {touched && !/^[\d\s()+-]{7,}$/.test(local.phone || "") && <FieldError text="Enter a valid phone" />}
        </div>
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <label className="label" htmlFor="cust-email">Email</label>
          <input
            id="cust-email"
            className="input"
            type="email"
            value={local.email}
            onBlur={() => setTouched(true)}
            onChange={(e) => setLocal((s) => ({ ...s, email: e.target.value }))}
            placeholder="you@example.com"
            required
          />
          {touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(local.email || "") && <FieldError text="Enter a valid email" />}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="label" htmlFor="cust-notes">Notes (optional)</label>
        <textarea
          id="cust-notes"
          className="input"
          rows={4}
          value={local.notes}
          onChange={(e) => setLocal((s) => ({ ...s, notes: e.target.value }))}
          placeholder="Share specific concerns or preferences..."
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="row" style={{ gap: 16, marginTop: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={local.pickup}
            onChange={(e) => setLocal((s) => ({ ...s, pickup: e.target.checked }))}
          />
          Vehicle Pickup & Drop
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={local.loaner}
            onChange={(e) => setLocal((s) => ({ ...s, loaner: e.target.checked }))}
          />
          Loaner Car Requested
        </label>
      </div>
    </form>
  );
}

function FieldError({ text }) {
  return <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>{text}</div>;
}
