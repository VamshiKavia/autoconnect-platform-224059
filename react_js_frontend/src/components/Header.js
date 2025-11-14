import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

/**
// PUBLIC_INTERFACE
 * Header - Top navigation bar shown when authenticated.
 *
 * Shows brand, primary nav, and a user menu with avatar, display name/email,
 * links to Profile and Sign out. Minimalist Ocean Professional styling.
 */
export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName =
    user?.user_metadata?.display_name?.trim() ||
    user?.email ||
    "Account";
  const avatarUrl = user?.user_metadata?.avatar_url?.trim() || "";

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
        <nav className="nav-links" aria-label="Primary">
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>
        </nav>

        <div ref={menuRef} style={{ marginLeft: "auto", position: "relative" }}>
          <button
            className="nav-link"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer" }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User avatar"
                width={28}
                height={28}
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", background: "#fff", border: "1px solid #E5E7EB" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  border: "1px solid #E5E7EB",
                }}
              />
            )}
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
