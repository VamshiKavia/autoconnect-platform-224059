import React, { useMemo, useState } from "react";
import { BOOKING_STEPS, useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ReviewStep - Step 6: Summarize selections and allow confirmation with polished UI.
 * No changes to Supabase setup; relies on existing configuration.
 */
export default function ReviewStep({ canSubmit }) {
  const { vehicle, serviceType, center, dateTime, details } = useBooking();
  const supabase = getSupabaseClient();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(null);

  const requiredReady = useMemo(() => {
    const hasVehicle = !!(vehicle && (vehicle.make || vehicle.model));
    const hasServiceType = !!serviceType?.id && isUuid(serviceType.id);
    const hasCenter = !!center?.id && isUuid(center.id);
    const hasSlot = !!dateTime?.slotMeta?.id && isUuid(dateTime.slotMeta.id);
    const hasDetails = !!(details?.name && details?.phone && details?.email);
    return hasVehicle && hasServiceType && hasCenter && hasSlot && hasDetails;
  }, [vehicle, serviceType, center?.id, dateTime?.slotMeta?.id, details?.name, details?.phone, details?.email]);

  const disabled = !(canSubmit && requiredReady) || submitting;

  // PUBLIC_INTERFACE
  async function handleConfirm() {
    if (disabled) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error("You must be signed in to confirm a booking.");
      }

      // Validate UUIDs before building payload
      if (!isUuid(serviceType?.id)) {
        throw new Error("Selected service type is invalid. Please choose a valid service type.");
      }
      if (!isUuid(center?.id)) {
        throw new Error("Selected service center is invalid. Please choose a valid service center.");
      }
      if (!isUuid(dateTime?.slotMeta?.id)) {
        throw new Error("Selected time slot is invalid. Please choose a valid slot.");
      }
      const vehicleId = vehicle?.id && isUuid(vehicle.id) ? vehicle.id : null;

      const payload = {
        user_id: userId,
        vehicle_id: vehicleId,
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
          We’ve sent a confirmation to {details?.email}. We’ll contact you at {details?.phone} if needed.
        </div>
        <div className="subtitle" style={{ marginTop: 8 }}>
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
  if (!p.service_type_id || !isUuid(p.service_type_id)) throw new Error("Service type is missing or invalid.");
  if (!p.service_center_id || !isUuid(p.service_center_id)) throw new Error("Service center is missing or invalid.");
  if (!p.slot_id || !isUuid(p.slot_id)) throw new Error("Time slot is missing or invalid.");
  if (!p.contact_name || !p.contact_phone || !p.contact_email) {
    throw new Error("Contact details are incomplete.");
  }
}
function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
