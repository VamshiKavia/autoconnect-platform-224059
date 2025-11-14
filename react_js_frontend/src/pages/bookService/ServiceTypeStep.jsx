import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase "service_types" (read-only).
 *
 * Reads fields: id, name, description, base_price, duration_minutes, active
 * Default filter: active = true (toggle-able)
 * Implements: text search (name/description), pagination (5/10/20), next/prev, page indicators.
 * Tries server-side filtering + pagination; falls back to client-side if server fails.
 * Maintains selection/validation across page changes. Provides loading/empty/error states.
 *
 * TODO(ADMIN-WRITES): Add admin-only create/update/deactivate flows for service_types.
 * TODO(FILTERS): Add advanced filters (price range, duration range).
 * TODO(SORTING): Add sorting options (price, duration, name).
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();

  // Selection state
  const [selected, setSelected] = useState(serviceType?.id || "");

  // Query/filter state
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  // Pagination state
  const PAGE_SIZES = [5, 10, 20];
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1); // 1-based
  const [totalCount, setTotalCount] = useState(0);

  // Data and status
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Cache of all rows for client-side fallback (optional, lazily loaded)
  const allRowsCacheRef = useRef(null);

  const supabase = getSupabaseClient();

  // Reset to first page if filters change
  useEffect(() => {
    setPage(1);
  }, [search, activeOnly, pageSize]);

  /**
   * Build Supabase query with optional filters and pagination.
   * Uses ilike on name or description for case-insensitive contains.
   * Applies active=true when toggle is on.
   */
  const fetchServerSide = useCallback(async () => {
    const from = supabase.from("service_types");
    // select with count option to get total rows for pagination
    let query = from
      .select("id, name, description, base_price, duration_minutes, active", { count: "exact" })
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("active", true);
    }
    const term = (search || "").trim();
    if (term) {
      // Use or with ilike on name/description
      const like = `%${term}%`;
      // Supabase JS: .or("name.ilike.%term%,description.ilike.%term%")
      query = query.or(`name.ilike.${like},description.ilike.${like}`);
    }

    // Range for pagination. page is 1-based.
    const offset = (page - 1) * pageSize;
    const to = offset + pageSize - 1;
    query = query.range(offset, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: Array.isArray(data) ? data : [], count: typeof count === "number" ? count : 0 };
  }, [supabase, activeOnly, search, page, pageSize]);

  /**
   * Client-side fallback: if server-side fails, load all (once) and filter/paginate locally.
   */
  const fetchClientSide = useCallback(async () => {
    // Fetch all only once and cache
    if (!allRowsCacheRef.current) {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, base_price, duration_minutes, active")
        .order("name", { ascending: true });
      if (error) throw error;
      allRowsCacheRef.current = Array.isArray(data) ? data : [];
    }

    // Apply filters locally
    const term = (search || "").trim().toLowerCase();
    let filtered = allRowsCacheRef.current;
    if (activeOnly) {
      filtered = filtered.filter((r) => !!r.active);
    }
    if (term) {
      filtered = filtered.filter((r) => {
        const name = (r.name || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        return name.includes(term) || desc.includes(term);
      });
    }

    // Set total count and current page slice
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end);

    return { data: slice, count: total };
  }, [supabase, activeOnly, search, page, pageSize]);

  // Load data whenever filters/pagination change
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // Attempt server-side first
        const { data, count } = await fetchServerSide();
        if (cancelled) return;

        setRows(data);
        setTotalCount(count || data.length || 0);

        // If selection is not in the current page, keep it but do not clear; selection persistence across pages
        if (selected && !data.find((x) => String(x.id) === String(selected))) {
          // no action: selection persists
        }
      } catch (e) {
        // Fallback to client-side filtering
        try {
          const { data, count } = await fetchClientSide();
          if (cancelled) return;

          setRows(data);
          setTotalCount(count || data.length || 0);
        } catch (e2) {
          if (!cancelled) {
            setErr(e2?.message || e?.message || "Failed to load service types.");
            setRows([]);
            setTotalCount(0);
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
  }, [fetchServerSide, fetchClientSide, selected]);

  // Map selected id to full object and update booking context + validity
  useEffect(() => {
    // Search in current rows; if not found, we still keep prior context until user changes page or selection reappears
    const found = rows.find((s) => String(s.id) === String(selected)) || null;

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
      : // If the selected item is not in the current page, try to keep previous selection if it matches serviceType
        (serviceType && String(serviceType.id) === String(selected) ? serviceType : null);

    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.max(1, Math.ceil((totalCount || 0) / pageSize)) : 1;
  }, [totalCount, pageSize]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  // Pagination controls handlers
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function prevPage() {
    if (canPrev) setPage((p) => Math.max(1, p - 1));
  }
  function nextPage() {
    if (canNext) setPage((p) => Math.min(totalPages, p + 1));
  }
  function onPageSizeChange(e) {
    const v = Number(e.target.value);
    if (PAGE_SIZES.includes(v)) {
      setPageSize(v);
      setPage(1);
    }
  }

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">
        Pick a service to continue. Pricing and durations are loaded from Supabase and will be finalized at the center.
      </p>

      {/* Filter controls */}
      <div className="card" style={{ background: "var(--bg)", marginBottom: 12 }}>
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
            <label htmlFor="svc-active-only" className="label" style={{ margin: 0 }}>
              Active only
            </label>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <label className="label" htmlFor="svc-page-size">Page size</label>
            <select
              id="svc-page-size"
              className="input"
              value={pageSize}
              onChange={onPageSizeChange}
              aria-label="Page size"
              style={{ width: 100 }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="card" style={{ background: "var(--bg)" }}>Loading service types...</div>}

      {err && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--bg)", color: "var(--muted)" }}>
          No service types match the current filters.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <>
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
                    borderColor: isActive ? "#93C5FD" : "#E5E7EB",
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

          {/* Pagination controls */}
          <nav
            className="row"
            aria-label="Pagination"
            style={{ justifyContent: "space-between", marginTop: 12 }}
          >
            <div className="subtitle" aria-live="polite">
              Page {page} of {totalPages} • {totalCount} result{totalCount === 1 ? "" : "s"}
            </div>
            <div className="row" role="group" aria-label="Pager">
              <button
                className="btn secondary"
                onClick={prevPage}
                disabled={!canPrev}
                aria-disabled={!canPrev}
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                className="btn"
                onClick={nextPage}
                disabled={!canNext}
                aria-disabled={!canNext}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
