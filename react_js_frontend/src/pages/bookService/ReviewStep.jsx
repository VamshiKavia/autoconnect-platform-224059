import React, { useEffect, useRef, useState } from "react";
import { BOOKING_STEPS, useBooking } from "./context";
import { useAuth } from "../../context/AuthContext";
import getSupabaseClient from "../../lib/supabaseClient";
import SignInRequiredBanner from "./SignInRequiredBanner.jsx";

/**
// PUBLIC_INTERFACE
 * ReviewStep - Step 6: Summarize selections and confirm to create booking in Supabase.
 *
 * Insert (schema-aligned):
 *   supabase.from('bookings').insert([{
 *     user_id, vehicle_id, service_type_id, center_id, slot_id,
 *     scheduled_date, scheduled_time, status, notes, price
 *   }]).select().single()
 *
 * On success: show success state with booking id reference.
 * On error: show error banner including error.code and error.message, with RLS guidance.
 */
export default function ReviewStep({ canSubmit }) {
  const { user } = useAuth();
  const { vehicle, serviceType, center, dateTime, details } = useBooking();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(null);
  const [rlsWarning, setRlsWarning] = useState("");
  const noticeRef = useRef(null);

  useEffect(() => {
    if (user && err && err.toLowerCase().includes("sign in")) {
      setErr("");
    }
  }, [user, err]);

  async function onConfirm() {
    if (!user) {
      setErr("Please sign in to confirm your booking.");
      const el = document.getElementById("sign-in-required");
      if (el && typeof el.focus === "function") el.focus();
      return;
    }

    if (!canSubmit || submitting) return;
    setErr("");
    setRlsWarning("");
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      // Compose scheduled_date and scheduled_time from selected slot
      const scheduled_date = dateTime?.date || null;
      let scheduled_time = null;
      if (dateTime?.slot) {
        // slot label looks like "HH:MM-HH:MM", take the start as scheduled_time
        const start = String(dateTime.slot).split("-")[0] || "";
        scheduled_time = start.length === 5 ? `${start}:00` : start; // ensure HH:MM:SS
      }

      const payload = {
        user_id: user?.id || null,
        vehicle_id: vehicle?.id || null,
        service_type_id: serviceType?.id || null,
        center_id: center?.id || null,
        slot_id: dateTime?.slotId || null,
        scheduled_date,
        scheduled_time,
        status: "pending",
        notes: String(details?.notes || ""),
        // Price is optional; if not derivable set null
        price: typeof serviceType?.price === "number" ? serviceType.price : null,
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setSuccess(data || { id: "—" });
    } catch (e) {
      const code = e?.code || "";
      const message = e?.message || "";
      const raw = message.toLowerCase();

      if (raw.includes("permission") || raw.includes("rls") || raw.includes("not authorized") || raw.includes("policy")) {
        setRlsWarning("Inserting into bookings requires RLS insert policies for authenticated users.");
        setErr(`Permission denied while creating booking. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
      } else if (raw.includes("foreign key") || raw.includes("violates")) {
        setErr(`Invalid selection (foreign key). ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
      } else {
        setErr(`Failed to create booking. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
      }

      // eslint-disable-next-line no-console
      console.error("[ReviewStep] insert error", { code, message, stack: e?.stack, env: {
        hasUrl: !!process.env.REACT_APP_SUPABASE_URL,
        hasKey: !!process.env.REACT_APP_SUPABASE_KEY,
      }});
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

      {rlsWarning && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          RLS: {rlsWarning}
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
          <div className="subtitle">
            {[center?.address, center?.city, center?.state, center?.zipcode].filter(Boolean).join(", ") || "-"}
          </div>
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
