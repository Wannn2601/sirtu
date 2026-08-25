"use client"

import { useState, useMemo } from "react"
import { useAppContext } from "../../contexts/AppContext"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import { firestoreService } from "../../services/firebase"

const DataHunianPage = () => {
const { state } = useAppContext()
const dataHunian = state.dataHunian.data
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    blok: "",
    nomor_rumah: "",
    alamat: "",
    status_hunian: "",
    pemilik: "",
    penghuni: "+62",
    status_peruntukan: "Tempat Tinggal",
  })

  // filteredData menggunakan useMemo untuk performa
    // filteredData menggunakan useMemo untuk performa + sorting
  const filteredData = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase()
    if (!Array.isArray(dataHunian)) return []

    let result = q === ""
      ? dataHunian
      : dataHunian.filter((item = {}) => {
          const alamat = (item.alamat || "").toString().toLowerCase()
          const pemilik = (item.pemilik || "").toString().toLowerCase()
          const blok = (item.blok || "").toString().toLowerCase()
          return alamat.includes(q) || pemilik.includes(q) || blok.includes(q)
        })

    // sort by blok (A-Z) lalu nomor_rumah (asc)
    result = [...result].sort((a, b) => {
      const blokA = (a.blok || "").toString().localeCompare(b.blok || "")
      if (blokA !== 0) return blokA
      return (a.nomor_rumah || "").toString().localeCompare(b.nomor_rumah || "", undefined, { numeric: true })
    })

    return result
  }, [dataHunian, searchTerm])


  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      blok: "",
      nomor_rumah: "",
      alamat: "",
      status_hunian: "",
      pemilik: "",
      penghuni: "+62",
      status_peruntukan: "Tempat Tinggal",
    })
    setShowModal(true)

     if (!formData.penghuni.startsWith("+62")) {
          Swal.fire({
            title: "Error",
            text: "Nomor telepon harus dimulai dengan +62",
            icon: "error",
            customClass: { popup: "max-h-screen overflow-y-auto" },
          })
          return
        }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      blok: item.blok || "",
      nomor_rumah: item.nomor_rumah || "",
      alamat: item.alamat || "",
      status_hunian: item.status_hunian || "",
      pemilik: item.pemilik || "",
      penghuni: item.penghuni || "",
      status_peruntukan: item.status_peruntukan || "Tempat Tinggal",
    })
    setShowModal(true)
    
    if (!formData.penghuni.startsWith("+62")) {
          Swal.fire({
            title: "Error",
            text: "Nomor telepon harus dimulai dengan +62",
            icon: "error",
            customClass: { popup: "max-h-screen overflow-y-auto" },
          })
          return
        }
  }

  const handleDelete = async (item) => {
    const res = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus data ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    })

    if (!res.isConfirmed) return

    try {
      setLoading(true)
      await firestoreService.delete("hunian", item.id)
      // tidak perlu dispatch SET_DATA_HUNIAN — AppContext onSnapshot akan update state
await Swal.fire({
  icon: "success",
  title: "Berhasil",
  text: "Data berhasil dihapus.",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})
    } catch (err) {
      console.error("delete error:", err)
      await Swal.fire("Error", "Gagal menghapus data. Cek console.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // validasi
    if (!formData.blok || !formData.nomor_rumah || !formData.alamat || !formData.status_hunian || !formData.pemilik || !formData.status_peruntukan) {
      await Swal.fire("Error", "Semua field wajib diisi", "error")
      return
    }

    const actionText = editingItem ? "memperbarui" : "menambahkan"
    const result = await Swal.fire({
      title: `Konfirmasi ${editingItem ? "Update" : "Tambah"}`,
      text: `Apakah Anda yakin ingin ${actionText} data ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan!",
      cancelButtonText: "Batal",
    })
if (!formData.penghuni.startsWith("+62")) {
          Swal.fire({
            title: "Error",
            text: "Nomor telepon harus dimulai dengan +62",
            icon: "error",
            customClass: { popup: "max-h-screen overflow-y-auto" },
          })
          return
        }
    

    if (!result.isConfirmed) return

    try {
      setLoading(true)
      if (editingItem && editingItem.id) {
        // update di Firestore
        await firestoreService.update("hunian", editingItem.id, {
          ...formData,
          updated_at: new Date().toISOString(),
        })
        // AppContext onSnapshot akan men-refresh data
await Swal.fire({
  icon: "success",
  title: "Berhasil",
  text: editingItem ? "Data berhasil diperbarui." : "Data berhasil ditambahkan.",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})
      } else {
        // tambah ke Firestore
        const newId = await firestoreService.add("hunian", {
          ...formData,
          created_at: new Date().toISOString(),
        })
        // AppContext onSnapshot akan menambahkan data. (newId dikembalikan oleh service)
await Swal.fire({
  icon: "success",
  title: "Berhasil",
  text: editingItem ? "Data berhasil diperbarui." : "Data berhasil ditambahkan.",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})
      }
      setShowModal(false)
    } catch (err) {
      console.error("save error:", err)
      await Swal.fire("Error", "Gagal menyimpan data. Cek console.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    const r = await Swal.fire({
      title: "Konfirmasi Batal",
      text: "Apakah Anda yakin ingin membatalkan? Data yang belum disimpan akan hilang.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batal!",
      cancelButtonText: "Tidak",
    })
    if (r.isConfirmed) setShowModal(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Hunian</h1>
        <p className="text-gray-600">Kelola data hunian RT</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari data hunian..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={openAddModal}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blok</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Rumah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alamat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pemilik/Penanggungjawab/Pengelola</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Telephone/Hp/Whatsapp </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Peruntukan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData && filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.blok}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nomor_rumah}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.alamat}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status_hunian === "Dihuni" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status_hunian}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.pemilik}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.penghuni || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.status_peruntukan}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada data hunian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "Edit Data Hunian" : "Tambah Data Hunian"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blok *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.blok}
                    onChange={(e) => setFormData({ ...formData, blok: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">No. Rumah *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.nomor_rumah}
                    onChange={(e) => setFormData({ ...formData, nomor_rumah: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alamat *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Pemilik/Penanggungjawab/Pengelola *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.pemilik}
                  onChange={(e) => setFormData({ ...formData, pemilik: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telephone/Hp/Whatsapp (Tanpa Angka 0/NOL di depan)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.penghuni}
                  onChange={(e) => setFormData({ ...formData, penghuni: e.target.value })}
                  disabled={loading}
                        placeholder="+628xxxxxxxxx"

                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Hunian *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.status_hunian}
                  onChange={(e) => setFormData({ ...formData, status_hunian: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="">Pilih Status</option>
                  <option value="Dihuni">Dihuni</option>
                  <option value="Kosong">Kosong</option>
                </select>
              </div>

              <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Status Peruntukan *
  </label>
  <select
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    value={formData.status_peruntukan}
    onChange={(e) => setFormData({ ...formData, status_peruntukan: e.target.value })}
    required
    disabled={loading}
  >
    <option value="Tempat Tinggal">Tempat Tinggal</option>
    <option value="Kos">Kos</option>
    <option value="Kantor">Kantor</option>
    <option value="Tempat Usaha">Tempat Usaha</option>
  </select>
</div>


              {/* <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Penghuni</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.jumlah_penghuni}
                  onChange={(e) => setFormData({ ...formData, jumlah_penghuni: Number.parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
              </div> */}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataHunianPage
