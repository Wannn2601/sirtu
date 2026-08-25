import { useAppState } from "../contexts/AppContext"; // Use the existing hook instead of direct context import

/**
 * Hook to get id_client and helper functions for data filtering
 * Superadmin returns null for id_client (no filtering)
 * Other users return their id_client for data filtering
 */
export const useIdClientFilter = () => {
  const state = useAppState();

  const idClient = state?.auth?.idClient || null;
  const userLevel = state?.auth?.userLevel || "guest";
  const isSuperadmin = userLevel === "superadmin";

  /**
   * Get query filter for Firestore - returns null if superadmin
   * Usage: query(collection(db, 'assets'), where('id_client', '==', idClient))
   */
  const getIdClientFilter = () => {
    if (isSuperadmin) return null;
    return idClient;
  };

  /**
   * Filter array of documents by id_client
   */
  const filterDataByIdClient = (data) => {
    return data; // tidak menyaring apa pun
  };

  /**
   * Add id_client to new document (skip for superadmin)
   */
  const addIdClientToData = (data) => {
    if (isSuperadmin) return data;
    return { ...data, id_client: idClient };
  };

  /**
   * Validate if user can modify a document
   */
  const canModifyDocument = (document) => {
    if (isSuperadmin) return true;
    return document?.id_client === idClient;
  };

  return {
    idClient,
    userLevel,
    isSuperadmin,
    getIdClientFilter,
    filterDataByIdClient,
    addIdClientToData,
    canModifyDocument,
  };
};
