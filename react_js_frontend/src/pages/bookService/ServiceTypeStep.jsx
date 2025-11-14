import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase "service_types" (read-only).
 *
 * Reads fields: id, name, description, base_price, duration_minutes, active
 * Now fetches and displays all services without search or active-only filters/pagination.
 * Maintains selection/validation and provides loading/empty/error states.
 *
 * TODO: Extract CardList component.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();

  // Selection state
  const [selected, setSelected] = useState(serviceType?.id || "");

  // Data and status
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Cache for fallback full fetch
  const allRowsCacheRef = useRef(null);

  const supabase = getSupabaseClient();

  // Fetch all services from server (no filters)
  const fetchAllServerSide = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("id, name, description, base_price, duration_minutes, active")
      .order("name", { ascending: true });
    if (error) throw error;
    return { data: Array.isArray(data) ? data : [] };
  }, [supabase]);

  // Client-side fallback fetch (no filters)
  const fetchAllClientSide = useCallback(async () => {
    if (!allRowsCacheRef.current) {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, base_price, duration_minutes, active")
        .order("name", { ascending: true });
      if (error) throw error;
      allRowsCacheRef.current = Array.isArray(data) ? data : [];
    }
    return { data: allRowsCacheRef.current };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const { data } = await fetchAllServerSide();
        if (cancelled) return;
        setRows(data);
      } catch (e) {
        try {
          const { data } = await fetchAllClientSide();
          if (cancelled) return;
          setRows(data);
        } catch (e2) {
          if (!cancelled) {
            setErr(e2?.message || e?.message || "Failed to load service types.");
            setRows([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchAllServerSide, fetchAllClientSide]);

  // Map selection to context
  useEffect(() => {
    const found = rows.find((s) => String(s.id) === String(selected)) || null;
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "",
          description: found.description || "",
          price: safeNumber(found.base_price),
          duration_min: safeNumber(found.duration_minutes),
          active: !!found.active,
          base_price: found.base_price,
          duration_minutes: found.duration_minutes,
        }
      : serviceType && String(serviceType.id) === String(selected)
      ? serviceType
      : null;

    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <section className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">
        Select Service Type
      </h3>
      <p className="subtitle">Select a service to continue.</p>

      {loading && (
        <div className="card" style={{ background: "var(--background)" }}>
          Loading service types...
        </div>
      )}

      {err && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}
        >
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--background)", color: "var(--muted)" }}>
          No service types available at the moment.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid" role="list" aria-label="Service types">
          {rows.map((svc) => {
            const isActive = String(selected) === String(svc.id);
            const price = safeNumber(svc.base_price);
            const duration = safeNumber(svc.duration_minutes);
            return (
              <button
                key={svc.id}
                role="listitem"
                className="card"
                style={{
                  gridColumn: "span 4",
                  textAlign: "left",
                  borderColor: isActive ? "#93C5FD" : "var(--border)",
                  background: isActive ? "#F3F4F6" : "var(--surface)",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(svc.id)}
                aria-pressed={isActive}
                aria-label={`Select ${svc.name || "service type"}`}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{svc.name || "Untitled service"}</strong>
                  <span className="subtitle">${Number(price).toLocaleString()}</span>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>Approx. {duration} min</div>
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
    </section>
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
