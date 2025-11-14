import { Navigate, useLocation } from "react-router-dom";
import useUser from "../hooks/useUser";

/**
// PUBLIC_INTERFACE
 * ProtectedRoute - wraps children and redirects to /login when unauthenticated.
 *
 * Props:
 * - children: ReactNode to render when authenticated
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="container"><div className="card">Loading...</div></div>;
    }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
