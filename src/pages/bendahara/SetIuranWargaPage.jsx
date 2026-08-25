"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { firestoreService } from "../../services/firebase";

const SetIuranWargaPage = () => {
  const [iurRatesData, setIurRatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // ambil bulan berjalan (1-12) & tahun berjalan
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    bulan: currentMonth.toString(), // default bulan berjalan
    tahun: currentYear.toString(), // default tahun berjalan
    dasar_hukum: "",
    besaran_iuran: "",
    pos_penerimaan: "KAS RT", // default pos
  });

  // 🔄 Load data dari Firestore
  useEffect(() => {
    loadIurRatesData();
  }, []);

  const loadIurRatesData = async () => {
    try {
      setLoading(true);
      const data = await firestoreService.getAll("iurRates");
      setIurRatesData(data || []);
    } catch (error) {
      console.error("[v0] Error loading IUR rates:", error);
      Swal.fire("Error", "Gagal memuat data tarif iuran", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Opsi bulan/tahun
  const generateMonthYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    for (let year = currentYear; year <= currentYear + 2; year++) {
      months.forEach((month) => options.push(`${month} ${year}`));
    }
    return options;
  };
  const monthYearOptions = generateMonthYearOptions();

  // ✅ Simpan / Edit data
  // ✅ Simpan / Edit data
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.bulan ||
      !formData.tahun ||
      !formData.dasar_hukum ||
      !formData.besaran_iuran
    ) {
      Swal.fire("Peringatan", "Semua field harus diisi!", "warning");
      return;
    }

    const result = await Swal.fire({
      title: editingItem ? "Konfirmasi Edit" : "Konfirmasi Simpan",
      text: editingItem
        ? "Apakah Anda yakin ingin mengubah data ini?"
        : "Apakah Anda yakin ingin menyimpan data ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const bulanInt = Number.parseInt(formData.bulan, 10);
        const tahunInt = Number.parseInt(formData.tahun, 10);

        const itemData = {
          bulan: bulanInt,
          tahun: tahunInt,
          bulan_berlaku: `${bulanInt}-${tahunInt}`,
          dasar_hukum: formData.dasar_hukum,
          besaran_iuran: Number.parseInt(formData.besaran_iuran),
          pos_penerimaan: formData.pos_penerimaan || "KAS RT",
          tanggal_berlaku: new Date(tahunInt, bulanInt - 1, 1).toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (editingItem) {
          await firestoreService.update("iurRates", editingItem.id, itemData);
        } else {
          itemData.createdAt = new Date().toISOString();
          await firestoreService.add("iurRates", itemData);
        }

        handleCloseModalForce();
        loadIurRatesData();
        Swal.fire("Berhasil", "Data berhasil disimpan!", "success");
      } catch (error) {
        console.error("[v0] Error saving data:", error);
        Swal.fire("Error", "Gagal menyimpan data", "error");
      }
    }
  };

  // ✅ Edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      bulan_berlaku: item.bulan_berlaku,
      dasar_hukum: item.dasar_hukum,
      besaran_iuran: item.besaran_iuran.toString(),
    });
    setShowModal(true);
  };

  // ✅ Hapus
  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus data ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await firestoreService.delete("iurRates", item.id);
        await firestoreService.updatePaymentsForMonth(item.bulan_berlaku, 0); // 🔑 reset nominal
        Swal.fire(
          "Berhasil",
          "Data berhasil dihapus dan disinkronkan!",
          "success"
        );
        loadIurRatesData();
      } catch (error) {
        console.error("[v0] Error deleting data:", error);
        Swal.fire("Error", "Gagal menghapus data", "error");
      }
    }
  };

  const handleCloseModalForce = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      bulan: (new Date().getMonth() + 1).toString(), // bulan berjalan
      tahun: new Date().getFullYear().toString(), // tahun berjalan
      dasar_hukum: "",
      besaran_iuran: "",
      pos_penerimaan: "KAS RT",
    });
  };

  // 🔎 Filter & Pagination
  const filteredData = useMemo(() => {
    if (!iurRatesData || !Array.isArray(iurRatesData)) return [];
    return iurRatesData.filter(
      (item) =>
        item.bulan_berlaku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dasar_hukum.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [iurRatesData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  if (loading) return <p className="p-6">Memuat data tarif iuran...</p>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Set Iuran Warga</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2 inline" /> Tambah
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari bulan berlaku atau dasar hukum..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bulan Berlaku
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dasar Hukum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Besaran Iuran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">{item.bulan_berlaku}</td>
                  <td className="px-6 py-4">{item.dasar_hukum}</td>
                  <td className="px-6 py-4">
                    Rp {item.besaran_iuran.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4">{item.pos_penerimaan}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 mr-2"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number.parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Menampilkan {startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
              {filteredData.length} data
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              {/* Judul Modal */}
              <h2 className="text-lg font-semibold mb-4">
                {editingItem
                  ? "Edit Besaran Iuran Wajib Warga/PKK"
                  : "Set Besaran Iuran Wajib Warga/PKK"}
              </h2>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bulan & Tahun */}
                {/* Bulan & Tahun */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bulan
                    </label>
                    <select
                      value={formData.bulan}
                      onChange={(e) =>
                        setFormData({ ...formData, bulan: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      =
                      {[
                        "Januari",
                        "Februari",
                        "Maret",
                        "April",
                        "Mei",
                        "Juni",
                        "Juli",
                        "Agustus",
                        "September",
                        "Oktober",
                        "November",
                        "Desember",
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tahun
                    </label>
                    <select
                      value={formData.tahun}
                      onChange={(e) =>
                        setFormData({ ...formData, tahun: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {[currentYear, currentYear + 1, currentYear + 2].map(
                        (y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Dasar Hukum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dasar Hukum
                  </label>
                  <input
                    type="text"
                    value={formData.dasar_hukum}
                    onChange={(e) =>
                      setFormData({ ...formData, dasar_hukum: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan dasar hukum"
                    required
                  />
                </div>

                {/* Besaran Iuran Wajib */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Besaran Iuran Wajib
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={formData.besaran_iuran}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          besaran_iuran: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* POS Penerimaan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POS Penerimaan
                  </label>
                  <select
                    value={formData.pos_penerimaan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pos_penerimaan: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KAS RT">KAS RT</option>
                    <option value="KAS PKK">KAS PKK</option>
                  </select>
                </div>

                {/* Tombol Aksi */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModalForce}
                    className="flex-1 px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetIuranWargaPage;
