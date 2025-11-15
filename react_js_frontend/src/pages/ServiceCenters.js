import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - shows service center locations with a map placeholder and list view.
 *
 * - Uses env for map key placeholder reference (REACT_APP_MAPS_API_KEY when added)
 * - Fetches centers from backend at /service-centers
 * - Search and brand filter UI provided client-side
 */
export default function ServiceCenters() {
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");

  // Reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Animate-in cards
  const ioRef = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const elements = Array.from(document.querySelectorAll(".sc-card.fade-in-up"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    ioRef.current = observer;
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    apiGet("/service-centers")
      .then(setCenters)
      .catch((e) => setError(e?.message || "Failed to load service centers"));
  }, []);

  const brands = useMemo(() => {
    const s = new Set(centers.map((c) => (c.brand || "").toUpperCase()).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [centers]);

  const filtered = centers.filter((c) => {
    const matchesBrand = brand === "all" || (c.brand || "").toUpperCase() === brand;
    const term = q.trim().toLowerCase();
    const matchesQ =
      !term ||
      (c.name || "").toLowerCase().includes(term) ||
      (c.address || "").toLowerCase().includes(term);
    return matchesBrand && matchesQ;
  });

  // Placeholder for map - when integrating a real map, use env like:
  // const MAPS_KEY = process.env.REACT_APP_MAPS_API_KEY; // ensure not committed and requested via .env
  return (
    <div className="container">
      <h2 className="section-title">Service Centers</h2>
      <p className="subtitle">Find authorized service centers near you.</p>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search by name or address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "2 1 280px" }}
            aria-label="Search service centers"
          />
          <select
            className="input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ flex: "1 1 160px", maxWidth: 240 }}
            aria-label="Filter by brand"
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b === "all" ? "All Brands" : b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map placeholder */}
      <section
        className="card"
        aria-label="Map of service centers"
        style={{
          height: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          background:
            "linear-gradient(180deg, rgba(236, 242, 255, 0.6), rgba(249, 250, 251, 0.6))",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, color: "var(--primary)" }}>Map view coming soon</div>
          <div className="subtitle" style={{ marginTop: 6 }}>
            When enabled, the map will use an env-provided key (e.g., REACT_APP_MAPS_API_KEY).
          </div>
        </div>
      </section>

      {/* List */}
      {error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="launch-grid">
          {filtered.map((c, idx) => (
            <article
              key={c.id || `${c.name}-${idx}`}
              className="card sc-card fade-in-up launch-card"
              style={{ animationDelay: `${idx * 80}ms` }}
              tabIndex={0}
              aria-labelledby={`sc-${idx}-title`}
            >
              <h3 className="section-title" id={`sc-${idx}-title`} style={{ marginBottom: 4 }}>
                {c.name}
              </h3>
              <div className="subtitle" style={{ marginBottom: 8 }}>
                {c.brand ? `${c.brand} • ` : ""}{c.city || c.region || "Location"}
              </div>
              <div style={{ color: "var(--primary)", lineHeight: 1.6 }}>
                {c.address || "Address not available"}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
                Lat: {c.lat ?? "—"} • Lng: {c.lng ?? "—"}
              </div>
              <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
                {c.url ? (
                  <a className="btn" href={c.url} target="_blank" rel="noreferrer">
                    Open in Maps
                  </a>
                ) : (
                  <button className="btn" onClick={() => alert("Map link not available")}>
                    Open in Maps
                  </button>
                )}
                <button
                  className="btn secondary"
                  onClick={() => alert(`Call center: ${c.phone || "N/A"}`)}
                >
                  Call
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
