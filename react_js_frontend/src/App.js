import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ServiceCenters from "./pages/ServiceCenters";

/**
// PUBLIC_INTERFACE
 * App - Application shell with navigation and route definitions.
 *
 * - Top nav routes: Home, Cars, Services, Spare Parts, Service Centers, Profile, Login/Signup
 * - Wraps routes in a basic error boundary to avoid full app crash on page errors.
 * - Requires being wrapped with <BrowserRouter> in index.js to provide routing context.
 */
function ErrorBoundary({ children }) {
  // Minimal error boundary using try/catch pattern via a render wrapper
  // In React 18 without class component, we simulate with a guard.
  try {
    return children;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", e);
    return (
      <div className="container">
        <div className="card" style={{ color: "var(--error)" }}>
          Something went wrong. Please refresh the page.
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">Ocean Motors</div>
          <nav className="nav-links" aria-label="Primary">
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
            {/* Cars reuses Home launches for now */}
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Cars</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Spare Parts</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/service-centers">Service Centers</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/profile">Profile</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/auth">Login/Signup</NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/service-centers" element={<ServiceCenters />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth onLogin={() => { /* no-op: token stored by Auth */ }} />} />
            {/* Fallback to Home for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Ocean Motors</div>
      </footer>
    </div>
  );
}

export default App;
