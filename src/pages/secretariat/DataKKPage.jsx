"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Edit,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import { firestoreService } from "../../services/firebase";

const DataKKPage = () => {
  const [kkData, setKkData] = useState([]);
  const [housingData, setHousingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingKK, setEditingKK] = useState(null);
  const [selectedKK, setSelectedKK] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedBlock, setSelectedBlock] = useState("");
  const [availableAddresses, setAvailableAddresses] = useState([]);
  const [blockSearchTerm, setBlockSearchTerm] = useState("");
  const [addressSearchTerm, setAddressSearchTerm] = useState("");
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [namaKepala, setNamaKepala] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [kkError, setKkError] = useState("");
  const [userData, setUserData] = useState(null);
  const [newContractImage, setNewContractImage] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await firestoreService.getAll("users");
        console.log("Users data:", data);

        const wilayahUser = data.find((u) => u.level === "superadmin");

        if (wilayahUser) {
          setUserData(wilayahUser);
        } else {
          console.warn("Tidak ada user dengan data wilayah ditemukan");
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    loadUserData();
  }, []);

  const [formData, setFormData] = useState({
    lokasi_hunian: "",
    alamat: "",
    no_rumah: "",
    status_kk: "",
    nama_kepala_keluarga: "",
    nomor_kk: "",
    no_hp: "", // ✅ tambahan field nomor whatsapp
    tanggal_terbit: "",
    tanggal_daftar: new Date().toISOString().split("T")[0],

    tanggal_pindah: new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    )
      .toISOString()
      .split("T")[0],

    keterangan: "",
    file_gambar: null,
    file_surat_kontrak: null,
  });

  useEffect(() => {
    loadKKData();
    loadHousingData();
  }, []);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const loadHousingData = async () => {
    try {
      console.log("[v0] Loading housing data from Firebase...");
      const data = await firestoreService.getAll("hunian");
      console.log("[v0] Loaded housing data:", data);
      setHousingData(data);
    } catch (error) {
      console.error("[v0] Error loading housing data:", error);
    }
  };

  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const scaleSize = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height =
          img.width > maxWidth ? img.height * scaleSize : img.height;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const loadKKData = async () => {
    try {
      setLoading(true);
      console.log("[v0] Loading KK data from Firebase...");
      const data = await firestoreService.getAll("kkData");
      console.log("[v0] Loaded KK data:", data);
      setKkData(data);
    } catch (error) {
      console.error("[v0] Error loading KK data:", error);
      Swal.fire({
        title: "Error!",
        text: "Gagal memuat data KK dari Firebase.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBlockSelection = (block) => {
    setSelectedBlock(block);
    setFormData({ ...formData, lokasi_hunian: block });
    setShowBlockDropdown(false);
    setBlockSearchTerm("");

    const blockHousing = housingData.filter((house) => house.blok === block);
    setAvailableAddresses(blockHousing);

    setFormData((prev) => ({ ...prev, alamat: "", no_rumah: "" }));
  };

  const handleAddressSelection = (housing) => {
    setFormData((prev) => ({
      ...prev,
      alamat: housing.alamat,
      no_rumah: housing.nomor_rumah,
      nama_kepala_keluarga: housing.pemilik,
    }));
    setShowAddressDropdown(false);
    setAddressSearchTerm("");
    setNamaKepala(housing.pemilik);
  };

  const handleSendHousingDummyData = async () => {
    const result = await Swal.fire({
      title: "Kirim Data Dummy Hunian",
      text: "Apakah Anda yakin ingin mengirim data dummy hunian ke Firebase?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        console.log("[v0] Sending dummy housing data to Firebase...");

        const dummyHousingData = [
          {
            blok: "A01",
            nomor_rumah: "01",
            alamat: "Jl. Mawar No. 1",
            status_hunian: "Dihuni",
            pemilik: "Ahmad Suryadi",
            penghuni: "Ahmad Suryadi",
            jumlah_penghuni: 4,
          },
          {
            blok: "A01",
            nomor_rumah: "02",
            alamat: "Jl. Mawar No. 2",
            status_hunian: "Kosong",
            pemilik: "Siti Nurhaliza",
            penghuni: "",
            jumlah_penghuni: 0,
          },
          {
            blok: "A02",
            nomor_rumah: "01",
            alamat: "Jl. Melati No. 1",
            status_hunian: "Dihuni",
            pemilik: "Budi Santoso",
            penghuni: "Budi Santoso",
            jumlah_penghuni: 3,
          },
          {
            blok: "A02",
            nomor_rumah: "02",
            alamat: "Jl. Melati No. 2",
            status_hunian: "Kosong",
            pemilik: "Andi Wijaya",
            penghuni: "",
            jumlah_penghuni: 0,
          },
          {
            blok: "B01",
            nomor_rumah: "01",
            alamat: "Jl. Anggrek No. 1",
            status_hunian: "Dihuni",
            pemilik: "Dewi Sartika",
            penghuni: "Dewi Sartika",
            jumlah_penghuni: 5,
          },
          {
            blok: "B01",
            nomor_rumah: "02",
            alamat: "Jl. Anggrek No. 2",
            status_hunian: "Kosong",
            pemilik: "Rudi Hartono",
            penghuni: "",
            jumlah_penghuni: 0,
          },
          {
            blok: "B02",
            nomor_rumah: "01",
            alamat: "Jl. Dahlia No. 1",
            status_hunian: "Dihuni",
            pemilik: "Maya Sari",
            penghuni: "Maya Sari",
            jumlah_penghuni: 2,
          },
          {
            blok: "C01",
            nomor_rumah: "01",
            alamat: "Jl. Kenanga No. 1",
            status_hunian: "Dihuni",
            pemilik: "Joko Widodo",
            penghuni: "Joko Widodo",
            jumlah_penghuni: 4,
          },
        ];

        await firestoreService.addBatch("hunian", dummyHousingData);
        await loadHousingData();

        Swal.fire({
          title: "Berhasil!",
          text: `${dummyHousingData.length} data dummy hunian berhasil dikirim ke Firebase.`,
          icon: "success",
        });
      } catch (error) {
        console.error("[v0] Error sending housing dummy data:", error);
        Swal.fire({
          title: "Error!",
          text: "Gagal mengirim data dummy hunian ke Firebase.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      let imageData = formData.file_gambar;
      let kontrakImageData = formData.file_surat_kontrak;

      if (newContractImage instanceof File) {
        kontrakImageData = await compressImage(newContractImage, 800, 0.7);
      } else if (formData.file_surat_kontrak instanceof File) {
        kontrakImageData = await compressImage(
          formData.file_surat_kontrak,
          800,
          0.7
        );
      }

      if (formData.file_gambar instanceof File) {
        imageData = await compressImage(formData.file_gambar, 800, 0.7);
      }

      if (formData.file_surat_kontrak instanceof File) {
        kontrakImageData = await compressImage(
          formData.file_surat_kontrak,
          800,
          0.8
        );
      }

      if (kkError) {
        Swal.fire(
          "Error!",
          "Nomor KK sudah terpakai. Gunakan nomor lain.",
          "error"
        );
        setLoading(false);
        return;
      }

      if (!editingKK) {
        const newKK = {
          id_kk: `KK${Date.now()}`,
          nomor_kk: formData.nomor_kk,
          no_hp: formData.no_hp || "", // ✅ simpan no_hp
          nama_kepala_keluarga: namaKepala,
          alamat: formData.alamat,
          blok_hunian: formData.lokasi_hunian,
          no_rumah: formData.no_rumah,
          status_kk: formData.status_kk,
          tanggal_terbit: formData.tanggal_terbit,
          tanggal_daftar_kk: formData.tanggal_daftar,
          tanggal_pindah: formData.tanggal_pindah || null,
          keterangan: formData.keterangan || "",
          jumlah_warga: 0,
          file_gambar: imageData || null,
          file_surat_kontrak:
            kontrakImageData || editingKK?.file_surat_kontrak || null,
          rt: userData?.RT || "",
          rw: userData?.RW || "",
          kelurahan: userData?.Kelurahan || "",
          kecamatan: userData?.kecamatan || "",
          kabupaten_kota: userData?.kabupaten_kota || "",
          provinsi: userData?.Provinsi || "",
          negara: userData?.Negara || "",
        };
        await firestoreService.add("kkData", newKK);
      } else {
        const updatedKK = {
          nomor_kk: formData.nomor_kk,
          no_hp: formData.no_hp || "", // ✅ update no_hp
          nama_kepala_keluarga: namaKepala,
          alamat: formData.alamat,
          blok_hunian: formData.lokasi_hunian,
          no_rumah: formData.no_rumah,
          status_kk: formData.status_kk,
          tanggal_terbit: formData.tanggal_terbit,
          tanggal_daftar_kk: formData.tanggal_daftar,
          tanggal_pindah: formData.tanggal_pindah || null,
          keterangan: formData.keterangan || "",
          file_gambar: imageData || editingKK.file_gambar || null,
          file_surat_kontrak:
            kontrakImageData || editingKK?.file_surat_kontrak || null,
          rt: userData?.RT || "",
          rw: userData?.RW || "",
          kelurahan: userData?.Kelurahan || "",
          kecamatan: userData?.kecamatan || "",
          kabupaten_kota: userData?.kabupaten_kota || "",
          provinsi: userData?.Provinsi || "",
          negara: userData?.Negara || "",
        };
        await firestoreService.update("kkData", editingKK.id, updatedKK);
      }

      await loadKKData();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingKK(null);
      resetForm();

      Swal.fire({
        title: "Berhasil!",
        text: `Data KK berhasil ${editingKK ? "diubah" : "ditambahkan"}.`,
        icon: "success",
      });
    } catch (error) {
      console.error("[v0] Error saving KK:", error);
      Swal.fire("Error!", "Gagal menyimpan data KK ke Firebase.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (kk) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus data KK "${kk.nama_kepala_keluarga}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await firestoreService.delete("kkData", kk.id);
        await loadKKData();
        Swal.fire("Berhasil!", "Data KK berhasil dihapus.", "success");
      } catch (error) {
        console.error("[v0] Error deleting KK:", error);
        Swal.fire("Error!", "Gagal menghapus data KK.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (kk) => {
    setEditingKK(kk);
    setNamaKepala(kk.nama_kepala_keluarga || "");
    setFormData({
      lokasi_hunian: kk.blok_hunian || "",
      alamat: kk.alamat || "",
      no_rumah: kk.no_rumah || "",
      status_kk: kk.status_kk || "",
      nama_kepala_keluarga: kk.nama_kepala_keluarga || "",
      nomor_kk: kk.nomor_kk || "",
      no_hp: kk.no_hp || "", // ✅ set no_hp saat edit
      tanggal_terbit: kk.tanggal_terbit || new Date().toISOString().split("T")[0],
      tanggal_daftar: kk.tanggal_daftar_kk || "",
      tanggal_pindah: kk.tanggal_pindah || "",
      keterangan: kk.keterangan || "",
      file_gambar: kk.file_gambar || "",
      file_surat_kontrak: kk.file_surat_kontrak || "",
    });
    setSelectedBlock(kk.blok_hunian || "");
    const blockHousing = housingData.filter(
      (house) => house.blok === (kk.blok_hunian || "")
    );
    setAvailableAddresses(blockHousing);
    setShowEditModal(true);
  };

  const handleDetail = (kk) => {
    setSelectedKK(kk);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    const today = new Date();
    const tanggalDaftar = today.toISOString().split("T")[0];
    const tanggalPindah = new Date(today.setFullYear(today.getFullYear() + 1))
      .toISOString()
      .split("T")[0];

    setFormData({
      lokasi_hunian: "",
      alamat: "",
      no_rumah: "",
      status_kk: "",
      nama_kepala_keluarga: "",
      nomor_kk: "",
      no_hp: "", // ✅ reset no_hp
      tanggal_terbit: tanggalDaftar,
      tanggal_daftar: tanggalDaftar,
      tanggal_pindah: tanggalPindah,
      keterangan: "",
      file_gambar: null,
      file_surat_kontrak: null,
    });

    setNamaKepala("");
    setSelectedBlock("");
    setAvailableAddresses([]);
    setBlockSearchTerm("");
    setAddressSearchTerm("");
  };

  const filteredData = kkData.filter((kk) =>
    Object.values(kk).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = [...filteredData]
    .sort((a, b) =>
      (a.nama_kepala_keluarga || "")
        .trim()
        .toLowerCase()
        .localeCompare(
          (b.nama_kepala_keluarga || "").trim().toLowerCase(),
          "id"
        )
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";
      if (sortConfig.direction === "asc") {
        return aValue
          .toString()
          .localeCompare(bValue.toString(), "id", { numeric: true });
      }
      return bValue
        .toString()
        .localeCompare(aValue.toString(), "id", { numeric: true });
    });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const filteredBlocks = [...new Set(housingData.map((house) => house.blok))]
    .sort((a, b) => a.localeCompare(b))
    .filter((block) =>
      block.toLowerCase().includes(blockSearchTerm.toLowerCase())
    );

  const filteredAddresses = availableAddresses.filter(
    (house) =>
      house.alamat.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
      house.nomor_rumah.toLowerCase().includes(addressSearchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      const blockDropdown = document.querySelector(".block-dropdown-container");
      if (blockDropdown && !blockDropdown.contains(event.target)) {
        setShowBlockDropdown(false);
      }
      const addressDropdown = document.querySelector(
        ".address-dropdown-container"
      );
      if (addressDropdown && !addressDropdown.contains(event.target)) {
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Data Kartu Keluarga (KK)
              </h1>
              <p className="text-gray-600 mt-1">
                Kelola data kartu keluarga warga RT
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSendHousingDummyData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Data Hunian Dummy
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Tambah KK
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, nomor KK, alamat, no. WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 per halaman</option>
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Memuat data...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("nomor_kk")}
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Nomor KK
                          {sortConfig.key === "nomor_kk" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("nama_kepala_keluarga")}
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Kepala Keluarga
                          {sortConfig.key === "nama_kepala_keluarga" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No. WhatsApp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alamat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blok
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah Warga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gambar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((kk, index) => (
                      <motion.tr
                        key={kk.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {kk.nomor_kk}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kk.nama_kepala_keluarga}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kk.no_hp ? (
                            <a
                              href={`https://wa.me/${kk.no_hp.replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline font-medium"
                            >
                              {kk.no_hp}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {kk.alamat} No. {kk.no_rumah}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kk.blok_hunian}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              kk.status_kk === "Tetap"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {kk.status_kk}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {kk.jumlah_warga || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex gap-2">
                            {kk.file_gambar ? (
                              <img
                                src={kk.file_gambar}
                                alt="Gambar KK"
                                className="h-10 w-10 object-cover rounded cursor-pointer border"
                                onClick={() =>
                                  Swal.fire({
                                    imageUrl: kk.file_gambar,
                                    imageAlt: "Gambar KK",
                                    showConfirmButton: false,
                                    showCloseButton: true,
                                  })
                                }
                              />
                            ) : null}
                            {kk.file_surat_kontrak ? (
                              <img
                                src={kk.file_surat_kontrak}
                                alt="Surat Kontrak"
                                className="h-10 w-10 object-cover rounded cursor-pointer border"
                                onClick={() =>
                                  Swal.fire({
                                    imageUrl: kk.file_surat_kontrak,
                                    imageAlt: "Surat Kontrak",
                                    showConfirmButton: false,
                                    showCloseButton: true,
                                  })
                                }
                              />
                            ) : null}
                            {!kk.file_gambar && !kk.file_surat_kontrak && "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDetail(kk)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(kk)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(kk)}
                              className="text-red-600 hover:text-red-900"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Menampilkan{" "}
                        <span className="font-medium">{startIndex + 1}</span>{" "}
                        sampai{" "}
                        <span className="font-medium">
                          {Math.min(
                            startIndex + itemsPerPage,
                            sortedData.length
                          )}
                        </span>{" "}
                        dari{" "}
                        <span className="font-medium">{sortedData.length}</span>{" "}
                        hasil
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Tambah Data KK
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setNamaKepala("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor KK
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.nomor_kk}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, nomor_kk: value });

                      const isDuplicate = kkData.some(
                        (kk) =>
                          kk.nomor_kk === value &&
                          (!editingKK || kk.id !== editingKK.id)
                      );

                      if (isDuplicate) {
                        setKkError("Nomor KK sudah terpakai");
                      } else {
                        setKkError("");
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      kkError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {kkError && (
                    <p className="mt-1 text-sm text-red-600">{kkError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.no_hp}
                    onChange={(e) =>
                      setFormData({ ...formData, no_hp: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Terbit KK
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.tanggal_terbit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_terbit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative block-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blok Hunian
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={blockSearchTerm || selectedBlock}
                      onChange={(e) => {
                        setBlockSearchTerm(e.target.value);
                        setShowBlockDropdown(true);
                      }}
                      onFocus={() => setShowBlockDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Pilih atau cari blok hunian..."
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                    {showBlockDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredBlocks.length > 0 ? (
                          filteredBlocks.map((block) => (
                            <button
                              key={block}
                              type="button"
                              onClick={() => handleBlockSelection(block)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                            >
                              {block}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            Tidak ada blok ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative address-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat & No Rumah
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={
                        addressSearchTerm ||
                        (formData.alamat
                          ? `${formData.alamat} No. ${formData.no_rumah}`
                          : "")
                      }
                      onChange={(e) => {
                        setAddressSearchTerm(e.target.value);
                        setShowAddressDropdown(true);
                      }}
                      onFocus={() =>
                        selectedBlock && setShowAddressDropdown(true)
                      }
                      disabled={!selectedBlock}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder={
                        selectedBlock
                          ? "Pilih alamat dan nomor rumah..."
                          : "Pilih blok terlebih dahulu"
                      }
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                    {showAddressDropdown && selectedBlock && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredAddresses.length > 0 ? (
                          filteredAddresses.map((housing) => (
                            <button
                              key={`${housing.blok}-${housing.nomor_rumah}`}
                              type="button"
                              onClick={() => handleAddressSelection(housing)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="font-medium">
                                {housing.alamat} No. {housing.nomor_rumah}
                              </div>
                              <div className="text-sm text-gray-500">
                                Status: {housing.status_hunian} | Pemilik:{" "}
                                {housing.pemilik}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            Tidak ada alamat tersedia untuk blok ini
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RT
                  </label>
                  <input
                    type="text"
                    value={userData?.RT || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RW
                  </label>
                  <input
                    type="text"
                    value={userData?.RW || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelurahan
                  </label>
                  <input
                    type="text"
                    value={userData?.Kelurahan || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={userData?.kecamatan || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kabupaten/Kota
                  </label>
                  <input
                    type="text"
                    value={userData?.kabupaten_kota || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provinsi
                  </label>
                  <input
                    type="text"
                    value={userData?.Provinsi || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negara
                  </label>
                  <input
                    type="text"
                    value={userData?.Negara || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kepala Keluarga
                  </label>
                  <input
                    required
                    type="text"
                    value={namaKepala}
                    onChange={(e) => setNamaKepala(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama kepala keluarga"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status KK
                  </label>
                  <select
                    value={formData.status_kk}
                    onChange={(e) =>
                      setFormData({ ...formData, status_kk: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Status</option>
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Mulai Tinggal
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.tanggal_daftar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_daftar: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {formData.status_kk === "Kontrak" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Akhir Tinggal
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal_pindah}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_pindah: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>
              </div>
              <div className="md:col-span-2 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File Kartu Keluarga dalam format JPG Ukuran maks.300KB
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, file_gambar: e.target.files[0] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {formData.file_gambar && (
                  <img
                    src={
                      typeof formData.file_gambar === "string"
                        ? formData.file_gambar
                        : URL.createObjectURL(formData.file_gambar)
                    }
                    alt="Preview"
                    className="mt-2 max-h-32 rounded border"
                  />
                )}
              </div>
              {formData.status_kk === "Kontrak" && (
                <div className="md:col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Surat Kontrak dalam format JPG Ukuran maks.300KB
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        file_surat_kontrak: e.target.files[0],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.file_surat_kontrak && (
                    <img
                      src={
                        typeof formData.file_surat_kontrak === "string"
                          ? formData.file_surat_kontrak
                          : URL.createObjectURL(formData.file_surat_kontrak)
                      }
                      alt="Preview Surat Kontrak"
                      className="mt-2 max-h-32 rounded border"
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Data KK
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingKK(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor KK
                  </label>
                  <input
                    type="text"
                    value={formData.nomor_kk}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor_kk: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nomor KK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) =>
                      setFormData({ ...formData, no_hp: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Terbit KK
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_terbit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_terbit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative block-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blok Hunian
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={blockSearchTerm || selectedBlock}
                      onChange={(e) => {
                        setBlockSearchTerm(e.target.value);
                        setShowBlockDropdown(true);
                      }}
                      onFocus={() => setShowBlockDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Pilih atau cari blok hunian..."
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                    {showBlockDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredBlocks.length > 0 ? (
                          filteredBlocks.map((block) => (
                            <button
                              key={block}
                              type="button"
                              onClick={() => handleBlockSelection(block)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                            >
                              {block}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            Tidak ada blok ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative address-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat & No Rumah
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        addressSearchTerm ||
                        (formData.alamat
                          ? `${formData.alamat} No. ${formData.no_rumah}`
                          : "")
                      }
                      onChange={(e) => {
                        setAddressSearchTerm(e.target.value);
                        setShowAddressDropdown(true);
                      }}
                      onFocus={() =>
                        selectedBlock && setShowAddressDropdown(true)
                      }
                      disabled={!selectedBlock}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder={
                        selectedBlock
                          ? "Pilih alamat dan nomor rumah..."
                          : "Pilih blok terlebih dahulu"
                      }
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                    {showAddressDropdown && selectedBlock && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredAddresses.length > 0 ? (
                          filteredAddresses.map((housing) => (
                            <button
                              key={`${housing.blok}-${housing.nomor_rumah}`}
                              type="button"
                              onClick={() => handleAddressSelection(housing)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                            >
                              <div className="font-medium">
                                {housing.alamat} No. {housing.nomor_rumah}
                              </div>
                              <div className="text-sm text-gray-500">
                                Status: {housing.status_hunian} | Pemilik:{" "}
                                {housing.pemilik}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            Tidak ada alamat tersedia untuk blok ini
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RT
                  </label>
                  <input
                    type="text"
                    value={userData?.RT || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RW
                  </label>
                  <input
                    type="text"
                    value={userData?.RW || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelurahan
                  </label>
                  <input
                    type="text"
                    value={userData?.Kelurahan || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={userData?.kecamatan || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kabupaten/Kota
                  </label>
                  <input
                    type="text"
                    value={userData?.kabupaten_kota || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provinsi
                  </label>
                  <input
                    type="text"
                    value={userData?.Provinsi || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negara
                  </label>
                  <input
                    type="text"
                    value={userData?.Negara || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kepala Keluarga
                  </label>
                  <input
                    type="text"
                    value={namaKepala}
                    onChange={(e) => {
                      setNamaKepala(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        nama_kepala_keluarga: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama kepala keluarga"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status KK
                  </label>
                  <select
                    value={formData.status_kk}
                    onChange={(e) =>
                      setFormData({ ...formData, status_kk: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Status</option>
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Daftar
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_daftar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_daftar: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {formData.status_kk === "Kontrak" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Akhir Tinggal
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal_pindah}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_pindah: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({ ...formData, keterangan: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ganti Gambar Kartu Keluarga maks. 300KB
                  </label>

                  {formData.file_gambar && !newImage && (
                    <div className="mb-2">
                      <img
                        src={formData.file_gambar}
                        alt="Gambar Lama"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}

                  {newImage && (
                    <div className="mb-2">
                      <img
                        src={URL.createObjectURL(newImage)}
                        alt="Preview Gambar Baru"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImage(e.target.files[0])}
                  />
                </div>
                {formData.status_kk === "Kontrak" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ganti Gambar Surat Kontrak maks. 300KB
                    </label>

                    {formData.file_surat_kontrak && !newContractImage && (
                      <div className="mb-2">
                        <img
                          src={
                            typeof formData.file_surat_kontrak === "string"
                              ? formData.file_surat_kontrak
                              : URL.createObjectURL(formData.file_surat_kontrak)
                          }
                          alt="Surat Kontrak Lama"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}

                    {newContractImage && (
                      <div className="mb-2">
                        <img
                          src={URL.createObjectURL(newContractImage)}
                          alt="Preview Surat Kontrak Baru"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewContractImage(e.target.files[0])}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingKK(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedKK && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Detail Data KK
                </h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedKK(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor KK
                  </label>
                  <p className="text-gray-900">{selectedKK.nomor_kk}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <p className="text-gray-900 font-medium text-green-600">
                    {selectedKK.no_hp || "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal terbit KK
                  </label>
                  <p className="text-gray-900">{selectedKK.tanggal_terbit}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kepala Keluarga
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.nama_kepala_keluarga}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat
                  </label>
                  <p className="text-gray-900">{selectedKK.alamat}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blok Hunian
                  </label>
                  <p className="text-gray-900">{selectedKK.blok_hunian}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No Rumah
                  </label>
                  <p className="text-gray-900">{selectedKK.no_rumah}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RT / RW
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.rt || "-"} / {selectedKK.rw || "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelurahan
                  </label>
                  <p className="text-gray-900">{selectedKK.kelurahan || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kecamatan
                  </label>
                  <p className="text-gray-900">{selectedKK.kecamatan || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kabupaten/Kota
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.kabupaten_kota || "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provinsi
                  </label>
                  <p className="text-gray-900">{selectedKK.provinsi || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negara
                  </label>
                  <p className="text-gray-900">{selectedKK.negara || "-"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status KK
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedKK.status_kk === "Tetap"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedKK.status_kk}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Warga
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.jumlah_warga || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Daftar
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.tanggal_daftar_kk}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Pindah
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.tanggal_pindah || "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <p className="text-gray-900">
                    {selectedKK.keterangan || "-"}
                  </p>
                </div>
                {selectedKK.file_gambar && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gambar Kartu Keluarga
                    </label>
                    <img
                      src={selectedKK.file_gambar}
                      alt="Gambar KK"
                      className="mt-2 max-h-64 rounded border"
                    />
                  </div>
                )}
                {selectedKK.file_surat_kontrak && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gambar Surat Kontrak
                    </label>
                    <img
                      src={selectedKK.file_surat_kontrak}
                      alt="Gambar Surat Kontrak"
                      className="mt-2 max-h-64 rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedKK(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedKK);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataKKPage;