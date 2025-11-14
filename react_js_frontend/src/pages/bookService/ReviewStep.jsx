import React from "react";
import { BOOKING_STEPS, useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * ReviewStep - Step 6: Summarize all selections and provide confirm action.
 *
 * No API integration yet; Confirm triggers a placeholder alert.
 */
export default function ReviewStep({ canSubmit, onConfirm }) {
  const { vehicle, serviceType, center, dateTime, details } = useBooking();

  return (
    <div className="card" aria-labelledby="review-step-title">
      <h3 id="review-step-title" className="section-title">Review & Confirm</h3>
      <p className="subtitle">Verify your details before submitting.</p>

      <div className="grid" role="list" aria-label="Booking summary">
        <SummaryCard title="Vehicle" index={0}>
          <div>{(vehicle?.make || "-")} {(vehicle?.model || "")}</div>
          <div className="subtitle">VIN: {vehicle?.vin || "-"}</div>
        </SummaryCard>

        <SummaryCard title="Service Type" index={1}>
          <div>{serviceType?.name || "-"}</div>
          {serviceType && (
            <div className="subtitle">
              ${serviceType.price} • {serviceType.duration_min} min
            </div>
          )}
        </SummaryCard>

        <SummaryCard title="Service Center" index={2}>
          <div>{center?.name || "-"}</div>
          <div className="subtitle">{center?.address || "-"}</div>
        </SummaryCard>

        <SummaryCard title="Date & Time" index={3}>
          <div>{dateTime?.date || "-"}</div>
          <div className="subtitle">{dateTime?.slot || "-"}</div>
        </SummaryCard>

        <SummaryCard title="Details" index={4}>
          <div>{details?.name || "-"}</div>
          <div className="subtitle">{details?.email || "-"}</div>
          <div className="subtitle">{details?.phone || "-"}</div>
          {(details?.pickup || details?.loaner) && (
            <div className="subtitle" style={{ marginTop: 6 }}>
              {details.pickup ? "Pickup & Drop • " : ""}
              {details.loaner ? "Loaner Car" : ""}
            </div>
          )}
          {details?.notes && (
            <div style={{ marginTop: 6 }}>
              <div className="label">Notes</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{details.notes}</div>
            </div>
          )}
        </SummaryCard>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button
          className="btn"
          onClick={() => {
            if (!canSubmit) return;
            // TODO(API): Replace with POST /api/bookings call and proper error handling
            onConfirm?.();
          }}
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
        >
          Confirm Booking
        </button>
      </div>

      <div className="subtitle" style={{ marginTop: 8 }}>
        Steps: {BOOKING_STEPS.join(" → ")}
      </div>
    </div>
  );
}

function SummaryCard({ title, index, children }) {
  return (
    <section
      className="card"
      style={{ gridColumn: "span 6", background: "var(--bg)" }}
      role="listitem"
      aria-labelledby={`summary-${index}`}
    >
      <div id={`summary-${index}`} className="section-title" style={{ marginBottom: 6 }}>
        {index + 1}. {title}
      </div>
      <div>{children}</div>
    </section>
  );
}
