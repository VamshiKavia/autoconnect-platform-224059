import { useEffect, useRef, useState } from "react";
import { apiGet, apiHealth, getApiBase } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Home - shows latest car launches
 */
export default function Home() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState({ ok: null, status: null, error: "" });
  const [error, setError] = useState("");

  // IntersectionObserver to add 'is-visible' on scroll for .fade-in-up elements
  const ioRef = useRef(null);
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".fade-in-up"));
    // Respect reduced motion: make visible immediately
    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

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
  }, []);

  useEffect(() => {
    // Kick off healthcheck in parallel
    apiHealth().then((h) => setHealth(h));

    apiGet("/cars")
      .then(setCars)
      .catch((e) => setError(e?.message || "Failed to load cars"))
      .finally(() => setLoading(false));
  }, []);

  // Data for Latest Launches grid
  // Normalize all images to use public root-relative paths under /assets and provide width/height
  const latestLaunches = [
    {
      id: "aerexa", // renamed per request from "Vertesa"
      name: "Aerexa",
      description: "Refined aerodynamics meet everyday efficiency.",
      // Use existing asset from attachments mapped under public/assets by deployment
      img: "/assets/20251113_094539_vecteezy_modern-car-isolated-on-transparent-background-3d-rendering_19609795.png",
      alt: "Ocean Motors Aerexa in pearl white, side profile",
      width: 640,
      height: 360,
    },
    {
      id: "straton-sport",
      name: "Straton Sport",
      description: "Agile handling with a responsive powertrain.",
      img: "/assets/20251113_111417_vecteezy_sport-car-isolated-on-transparent-background-3d-rendering_19763520.png",
      alt: "Gray sport coupé on neutral background, front 3/4 angle",
      width: 640,
      height: 360,
    },
    {
      id: "azure-gt",
      name: "Azure GT",
      description: "Grand touring comfort with modern dynamics.",
      img: "/assets/20251113_111423_vecteezy_sport-car-isolated-on-transparent-background-3d-rendering_19553326.png",
      alt: "Blue grand tourer coupe on neutral background, side profile",
      width: 640,
      height: 360,
    },
  ];

  return (
    <div className="container">
      {/* New Launch hero/card section */}
      <section
        className="card"
        aria-labelledby="new-launch-heading"
        style={{
          padding: 0,
          overflow: "hidden",
          marginBottom: 16,
          borderRadius: "var(--radius)",
          background: "linear-gradient(180deg, var(--surface), #fff)",
        }}
      >
        <div
          className="row"
          style={{
            alignItems: "stretch",
            gap: 0,
            flexWrap: "wrap",
          }}
        >
          <div className="center-col vcenter-col" style={{ flex: "1 1 360px", padding: 16 }}>
            <h2 id="new-launch-heading" className="section-title" style={{ marginBottom: 6 }}>
              New Launch | Aerexa
            </h2>
            <div className="subtitle" style={{ marginBottom: 10 }}>
              Introducing our latest model with refined aerodynamics and performance.
            </div>
            <p style={{ color: "var(--primary)", lineHeight: 1.6 }}>
              Experience precision engineering, elegant minimalism, and cutting-edge driver
              assistance. Built for efficiency and comfort, crafted for the road ahead.
            </p>
            <div style={{ height: 12 }} />
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <a className="btn" href="#latest-launch-details">Explore</a>
              <a
                className="btn secondary"
                href="#latest-launch-details"
                aria-label="Learn more about the new launch"
              >
                Learn more
              </a>
            </div>
          </div>
          <div
            style={{
              flex: "1 1 420px",
              minHeight: 220,
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
            }}
          >
            {/* Use root-relative public path so it works in CRA and previews */}
            <img
              src="/assets/20251113_094539_vecteezy_modern-car-isolated-on-transparent-background-3d-rendering_19609795.png"
              alt="Ocean Motors Aerexa latest car model"
              className="hover-zoom"
              style={{
                width: "100%",
                maxWidth: 640,
                height: "auto",
                borderRadius: 8,
                objectFit: "contain",
                display: "block",
                background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
              }}
              width={640}
              height={360}
              loading="eager"
            />
          </div>
        </div>
      </section>

      <h2 className="section-title" id="latest-launch-details">Latest Launches</h2>
      <p className="subtitle">Discover our newest models and innovations.</p>

      {/* Latest Launches Grid (cards with subtle animations) */}
      <section className="launch-grid" aria-label="Latest launches cards" style={{ marginBottom: 16 }}>
        {latestLaunches.map((item, idx) => (
          <article
            key={item.id}
            className="card launch-card fade-in-up"
            style={{ animationDelay: `${idx * 100}ms` }}
            tabIndex={-1}
          >
            <figure style={{ margin: 0 }}>
              <img
                src={item.img}
                alt={item.alt}
                className="hover-zoom"
                width={item.width}
                height={item.height}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 8,
                  objectFit: "contain",
                  background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
                }}
              />
              <figcaption className="sr-only" aria-hidden="true">
                {item.name}
              </figcaption>
            </figure>
            <div style={{ height: 12 }} />
            <h3 className="section-title" style={{ marginBottom: 4 }}>{item.name}</h3>
            <p className="subtitle" style={{ marginBottom: 12 }}>{item.description}</p>
            <button
              className="btn"
              aria-label={`View details for ${item.name}`}
              onClick={() => {
                // Placeholder CTA action — in a full app this would navigate
                // to a model details page or open a modal
                alert(`${item.name} details coming soon`);
              }}
            >
              View Details
            </button>
          </article>
        ))}
      </section>

      {/* Health status banner */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            Backend: {getApiBase()}
            {health.ok === false ? (
              <span style={{ color: "var(--error)", marginLeft: 8 }}>
                Unreachable (status {health.status || "n/a"})
              </span>
            ) : health.ok === true ? (
              <span style={{ color: "var(--success)", marginLeft: 8 }}>
                Online (status {health.status})
              </span>
            ) : (
              <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                Checking...
              </span>
            )}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Paths auto-prefixed with /api
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading...</div>
      ) : error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
        <div className="grid">
          {cars.map((c) => (
            <div key={c.id} className="card" style={{ gridColumn: "span 4" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{c.name}</strong>
                {c.is_new ? (
                  <span style={{ color: "var(--success)", fontSize: 12 }}>NEW</span>
                ) : null}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
                {c.type} • {c.year}
              </div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>
                ${Number(c.price).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
