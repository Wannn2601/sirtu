// Utility functions to filter data by id_client for all pages
// This ensures data isolation and security across all modules

/**
 * Build a Firestore query constraint for filtering by id_client
 * @param {string} idClient - The user's id_client
 * @returns {object} - Firestore query constraint
 */
export const getIdClientFilter = (idClient) => {
  // This will be used with Firestore's where() clause
  // Usage: query(collection(db, 'collection'), where('id_client', '==', idClient))
  return { field: "id_client", operator: "==", value: idClient };
};

/**
 * Filter array of documents by id_client
 * @param {array} documents - Array of documents from Firestore
 * @param {string} idClient - User's id_client
 * @returns {array} - Filtered documents
 */
export const filterByIdClient = (documents, idClient) => {
  if (!Array.isArray(documents) || !idClient) return [];
  return documents.filter((doc) => doc.id_client === idClient);
};

/**
 * Ensure document has matching id_client before returning
 * @param {object} document - Single document
 * @param {string} idClient - User's id_client
 * @returns {object|null} - Document if id_client matches, null otherwise
 */
export const validateDocumentIdClient = (document, idClient) => {
  if (!document || !idClient) return null;
  if (document.id_client !== idClient) return null;
  return document;
};

/**
 * Add id_client to new document data (for superadmin: omit id_client)
 * @param {object} data - Document data
 * @param {string} idClient - User's id_client (null if superadmin)
 * @param {string} userLevel - User's level
 * @returns {object} - Document data with id_client added
 */
export const addIdClientToData = (data, idClient, userLevel) => {
  // Superadmin doesn't filter by id_client
  if (userLevel === "superadmin") {
    return data;
  }
  // All other users must have id_client attached
  return { ...data, id_client: idClient };
};

/**
 * Validate update/delete operations by checking id_client
 * @param {object} document - Document to be updated/deleted
 * @param {string} idClient - User's id_client
 * @param {string} userLevel - User's level
 * @returns {boolean} - True if operation is allowed
 */
export const canModifyDocument = (document, idClient, userLevel) => {
  // Superadmin can modify anything
  if (userLevel === "superadmin") return true;
  // Other users can only modify documents with matching id_client
  return document?.id_client === idClient;
};
