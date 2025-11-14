import React, { useEffect, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center from Supabase list.
 *
 * Schema-aligned query:
 *   supabase
 *     .from('service_centers')
 *     .select('id,name,address,city,state,zipcode,phone,email,latitude,longitude,image_url')
 *     .order('name')
 *
 * Validates: A center must be selected.
 */
export default function CenterStep({ onValidChange }) {
  const { center, setCenter } = useBooking();
  const [selected, setSelected] = useState(center?.id || "");
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
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("service_centers")
          .select("id,name,address,city,state,zipcode,phone,email,latitude,longitude,image_url")
          .order("name");
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const code = e?.code || "";
        const message = e?.message || "";
        const raw = message.toLowerCase();
        if (raw.includes("permission") || raw.includes("rls") || raw.includes("not authorized")) {
          setErr(`You do not have access to view service centers. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
          setRlsWarning("Reading service_centers requires RLS read policies. Enable read access for anon/authenticated as appropriate.");
        } else {
          setErr(`Failed to load service centers. ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const found = rows.find((c) => String(c.id) === String(selected)) || null;
    setCenter(found || null);
    onValidChange?.(!!found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  return (
    <div className="card" aria-labelledby="center-step-title">
      <h3 id="center-step-title" className="section-title">Choose Service Center</h3>
      <p className="subtitle">Nearby Ocean Motors service locations.</p>

      {rlsWarning && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          RLS: {rlsWarning}
        </div>
      )}

      {loading && <div className="card">Loading centers...</div>}
      {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div className="card" style={{ color: "var(--muted)" }}>No centers available.</div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid">
          {rows.map((c) => {
            const active = String(selected) === String(c.id);
            const addressLine = [c.address, c.city, c.state, c.zipcode].filter(Boolean).join(", ");
            return (
              <article
                key={c.id}
                className="card"
                style={{
                  gridColumn: "span 6",
                  borderColor: active ? "#93C5FD" : "#E5E7EB",
                  background: active ? "#F3F4F6" : "var(--surface)",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{c.name || "Service Center"}</strong>
                    <div className="subtitle" style={{ marginTop: 4 }}>{addressLine || "-"}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                      {c.phone ? `☎ ${c.phone}` : ""} {c.email ? ` • ${c.email}` : ""}
                    </div>
                  </div>
                  <div>
                    <button
                      className="btn"
                      onClick={() => setSelected(c.id)}
                      aria-label={`Select ${c.name || "Service Center"}`}
                    >
                      {active ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
