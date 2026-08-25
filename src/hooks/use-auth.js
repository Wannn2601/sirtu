import { useAppState } from "../contexts/AppContext";

/**
 * Custom hook to provide auth-related data
 * Wraps useAppState and extracts user information
 */
export const useAuth = () => {
  const state = useAppState();

  return {
    user: state?.user || null,
    isLoggedIn: !!state?.user,
    idClient: state?.idClient || null,
    userPermissions: state?.permissions || {},
    modules: state?.modules || [],
  };
};

export default useAuth;
