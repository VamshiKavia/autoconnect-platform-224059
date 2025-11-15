import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - lists service centers and shows a map placeholder.
 *
 * - Fetches from /service-centers
 * - Allows client-side filter by city name (substring match)
 * - Displays a simple "map" placeholder with selected center coordinates
 */
export default function ServiceCenters() {
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    apiGet("/service-centers")
      .then((data) => {
        setCenters(data || []);
        if (data && data.length) setSelectedId(data[0].id);
      })
      .catch((e) => setError(e?.message || "Failed to load service centers"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [centers, query]);

  const selected = useMemo(
    () => filtered.find((c) => c.id === selectedId) || filtered[0],
    [filtered, selectedId]
  );

  return (
    <div className="container">
      <h2 className="section-title">Service Centers</h2>
      <p className="subtitle">
        Find authorized centers near you. Filter by city or area.
      </p>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="label" htmlFor="city">Filter by city or area</label>
        <input
          id="city"
          className="input"
          placeholder="e.g., Bengaluru, JP Nagar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="city-help"
        />
        <div id="city-help" className="subtitle" style={{ marginTop: 6 }}>
          Showing {filtered.length} of {centers.length} centers
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="grid" style={{ alignItems: "stretch" }}>
          <div className="card" style={{ gridColumn: "span 6" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {filtered.map((c) => (
                <li
                  key={c.id}
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    background: selectedId === c.id ? "#eef2ff" : "#fff",
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedId(c.id)}
                  role="button"
                  aria-pressed={selectedId === c.id}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{c.name}</strong>
                    <span className="subtitle">{c.phone}</span>
                  </div>
                  <div className="subtitle">{c.address}</div>
                  <div className="subtitle">Lat: {c.lat}, Lng: {c.lng}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ gridColumn: "span 6" }}>
            <h3 className="section-title" style={{ marginBottom: 8 }}>
              Map
            </h3>
            {!selected ? (
              <div className="subtitle">Select a service center to view on map.</div>
            ) : (
              <div
                aria-label="Map placeholder"
                style={{
                  width: "100%",
                  height: 320,
                  borderRadius: 12,
                  border: "1px dashed #9CA3AF",
                  background:
                    "repeating-linear-gradient(45deg, #F9FAFB, #F9FAFB 10px, #F3F4F6 10px, #F3F4F6 20px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6B7280",
                  position: "relative",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 600 }}>{selected.name}</div>
                  <div className="subtitle">{selected.address}</div>
                  <div className="subtitle">
                    Coords: {selected.lat}, {selected.lng}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Map integration coming soon
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    fontSize: 12,
                    color: "#9CA3AF",
                  }}
                >
                  Placeholder
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
