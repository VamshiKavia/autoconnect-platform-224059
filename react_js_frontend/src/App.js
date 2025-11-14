import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import Profile from "./pages/Profile";
// Auth page retained but not linked; route commented below to make it unreachable from UI
// import Auth from "./pages/Auth";

/**
// PUBLIC_INTERFACE
 * App - Application shell with public navigation and route definitions.
 *
 * Changes:
 * - Removed authentication state, ProtectedRoute, and login/auth UI.
 * - All routes are public. Home remains landing page.
 * - Navbar order: Home, Services, Parts, Profile (Profile last).
 * - Standalone /auth route is intentionally disabled in the UI (commented out).
 *
 * Requires being wrapped with <BrowserRouter> in index.js to provide routing context.
 */
function App() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">Ocean Motors</div>
          <nav className="nav-links" aria-label="Primary">
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/profile">Profile</NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/parts" element={<Parts />} />
          <Route path="/profile" element={<Profile />} />

          {/* Keep /auth page file, but make it unreachable from UI for now */}
          {/*
          <Route path="/auth" element={<Auth onLogin={() => { /* no-op in public mode */ /* }} />} />
          */}

          {/* Fallback to Home for unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Ocean Motors</div>
      </footer>
    </div>
  );
}

export default App;
