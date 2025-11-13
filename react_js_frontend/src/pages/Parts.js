import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";
import ResponsiveImage from "../components/ResponsiveImage";

/**
// PUBLIC_INTERFACE
 * Parts - shows spare parts listing
 *
 * This page is extended with dedicated sections/cards for:
 * - Wheels, Magwheels, Car Paints, Head Lights, Car Engine
 *
 * Notes on placeholders:
 * - Images below reference /assets/placeholder-*.png. Replace these with final assets
 *   by copying images to public/assets and changing the src paths here accordingly.
 * - Example: Replace "/assets/placeholder-wheels.png" with "/assets/wheels.png".
 */
export default function Parts() {
  const [parts, setParts] = useState([]);
  const [error, setError] = useState("");

  // Reduced motion preference for animation safety
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Observe .fade-in-up for scroll-in animation (skipped if reduced motion)
  const ioRef = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const elements = Array.from(document.querySelectorAll(".parts-card.fade-in-up"));
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
    apiGet("/parts")
      .then(setParts)
      .catch((e) => setError(e?.message || "Failed to load parts"));
  }, []);

  // Static featured spare parts cards with placeholder imagery
  const featuredParts = [
    {
      key: "wheels",
      title: "Wheels",
      description: "Durable alloy and steel wheel options engineered for stability and comfort.",
      // Updated to use existing Car Engine asset as requested
      img: "/assets/29765.jpg",
      alt: "Close-up of mechanic's hands working on a car wheel during service",
      specs: ["Sizes: 15\"–20\"", "Bolt patterns: 4–5 lug", "Finish: Gloss / Matte"],
    },
    {
      key: "magwheels",
      title: "Magwheels",
      description: "Lightweight magnesium alloy wheels for enhanced performance and handling.",
      // Updated to use provided Magwheels image asset
      img: "/assets/20251113_121007_fe078699-e9e5-4446-80b1-1252a61b6d00.jpg",
      alt: "Magwheels product photo",
      specs: ["Ultra-light build", "Heat-dissipative design", "Anti-corrosion coating"],
    },
    {
      key: "car-paints",
      title: "Car Paints",
      description: "OEM-grade paints with precision color matching and long-lasting protection.",
      img: "/assets/service-worker-painting-car-auto-service.jpg",
      alt: "Service worker painting a car panel in an auto body shop",
      specs: ["Basecoat/Clearcoat", "UV resistant", "Scratch & chip guard"],
    },
    {
      key: "head-lights",
      title: "Head Lights",
      description: "High-visibility LED and HID assemblies with improved beam patterns.",
      img: "/assets/20251113_121158_headlights-hood-black-luxury-car.jpg",
      alt: "Close-up of a modern car headlight assembly illuminated",
      specs: ["LED/HID options", "Plug-and-play fit", "ECE/DOT compliant"],
    },
    {
      key: "car-engine",
      title: "Car Engine",
      description: "Reliable engine assemblies and components tested for peak efficiency.",
      img: "/assets/20251113_120551_image.png",
      alt: "Mechanic inspecting a car engine bay with components visible",
      specs: ["OEM components", "Dyno tested", "Warranty-backed"],
    },
    {
      key: "car-system",
      title: "Car System",
      description:
        "Infotainment, navigation, connectivity, and diagnostics for a smarter drive.",
      img: "/assets/car-system-navigation-interface.jpg",
      alt: "Car system navigation interface",
      specs: [
        "Touchscreen display",
        "Bluetooth / CarPlay / Android Auto",
        "OTA updates & diagnostics",
      ],
      cta: "View details",
    },
  ];

  return (
    <div className="container">
      <h2 className="section-title">Spare Parts</h2>
      <p className="subtitle">Quality parts for reliable performance.</p>

      {/* Featured spare parts cards with placeholder images */}
      <section aria-label="Featured spare parts categories" style={{ marginBottom: 16 }}>
        <div className="launch-grid">
          {featuredParts.map((item, idx) => (
            <article
              key={item.key}
              className="card parts-card fade-in-up launch-card"
              style={{ animationDelay: `${idx * 90}ms` }}
              tabIndex={0}
              aria-labelledby={`${item.key}-title`}
              aria-describedby={`${item.key}-desc`}
            >
              <figure style={{ margin: 0 }}>
                {/* Placeholder image area
                   To swap to final image:
                   1) Copy final asset to public/assets (e.g., public/assets/wheels.png)
                   2) Update the src below to /assets/wheels.png
                   3) Adjust width/height if needed and keep alt text meaningful */}
                <ResponsiveImage
                  src={item.img}
                  alt={item.alt}
                  className="hover-zoom parts-img"
                  width={640}
                  height={360}
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  placeholder="/assets/placeholder-blur.png"
                />
                <figcaption className="sr-only">{item.title}</figcaption>
              </figure>

              <div style={{ height: 12 }} />
              <h3 className="section-title" id={`${item.key}-title`} style={{ marginBottom: 6 }}>
                {item.title}
              </h3>
              <p className="subtitle" id={`${item.key}-desc`} style={{ marginBottom: 10 }}>
                {item.description}
              </p>

              <ul
                aria-label={`${item.title} key specifications`}
                style={{ margin: 0, paddingLeft: 18, color: "var(--primary)", lineHeight: 1.6 }}
              >
                {item.specs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>

              <div style={{ height: 12 }} />
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button
                  className="btn"
                  aria-label={`Explore ${item.title} options`}
                  onClick={() => alert(`${item.title}: Options coming soon`)}
                >
                  Explore
                </button>
                <button
                  className="btn secondary"
                  aria-label={`Learn more about ${item.title}`}
                  onClick={() => alert(`${item.title}: Details coming soon`)}
                >
                  Learn More
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Existing dynamic list retained below; not removed per instructions */}
      {error ? (
        <div className="card" style={{ color: "var(--error)" }}>{error}</div>
      ) : (
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
      )}
    </div>
  );
}
