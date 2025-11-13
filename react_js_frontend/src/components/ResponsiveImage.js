import React, { useMemo, useRef } from "react";

/**
// PUBLIC_INTERFACE
 * ResponsiveImage - Accessible, responsive, and performant image component.
 *
 * Features:
 * - Optional AVIF/WebP <source> with graceful fallback to <img>
 * - Lazy loading by default, eager optional
 * - Prevents CLS via width/height props when provided
 * - Optional low-quality blur placeholder (LQIP) via CSS background
 * - Optional CDN prefix via REACT_APP_CDN_URL or REACT_APP_ASSET_CDN_PREFIX
 * - Robust fallbacks so images render even if CDN unset or variants missing
 *
 * Props:
 * - src (string): required base image path (e.g., "/assets/image.png")
 * - alt (string): required alt text
 * - width (number)
 * - height (number)
 * - loading ("lazy"|"eager"): defaults to "lazy"
 * - className (string)
 * - style (object)
 * - sizes (string): sizes attribute, used only if srcSet is present
 * - placeholder (string): optional placeholder image shown via CSS background
 * - enableNextGenSources (boolean): include AVIF/WebP <source> tags (default: true)
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
  enableNextGenSources = true,
}) {
  // Hooks must be called unconditionally at the top level.
  const originalSrcRef = useRef(null);

  // Detect absolute URLs we should not prefix
  const isAbsolute = (p) => /^https?:\/\//i.test(p) || /^data:/i.test(p) || /^\/\//.test(p);

  // Optional CDN prefix (support two env names; prefer REACT_APP_CDN_URL)
  const cdnEnvA = (process.env.REACT_APP_CDN_URL || "").trim();
  const cdnEnvB = (process.env.REACT_APP_ASSET_CDN_PREFIX || "").trim();
  const cdnRaw = cdnEnvA || cdnEnvB || "";
  const cdn = cdnRaw.replace(/\/+$/, ""); // trim trailing slash

  // Only prefix if src is root-relative ("/...") or relative, and we actually have a CDN configured
  const baseSrc = useMemo(() => {
    if (!src) return ""; // handle missing src gracefully; we will return null below
    if (!cdn || isAbsolute(src)) return src;
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${cdn}${path}`;
  }, [cdn, src]);

  // Initialize the ref once baseSrc is known
  if (originalSrcRef.current == null) {
    originalSrcRef.current = baseSrc;
  }

  if (!src || !alt) {
    // Fail-safe: never render without required attributes
    return null;
  }

  // Build paths for next-gen formats by replacing extension (best-effort)
  const toFormat = (path, ext) => {
    const qIndex = path.indexOf("?");
    const hashIndex = path.indexOf("#");
    const endIndex = [qIndex, hashIndex].filter((i) => i !== -1).sort((a, b) => a - b)[0] ?? path.length;
    const base = path.slice(0, endIndex);
    const suffix = path.slice(endIndex);
    const i = base.lastIndexOf(".");
    const replaced = i === -1 ? `${base}.${ext}` : `${base.slice(0, i)}.${ext}`;
    return `${replaced}${suffix}`;
  };

  const srcAvif = toFormat(baseSrc, "avif");
  const srcWebp = toFormat(baseSrc, "webp");

  // For CRA static assets we do not have multiple physical widths.
  const imgShouldHaveSrcSet = false;

  // Placeholder style
  const cssPlaceholder =
    placeholder
      ? {
          backgroundImage: `url(${!cdn || isAbsolute(placeholder) ? placeholder : `${cdn}${placeholder.startsWith("/") ? placeholder : `/${placeholder}`}`})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px)",
        }
      : {};

  const imgProps = {};
  if (width) imgProps.width = width;
  if (height) imgProps.height = height;

  return (
    <picture>
      {enableNextGenSources ? (
        <>
          <source type="image/avif" srcSet={srcAvif} />
          <source type="image/webp" srcSet={srcWebp} />
        </>
      ) : null}
      <img
        src={baseSrc}
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
          transition: placeholder ? "filter 250ms ease" : undefined,
          ...style,
        }}
        onLoad={(e) => {
          if (placeholder) {
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.backgroundImage = "none";
          }
        }}
        onError={(e) => {
          // If CDN-prefixed URL failed and original was root-relative, fallback to raw src
          const current = e.currentTarget.getAttribute("src") || "";
          if (cdn && current === originalSrcRef.current && !isAbsolute(src)) {
            e.currentTarget.src = src; // try without CDN
            return;
          }
          if (placeholder) {
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.backgroundImage = "none";
          }
        }}
        {...(imgShouldHaveSrcSet ? { sizes, srcSet: baseSrc } : {})}
        {...imgProps}
      />
    </picture>
  );
}
