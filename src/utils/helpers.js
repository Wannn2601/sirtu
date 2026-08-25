// Helper function to convert mm:yyyy format to yyyy-mm format
export const toKey = (mmYYYY) => {
  if (!mmYYYY) return "";
  const [mm, yyyy] = mmYYYY.split(":");
  return `${yyyy}-${mm.padStart(2, "0")}`;
};

// Helper function to convert yyyy-mm format back to mm:yyyy format
export const fromKey = (yyyyDashMM) => {
  if (!yyyyDashMM) return "";
  const [yyyy, mm] = yyyyDashMM.split("-");
  return `${mm}:${yyyy}`;
};

// Helper function to check if two date ranges overlap
export const overlaps = (aStartKey, aEndKey, bStartKey, bEndKey) => {
  if (!aStartKey || !aEndKey || !bStartKey || !bEndKey) return false;
  return !(aEndKey < bStartKey || aStartKey > bEndKey);
};

// Helper function to get year options for dropdowns
export const getYearOptions = (range = 5) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: range }, (_, i) => currentYear - i);
};

// Helper function to parse stored user from localStorage
export const parseStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("user") || localStorage.getItem("currentUser");
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const obj = JSON.parse(raw);
      return obj;
    }
    return { id: raw };
  } catch {
    return null;
  }
};

// Helper function to normalize wilayah (location) data from user object
export const normalizeWilayah = (user) => {
  if (!user) return {};
  return {
    kab_kota: user.kabupaten_kota || user.kota || user.kab_kota || "",
    kecamatan: user.kecamatan || "",
    kelurahan: user.kelurahan || user.kel || "",
    rt: user.RT || user.rt || "",
    rw: user.RW || user.rw || "",
    role: user.role || user.level || user.jabatan || "",
  };
};

// Helper function to infer default pembukuan (RT/PKK) from user role
export const inferDefaultPembukuan = (role) => {
  const r = String(role || "").toLowerCase();
  if (r.includes("pkk")) return "PKK";
  if (r.includes("rt")) return "RT";
  return "RT";
};

export const toYMKey = toKey;
