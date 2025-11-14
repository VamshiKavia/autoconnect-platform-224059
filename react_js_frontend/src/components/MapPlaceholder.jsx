import React, { useMemo } from "react";

/**
// PUBLIC_INTERFACE
 * MapPlaceholder
 * A lightweight, styled placeholder for a future interactive map.
 * Renders simple pins for centers positioned relatively within a bounded box
 * using their lat/lng compared to a computed bounds box around all markers
 * (and optionally user coordinates). Includes keyboard focus and accessible labels.
 *
 * Props:
 * - width: CSS width (default: 100%)
 * - height: CSS height (default: 320px)
 * - centers: Array<{ id, name, lat, lng, address?, distanceKm?, openNow? }>
 * - userCoords: { lat, lng } | null
 * - onPinClick(center): function called when a pin is clicked
 *
 * Notes:
 * - This is visually a placeholder. It does not use any external map SDK.
 * - TODO: Integrate Mapbox GL JS or Google Maps SDK when keys/SDK are available.
 */
export default function MapPlaceholder({
  width = "100%",
  height = "320px",
  centers = [],
  userCoords = null,
  onPinClick,
}) {
  const bounds = useMemo(() => computeBounds(centers, userCoords), [centers, userCoords]);

  return (
    <div
      className="map-ph__root"
      role="img"
      aria-label="Map view placeholder"
      style={{
        position: "relative",
        width,
        height,
        background: "linear-gradient(180deg, #f3f4f6, #e5e7eb)",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Decorative grid to hint map */}
      <GridPattern />

      {/* User location */}
      {userCoords ? (
        <div
          title="Your location"
          aria-label="Your location"
          style={{
            position: "absolute",
            ...projectToBox(bounds, userCoords, { width, height }),
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              background: "#3B82F6",
              borderRadius: 999,
              boxShadow: "0 0 0 3px rgba(59,130,246,0.25)",
              border: "2px solid white",
            }}
          />
        </div>
      ) : null}

      {/* Center pins */}
      {centers.map((c) => {
        if (!isFinite(c?.lat) || !isFinite(c?.lng)) return null;
        const style = projectToBox(bounds, { lat: c.lat, lng: c.lng }, { width, height });
        return (
          <button
            key={c.id}
            type="button"
            className="map-ph__pin"
            aria-label={`${c.name}${c.distanceKm != null ? `, ${c.distanceKm.toFixed(1)} kilometers away` : ""}`}
            onClick={() => onPinClick?.(c)}
            style={{
              position: "absolute",
              left: style.left,
              top: style.top,
              transform: "translate(-50%, -100%)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                background: c.openNow ? "#10B981" : "#374151",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                border: "2px solid white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              }}
            />
            <span
              className="map-ph__label"
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -28,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(17,24,39,0.85)",
                color: "#fff",
                borderRadius: 6,
                padding: "2px 6px",
                fontSize: 11,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {c.name}
              {c.distanceKm != null ? ` • ${c.distanceKm.toFixed(1)}km` : ""}
            </span>
          </button>
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          background: "rgba(255,255,255,0.85)",
          border: "1px solid #E5E7EB",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 12,
          color: "#374151",
        }}
      >
        TODO: Replace with Mapbox/Google Maps
      </div>
    </div>
  );
}

function GridPattern() {
  const size = 24;
  const rows = 20;
  const cols = 40;
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex" }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              style={{
                width: size,
                height: size,
                borderRight: "1px solid #E5E7EB",
                borderBottom: "1px solid #E5E7EB",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function computeBounds(centers = [], userCoords = null) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const consider = [];
  centers.forEach((c) => {
    if (isFinite(c?.lat) && isFinite(c?.lng)) consider.push({ lat: c.lat, lng: c.lng });
  });
  if (userCoords && isFinite(userCoords.lat) && isFinite(userCoords.lng)) consider.push(userCoords);

  if (consider.length === 0) {
    // default bounds around SF
    return { minLat: 37.7, maxLat: 37.8, minLng: -122.45, maxLng: -122.40 };
  }
  consider.forEach(({ lat, lng }) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  // pad a little
  const padLat = (maxLat - minLat || 0.02) * 0.15;
  const padLng = (maxLng - minLng || 0.02) * 0.15;

  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

function projectToBox(bounds, point, { width, height }) {
  // Normalize to [0,1] and map to box dimensions. width/height are CSS strings; compute numeric.
  const w = typeof width === "string" && width.endsWith("px") ? parseFloat(width) : 100; // fallback, not used
  const h = typeof height === "string" && height.endsWith("px") ? parseFloat(height) : 100;

  // We will use percentages to avoid reading container size; compute percent.
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  const yNorm = 1 - (point.lat - bounds.minLat) / latRange; // invert Y for screen coords
  const xNorm = (point.lng - bounds.minLng) / lngRange;

  return {
    left: `${(xNorm * 100).toFixed(3)}%`,
    top: `${(yNorm * 100).toFixed(3)}%`,
  };
}
