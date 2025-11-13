import { useState } from "react";
import { NavLink, Routes, Route } from "react-router-dom";
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
 * Uses react-router-dom v6:
 * - NavLink for navigation with active styling
 * - Routes/Route for route configuration
 * 
 * Requires being wrapped with <BrowserRouter> in index.js to provide routing context.
 */
function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));

  const onLogout = () => {
    localStorage.removeItem("access_token");
    setAuthed(false);
    // Note: backend logout is stubbed; local removal is sufficient for mock
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
            ) : (
              <NavLink className="btn" to="/auth">Sign In</NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/parts" element={<Parts />} />
          <Route path="/centers" element={<ServiceCenters />} />
          <Route path="/auth" element={<Auth onLogin={() => setAuthed(true)} />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Ocean Motors</div>
      </footer>
    </div>
  );
}

export default App;
