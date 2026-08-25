"use client"

import { useState, useMemo, useEffect  } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, Upload } from "lucide-react"
import Swal from "sweetalert2"

import { db } from "../../services/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"


const TableSatuanAssetPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    kelompok: "",
    keterangan: "",
    status: "aktif",
  })

  const [data, setData] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "satuanAssets"), (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setData(items)
    })
    return () => unsub()
  }, [])

  const handleSeedData = async () => {
    const dummyData = [
      { kelompok: "Unit", keterangan: "Satuan untuk barang per unit", status: "aktif" },
      { kelompok: "Kg", keterangan: "Satuan untuk barang per kilogram", status: "aktif" },
      { kelompok: "Meter", keterangan: "Satuan untuk barang per meter", status: "tidak aktif" },
    ]

    try {
      for (const item of dummyData) {
        await addDoc(collection(db, "satuanAssets"), item)
      }
      Swal.fire("Berhasil!", "3 data dummy berhasil dikirim ke Firebase!", "success")
    } catch (err) {
      Swal.fire("Error!", err.message, "error")
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.kelompok.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [data, searchTerm])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handleAdd = () => {
    setEditMode(false)
    setCurrentItem(null)
    setFormData({ kelompok: "", keterangan: "", status: "aktif" })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditMode(true)
    setCurrentItem(item)
    setFormData({ kelompok: item.kelompok, keterangan: item.keterangan, status: item.status })
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    Swal.fire({
      title: "Hapus Data?",
      text: `Apakah Anda yakin ingin menghapus "${item.kelompok}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "satuanAssets", item.id))
          Swal.fire("Terhapus!", "Data berhasil dihapus.", "success")
        } catch (err) {
          Swal.fire("Error!", err.message, "error")
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.kelompok.trim()) {
      Swal.fire("Error!", "Data Satuan Aset harus diisi!", "error")
      return
    }

    try {
      if (editMode && currentItem) {
        const docRef = doc(db, "satuanAssets", currentItem.id)
        await updateDoc(docRef, formData)
        Swal.fire("Berhasil!", "Data berhasil diubah!", "success")
      } else {
        await addDoc(collection(db, "satuanAssets"), formData)
        Swal.fire("Berhasil!", "Data berhasil ditambahkan!", "success")
      }
      setShowModal(false)
    } catch (err) {
      Swal.fire("Error!", err.message, "error")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Table Satuan Asset</h1>
                <p className="text-gray-600 mt-1">Kelola data satuan asset</p>
              </div>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Data
              </button>
              {/* <button
                  onClick={handleSeedData}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seed Data
                </button> */}
            </div>
          </div>

          {/* Search and Controls */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 per halaman</option>
                <option value={10}>10 per halaman</option>
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satuan Aset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
             <tbody className="bg-white divide-y divide-gray-200">
  {paginatedData.map((item, index) => (
    <tr key={item.id} className="hover:bg-gray-50">
      {/* Nomor urut otomatis, bukan Firestore ID */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {(currentPage - 1) * itemsPerPage + index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.kelompok}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.keterangan}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === "aktif"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} sampai{" "}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1 text-sm">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{editMode ? "Edit Data" : "Tambah Data"}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Aset *</label>
                    <input
                      type="text"
                      value={formData.kelompok}
                      onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Masukkan Satuan Aset"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan </label>
                    <textarea
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Masukkan keterangan"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="aktif"
                          checked={formData.status === "aktif"}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="mr-2"
                        />
                        Aktif
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="tidak aktif"
                          checked={formData.status === "tidak aktif"}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="mr-2"
                        />
                        Tidak Aktif
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TableSatuanAssetPage
