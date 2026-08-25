"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import Swal from "sweetalert2";
import "jspdf-autotable";

// Firebase imports
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { useBendaharaLock } from "../../hooks/use-bendahara-lock";
import { useIdClientFilter } from "../../hooks/useIdClientFilter";

const PemakaianPage = () => {
  const { isSuperadmin, filterDataByIdClient, addIdClientToData } =
    useIdClientFilter();

  const [userData, setUserData] = useState(null);
  const [isClientUser, setIsClientUser] = useState(false);

  // Firestore-backed state
  const [usageRecordsData, setUsageRecordsData] = useState([]);
  const [jenisAssetsData, setJenisAssetsData] = useState([]);
  const [kelompokAssetsData, setKelompokAssetsData] = useState([]);
  const [satuanList, setSatuanList] = useState([]);
  const [assetRecordsData, setAssetRecordsData] = useState([]);
  const [totalTahunan, setTotalTahunan] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  ); // Default bulan berjalan
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPencatatan, setSelectedPencatatan] = useState("keseluruhan"); // BHP, Aset, Keseluruhan
  const [selectedPembukuan, setSelectedPembukuan] = useState("RT"); // Default RT

  const { lockStatus, checkLockForDate } = useBendaharaLock();

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    pencatatan: "pemakaian_bhp", // pemakaian_bhp, penghapusan_aset
    pembukuan: "RT",
    jenis_aset: "",
    volume: "",
    satuan: "",
    keterangan: "",
    jenis_aset_id: "",
    total_tahunan: "",
  });

  // Load user data
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) return;

    const unsub = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        setUserData({ id_client: snap.data().id_client, ...snap.data() });
        setIsClientUser(snap.data().role === "client");
      }
    });

    return () => unsub();
  }, []);

  // Load satuan assets
  useEffect(() => {
    const unsubSatuan = onSnapshot(
      collection(db, "satuanAssets"),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.status === "aktif");
        console.log("[v0] Satuan Assets loaded from Firestore:", data);
        setSatuanList(data);
      }
    );

    return () => unsubSatuan();
  }, []);

  // Load jenis assets
  useEffect(() => {
    const unsubJenis = onSnapshot(collection(db, "jenisAssets"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        firebaseId: doc.id,
        ...doc.data(),
      }));
      console.log("[v0] Jenis Assets loaded from Firestore:", data);
      setJenisAssetsData(data);
    });

    return () => unsubJenis();
  }, []);

  // Load kelompok assets
  useEffect(() => {
    const unsubKelompok = onSnapshot(
      collection(db, "kelompokAssets"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          firebaseId: doc.id,
          ...doc.data(),
        }));
        setKelompokAssetsData(data);
      }
    );

    return () => unsubKelompok();
  }, []);

  // Load usage records
  useEffect(() => {
    const unsubUsage = onSnapshot(
      collection(db, "assetUsageRecords"),
      (snapshot) => {
        let data = snapshot.docs.map((doc) => ({
          firebaseId: doc.id,
          ...doc.data(),
        }));

        // Filter by idClient if not superadmin
        if (!isSuperadmin) {
          data = filterDataByIdClient(data);
        }

        setUsageRecordsData(data);
      }
    );

    return () => unsubUsage();
  }, [isSuperadmin, filterDataByIdClient]);

  // Load assetRecords untuk auto-fill dan total pertahun calculation
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "assetRecords"),
      (snapshot) => {
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssetRecordsData(records);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter logic
  const filteredData = useMemo(() => {
    if (!usageRecordsData || !Array.isArray(usageRecordsData)) return [];

    return usageRecordsData.filter((record) => {
      // Filter by year
      const recordYear = new Date(record.tanggal).getFullYear();
      if (recordYear !== selectedYear) return false;

      // Filter by month
      const recordMonth = String(
        new Date(record.tanggal).getMonth() + 1
      ).padStart(2, "0");
      if (recordMonth !== selectedMonth) return false;

      // Filter by pencatatan
      if (
        selectedPencatatan !== "keseluruhan" &&
        record.pencatatan !== selectedPencatatan
      ) {
        return false;
      }

      // Filter by pembukuan
      if (
        selectedPembukuan !== "Keseluruhan" &&
        record.pembukuan !== selectedPembukuan
      ) {
        return false;
      }

      return true;
    });
  }, [
    usageRecordsData,
    selectedMonth,
    selectedYear,
    selectedPencatatan,
    selectedPembukuan,
  ]);

  // Sort by date descending (newest first)
  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
    );
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Get satuan for selected jenis
  const getAvailableSatuan = () => {
    const activeSatuan = satuanList.filter((s) => s.status === "aktif");
    console.log("[v0] All active satuan:", activeSatuan);
    return activeSatuan;
  };

  // Filter assetRecords based on pencatatan type
  const getAvailableJenis = useMemo(() => {
    if (!assetRecordsData || !Array.isArray(assetRecordsData)) return [];

    let filtered = assetRecordsData.filter((record) => {
      if (formData.pencatatan === "pemakaian_bhp") {
        // BHP records
        return record.kelompok_aset === "bhp";
      } else if (formData.pencatatan === "penghapusan_aset") {
        // ASET records
        return record.kelompok_aset === "aset";
      }
      return false;
    });

    // Filter by pembukuan (RT or PKK) - use sumber_anggaran field from assetRecords
    if (formData.pembukuan && formData.pembukuan !== "Keseluruhan") {
      filtered = filtered.filter(
        (record) => record.sumber_anggaran === formData.pembukuan
      );
    }

    // Get unique jenis_aset from filtered records
    const uniqueJenis = [
      ...new Set(filtered.map((record) => record.jenis_aset)),
    ].filter(Boolean);

    console.log(
      "[v0] Available Jenis from assetRecords:",
      uniqueJenis,
      "Filtered records:",
      filtered
    );
    return uniqueJenis;
  }, [assetRecordsData, formData.pencatatan, formData.pembukuan]);

  const getJenisDetails = useCallback(
    (selectedJenis) => {
      if (!selectedJenis || !assetRecordsData) return null;

      // Filter records untuk selected jenis dan pencatatan - use sumber_anggaran instead of pembukuan
      const jenisRecords = assetRecordsData.filter((record) => {
        return (
          record.jenis_aset === selectedJenis &&
          record.sumber_anggaran === formData.pembukuan &&
          new Date(record.tanggal).getFullYear() === new Date().getFullYear()
        );
      });

      if (jenisRecords.length === 0) return null;

      // Take first record untuk keterangan dan satuan
      const firstRecord = jenisRecords[0];

      // Calculate total pertahun (sum of volumes)
      const totalPertahun = jenisRecords.reduce((sum, record) => {
        const volume = Number.parseInt(record.volume) || 0;
        return sum + volume;
      }, 0);

      return {
        keterangan: firstRecord.keterangan || "",
        satuan: firstRecord.satuan || "",
        totalPertahun: totalPertahun,
      };
    },
    [assetRecordsData, formData.pembukuan]
  );

  const calculateRemainingVolume = useCallback(
    (jenis) => {
      if (!jenis || !assetRecordsData) return 0;

      // Get total pertahun from assetRecords
      const jenisRecords = assetRecordsData.filter((record) => {
        return (
          record.jenis_aset === jenis &&
          record.sumber_anggaran === formData.pembukuan &&
          new Date(record.tanggal).getFullYear() === new Date().getFullYear()
        );
      });

      const totalPertahun = jenisRecords.reduce((sum, record) => {
        return sum + (Number.parseInt(record.volume) || 0);
      }, 0);

      // Get total yang sudah dipakai dari usageRecordsData
      const usedVolume = usageRecordsData
        .filter((record) => {
          return (
            record.jenis_aset === jenis &&
            record.pembukuan === formData.pembukuan &&
            new Date(record.tanggal).getFullYear() === new Date().getFullYear()
          );
        })
        .reduce((sum, record) => {
          return sum + (Number.parseInt(record.volume) || 0);
        }, 0);

      return totalPertahun - usedVolume;
    },
    [assetRecordsData, usageRecordsData, formData.pembukuan]
  );

  const handleOpenModal = async (record = null) => {
    if (isClientUser) {
      Swal.fire(
        "Tidak Diizinkan",
        "Client tidak bisa menambah data",
        "warning"
      );
      return;
    }

    setShowModal(true);

    try {
      const lockStatus = await checkLockForDate(
        new Date(record?.tanggal || new Date())
      );

      if (lockStatus.locked) {
        setShowModal(false);
        Swal.fire(
          "Data Terkunci",
          "Monitoring RT sudah ON, tidak bisa menambah/edit data",
          "warning"
        );
        return;
      }

      if (record) {
        setEditMode(true);
        setFormData({
          firebaseId: record.firebaseId,
          tanggal: record.tanggal,
          pencatatan: record.pencatatan,
          pembukuan: record.pembukuan,
          jenis_aset: record.jenis_aset,
          volume: record.volume,
          satuan: record.satuan,
          keterangan: record.keterangan,
          jenis_aset_id: record.jenis_aset_id,
          total_tahunan: record.total_tahunan || "",
        });
        const total = calculateTotalTahunan(record.jenis_aset_id);
        setTotalTahunan(total);
      } else {
        setEditMode(false);
        resetForm();
        setTotalTahunan(0);
      }
    } catch (err) {
      console.error("Error cek lock:", err);
      Swal.fire("Error", "Gagal cek status lock", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      pencatatan: "pemakaian_bhp",
      pembukuan: "RT",
      jenis_aset: "",
      volume: "",
      satuan: "",
      keterangan: "",
      jenis_aset_id: "",
      total_tahunan: "",
    });
    setTotalTahunan(0);
  };

  const handleSaveRecord = async () => {
    if (!formData.tanggal || !formData.jenis_aset || !formData.volume) {
      Swal.fire("Error", "Harap isi semua field yang wajib", "error");
      return;
    }

    const volumeInput = Number(formData.volume) || 0;
    const yearlyTotal = Number(formData.total_tahunan || 0);

    console.log("DEBUG VALIDASI:", {
      volumeInput,
      yearlyTotal,
      jenis_aset: formData.jenis_aset,
      jenis_aset_id: formData.jenis_aset_id,
    });

    if (yearlyTotal === 0) {
      Swal.fire(
        "Error",
        "Total Pertahun terbaca 0. Pastikan data asset sudah benar.",
        "error"
      );
      return;
    }

    if (volumeInput > yearlyTotal) {
      Swal.fire(
        "Error",
        `Volume tidak boleh lebih besar dari Total Pertahun (${yearlyTotal})`,
        "error"
      );
      return;
    }

    try {
      const payload = {
        ...formData,
        total_tahunan: yearlyTotal.toString(),
        volume: volumeInput.toString(),
        createdAt: new Date().toISOString(),
        idClient: null,
      };

      if (editMode) {
        await updateDoc(
          doc(db, "assetUsageRecords", formData.firebaseId),
          payload
        );
      } else {
        await addDoc(collection(db, "assetUsageRecords"), payload);
      }

      Swal.fire("Sukses", "Data berhasil disimpan", "success");
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("[v0] Error saving record:", error);
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleDeleteRecord = async (firebaseId) => {
    const result = await Swal.fire({
      title: "Hapus data?",
      text: "Data tidak bisa dipulihkan setelah dihapus",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const lockStatus = await checkLockForDate(new Date());
        if (lockStatus.locked) {
          Swal.fire(
            "Terkunci",
            "Monitoring RT sudah ON, tidak bisa menghapus data",
            "warning"
          );
          return;
        }

        await deleteDoc(doc(db, "assetUsageRecords", firebaseId));
        Swal.fire("Sukses", "Data berhasil dihapus", "success");
      } catch (error) {
        Swal.fire("Error", "Gagal menghapus data: " + error.message, "error");
      }
    }
  };

  const handlePembukuanChange = (newPembukuan) => {
    setFormData({
      ...formData,
      pembukuan: newPembukuan,
      jenis_aset: "",
      jenis_aset_id: "",
      satuan: "",
      keterangan: "",
      total_tahunan: "",
      volume: "",
    });
    setTotalTahunan(0);
  };

  const handleJenisChange = (jenisName) => {
    const jenisDetails = getJenisDetails(jenisName);

    // Cari record asli di assetRecordsData
    const selectedRecord = assetRecordsData.find(
      (record) =>
        record.jenis_aset === jenisName &&
        record.sumber_anggaran === formData.pembukuan
    );

    const remainingVolume = calculateRemainingVolume(jenisName);

    setFormData({
      ...formData,
      jenis_aset: jenisName,
      jenis_aset_id: selectedRecord?.jenis_aset_id || "",
      keterangan: jenisDetails?.keterangan || "",
      satuan: jenisDetails?.satuan || "",
      total_tahunan: remainingVolume, // Set ke sisa volume, bukan total original
      volume: "", // Reset volume input saat jenis berubah
    });

    setTotalTahunan(remainingVolume); // Update state juga ke sisa volume
  };

  const calculateTotalTahunan = (jenis_aset_id) => {
    const currentYear = new Date().getFullYear();
    const filteredByJenis = assetRecordsData.filter(
      (record) =>
        record.jenis_aset_id === jenis_aset_id &&
        new Date(record.tanggal).getFullYear() === currentYear &&
        record.sumber_anggaran === formData.pembukuan
    );

    const total = filteredByJenis.reduce((sum, record) => {
      return sum + (Number(record.volume) || 0);
    }, 0);

    return total;
  };

  const handleVolumeChange = (value) => {
    const volumeNum = Number.parseInt(value) || 0;
    const remainingVolume = formData.total_tahunan || 0; // Now this is already remaining volume

    if (volumeNum > remainingVolume) {
      alert(
        `Volume tidak dapat lebih besar dari sisa pertahun (${remainingVolume})`
      );
      setFormData({
        ...formData,
        volume: String(remainingVolume),
      });
    } else {
      setFormData({
        ...formData,
        volume: value,
      });
    }
  };

  const canEditDelete = !isClientUser && lockStatus && !lockStatus.locked;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Pemakaian BHP / Penghapusan Aset Tetap
          </h1>
          {userData && (
            <p className="text-slate-600">
              RT {userData.rt || "-"} RW {userData.rw || "-"}{" "}
              {userData.kelurahan || "-"} {userData.kota || "-"}
              {isClientUser && (
                <span className="ml-4 text-red-600 font-semibold">
                  [Data Terkunci - Client Mode]
                </span>
              )}
            </p>
          )}
          <p className="text-slate-600 mt-2">
            Tahun Anggaran{" "}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1 border border-slate-300 rounded inline-block"
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bulan Pencatatan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Bulan --</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={String(month).padStart(2, "0")}>
                    {new Date(2024, month - 1).toLocaleString("id-ID", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pencatatan
              </label>
              <select
                value={selectedPencatatan}
                onChange={(e) => {
                  setSelectedPencatatan(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="keseluruhan">Keseluruhan</option>
                <option value="pemakaian_bhp">BHP</option>
                <option value="penghapusan_aset">Aset</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pembukuan
              </label>
              <select
                value={selectedPembukuan}
                onChange={(e) => {
                  setSelectedPembukuan(e.target.value);
                  setCurrentPage(1);
                  handlePembukuanChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Keseluruhan">Keseluruhan</option>
                <option value="RT">RT</option>
                <option value="PKK">PKK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Data</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenModal()}
              disabled={isClientUser}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                isClientUser
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <Plus className="w-5 h-5" />
              TAMBAH
            </motion.button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Pencatatan
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Jenis
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Volume Pemakaian / Penghapusan
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Keterangan
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((record, idx) => (
                    <motion.tr
                      key={record.firebaseId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {new Date(record.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {record.pencatatan === "pemakaian_bhp"
                          ? "BHP"
                          : "Penghapusan Aset"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {record.jenis_aset}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {record.volume}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {record.satuan}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {record.keterangan}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleOpenModal(record)}
                            disabled={!canEditDelete}
                            className={`text-blue-600 hover:text-blue-800 font-medium ${
                              !canEditDelete
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              handleDeleteRecord(record.firebaseId)
                            }
                            disabled={!canEditDelete}
                            className={`text-red-600 hover:text-red-800 font-medium ${
                              !canEditDelete
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            hapus
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 p-6 border-t border-slate-200">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &lt;&lt;&lt;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum =
                Math.max(1, currentPage - 2) + i <= totalPages
                  ? Math.max(1, currentPage - 2) + i
                  : null;
              return pageNum ? (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              ) : null;
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &gt;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &gt;&gt;
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-slate-600 disabled:opacity-50"
            >
              &gt;&gt;&gt;
            </button>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800">
                    Pemakaian BHP / Penghapusan Aset Tetap
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Tanggal */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tanggal Pencatatan *
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Pencatatan Radio */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Pencatatan *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pencatatan"
                          value="pemakaian_bhp"
                          checked={formData.pencatatan === "pemakaian_bhp"}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              pencatatan: e.target.value,
                              jenis_aset: "",
                              keterangan: "",
                              satuan: "",
                              total_tahunan: "",
                              volume: "",
                            });
                            setTotalTahunan(0);
                          }}
                          className="w-4 h-4"
                        />
                        <span>Pemakaian BHP</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pencatatan"
                          value="penghapusan_aset"
                          checked={formData.pencatatan === "penghapusan_aset"}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              pencatatan: e.target.value,
                              jenis_aset: "",
                              keterangan: "",
                              satuan: "",
                              total_tahunan: "",
                              volume: "",
                            });
                            setTotalTahunan(0);
                          }}
                          className="w-4 h-4"
                        />
                        <span>Penghapusan Aset</span>
                      </label>
                    </div>
                  </div>

                  {/* BHP / Aset Pembukuan */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      BHP / Aset *
                    </label>
                    <select
                      value={formData.pembukuan}
                      onChange={(e) => {
                        handlePembukuanChange(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="RT">RT</option>
                      <option value="PKK">PKK</option>
                    </select>
                  </div>

                  {/* Jenis dropdown - populated from assetRecords */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Jenis BHP / Aset *
                    </label>
                    <select
                      value={formData.jenis_aset}
                      onChange={(e) => {
                        const selectedJenis = e.target.value;
                        handleJenisChange(selectedJenis);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Jenis --</option>
                      {getAvailableJenis && getAvailableJenis.length > 0 ? (
                        getAvailableJenis.map((jenis) => {
                          const remaining = calculateRemainingVolume(jenis);
                          const isDisabled = remaining <= 0;
                          return (
                            <option
                              key={jenis}
                              value={jenis}
                              disabled={isDisabled}
                            >
                              {jenis}{" "}
                              {isDisabled ? "(Habis)" : `(Sisa: ${remaining})`}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>Tidak ada data jenis</option>
                      )}
                    </select>
                  </div>

                  {/* Total Pertahun (Read-only) */}
                  {formData.jenis_aset && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Total Pertahun
                      </label>
                      <input
                        type="number"
                        value={formData.total_tahunan || 0}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-800 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {/* Volume Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Volume *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.total_tahunan || undefined}
                      value={formData.volume}
                      onChange={(e) => handleVolumeChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.total_tahunan && (
                      <p className="text-xs text-slate-500 mt-1">
                        Max: {formData.total_tahunan}
                      </p>
                    )}
                  </div>

                  {/* Satuan (Auto-filled) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Satuan
                    </label>
                    <input
                      type="text"
                      value={formData.satuan || ""}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-800 cursor-not-allowed"
                    />
                  </div>

                  {/* Keterangan (Auto-filled) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Keterangan
                    </label>
                    <input
                      type="text"
                      value={formData.keterangan}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          keterangan: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 p-6 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveRecord}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    Simpan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default PemakaianPage;
