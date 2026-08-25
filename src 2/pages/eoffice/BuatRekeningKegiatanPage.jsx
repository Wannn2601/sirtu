"use client"

import { useState } from "react"
import { useAppContext } from "../../contexts/AppContext"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import { firestoreService } from "../../services/firebase"

const BuatRekeningKegiatanPage = () => {
 const { state, dispatch } = useAppContext()
const subRekeningKegiatanData = state.subRekeningKegiatan?.data || []

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

// 🔹 Gabungkan default dengan data Firestore
const rekeningKegiatanData = [
  ...defaultRekenings.filter(
    (def) =>
      !state.rekeningKegiatan?.data?.some((d) => d.id === def.id)
  ),
  ...(state.rekeningKegiatan?.data || []),
]


  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    id: "",
    kelompok_pembukuan: "",
  })

  // ✅ rekeningKegiatanData sudah aman dipakai
  const filteredData = rekeningKegiatanData.filter((item) =>
    item.kelompok_pembukuan
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({ id: "", kelompok_pembukuan: "" })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    if (item.is_locked) {
      Swal.fire(
        "Peringatan",
        "Data ini tidak dapat diubah karena terkunci",
        "warning"
      )
      return
    }
    setEditingItem(item)
    setFormData({ id: item.id, kelompok_pembukuan: item.kelompok_pembukuan })
    setShowModal(true)
  }

  const handleDelete = (item) => {
    if (item.is_locked) {
      Swal.fire(
        "Peringatan",
        "Data ini tidak dapat dihapus karena terkunci",
        "warning"
      )
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
          await firestoreService.delete("rekeningKegiatan", item.id)
          dispatch({ type: "DELETE_REKENING_KEGIATAN", payload: item.id })
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
          await firestoreService.update("rekeningKegiatan", formData.id, {
            kelompok_pembukuan: formData.kelompok_pembukuan,
            updatedAt: new Date().toISOString(),
          })
          dispatch({
            type: "UPDATE_REKENING_KEGIATAN",
            payload: {
              ...editingItem,
              ...formData,
              updatedAt: new Date().toISOString(),
            },
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
          // 🔹 Cari ID terakhir
         // Cari semua ID yang sudah ada
const existingIds = rekeningKegiatanData.map((r) => Number(r.id))

// Ambil ID terbesar lalu tambah 1
const nextId =
  existingIds.length === 0 ? 1 : Math.max(...existingIds) + 1

const newId = String(nextId)

          const generatedId = String(nextId)

          // 🔹 Simpan dengan ID custom
          await firestoreService.setDocCustom(
            "rekeningKegiatan",
            generatedId,
            {
              id: generatedId,
              kelompok_pembukuan: formData.kelompok_pembukuan,
              status: "aktif",
              is_locked: false,
              createdAt: new Date().toISOString(),
            }
          )

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data berhasil ditambahkan.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
        }

        setShowModal(false)
        setFormData({ id: "", kelompok_pembukuan: "" })
      } catch (err) {
        Swal.fire("Error", err.message, "error")
      }
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Buat Rekening Kegiatan
        </h1>
        <p className="text-gray-600">Kelola rekening kegiatan RT</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari rekening kegiatan..."
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
                  Kelompok Pembukuan
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
                    {item.kelompok_pembukuan}
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
                ? "Edit Rekening Kegiatan"
                : "Tambah Rekening Kegiatan"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  value={editingItem ? formData.id : "Auto Generate"}
                  disabled
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kelompok Pembukuan *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.kelompok_pembukuan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kelompok_pembukuan: e.target.value,
                    })
                  }
                  required
                />
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
                    }).then((result) => {
                      if (result.isConfirmed) {
                        setShowModal(false)
                        setFormData({ id: "", kelompok_pembukuan: "" })
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

export default BuatRekeningKegiatanPage
