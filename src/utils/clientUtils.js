/**
 * Check if client subscription is still valid
 * @param {string|object} dateAwalPakai - Start date (YYYY-MM-DD format or Firestore Timestamp)
 * @param {string|object} dateAkhirPakai - End date (YYYY-MM-DD format or Firestore Timestamp)
 * @returns {boolean} - True if current date is within valid period
 */
export const isClientValid = (dateAwalPakai, dateAkhirPakai) => {
  if (!dateAwalPakai || !dateAkhirPakai) {
    console.log(
      "[v0] clientUtils: Missing dates - awal:",
      dateAwalPakai,
      "akhir:",
      dateAkhirPakai
    );
    return false;
  }

  let awalStr = dateAwalPakai;
  let akhirStr = dateAkhirPakai;

  // Handle Firestore Timestamp objects
  if (
    dateAwalPakai &&
    typeof dateAwalPakai === "object" &&
    dateAwalPakai.toDate
  ) {
    awalStr = dateAwalPakai.toDate().toISOString().split("T")[0];
  } else if (typeof dateAwalPakai === "object" && dateAwalPakai.seconds) {
    // Handle Timestamp with seconds property
    awalStr = new Date(dateAwalPakai.seconds * 1000)
      .toISOString()
      .split("T")[0];
  }

  if (
    dateAkhirPakai &&
    typeof dateAkhirPakai === "object" &&
    dateAkhirPakai.toDate
  ) {
    akhirStr = dateAkhirPakai.toDate().toISOString().split("T")[0];
  } else if (typeof dateAkhirPakai === "object" && dateAkhirPakai.seconds) {
    // Handle Timestamp with seconds property
    akhirStr = new Date(dateAkhirPakai.seconds * 1000)
      .toISOString()
      .split("T")[0];
  }

  // Use local date (not UTC) to match how dates are stored
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayString = `${year}-${month}-${day}`; // Local date format: YYYY-MM-DD

  console.log(
    "[v0] clientUtils: Date comparison - today:",
    todayString,
    "awal:",
    awalStr,
    "akhir:",
    akhirStr
  );
  console.log(
    "[v0] clientUtils: Validation result -",
    "todayString >= awalStr:",
    todayString >= awalStr,
    "todayString <= akhirStr:",
    todayString <= akhirStr
  );

  // Compare date strings directly to avoid timezone issues
  const isValid = todayString >= awalStr && todayString <= akhirStr;
  return isValid;
};

/**
 * Get days remaining until subscription ends
 * @param {string} dateAkhirPakai - End date (YYYY-MM-DD format)
 * @returns {number} - Number of days remaining
 */
export const getDaysRemaining = (dateAkhirPakai) => {
  if (!dateAkhirPakai) return 0;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayString = `${year}-${month}-${day}`;

  const akhirDate = new Date(dateAkhirPakai + "T00:00:00");
  const todayDate = new Date(todayString + "T00:00:00");

  const timeDiff = akhirDate - todayDate;
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
};

/**
 * Format id_client for display
 * @param {string} idClient - Client ID (16 digits format)
 * @returns {string} - Formatted ID like "0100500800000001" -> "01.005.008.00.0001"
 */
export const formatClientId = (idClient) => {
  if (!idClient || idClient.length !== 16) return idClient;
  return `${idClient.slice(0, 2)}.${idClient.slice(2, 5)}.${idClient.slice(
    5,
    8
  )}.${idClient.slice(8, 10)}.${idClient.slice(10)}`;
};

/**
 * Parse formatted id_client back to original format
 * @param {string} formattedId - Formatted ID like "01.005.008.00.0001"
 * @returns {string} - Original format "0100500800000001"
 */
export const parseClientId = (formattedId) => {
  return formattedId.replace(/\./g, "");
};

/**
 * Check if user has access to a specific module
 * @param {object} userPermissions - User's hak_akses object
 * @param {string} moduleId - Module ID like "01.00", "02.01"
 * @returns {boolean} - True if user has access
 */
export const hasModuleAccess = (userPermissions, moduleId) => {
  if (!userPermissions || !moduleId) return false;
  return (
    userPermissions[moduleId] === true ||
    userPermissions[moduleId.replace(/\./g, "")] === true
  );
};

/**
 * Get user's accessible modules from permissions
 * @param {object} userPermissions - User's hak_akses object
 * @returns {array} - Array of accessible module IDs
 */
export const getAccessibleModules = (userPermissions) => {
  if (!userPermissions) return [];
  return Object.keys(userPermissions).filter(
    (key) => userPermissions[key] === true
  );
};

/**
 * Validate user subscription status
 * @param {object} user - User object
 * @returns {object} - { isValid: boolean, daysRemaining: number, message: string }
 */
export const validateUserSubscription = (user) => {
  if (!user) {
    return {
      isValid: false,
      daysRemaining: 0,
      message: "User tidak ditemukan",
    };
  }

  const userLevel = (user.level || user.level_akun || "").toLowerCase();
  if (userLevel === "superadmin") {
    console.log(
      "[v0] clientUtils: Superadmin user - skipping subscription check"
    );
    return {
      isValid: true,
      daysRemaining: -1,
      message: "Superadmin - no expiration",
    };
  }

  const { date_awalpakai, date_akhirpakai } = user;

  if (!date_awalpakai || !date_akhirpakai) {
    console.log("[v0] clientUtils: Missing subscription dates");
    return {
      isValid: false,
      daysRemaining: 0,
      message: "Informasi masa berlaku tidak lengkap",
    };
  }

  const isValid = isClientValid(date_awalpakai, date_akhirpakai);
  const daysRemaining = getDaysRemaining(date_akhirpakai);

  console.log(
    "[v0] clientUtils: Subscription validation - isValid:",
    isValid,
    "daysRemaining:",
    daysRemaining
  );

  if (!isValid) {
    if (daysRemaining <= 0) {
      return {
        isValid: false,
        daysRemaining: 0,
        message:
          "Subscription Anda telah berakhir. Silakan hubungi administrator.",
      };
    }
    return {
      isValid: false,
      daysRemaining,
      message: "Subscription Anda belum aktif. Silakan hubungi administrator.",
    };
  }

  if (daysRemaining <= 30) {
    return {
      isValid: true,
      daysRemaining,
      message: `Subscription Anda akan berakhir dalam ${daysRemaining} hari`,
    };
  }

  return { isValid: true, daysRemaining, message: "Subscription aktif" };
};
