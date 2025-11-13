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
 * Uses react-router-dom v6 with a simple auth guard:
 * - ProtectedRoute redirects unauthenticated users to /auth
 * - After successful login/register, user is redirected to Home
 * 
 * Requires being wrapped with <BrowserRouter> in index.js to provide routing context.
 */
function App() {
  // Initialize from persisted token so reloads stay authenticated
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));
  const navigate = useNavigate();

  // Persisted token check memoized
  const hasToken = useMemo(() => !!localStorage.getItem("access_token"), [authed]);

  useEffect(() => {
    // Keep authed state in sync with localStorage changes (e.g., other tabs)
    const handler = () => setAuthed(!!localStorage.getItem("access_token"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // On mount, route users based on auth state if they land on root
  useEffect(() => {
    if (window.location.pathname === "/") {
      // If not authenticated, go to /auth; otherwise ensure Home
      navigate(hasToken ? "/" : "/auth", { replace: true });
    }
  }, [hasToken, navigate]);

  const onLogout = () => {
    localStorage.removeItem("access_token");
    setAuthed(false);
    // Redirect to auth after logout
    navigate("/auth", { replace: true });
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
          <div className="row" style={{ marginLeft: "auto" }}>
            {authed ? (
              <button className="btn secondary" onClick={onLogout}>Logout</button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          {/* Root path: redirect based on auth state */}
          <Route
            path="/"
            element={
              authed ? (
                <Home />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          {/* Public auth route - if already authed, go Home */}
          <Route
            path="/auth"
            element={
              authed ? (
                <Navigate to="/" replace />
              ) : (
                <Auth
                  onLogin={() => {
                    setAuthed(true);
                    // After successful authentication go to Home
                    navigate("/", { replace: true });
                  }}
                />
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
          {/* Fallback to /auth if route not found and not authed; otherwise Home */}
          <Route path="*" element={<Navigate to={authed ? "/" : "/auth"} replace />} />
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
