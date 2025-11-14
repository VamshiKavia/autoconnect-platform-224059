import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Schema-aligned query:
 *   supabase
 *     .from('services_catalog') // Note: source table is services_catalog
 *     .select('id,name,description,image_url')
 *     .order('name', { ascending: true })
 *
 * Notes:
 * - services_catalog currently does not include 'features' or 'category' columns; UI avoids requesting/using them.
 * - Adds diagnostics for env presence and detailed error banner with code+message.
 * - Shows an explicit RLS banner suggestion if permission errors are detected.
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
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

        // IMPORTANT: Service catalog source table is services_catalog
        // Select only existing columns; do not request 'features' or 'category'.
        const { data, error } = await supabase
          .from("services_catalog")
          .select("id,name,description,image_url")
          .order("name", { ascending: true });

        if (error) throw error;

        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const code = e?.code || "";
        const message = e?.message || "";
        const raw = String(message || "").toLowerCase();

        // Friendly message reflecting corrected select (no mention of removed columns)
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
          friendly =
            "Table not found. Verify the name public.services_catalog in your Supabase project.";
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
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize rows and map to booking context shape.
  // services_catalog does not have features/category; image_url may be optional.
  const normalized = useMemo(() => {
    return (rows || []).map((r) => ({
      id: r?.id,
      name: r?.name ?? "",
      description: r?.description ?? "",
      image_url: r?.image_url ?? "", // guard optional
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

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">Choose a service to continue.</p>

      {rlsWarning && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          RLS: {rlsWarning}
        </div>
      )}

      {loading && <div className="card">Loading service types...</div>}
      {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
      {empty && <div className="card" style={{ color: "var(--muted)" }}>No service types found.</div>}

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
                {/* Note: services_catalog has no features/category; intentionally not rendered */}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
