"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, Upload } from "lucide-react"
import Swal from "sweetalert2"

// 🔥 Firebase
import { db } from "../../services/firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"

const PembuatanDawisPkkPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    dawis: "",
    nama_dawis: "",
    status: "aktif",
  })

  const [data, setData] = useState([])

  // 🔥 Ambil data real-time dari Firestore
  useEffect(() => {
  const unsub = onSnapshot(collection(db, "dawisPkk"), (snapshot) => {
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Urutkan A-Z by dawis (atau by createdAt kalau diinginkan)
    list.sort((a, b) => a.dawis.localeCompare(b.dawis))

    setData(list)
  })
  return () => unsub()
}, [])


  // 🔍 Filter pencarian
  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.dawis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nama_dawis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  // 🔢 Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  // ➕ Tambah data
  const handleAdd = () => {
    setEditMode(false)
    setCurrentItem(null)
    setFormData({ dawis: "", nama_dawis: "", status: "aktif" })
    setShowModal(true)
  }

  // ✏️ Edit data
  const handleEdit = (item) => {
    setEditMode(true)
    setCurrentItem(item)
    setFormData({ dawis: item.dawis, nama_dawis: item.nama_dawis, status: item.status })
    setShowModal(true)
  }

  // 🗑️ Hapus data
  const handleDelete = async (item) => {
    Swal.fire({
      title: "Hapus Data?",
      text: `Apakah Anda yakin ingin menghapus "${item.nama_dawis}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "dawisPkk", item.id))
        Swal.fire("Terhapus!", "Data berhasil dihapus.", "success")
      }
    })
  }

  // 💾 Simpan data (Tambah/Edit)
  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!formData.dawis.trim() || !formData.nama_dawis.trim()) {
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Semua field harus diisi!",
      timer: 3000,
      showConfirmButton: false
    })
    return
  }

  // ✅ Cek duplikasi (baik dawis maupun nama_dawis)
  const isDuplicate = data.some(
    (item) =>
      (item.dawis.toLowerCase() === formData.dawis.toLowerCase() ||
       item.nama_dawis.toLowerCase() === formData.nama_dawis.toLowerCase()) &&
      (!editMode || item.id !== currentItem?.id)
  )

  if (isDuplicate) {
    Swal.fire({
      icon: "error",
      title: "Data Duplikat!",
      text: "Dawis atau Nama Dawis sudah ada, silakan ganti.",
      timer: 3000,
      showConfirmButton: false
    })
    return
  }

  try {
    if (editMode) {
      await updateDoc(doc(db, "dawisPkk", currentItem.id), {
        ...formData,
        updatedAt: serverTimestamp(),
      })
    } else {
      await addDoc(collection(db, "dawisPkk"), {
        ...formData,
        createdAt: serverTimestamp(),
      })
    }

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: editMode ? "Data berhasil diubah!" : "Data berhasil ditambahkan!",
      timer: 3000,
      showConfirmButton: false
    })

    setShowModal(false)
  } catch (error) {
    console.error(error)
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Terjadi kesalahan saat menyimpan data.",
      timer: 3000,
      showConfirmButton: false
    })
  }
}


  // ❌ Batal
  const handleCancel = () => {
    if (formData.dawis.trim() || formData.nama_dawis.trim()) {
      Swal.fire({
        title: "Batalkan Perubahan?",
        text: "Data yang sudah diisi akan hilang. Apakah Anda yakin?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Ya, Batalkan!",
        cancelButtonText: "Tidak",
      }).then((result) => {
        if (result.isConfirmed) {
          setShowModal(false)
        }
      })
    } else {
      setShowModal(false)
    }
  }

  // 🔥 Upload Dummy Data
  const handleUploadDummy = async () => {
    const dummyData = [
      { dawis: "Dawis 1", nama_dawis: "Dawis Mawar", status: "aktif" },
      { dawis: "Dawis 2", nama_dawis: "Dawis Melati", status: "aktif" },
      { dawis: "Dawis 3", nama_dawis: "Dawis Anggrek", status: "tidak aktif" },
      { dawis: "Dawis 4", nama_dawis: "Dawis Sakura", status: "aktif" },
    ]

    Swal.fire({
      title: "Upload Dummy Data?",
      text: "Data contoh akan dimasukkan ke Firebase.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Upload!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        for (const item of dummyData) {
          await addDoc(collection(db, "dawisPkk"), {
            ...item,
            createdAt: serverTimestamp(),
          })
        }
        Swal.fire("Berhasil!", "Dummy data berhasil diupload.", "success")
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-700">Pembuatan Dawis PKK</h1>
          <div className="flex gap-2">
            {/* <button
              onClick={handleUploadDummy}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            >
              <Upload size={18} /> Upload Dummy
            </button> */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
            >
              <Plus size={18} /> Tambah
            </button>
          </div>
        </div>

        {/* 🔍 Search */}
        <div className="relative mb-4">
          <Search className="absolute top-2.5 left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari Dawis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 📋 Table */}
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">No</th>
                <th className="p-3 border">Dawis</th>
                <th className="p-3 border">Nama Dawis</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={item.id} className="text-center hover:bg-gray-50">
                  <td className="p-3 border">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="p-3 border">{item.dawis}</td>
                  <td className="p-3 border">{item.nama_dawis}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        item.status === "aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 border flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-4 text-gray-500 text-center">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🔢 Pagination */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 📝 Modal Form */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-4">{editMode ? "Edit Dawis" : "Tambah Dawis"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Dawis"
                  value={formData.dawis}
                  onChange={(e) => setFormData({ ...formData, dawis: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nama Dawis"
                  value={formData.nama_dawis}
                  onChange={(e) => setFormData({ ...formData, nama_dawis: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="aktif">Aktif</option>
                  <option value="tidak aktif">Tidak Aktif</option>
                </select>
                <button
                  type="submit"
                  className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  {editMode ? "Simpan Perubahan" : "Tambah Dawis"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PembuatanDawisPkkPage
