import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

/**
// PUBLIC_INTERFACE
 * App - Application shell with navigation and route definitions.
 *
 * - Auth-aware header shows Login when logged out; Profile and Logout when logged in.
 * - /profile protected via ProtectedRoute; /parts remains public but shows a login prompt if unauthenticated.
 * - Uses AuthProvider wrapper (in index.js) for auth context.
 */
function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      // ignore UI errors, minimalistic UX
    }
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">Ocean Motors</div>
          <nav className="nav-links" aria-label="Primary">
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/">Home</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/services">Services</NavLink>
            <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/parts">Parts</NavLink>

            {!user ? (
              <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/login">Login</NavLink>
            ) : (
              <>
                <NavLink className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} to="/profile">Profile</NavLink>
                <button className="nav-link" onClick={handleLogout} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          {/* Parts is public but should encourage login when unauthenticated.
              The Parts component will render a login prompt banner when user is not logged in. */}
          <Route path="/parts" element={<Parts />} />
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
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
