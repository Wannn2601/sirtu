"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, X, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import { db } from "../../services/firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAppState } from "../../contexts/AppContext";

const SetRTRWPage = () => {
  const { user } = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const [formData, setFormData] = useState({
    id_client: "",
    nama: "",
    hp: "",
    email: "",
    website: "",
    date_bayar_terakhir: "",
    date_awalpakai: "",
    date_akhirpakai: "",
    RT: "",
    RW: "",
    Kelurahan: "",
    kecamatan: "",
    wilayah_administratif: "Kota",
    Provinsi: "",
    kabupaten_kota: "",
    logo_url: "",
  });

  useEffect(() => {
    const fetchUserData = async (uid) => {
      try {
        console.log("[v5] Memuat data user login:", uid);

        // kalau id bukan string, gunakan query untuk mencari field id
        const usersQuery = query(
          collection(db, "users"),
          where("id", "==", uid)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
          console.warn(
            "[v5] Data pengguna tidak ditemukan di Firestore untuk ID:",
            uid
          );
          Swal.fire(
            "Error",
            "Data pengguna tidak ditemukan di database.",
            "error"
          );
          setLoading(false);
          return;
        }

        const userDoc = usersSnapshot.docs[0];
        const data = userDoc.data();

        const fullUserData = { docId: userDoc.id, ...data };
        setUserData(fullUserData);

        // 🔹 simpan ulang ke localStorage supaya docId ikut tersimpan
        localStorage.setItem("app_user", JSON.stringify(fullUserData));

        setFormData({
          id_client: data.id_client || "",
          nama: data.nama || "",
          hp: data.hp || "",
          email: data.email || "",
          website: data.website || "",
          date_bayar_terakhir: data.date_bayar_terakhir || "",
          date_awalpakai: data.date_awalpakai || "",
          date_akhirpakai: data.date_akhirpakai || "",
          RT: data.RT || "",
          RW: data.RW || "",
          Kelurahan: data.Kelurahan || "",
          kecamatan: data.kecamatan || "",
          wilayah_administratif: data.wilayah_administratif || "Kota",
          Provinsi: data.Provinsi || "",
          kabupaten_kota: data.kabupaten_kota || "",
          logo_url: data.logo_url || "",
        });

        if (data.logo_url) setLogoPreview(data.logo_url);
        setLoading(false);
      } catch (err) {
        console.error("[v5] Gagal memuat data pengguna:", err);
        Swal.fire(
          "Error",
          "Gagal memuat data pengguna: " + err.message,
          "error"
        );
        setLoading(false);
      }
    };

    const init = async () => {
      // 🔹 Coba ambil dari context
      if (user && user.id) {
        console.log("[v4] User dari context:", user);
        await fetchUserData(user.id);
        return;
      }

      // 🔹 Kalau context masih kosong, ambil dari localStorage
      const storedUser = localStorage.getItem("app_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) {
          console.log("[v4] User dari localStorage:", parsed);
          await fetchUserData(parsed.id);
          return;
        }
      }

      console.warn("[v4] Tidak ada user login di context maupun localStorage.");
      setLoading(false);
    };

    init();
  }, [user]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔹 Cek ukuran dulu sebelum FileReader dijalankan
    if (file.size > 100 * 1024) {
      Swal.fire({
        icon: "error",
        title: "Ukuran File Terlalu Besar",
        text: "Ukuran file maksimal 100KB!",
        confirmButtonColor: "#d33",
      });
      e.target.value = ""; // reset input
      return;
    }

    // 🔹 Cek format file
    if (file.type !== "image/png") {
      Swal.fire({
        icon: "error",
        title: "Format Tidak Didukung",
        text: "Hanya format PNG yang diperbolehkan!",
        confirmButtonColor: "#d33",
      });
      e.target.value = "";
      return;
    }

    // 🔹 Jika semua aman, tampilkan preview
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
    setLogoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nama.trim() || !formData.RT || !formData.RW) {
      Swal.fire("Error!", "Nama PJ, RT, dan RW harus diisi!", "error");
      return;
    }

    try {
      if (!userData?.docId) {
        throw new Error("User document Firestore ID not found");
      }

      const userDocRef = doc(db, "users", userData.docId);

      const dataToUpdate = {
        ...formData,
        updatedAt: new Date(),
      };

      //   const userDocRef = doc(db, "users", userData.id)
      await updateDoc(userDocRef, dataToUpdate);

      setUserData({ id: userData.id, ...dataToUpdate });
      Swal.fire("Berhasil!", "Data RT/RW berhasil diperbarui!", "success");
      setShowModal(false);
      setLogoFile(null);
    } catch (err) {
      console.error("[v0] Error updating user data:", err);
      Swal.fire("Error!", err.message, "error");
    }
  };

  const handleEdit = () => {
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Pengaturan SIRTU - Set Data RT / RW
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola data RT/RW untuk sistem SIRTU
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {userData ? (
              <div className="space-y-6">
                {/* Display Mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Client
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {userData.id_client || userData.id_client}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Penanggung Jawab
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {userData.nama || userData.nama}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No HP
                      </label>
                      <p className="text-gray-900">{userData.hp || "-"}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{userData.email || "-"}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      {userData.website ? (
                        <a
                          href={
                            userData.website.startsWith("http")
                              ? userData.website
                              : `https://${userData.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {userData.website}
                        </a>
                      ) : (
                        <p className="text-gray-900">-</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pembayaran Terakhir
                      </label>
                      <p className="text-gray-900">
                        {userData.date_bayar_terakhir || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Masa Pakai Mulai
                      </label>
                      <p className="text-gray-900">
                        {userData.date_awalpakai || "-"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Masa Pakai Akhir
                      </label>
                      <p className="text-gray-900">
                        {userData.date_akhirpakai || "-"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RT
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {userData.RT}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RW
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {userData.RW}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wilayah Administratif
                      </label>
                      <p className="text-gray-900">
                        {userData.wilayah_administratif || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Administrative Data */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Data Administrasi Pemerintahan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kelurahan
                      </label>
                      <p className="text-gray-900">
                        {userData.Kelurahan || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kecamatan
                      </label>
                      <p className="text-gray-900">
                        {userData.kecamatan || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kabupaten/Kota
                      </label>
                      <p className="text-gray-900">
                        {userData.kabupaten_kota || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provinsi
                      </label>
                      <p className="text-gray-900">
                        {userData.Provinsi || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                {logoPreview && (
                  <div className="border-t pt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Logo Kab/Kota
                    </label>
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-24 w-24 object-contain cursor-pointer hover:scale-105 transition-transform border rounded"
                      onClick={() => setShowImagePopup(true)}
                    />
                  </div>
                )}

                {/* Action Button */}
                <div className="border-t pt-6">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Gagal memuat data pengguna</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h3 className="text-lg font-semibold">Edit Data RT/RW</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Penanggung Jawab Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Client
                  </label>
                  <p className="text-gray-900 font-semibold">
                    {userData.id_client || userData.id_client}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Penanggung Jawab
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nama *
                      </label>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) =>
                          setFormData({ ...formData, nama: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        No HP
                      </label>
                      <input
                        type="tel"
                        value={formData.hp}
                        onChange={(e) =>
                          setFormData({ ...formData, hp: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) =>
                          setFormData({ ...formData, website: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pembayaran Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Pembayaran & Masa Pakai (tidak dapat diubah)
                  </h4>
                  <div className="space-y-4 opacity-80">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pembayaran Terakhir
                      </label>
                      <input
                        type="date"
                        value={formData.date_bayar_terakhir}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Mulai Pakai
                        </label>
                        <input
                          type="date"
                          value={formData.date_awalpakai}
                          readOnly
                          disabled
                          className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Akhir Pakai
                        </label>
                        <input
                          type="date"
                          value={formData.date_akhirpakai}
                          readOnly
                          disabled
                          className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Administrasi */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Data Administrasi Pemerintahan
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          RT *
                        </label>
                        <input
                          type="text"
                          value={formData.RT}
                          onChange={(e) =>
                            setFormData({ ...formData, RT: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          RW *
                        </label>
                        <input
                          type="text"
                          value={formData.RW}
                          onChange={(e) =>
                            setFormData({ ...formData, RW: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kelurahan
                      </label>
                      <input
                        type="text"
                        value={formData.Kelurahan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            Kelurahan: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kecamatan
                      </label>
                      <input
                        type="text"
                        value={formData.kecamatan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kecamatan: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kabupaten/Kota
                      </label>
                      <input
                        type="text"
                        value={formData.kabupaten_kota}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kabupaten_kota: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        value={formData.Provinsi}
                        onChange={(e) =>
                          setFormData({ ...formData, Provinsi: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Wilayah Administratif *
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="wilayah"
                            value="Kota"
                            checked={formData.wilayah_administratif === "Kota"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                wilayah_administratif: e.target.value,
                              })
                            }
                            className="mr-2"
                          />
                          Kota
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="wilayah"
                            value="Kabupaten"
                            checked={
                              formData.wilayah_administratif === "Kabupaten"
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                wilayah_administratif: e.target.value,
                              })
                            }
                            className="mr-2"
                          />
                          Kabupaten
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Unggah Logo Kab/Kota
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Format: PNG, Ukuran maksimal: 100KB
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".png"
                      onChange={handleLogoChange}
                      className="flex-1"
                    />
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-16 w-16 object-contain border rounded cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setShowImagePopup(true)}
                      />
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="border-t pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Popup tampilan gambar penuh */}
      {showImagePopup && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
          onClick={() => setShowImagePopup(false)}
        >
          <img
            src={logoPreview}
            alt="Logo Besar"
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-lg border border-white"
          />
        </div>
      )}
    </div>
  );
};

export default SetRTRWPage;
