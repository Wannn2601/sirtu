"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X } from "lucide-react"
import Swal from "sweetalert2"

import { db } from "../../services/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore"

const TablePekerjaanPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    nama_pekerjaan: "",
    status: "Aktif",
  })

  const [data, setData] = useState([])

  useEffect(() => {
  const unsub = onSnapshot(collection(db, "pekerjaan"), (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      docId: docSnap.id, // id asli Firestore
      ...docSnap.data(), // termasuk field id (number)
    }))

    // 🔥 Urutkan berdasarkan field id
    const sortedItems = items.sort((a, b) => (a.id || 0) - (b.id || 0))

    setData(sortedItems)
  })
  return () => unsub()
}, [])


  // 🔎 Filtering
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const nama = item.nama_pekerjaan?.toLowerCase() || ""
      const status = item.status?.toLowerCase() || ""
      const term = searchTerm.toLowerCase()
      return nama.includes(term) || status.includes(term)
    })
  }, [data, searchTerm])

  // 📄 Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  // ➕ Tambah Data
  const handleAdd = () => {
    setEditMode(false)
    setCurrentItem(null)
    setFormData({ nama_pekerjaan: "", status: "Aktif" })
    setShowModal(true)
  }

  // ✏️ Edit Data
  const handleEdit = (item) => {
    setEditMode(true)
    setCurrentItem(item)
    setFormData({ nama_pekerjaan: item.nama_pekerjaan, status: item.status })
    setShowModal(true)
  }

  // ❌ Hapus Data
  const handleDelete = async (item) => {
    Swal.fire({
      title: "Hapus Data?",
      text: `Apakah Anda yakin ingin menghapus "${item.nama_pekerjaan}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "pekerjaan", item.docId))
          Swal.fire("Terhapus!", "Data berhasil dihapus.", "success")
        } catch (err) {
          console.error("Error deleting job:", err)
          Swal.fire("Error!", err.message, "error")
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nama_pekerjaan.trim()) {
      Swal.fire("Error!", "Nama pekerjaan wajib diisi!", "error")
      return
    }

    try {
      if (editMode && currentItem) {
        const docRef = doc(db, "pekerjaan", currentItem.docId)
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp(),
        })
        Swal.fire("Berhasil!", "Data berhasil diubah!", "success")
      } else {
        // Cari id terakhir (jika data kosong maka mulai dari 1)
        const lastId = data.length > 0 ? Math.max(...data.map((d) => d.id || 0)) : 0
        const newId = lastId + 1

        await addDoc(collection(db, "pekerjaan"), {
          id: newId,
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
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
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Table Pekerjaan</h1>
              <p className="text-gray-600 mt-1">Kelola data pekerjaan</p>
            </div>
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Data
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari pekerjaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={5}>5 per halaman</option>
              <option value={10}>10 per halaman</option>
              <option value={25}>25 per halaman</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Pekerjaan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
  {paginatedData.map((item) => (
    <tr key={item.docId} className="hover:bg-gray-50">
      {/* gunakan id dari firestore */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nama_pekerjaan}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.status}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900">
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
          <div className="px-6 py-4 border-t flex justify-between items-center text-sm">
            <span>
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Selanjutnya
              </button>
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
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">{editMode ? "Edit Pekerjaan" : "Tambah Pekerjaan"}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium">Nama Pekerjaan *</label>
                  <input
                    type="text"
                    value={formData.nama_pekerjaan}
                    onChange={(e) => setFormData({ ...formData, nama_pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Masukkan nama pekerjaan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Status *</label>
                  <div className="flex space-x-4 mt-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="Aktif"
                        checked={formData.status === "Aktif"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mr-2"
                      />
                      Aktif
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="Tidak Aktif"
                        checked={formData.status === "Tidak Aktif"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mr-2"
                      />
                      Tidak Aktif
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded">
                    Batal
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
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

export default TablePekerjaanPage
