import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Query (schema-aligned):
 *   supabase.from('service_types')
 *     .select('id, name, description, price, duration_min')
 *     .order('name', { ascending: true })
 *
 * Notes:
 * - Some projects use base_price/duration_minutes instead. We try the primary
 *   schema first, then gracefully fall back to alternate column names.
 * - Improved error parsing for RLS/permission and configuration errors.
 * - Adds diagnostic console log with environment availability for Supabase configuration
 *   (without printing sensitive values) to help local troubleshooting.
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
        // Diagnostic: check env presence (do not log secrets)
        const hasUrl = !!process.env.REACT_APP_SUPABASE_URL;
        const hasKey = !!process.env.REACT_APP_SUPABASE_KEY;
        // eslint-disable-next-line no-console
        console.debug(
          "[ServiceTypeStep] Supabase env present?",
          { hasUrl, hasKey, NODE_ENV: process.env.NODE_ENV }
        );

        const supabase = getSupabaseClient();

        // Primary expected schema
        let query = supabase
          .from("service_types")
          .select("id, name, description, price, duration_min")
          .order("name", { ascending: true });

        let { data, error } = await query;

        // If the primary schema fails (e.g., column not found), attempt fallback mapping
        const needsFallback =
          error &&
          typeof error.message === "string" &&
          (error.message.toLowerCase().includes("column") ||
            error.message.toLowerCase().includes("does not exist") ||
            error.message.toLowerCase().includes("invalid reference"));

        if (needsFallback) {
          const fallback = await supabase
            .from("service_types")
            .select("id, name, description, base_price, duration_minutes")
            .order("name", { ascending: true });
          data = fallback.data;
          error = fallback.error;
          if (error) throw error;

          // Map fallback columns to canonical names for UI
          if (Array.isArray(data)) {
            data = data.map((d) => ({
              ...d,
              price: d.base_price,
              duration_min: d.duration_minutes,
            }));
          }
        } else if (error) {
          throw error;
        }

        if (!cancelled) {
          // Clear any prior error if data is available to ensure failure banner disappears
          if (data && Array.isArray(data) && data.length > 0) {
            setErr("");
          }
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // Friendlier error mapping while surfacing diagnostic code+message
        const code = e?.code || "";
        const message = e?.message || "";
        const raw = message.toLowerCase();

        let friendly = "Failed to load service types.";
        if (
          raw.includes("permission") ||
          raw.includes("rls") ||
          raw.includes("not authorized") ||
          raw.includes("policy")
        ) {
          friendly = "You do not have access to view service types.";
        } else if (raw.includes("invalid") && raw.includes("api key")) {
          friendly = "Supabase credentials are invalid. Check your environment variables.";
        } else if (raw.includes("fetch") || raw.includes("network") || raw.includes("url")) {
          friendly = "Unable to reach database. Check REACT_APP_SUPABASE_URL and network.";
        } else if (raw.includes("relation") && raw.includes("does not exist")) {
          friendly = "The service types table was not found. Verify the table name 'service_types'.";
        }

        // Show friendly plus non-sensitive diagnostic in UI
        setErr(`${friendly} ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);

        // eslint-disable-next-line no-console
        console.error("[ServiceTypeStep] load error", { code, message, stack: e?.stack });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize rows for rendering and context mapping
  const normalized = useMemo(() => {
    return (rows || []).map((r) => {
      const price =
        r?.price != null
          ? Number(r.price)
          : r?.base_price != null
          ? Number(r.base_price)
          : null;
      const duration =
        r?.duration_min != null
          ? Number(r.duration_min)
          : r?.duration_minutes != null
          ? Number(r.duration_minutes)
          : null;
      return {
        ...r,
        _price: Number.isFinite(price) ? price : null,
        _duration: Number.isFinite(duration) ? duration : null,
      };
    });
  }, [rows]);

  useEffect(() => {
    const found = normalized.find((s) => String(s.id) === String(selected)) || null;
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "Service",
          description: found.description || "",
          price: Number.isFinite(found._price) ? found._price : 0,
          duration_min: Number.isFinite(found._duration) ? found._duration : 0,
        }
      : null;
    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, normalized]);

  const empty = !loading && !err && normalized.length === 0;

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">
        Pick a service to continue. Prices and durations are loaded from the database.
      </p>

      {loading && <div className="card">Loading service types...</div>}
      {err && (
        <div className="card" style={{ color: "var(--error)" }}>
          {err}
        </div>
      )}
      {empty && (
        <div className="card" style={{ color: "var(--muted)" }}>
          No service types available. Please check your data or try again later.
        </div>
      )}

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
                  <span className="subtitle">
                    {svc._price != null ? `$${svc._price}` : "—"}
                  </span>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  {svc._duration != null ? `Approx. ${svc._duration} min` : "Duration: —"}
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
