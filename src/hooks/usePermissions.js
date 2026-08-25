import { useAppState } from "../contexts/AppContext";
import {
  hasModuleAccess,
  getAccessibleModules,
} from "../utils/permissionUtils";

/**
 * Custom hook for checking user permissions and id_client
 */
export const usePermissions = () => {
  const { state } = useAppState();
  const user = state?.auth?.user;
  const userPermissions = state?.auth?.userPermissions;
  const idClient = state?.auth?.idClient;
  const subscriptionStatus = state?.auth?.subscriptionStatus;

  /**
   * Check if user has access to a specific module
   */
  const canAccessModule = (moduleId) => {
    if (!userPermissions) return false;
    return hasModuleAccess(userPermissions, moduleId);
  };

  /**
   * Get all accessible modules for the user
   */
  const getAccessibleModulesList = () => {
    return getAccessibleModules(userPermissions);
  };

  /**
   * Check if subscription is valid
   */
  const isSubscriptionValid = () => {
    return subscriptionStatus?.isValid || false;
  };

  /**
   * Get subscription warning message if needed
   */
  const getSubscriptionWarning = () => {
    if (!subscriptionStatus) return null;
    if (subscriptionStatus.isValid && subscriptionStatus.daysRemaining <= 30) {
      return `Subscription akan berakhir dalam ${subscriptionStatus.daysRemaining} hari`;
    }
    return null;
  };

  /**
   * Filter data by user's id_client
   */
  const filterByIdClient = (data) => {
    if (!Array.isArray(data) || !idClient) return [];
    return data.filter((item) => item.id_client === idClient);
  };

  /**
   * Build query filter for id_client
   */
  const getIdClientFilter = () => {
    return { field: "id_client", operator: "==", value: idClient };
  };

  return {
    user,
    userPermissions,
    idClient,
    subscriptionStatus,
    canAccessModule,
    getAccessibleModulesList,
    isSubscriptionValid,
    getSubscriptionWarning,
    filterByIdClient,
    getIdClientFilter,
  };
};
