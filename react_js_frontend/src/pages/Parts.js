import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Parts - shows spare parts listing
 */
export default function Parts() {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    apiGet("/parts").then(setParts);
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">Spare Parts</h2>
      <p className="subtitle">Quality parts for reliable performance.</p>
      <div className="grid">
        {parts.map((p) => (
          <div key={p.id} className="card" style={{ gridColumn: "span 4" }}>
            <strong>{p.name}</strong>
            <div className="subtitle">SKU: {p.sku}</div>
            <div style={{ marginTop: 6, fontWeight: 600 }}>${p.price}</div>
            <button className="btn" style={{ marginTop: 12 }}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}
