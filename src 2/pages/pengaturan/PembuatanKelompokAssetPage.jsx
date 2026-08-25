"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, Upload } from "lucide-react"
import Swal from "sweetalert2"

import { db } from "../../services/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore"

const PembuatanKelompokAssetPage = () => {
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

  // 🔹 Ambil data realtime dari Firebase
 useEffect(() => {
  const unsub = onSnapshot(collection(db, "kelompokAssets"), (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,          // ID Firebase
      ...docSnap.data(),       // termasuk kode, kelompok, keterangan, status
    }))
    setData(items)
  })
  return () => unsub()
}, [])

  // 🔹 Seed dummy data ke Firebase
  // 🔹 Seed dummy data ke Firebase (hapus dulu semua)
const handleSeedData = async () => {
  const dummyData = [
    { kelompok: "Elektronik", keterangan: "Peralatan elektronik dan gadget", status: "aktif" },
    { kelompok: "Furniture", keterangan: "Meja, kursi, lemari dan perabotan", status: "aktif" },
    { kelompok: "Kendaraan", keterangan: "Motor, mobil dan kendaraan lainnya", status: "tidak aktif" },
    { kelompok: "Bala Bala", keterangan: "Mobil dan kendaraan lainnya", status: "tidak aktif" },
  ]

  try {
    // 1️⃣ Ambil semua dokumen lama
    const snapshot = await getDocs(collection(db, "kelompokAssets"))

    // 2️⃣ Hapus semua data lama
    const deletePromises = snapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, "kelompokAssets", docSnap.id))
    )
    await Promise.all(deletePromises)

    // 3️⃣ Tambahkan dummy baru dengan kode auto increment
    let kode = 1
    const addPromises = dummyData.map((item) =>
      addDoc(collection(db, "kelompokAssets"), {
        ...item,
        kode: kode++, // kode auto increment
      })
    )
    await Promise.all(addPromises)

    Swal.fire("Berhasil!", "Dummy data berhasil dikirim ke Firebase!", "success")
  } catch (err) {
    Swal.fire("Error!", err.message, "error")
  }
}


  // 🔹 Filtering & Pagination
 const filteredData = useMemo(() => {
  return data
    .filter(
      (item) =>
        item.kelompok?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.kelompok.localeCompare(b.kelompok)) // ✅ sort A-Z
}, [data, searchTerm])


  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  // 🔹 Add/Edit
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

  // 🔹 Delete
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
          await deleteDoc(doc(db, "kelompokAssets", item.id))
Swal.fire({
  icon: "success",
  title: "Berhasil!",
  text: "Data berhasil dihapus!",
  timer: 3000,
  showConfirmButton: false
})
        } catch (err) {
          Swal.fire("Error!", err.message, "error")
        }
      }
    })
  }

  // 🔹 Submit Add/Edit
  const handleSubmit = async (e) => {
  e.preventDefault()

  if (!formData.kelompok.trim() || !formData.keterangan.trim()) {
    Swal.fire("Error!", "Semua field harus diisi!", "error")
    return
  }

  try {
    if (editMode && currentItem) {
      // update data lama
      const docRef = doc(db, "kelompokAssets", currentItem.id)
      await updateDoc(docRef, formData)
Swal.fire({
  icon: "success",
  title: "Berhasil!",
  text: "Data berhasil diubah!",
  timer: 3000,
  showConfirmButton: false
})
    } else {
      // hitung kode terakhir
      const lastKode = data.length > 0 ? Math.max(...data.map((d) => d.kode || 0)) : 0
      const newKode = lastKode + 1

      await addDoc(collection(db, "kelompokAssets"), {
        ...formData,
        kode: newKode, // kode auto increment
      })

Swal.fire({
  icon: "success",
  title: "Berhasil!",
  text: "Data berhasil ditambahkan!",
  timer: 3000,
  showConfirmButton: false
})
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
                <h1 className="text-2xl font-bold text-gray-900">Pembuatan Kelompok Asset</h1>
                <p className="text-gray-600 mt-1">Kelola data kelompok asset</p>
              </div>
              <div className="flex gap-2">
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
                  Upload Dummy
                </button> */}
              </div>
            </div>
          </div>

          {/* Search */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelompok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
             <tbody className="bg-white divide-y divide-gray-200">
  {paginatedData.map((item, index) => (
    <tr key={item.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        {(currentPage - 1) * itemsPerPage + index + 1} {/* ✅ Nomor urut konsisten */}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.kelompok}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.keterangan}</td>
      <td className="px-6 py-4">
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
      <td className="px-6 py-4 text-sm font-medium">
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
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm">
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

      {/* Modal Tambah/Edit */}
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
                <h3 className="text-lg font-semibold">{editMode ? "Edit Data" : "Tambah Data"}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Kelompok *</label>
                    <input
                      type="text"
                      value={formData.kelompok}
                      onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Keterangan *</label>
                    <textarea
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status *</label>
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
                    className="flex-1 px-4 py-2 border rounded"
                  >
                    Batal
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded">
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

export default PembuatanKelompokAssetPage
