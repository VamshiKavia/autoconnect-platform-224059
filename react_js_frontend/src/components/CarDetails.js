import { Link } from "react-router-dom";

/**
// PUBLIC_INTERFACE
 * CarDetails - detailed car specification view.
 *
 * Props:
 * - car: { id, name, type, year, price, is_new, imageUrl?, specs?, highlights?[] }
 */
export default function CarDetails({ car }) {
  if (!car) {
    return <div className="card">No details available.</div>;
  }
  const img = car.imageUrl || "/assets/launch-hero-19609795.png";
  return (
    <article className="card" aria-labelledby="car-detail-title">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 id="car-detail-title" className="section-title" style={{ marginBottom: 6 }}>
            {car.name}
          </h2>
          <div className="subtitle">
            {(car.type || "Car")} • {car.year || "—"}
            {car.is_new ? <span style={{ color: "var(--success)", marginLeft: 8 }}>NEW</span> : null}
          </div>
        </div>
        <Link className="btn secondary" to="/cars" aria-label="Back to all cars">
          Back to All
        </Link>
      </div>

      <div className="row" style={{ gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ flex: "2 1 420px" }}>
          <img
            src={img}
            alt={`${car.name} ${car.type || ""}`}
            className="hover-zoom"
            width={800}
            height={450}
            loading="eager"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 8,
              objectFit: "contain",
              background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
            }}
          />
        </div>
        <div style={{ flex: "1 1 280px" }}>
          <div className="card" style={{ background: "#fff" }}>
            <div className="subtitle" style={{ marginBottom: 6 }}>
              Price
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {typeof car.price !== "undefined" ? `$${Number(car.price).toLocaleString()}` : "Contact sales"}
            </div>
            <div style={{ height: 12 }} />
            <button className="btn" onClick={() => alert("Proceed to booking flow (coming soon)")}>
              Book a Test Drive
            </button>
            <button
              className="btn secondary"
              style={{ marginLeft: 8 }}
              onClick={() => alert("Contact sales (coming soon)")}
            >
              Contact Sales
            </button>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="subtitle" style={{ marginBottom: 8 }}>
              Highlights
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--primary)" }}>
              {(car.highlights && car.highlights.length ? car.highlights : [
                "Advanced driver assistance",
                "Premium interior",
                "Efficient powertrain",
              ]).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="subtitle" style={{ marginBottom: 8 }}>
              Specifications
            </div>
            <SpecTable specs={car.specs || { engine: "2.0L", transmission: "Automatic", drivetrain: "FWD" }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function SpecTable({ specs }) {
  const entries = Object.entries(specs || {});
  if (entries.length === 0) return <div className="subtitle">No specs available.</div>;
  return (
    <div role="table" aria-label="Specifications" style={{ width: "100%" }}>
      {entries.map(([k, v]) => (
        <div key={k} role="row" className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
          <div role="cell" className="subtitle" style={{ margin: 0 }}>
            {formatKey(k)}
          </div>
          <div role="cell" style={{ fontWeight: 600 }}>{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

function formatKey(k) {
  return String(k)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
