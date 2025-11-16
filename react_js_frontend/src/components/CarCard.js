import { Link } from "react-router-dom";

/**
// PUBLIC_INTERFACE
 * CarCard - compact car summary card with "View Details" action.
 *
 * Props:
 * - car: { id, name, type, year, price, imageUrl?, is_new? }
 * - onViewDetails?: function(car) optional click handler override
 */
export default function CarCard({ car, onViewDetails }) {
  const img = car.imageUrl || "/assets/launch-sport-grey-19763520.png";
  const alt = `${car.name} ${car.type || ""}`.trim();

  return (
    <article className="card launch-card" aria-labelledby={`car-${car.id}-title`}>
      <figure style={{ margin: 0 }}>
        <img
          src={img}
          alt={alt}
          className="hover-zoom"
          width={640}
          height={360}
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 8,
            objectFit: "contain",
            background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
          }}
        />
        <figcaption className="sr-only">{car.name}</figcaption>
      </figure>
      <div style={{ height: 10 }} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 id={`car-${car.id}-title`} className="section-title" style={{ marginBottom: 0 }}>
          {car.name}
        </h3>
        {car.is_new ? (
          <span style={{ color: "var(--success)", fontSize: 12, fontWeight: 600 }}>NEW</span>
        ) : null}
      </div>
      <div className="subtitle" style={{ marginTop: 6 }}>
        {(car.type || "Car")} • {car.year || "—"}
      </div>
      <div style={{ marginTop: 6, fontWeight: 600 }}>
        {typeof car.price !== "undefined" ? `$${Number(car.price).toLocaleString()}` : "—"}
      </div>
      <div style={{ height: 12 }} />
      {onViewDetails ? (
        <button className="btn" aria-label={`View details for ${car.name}`} onClick={() => onViewDetails(car)}>
          View Details
        </button>
      ) : (
        <Link className="btn" aria-label={`View details for ${car.name}`} to={`/cars/${car.id}`}>
          View Details
        </Link>
      )}
    </article>
  );
}
