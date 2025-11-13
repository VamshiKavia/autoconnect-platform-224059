import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Services - shows available services and featured service categories (cards)
 *
 * Sections:
 * - Featured Categories: Car services, Car washing, Used cars, Car paintings, Car selling
 * - Dynamic services list from backend (existing)
 *
 * Accessibility:
 * - Local images under /assets with meaningful alt text
 * - Respects prefers-reduced-motion
 * - Keyboard-focusable cards
 */
export default function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  // Reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Observe .fade-in-up for scroll-in animation (skipped if reduced motion)
  const ioRef = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const elements = Array.from(document.querySelectorAll(".services-card.fade-in-up"));
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
    apiGet("/services")
      .then(setServices)
      .catch((e) => setError(e?.message || "Failed to load services"));
  }, []);

  // Featured service categories with local images placed under public/assets
  const categories = [
    {
      key: "car-services",
      title: "Car Services",
      description: "Scheduled maintenance, diagnostics, and repairs performed by certified technicians.",
      img: "/assets/launch-hero-19609795.png",
      alt: "Sedan in studio light representing car maintenance services",
      ctaLabel: "Explore Services",
    },
    {
      key: "car-washing",
      title: "Car Washing",
      description: "Exterior wash, interior detailing, and protective coatings for a spotless finish.",
      img: "/assets/launch-sport-grey-19763520.png",
      alt: "Gray sports car clean finish representing car washing",
      ctaLabel: "Book a Wash",
    },
    {
      key: "used-cars",
      title: "Used Cars",
      description: "Certified pre-owned vehicles inspected for quality, reliability, and value.",
      img: "/assets/launch-sport-blue-19553326.png",
      alt: "Blue coupe side profile representing certified used cars",
      ctaLabel: "Browse Inventory",
    },
    {
      key: "car-paintings",
      title: "Car Paintings",
      description: "Premium repainting, scratch repair, and color matching using OEM-grade materials.",
      img: "/assets/launch-sport-grey-19763520.png",
      alt: "Detailed sports car finish representing body and paint work",
      ctaLabel: "Get a Quote",
    },
    {
      key: "car-selling",
      title: "Car Selling",
      description: "List, appraise, and sell your car with transparent pricing and expert guidance.",
      img: "/assets/launch-hero-19609795.png",
      alt: "Car on plain background representing car selling service",
      ctaLabel: "Sell Your Car",
    },
  ];

  return (
    <div className="container">
      <h2 className="section-title">Services</h2>
      <p className="subtitle">Professional maintenance and care.</p>

      {/* Featured Categories - responsive grid, mobile-first */}
      <section aria-label="Featured service categories" style={{ marginBottom: 16 }}>
        <div
          className="launch-grid"
          style={{
            // reuse launch-grid for consistent 12-col structure
            // cards will adapt using responsive CSS in theme.css
          }}
        >
          {categories.map((cat, idx) => (
            <article
              key={cat.key}
              className="card services-card fade-in-up launch-card"
              style={{ animationDelay: `${idx * 90}ms` }}
              tabIndex={0}
              aria-labelledby={`${cat.key}-title`}
            >
              <figure style={{ margin: 0 }}>
                <img
                  src={cat.img}
                  alt={cat.alt}
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
                <figcaption className="sr-only" id={`${cat.key}-fig`}>
                  {cat.title}
                </figcaption>
              </figure>
              <div style={{ height: 12 }} />
              <h3 className="section-title" id={`${cat.key}-title`} style={{ marginBottom: 6 }}>
                {cat.title}
              </h3>
              <p className="subtitle" style={{ marginBottom: 12 }}>{cat.description}</p>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button
                  className="btn"
                  aria-label={`${cat.ctaLabel} for ${cat.title}`}
                  onClick={() => alert(`${cat.title}: ${cat.ctaLabel}`)}
                >
                  {cat.ctaLabel}
                </button>
                <button
                  className="btn secondary"
                  aria-label={`Learn more about ${cat.title}`}
                  onClick={() => alert(`${cat.title}: Learn more`)}
                >
                  Learn More
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Backend services list (existing) */}
      {error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="grid">
          {services.map((s) => (
            <div key={s.id} className="card" style={{ gridColumn: "span 4" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{s.name}</strong>
                <span className="subtitle">${s.price}</span>
              </div>
              <div style={{ marginTop: 6, color: "var(--muted)" }}>
                Duration: {s.duration_min} min
              </div>
              <button className="btn" style={{ marginTop: 12 }}>Book</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
