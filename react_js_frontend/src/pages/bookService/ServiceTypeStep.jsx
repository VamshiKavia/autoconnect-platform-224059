import React, { useEffect, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Query:
 *   supabase.from('service_types')
 *     .select('id, name, description, base_price, duration_minutes')
 *     .order('name')
 *
 * Validates: One service type must be selected.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();
  const [selected, setSelected] = useState(serviceType?.id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("service_types")
          .select("id, name, description, base_price, duration_minutes")
          .order("name");
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("permission") || msg.includes("rls") || msg.includes("not authorized")) {
          setErr("You do not have access to view service types.");
        } else {
          setErr("Failed to load service types.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const found = rows.find((s) => String(s.id) === String(selected)) || null;
    // map to booking context shape
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "Service",
          description: found.description || "",
          price: Number(found.base_price || 0),
          duration_min: Number(found.duration_minutes || 0),
        }
      : null;
    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">
        Pick a service to continue. Prices and durations are loaded from the database.
      </p>

      {loading && <div className="card">Loading service types...</div>}
      {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div className="card" style={{ color: "var(--muted)" }}>No service types available.</div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid">
          {rows.map((svc) => {
            const active = String(selected) === String(svc.id);
            const price = svc.base_price != null ? Number(svc.base_price) : null;
            const duration = svc.duration_minutes != null ? Number(svc.duration_minutes) : null;
            return (
              <button
                key={svc.id}
                className="card"
                style={{
                  gridColumn: "span 4",
                  textAlign: "left",
                  borderColor: active ? "#93C5FD" : "#E5E7EB",
                  background: active ? "#F3F4F6" : "var(--surface)",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(svc.id)}
                aria-pressed={active}
                aria-label={`Select ${svc.name || "Service"}`}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{svc.name || "Service"}</strong>
                  <span className="subtitle">
                    {price != null ? `$${price}` : "—"}
                  </span>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  {duration != null ? `Approx. ${duration} min` : "Duration: —"}
                </div>
                {svc.description ? (
                  <div className="subtitle" style={{ marginTop: 6 }}>
                    {svc.description}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
