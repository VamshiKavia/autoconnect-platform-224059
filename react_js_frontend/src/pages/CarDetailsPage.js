import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import CarDetails from "../components/CarDetails";

/**
// PUBLIC_INTERFACE
 * CarDetailsPage - fetches a single car by id and renders CarDetails.
 *
 * Route: /cars/:id
 * GET /cars/:id (expects backend); if not available, page shows a graceful error unless mock service supports it.
 */
export default function CarDetailsPage() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        // Try to get list then find, as our mock only implements /cars.
        // If backend supports /cars/:id, it will return the single car.
        const maybeSingle = await apiGet(`/cars/${encodeURIComponent(id)}`).catch(() => null);
        if (active && maybeSingle && !Array.isArray(maybeSingle)) {
          setCar(maybeSingle);
          return;
        }
        const list = await apiGet("/cars");
        const found = Array.isArray(list) ? list.find((c) => String(c.id) === String(id)) : null;
        if (!found) {
          throw new Error("Car not found");
        }
        if (active) setCar(found);
      } catch (e) {
        if (active) setErr(e?.message || "Failed to load car");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="container">
      {loading ? (
        <div className="card">Loading details...</div>
      ) : err ? (
        <div className="card" style={{ color: "var(--error)" }}>
          {err}
        </div>
      ) : (
        <CarDetails car={car} />
      )}
    </div>
  );
}
