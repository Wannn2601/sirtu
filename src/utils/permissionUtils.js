/**
 * Check if user has specific role/level
 * @param {string} userLevel - User's level (superadmin, pak rt, bendahara, etc)
 * @param {array} allowedLevels - Array of allowed levels
 * @returns {boolean}
 */
export const hasRole = (userLevel, allowedLevels) => {
  if (!Array.isArray(allowedLevels)) allowedLevels = [allowedLevels];
  return allowedLevels.includes(userLevel);
};

/**
 * Get user's accessible pages based on their permissions
 * @param {object} userPermissions - hak_akses object
 * @param {array} allModules - All available modules
 * @returns {array} - Filtered modules user can access
 */
export const filterModulesByPermission = (userPermissions, allModules) => {
  if (!userPermissions || !allModules) return [];

  return allModules.filter((module) => {
    const moduleId = module.id_menu;
    return userPermissions[moduleId] === true;
  });
};

/**
 * Build query for filtering data by id_client
 * @param {string} idClient - Client ID
 * @returns {object} - Firebase query conditions
 */
export const buildIdClientQuery = (idClient) => {
  return {
    field: "id_client",
    operator: "==",
    value: idClient,
  };
};

/**
 * Filter data array by id_client
 * @param {array} data - Data array
 * @param {string} idClient - Client ID to filter by
 * @returns {array} - Filtered data
 */
export const filterDataByIdClient = (data, idClient) => {
  if (!Array.isArray(data) || !idClient) return [];
  return data.filter((item) => item.id_client === idClient);
};

/**
 * Check if user belongs to specific id_client
 * @param {object} user - User object
 * @param {string} expectedIdClient - Expected id_client
 * @returns {boolean}
 */
export const userBelongsToClient = (user, expectedIdClient) => {
  return user && user.id_client === expectedIdClient;
};
