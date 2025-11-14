import React, { useMemo, useState } from "react";
import { BOOKING_STEPS, useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";
import { generateMockBookingReference } from "./mocks";

/**
// PUBLIC_INTERFACE
 * ReviewStep - Step 6: Summarize selections and allow confirmation.
 * TODO: When REACT_APP_ENABLE_SUPABASE=true, Supabase insert is active.
 */
export default function ReviewStep({ canSubmit }) {
  const { vehicle, serviceType, center, dateTime, details, flags } = useBooking();
  const supabase = getSupabaseClient();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(null);

  const requiredReady = useMemo(() => {
    const hasVehicle = !!(vehicle && (vehicle.make || vehicle.model));
    const hasServiceType = !!serviceType?.id;
    const hasCenter = !!center?.id;
    const hasSlot = !!dateTime?.slotMeta?.id || !!dateTime?.slot; // allow mock id/label
    const hasDetails = !!(details?.name && details?.phone && details?.email);
    return hasVehicle && hasServiceType && hasCenter && hasSlot && hasDetails;
  }, [vehicle, serviceType, center?.id, dateTime?.slotMeta?.id, dateTime?.slot, details?.name, details?.phone, details?.email]);

  const disabled = !(canSubmit && requiredReady) || submitting;

  // PUBLIC_INTERFACE
  async function handleConfirm() {
    if (disabled) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      // Mock path: simulate success
      if (!flags?.supabaseEnabled) {
        const mockId = generateMockBookingReference();
        setTimeout(() => {
          setSuccess({ id: mockId, _note: "Supabase disabled: booking not persisted. This is a mock confirmation." });
          setSubmitting(false);
        }, 400);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error("You must be signed in to confirm a booking.");
      }

      const payload = {
        user_id: userId,
        vehicle_id: vehicle?.id || null, // May be null if manually entered
        service_type_id: serviceType.id,
        service_center_id: center?.id,
        slot_id: dateTime?.slotMeta?.id,
        contact_name: details?.name || "",
        contact_phone: details?.phone || "",
        contact_email: details?.email || "",
        pickup_drop: !!details?.pickup,
        notes: details?.notes || "",
        estimated_price: isFiniteNumber(serviceType?.price) ? Number(serviceType.price) : null,
        estimated_duration_minutes: isFiniteNumber(serviceType?.duration_min) ? Number(serviceType.duration_min) : null,
        status: "pending",
      };

      validatePayload(payload);

      const { data, error } = await supabase
        .from("service_bookings")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      setSuccess({ id: data?.id });
    } catch (e) {
      setErrorMsg(e?.message || "Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success?.id) {
    return (
      <section className="card" aria-live="polite" aria-atomic="true" aria-labelledby="booking-success-title">
        <h3 id="booking-success-title" className="section-title">Booking Confirmed</h3>
        <p className="subtitle">
          Your booking has been created successfully. Reference:
          <strong> #{String(success.id)}</strong>
        </p>
        {!flags?.supabaseEnabled && (
          <p className="subtitle" style={{ marginTop: 8 }}>
            Note: Supabase is currently disabled. This confirmation is not persisted to the database.
          </p>
        )}
        <div className="card" style={{ background: "var(--background)" }}>
          <div className="label">Summary</div>
          <ul style={{ marginTop: 6 }}>
            <li>Vehicle: {(vehicle?.make || "-")} {(vehicle?.model || "")}{vehicle?.vin ? ` (VIN: ${vehicle.vin})` : ""}</li>
            <li>Service: {serviceType?.name} {serviceType?.duration_min ? `• ${serviceType.duration_min} min` : ""}</li>
            <li>Center: {center?.name}</li>
            <li>Date/Time: {dateTime?.date} {dateTime?.slot ? `• ${dateTime.slot}` : ""}</li>
          </ul>
        </div>
        <div className="subtitle" style={{ marginTop: 12 }}>
          Steps: {BOOKING_STEPS.join(" → ")}
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="review-step-title">
      <h3 id="review-step-title" className="section-title">Review & Confirm</h3>
      <p className="subtitle">Verify your details before submitting.</p>

      <div className="grid" role="list" aria-label="Booking summary">
        <SummaryCard title="Vehicle" index={0}>
          <div>{(vehicle?.make || "-")} {(vehicle?.model || "")}</div>
          <div className="subtitle">VIN: {vehicle?.vin || "-"}</div>
        </SummaryCard>

        <SummaryCard title="Service Type" index={1}>
          <>
            <div>{serviceType?.name || "-"}</div>
            {serviceType && (
              <>
                <div className="subtitle">
                  {isFiniteNumber(serviceType.price) ? `$${Number(serviceType.price).toLocaleString()}` : "—"} • {isFiniteNumber(serviceType.duration_min) ? `${serviceType.duration_min} min` : "—"}
                </div>
                {serviceType.note ? (
                  <div className="subtitle" style={{ marginTop: 4 }}>
                    {serviceType.note}
                  </div>
                ) : null}
              </>
            )}
          </>
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

      {errorMsg && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)", marginTop: 12 }}
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button
          className="btn"
          onClick={handleConfirm}
          disabled={disabled}
          aria-disabled={disabled}
        >
          {submitting ? "Confirming..." : "Confirm Booking"}
        </button>
      </div>

      <div className="subtitle" style={{ marginTop: 8 }}>
        Steps: {BOOKING_STEPS.join(" → ")}
      </div>
    </section>
  );
}

function isFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n);
}
function validatePayload(p) {
  if (!p.user_id) throw new Error("Not signed in.");
  if (!p.service_type_id) throw new Error("Service type is missing.");
  if (!p.service_center_id) throw new Error("Service center is missing.");
  if (!p.slot_id) throw new Error("Time slot is missing.");
}
function SummaryCard({ title, index, children }) {
  return (
    <section
      className="card"
      style={{ gridColumn: "span 6", background: "var(--background)" }}
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
