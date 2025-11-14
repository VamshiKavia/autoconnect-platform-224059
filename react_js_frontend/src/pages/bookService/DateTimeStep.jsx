import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * DateTimeStep - Step 4: Pick Date and Time slot with Ocean styling.
 * Uses Supabase service_center_slots reading logic. No route/logic changes.
 */
export default function DateTimeStep({ onValidChange }) {
  const { dateTime, setDateTime, center, serviceType } = useBooking();

  const [date, setDate] = useState(dateTime?.date || "");
  const [selectedSlotId, setSelectedSlotId] = useState(dateTime?.slotMeta?.id || "");
  const [touched, setTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const dayBounds = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map((s) => Number(s));
    if (!y || !m || !d) return null;
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { start, end };
  }, [date]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      setRows([]);
      setLoading(true);

      try {
        if (!date || !center?.id) {
          setLoading(false);
          return;
        }

        // Guard: require UUIDs for center and optional serviceType before querying
        if (!isUuid(center.id)) {
          setErr("Please choose a real service center to see available slots.");
          setLoading(false);
          return;
        }
        if (serviceType?.id && !isUuid(serviceType.id)) {
          setErr("Please choose a real service type to see available slots.");
          setLoading(false);
          return;
        }

        const supabase = getSupabaseClient();

        const { start, end } = dayBounds || {};
        if (!start || !end) { setLoading(false); return; }

        const startIso = start.toISOString();
        const endIso = end.toISOString();

        let query = supabase
          .from("service_center_slots")
          .select("id, service_center_id, service_type_id, start_at, end_at, capacity, booked_count, status")
          .eq("status", "available")
          .eq("service_center_id", center.id)
          .gte("start_at", startIso)
          .lte("start_at", endIso)
          .order("start_at", { ascending: true });

        if (serviceType?.id) {
          query = query.eq("service_type_id", serviceType.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const list = Array.isArray(data) ? data : [];
        const now = new Date();

        const normalized = list
          .map((r) => ({
            id: r.id,
            start_at: r.start_at,
            end_at: r.end_at,
            capacity: Number(r.capacity ?? 0),
            booked_count: Number(r.booked_count ?? 0),
            status: r.status,
          }))
          .filter((r) => {
            const startDt = new Date(r.start_at);
            if (isSameDate(now, dayBounds?.start)) {
              return startDt.getTime() >= now.getTime();
            }
            return true;
          });

        if (!cancelled) {
          setRows(normalized);
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, center?.id, serviceType?.id]);

  useEffect(() => {
    const selected = rows.find((r) => String(r.id) === String(selectedSlotId)) || null;
    const slotLabel = selected ? formatRange(selected.start_at, selected.end_at, timeFmt) : "";

    setDateTime({
      date: date || "",
      slot: slotLabel,
      slotMeta: selected ? { id: selected.id, start_at: selected.start_at, end_at: selected.end_at } : null,
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
  function isUuid(v) {
    return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return (
    <section className="card" aria-labelledby="datetime-step-title">
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
            onChange={(e) => { setDate(e.target.value); setSelectedSlotId(""); }}
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

      {date && loading && (
        <div className="card" style={{ background: "var(--background)", marginTop: 12 }}>
          Loading available slots...
        </div>
      )}
      {date && err && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)", marginTop: 12 }}
          role="alert"
        >
          {err}
        </div>
      )}
      {date && (!center?.id || (center?.id && !isUuid(center.id))) && (
        <div
          className="card"
          style={{ background: "#FEFCE8", borderColor: "#FDE68A", color: "#92400E", marginTop: 12 }}
          role="status"
        >
          Please choose a real service center (not a placeholder) to continue.
        </div>
      )}
      {date && serviceType?.id && !isUuid(serviceType.id) && (
        <div
          className="card"
          style={{ background: "#FEFCE8", borderColor: "#FDE68A", color: "#92400E", marginTop: 12 }}
          role="status"
        >
          Please choose a real service type to filter available slots.
        </div>
      )}
      {date && empty && (
        <div className="card" style={{ background: "var(--background)", color: "var(--muted)", marginTop: 12 }}>
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
    </section>
  );
}
