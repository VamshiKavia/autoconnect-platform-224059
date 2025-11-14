import React, { useEffect, useRef, useState } from "react";

/**
// PUBLIC_INTERFACE
 * SuccessToast - Minimal, accessible success toast/alert.
 *
 * - Ocean Professional styling
 * - role="status" by default for non-intrusive announcements
 * - Auto-dismisses after `durationMs` (default 4000ms)
 * - Includes a visible close button for manual dismissal
 * - Uses aria-live="polite" and aria-atomic for SR announcements
 *
 * Props:
 * - message: string - main success text to display
 * - onClose: function - called when toast is dismissed
 * - durationMs?: number - auto-dismiss timeout (ms), default 4000
 * - role?: "status" | "alert" - ARIA role, default "status"
 * - detail?: string | ReactNode - optional secondary line/detail
 */
export default function SuccessToast({
  message,
  detail = null,
  onClose,
  durationMs = 4000,
  role = "status",
}) {
  const [open, setOpen] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    timerRef.current = setTimeout(() => {
      handleClose();
    }, Math.max(1500, durationMs));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationMs]);

  function handleClose() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      aria-atomic="true"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1000,
        maxWidth: 420,
      }}
    >
      <div
        className="card"
        style={{
          background: "#ECFDF5", // soft success bg
          borderColor: "#A7F3D0",
          color: "#065F46",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          alignItems: "start",
          paddingRight: 8,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
            }}
          >
            <span aria-hidden="true">✓</span>
            <span>{message}</span>
          </div>
          {detail ? (
            <div className="subtitle" style={{ marginTop: 6, color: "#047857" }}>
              {detail}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close success message"
          className="btn secondary"
          onClick={handleClose}
          style={{
            borderColor: "#10B981",
            color: "#065F46",
            padding: "6px 10px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
