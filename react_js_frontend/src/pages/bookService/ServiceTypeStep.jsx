import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Query (diagnostic-friendly, no filters):
 *   supabase
 *     .from('services_catalog')
 *     .select('id,name,description,image_url')
 *     .order('name', { ascending: true })
 *
 * Diagnostics:
 * - Adds a temporary count() query to log total rows visible to current role.
 * - Logs env presence (no secrets), and count vs. fetched length.
 *
 * UX:
 * - Improves empty-state with a Retry CTA.
 * - If table truly has zero rows (count=0), shows guidance that no services are configured.
 * - If RLS limits rows or permission errors occur, surfaces error.code/message and RLS guidance.
 *
 * Validates: One service type must be selected.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();
  const [selected, setSelected] = useState(serviceType?.id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rlsWarning, setRlsWarning] = useState("");
  const [visibleCount, setVisibleCount] = useState(null); // number | null

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    setRlsWarning("");
    try {
      const hasUrl = !!process.env.REACT_APP_SUPABASE_URL;
      const hasKey = !!process.env.REACT_APP_SUPABASE_KEY;
      // eslint-disable-next-line no-console
      console.debug("[ServiceTypeStep] Env check", {
        hasUrl,
        hasKey,
        NODE_ENV: process.env.NODE_ENV,
      });

      const supabase = getSupabaseClient();

      // 1) Diagnostic count() - unfiltered, simple columns
      const { count, error: countError } = await supabase
        .from("services_catalog")
        .select("id", { count: "exact", head: true });
      if (countError) {
        // Non-fatal for listing, but report
        // eslint-disable-next-line no-console
        console.warn("[ServiceTypeStep] count() error", {
          code: countError.code,
          message: countError.message,
        });
      } else {
        setVisibleCount(typeof count === "number" ? count : null);
      }

      // 2) Fetch rows - explicit select without filters
      const { data, error } = await supabase
        .from("services_catalog")
        .select("id,name,description,image_url")
        .order("name", { ascending: true });

      if (error) throw error;

      const safe = Array.isArray(data) ? data : [];
      setRows(safe);

      // eslint-disable-next-line no-console
      console.debug("[ServiceTypeStep] fetched rows", {
        fetchedLength: safe.length,
        visibleCount: typeof count === "number" ? count : null,
      });
    } catch (e) {
      const code = e?.code || "";
      const message = e?.message || "";
      const raw = String(message || "").toLowerCase();

      let friendly = "Failed to load service types from services_catalog.";
      if (
        raw.includes("permission") ||
        raw.includes("rls") ||
        raw.includes("not authorized") ||
        raw.includes("policy")
      ) {
        friendly = "You do not have access to view service types (services_catalog).";
        setRlsWarning(
          "Reading services_catalog requires RLS read policies. Enable read access for anon/authenticated as appropriate."
        );
      } else if (raw.includes("relation") && raw.includes("does not exist")) {
        friendly = "Table not found. Verify the name public.services_catalog in your Supabase project.";
      } else if (raw.includes("fetch") || raw.includes("network") || raw.includes("url")) {
        friendly = "Unable to reach Supabase. Check REACT_APP_SUPABASE_URL and connectivity.";
      }

      setErr(`${friendly} ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
      // eslint-disable-next-line no-console
      console.error("[ServiceTypeStep] load error", {
        code,
        message,
        stack: e?.stack,
        table: "services_catalog",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Normalize rows for UI/booking context
  const normalized = useMemo(() => {
    return (rows || []).map((r) => ({
      id: r?.id,
      name: r?.name ?? "",
      description: r?.description ?? "",
      image_url: r?.image_url ?? "",
    }));
  }, [rows]);

  useEffect(() => {
    const found = normalized.find((s) => String(s.id) === String(selected)) || null;
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "Service",
          description: found.description || "",
          image_url: found.image_url || "",
        }
      : null;
    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, normalized]);

  const empty = !loading && !err && normalized.length === 0;

  function EmptyState() {
    // If count is zero, inform that no services are configured at all.
    const noConfigured = typeof visibleCount === "number" && visibleCount === 0;
    return (
      <div className="card" style={{ color: "var(--muted)" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {noConfigured ? (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  No services configured
                </div>
                <div className="subtitle" style={{ marginBottom: 0 }}>
                  The services_catalog table is currently empty. Please add service types in your Supabase project.
                </div>
              </>
            ) : (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  No service types found
                </div>
                <div className="subtitle" style={{ marginBottom: 0 }}>
                  Try again in a moment. If this persists, verify RLS and that services_catalog has rows.
                </div>
              </>
            )}
          </div>
          <div>
            <button className="btn secondary" onClick={load} aria-label="Retry loading service types">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">Choose a service to continue.</p>

      {rlsWarning && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}
        >
          RLS: {rlsWarning}
        </div>
      )}

      {loading && <div className="card">Loading service types...</div>}
      {err && (
        <div className="card" style={{ color: "var(--error)" }}>
          {err}
          <div style={{ marginTop: 8 }}>
            <button className="btn secondary" onClick={load} aria-label="Retry loading after error">
              Retry
            </button>
          </div>
        </div>
      )}
      {empty && <EmptyState />}

      {!loading && !err && normalized.length > 0 && (
        <div className="grid">
          {normalized.map((svc) => {
            const active = String(selected) === String(svc.id);
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
                </div>
                {svc.description ? (
                  <div className="subtitle" style={{ marginTop: 6 }}>{svc.description}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
