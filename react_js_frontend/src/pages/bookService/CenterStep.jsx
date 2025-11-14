import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";
import { MOCK_CENTERS } from "./mocks";
import { useLocation } from "react-router-dom";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center.
 * TODO: When REACT_APP_ENABLE_SUPABASE=true, Supabase code path is active.
 */
export default function CenterStep({ onValidChange }) {
  const { center, setCenter, flags } = useBooking();
  const location = useLocation();

  // Try to preselect from router state or query string
  const initialSelectedId = (() => {
    const stateCenter = location?.state?.preselectedCenter;
    if (stateCenter?.id) return String(stateCenter.id);
    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("centerId");
    if (fromQuery) return String(fromQuery);
    return center?.id ? String(center.id) : "";
  })();

  const [selected, setSelected] = useState(initialSelectedId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(flags?.supabaseEnabled));
  const [err, setErr] = useState("");

  const [geo, setGeo] = useState({ lat: null, lng: null, ready: false, denied: false });
  const dbRowsCacheRef = useRef(null);
  const supabase = getSupabaseClient();

  async function fetchCentersServer() {
    const { data, error } = await supabase
      .from("service_centers")
      .select(
        "id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active"
      )
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function fetchCentersCached() {
    if (!dbRowsCacheRef.current) {
      const { data, error } = await supabase
        .from("service_centers")
        .select(
          "id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active"
        )
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      dbRowsCacheRef.current = Array.isArray(data) ? data : [];
    }
    return dbRowsCacheRef.current;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      if (!flags?.supabaseEnabled) {
        setRows(
          MOCK_CENTERS.map((c) => ({
            ...c,
            address: `${c.address}, ${c.city}`,
            opening_hours: c.opening_hours || c.openingHours || "Mon–Sat 9:00–18:00",
          }))
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const dbRows = await fetchCentersServer();
        if (cancelled) return;
        const mapped = dbRows.map(mapCenterRecord);
        setRows(mapped);
        if (selected && !mapped.find((x) => String(x.id) === String(selected))) {
          setSelected("");
        }
      } catch (e) {
        try {
          const dbRows = await fetchCentersCached();
          if (cancelled) return;
          const mapped = dbRows.map(mapCenterRecord);
          setRows(mapped);
          if (selected && !mapped.find((x) => String(x.id) === String(selected))) {
            setSelected("");
          }
        } catch (e2) {
          if (!cancelled) {
            setRows([]);
            setErr(e2?.message || e?.message || "Failed to load service centers.");
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
  }, [flags?.supabaseEnabled]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeo((g) => ({ ...g, ready: true }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = (pos.coords || {});
        setGeo({ lat: latitude || null, lng: longitude || null, ready: true, denied: false });
      },
      () => {
        setGeo({ lat: null, lng: null, ready: true, denied: true });
      },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const byId = rows.find((c) => c.id && String(c.id) === String(selected)) || null;
    setCenter(byId || null);
    onValidChange?.(!!byId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <section className="card" aria-labelledby="center-step-title">
      <h3 id="center-step-title" className="section-title">Choose Service Center</h3>
      <p className="subtitle">Select your preferred Ocean Motors service location.</p>

      {loading && (
        <div className="card" style={{ background: "var(--background)" }}>
          Loading service centers...
        </div>
      )}

      {err && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--background)", color: "var(--muted)" }}>
          No active service centers available.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid" role="list" aria-label="Service centers">
          {rows.map((c) => {
            const active = String(selected) === String(c.id);
            const address = c.address || formatAddress(c);
            const distanceKm = geo.ready ? computeDistanceKm(geo.lat, geo.lng, c.latitude, c.longitude) : null;

            return (
              <article
                key={c.id}
                role="listitem"
                className="card"
                style={{
                  gridColumn: "span 6",
                  borderColor: active ? "#93C5FD" : "var(--border)",
                  background: active ? "#F3F4F6" : "var(--surface)",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong>{c.name || "Unnamed center"}</strong>
                    <div className="subtitle" style={{ marginTop: 4 }}>{address || "—"}</div>

                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                      {distanceKm != null && isFinite(distanceKm)
                        ? `${distanceKm.toFixed(1)} km away`
                        : geo.denied
                        ? "Location access denied"
                        : "Distance unavailable"}
                    </div>

                    {(c.phone || c.email) && (
                      <div className="subtitle" style={{ marginTop: 6 }}>
                        {c.phone ? `☎ ${c.phone}` : ""} {c.phone && c.email ? "• " : ""} {c.email ? c.email : ""}
                      </div>
                    )}
                    {c.opening_hours ? (
                      <div className="subtitle" style={{ marginTop: 4 }}>
                        Hours: {c.opening_hours}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <button
                      className="btn"
                      onClick={() => setSelected(c.id)}
                      aria-label={`Select ${c.name}`}
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

      {!flags?.supabaseEnabled && (
        <p className="subtitle" style={{ marginTop: 8 }}>
          TODO: Supabase disabled. Showing mock centers. Set REACT_APP_ENABLE_SUPABASE=true to re-enable.
        </p>
      )}
    </section>
  );
}

/** Mapper and helpers */
function mapCenterRecord(row) {
  return {
    id: row.id,
    name: row.name || "",
    address_line1: row.address_line1 || "",
    address_line2: row.address_line2 || "",
    city: row.city || "",
    state: row.state || "",
    postal_code: row.postal_code || "",
    country: row.country || "",
    latitude: safeNumber(row.latitude, null),
    longitude: safeNumber(row.longitude, null),
    phone: row.phone || "",
    email: row.email || "",
    opening_hours: row.opening_hours ?? null,
    active: !!row.active,
  };
}
function formatAddress(c) {
  const parts = [
    c.address_line1,
    c.address_line2,
    [c.city, c.state].filter(Boolean).join(", "),
    [c.postal_code, c.country].filter(Boolean).join(" "),
  ]
    .flat()
    .map((s) => (s || "").toString().trim())
    .filter(Boolean);
  const line = parts.join(", ").replace(/\s+,/g, ",").replace(/,\s*,/g, ", ");
  return line || "";
}
function computeDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    !isFinite(Number(lat1)) || !isFinite(Number(lon1)) || !isFinite(Number(lat2)) || !isFinite(Number(lon2))
  ) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(v) { return (v * Math.PI) / 180; }
function safeNumber(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
