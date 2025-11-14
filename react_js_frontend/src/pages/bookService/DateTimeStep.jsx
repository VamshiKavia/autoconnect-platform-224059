import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * DateTimeStep - Step 4: Pick Date and Time slot from Supabase.
 *
 * Schema-aligned query:
 *   supabase
 *     .from('center_slots')
 *     .select('id,center_id,date,start_time,end_time,capacity,available')
 *     .eq('center_id', booking.center.id)
 *     .eq('date', selectedDate)
 *
 * Validates: A valid date (>= today) and selecting an available slot.
 * Persists: slot id and composed ISO datetime into booking context.
 */
export default function DateTimeStep({ onValidChange }) {
  const { dateTime, setDateTime, center } = useBooking();
  const [date, setDate] = useState(dateTime?.date || "");
  const [slot, setSlot] = useState(dateTime?.slot || "");
  const [slotId, setSlotId] = useState(dateTime?.slotId || null);
  const [touched, setTouched] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rlsWarning, setRlsWarning] = useState("");

  const centerId = center?.id;

  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!centerId || !date) {
        setRows([]);
        return;
      }
      setLoading(true);
      setErr("");
      setRlsWarning("");
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("center_slots")
          .select("id,center_id,date,start_time,end_time,capacity,available")
          .eq("center_id", centerId)
          .eq("date", date);
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const code = e?.code || "";
        const message = e?.message || "";
        const raw = message.toLowerCase();
        if (raw.includes("permission") || raw.includes("rls") || raw.includes("not authorized")) {
          setErr(`You do not have access to view available slots. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
          setRlsWarning("Reading center_slots requires RLS read policies. Enable read access for anon/authenticated as appropriate.");
        } else {
          setErr(`Failed to load available slots. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [centerId, date]);

  const slots = useMemo(() => {
    return rows
      .filter((r) => r?.available) // schema uses 'available'
      .map((r) => ({
        id: r.id,
        label: composeLabel(r.start_time, r.end_time),
        start: r.start_time,
        end: r.end_time,
      }));
  }, [rows]);

  useEffect(() => {
    const datetimeISO = composeISO(date, slots.find((s) => s.id === slotId)?.start || null);
    setDateTime({ date, slot, slotId, datetimeISO });
    onValidChange?.(isValid(date, slot, todayStr, slots, slotId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slot, slotId, slots, todayStr]);

  function isValid(d, s, min, available, sId) {
    if (!d || !s) return false;
    if (d < min) return false;
    const labels = available.map((x) => x.label);
    return labels.includes(s) && !!sId;
  }

  function composeLabel(start, end) {
    const s = (start || "").slice(0, 5);
    const e = (end || "").slice(0, 5);
    return s && e ? `${s}-${e}` : s || e || "";
  }

  function composeISO(d, start) {
    if (!d || !start) return null;
    const [hh, mm] = start.split(":");
    const iso = new Date(`${d}T${hh?.padStart(2, "0") || "00"}:${mm?.padStart(2, "0") || "00"}:00`);
    if (isNaN(iso.getTime())) return null;
    return iso.toISOString();
  }

  return (
    <div className="card" aria-labelledby="datetime-step-title">
      <h3 id="datetime-step-title" className="section-title">Pick Date & Time</h3>
      <p className="subtitle">Choose a suitable day and an available time slot.</p>

      {!centerId && (
        <div className="card" style={{ color: "var(--error)" }}>
          Please select a service center first.
        </div>
      )}

      {rlsWarning && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          RLS: {rlsWarning}
        </div>
      )}

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div style={{ width: 220, minWidth: 200 }}>
          <label className="label" htmlFor="booking-date">Date</label>
          <input
            id="booking-date"
            className="input"
            type="date"
            value={date}
            min={todayStr}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot("");
              setSlotId(null);
            }}
            onBlur={() => setTouched(true)}
            required
          />
          {touched && (!date || date < todayStr) && (
            <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>
              Select a valid date (today or later).
            </div>
          )}
        </div>
      </div>

      {date ? (
        <div style={{ marginTop: 12 }}>
          <div className="label">Available time slots</div>
          {loading && <div className="card">Loading slots...</div>}
          {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
          {!loading && !err && (
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {slots.length ? (
                slots.map((s) => {
                  const active = slotId === s.id;
                  return (
                    <button
                      key={s.id}
                      className="btn"
                      onClick={() => {
                        setSlot(s.label);
                        setSlotId(s.id);
                      }}
                      aria-pressed={active}
                      style={{
                        background: active ? "var(--primary)" : "transparent",
                        color: active ? "#fff" : "var(--primary)",
                        borderColor: "var(--primary)",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })
              ) : (
                <div className="card" style={{ background: "var(--bg)" }}>
                  No slots available for this date. Try another date.
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
