import React, { useEffect, useRef, useState } from "react";

/**
// PUBLIC_INTERFACE
 * LazyImage - Performant, accessible image with native lazy-loading and IntersectionObserver fallback.
 *
 * Features:
 * - Uses loading="lazy" if supported by browser.
 * - Fallback to IntersectionObserver (IO) to defer loading until in-viewport.
 * - Prevents layout shifts via width/height props (highly recommended).
 * - decoding="async" to hint off-main-thread decode when possible.
 * - Optional blur-up placeholder that fades out on load.
 * - Respects prefers-reduced-motion; still loads lazily but disables animated blur transition.
 *
 * Props:
 * - src (string): required. Final image URL (e.g., "/assets/image.png").
 * - alt (string): required. Meaningful alt text.
 * - width (number): highly recommended. Intrinsic width to allocate space.
 * - height (number): highly recommended. Intrinsic height to allocate space.
 * - className (string): optional. Additional class names.
 * - style (object): optional. Inline styles.
 * - loading ("lazy"|"eager"): optional. Defaults to "lazy".
 * - placeholder (string): optional. Low-quality image for blur-up (e.g., tiny base64 or small asset).
 * - sizes (string): optional. Sizes attribute for responsive image selection.
 * - srcSet (string): optional. Custom srcSet if you generate variants externally/CDN.
 */
export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  style = {},
  loading = "lazy",
  placeholder,
  sizes,
  srcSet,
}) {
  // Hooks MUST be called unconditionally (before any returns)
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager"); // eager means render immediately

  // Detect native lazy support
  const supportsNativeLazy =
    typeof document !== "undefined" && "loading" in HTMLImageElement.prototype;

  useEffect(() => {
    if (loading === "eager") {
      setIsInView(true);
      return;
    }

    if (supportsNativeLazy) {
      // Browser will handle; we still render immediately with loading="lazy"
      setIsInView(true);
      return;
    }

    // IntersectionObserver fallback
    const el = imgRef.current;
    if (!el) return;

    // If IO not supported, just render immediately
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsInView(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "100px", threshold: 0 } // pre-load slightly before entering viewport
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, supportsNativeLazy]);

  // Respect reduced motion by avoiding transitions
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const baseStyles = {
    display: "block",
    width: "100%",
    height: "auto",
    objectFit: "contain",
    borderRadius: 8,
    background: "linear-gradient(135deg, #eef2ff, #f9fafb)",
    ...style,
  };

  const blurStyles =
    placeholder && !isLoaded
      ? {
          backgroundImage: `url(${placeholder})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px)",
          transition: prefersReducedMotion ? undefined : "filter 250ms ease",
        }
      : {};

  const finalStyles = {
    ...baseStyles,
    ...blurStyles,
  };

  // Props to prevent CLS
  const dimProps = {};
  if (width) dimProps.width = width;
  if (height) dimProps.height = height;

  // If critical attributes are missing, render nothing but AFTER hooks are set
  if (!src || !alt) {
    return null;
  }

  return (
    // We still render the "shell" element for observer to attach to when using IO fallback.
    <img
      ref={imgRef}
      alt={alt}
      className={className}
      // Only set src/srcSet when we want to begin loading:
      src={isInView ? src : undefined}
      srcSet={isInView ? srcSet : undefined}
      sizes={isInView ? sizes : undefined}
      loading={loading}
      decoding="async"
      style={finalStyles}
      {...dimProps}
      onLoad={(e) => {
        // Mark loaded and clear blur
        setIsLoaded(true);
        if (placeholder && e?.currentTarget?.style) {
          e.currentTarget.style.filter = "none";
          e.currentTarget.style.backgroundImage = "none";
        }
      }}
    />
  );
}
