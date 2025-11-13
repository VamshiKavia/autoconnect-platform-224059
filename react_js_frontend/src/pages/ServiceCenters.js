import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - Find service centers with map, filters, and geolocation sorting.
 *
 * Enhancements in this revision:
 * - Seed and normalize specific Nandi Toyota location (Nandi Toyota - TES) with exact lat/lng.
 * - Normalize brand to 'TOYOTA' and keep alias 'Nandi toyoto' for matching.
 * - Expanded query normalization to match aliases like 'Nandi Toyota', 'Nandi Toyota Service', 'Nandi Toyota - TES'.
 * - On successful filter submit, the map recenters to the Nandi Toyota - TES coordinates at a reasonable zoom.
 * - Backward compatible: if backend already returns the entry, do not duplicate.
 * - Enrich dataset with "Nandi Toyota - Sales - Bannerghatta Road" (TOYOTA) and normalize aliases so searches for "Toyota", "Nandi Toyota", or "Nandi Toyota Service" surface it; keep enrichment additive and idempotent.
 *
 * Verification targets:
 * - q='Nandi Toyota Service' + brand='TOYOTA' -> shows "Nandi Toyota - TES" and recenters to 12.935863923120667,77.5727056884466
 */
export default function ServiceCenters() {
  // ISRO Layout default center
  const DEFAULT_CENTER = { lat: 12.9022, lng: 77.566 };
  const DEFAULT_RADIUS_KM = 20;

  // Canonical Nandi Toyota - TES location (provided)
  const NANDI_TOYOTA_CANON = {
    id: "nandi-toyota-tes-kr-road",
    name: "Nandi Toyota - TES",
    address:
      "4117, Krishna Rajendra Rd, Shastri Nagar, Banashankari Stage II, Banashankankari, Bengaluru, Karnataka 560004",
    lat: 12.935863923120667,
    lng: 77.5727056884466,
    phone: undefined, // optional
    brand: "TOYOTA",
    // aliases for matching (lowercase for internal checks)
    aliases: [
      "nandi toyota",
      "nandi toyota service",
      "nandi toyota - tes",
      "nandi toyoto", // keep original typo in aliases for matching
      "nandi toyota tes",
      "nandi-toyota tes",
      "toyota",
    ],
  };

  // Canonical Nandi Toyota - Sales - Bannerghatta Road (provided in task)
  const NANDI_TOYOTA_SALES_BANNERGHATTA = {
    id: "nandi-toyota-sales-bannerghatta-road",
    name: "Nandi Toyota - Sales - Bannerghatta Road",
    address:
      "43, 1B, Bannerghatta Rd, DRC Post, Bhavani Nagar, Bengaluru, Karnataka 560029",
    lat: 12.932031230477637,
    lng: 77.59790932032661,
    phone: undefined,
    brand: "TOYOTA",
    url:
      "https://www.google.com/maps/place/Nandi+Toyota+-+Sales+-+Bannerghatta+Road/@12.9348754,77.5127653,12z/data=!4m10!1m2!2m1!1stoyota!3m6!1s0x3bae158b35dd4c83:0x527b4cff56e8ce9f!8m2!3d12.9279179!4d77.6007604!15sCgZ0b3lvdGEiA4gBAVoIIgZ0b3lvdGGSAQ10b3lvdGFfZGVhbGVyqgFeCg0vZy8xMWJjNnc2NzJfCggvbS8wN21iNgoKL20vMGg1eTFqMBABKgoiBnRveW90YSgAMh0QASIZIO7uMxa5twMxwjxCmPtRFVvN6PLiR_q8rjIKEAIiBnRveW90YeABAA!16s%2Fg%2F11v3hxx2qm?entry=ttu&g_ep=EgoyMDI1MTExMC4wIKXMDSoASAFQAw%3D%3D",
    aliases: [
      "nandi toyota",
      "nandi toyota bannerghatta",
      "nandi toyota sales bannerghatta road",
      "nandi toyota service bannerghatta",
      "nandi toyota - sales - bannerghatta road",
      "toyota",
      "nandi toyota showroom bannerghatta",
    ],
  };

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

  // Utility: lowercase normalized string for alias compare
  const normalizeForAlias = (s) =>
    String(s || "")
      .normalize("NFKC")
      .replace(/[​-‍﻿]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

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
      data = [];
    }

    // Backward compatibility: seed specific Nandi Toyota - TES if not present
    const list = Array.isArray(data) ? [...data] : [];

    const hasExactNandiToyota =
      list.find(
        (c) =>
          normalizeForAlias(c?.name).includes("nandi toyota") &&
          Math.abs(Number(c?.lat) - NANDI_TOYOTA_CANON.lat) < 0.0005 &&
          Math.abs(Number(c?.lng) - NANDI_TOYOTA_CANON.lng) < 0.0005
      ) != null;

    if (!hasExactNandiToyota) {
      // Also check by id to avoid duplicates if our id already exists
      const hasById = list.some((c) => c.id === NANDI_TOYOTA_CANON.id);
      if (!hasById) {
        list.push({ ...NANDI_TOYOTA_CANON });
      }
    }

    // Seed "Nandi Toyota - Sales - Bannerghatta Road" if not present (idempotent by id + coords + name)
    const hasSalesById = list.some(
      (c) => c.id === NANDI_TOYOTA_SALES_BANNERGHATTA.id
    );
    const hasSalesByCoords =
      list.find(
        (c) =>
          Math.abs(Number(c?.lat) - NANDI_TOYOTA_SALES_BANNERGHATTA.lat) <
            0.0005 &&
          Math.abs(Number(c?.lng) - NANDI_TOYOTA_SALES_BANNERGHATTA.lng) <
            0.0005 &&
          normalizeForAlias(c?.name).includes(
            normalizeForAlias(NANDI_TOYOTA_SALES_BANNERGHATTA.name)
          )
      ) != null;
    if (!hasSalesById && !hasSalesByCoords) {
      list.push({ ...NANDI_TOYOTA_SALES_BANNERGHATTA });
    }

    // Normalize brand info to ensure TOYOTA canonical brand where applicable
    const normalized = list.map((c) => {
      const normBrand = (() => {
        const raw = String(c.brand || "").toUpperCase().trim();
        if (raw === "TOYATO" || raw === "TOY-OTA" || raw === "TOY OTA" || raw === "TOYOTA MOTOR")
          return "TOYOTA";
        if (raw === "BENZ" || raw === "MERCEDES" || raw === "MERCEDES BENZ") return "MERCEDES-BENZ";
        return raw || (normalizeForAlias(c.name).includes("toyota") ? "TOYOTA" : c.brand || "");
      })();

      // Improve display name for known alias "Nandi toyoto"
      const nameNorm = normalizeForAlias(c.name);
      if (nameNorm.includes("nandi toyoto") || c.id === NANDI_TOYOTA_CANON.id) {
        return {
          ...c,
          name: "Nandi Toyota - TES",
          brand: "TOYOTA",
        };
      }
      // Normalize the sales Bannerghatta record naming and brand if matched by coords or id
      const matchesSalesByCoords =
        Math.abs(Number(c?.lat) - NANDI_TOYOTA_SALES_BANNERGHATTA.lat) <
          0.0005 &&
        Math.abs(Number(c?.lng) - NANDI_TOYOTA_SALES_BANNERGHATTA.lng) < 0.0005;
      if (
        c.id === NANDI_TOYOTA_SALES_BANNERGHATTA.id ||
        matchesSalesByCoords ||
        nameNorm.includes("nandi toyota") &&
          (nameNorm.includes("bannerghatta") ||
            nameNorm.includes("sales bannerghatta"))
      ) {
        return {
          ...c,
          name: "Nandi Toyota - Sales - Bannerghatta Road",
          brand: "TOYOTA",
          aliases: Array.from(
            new Set([
              ...(c.aliases || []),
              ...NANDI_TOYOTA_SALES_BANNERGHATTA.aliases,
            ])
          ),
        };
      }
      return { ...c, brand: normBrand };
    });

    return normalized;
  }

  // Initial load and whenever origin changes (geolocation becomes available)
  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const loc = userLoc || DEFAULT_CENTER;
        const initialQ = (didInitFromUrl.current ? (appliedQ || "") : "").trim();
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
    if (t === "TOYATO" || t === "TOY-OTA" || t === "TOY OTA" || t === "TOYOTA MOTOR") return "TOYOTA";
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

  // Tokenize and also allow substring matching for query terms (AND all tokens).
  // Expand alias handling so 'Nandi Toyota', 'Nandi Toyota Service', 'Nandi Toyota - TES' match.
  const buildQueryMatcher = (raw) => {
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
      .replace(/\bservicing\b/g, "service")
      // Common alias fixes for 'Nandi Toyota'
      .replace(/\btoyoto\b/g, "toyota");

    if (!qNorm) return () => true;

    const tokens = qNorm.split(/\s+/).filter(Boolean);
    return (center) => {
      const hay = toHaystack(center);
      const aliasBag = new Set([
        ...((center.aliases || []).map((a) => normalizeForAlias(a)) || []),
        normalizeForAlias(center.name),
        normalizeForAlias(center.address),
        // generic brand tokens to assist searches like "Toyota"
        ...(String(center.brand || "")
          ? [normalizeForAlias(center.brand)]
          : []),
      ]);
      // If alias bag contains 'nandi toyota' variants and query looks like it, treat as match
      const aliasJoined = Array.from(aliasBag).join(" ");
      return tokens.every((tk) => hay.includes(tk) || aliasJoined.includes(tk));
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
        zoom: Math.max(prev.zoom || 12, 14),
        bbox: null,
      }));
      return;
    }

    if (filteredCenters.length === 0) {
      // keep previous map center/zoom
      return;
    }

    // If the top result is a Nandi Toyota match and brand TOYOTA, ensure explicit recenter
    const top = filteredCenters[0];
    if (top && normalizeBrandLabel(appliedBrand) === "TOYOTA") {
      const topName = normalizeForAlias(top.name);
      if (
        top.id === NANDI_TOYOTA_CANON.id ||
        topName.includes("nandi toyota - tes")
      ) {
        setMapState({
          center: { lat: NANDI_TOYOTA_CANON.lat, lng: NANDI_TOYOTA_CANON.lng },
          zoom: 15,
          bbox: null,
        });
        return;
      }
      if (
        top.id === NANDI_TOYOTA_SALES_BANNERGHATTA.id ||
        topName.includes("nandi toyota - sales - bannerghatta road") ||
        (Math.abs(Number(top.lat) - NANDI_TOYOTA_SALES_BANNERGHATTA.lat) <
          0.0005 &&
          Math.abs(Number(top.lng) - NANDI_TOYOTA_SALES_BANNERGHATTA.lng) <
            0.0005)
      ) {
        setMapState({
          center: {
            lat: NANDI_TOYOTA_SALES_BANNERGHATTA.lat,
            lng: NANDI_TOYOTA_SALES_BANNERGHATTA.lng,
          },
          zoom: 15,
          bbox: null,
        });
        return;
      }
      if (topName.includes("nandi toyota")) {
        // generic fallback to the first Nandi Toyota result
        setMapState({
          center: { lat: top.lat, lng: top.lng },
          zoom: 15,
          bbox: null,
        });
        return;
      }
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
      const first = sorted[0] || filteredCenters[0];
      setMapState({
        center: { lat: first.lat, lng: first.lng },
        zoom: 12,
        bbox,
      });
    } else {
      const sorted = [...filteredCenters].sort(
        (a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)
      );
      const first = sorted[0];
      setMapState({
        center: { lat: first.lat, lng: first.lng },
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

    // If the applied query matches Nandi Toyota aliases and brand TOYOTA, recenter immediately
    const qAlias = normalizeForAlias(qApplied);
    const looksLikeNandiToyota =
      qAlias.includes("nandi toyota") ||
      qAlias.includes("nandi toyoto") ||
      qAlias.includes("nandi toyota service") ||
      qAlias.includes("nandi toyota tes");
    if (looksLikeNandiToyota && normalizeBrandLabel(brand) === "TOYOTA") {
      // Prefer to center on the most relevant match by proximity:
      // If the query contains 'bannerghatta', use the Sales - Bannerghatta coords; else use TES coords.
      if (qAlias.includes("bannerghatta")) {
        setMapState({
          center: {
            lat: NANDI_TOYOTA_SALES_BANNERGHATTA.lat,
            lng: NANDI_TOYOTA_SALES_BANNERGHATTA.lng,
          },
          zoom: 15,
          bbox: null,
        });
      } else {
        setMapState({
          center: { lat: NANDI_TOYOTA_CANON.lat, lng: NANDI_TOYOTA_CANON.lng },
          zoom: 15,
          bbox: null,
        });
      }
    }

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
              onChange={(e) =>
                setQ(
                  e.target.value
                    .normalize("NFKC")
                    .replace(/[​-‍﻿]/g, "")
                )
              }
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
                {c.phone ? <div style={{ marginTop: 8 }}>Phone: {c.phone}</div> : null}
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
