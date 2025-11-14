import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase "service_types" (read-only).
 *
 * Reads fields: id, name, description, base_price, duration_minutes, active
 * Default filter: active = true
 * Server-side search (name/description) with fallback client filtering.
 * Maintains selection/validation and provides loading/empty/error states.
 *
 * TODO: Extract CardList component.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();

  // Selection state
  const [selected, setSelected] = useState(serviceType?.id || "");

  // Query/filter state
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  // Data and status
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Cache for fallback full fetch
  const allRowsCacheRef = useRef(null);

  const supabase = getSupabaseClient();

  const fetchAllServerSide = useCallback(async () => {
    const from = supabase.from("service_types");
    let query = from
      .select("id, name, description, base_price, duration_minutes, active", { count: "exact" })
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("active", true);
    }
    const term = (search || "").trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},description.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: Array.isArray(data) ? data : [], count: typeof count === "number" ? count : 0 };
  }, [supabase, activeOnly, search]);

  const fetchAllClientSide = useCallback(async () => {
    if (!allRowsCacheRef.current) {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, base_price, duration_minutes, active")
        .order("name", { ascending: true });
      if (error) throw error;
      allRowsCacheRef.current = Array.isArray(data) ? data : [];
    }

    const term = (search || "").toLowerCase();
    let filtered = allRowsCacheRef.current;
    if (activeOnly) filtered = filtered.filter((r) => !!r.active);
    if (term) {
      filtered = filtered.filter((r) => {
        const name = (r.name || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        return name.includes(term) || desc.includes(term);
      });
    }

    return { data: filtered, count: filtered.length };
  }, [supabase, activeOnly, search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const { data } = await fetchAllServerSide();
        if (cancelled) return;
        setRows(data);
        if (selected && !data.find((x) => String(x.id) === String(selected))) {
          // keep previous selection from context if any
        }
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllServerSide, fetchAllClientSide, selected]);

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
      : (serviceType && String(serviceType.id) === String(selected) ? serviceType : null);

    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <section className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">Select a service to continue.</p>

      {/* Filters */}
      <div className="card" style={{ background: "var(--background)", marginBottom: 12 }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <label className="label" htmlFor="svc-search">Search</label>
            <input
              id="svc-search"
              className="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description"
              aria-label="Search service types by name or description"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id="svc-active-only"
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              aria-label="Active only"
            />
            <label htmlFor="svc-active-only" className="label" style={{ margin: 0 }}>Active only</label>
          </div>
        </div>
      </div>

      {loading && <div className="card" style={{ background: "var(--background)" }}>Loading service types...</div>}

      {err && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--background)", color: "var(--muted)" }}>
          No service types match the current filters.
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
