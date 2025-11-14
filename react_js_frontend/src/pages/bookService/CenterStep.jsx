import React, { useEffect, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center from Supabase list.
 *
 * Query:
 *   supabase.from('service_centers')
 *     .select('id, name, address, lat, lng, phone, hours')
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("service_centers")
          .select("id, name, address, lat, lng, phone, hours")
          .order("name");
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("permission") || msg.includes("rls") || msg.includes("not authorized")) {
          setErr("You do not have access to view service centers.");
        } else {
          setErr("Failed to load service centers.");
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

      {loading && <div className="card">Loading centers...</div>}
      {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div className="card" style={{ color: "var(--muted)" }}>No centers available.</div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid">
          {rows.map((c) => {
            const active = String(selected) === String(c.id);
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
                    <div className="subtitle" style={{ marginTop: 4 }}>{c.address || "-"}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                      {c.phone ? `☎ ${c.phone}` : ""} {c.hours ? ` • Hours: ${c.hours}` : ""}
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
