import React from "react";

/**
// PUBLIC_INTERFACE
 * ResponsiveImage - Accessible, responsive, and performant image component.
 *
 * Features:
 * - srcSet and sizes for responsive delivery
 * - Next-gen formats (AVIF/WebP) with graceful fallback to original format
 * - Lazy loading by default, eager optional (consider using LazyImage for IO fallback)
 * - Prevents CLS via width/height props
 * - Optional low-quality blur placeholder (LQIP)
 * - Optional CDN prefix via REACT_APP_CDN_URL
 *
 * Props:
 * - src (string): required base image path (e.g., "/assets/image.png")
 * - alt (string): required alt text
 * - width (number): intrinsic width to reserve layout space (prevent CLS)
 * - height (number): intrinsic height to reserve layout space (prevent CLS)
 * - loading ("lazy"|"eager"): defaults to "lazy"
 * - className (string): optional className
 * - style (object): inline styles
 * - sizes (string): sizes attribute for responsive selection; defaults to "(max-width: 640px) 100vw, 640px"
 * - placeholder (string): optional placeholder image (very small blur) shown via CSS background
 *
 * Notes:
 * - This component assumes that variant files exist or the server/CDN handles format negotiation.
 *   For static CRA, we use the same base path with different extensions for <source> fallback chain:
 *   - .avif -> .webp -> original
 *   If .avif/.webp variants do not exist, the browser simply falls back to the <img> src.
 */
export default function ResponsiveImage({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  className = "",
  style = {},
  sizes = "(max-width: 640px) 100vw, 640px",
  placeholder,
}) {
  if (!src || !alt) {
    // Fail-safe: never render without required attributes
    // Prevents accessibility regressions
    return null;
  }

  // Optional CDN prefix (do not hardcode; use env)
  // Set REACT_APP_CDN_URL in .env to enable, otherwise leave blank
  const cdn = (process.env.REACT_APP_CDN_URL || "").replace(/\/+$/, "");
  const hasCdn = !!cdn;
  const base = hasCdn ? `${cdn}${src}` : src;

  // best-effort attempt at building alternative format paths by replacing extension
  const toFormat = (path, ext) => {
    const i = path.lastIndexOf(".");
    if (i === -1) return `${path}.${ext}`;
    return `${path.slice(0, i)}.${ext}`;
  };

  const srcAvif = toFormat(base, "avif");
  const srcWebp = toFormat(base, "webp");

  // srcset building strategy:
  // We provide a few common widths. Even if variants don't exist 1:1,
  // browsers will ignore invalid ones or fetch the closest match.
  // For SPA static assets, we keep the same path; CDNs often can auto-resize by querystring.
  const commonWidths = [320, 480, 640, 768, 1024];
  const buildSrcSet = (p) => commonWidths.map((w) => `${p} ${w}w`).join(", ");

  // Placeholder style
  const cssPlaceholder =
    placeholder
      ? {
          backgroundImage: `url(${hasCdn ? `${cdn}${placeholder}` : placeholder})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px)",
        }
      : {};

  // Ensure width/height to avoid layout shift. If absent, rely on CSS aspect ratio fallback.
  const imgProps = {};
  if (width) imgProps.width = width;
  if (height) imgProps.height = height;

  return (
    <picture>
      {/* Next-gen formats first: AVIF, then WebP, then fallback */}
      <source type="image/avif" srcSet={buildSrcSet(srcAvif)} sizes={sizes} />
      <source type="image/webp" srcSet={buildSrcSet(srcWebp)} sizes={sizes} />
      <img
        src={base}
        alt={alt}
        loading={loading}
        className={className}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: 8,
          objectFit: "contain",
          background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
          ...cssPlaceholder,
          // Remove blur once loaded
          transition: placeholder ? "filter 250ms ease" : undefined,
          ...style,
        }}
        onLoad={(e) => {
          if (placeholder) {
            // Remove blur on load
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.backgroundImage = "none";
          }
        }}
        sizes={sizes}
        srcSet={buildSrcSet(base)}
        {...imgProps}
      />
    </picture>
  );
}
