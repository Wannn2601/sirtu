"use client";

import { useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { firestoreService } from "../../services/firebase";

const BuatSubRekeningKegiatanPage = () => {
  const { state, dispatch } = useAppContext();

  const defaultRekenings = [
    {
      id: "1",
      pencatatan: "Penerimaan",
      status: "aktif",
      is_locked: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      pencatatan: "Pengeluaran",
      status: "aktif",
      is_locked: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const rekeningKegiatanData = [
    ...defaultRekenings.filter(
      (def) =>
        !state.rekeningKegiatan?.data?.some(
          (d) => d.pencatatan === def.pencatatan
        )
    ),
    ...(state.rekeningKegiatan?.data || []),
  ];

  const defaultSubRekenings = [
    {
      id: "1.1",
      uraian: "Silpa Warga Tahun Lalu",
      pencatatan: "Penerimaan",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "1.2",
      uraian: "Iuran Pengelolaan Lingkungan (IPL) Warga",
      pencatatan: "Penerimaan",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.1",
      uraian: "Silpa PKK Tahun Lalu",
      pencatatan: "Penerimaan",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "2.2",
      uraian: "Iuran Wajib PKK",
      pencatatan: "Penerimaan",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "1.5",
      uraian: "Donatur Pembangunan oleh Warga / Pihak Lain",
      pencatatan: "Penerimaan",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
      created_at: new Date().toISOString(),
    },
  ];

  const subRekeningKegiatanData = [
    ...defaultSubRekenings.filter(
      (def) => !state.subRekeningKegiatan?.data?.some((d) => d.id === def.id)
    ),
    ...(state.subRekeningKegiatan?.data || []),
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [formData, setFormData] = useState({
    id: "",
    uraian: "",
    pencatatan: "",
    pembukuan: "",
    id_kelompok: "",
  });

  const filteredData = subRekeningKegiatanData.filter(
    (item) =>
      item.uraian?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pencatatan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (
      selectedItems.size ===
      filteredData.filter((item) => !item.is_locked).length
    ) {
      setSelectedItems(new Set());
    } else {
      const allSelectableIds = new Set(
        filteredData.filter((item) => !item.is_locked).map((item) => item.id)
      );
      setSelectedItems(allSelectableIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      Swal.fire(
        "Peringatan",
        "Pilih data yang ingin dihapus terlebih dahulu",
        "warning"
      );
      return;
    }

    Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus ${selectedItems.size} data yang dipilih?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus Semua!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          for (const itemId of selectedItems) {
            await firestoreService.delete("subRekeningKegiatan", itemId);
            dispatch({ type: "DELETE_SUB_REKENING_KEGIATAN", payload: itemId });
          }

          setSelectedItems(new Set());
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: `${selectedItems.size} data berhasil dihapus.`,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        } catch (err) {
          Swal.fire("Error", err.message, "error");
        }
      }
    });
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      id: "",
      uraian: "",
      pencatatan: "",
      pembukuan: "",
      id_kelompok: "",
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    if (item.is_locked) {
      Swal.fire(
        "Peringatan",
        "Data ini tidak dapat diubah karena terkunci",
        "warning"
      );
      return;
    }
    setEditingItem(item);
    setFormData({
      id: item.id,
      uraian: item.uraian,
      pencatatan: item.pencatatan,
      pembukuan: item.pembukuan,
      id_kelompok: item.id_kelompok,
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (item.is_locked) {
      Swal.fire(
        "Peringatan",
        "Data ini tidak dapat dihapus karena terkunci",
        "warning"
      );
      return;
    }

    Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus data ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await firestoreService.delete("subRekeningKegiatan", item.id);
          dispatch({ type: "DELETE_SUB_REKENING_KEGIATAN", payload: item.id });
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data berhasil dihapus.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        } catch (err) {
          Swal.fire("Error", err.message, "error");
        }
      }
    });
  };

  // 🔁 Update laporanKeuangan jika subRekening berubah
  const updateRelatedLaporanKeuangan = async (subRekeningId, updatedFields) => {
    try {
      const laporanList = await firestoreService.getAll("laporanKeuangan");
      const related = laporanList.filter(
        (item) => item.id_sub_rekening_kegiatan === subRekeningId
      );

      for (const laporan of related) {
        await firestoreService.update("laporanKeuangan", laporan.id, {
          ...updatedFields,
          updatedAt: new Date().toISOString(),
        });
      }

      if (related.length > 0) {
        Swal.fire({
          icon: "info",
          title: "Sinkronisasi Berhasil",
          text: `${related.length} data laporan keuangan diperbarui agar sesuai dengan perubahan sub rekening.`,
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error updating laporanKeuangan:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.pencatatan.trim()) {
      Swal.fire("Error", "Pencatatan harus diisi", "error");
      return;
    }

    const action = editingItem ? "memperbarui" : "menambahkan";
    Swal.fire({
      title: "Konfirmasi",
      text: `Apakah Anda yakin ingin ${action} data ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Ya, Simpan!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        if (editingItem) {
          const updatedData = {
            uraian: formData.uraian,
            pencatatan: formData.pencatatan,
            pembukuan: formData.pembukuan,
            id_kelompok: formData.id_kelompok,
            updated_at: new Date().toISOString(),
          };

          await firestoreService.update(
            "subRekeningKegiatan",
            formData.id,
            updatedData
          );

          // 🔁 Update juga data laporanKeuangan yang terkait
          await updateRelatedLaporanKeuangan(formData.id, {
            uraian: formData.uraian,
            pembukuan: formData.pembukuan,
            jenis_pembukuan: formData.pencatatan,
          });

          dispatch({
            type: "UPDATE_SUB_REKENING_KEGIATAN",
            payload: { ...formData, updated_at: new Date().toISOString() },
          });

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data dan laporan keuangan terkait berhasil diperbarui.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        } else {
          const existingSubs = subRekeningKegiatanData
            .filter((s) => s.id_kelompok === formData.id_kelompok)
            .map((s) => Number(s.id.split(".")[1]));

          const nextSubNumber =
            existingSubs.length === 0 ? 1 : Math.max(...existingSubs) + 1;
          const newId = `${formData.id_kelompok}.${nextSubNumber}`;

          await firestoreService.setDocCustom("subRekeningKegiatan", newId, {
            id: newId,
            uraian: formData.uraian,
            pencatatan: formData.pencatatan,
            pembukuan: formData.pembukuan,
            id_kelompok: formData.id_kelompok,
            status: "aktif",
            is_locked: false,
            created_at: new Date().toISOString(),
          });

          dispatch({
            type: "ADD_SUB_REKENING_KEGIATAN",
            payload: {
              id: newId,
              uraian: formData.uraian,
              pencatatan: formData.pencatatan,
              pembukuan: formData.pembukuan,
              id_kelompok: formData.id_kelompok,
              status: "aktif",
              is_locked: false,
              created_at: new Date().toISOString(),
            },
          });

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Sub rekening berhasil ditambahkan.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        }

        setShowModal(false);
        setFormData({
          id: "",
          uraian: "",
          pencatatan: "",
          pembukuan: "",
          id_kelompok: "",
        });
      } catch (err) {
        Swal.fire("Error", err.message, "error");
      }
    });
  };

  const handlePencatatanChange = (pencatatanName) => {
    const selectedKelompok = rekeningKegiatanData.find(
      (k) => k.pencatatan === pencatatanName
    );
    setFormData({
      ...formData,
      pencatatan: pencatatanName,
      id_kelompok: selectedKelompok ? selectedKelompok.id : "",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kelompok Pembukuan</h1>
        <p className="text-gray-600">Kelola Kelompok Pembukuan</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari sub rekening kegiatan..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus ({selectedItems.size})
                </button>
              )}
              <button
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Data
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.size > 0 &&
                      selectedItems.size ===
                        filteredData.filter((item) => !item.is_locked).length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uraian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pencatatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pembukuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${
                    item.is_locked ? "bg-gray-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      disabled={item.is_locked}
                      className="rounded border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.uraian}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.pencatatan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.pembukuan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {item.is_locked ? (
                        <span className="text-red-600 text-xs bg-red-100 px-2 py-1 rounded">
                          Lock
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem
                ? "Edit Sub Kelompok Pembukuan"
                : "Tambah Sub Kelompok Pembukuan"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pencatatan *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.pencatatan}
                  onChange={(e) => handlePencatatanChange(e.target.value)}
                  required
                >
                  <option value="">Pilih Pencatatan</option>
                  <option value="Penerimaan">Penerimaan</option>
                  <option value="Pengeluaran">Pengeluaran</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  value={
                    editingItem
                      ? formData.id
                      : `${formData.id_kelompok || "X"}.X`
                  }
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uraian *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.uraian}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      uraian: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pembukuan *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pembukuan"
                      value="RT"
                      checked={formData.pembukuan === "RT"}
                      onChange={(e) =>
                        setFormData({ ...formData, pembukuan: e.target.value })
                      }
                      className="mr-2"
                    />
                    Kas RT
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pembukuan"
                      value="PKK"
                      checked={formData.pembukuan === "PKK"}
                      onChange={(e) =>
                        setFormData({ ...formData, pembukuan: e.target.value })
                      }
                      className="mr-2"
                    />
                    Kas PKK
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    Swal.fire({
                      title: "Konfirmasi",
                      text: "Apakah Anda yakin ingin membatalkan? Data yang diisi akan hilang.",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#ef4444",
                      cancelButtonColor: "#6b7280",
                      confirmButtonText: "Ya, Batal!",
                      cancelButtonText: "Tidak",
                      customClass: {
                        popup: "max-h-screen overflow-y-auto",
                      },
                    }).then((result) => {
                      if (result.isConfirmed) {
                        setShowModal(false);
                        setFormData({
                          id: "",
                          uraian: "",
                          pencatatan: "",
                          pembukuan: "",
                          id_kelompok: "",
                        });
                      }
                    });
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuatSubRekeningKegiatanPage;
