import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
// PUBLIC_INTERFACE
 * SignInRequiredBanner - Ocean Professional styled banner prompting users to sign in.
 *
 * Props:
 * - focusOnMount?: boolean - optional auto-focus for accessibility
 * - id?: string - optional id for focusing from other components
 */
export default function SignInRequiredBanner({ focusOnMount = false, id = "sign-in-required" }) {
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (focusOnMount && ref.current) {
      ref.current.focus();
    }
  }, [focusOnMount]);

  return (
    <div
      id={id}
      ref={ref}
      className="card"
      role="region"
      aria-live="polite"
      tabIndex={-1}
      style={{
        borderColor: "#FCA5A5",
        background: "#FEF2F2",
        outline: "none",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="section-title" style={{ marginBottom: 6, color: "var(--error)" }}>
            Sign in required
          </div>
          <div className="subtitle" style={{ marginBottom: 0 }}>
            You must be signed in to continue your booking.
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => navigate("/login")}
            aria-label="Sign in"
          >
            Sign In
          </button>
          <button
            className="btn secondary"
            onClick={() => navigate("/signup")}
            aria-label="Create an account"
            title="Create Account"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
