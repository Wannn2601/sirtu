"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react"
import Swal from "sweetalert2"
import {
  useAppState,
  useAppDispatch,
  addAgeCategory,
  updateAgeCategory,
  deleteAgeCategory,
} from "../../contexts/AppContext"
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../services/firebase" // pastikan path benar

const KategoriUsiaPage = () => {
  const app = useAppState()
  console.log("🧩 Full app state:", app)

  const { ageCategories = [] } = app.state // ✅ ambil dari dalam app.state

  const state = useAppState()
  const dispatch = useAppDispatch()
  console.log("🧩 Full state di KategoriUsiaPage:", state)

  // Ambil langsung ageCategories dari state.user
  // const ageCategories = state.ageCategories || []

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log("🔍 Mulai ambil data ageCategories...")
        const querySnapshot = await getDocs(collection(db, "ageCategories"))
        console.log("📂 Jumlah dokumen:", querySnapshot.size)

        const data = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id, // ✅ pakai docId asli
          ...docSnap.data(),
        }))

        console.log("📄 Data hasil Firestore:", data)

        dispatch({ type: "SET_AGE_CATEGORIES", payload: data })
      } catch (error) {
        console.error("🔥 Error fetching categories:", error)
      }
    }

    fetchCategories()
  }, [dispatch])

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    kategori: "",
    dari: "",
    sampai: "",
  })

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    return ageCategories
      .filter((category) => category.kategori.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.dari - b.dari)
  }, [ageCategories, searchTerm])

  // if (!ageCategories || ageCategories.length === 0) {
  //   console.log("ini data age", ageCategories)

  //   return (
  //     <div className="space-y-6">
  //       <div className="bg-white rounded-lg shadow-sm p-6">
  //         <div className="text-center py-8">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
  //           <p className="text-gray-600">Memuat data kategori usia...</p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // Pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage)

  const handleInputChange = (e) => {
    // normalize koma jadi titik
    const { name, value } = e.target
    let normalizedValue = value.replace(",", ".")
    setFormData((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }))
  }

  const resetForm = () => {
    setFormData({
      kategori: "",
      dari: "",
      sampai: "",
    })
    setEditingCategory(null)
  }

  const handleAddCategory = () => {
    setShowModal(true)
    resetForm()
  }

  const handleEditCategory = (category) => {
    setEditingCategory(category)
    setFormData({
      kategori: category.kategori,
      dari: category.dari.toString(),
      sampai: category.sampai.toString(),
    })
    setShowModal(true)
  }

  const validateAgeRange = (kategori, dari, sampai, excludeId = null) => {
    const dariNum = Number.parseFloat(dari)
    const sampaiNum = Number.parseFloat(sampai)

    if (dariNum >= sampaiNum) {
      return 'Usia "dari" harus lebih kecil dari usia "sampai"'
    }

    // Check for duplicate category name (excluding current item when editing)
    const duplicateName = ageCategories.find(
      (cat) => cat.id !== excludeId && cat.kategori.toLowerCase().trim() === kategori.toLowerCase().trim(),
    )

    if (duplicateName) {
      return "Nama kategori sudah ada, gunakan nama yang berbeda"
    }

    // Check for overlapping ranges (excluding current item when editing)
    const otherCategories = ageCategories.filter((cat) => cat.id !== excludeId)

    for (const category of otherCategories) {
  // Jika benar-benar di luar → aman
  if (sampaiNum < category.dari || dariNum > category.sampai) {
    continue
  }

  // Jika range baru sepenuhnya di dalam kategori lama → overlap
  if (dariNum >= category.dari && sampaiNum <= category.sampai) {
    return `Rentang usia ${dariNum}-${sampaiNum} tahun berada di dalam kategori "${category.kategori}" (${category.dari}-${category.sampai} tahun)`
  }

  // Jika range lama sepenuhnya di dalam range baru → bisa pilih:
  // (1) anggap valid, atau
  // (2) anggap overlap
  // Misal kamu ingin tetap larang:
  if (dariNum < category.dari && sampaiNum > category.sampai) {
    return `Rentang usia ${dariNum}-${sampaiNum} tahun menelan kategori "${category.kategori}" (${category.dari}-${category.sampai} tahun)`
  }
}



    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationError = validateAgeRange(formData.kategori, formData.dari, formData.sampai, editingCategory?.id)

    if (validationError) {
      Swal.fire({
        icon: "error",
        title: "Validasi Gagal!",
        text: validationError,
      })
      return
    }

    const result = await Swal.fire({
      title: editingCategory ? "Konfirmasi Edit" : "Konfirmasi Tambah",
      text: `Apakah Anda yakin ingin ${editingCategory ? "mengubah" : "menambah"} kategori usia ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        const categoryData = {
          kategori: formData.kategori.trim(),
          dari: Number.parseFloat(formData.dari),
          sampai: Number.parseFloat(formData.sampai),
        }

        if (editingCategory) {
          const docRef = doc(db, "ageCategories", editingCategory.id) // ini string docId
          await updateDoc(docRef, categoryData)
          dispatch(updateAgeCategory({ ...categoryData, id: editingCategory.id }))
        } else {
          const docRef = await addDoc(collection(db, "ageCategories"), categoryData)
          dispatch(addAgeCategory({ ...categoryData, id: docRef.id }))
        }

        setShowModal(false)
        resetForm()

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: `Kategori usia berhasil ${editingCategory ? "diubah" : "ditambahkan"}`,
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        console.error("🔥 Error saving category:", error)
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: "Terjadi kesalahan saat menyimpan data",
        })
      }
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus kategori usia ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        console.log("[v0] Deleting category with ID:", categoryId)
        await deleteDoc(doc(db, "ageCategories", categoryId))
        dispatch(deleteAgeCategory(categoryId))

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kategori usia berhasil dihapus",
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        console.error("Error deleting category:", error)
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: "Terjadi kesalahan saat menghapus data",
        })
      }
    }
  }

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Batal",
      text: "Apakah Anda yakin ingin membatalkan? Data yang diinput akan hilang.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Batal",
      cancelButtonText: "Tidak",
    })

    if (result.isConfirmed) {
      setShowModal(false)
      resetForm()
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Kategori Usia</h1>
            <p className="text-sm md:text-base text-gray-600">Kelola kategori rentang usia warga</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddCategory}
            className="mt-4 md:mt-0 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </motion.button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            />
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCategories.length)} dari{" "}
            {filteredCategories.length} data
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th
                  className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  colSpan={2}
                >
                  Usia
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
              <tr className="bg-gray-50 border-t">
                <th></th>
                <th className="px-3 md:px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                  Dari
                </th>
                <th className="px-3 md:px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                  S.d
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCategories.map((category) => (
                <motion.tr
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                    {category.kategori}
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900 text-center border-l">
                    {category.dari} tahun
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900 text-center border-l">
                    {category.sampai} tahun
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? "bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {editingCategory ? "Edit Kategori Usia" : "Tambah Kategori Usia"}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Kategori */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <input
                      type="text"
                      name="kategori"
                      value={formData.kategori}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: Balita, Remaja, Dewasa"
                      required
                    />
                  </div>

                  {/* Rentang Usia */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dari (tahun)</label>
                      <input
                        type="number"
                        name="dari"
                        value={formData.dari}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="150"
                        step="0.1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sampai (tahun)</label>
                      <input
                        type="number"
                        name="sampai"
                        value={formData.sampai}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="150"
                        step="0.1"
                        required
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default KategoriUsiaPage
