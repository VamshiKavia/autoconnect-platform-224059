import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase "service_types" (read-only).
 *
 * Reads fields: id, name, description, base_price, duration_minutes, active
 * Displays all services, merging Supabase results with a client-side fallback list
 * so the UI immediately shows all items from design even if DB seeding is incomplete.
 * Maintains selection/validation and provides loading/empty/error states.
 *
 * TODO(services): Remove fallback once Supabase service_types is fully seeded.
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

  // --- Client-side fallback list (from attached image) ---
  // Note: numeric values represent "from" price and baseline duration when a range is shown.
  // TODO(services): Remove this when DB has all items.
  const fallbackServices = useMemo(
    () => [
      {
        id: "fallback-oil-change",
        name: "Oil Change",
        description: "Keep your engine healthy with fresh oil and filter.",
        base_price: 59,
        duration_minutes: 30,
        active: true,
      },
      {
        id: "fallback-brake-inspection",
        name: "Brake Inspection",
        description: "Comprehensive brake system inspection for safety.",
        base_price: 79,
        duration_minutes: 45,
        active: true,
      },
      {
        id: "fallback-all-services",
        name: "All Services",
        description: "Full multi-point checkup. Ideal for periodic maintenance.",
        base_price: 129,
        duration_minutes: 90,
        active: true,
      },
      {
        id: "fallback-diagnostics",
        name: "Diagnostics",
        description: "Computerized scan and troubleshooting of warning lights.",
        base_price: 89,
        duration_minutes: 60,
        active: true,
      },
      {
        id: "fallback-ac-service",
        name: "AC Service",
        description: "AC performance check and top-up to stay cool.",
        base_price: 99,
        duration_minutes: 60,
        active: true,
      },
      {
        id: "fallback-car-washing",
        name: "Car Washing",
        description: "From $40–$60. Exterior wash and quick interior clean.",
        base_price: 40,
        duration_minutes: 45,
        active: true,
      },
      {
        id: "fallback-car-painting",
        name: "Car Painting",
        description: "From $300+. Panel and full-body paint options available.",
        base_price: 300,
        duration_minutes: 240,
        active: true,
      },
    ],
    []
  );

  // Fetch all services from Supabase (no filters to ensure full list)
  const fetchAllServerSide = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("id, name, description, base_price, duration_minutes, active")
      .order("name", { ascending: true });
    if (error) throw error;
    return { data: Array.isArray(data) ? data : [] };
  }, [supabase]);

  // Client-side cache backed fetch
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

  // Merge DB results with fallback, avoiding duplicates by name (case-insensitive)
  function mergeWithFallback(dbRows) {
    const norm = (s) => (s || "").toString().trim().toLowerCase();
    const seenByName = new Set(dbRows.map((r) => norm(r.name)));
    const extras = fallbackServices.filter((f) => !seenByName.has(norm(f.name)));
    // Ensure prominent items appear first in a sensible order
    const combined = [...dbRows, ...extras];
    // Stable sort by name for predictability; design shows grouped cards but alphabetical is fine
    combined.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
    return combined;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const { data } = await fetchAllServerSide();
        if (cancelled) return;
        setRows(mergeWithFallback(data));
      } catch (e) {
        try {
          const { data } = await fetchAllClientSide();
          if (cancelled) return;
          setRows(mergeWithFallback(data));
        } catch (e2) {
          if (!cancelled) {
            setErr(e2?.message || e?.message || "Failed to load service types.");
            // Even if both DB attempts failed, we still show fallback so the step isn't empty.
            setRows(mergeWithFallback([]));
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
    </section>
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
