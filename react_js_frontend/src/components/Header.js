import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

/**
// PUBLIC_INTERFACE
 * Header - Top navigation bar shown when authenticated.
 *
 * Shows brand, primary nav, and a user menu with the user's display name/email
 * (no avatar image). Links to Profile and Sign out. Minimalist Ocean Professional styling.
 */
export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Only show display name or fallback email; do not read or render avatar URLs.
  const displayName =
    user?.user_metadata?.display_name?.trim() ||
    user?.email ||
    "Account";

  async function handleLogout() {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      // no-op, avoid noisy UI errors
    }
  }

  // Close on outside click or ESC
  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="brand">Ocean Motors</div>
        <nav className="nav-links header-nav" aria-label="Primary">
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/book-service">Book My Service</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/my-bookings">My Bookings</NavLink>
        </nav>

        <div ref={menuRef} style={{ marginLeft: "auto", position: "relative" }}>
          <button
            className="nav-link"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer"
            }}
          >
            <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
              {displayName}
            </span>
            <span aria-hidden="true" style={{ color: "var(--muted)" }}>▾</span>
          </button>

          {open && (
            <div
              role="menu"
              aria-label="Account menu"
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                minWidth: 200,
                background: "var(--bg)",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: 8,
                boxShadow: "var(--shadow)",
                zIndex: 60,
              }}
            >
              <NavLink
                to="/profile"
                className="nav-link"
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{ display: "block" }}
              >
                Profile
              </NavLink>
              <button
                role="menuitem"
                className="nav-link"
                onClick={handleLogout}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
