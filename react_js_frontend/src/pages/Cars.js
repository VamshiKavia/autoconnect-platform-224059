import { useEffect, useRef, useState } from "react";
import { apiGet } from "../api/client";
import CarList from "../components/CarList";

/**
// PUBLIC_INTERFACE
 * Cars - All cars listing page at /cars
 *
 * Fetches GET /cars using apiGet (auto /api prefix) with mock fallback when enabled.
 */
export default function Cars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Scroll-in animation hooks for minimalist feel
  const ioRef = useRef(null);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".fade-in-up"));
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    ioRef.current = observer;
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    apiGet("/cars")
      .then((data) => setCars(data || []))
      .catch((e) => setError(e?.message || "Failed to load cars"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h2 className="section-title">All Cars</h2>
      <p className="subtitle">Explore our full lineup.</p>
      <CarList cars={cars} loading={loading} error={error} />
    </div>
  );
}
