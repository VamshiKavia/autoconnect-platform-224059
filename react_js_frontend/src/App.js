import { Routes, Route, Navigate } from "react-router-dom";
import "./theme.css";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Parts from "./pages/Parts";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";

/**
// PUBLIC_INTERFACE
 * App - Application shell with global authentication and route definitions.
 *
 * Behavior:
 * - Entire route tree is protected by default using ProtectedRoute.
 * - /login (and 404 fallback to /login) remain publicly accessible.
 * - When authenticated, a persistent Header shows avatar/name and a user menu.
 * - After successful login, user is redirected to originally requested page.
 * - AuthProvider is provided at the root in index.js.
 */
function App() {
  const { user, loading } = useAuth();

  return (
    <div className="app-shell">
      {/* Header only when authenticated */}
      {user ? <Header /> : null}

      <main className="main">
        <Routes>
          {/* Public login route remains accessible when logged out */}
          <Route path="/login" element={<Login />} />

          {/* Protected layout wrapper for all other routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            }
          />

          {/* Fallback: when unauthenticated and unknown route, redirect to /login */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
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
 * AppRoutes - Internal component that holds authenticated application routes.
 * Shown only inside ProtectedRoute. Keeps /profile accessible to authenticated users.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/parts" element={<Parts />} />
      <Route path="/profile" element={<Profile />} />
      {/* Catch-all inside protected area */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
