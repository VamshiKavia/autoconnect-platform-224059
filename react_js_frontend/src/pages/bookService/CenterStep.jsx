import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center from Supabase "service_centers" (read-only).
 *
 * Behavior:
 * - Loads active centers from Supabase: id, name, address_line1, address_line2, city, state,
 *   postal_code, country, latitude, longitude, phone, email, opening_hours (json), active
 * - Filters to active = true
 * - Implements loading, empty, and error states
 * - Keeps existing validation: a center must be selected to continue
 * - Selection persists in booking context and is shown in Review step
 * - Optional: shows a simple distance if browser geolocation is available (placeholder calc)
 */
export default function CenterStep({ onValidChange }) {
  const { center, setCenter } = useBooking();

  // UI state
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(center?.id || "");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Optional geolocation
  const [geo, setGeo] = useState({ lat: null, lng: null, ready: false, denied: false });

  // Load centers from Supabase (active = true)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("service_centers")
          .select(
            "id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active"
          )
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        // Normalize rows to a shape used by Review step and context
        const normalized = list.map(mapCenterRecord);

        setRows(normalized);

        // If we had a selected id that isn't present anymore, clear it
        if (selected && !normalized.find((x) => String(x.id) === String(selected))) {
          setSelected("");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load service centers.");
          setRows([]);
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
  }, []);

  // Acquire geolocation (best effort, optional)
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeo((g) => ({ ...g, ready: true }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        setGeo({ lat: latitude || null, lng: longitude || null, ready: true, denied: false });
      },
      () => {
        setGeo({ lat: null, lng: null, ready: true, denied: true });
      },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 8000 }
    );
  }, []);

  // When selection changes, update booking context and validity
  useEffect(() => {
    const found = rows.find((c) => String(c.id) === String(selected)) || null;
    setCenter(found);
    onValidChange?.(!!found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows]);

  return (
    <div className="card" aria-labelledby="center-step-title">
      <h3 id="center-step-title" className="section-title">Choose Service Center</h3>
      <p className="subtitle">Select your preferred Ocean Motors service location.</p>

      {loading && <div className="card" style={{ background: "var(--bg)" }}>Loading service centers...</div>}

      {err && (
        <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          {err}
        </div>
      )}

      {empty && (
        <div className="card" style={{ background: "var(--bg)", color: "var(--muted)" }}>
          No active service centers available.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid">
          {rows.map((c) => {
            const active = String(selected) === String(c.id);
            const address = formatAddress(c);
            const distanceKm = geo.ready ? computeDistanceKm(geo.lat, geo.lng, c.latitude, c.longitude) : null;

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
    </div>
  );
}

/**
 * Map raw Supabase record to a normalized center object used by booking context.
 */
function mapCenterRecord(row) {
  // Maintain a compact "address" string for Review step compatibility
  const address = formatAddress(row);
  return {
    id: row.id,
    name: row.name || "",
    // Retain a simple address string for the Review step while keeping structured fields too
    address,
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

/**
 * Build a readable address string from structured fields.
 */
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

/**
 * Compute approximate distance in km between two lat/lng points.
 * Returns null if any coordinate is missing.
 */
function computeDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    !isFinite(Number(lat1)) ||
    !isFinite(Number(lon1)) ||
    !isFinite(Number(lat2)) ||
    !isFinite(Number(lon2))
  ) {
    return null;
  }
  // Haversine formula
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(v) {
  return (v * Math.PI) / 180;
}
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
