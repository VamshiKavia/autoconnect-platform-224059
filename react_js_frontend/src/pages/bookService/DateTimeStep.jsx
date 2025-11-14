import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * DateTimeStep - Step 4: Pick Date and Time slot.
 *
 * Integrates with Supabase table "service_center_slots" to list available slots for the
 * selected service center (and optionally service type), filtered by selected date.
 *
 * Behavior:
 * - Reads context selections for center and service type.
 * - User chooses a date (>= today). We query active slots with status='available'
 *   where start_at falls on the selected day (UTC timestamp range computed from local date).
 * - Loading, error, and empty states are displayed using Ocean Professional styling.
 * - Local times are displayed using Intl.DateTimeFormat (user's locale/timezone).
 *   TODO(TZ): Make timezone explicit and consistent end-to-end.
 * - Past times are disabled.
 * - Persist chosen slot to context as:
 *     dateTime: {
 *       date: YYYY-MM-DD (string),
 *       slot: formatted human-readable time range (e.g. "10:00 AM - 10:30 AM"),
 *       slotMeta: { id, start_at, end_at } // raw ISO strings from Supabase
 *     }
 * - Validation: cannot proceed until a slot is selected and date is today or later.
 */
export default function DateTimeStep({ onValidChange }) {
  const { dateTime, setDateTime, center, serviceType } = useBooking();

  // Selected calendar date (YYYY-MM-DD) and selected slot id
  const [date, setDate] = useState(dateTime?.date || "");
  const [selectedSlotId, setSelectedSlotId] = useState(dateTime?.slotMeta?.id || "");
  const [touched, setTouched] = useState(false);

  // Query state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]); // normalized { id, start_at, end_at, capacity, booked_count }

  // Formatter for display in user's local time zone
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  // Compute day start/end based on selected date in local timezone
  const dayBounds = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map((s) => Number(s));
    if (!y || !m || !d) return null;
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { start, end };
  }, [date]);

  // Load slots from Supabase whenever date/center/serviceType change
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Reset state
      setErr("");
      setRows([]);
      setLoading(true);

      try {
        if (!date || !center?.id) {
          setLoading(false);
          return;
        }

        const supabase = getSupabaseClient();

        // We filter by:
        // - active = true
        // - status = 'available'
        // - service_center_id = selected center
        // - service_type_id = selected service type (only if exists and is non-null)
        // - start_at within selected day (inclusive)
        const { start, end } = dayBounds || {};
        if (!start || !end) {
          setLoading(false);
          return;
        }

        // Create ISO strings; Supabase timestamptz compares lexicographically in UTC
        // TODO(TZ): Explicit timezone handling. Current approach assumes DB stores in UTC.
        const startIso = start.toISOString();
        const endIso = end.toISOString();

        let query = supabase
          .from("service_center_slots")
          .select("id, service_center_id, service_type_id, start_at, end_at, capacity, booked_count, status, active")
          .eq("active", true)
          .eq("status", "available")
          .eq("service_center_id", center.id)
          .gte("start_at", startIso)
          .lte("start_at", endIso)
          .order("start_at", { ascending: true });

        // Filter by service_type_id only when we have a specific id
        if (serviceType?.id) {
          query = query.eq("service_type_id", serviceType.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const list = Array.isArray(data) ? data : [];
        // Normalize and filter out slots that are already in the past for today
        const now = new Date();

        const normalized = list
          .map((r) => ({
            id: r.id,
            start_at: r.start_at, // ISO
            end_at: r.end_at, // ISO
            capacity: Number(r.capacity ?? 0),
            booked_count: Number(r.booked_count ?? 0),
            status: r.status,
          }))
          .filter((r) => {
            // Disable selection of past times: exclude start_at < now (local compare vs parsed Date)
            const startDt = new Date(r.start_at);
            // If date is today, filter out past start times. For future days, allow all.
            if (isSameDate(now, dayBounds?.start)) {
              return startDt.getTime() >= now.getTime();
            }
            return true;
          });

        if (!cancelled) {
          setRows(normalized);
          // If currently selected slot ID is not present, clear selection
          if (selectedSlotId && !normalized.find((x) => String(x.id) === String(selectedSlotId))) {
            setSelectedSlotId("");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load available slots.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, center?.id, serviceType?.id]);

  // Persist to context and drive validity
  useEffect(() => {
    const selected = rows.find((r) => String(r.id) === String(selectedSlotId)) || null;

    // Prepare human-readable slot label
    const slotLabel = selected ? formatRange(selected.start_at, selected.end_at, timeFmt) : "";

    // Persist extended meta to context
    setDateTime({
      date: date || "",
      slot: slotLabel, // human-readable for Review step
      slotMeta: selected
        ? {
          id: selected.id,
          start_at: selected.start_at,
          end_at: selected.end_at,
        }
        : null,
    });

    onValidChange?.(isValid(date, selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedSlotId, rows]);

  const empty = useMemo(() => !loading && !err && date && rows.length === 0, [loading, err, rows, date]);

  function isValid(d, selected) {
    if (!d || !selected) return false;
    const nowStr = todayStr();
    return d >= nowStr;
  }

  function todayStr() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatRange(startIso, endIso, fmt) {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      return `${fmt.format(s)} - ${fmt.format(e)}`;
    } catch {
      return "";
    }
  }

  function isSameDate(a, b) {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  return (
    <div className="card" aria-labelledby="datetime-step-title">
      <h3 id="datetime-step-title" className="section-title">Pick Date & Time</h3>
      <p className="subtitle">
        Choose a suitable day and an available time slot.
      </p>

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
              setSelectedSlotId("");
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

      {/* Loading, error, empty states */}
      {date && loading && (
        <div className="card" style={{ background: "var(--bg)", marginTop: 12 }}>
          Loading available slots...
        </div>
      )}
      {date && err && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)", marginTop: 12 }}
        >
          {err}
        </div>
      )}
      {date && empty && (
        <div className="card" style={{ background: "var(--bg)", color: "var(--muted)", marginTop: 12 }}>
          No slots available for this date. Try another date.
        </div>
      )}

      {date && !loading && !err && rows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="label">Available time slots</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {rows.map((r) => {
              const s = new Date(r.start_at);
              const e = new Date(r.end_at);
              const label = `${timeFmt.format(s)} - ${timeFmt.format(e)}`;

              // Disable if in the past relative to now (extra safety)
              const isPast = s.getTime() < Date.now();
              const active = String(selectedSlotId) === String(r.id);

              return (
                <button
                  key={r.id}
                  className={"btn" + (isPast ? " secondary" : "")}
                  onClick={() => !isPast && setSelectedSlotId(r.id)}
                  aria-pressed={active}
                  disabled={isPast}
                  aria-disabled={isPast}
                  title={isPast ? "This time has passed" : undefined}
                  style={{
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "#fff" : "var(--primary)",
                    borderColor: "var(--primary)",
                    opacity: isPast ? 0.6 : 1,
                    cursor: isPast ? "not-allowed" : "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TODO(TZ): Explicit timezone handling.
          - Consider storing/displaying times with timezone awareness per center.
          - Possibly surface the timezone and convert consistently in both client and backend.
          TODO(CONFLICTS): Before booking creation, check capacity conflicts and double-booking.
      */}
    </div>
  );
}
