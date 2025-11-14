import React, { useEffect, useRef, useState } from "react";
import { BOOKING_STEPS, useBooking } from "./context";
import { useAuth } from "../../context/AuthContext";
import getSupabaseClient from "../../lib/supabaseClient";
import SignInRequiredBanner from "./SignInRequiredBanner.jsx";

/**
// PUBLIC_INTERFACE
 * ReviewStep - Step 6: Summarize selections and confirm to create booking in Supabase.
 *
 * Insert:
 *   supabase.from('bookings')
 *     .insert([{
 *       user_id, vehicle_id, service_type_id, service_center_id,
 *       datetime, notes, status
 *     }]).select().single()
 *
 * On success: show success state with booking id reference.
 * On error: show error banner (handle RLS/permission friendly messaging).
 */
export default function ReviewStep({ canSubmit }) {
  const { user } = useAuth();
  const { vehicle, serviceType, center, dateTime, details } = useBooking();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(null); // store inserted row
  const noticeRef = useRef(null);

  useEffect(() => {
    // If user signs in while on this step, ensure any previous error about auth is cleared
    if (user && err && err.toLowerCase().includes("sign in")) {
      setErr("");
    }
  }, [user, err]);

  async function onConfirm() {
    // Block when unauthenticated: focus the sign-in banner for guidance
    if (!user) {
      setErr("Please sign in to confirm your booking.");
      // Focus the notice if present
      const el = document.getElementById("sign-in-required");
      if (el && typeof el.focus === "function") el.focus();
      return;
    }

    if (!canSubmit || submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      // Map collected values to DB fields
      const payload = {
        user_id: user?.id || null,
        vehicle_id: vehicle?.id || null, // may be null if manual entry
        service_type_id: serviceType?.id || null,
        service_center_id: center?.id || null,
        datetime: dateTime?.datetimeISO || null,
        notes: String(details?.notes || ""),
        status: "pending",
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setSuccess(data || { id: "—" });
    } catch (e) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("permission") || msg.includes("rls") || msg.includes("not authorized")) {
        setErr("You do not have permission to create a booking. Please sign in or contact support.");
      } else if (msg.includes("foreign key") || msg.includes("violates")) {
        setErr("One or more selected items are invalid or no longer available. Please review and try again.");
      } else {
        setErr("Failed to create booking. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDisabled = !user || !canSubmit || submitting;

  return (
    <div className="card" aria-labelledby="review-step-title">
      <h3 id="review-step-title" className="section-title">Review & Confirm</h3>
      <p className="subtitle">Verify your details before submitting.</p>

      {!user && (
        <div ref={noticeRef}>
          <SignInRequiredBanner id="sign-in-required" focusOnMount />
        </div>
      )}

      {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
      {success && (
        <div className="card" style={{ color: "var(--success)" }}>
          Booking confirmed. Reference #{success?.id}
        </div>
      )}

      <div className="grid" role="list" aria-label="Booking summary">
        <SummaryCard title="Vehicle" index={0}>
          <div>{(vehicle?.make || "-")} {(vehicle?.model || "")} {vehicle?.year ? `• ${vehicle.year}` : ""}</div>
          <div className="subtitle">VIN: {vehicle?.vin || "-"}</div>
        </SummaryCard>

        <SummaryCard title="Service Type" index={1}>
          <div>{serviceType?.name || "-"}</div>
          {serviceType && (
            <>
              <div className="subtitle">
                {serviceType?.price != null ? `$${serviceType.price}` : "$—"} • {serviceType?.duration_min || "—"} min
              </div>
              {serviceType?.description ? (
                <div className="subtitle" style={{ marginTop: 4 }}>
                  {serviceType.description}
                </div>
              ) : null}
            </>
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
          onClick={onConfirm}
          disabled={confirmDisabled}
          aria-disabled={confirmDisabled}
        >
          {submitting ? "Submitting..." : success ? "Booked" : "Confirm Booking"}
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
