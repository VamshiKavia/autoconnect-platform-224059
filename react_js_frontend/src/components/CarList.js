import CarCard from "./CarCard";

/**
// PUBLIC_INTERFACE
 * CarList - grid list of car cards with loading/error/empty states.
 *
 * Props:
 * - cars: array of car objects
 * - loading: boolean
 * - error: string
 * - onViewDetails?: function(car)
 */
export default function CarList({ cars = [], loading = false, error = "", onViewDetails }) {
  if (loading) {
    return <div className="card">Loading cars...</div>;
  }
  if (error) {
    return (
      <div className="card" style={{ color: "var(--error)" }}>
        {error}
      </div>
    );
  }
  if (!cars || cars.length === 0) {
    return <div className="card">No cars available.</div>;
  }
  return (
    <section className="launch-grid" aria-label="All cars list" style={{ marginBottom: 16 }}>
      {cars.map((c, idx) => (
        <div key={c.id ?? idx} className="fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
          <CarCard car={c} onViewDetails={onViewDetails} />
        </div>
      ))}
    </section>
  );
}
