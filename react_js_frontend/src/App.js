import { useEffect, useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import ServiceCenters from "./pages/ServiceCenters";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";

/**
// PUBLIC_INTERFACE
 * App - Application shell with navigation and route definitions.
 * 
 * Behavior updated:
 * - Home ("/") is now public and no longer redirects to /auth
 * - Navbar shows Login button when logged out; opens an Auth modal with Sign In / Create Account tabs
 * - On successful auth, modal closes and navbar updates to show user menu (Profile/Logout)
 * - ProtectedRoute still guards authenticated-only pages
 * - Standalone /auth route remains available but not required
 * 
 * Requires being wrapped with <BrowserRouter> in index.js to provide routing context.
 */
function App() {
  // Initialize from persisted token so reloads stay authenticated
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));
  const [showAuth, setShowAuth] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Persisted token check memoized
  const hasToken = useMemo(() => !!localStorage.getItem("access_token"), [authed]);

  useEffect(() => {
    // Keep authed state in sync with localStorage changes (e.g., other tabs)
    const handler = () => setAuthed(!!localStorage.getItem("access_token"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const onLogout = () => {
    localStorage.removeItem("access_token");
    setAuthed(false);
    setUserMenuOpen(false);
    // Stay on current page; still allow visiting /auth if user wants
  };

  const onAuthSuccess = () => {
    setAuthed(true);
    setShowAuth(false);
    setUserMenuOpen(false);
    // Do not force navigate; remain on current route (Home or wherever user is)
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">Ocean Motors</div>
          <nav className="nav-links" aria-label="Primary">
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/centers">Service Centers</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/profile">Profile</NavLink>
          </nav>

          <div className="row" style={{ marginLeft: "auto", position: "relative" }}>
            {!authed ? (
              <>
                <button
                  className="btn secondary"
                  onClick={() => setShowAuth(true)}
                  aria-haspopup="dialog"
                  aria-controls="auth-modal"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn secondary"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  Account
                </button>
                {userMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="User menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      minWidth: 180,
                      background: "var(--surface)",
                      border: "1px solid #E5E7EB",
                      borderRadius: "var(--radius)",
                      boxShadow: "var(--shadow)",
                      padding: 8,
                      zIndex: 60,
                    }}
                  >
                    <button
                      className="nav-link"
                      style={{ width: "100%", textAlign: "left" }}
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/profile");
                      }}
                    >
                      Profile
                    </button>
                    <button
                      className="nav-link"
                      style={{ width: "100%", textAlign: "left" }}
                      role="menuitem"
                      onClick={onLogout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal - Ocean Professional styling */}
      {showAuth ? (
        <div
          id="auth-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Authentication"
          onClick={(e) => {
            // click outside to close
            if (e.target === e.currentTarget) setShowAuth(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowAuth(false)}
              aria-label="Close"
              className="btn secondary"
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                padding: "6px 10px",
              }}
            >
              ✕
            </button>
            <Auth
              onLogin={() => {
                onAuthSuccess();
              }}
            />
          </div>
        </div>
      ) : null}

      <main className="main">
        <Routes>
          {/* Home is publicly visible now */}
          <Route path="/" element={<Home />} />

          {/* Public auth route - if already authed, go Home */}
          <Route
            path="/auth"
            element={
              authed ? (
                <Navigate to="/" replace />
              ) : (
                <div className="container">
                  <div className="card" style={{ maxWidth: 640, margin: "24px auto" }}>
                    <Auth
                      onLogin={() => {
                        onAuthSuccess();
                        navigate("/", { replace: true });
                      }}
                    />
                  </div>
                </div>
              )
            }
          />

          {/* Protected application routes */}
          <Route
            path="/services"
            element={
              <ProtectedRoute authed={authed}>
                <Services />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parts"
            element={
              <ProtectedRoute authed={authed}>
                <Parts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/centers"
            element={
              <ProtectedRoute authed={authed}>
                <ServiceCenters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute authed={authed}>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* Fallback to Home for unknown routes (public) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Ocean Motors</div>
      </footer>
    </div>
  );
}

/**
// PUBLIC_INTERFACE
 * ProtectedRoute - Simple route guard component.
 * Redirects to /auth when not authenticated.
 */
function ProtectedRoute({ authed, children }) {
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default App;
