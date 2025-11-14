import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";
import { MOCK_SERVICE_TYPES } from "./mocks";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type.
 * TODO: When REACT_APP_ENABLE_SUPABASE=true, Supabase code path is active.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType, flags } = useBooking();

  const [selected, setSelected] = useState(serviceType?.id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(flags?.supabaseEnabled));
  const [err, setErr] = useState("");

  const allRowsCacheRef = useRef(null);
  const supabase = getSupabaseClient();

  const fetchAllServerSide = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("id, name, description, base_price, duration_minutes, active")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return { data: Array.isArray(data) ? data : [] };
  }, [supabase]);

  const fetchAllClientSide = useCallback(async () => {
    if (!allRowsCacheRef.current) {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, base_price, duration_minutes, active")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      allRowsCacheRef.current = Array.isArray(data) ? data : [];
    }
    return { data: allRowsCacheRef.current };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      // Mock path
      if (!flags?.supabaseEnabled) {
        setRows(MOCK_SERVICE_TYPES);
        setLoading(false);
        return;
      }

      setLoading(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllServerSide, fetchAllClientSide, flags?.supabaseEnabled]);

  useEffect(() => {
    const found = rows.find((s) => String(s.id) === String(selected)) || null;
    if (found) {
      const mapped = {
        id: found.id,
        name: found.name || "",
        description: found.description || "",
        price: Number(found.base_price ?? found.price ?? 0),
        duration_min: Number(found.duration_minutes ?? found.duration_minutes ?? found.duration_min ?? 0),
        active: found.active != null ? !!found.active : true,
        base_price: found.base_price,
        duration_minutes: found.duration_minutes,
      };
      setServiceType(mapped);
      onValidChange?.(true);
      return;
    }
    setServiceType(null);
    onValidChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <section className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">
        Select Service Type
      </h3>
      <p className="subtitle">
        Select a service to continue. Pricing and durations shown are estimates.
      </p>

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
            const key = svc.id;
            const isActive = String(selected) === String(svc.id || "");
            const price = Number(svc.base_price ?? svc.price ?? 0);
            const duration = Number(svc.duration_minutes ?? svc.duration_min ?? 0);
            return (
              <button
                key={key}
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
                  <span className="subtitle">
                    ${Number(price).toLocaleString()}
                  </span>
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

      {!flags?.supabaseEnabled && (
        <p className="subtitle" style={{ marginTop: 8 }}>
          TODO: Supabase disabled. Showing mock services. Set REACT_APP_ENABLE_SUPABASE=true to re-enable.
        </p>
      )}
    </section>
  );
}
