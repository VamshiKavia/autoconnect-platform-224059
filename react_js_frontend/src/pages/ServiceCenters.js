import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - Find service centers with map, filters, and geolocation sorting.
 *
 * Enhancements:
 * - On search/brand change, compute filtered results and recenter/zoom map to nearest match.
 * - If geolocation is unavailable, use ISRO Layout (Bangalore) as origin for distance sorting.
 * - Debounce text input to avoid excessive map updates.
 * - If no matches, show message and keep previous map center/zoom.
 * - Fullscreen toggle for map with accessibility and scroll lock.
 * - Sync filters to URL (?q=...&brand=...) with debounce and history updates.
 *
 * Features (existing preserved):
 * - Default map location: ISRO Layout, Bangalore (12.9022, 77.5660), radius 20 km
 * - Optional geolocation: if granted, use device location to sort by nearest
 * - Filters:
 *    - q: text search across name/address
 *    - brand: All | HYUNDAI | TOYOTA | SUZUKI | BMW | AUDI | MERCEDES-BENZ
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

  // Allowed brand options (single-select dropdown)
  const BRAND_OPTIONS = [
    { value: "all", label: "All brands" },
    { value: "HYUNDAI", label: "HYUNDAI" },
    { value: "TOYOTA", label: "TOYOTA" },
    { value: "SUZUKI", label: "SUZUKI" },
    { value: "BMW", label: "BMW" },
    { value: "AUDI", label: "AUDI" },
    { value: "MERCEDES-BENZ", label: "MERCEDES-BENZ" },
  ];

  // UI state
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all"); // All by default
  const [selectedId, setSelectedId] = useState(null);
  const [userLoc, setUserLoc] = useState(null); // {lat,lng} if geolocation granted
  const [loading, setLoading] = useState(true);

  // Map state to preserve previous center/zoom on no-match
  const [mapState, setMapState] = useState({
    center: DEFAULT_CENTER,
    zoom: 12,
    bbox: null, // optional computed bounding box
  });

  // Fullscreen map state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  // Track initial URL parsing to avoid redundant replace on mount
  const didInitFromUrl = useRef(false);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (isFullscreen) {
      body.classList.add("no-scroll");
    } else {
      body.classList.remove("no-scroll");
    }
    // Cleanup to ensure class removed on unmount
    return () => {
      body.classList.remove("no-scroll");
    };
  }, [isFullscreen]);

  // --- URL <-> State Sync Helpers ---

  // Normalize brand coming from URL or UI to internal values
  const normalizeBrandFromUrl = (b) => {
    if (!b) return "all";
    const t = String(b).trim().toUpperCase();
    if (t === "ALL") return "all";
    if (t === "TOYATO") return "TOYOTA";
    if (t === "BENZ") return "MERCEDES-BENZ";
    // Only allow known brands; otherwise fall back to "all"
    const allowed = BRAND_OPTIONS.map((o) => o.value);
    return allowed.includes(t) ? t : "all";
  };

  // Read initial params on mount and on popstate for back/forward
  useEffect(() => {
    const applyFromLocation = () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const qParam = sp.get("q") || "";
        const brandParamRaw = sp.get("brand");
        const brandParam = normalizeBrandFromUrl(brandParamRaw);
        // Set only if different to avoid unnecessary renders
        setQ(qParam);
        setBrand(brandParam);
      } catch {
        // ignore malformed URL
      }
    };

    // Initial apply from URL
    if (!didInitFromUrl.current) {
      applyFromLocation();
      didInitFromUrl.current = true;
    }

    // Listen to back/forward to restore state from URL
    const onPop = () => applyFromLocation();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Debounced query value to throttle updates and URL changes
  const [debouncedQ, setDebouncedQ] = useState(q);
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQ(q), 300); // 300ms debounce
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [q]);

  // Update URL when search or brand changes (debounced for q)
  useEffect(() => {
    // Build new query params
    const sp = new URLSearchParams(window.location.search);

    // q param: set only if non-empty; else remove
    const qVal = debouncedQ.trim();
    if (qVal) {
      sp.set("q", qVal);
    } else {
      sp.delete("q");
    }

    // brand param: if "all" treat as no brand param; otherwise set brand
    // Optionally allow brand=ALL for explicitness; choose to omit for cleaner URLs
    if (brand && brand !== "all") {
      sp.set("brand", encodeURIComponent(brand).replace(/%20/g, "+"));
    } else {
      // keep consistent: remove brand param for 'All'
      sp.delete("brand");
    }

    const newSearch = sp.toString();
    const newUrl =
      window.location.pathname + (newSearch ? `?${newSearch}` : "");

    // Use replaceState to avoid polluting history on each keystroke
    // Ensures no full page reload
    try {
      window.history.replaceState(null, "", newUrl);
    } catch {
      // ignore environments without History API
    }
  }, [debouncedQ, brand]);

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
    // send debounced query to backend to help narrow results server-side
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

  // Initial load and whenever origin changes (geolocation becomes available)
  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const loc = userLoc || DEFAULT_CENTER;
        const data = await loadCenters({
          q: "", // initial no query
          lat: loc.lat,
          lng: loc.lng,
          radius_km: DEFAULT_RADIUS_KM,
        });
        setCenters(Array.isArray(data) ? data : []);
        // Initialize map center only on very first load
        setMapState((ms) => ({
          center: loc,
          zoom: ms.zoom ?? 12,
          bbox: null,
        }));
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
  const inferBrand = (centerId) => {
    if (!centerId) return "HYUNDAI";
    const brands = BRAND_OPTIONS.map((b) => b.value).filter((v) => v !== "all");
    let sum = 0;
    for (let i = 0; i < centerId.length; i++) sum += centerId.charCodeAt(i);
    return brands[sum % brands.length];
  };

  // Derived filtered list (client-side brand and q safety)
  const filteredCenters = useMemo(() => {
    const qLower = debouncedQ.trim().toLowerCase();

    // Map legacy/alternate brand tokens to normalized values
    const normalizeBrand = (b) => {
      const t = (b || "").toUpperCase().trim();
      if (t === "TOYATO") return "TOYOTA";
      if (t === "BENZ") return "MERCEDES-BENZ";
      return t;
    };

    let list = centers.filter((c) => {
      const matchesQ =
        !qLower ||
        (c.name || "").toLowerCase().includes(qLower) ||
        (c.address || "").toLowerCase().includes(qLower);

      // Brand filter: if All, accept all; otherwise match inferred/backend brand normalized
      const inferred = inferBrand(c.id);
      const centerBrand = normalizeBrand(c.brand || inferred || "");
      const selectedBrand = normalizeBrand(brand);
      const brandOk = selectedBrand === "ALL" || selectedBrand === "ALL BRANDS" || selectedBrand === "ALL" || selectedBrand === "ALL BRANDS" || selectedBrand === "ALL" || selectedBrand === "ALL BRANDS" ? true : centerBrand === selectedBrand;

      return matchesQ && brandOk;
    });

    // Inject distance if missing using either userLoc or default center
    const origin = userLoc || DEFAULT_CENTER;
    list = list.map((c) => {
      if (typeof c.distance_km === "number") return c;
      const d = haversineKm(origin.lat, origin.lng, c.lat, c.lng);
      return { ...c, distance_km: Math.round(d * 1000) / 1000 };
    });

    // Sort by distance from origin
    list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    return list;
  }, [centers, debouncedQ, brand, userLoc?.lat, userLoc?.lng]);

  const selected = useMemo(
    () => filteredCenters.find((c) => c.id === selectedId) || null,
    [filteredCenters, selectedId]
  );

  // Compute bounding box for a set of centers
  const computeBBox = (items) => {
    if (!items || items.length === 0) return null;
    let minLat = +Infinity,
      minLng = +Infinity,
      maxLat = -Infinity,
      maxLng = -Infinity;
    items.forEach((c) => {
      if (typeof c.lat === "number" && typeof c.lng === "number") {
        minLat = Math.min(minLat, c.lat);
        minLng = Math.min(minLng, c.lng);
        maxLat = Math.max(maxLat, c.lat);
        maxLng = Math.max(maxLng, c.lng);
      }
    });
    if (!isFinite(minLat) || !isFinite(minLng) || !isFinite(maxLat) || !isFinite(maxLng)) {
      return null;
    }
    // Add a small padding
    const padLat = 0.02;
    const padLng = 0.02;
    return {
      west: minLng - padLng,
      south: minLat - padLat,
      east: maxLng + padLng,
      north: maxLat + padLat,
    };
  };

  // Recenter/zoom logic on filter changes:
  // - If there is a selected card, center to it.
  // - Else, if there are filtered results:
  //    - If 1 result: center to it and set closer zoom
  //    - If multiple: set bbox covering them and keep a reasonable zoom
  // - If no results: keep previous map center/zoom, do not change mapState
  useEffect(() => {
    if (selected) {
      setMapState((prev) => ({
        center: { lat: selected.lat, lng: selected.lng },
        zoom: Math.max(prev.zoom || 12, 13), // a tad closer on a single selection
        bbox: null,
      }));
      return;
    }

    if (filteredCenters.length === 0) {
      // no-op: keep previous map center/zoom, show message in UI
      return;
    }

    if (filteredCenters.length === 1) {
      const c = filteredCenters[0];
      setMapState({
        center: { lat: c.lat, lng: c.lng },
        zoom: 14, // closer
        bbox: null,
      });
      return;
    }

    // Multiple centers: compute a bbox that fits all
    const bbox = computeBBox(filteredCenters);
    if (bbox) {
      // For OSM embed using bbox, we also place marker roughly at the closest center
      const sorted = [...filteredCenters].sort(
        (a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)
      );
      const top = sorted[0] || filteredCenters[0];
      setMapState({
        center: { lat: top.lat, lng: top.lng }, // used for marker param
        zoom: 12, // zoom is ignored by bbox but keep for fallback
        bbox,
      });
    } else {
      // Fallback: center to closest
      const sorted = [...filteredCenters].sort(
        (a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)
      );
      const top = sorted[0];
      setMapState({
        center: { lat: top.lat, lng: top.lng },
        zoom: 12,
        bbox: null,
      });
    }
  }, [
    debouncedQ,
    brand,
    selected?.id, // re-run when selection changes
    filteredCenters,
    userLoc?.lat,
    userLoc?.lng,
  ]);

  // Build OSM map URL from current mapState (bbox preferred)
  const buildOsmUrl = () => {
    const { center, zoom, bbox } = mapState;
    if (bbox) {
      // bbox order: west,south,east,north
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&layer=mapnik&marker=${center.lat},${center.lng}`;
    }
    const span = 0.2; // fallback span window around center if bbox not set
    const west = center.lng - span;
    const south = center.lat - span;
    const east = center.lng + span;
    const north = center.lat + span;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${center.lat},${center.lng}&zoom=${zoom}`;
  };

  const osmUrl = buildOsmUrl();

  const directionsUrl = (c) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      c.lat + "," + c.lng
    )}&destination_place_id=&travelmode=driving`;

  // Accessible toggle handler for keyboard and click
  const toggleFullscreen = (e) => {
    if (e && e.type === "keydown") {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
    }
    setIsFullscreen((v) => !v);
  };

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
              aria-label="Search service centers by name or address"
            />
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

      {/* Map with fullscreen toggle */}
      <div
        ref={mapContainerRef}
        className={
          "card map-card " + (isFullscreen ? "fullscreen-overlay" : "")
        }
        style={{ marginBottom: 16 }}
        aria-label="Map container"
      >
        <div
          className="row"
          style={{
            justifyContent: "flex-end",
            padding: 8,
            position: isFullscreen ? "fixed" : "relative",
            top: isFullscreen ? 8 : undefined,
            right: isFullscreen ? 8 : undefined,
            zIndex: isFullscreen ? 10001 : undefined,
          }}
        >
          <button
            className="btn secondary"
            onClick={toggleFullscreen}
            onKeyDown={toggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen map" : "Enter fullscreen map"}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>

        <iframe
          title="Service Centers Map"
          src={osmUrl}
          className="map-embed"
          aria-label="Map showing service centers around selected area"
          style={
            isFullscreen
              ? {
                  width: "100vw",
                  height: "100vh",
                  maxHeight: "100vh",
                }
              : undefined
          }
        />
      </div>

      {loading ? (
        <div className="card">Loading centers...</div>
      ) : error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : filteredCenters.length === 0 ? (
        <div className="card">
          No centers found for the current filters. Try adjusting your search or selecting a different brand.
        </div>
      ) : (
        <div className="grid">
          {filteredCenters.map((c) => {
            const isSelected = c.id === selectedId;
            // Determine display brand for the card (to help users see which brand matched)
            const displayBrandRaw = (c.brand || inferBrand(c.id) || "").toUpperCase();
            const displayBrand =
              displayBrandRaw === "TOYATO"
                ? "TOYOTA"
                : displayBrandRaw === "BENZ"
                ? "MERCEDES-BENZ"
                : displayBrandRaw;

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
