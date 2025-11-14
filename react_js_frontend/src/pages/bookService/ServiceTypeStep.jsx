import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Schema-aligned query:
 *   supabase
 *     .from('service_types')
 *     .select('id,name,description,category,features,image_url')
 *     .order('name', { ascending: true })
 *
 * Notes:
 * - features may be text[], json, or stringified JSON; we normalize for safe display.
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

        // Exact columns per provided schema image
        const { data, error } = await supabase
          .from("service_types")
          .select("id,name,description,category,features,image_url")
          .order("name", { ascending: true });

        if (error) throw error;

        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
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
          setRlsWarning(
            "Reading service_types requires RLS read policies. Enable read access for anon/authenticated as appropriate."
          );
        } else if (raw.includes("relation") && raw.includes("does not exist")) {
          friendly = "Table not found. Verify the name public.service_types.";
        } else if (raw.includes("fetch") || raw.includes("network") || raw.includes("url")) {
          friendly = "Unable to reach Supabase. Check REACT_APP_SUPABASE_URL and connectivity.";
        }

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

  // Normalize features for display and map to booking context
  const normalized = useMemo(() => {
    const parseFeatures = (f) => {
      if (f == null) return [];
      if (Array.isArray(f)) return f.map((x) => String(x));
      if (typeof f === "object") return [JSON.stringify(f)];
      if (typeof f === "string") {
        const t = f.trim();
        if (!t) return [];
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) return parsed.map((x) => String(x));
          if (parsed && typeof parsed === "object") return [JSON.stringify(parsed)];
        } catch {
          // not JSON
        }
        // split on commas for basic text[] approximation
        if (t.includes(",")) return t.split(",").map((s) => s.trim()).filter(Boolean);
        return [t];
      }
      return [String(f)];
    };

    return (rows || []).map((r) => ({
      ...r,
      _features: parseFeatures(r?.features),
    }));
  }, [rows]);

  useEffect(() => {
    const found = normalized.find((s) => String(s.id) === String(selected)) || null;
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "Service",
          description: found.description || "",
          category: found.category || "",
          features: found._features || [],
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
                {svc._features && svc._features.length > 0 ? (
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {svc._features.slice(0, 4).map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
