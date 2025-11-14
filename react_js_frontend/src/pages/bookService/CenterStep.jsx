import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * CenterStep - Step 3: Choose a service center.
 *
 * Behavior:
 * - Reads active centers from Supabase: service_centers table.
 * - Merges with a temporary client-side fallback list so all centers from the design
 *   appear immediately while DB seeding completes.
 * - Surfaces key fields: name, address (line1/line2, city, state, postal_code),
 *   phone, email, opening_hours, and a distance placeholder/estimate when possible.
 * - Preserves existing selection flow, validation, and Ocean Professional styling.
 *
 * TODO(centers): Remove the fallback list once Supabase is fully seeded.
 * TODO: Extract CardList component for reuse across steps.
 */
export default function CenterStep({ onValidChange }) {
  const { center, setCenter } = useBooking();

  // Selection state
  const [selected, setSelected] = useState(center?.id || "");

  // Data and status
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Geolocation for distance placeholder (optional)
  const [geo, setGeo] = useState({ lat: null, lng: null, ready: false, denied: false });

  // Local cache for client-side retry without re-querying network
  const dbRowsCacheRef = useRef(null);

  const supabase = getSupabaseClient();

  // --- Temporary client-side fallback centers (from attached image/reference) ---
  // These are used only until the database is fully populated.
  // NOTE: Only non-sensitive public info is included here.
  // TODO(centers): Delete this const once DB has these rows.
  const fallbackCenters = useMemo(
    () => [
      {
        id: "fallback-om-downtown",
        name: "Ocean Motors Service - Downtown",
        address_line1: "15 Bull Temple Rd",
        address_line2: "Basavanagudi",
        city: "Bengaluru",
        state: "KA",
        postal_code: "560004",
        country: "IN",
        phone: "+91 80 4000 1000",
        email: "downtown@oceanmotors.example",
        opening_hours: "Mon–Sat 9:00–18:00",
        latitude: null,
        longitude: null,
        active: true,
      },
      {
        id: "fallback-om-kanakapura",
        name: "Ocean Motors Service - Kanakapura Rd",
        address_line1: "Opp. Metro Cash & Carry",
        address_line2: "Kanakapura Main Rd",
        city: "Bengaluru",
        state: "KA",
        postal_code: "560062",
        country: "IN",
        phone: "+91 80 4000 2000",
        email: "kanakapura@oceanmotors.example",
        opening_hours: "Mon–Sat 9:00–18:00",
        latitude: null,
        longitude: null,
        active: true,
      },
      {
        id: "fallback-om-bannerghatta",
        name: "Ocean Motors Service - Bannerghatta",
        address_line1: "Bannerghatta Rd",
        address_line2: "Mico Layout",
        city: "Bengaluru",
        state: "KA",
        postal_code: "560076",
        country: "IN",
        phone: "+91 80 4000 3000",
        email: "bannerghatta@oceanmotors.example",
        opening_hours: "Mon–Sat 9:00–18:00",
        latitude: null,
        longitude: null,
        active: true,
      },
    ],
    []
  );

  // Fetch all active centers from Supabase
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

  // Client-side cached fetch (retry path)
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

  // Merge DB centers with fallback by name (case-insensitive), keeping DB record when duplicate.
  // Fallback items will be marked with id=null and isFallback=true to avoid misuse in Supabase queries.
  function mergeCenters(dbRows) {
    const norm = (s) => (s || "").toString().trim().toLowerCase();
    const byName = new Map();
    // Put DB rows first to make them authoritative
    for (const r of dbRows) {
      byName.set(norm(r.name), { ...r, isFallback: false });
    }
    // Add fallback items if not present by name
    for (const f of fallbackCenters) {
      const key = norm(f.name);
      if (!byName.has(key)) {
        byName.set(key, {
          ...f,
          id: null, // critical: never carry string fallback id into context
          isFallback: true,
        });
      }
    }
    // Return array sorted by name for predictability
    return Array.from(byName.values()).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const dbRows = await fetchCentersServer();
        if (cancelled) return;
        const merged = mergeCenters(dbRows).map(mapCenterRecord);
        setRows(merged);
        // Maintain selection validity
        if (selected && !merged.find((x) => String(x.id) === String(selected))) {
          setSelected("");
        }
      } catch (e) {
        try {
          const dbRows = await fetchCentersCached();
          if (cancelled) return;
          const merged = mergeCenters(dbRows).map(mapCenterRecord);
          setRows(merged);
          if (selected && !merged.find((x) => String(x.id) === String(selected))) {
            setSelected("");
          }
        } catch (e2) {
          if (!cancelled) {
            // Even if DB fails, show the fallback so UI isn't empty
            const merged = mergeCenters([]).map(mapCenterRecord);
            setRows(merged);
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
  }, []);

  // Geolocation optional
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

  // Map selection to booking context and notify validity with fallback guard
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
        <div>
          {rows.some((r) => !r.id) && (
            <div
              className="card"
              style={{ background: "#FEFCE8", borderColor: "#FDE68A", color: "#92400E", marginBottom: 8 }}
              role="status"
            >
              Some centers are shown as placeholders while we finish setup. Please select a center without the “Unavailable” badge.
            </div>
          )}
          <div className="grid" role="list" aria-label="Service centers">
            {rows.map((c) => {
              const active = String(selected) === String(c.id);
              const address = formatAddress(c);
              const distanceKm = geo.ready ? computeDistanceKm(geo.lat, geo.lng, c.latitude, c.longitude) : null;

              return (
                <article
                  key={c.id ?? `fallback-${c.name}`}
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

                      {/* Distance placeholder */}
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                        {distanceKm != null && isFinite(distanceKm)
                          ? `${distanceKm.toFixed(1)} km away`
                          : geo.denied
                          ? "Location access denied"
                          : "Distance unavailable"}
                      </div>

                      {/* Contact + hours */}
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
                        onClick={() => {
                          if (!c.id) {
                            // Fallback item: do not allow selecting
                            return;
                          }
                          setSelected(c.id);
                        }}
                        aria-label={`Select ${c.name}${!c.id ? " (unavailable placeholder)" : ""}`}
                        disabled={!c.id}
                        aria-disabled={!c.id}
                        title={!c.id ? "This is a placeholder center. Please choose a real center." : undefined}
                      >
                        {!c.id ? "Unavailable" : active ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/** Mapper and helpers */
function mapCenterRecord(row) {
  // If row came from fallback, enforce id=null and mark isFallback true
  const isFallback = !!row.isFallback || (typeof row.id === "string" && String(row.id).startsWith("fallback-"));
  return {
    id: isFallback ? null : row.id,
    isFallback,
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
