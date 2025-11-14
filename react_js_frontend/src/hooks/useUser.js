import { useAuth } from "../context/AuthContext";

/**
// PUBLIC_INTERFACE
 * useUser - returns { user, isAuthenticated, loading }
 */
export default function useUser() {
  const { user, loading } = useAuth();
  return {
    user,
    isAuthenticated: !!user,
    loading,
  };
}
