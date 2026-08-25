"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

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

const PencatatanPage = () => {
  const { isSuperadmin, filterDataByIdClient, addIdClientToData } =
    useIdClientFilter();

  const [userData, setUserData] = useState(null);
  const [isClientUser, setIsClientUser] = useState(false);

  // Firestore-backed state (replaces useAppContext)
  const [assetRecordsData, setAssetRecordsData] = useState([]);
  const [kelompokAssetsData, setKelompokAssetsData] = useState([]);
  const [jenisAssetsData, setJenisAssetsData] = useState([]);

  const [satuanList, setSatuanList] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  ); // Default bulan berjalan
  const [selectedPencatatan, setSelectedPencatatan] = useState("keseluruhan"); // BHP, Aset, Keseluruhan
  // Removed: const [selectedPembukuan, setSelectedPembukuan] = useState("RT") // Default RT

  const { lockStatus, checkLockForDate } = useBendaharaLock();

  const [selectedDateLockStatus, setSelectedDateLockStatus] = useState({
    locked: false,
  });

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    jenis_aset: "",
    kelompok_aset: "aset", // Default to 'aset'
    volume: "",
    satuan: "",
    keterangan: "",
    uraian: "",
    jenis_aset_id: "",
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userLevel = localStorage.getItem("userLevel");

    setIsClientUser(userLevel === "client");

    if (userId) {
      const unsubUser = onSnapshot(doc(db, "users", userId), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });

      return () => unsubUser();
    }
  }, []);

  useEffect(() => {
    const unsubSatuan = onSnapshot(
      collection(db, "satuanAssets"),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.status === "aktif");
        console.log("[v0] Satuan loaded:", data);
        setSatuanList(data);
      },
      (error) => {
        console.error("[v0] Error loading satuanAssets:", error);
      }
    );

    return () => unsubSatuan();
  }, []); // ← harus benar-benar menutup di sini, tidak boleh ada kurung lain sesudahnya

  useEffect(() => {
    const checkDateLock = async () => {
      // Ensure formData.tanggal is available before checking lock
      if (formData.tanggal) {
        const status = await checkLockForDate(formData.tanggal);
        setSelectedDateLockStatus(status);
      }
    };
    checkDateLock();
  }, [formData.tanggal, checkLockForDate]); // Include checkLockForDate in dependencies

  // Sub kegiatan static
  const subKegiatanOptions = [
    { id: "001", nama: "Pembangunan Infrastruktur" },
    { id: "002", nama: "Pemeliharaan Fasilitas" },
    { id: "003", nama: "Pengadaan Peralatan" },
    { id: "004", nama: "Kegiatan Sosial" },
    { id: "005", nama: "Administrasi RT" },
  ];

  // state sub rekening dari context

  // Filter states
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString()
  );
  const [filterMonth, setFilterMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  ); // Default bulan berjalan
  const [filterKelompok, setFilterKelompok] = useState("keseluruhan");
  const [filterJenis, setFilterJenis] = useState("keseluruhan");

  // Table states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("tanggal");
  const [sortDirection, setSortDirection] = useState("desc"); // Default sort Z-A (desc) by tanggal

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [wargaData, setWargaData] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "wargaData"), (snapshot) => {
      setWargaData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);
  const [subRekeningData, setSubRekeningData] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "subRekeningKegiatan"),
      (snapshot) => {
        setSubRekeningData(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }
    );
    return () => unsub();
  }, []);

  const defaultSubRekenings = [
    {
      id: "1.1",
      sub_rekening_kegiatan: "Silpa Warga Tahun Lalu",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "1.2",
      sub_rekening_kegiatan: "Iuran Wajib Warga",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "1.3",
      sub_rekening_kegiatan: "Bantuan Biaya Operasional RT (BOP) Kota Semarang",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "1.4",
      sub_rekening_kegiatan: "Donatur Warga",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.1",
      sub_rekening_kegiatan: "Silpa PKK Tahun Lalu",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.2",
      sub_rekening_kegiatan: "Iuran Wajib PKK",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.4",
      sub_rekening_kegiatan: "Belanja Modal RT",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.5",
      sub_rekening_kegiatan: "Belanja Modal PKK",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "3.1",
      sub_rekening_kegiatan: "Operasional",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "3",
      status: "aktif",
      is_locked: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "3.2",
      sub_rekening_kegiatan: "Perawatan Balai Warga",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "3",
      status: "aktif",
      is_locked: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "3.3",
      sub_rekening_kegiatan: "Perawatan Fasum Warga",
      kelompok_pembukuan: "Rekening Kas",
      pembukuan: "RT",
      id_kelompok: "3",
      status: "aktif",
      is_locked: false,
      created_at: new Date().toISOString(),
    },
  ];

  const combinedSubRekening = useMemo(() => {
    const combined = [...defaultSubRekenings];
    const existingIds = new Set(defaultSubRekenings.map((item) => item.id));

    // Only add Firestore items that don't already exist in defaults
    const firestoreItems = subRekeningData.filter(
      (item) => !existingIds.has(item.id)
    );
    return [...combined, ...firestoreItems];
  }, [subRekeningData]);

  const normalize = (val) => {
    if (!val) return "";
    return val.replace(/^Kas\s+/i, "").trim(); // buang prefix "Kas " kalau ada
  };

  const filteredSubRekening = useMemo(() => {
    return combinedSubRekening.filter((item) => {
      const itemPembukuan = item.pembukuan?.trim() || "";
      const selectedPembukuan = formData.sumber_anggaran?.trim() || "";
      // Only show items that contain "Belanja Modal" and match the selected pembukuan
      return (
        itemPembukuan === selectedPembukuan &&
        item.status === "aktif" &&
        item.sub_rekening_kegiatan?.includes("Belanja Modal")
      );
    });
  }, [combinedSubRekening, formData.sumber_anggaran]);

  const [pembukuanData, setPembukuanData] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "laporanKeuangan"), (snapshot) => {
      setPembukuanData(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });
    return () => unsub();
  }, []);

  // hitung otomatis total nilai
  // useEffect(() => {
  //   const vol = Number.parseFloat(formData.volume) || 0
  //   const satuan = Number.parseFloat(formData.nilai_satuan) || 0
  //   const total = vol * satuan

  //   setFormData((prev) => ({ ...prev, total_nilai: total }))
  // }, [formData.volume, formData.nilai_satuan])

  // Sync data from Firestore in realtime
  useEffect(() => {
    const unsubRecords = onSnapshot(
      collection(db, "assetRecords"),
      (snap) => {
        let data = snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
        data = filterDataByIdClient(data);
        setAssetRecordsData(data);
      },
      (err) => {
        console.error("assetRecords snapshot error:", err);
      }
    );

    const unsubKelompok = onSnapshot(
      collection(db, "kelompokAssets"),
      (snap) => {
        setKelompokAssetsData(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      },
      (err) => {
        console.error("kelompokAssets snapshot error:", err);
      }
    );

    const unsubJenis = onSnapshot(
      collection(db, "jenisAssets"),
      (snap) => {
        setJenisAssetsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        // console.log("ini adalah jenis dari page pencatatan", snap);
      },
      (err) => {
        console.error("jenisAssets snapshot error:", err);
      }
    );

    return () => {
      try {
        unsubRecords();
      } catch (e) {}
      try {
        unsubKelompok();
      } catch (e) {}
      try {
        unsubJenis();
      } catch (e) {}
    };
  }, [filterDataByIdClient]); // Include filterDataByIdClient in dependencies

  // Firestore CRUD wrappers (used by the UI handlers)
  const addAssetRecord = async (payload) => {
    // 🔐 Lock jenis aset ketika sudah dipakai
    if (formData.jenis_aset_id) {
      await updateDoc(doc(db, "jenisAssets", formData.jenis_aset_id), {
        locked: true,
      });
    }

    return addDoc(collection(db, "assetRecords"), payload);
  };

  const usedJenisIds = useMemo(() => {
    // This is now just kept for reference but not used for filtering
    return assetRecordsData
      .filter((r) => r.jenis_aset_id) // pastikan ada
      .map((r) => r.jenis_aset_id); // list id terpakai
  }, [assetRecordsData]);

  const updateAssetRecord = async (payload) => {
    // 🔐 Lock jenis aset ketika sudah dipakai
    if (formData.jenis_aset_id) {
      await updateDoc(doc(db, "jenisAssets", formData.jenis_aset_id), {
        locked: true,
      });
    }

    if (!payload?.firebaseId) throw new Error("Missing firebaseId for update");
    const { firebaseId, ...data } = payload;
    const ref = doc(db, "assetRecords", firebaseId);
    return updateDoc(ref, data);
  };

  const deleteAssetRecord = async (id) => {
    if (!id) throw new Error("Missing id for delete");

    const ref = doc(db, "assetRecords", id);
    await deleteDoc(ref);
  };

  const addFinancialRecord = async (payload) => {
    // Save to collection financialRecords
    return addDoc(collection(db, "financialRecords"), payload);
  };

  // Utility to generate record id matching original pattern
  const generateRecordId = (tanggal, subKegiatan, sumberSumberAnggaran) => {
    const date = new Date(tanggal);
    const ddmmyy = date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
      .replace(/\//g, "");

    let idSubKegiatan = "0000";
    if (sumberSumberAnggaran === "anggaran rtku" && subKegiatan) {
      idSubKegiatan = subKegiatan.padStart(4, "0");
    }

    // Generate GGGG (0001-9999)
    const existingRecords = assetRecordsData.filter(
      (record) =>
        record.firebaseId &&
        record.firebaseId.startsWith(`${ddmmyy}.${idSubKegiatan}.2.`)
    );
    const nextNumber = (existingRecords.length + 1).toString().padStart(4, "0");

    return `${ddmmyy}.${idSubKegiatan}.2.${nextNumber}`;
  };

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set();
    // Add null check to prevent forEach error
    if (assetRecordsData && Array.isArray(assetRecordsData)) {
      assetRecordsData.forEach((record) => {
        years.add(new Date(record.tanggal).getFullYear().toString());
      });
    }
    return Array.from(years).sort().reverse();
  }, [assetRecordsData]);

  // Get filtered jenis assets based on selected kelompok
  const filteredJenisAssets = useMemo(() => {
    if (!jenisAssetsData || !Array.isArray(jenisAssetsData)) return [];
    if (filterKelompok === "keseluruhan") return jenisAssetsData;
    return jenisAssetsData.filter((jenis) => jenis.kelompok === filterKelompok);
  }, [jenisAssetsData, filterKelompok]);

  // console.log("ini jenis dari page [pencatatan", jenisAssetsData);

  const filteredData = useMemo(() => {
    if (!assetRecordsData || !Array.isArray(assetRecordsData)) return [];

    const filtered = assetRecordsData.filter((record) => {
      const recordDate = new Date(record.tanggal);
      const yearMatch =
        filterYear === "keseluruhan" ||
        recordDate.getFullYear().toString() === filterYear;
      const monthMatch =
        filterMonth === "keseluruhan" ||
        String(recordDate.getMonth() + 1).padStart(2, "0") === filterMonth;

      const kelompokMatch =
        filterKelompok === "keseluruhan" ||
        record.kelompok_aset === filterKelompok;
      const jenisMatch =
        filterJenis === "keseluruhan" || record.jenis_aset === filterJenis;

      let pencatatanMatch = true;
      if (selectedPencatatan !== "keseluruhan") {
        // Determine if record is BHP or Aset based on kelompok_aset
        const isBHP =
          record.kelompok_aset === "bhp" ||
          record.kelompok_aset === "Barang Habis Pakai";
        const isPencatatan = selectedPencatatan === "bhp" ? isBHP : !isBHP;
        pencatatanMatch = isPencatatan;
      }

      // Removed: pembukuanMatch logic - no longer filtering by pembukuan

      const searchMatch =
        searchTerm === "" ||
        (record.jenis_aset || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (record.keterangan || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return (
        yearMatch &&
        monthMatch &&
        kelompokMatch &&
        jenisMatch &&
        pencatatanMatch &&
        searchMatch
      );
    });

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "tanggal") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === "total_nilai") {
        aValue = Number.parseFloat(aValue);
        bValue = Number.parseFloat(bValue);
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [
    assetRecordsData,
    filterYear,
    filterMonth,
    filterKelompok,
    filterJenis,
    selectedPencatatan, // Add dependency
    // Removed: selectedPembukuan, // Add dependency
    searchTerm,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const getSaldoRekening = (subRekeningId, tahunBuku) => {
    if (!subRekeningId) return 0;

    const tahun = tahunBuku || new Date().getFullYear();

    // Ambil data dari laporanKeuangan (mirip dengan pembukuan)
    // atau dari assetRecords jika Anda mau pakai itu.
    // Jika tidak ada, buat snapshot tambahan untuk laporanKeuangan.
    const transactions =
      pembukuanData?.filter((item) => {
        const itemYear = new Date(item.tanggal).getFullYear();
        return (
          item.id_sub_rekening_kegiatan === subRekeningId && itemYear === tahun
        );
      }) || [];

    const totalPenerimaan = transactions.reduce(
      (sum, item) => sum + (item.penerimaan || 0),
      0
    );
    const totalPengeluaran = transactions.reduce(
      (sum, item) => sum + (item.pengeluaran || 0),
      0
    );

    return totalPenerimaan - totalPengeluaran;
  };

  // 🔹 Fungsi bantu untuk mendeteksi pembukuan dan kategori
  const getPembukuanInfo = (sumberAnggaran = "") => {
    const sumber = sumberAnggaran.toLowerCase();
    let pembukuan = "RT";
    let kategori = "kas_rt";

    if (sumber === "pkk") {
      pembukuan = "PKK";
      kategori = "kas_pkk";
    }

    return { pembukuan, kategori };
  };

  // ========================= HANDLE SUBMIT REVISI PENUH =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi required fields
    if (
      !formData.tanggal ||
      !formData.kelompok_aset ||
      !formData.jenis_aset_id ||
      !formData.volume ||
      !formData.satuan
    ) {
      await Swal.fire({
        title: "Peringatan",
        text: "Mohon isi semua field yang wajib (*)",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
      return;
    }

    // 🔐 Lock jenis aset ketika sudah dipakai
    if (formData.jenis_aset_id) {
      await updateDoc(doc(db, "jenisAssets", formData.jenis_aset_id), {
        locked: true,
      });
    }

    // Check lock status based on the selected date in the form
    if (selectedDateLockStatus && selectedDateLockStatus.locked) {
      // Only allow Hibah Warga and Lain-Lain if lock is active, and the record is not BHP
      if (formData.kelompok_aset !== "bhp") {
        await Swal.fire({
          title: "Tidak Diizinkan!",
          text: "Saat monitoring sedang ON, tidak dapat menambahkan Aset.",
          icon: "error",
          confirmButtonColor: "#dc2626",
        });
        return;
      }
    }

    const actionText = editingRecord ? "memperbarui" : "menambahkan";

    const result = await Swal.fire({
      title: `Konfirmasi ${editingRecord ? "Update" : "Tambah"}`,
      text: `Apakah Anda yakin ingin ${actionText} data pencatatan ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Ya, Simpan!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      let recordData = {
        tanggal: formData.tanggal,
        jenis_aset: formData.jenis_aset,
        jenis_aset_id: formData.jenis_aset_id,
        kelompok_aset: formData.kelompok_aset,
        volume: formData.volume,
        satuan: formData.satuan,
        uraian: formData.uraian || "",
        keterangan: formData.keterangan || "",

        // WAJIB! StockOpname dan Pemakaian membaca field ini
        sumber_anggaran: formData.sumber_anggaran || "RT",
      };
      // Add client ID if not editing
      if (!editingRecord) {
        recordData = addIdClientToData(recordData);
      }

      // === Simpan / update data ke Firestore ===
      if (editingRecord) {
        // Update data pencatatan
        await updateAssetRecord({
          ...recordData,
          firebaseId: editingRecord.firebaseId,
        });
      } else {
        // Add new asset record
        await addAssetRecord(recordData);
      }

      // Success notification
      await Swal.fire({
        title: "Berhasil!",
        text: `Data pencatatan berhasil di${actionText} .`,
        icon: "success",
        confirmButtonColor: "#16a34a",
      });

      // Reset form
      setFormData({
        tanggal: new Date().toISOString().split("T")[0],
        jenis_aset: "",
        kelompok_aset: "aset",
        volume: "",
        satuan: "",
        keterangan: "",
        uraian: "",
        jenis_aset_id: "",
      });
      setEditingRecord(null);
      setShowModal(false);
    } catch (error) {
      console.error("[v0] Error saving record:", error);
      await Swal.fire({
        title: "Error",
        text: `Gagal ${actionText} data. ${error.message}`,
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };
  // ========================= END HANDLE SUBMIT =========================

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      jenis_aset: "",
      kelompok_aset: "aset", // Reset to default 'aset'
      volume: "",
      satuan: "",
      keterangan: "",
      uraian: "",
      jenis_aset_id: "", // Reset type_aset_id
    });
    setEditingRecord(null);
    // Reset filters related to the form if they were dependent
    // No explicit dependencies found for now that need reset here.
  };

  const handleEdit = (record) => {
    if (lockStatus && lockStatus.locked) {
      Swal.fire({
        icon: "warning",
        title: "Terkunci!",
        text: "Monitoring RT sedang ON. Tidak dapat mengedit data pencatatan aset.",
      });
      return;
    }

    // Set form data, ensuring default values are handled correctly
    setFormData({
      tanggal: record.tanggal || "",
      jenis_aset: record.jenis_aset || "",
      kelompok_aset: record.kelompok_aset || "aset",
      volume: record.volume || "",
      satuan: record.satuan || "",
      keterangan: record.keterangan || "",
      uraian: record.uraian || "",
      jenis_aset_id: record.jenis_aset_id || "",
    });
    setEditingRecord(record);
    setShowModal(true);
  };

  const handleDelete = async (firebaseId) => {
    if (lockStatus && lockStatus.locked) {
      Swal.fire({
        icon: "warning",
        title: "Terkunci!",
        text: "Monitoring RT sedang ON. Tidak dapat menghapus data pencatatan aset.",
      });
      return;
    }

    const record = assetRecordsData.find((r) => r.firebaseId === firebaseId);
    if (!record) {
      return Swal.fire("Error", "Data tidak ditemukan", "error");
    }

    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus data pencatatan ${record.id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      // UI langsung diperbarui
      setAssetRecordsData((prev) =>
        prev.filter((item) => item.firebaseId !== firebaseId)
      );

      // Hapus dari Firestore (cukup sekali)
      await deleteAssetRecord(firebaseId);

      // Hapus laporan keuangan jika ada
      if (record.laporan_id) {
        await deleteDoc(doc(db, "laporanKeuangan", record.laporan_id));
      }

      Swal.fire({
        title: "Berhasil",
        text: "Data berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Gagal menghapus data: " + error.message, "error");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!filteredData || filteredData.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data untuk diekspor",
        icon: "warning",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
      return;
    }

    Swal.fire({
      title: "Konfirmasi Export PDF",
      text: "Apakah Anda yakin ingin mengekspor data ke PDF?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const printWindow = window.open("", "_blank");
        const printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Data Pencatatan Aset</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .header { text-align: center; margin-bottom: 20px; }
                .sub-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Data Pencatatan Aset</h2>
                <p>Sistem Informasi RT Terpadu (SIRTU)</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Tanggal
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Pencatatan
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Uraian
                    </th>
                    <th
                      colSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Jumlah
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Keterangan
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Aksi
                    </th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Unit</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredData
                    .map(
                      (record, index) => `
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                        {new Date(record.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">
                        ${
                          record.kelompok_aset === "bhp" ||
                          record.kelompok_aset === "Barang Habis Pakai"
                            ? "BHP"
                            : "Aset"
                        }
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">${
                        record.jenis_aset
                      }</td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        ${record.volume} ${record.satuan}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        Rp ${Number.parseInt(record.total_nilai).toLocaleString(
                          "id-ID"
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">${
                        record.keterangan
                      }</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.firebaseId)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();

        Swal.fire({
          title: "Berhasil!",
          text: "Data berhasil diekspor ke PDF",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        });
      }
    });
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data untuk diekspor",
        icon: "warning",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
      return;
    }

    Swal.fire({
      title: "Konfirmasi Export Excel",
      text: "Apakah Anda yakin ingin mengekspor data ke Excel?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const exportData = filteredData.map((record, index) => ({
          No: index + 1,
          Tanggal: new Date(record.tanggal).toLocaleDateString("id-ID"),
          "Jenis Aset": record.jenis_aset,
          "Asal Aset Sumber Anggaran": record.sumber_anggaran,
          "Asal Aset Nilai Perolehan": record.nilai_satuan,
          "Jumlah Unit": `${record.volume} ${record.satuan}`,
          "Jumlah Nilai": record.total_nilai,
          Keterangan: record.keterangan,
          "Anggaran Pengeluaran": record.anggaran_pengeluaran || "-", // Include new field
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Pencatatan Aset");
        XLSX.writeFile(
          wb,
          `Data_Pencatatan_Aset_${new Date().toISOString().split("T")[0]}.xlsx`
        );

        Swal.fire({
          title: "Berhasil!",
          text: "Data berhasil diekspor ke Excel",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        });
      }
    });
  };

  const handleCancel = () => {
    Swal.fire({
      title: "Konfirmasi Batal",
      text: "Apakah Anda yakin ingin membatalkan? Data yang belum disimpan akan hilang.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Batal!",
      cancelButtonText: "Tidak",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setShowModal(false);
        resetForm();
      }
    });
  };

  // Function to handle changes in the 'Sumber Anggaran' dropdown
  // === PERBAIKAN UTAMA DI SINI ===

  const getAvailableSumberAnggaran = () => {
    if (formData.kelompok_aset === "bhp") {
      // BHP only allows RT or PKK
      return [
        { value: "RT", label: "RT" },
        { value: "PKK", label: "PKK" },
      ];
    }

    // For Aset, check lock status
    const allOptions = [
      { value: "RT", label: "RT" },
      { value: "PKK", label: "PKK" },
      { value: "Hibah Warga", label: "Hibah Warga" },
      { value: "Lain-Lain", label: "Lain-Lain" },
    ];

    if (lockStatus?.locked) {
      return allOptions.filter(
        (opt) => opt.value === "Hibah Warga" || opt.value === "Lain-Lain"
      );
    }

    return allOptions;
  };

  const tableColumns = [
    "Tanggal",
    "Pencatatan",
    "Uraian",
    "Keterangan",
    "Aksi",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pencatatan BHP / Aset Tetap
          </h1>
          {userData && (
            <p className="text-sm text-gray-600 mt-2">
              RT {userData.rt || "-"} RW {userData.rw || "-"}{" "}
              {userData.kecamatan || ""} {userData.kabupaten_kota || ""}
              {isClientUser && (
                <span className="ml-2 text-amber-600 font-medium">
                  (Data Terkunci)
                </span>
              )}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Tahun Anggaran: <span className="font-medium">{filterYear}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={isClientUser}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isClientUser
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
          <button
            onClick={async () => {
              // quick dummy insert for testing
              try {
                await addDoc(collection(db, "assetRecords"), {
                  tanggal: new Date().toISOString().split("T")[0],
                  jenis_aset: "Dummy Aset",
                  kelompok_aset: "dummy_kelompok",
                  volume: "1",
                  satuan: "unit",
                  sumber_anggaran: "hibah",
                  sub_rekening_kegiatan: "",
                  nilai_satuan: "1000",
                  total_nilai: "1000",
                  keterangan: "Data dummy untuk testing",
                });
                Swal.fire(
                  "Berhasil",
                  "Data dummy berhasil ditambahkan!",
                  "success"
                );
              } catch (err) {
                console.error(err);
                Swal.fire("Error", "Gagal menambahkan dummy", "error");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Kirim Dummy
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-medium text-gray-900 mb-4">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bulan Pencatatan
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="keseluruhan">Keseluruhan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pencatatan
            </label>
            <select
              value={selectedPencatatan}
              onChange={(e) => setSelectedPencatatan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="keseluruhan">Keseluruhan</option>
              <option value="bhp">BHP</option>
              <option value="aset">Aset</option>
            </select>
          </div>

          {/* Removed: Pembukuan filter dropdown */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tahun Anggaran
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={new Date().getFullYear().toString()}>
                {new Date().getFullYear()}
              </option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and Table Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari data pencatatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number.parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-green-700 text-white">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">
                  Tanggal
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">
                  Pencatatan
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">
                  Uraian
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">
                  Volume
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">
                  Satuan
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">
                  Keterangan
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border border-gray-300 px-4 py-3 text-center text-gray-500"
                  >
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                currentData.map((record, index) => (
                  <tr key={record.firebaseId} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {new Date(record.tanggal).toLocaleDateString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {record.kelompok_aset === "bhp" ||
                      record.kelompok_aset === "Barang Habis Pakai"
                        ? "BHP"
                        : "Aset"}
                    </td>
                    {/* Updated Uraian column to combine jenis_aset + keterangan */}
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {`${record.jenis_aset}${
                        record.uraian ? ` - ${record.uraian}` : ""
                      }`}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                      {record.volume}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                      {record.satuan}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                      {record.keterangan}
                    </td>
                    {/* Removed separate keterangan column */}
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          disabled={lockStatus?.locked || isClientUser}
                          className={`p-1 rounded transition-colors ${
                            lockStatus?.locked || isClientUser
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-blue-600 hover:bg-blue-100"
                          }`}
                          title={
                            lockStatus?.locked
                              ? "Monitoring ON - Tidak dapat edit"
                              : "Edit"
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.firebaseId)}
                          disabled={lockStatus?.locked || isClientUser}
                          className={`p-1 rounded transition-colors ${
                            lockStatus?.locked || isClientUser
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:bg-red-100"
                          }`}
                          title={
                            lockStatus?.locked
                              ? "Monitoring ON - Tidak dapat hapus"
                              : "Hapus"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1} sampai{" "}
            {Math.min(endIndex, filteredData.length)} dari {filteredData.length}{" "}
            data
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRecord ? "Edit Aset / BHP" : "Tambah Aset / BHP"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Baris 1: Tanggal Pencatatan & Pencatatan (BHP/Aset) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Pencatatan *
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pencatatan *{" "}
                      <span className="text-blue-600 text-xs">
                        ← wajib pilih
                      </span>
                    </label>
                    <div className="flex gap-6 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pencatatan"
                          value="bhp"
                          checked={formData.kelompok_aset === "bhp"}
                          onChange={() => {
                            setFormData({
                              ...formData,
                              kelompok_aset: "bhp",
                              // Removed: source_anggaran, sub_rekening_id, sub_rekening_kegiatan, warga_id, keterangan_lain, anggaran_pengeluaran, satuan, nilai_satuan, volume, total_nilai
                              satuan: "",
                              nilai_satuan: "",
                              volume: "",
                              total_nilai: "",
                            });
                          }}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Bahan Habis Pakai (BHP)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pencatatan"
                          value="aset"
                          checked={formData.kelompok_aset === "aset"}
                          onChange={() => {
                            setFormData({
                              ...formData,
                              kelompok_aset: "aset",
                              satuan: "",
                              nilai_satuan: "",
                              volume: "",
                              total_nilai: "",
                            });
                          }}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Aset Tetap
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Baris 2: Uraian Jenis BHP / Aset */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis BHP / Aset *
                  </label>

                  <select
                    value={formData.jenis_aset_id}
                    onChange={(e) => {
                      const jenis = jenisAssetsData.find(
                        (j) => j.id === e.target.value
                      );

                      setFormData({
                        ...formData,
                        jenis_aset_id: jenis.id,
                        jenis_aset: jenis.uraian,
                        satuan: jenis.satuan,
                        // Reset nilai_satuan and volume when jenis changes
                        nilai_satuan: "", // Reset nilai_satuan when jenis changes
                        volume: "", // Reset volume when jenis changes
                        total_nilai: "", // Reset total_nilai when jenis changes
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Pilih Jenis --</option>
                    {jenisAssetsData
                      .filter(
                        (j) =>
                          j.status === "aktif" &&
                          j.jenis.toLowerCase() ===
                            formData.kelompok_aset.toLowerCase()
                      )
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.uraian} ({j.kelompok})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Baris 5: Keterangan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uraian
                  </label>
                  <textarea
                    value={formData.uraian}
                    onChange={(e) =>
                      setFormData({ ...formData, uraian: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Isikan Urain (misalknya: merk, tipe, warna, bahan)"
                  />
                </div>

                {/* Volume & Satuan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banyaknya / Volume *
                    </label>
                    <input
                      type="number"
                      value={formData.volume}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData({ ...formData, volume: newValue });
                        // Update total_nilai automatically if nilai_satuan is available
                        // This part is commented out due to removal of total_nilai and nilai_satuan from formData
                        // if (formData.nilai_satuan) {
                        //   const vol = Number.parseFloat(newValue) || 0
                        //   const satuan = Number.parseFloat(formData.nilai_satuan) || 0
                        //   setFormData((prev) => ({ ...prev, total_nilai: (vol * satuan).toString() }))
                        // }
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Input angka saja"
                      required
                    />
                  </div>

                  {/* Satuan otomatis */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Satuan
                    </label>
                    <input
                      type="text"
                      value={formData.satuan}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      placeholder="Otomatis dari jenis"
                    />
                  </div>
                </div>

                {/* Baris 5: Keterangan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Isikan keterangan (misal: penempatan, peruntukan, lokasi)"
                  />
                </div>

                {/* Baris 6: Tombol Simpan & Batal */}
                <div className="flex justify-center gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PencatatanPage;
