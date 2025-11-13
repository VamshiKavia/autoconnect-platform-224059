import { useMemo, useState } from "react";
import { createBrowserRouter, RouterProvider, NavLink } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import ServiceCenters from "./pages/ServiceCenters";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";

// PUBLIC_INTERFACE
function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));

  const router = useMemo(
    () =>
      createBrowserRouter([
        { path: "/", element: <Home /> },
        { path: "/services", element: <Services /> },
        { path: "/parts", element: <Parts /> },
        { path: "/centers", element: <ServiceCenters /> },
        { path: "/auth", element: <Auth onLogin={() => setAuthed(true)} /> },
        { path: "/profile", element: <Profile /> },
      ]),
    []
  );

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
            <NavLink className={({isActive}) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
            <NavLink className={({isActive}) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
            <NavLink className={({isActive}) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>
            <NavLink className={({isActive}) => "nav-link" + (isActive ? " active" : "")} to="/centers">Service Centers</NavLink>
            <NavLink className={({isActive}) => "nav-link" + (isActive ? " active" : "")} to="/profile">Profile</NavLink>
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
        <RouterProvider router={router} />
      </main>
      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Ocean Motors</div>
      </footer>
    </div>
  );
}

export default App;
