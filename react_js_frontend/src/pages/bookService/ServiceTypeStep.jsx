import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase "service_types" (read-only).
 *
 * Reads fields: id, name, description, base_price, duration_minutes, active
 * Filters to active = true.
 * Validates: One service type must be selected.
 *
 * TODO(ADMIN-WRITES): Add admin-only create/update/deactivate flows for service_types.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();
  const [selected, setSelected] = useState(serviceType?.id || "");

  // Supabase fetching state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // Load active service types from Supabase
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("service_types")
          .select("id, name, description, base_price, duration_minutes, active")
          .eq("active", true)
          .order("name", { ascending: true });
        if (error) throw error;

        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setRows(list);
          // If there is already a selected id but not in new list, clear it
          if (selected && !list.find((x) => String(x.id) === String(selected))) {
            setSelected("");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load service types.");
          setRows([]);
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
  }, []);

  // Map selected id to full object and update booking context + validity
  useEffect(() => {
    const found =
      rows.find((s) => String(s.id) === String(selected)) || null;

    // Normalize mapped fields to what the rest of the app expects
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "",
          description: found.description || "",
          // Keep compatibility with Review step fields
          price: safeNumber(found.base_price),
          duration_min: safeNumber(found.duration_minutes),
          active: !!found.active,
          // Extra: raw fields preserved (could be used later)
          base_price: found.base_price,
          duration_minutes: found.duration_minutes,
        }
      : null;

    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">
        Pick a service to continue. Pricing and durations are loaded from Supabase and will be finalized at the center.
      </p>

      {loading && <div className="card" style={{ background: "var(--bg)" }}>Loading service types...</div>}

      {err && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--bg)", color: "var(--muted)" }}>
          No active service types available.
          {/* TODO(ADMIN-WRITES): Provide admin-only button to create a service type */}
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid">
          {rows.map((svc) => {
            const active = String(selected) === String(svc.id);
            const price = safeNumber(svc.base_price);
            const duration = safeNumber(svc.duration_minutes);

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
                aria-label={`Select ${svc.name}`}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{svc.name || "Untitled service"}</strong>
                  <span className="subtitle">${Number(price).toLocaleString()}</span>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  Approx. {duration} min
                </div>
                {svc.description ? (
                  <div className="subtitle" style={{ marginTop: 4 }}>
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

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
