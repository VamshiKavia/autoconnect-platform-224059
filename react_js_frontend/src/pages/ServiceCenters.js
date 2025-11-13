import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * ServiceCenters - locations with map placeholder
 */
export default function ServiceCenters() {
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    apiGet("/service-centers").then(setCenters);
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">Service Centers</h2>
      <p className="subtitle">Find a service center near you.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            background: "#D1D5DB",
            height: 240,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#374151",
            fontWeight: 600,
          }}
          aria-label="Map placeholder"
        >
          Map Placeholder
        </div>
      </div>

      <div className="grid">
        {centers.map((c) => (
          <div key={c.id} className="card" style={{ gridColumn: "span 6" }}>
            <strong>{c.name}</strong>
            <div className="subtitle">{c.address}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Lat: {c.lat}, Lng: {c.lng}
            </div>
            <div style={{ marginTop: 8 }}>Phone: {c.phone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
