"use client"

import { useState } from "react"
import { useAppContext } from "../../contexts/AppContext"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import { firestoreService } from "../../services/firebase"

const BuatSubRekeningKegiatanPage = () => {
  const { state, dispatch } = useAppContext()
  // const subRekeningKegiatanData = state.subRekeningKegiatan?.data || []

  // 🔹 Rekening wajib default
  const defaultRekenings = [
    {
      id: "1",
      kelompok_pembukuan: "Kas",
      status: "aktif",
      is_locked: true,
      createdAt: new Date().toISOString(),
    },
  ]

  // 🔹 Gabungkan default dengan Firestore, hindari duplikasi
  const rekeningKegiatanData = [
    ...defaultRekenings.filter(
      (def) =>
        !state.rekeningKegiatan?.data?.some(
          (d) => d.kelompok_pembukuan === def.kelompok_pembukuan
        )
    ),
    ...(state.rekeningKegiatan?.data || []),
  ]

  // 🔹 Default sub rekening wajib
const defaultSubRekenings = [
  {
    id: "1.1",
    sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu",
    kelompok_pembukuan: "Kas",
    pembukuan: "RT",
    id_kelompok: "1",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "1.2",
    sub_rekening_kegiatan: "Iuran Wajib Warga",
    kelompok_pembukuan: "Kas",
    pembukuan: "RT",
    id_kelompok: "1",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2.1",
    sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu",
    kelompok_pembukuan: "Kas",
    pembukuan: "PKK",
    id_kelompok: "2",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2.2",
    sub_rekening_kegiatan: "Iuran Wajib PKK",
    kelompok_pembukuan: "Kas",
    pembukuan: "PKK",
    id_kelompok: "2",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
]

// 🔹 Gabungkan default dengan Firestore (hindari duplikasi)
const subRekeningKegiatanData = [
  ...defaultSubRekenings.filter(
    (def) =>
      !state.subRekeningKegiatan?.data?.some(
        (d) => d.id === def.id
      )
  ),
  ...(state.subRekeningKegiatan?.data || []),
]


  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    id: "",
    sub_rekening_kegiatan: "",
    kelompok_pembukuan: "",
    pembukuan: "",
    id_kelompok: "",
  })

  const filteredData = subRekeningKegiatanData.filter(
    (item) =>
      item.sub_rekening_kegiatan
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.kelompok_pembukuan
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  )

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      id: "",
      sub_rekening_kegiatan: "",
      kelompok_pembukuan: "",
      pembukuan: "",
      id_kelompok: "",
    })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    if (item.is_locked) {
      Swal.fire("Peringatan", "Data ini tidak dapat diubah karena terkunci", "warning")
      return
    }
    setEditingItem(item)
    setFormData({
      id: item.id,
      sub_rekening_kegiatan: item.sub_rekening_kegiatan,
      kelompok_pembukuan: item.kelompok_pembukuan,
      pembukuan: item.pembukuan,
      id_kelompok: item.id_kelompok,
    })
    setShowModal(true)
  }

  const handleDelete = (item) => {
    if (item.is_locked) {
      Swal.fire("Peringatan", "Data ini tidak dapat dihapus karena terkunci", "warning")
      return
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
          await firestoreService.delete("subRekeningKegiatan", item.id)
          dispatch({ type: "DELETE_SUB_REKENING_KEGIATAN", payload: item.id })
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data berhasil dihapus.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
        } catch (err) {
          Swal.fire("Error", err.message, "error")
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.kelompok_pembukuan.trim()) {
      Swal.fire("Error", "Kelompok pembukuan harus diisi", "error")
      return
    }

    const action = editingItem ? "memperbarui" : "menambahkan"
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
      if (!result.isConfirmed) return

      try {
        if (editingItem) {
          await firestoreService.update("subRekeningKegiatan", formData.id, {
            sub_rekening_kegiatan: formData.sub_rekening_kegiatan,
            kelompok_pembukuan: formData.kelompok_pembukuan,
            pembukuan: formData.pembukuan,
            id_kelompok: formData.id_kelompok,
            updated_at: new Date().toISOString(),
          })

          dispatch({
            type: "UPDATE_SUB_REKENING_KEGIATAN",
            payload: { ...formData, updated_at: new Date().toISOString() },
          })

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data berhasil diperbarui.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
        } else {
          // 🔹 Cari sub rekening terakhir untuk kelompok ini
         const existingSubs = subRekeningKegiatanData
  .filter((s) => s.id_kelompok === formData.id_kelompok)
  .map((s) => Number(s.id.split(".")[1]))

const nextSubNumber =
  existingSubs.length === 0 ? 1 : Math.max(...existingSubs) + 1
const newId = `${formData.id_kelompok}.${nextSubNumber}`


          await firestoreService.setDocCustom("subRekeningKegiatan", newId, {
            id: newId,
            sub_rekening_kegiatan: formData.sub_rekening_kegiatan,
            kelompok_pembukuan: formData.kelompok_pembukuan,
            pembukuan: formData.pembukuan,
            id_kelompok: formData.id_kelompok,
            status: "aktif",
            is_locked: false,
            created_at: new Date().toISOString(),
          })

          dispatch({
            type: "ADD_SUB_REKENING_KEGIATAN",
            payload: {
              id: newId,
              sub_rekening_kegiatan: formData.sub_rekening_kegiatan,
              kelompok_pembukuan: formData.kelompok_pembukuan,
              pembukuan: formData.pembukuan,
              id_kelompok: formData.id_kelompok,
              status: "aktif",
              is_locked: false,
              created_at: new Date().toISOString(),
            },
          })

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Sub rekening berhasil ditambahkan.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
        }

        setShowModal(false)
        setFormData({
          id: "",
          sub_rekening_kegiatan: "",
          kelompok_pembukuan: "",
          pembukuan: "",
          id_kelompok: "",
        })
      } catch (err) {
        Swal.fire("Error", err.message, "error")
      }
    })
  }

  const handleKelompokChange = (kelompokName) => {
    const selectedKelompok = rekeningKegiatanData.find(
      (k) => k.kelompok_pembukuan === kelompokName
    )
    setFormData({
      ...formData,
      kelompok_pembukuan: kelompokName,
      id_kelompok: selectedKelompok ? selectedKelompok.id : "",
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Buat Sub Rekening Kegiatan
        </h1>
        <p className="text-gray-600">Kelola sub rekening kegiatan RT</p>
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
            <button
              onClick={handleAdd}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Data
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Rekening Kegiatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kelompok Pembukuan
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
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.sub_rekening_kegiatan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.kelompok_pembukuan}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem
                ? "Edit Sub Rekening Kegiatan"
                : "Tambah Sub Rekening Kegiatan"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kelompok Pembukuan *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.kelompok_pembukuan}
                  onChange={(e) => handleKelompokChange(e.target.value)}
                  required
                >
                  <option value="">Pilih Kelompok Pembukuan</option>
                  {rekeningKegiatanData.map((kelompok) => (
                    <option key={kelompok.id} value={kelompok.kelompok_pembukuan}>
                      {kelompok.kelompok_pembukuan}
                    </option>
                  ))}
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
                  Rekening Kegiatan *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.sub_rekening_kegiatan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sub_rekening_kegiatan: e.target.value,
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
                        setShowModal(false)
                        setFormData({
                          id: "",
                          sub_rekening_kegiatan: "",
                          kelompok_pembukuan: "",
                          pembukuan: "",
                          id_kelompok: "",
                        })
                      }
                    })
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
  )
}

export default BuatSubRekeningKegiatanPage
