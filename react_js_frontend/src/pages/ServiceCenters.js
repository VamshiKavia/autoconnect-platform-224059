import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - Find service centers with map, filters, and geolocation sorting.
 *
 * Features:
 * - Default map location: ISRO Layout, Bangalore (12.9022, 77.5660), radius 20 km
 * - Optional geolocation: if granted, use device location to sort by nearest
 * - Filters:
 *    - q: text search across name/address
 *    - type: authorized | multi-brand | both (client-side mock)
 *    - brand: All | HYUNDAI | TOYATO | SUZUKI | BMW | AUDI | BENZ
 * - Map: OpenStreetMap iframe centered on selected center; click a card to highlight and recenter
 * - Directions: Google Maps link using lat,lng
 *
 * Notes:
 * - Backend /service-centers supports q, lat, lng, radius_km, limit and may return distance_km.
 * - When backend distance is unavailable, compute Haversine client-side.
 */
export default function ServiceCenters() {
  // ISRO Layout default center
  const DEFAULT_CENTER = { lat: 12.9022, lng: 77.5660 };
  const DEFAULT_RADIUS_KM = 20;

  // Allowed brand options per requirement (single-select dropdown)
  const BRAND_OPTIONS = [
    { value: "all", label: "All brands" },
    { value: "HYUNDAI", label: "HYUNDAI" },
    { value: "TOYATO", label: "TOYATO" }, // note: spelled as provided
    { value: "SUZUKI", label: "SUZUKI" },
    { value: "BMW", label: "BMW" },
    { value: "AUDI", label: "AUDI" },
    { value: "BENZ", label: "BENZ" },
  ];

  // UI state
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("both"); // authorized | multi-brand | both
  const [brand, setBrand] = useState("all"); // All by default as requested
  const [selectedId, setSelectedId] = useState(null);
  const [userLoc, setUserLoc] = useState(null); // {lat,lng} if geolocation granted
  const [loading, setLoading] = useState(true);

  // Compute Haversine distance (km)
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371.0;
    const toRad = (d) => (d * Math.PI) / 180;
    const dlat = toRad(lat2 - lat1);
    const dlon = toRad(lon2 - lon1);
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  };

  // Try geolocation (non-blocking, graceful fallback)
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Denied or unavailable; keep null and use default center
          setUserLoc(null);
        },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60_000 }
      );
    }
  }, []);

  // Fetch centers with backend filters if available; fall back to client filtering
  async function loadCenters(params) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.lat != null && params.lng != null) {
      query.set("lat", String(params.lat));
      query.set("lng", String(params.lng));
      query.set("radius_km", String(params.radius_km ?? DEFAULT_RADIUS_KM));
    }
    query.set("limit", "200"); // cap per backend policy
    const path = `/service-centers?${query.toString()}`;
    const data = await apiGet(path);
    return data;
  }

  // Initial load: prefer using user location when available, else default
  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const loc = userLoc || DEFAULT_CENTER;
        const data = await loadCenters({
          q: "",
          lat: loc.lat,
          lng: loc.lng,
          radius_km: DEFAULT_RADIUS_KM,
        });
        setCenters(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load service centers");
        setCenters([]);
      } finally {
        setLoading(false);
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

  // Helper to simulate a brand for each center deterministically (until backend provides it)
  // We derive a pseudo-brand from the center id to keep it stable across renders and searches.
  const inferBrand = (centerId) => {
    if (!centerId) return "HYUNDAI";
    const brands = BRAND_OPTIONS.map(b => b.value).filter(v => v !== "all");
    // simple hash: sum char codes mod brands.length
    let sum = 0;
    for (let i = 0; i < centerId.length; i++) sum += centerId.charCodeAt(i);
    return brands[sum % brands.length];
  };

  // Derived filtered list (client-side for type/brand and q safety)
  const filteredCenters = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    let list = centers.filter((c) => {
      const matchesQ =
        !qLower ||
        (c.name || "").toLowerCase().includes(qLower) ||
        (c.address || "").toLowerCase().includes(qLower);

      // In absence of real type on backend data, simulate from id length:
      const isAuthorized = (c.id || "").length % 2 === 0;
      const typeOk =
        type === "both" ||
        (type === "authorized" && isAuthorized) ||
        (type === "multi-brand" && !isAuthorized);

      // Brand filter: if All, accept all; otherwise match our inferred brand OR backend-provided c.brand if present
      const inferred = inferBrand(c.id);
      const centerBrand = (c.brand || inferred || "").toUpperCase();
      const brandOk = brand === "all" || centerBrand === brand;

      return matchesQ && typeOk && brandOk;
    });

    // Inject distance if missing using either userLoc or default center
    const origin = userLoc || DEFAULT_CENTER;
    list = list.map((c) => {
      if (typeof c.distance_km === "number") return c;
      const d = haversineKm(origin.lat, origin.lng, c.lat, c.lng);
      return { ...c, distance_km: Math.round(d * 1000) / 1000 };
    });

    // If user location available, sort by distance
    if (origin) {
      list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centers, q, type, brand, userLoc?.lat, userLoc?.lng]);

  const selected = useMemo(
    () => filteredCenters.find((c) => c.id === selectedId) || null,
    [filteredCenters, selectedId]
  );

  // Build OSM map URL centered on selected or default view (or user location)
  const mapCenter = selected
    ? { lat: selected.lat, lng: selected.lng }
    : userLoc || DEFAULT_CENTER;

  // Zoom level heuristic based on radius
  const zoom = 12; // good default for city area (~20km radius gives city-scale)

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.2},${mapCenter.lat - 0.2},${mapCenter.lng + 0.2},${mapCenter.lat + 0.2}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}&zoom=${zoom}`;

  const directionsUrl = (c) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      c.lat + "," + c.lng
    )}&destination_place_id=&travelmode=driving`;

  return (
    <div className="container">
      <h2 className="section-title">Service Centers</h2>
      <p className="subtitle">
        Find a service center near you. Default area: ISRO Layout, Bangalore (20 km radius).
      </p>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label className="label" htmlFor="q">Search</label>
            <input
              id="q"
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or address"
            />
          </div>
          <div style={{ flex: "0 1 180px", minWidth: 160 }}>
            <label className="label" htmlFor="type">Type</label>
            <select
              id="type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="both">Both</option>
              <option value="authorized">Authorized</option>
              <option value="multi-brand">Multi-brand</option>
            </select>
          </div>
          <div style={{ flex: "0 1 200px", minWidth: 180 }}>
            <label className="label" htmlFor="brand">Brand</label>
            <select
              id="brand"
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-label="Filter by Brand"
            >
              {BRAND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card map-card" style={{ marginBottom: 16 }}>
        <iframe
          title="Service Centers Map"
          src={osmUrl}
          className="map-embed"
          aria-label="Map showing service centers around selected area"
        />
      </div>

      {loading ? (
        <div className="card">Loading centers...</div>
      ) : error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : filteredCenters.length === 0 ? (
        <div className="card">No centers found for the current filters.</div>
      ) : (
        <div className="grid">
          {filteredCenters.map((c) => {
            const isSelected = c.id === selectedId;
            // Determine display brand for the card (to help users see which brand matched)
            const displayBrand = (c.brand || inferBrand(c.id) || "").toUpperCase();

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  gridColumn: "span 6",
                  borderColor: isSelected ? "#60A5FA" : undefined,
                  boxShadow: isSelected ? "0 0 0 2px rgba(96,165,250,0.35)" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => setSelectedId(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(c.id);
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`Select ${c.name}`}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{c.name}</strong>
                  <div className="row" style={{ gap: 8 }}>
                    {typeof c.distance_km === "number" ? (
                      <span className="subtitle">{c.distance_km.toFixed(2)} km</span>
                    ) : null}
                    <span className="subtitle" aria-label="Supported brand">
                      {displayBrand}
                    </span>
                  </div>
                </div>
                <div className="subtitle" style={{ marginTop: 6 }}>{c.address}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  Lat: {c.lat}, Lng: {c.lng}
                </div>
                <div style={{ marginTop: 8 }}>Phone: {c.phone}</div>
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <a
                    className="btn"
                    href={directionsUrl(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Get directions to ${c.name}`}
                  >
                    Directions
                  </a>
                  <button
                    className="btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(c.id);
                    }}
                    aria-label={`Center on map: ${c.name}`}
                  >
                    Center on Map
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
