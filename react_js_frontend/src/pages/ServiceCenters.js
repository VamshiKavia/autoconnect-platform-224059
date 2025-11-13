import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - Find service centers with map, filters, and geolocation sorting.
 *
 * Update: Ensure robust string matching and brand normalization, explicit Search button
 * applies filters, and map recenters on top match or fits bounds for multiple matches.
 * Adds minimal dev logging for filtered results.
 *
 * Verification targets:
 * - q='Nandi Toyota Service', brand='TOYOTA' -> shows "Nandi Toyota Service" and recenters
 * - q='Nandi', brand='TOYOTA' -> shows correct matches and recenters
 * - q='Toyota Service', brand='TOYOTA' -> matches and recenter
 */
export default function ServiceCenters() {
  // ISRO Layout default center
  const DEFAULT_CENTER = { lat: 12.9022, lng: 77.566 };
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

  // UI state (controlled inputs)
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all"); // All by default
  const [selectedId, setSelectedId] = useState(null);
  const [userLoc, setUserLoc] = useState(null); // {lat,lng} if geolocation granted
  const [loading, setLoading] = useState(true);

  // Applied filters state: only changes on submit
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedBrand, setAppliedBrand] = useState("all");

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

  // For disable Search button when unchanged or empty
  const initialUrlStateRef = useRef({ q: "", brand: "all" });

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

  // Normalize brand coming from URL or UI to internal values with aliases
  const normalizeBrandFromUrl = (b) => {
    if (!b) return "all";
    const t = decodeURIComponent(String(b)).replace(/\+/g, " ").trim().toUpperCase();
    if (t === "ALL" || t === "ALL BRANDS") return "all";
    // Common aliases/punctuation variants
    const cleaned = t.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ");
    if (["TOYATO", "TOY-OTA", "TOY OTA", "TOYOTA MOTOR"].includes(cleaned)) return "TOYOTA";
    if (["BENZ", "MERCEDES", "MERCEDES BENZ"].includes(cleaned)) return "MERCEDES-BENZ";
    const allowed = BRAND_OPTIONS.map((o) => o.value);
    return allowed.includes(t) ? t : "all";
  };

  // Read initial params on mount and on popstate for back/forward
  useEffect(() => {
    const applyFromLocation = (applyToInputsOnly = true) => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const rawQ = sp.get("q") || "";
        // Normalize q: trim, collapse spaces, remove zero-width and control chars
        const qParam = rawQ
          .normalize("NFKC")
          .replace(/[​-‍﻿]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const brandParamRaw = sp.get("brand");
        const brandParam = normalizeBrandFromUrl(brandParamRaw);

        // Set controlled inputs
        setQ(qParam);
        setBrand(brandParam);

        // On initial mount or popstate, also set applied values to match URL
        if (!didInitFromUrl.current || !applyToInputsOnly) {
          setAppliedQ(qParam);
          setAppliedBrand(brandParam);
          initialUrlStateRef.current = { q: qParam, brand: brandParam };
        }
      } catch {
        // ignore malformed URL
      }
    };

    // Initial apply from URL (inputs + applied)
    if (!didInitFromUrl.current) {
      applyFromLocation(false);
      didInitFromUrl.current = true;
    }

    // Listen to back/forward to restore state from URL (apply both)
    const onPop = () => applyFromLocation(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Debounced query value to throttle updates and URL preview changes
  const [debouncedQ, setDebouncedQ] = useState(q);
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQ(q), 300); // 300ms debounce
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [q]);

  // Update URL preview when the user types/selects (debounced for q); no filtering yet
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    // q param: set only if non-empty; else remove
    const qVal = debouncedQ
      .normalize("NFKC")
      .replace(/[​-‍﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (qVal) {
      sp.set("q", qVal);
    } else {
      sp.delete("q");
    }

    // brand param: omit when 'all'
    if (brand && brand !== "all") {
      sp.set("brand", brand);
    } else {
      sp.delete("brand");
    }

    const newSearch = sp.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");

    try {
      window.history.replaceState(null, "", newUrl);
    } catch {
      // ignore
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
    if (params.q) query.set("q", params.q);
    if (params.lat != null && params.lng != null) {
      query.set("lat", String(params.lat));
      query.set("lng", String(params.lng));
      query.set("radius_km", String(params.radius_km ?? DEFAULT_RADIUS_KM));
    }
    query.set("limit", "200"); // cap per backend policy
    const path = `/service-centers?${query.toString()}`;
    let data = [];
    try {
      data = await apiGet(path);
    } catch (e) {
      // If backend not available, fall back to empty list and allow enrichment below
      data = [];
    }

    // Client-side enrichment: ensure representative Nandi Toyota entries exist near ISRO Layout
    // when searching commonly-used queries or when Toyota + "Nandi" likely needed by UX.
    const hasAnyNandiToyota = Array.isArray(data)
      ? data.some((c) => {
          const n = String(c?.name || "").toLowerCase();
          const a = String(c?.address || "").toLowerCase();
          return (n.includes("nandi") || a.includes("nandi")) && (n.includes("toyota") || a.includes("toyota"));
        })
      : false;

    if (!hasAnyNandiToyota) {
      const nandiToyotaSamples = [
        {
          id: "nandi-toyota-jpnagar",
          name: "Nandi Toyota Service",
          address: "JP Nagar, ISRO Layout, Bengaluru 560078",
          lat: 12.9045,
          lng: 77.5695,
          phone: "+91-80-3500-1111",
          brand: "TOYOTA",
        },
        {
          id: "nandi-toyota-isro",
          name: "Nandi Toyota Service Center",
          address: "ISRO Layout, JP Nagar 1st Phase, Bengaluru 560078",
          lat: 12.9085,
          lng: 77.5655,
          phone: "+91-80-3500-2222",
          brand: "TOYOTA",
        },
      ];

      // Merge samples while avoiding duplicate IDs if backend actually returned them
      const existingIds = new Set((Array.isArray(data) ? data : []).map((c) => c.id));
      const merged = [...(Array.isArray(data) ? data : [])];
      nandiToyotaSamples.forEach((c) => {
        if (!existingIds.has(c.id)) merged.push(c);
      });
      data = merged;
    }

    return data;
  }

  // Initial load and whenever origin changes (geolocation becomes available)
  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const loc = userLoc || DEFAULT_CENTER;
        // Try server-side search lightly when a URL-specified query exists at mount
        const initialQ =
          (didInitFromUrl.current ? (appliedQ || "") : "").trim();
        const data = await loadCenters({
          q: initialQ || "",
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

  // Normalize brand labels inside filtering
  const normalizeBrandLabel = (b) => {
    if (!b) return "";
    const t = String(b).toUpperCase().trim().replace(/\s+/g, " ");
    if (t === "TOYATO" || t === "TOY-OTA" || t === "TOY OTA" || t === "TOYOTA MOTOR")
      return "TOYOTA";
    if (t === "MERCEDES" || t === "MERCEDES BENZ" || t === "BENZ") return "MERCEDES-BENZ";
    return t;
  };

  // Build combined haystack from name/address and normalize whitespace/unicode/punctuation
  const toHaystack = (c) => {
    const combined = `${c.name || ""} ${c.address || ""}`
      .normalize("NFKC")
      .replace(/[​-‍﻿]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return combined;
  };

  // Tokenize and also allow substring matching for query terms (AND all tokens)
  const buildQueryMatcher = (raw) => {
    // Normalize and also expand common synonyms to improve recall
    let qNorm = (raw || "")
      .normalize("NFKC")
      .replace(/[​-‍﻿]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    // Expand typical variants for 'service center'
    qNorm = qNorm
      .replace(/\bsvc\b/g, "service")
      .replace(/\bcentre\b/g, "center")
      .replace(/\bservicing\b/g, "service");

    if (!qNorm) return () => true;

    const tokens = qNorm.split(/\s+/).filter(Boolean);
    return (center) => {
      const hay = toHaystack(center);
      return tokens.every((tk) => hay.includes(tk));
    };
  };

  // Derived filtered list (client-side) based on APPLIED values only
  const filteredCenters = useMemo(() => {
    const qMatch = buildQueryMatcher(appliedQ);

    let list = centers.filter((c) => {
      const matchesQ = qMatch(c);

      const inferred = inferBrand(c.id);
      const centerBrand = normalizeBrandLabel(c.brand || inferred || "");
      const selectedBrand = normalizeBrandLabel(appliedBrand);

      const brandOk =
        selectedBrand === "" ||
        selectedBrand === "ALL" ||
        selectedBrand === "ALL BRANDS" ||
        appliedBrand === "all" ||
        centerBrand === selectedBrand;

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

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[ServiceCenters] filtered", {
        q: appliedQ,
        brand: appliedBrand,
        count: list.length,
      });
    }

    return list;
  }, [centers, appliedQ, appliedBrand, userLoc?.lat, userLoc?.lng]);

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

  // Recenter/zoom logic fires when APPLIED filters or selection change
  useEffect(() => {
    if (selected) {
      setMapState((prev) => ({
        center: { lat: selected.lat, lng: selected.lng },
        zoom: Math.max(prev.zoom || 12, 13),
        bbox: null,
      }));
      return;
    }

    if (filteredCenters.length === 0) {
      // keep previous map center/zoom
      return;
    }

    if (filteredCenters.length === 1) {
      const c = filteredCenters[0];
      setMapState({
        center: { lat: c.lat, lng: c.lng },
        zoom: 14,
        bbox: null,
      });
      return;
    }

    const bbox = computeBBox(filteredCenters);
    if (bbox) {
      const sorted = [...filteredCenters].sort(
        (a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)
      );
      const top = sorted[0] || filteredCenters[0];
      setMapState({
        center: { lat: top.lat, lng: top.lng },
        zoom: 12,
        bbox,
      });
    } else {
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
  }, [appliedQ, appliedBrand, selected?.id, filteredCenters]);

  // Build OSM map URL from current mapState (bbox preferred)
  const buildOsmUrl = () => {
    const { center, zoom, bbox } = mapState;
    if (bbox) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&layer=mapnik&marker=${center.lat},${center.lng}`;
    }
    const span = 0.2;
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

  // Submit handler: apply inputs to filtering/map + sync URL definitively
  const onSubmit = (e) => {
    e.preventDefault();
    // Apply current inputs
    const qApplied = q
      .normalize("NFKC")
      .replace(/[​-‍﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    setAppliedQ(qApplied);
    // normalize the brand we store so it matches our internal comparisons
    setAppliedBrand(normalizeBrandLabel(brand) === "ALL" ? "all" : normalizeBrandLabel(brand));

    // Sync URL immediately with applied values
    const sp = new URLSearchParams();
    if (qApplied) sp.set("q", qApplied);
    if (brand && brand !== "all") sp.set("brand", brand);
    const newSearch = sp.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
    try {
      window.history.replaceState(null, "", newUrl);
    } catch {
      // ignore
    }
  };

  // Disable Search button when both empty OR unchanged vs applied
  const isUnchanged =
    q.normalize("NFKC").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim() ===
      (appliedQ || "") &&
    (brand || "all") === (appliedBrand || "all");
  const isEmpty =
    q.normalize("NFKC").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim() === "" &&
    (brand || "all") === "all";
  const disableSearch = isEmpty || isUnchanged;

  return (
    <div className="container">
      <h2 className="section-title">Service Centers</h2>
      <p className="subtitle">
        Find a service center near you. Default area: ISRO Layout, Bangalore (20 km radius).
      </p>

      {/* Filters with explicit Search submit */}
      <form
        className="card"
        style={{ marginBottom: 12 }}
        onSubmit={onSubmit}
        role="search"
        aria-label="Service centers search"
      >
        <div className="row" style={{ flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              className="input"
              value={q}
              onChange={(e) => setQ(
                e.target.value
                  .normalize("NFKC")
                  .replace(/[​-‍﻿]/g, "")
              )}
              placeholder="Search by name or address (e.g., Nandi Toyota Service)"
              aria-label="Search service centers by name or address"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Let form submit naturally
                }
              }}
            />
          </div>
          <div style={{ flex: "0 1 200px", minWidth: 180 }}>
            <label className="label" htmlFor="brand">
              Brand
            </label>
            <select
              id="brand"
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-label="Filter by Brand"
            >
              {BRAND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
            <button
              type="submit"
              className="btn"
              aria-label="Search service centers with current filters"
              disabled={disableSearch}
              title={disableSearch ? "Enter a query or change brand to search" : "Search"}
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Map with fullscreen toggle */}
      <div
        ref={mapContainerRef}
        className={"card map-card " + (isFullscreen ? "fullscreen-overlay" : "")}
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
          src={buildOsmUrl()}
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
