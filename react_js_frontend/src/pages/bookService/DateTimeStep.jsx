import React, { useEffect, useMemo, useState } from "react";
import { MockData, useBooking } from "./context";

/**
// PUBLIC_INTERFACE
 * DateTimeStep - Step 4: Pick Date and Time slot.
 *
 * Validates: A valid date (>= today) and a slot from available slots for that date.
 */
export default function DateTimeStep({ onValidChange }) {
  const { dateTime, setDateTime } = useBooking();
  const [date, setDate] = useState(dateTime?.date || "");
  const [slot, setSlot] = useState(dateTime?.slot || "");
  const [touched, setTouched] = useState(false);

  const slots = useMemo(() => (date ? MockData.getSlotsForDate(date) : []), [date]);

  useEffect(() => {
    setDateTime({ date, slot });
    onValidChange?.(isValid(date, slot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slot]);

  function isValid(d, s) {
    if (!d || !s) return false;
    const now = todayStr();
    return d >= now && slots.includes(s);
  }

  function todayStr() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return (
    <div className="card" aria-labelledby="datetime-step-title">
      <h3 id="datetime-step-title" className="section-title">Pick Date & Time</h3>
      <p className="subtitle">Choose a suitable day and an available time slot.</p>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div style={{ width: 220, minWidth: 200 }}>
          <label className="label" htmlFor="booking-date">Date</label>
          <input
            id="booking-date"
            className="input"
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot("");
            }}
            onBlur={() => setTouched(true)}
            required
          />
          {touched && (!date || date < todayStr()) && (
            <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>
              Select a valid date (today or later).
            </div>
          )}
        </div>
      </div>

      {date ? (
        <div style={{ marginTop: 12 }}>
          <div className="label">Available time slots</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {slots.length ? (
              slots.map((s) => {
                const active = slot === s;
                return (
                  <button
                    key={s}
                    className="btn"
                    onClick={() => setSlot(s)}
                    aria-pressed={active}
                    style={{
                      background: active ? "var(--primary)" : "transparent",
                      color: active ? "#fff" : "var(--primary)",
                      borderColor: "var(--primary)",
                    }}
                  >
                    {s}
                  </button>
                );
              })
            ) : (
              <div className="card" style={{ background: "var(--bg)" }}>
                No slots available for this date. Try another date.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
