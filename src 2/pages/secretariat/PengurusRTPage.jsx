"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Trash2, Search, X, Upload } from "lucide-react"
import Swal from "sweetalert2"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore"
import { db } from "../../services/firebase"

const PengurusRTPage = () => {
  const [pengurusRTData, setPengurusRTData] = useState([])
  const [wargaData, setWargaData] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const [formData, setFormData] = useState({
  level: "",
  kepungurusan: "rt",
  jabatan: "",
  warga_menjabat: "",
  alamat: "",
  no_telepon: "",
  file_tt: null,
  koordinator: "tidak", // ➕ Tambahan
})


  // 🔹 Ambil data realtime dari Firestore
  useEffect(() => {
    const unsubPengurus = onSnapshot(collection(db, "pengurusRT"), (snapshot) => {
      setPengurusRTData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    const unsubWarga = onSnapshot(collection(db, "wargaData"), (snapshot) => {
      setWargaData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    return () => {
      unsubPengurus()
      unsubWarga()
    }
  }, [])

  // Level options with validation rules
  const levelOptions = [
    { value: "pak rt", label: "Pak RT", maxCount: 1 },
    { value: "ketua pkk", label: "Ketua PKK", maxCount: 1 },
    { value: "sekretaris", label: "Sekretaris", maxCount: 2 },
    { value: "bendahara", label: "Bendahara", maxCount: 2 },
    { value: "pengurus", label: "Pengurus", maxCount: 2 },
  ]

  const getLevelCount = (level) => {
    return (pengurusRTData || []).filter((item) => item.level === level).length
  }

  const canAddLevel = (level) => {
    const option = levelOptions.find((opt) => opt.value === level)
    if (!option) return false
    return getLevelCount(level) < option.maxCount
  }

  // Filter and sort data
  const filteredData = (pengurusRTData || [])
    .filter(
      (item) =>
        (item.nama_warga && item.nama_warga.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.jabatan && item.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.level && item.level.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => (a.id || "").localeCompare(b.id || ""))

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  // Handle form changes
const handleInputChange = (e) => {
  const { name, value } = e.target
  let newFormData = { ...formData, [name]: value }

  // Auto isi alamat & telepon
  if (name === "warga_menjabat") {
    const selectedWarga = wargaData.find((w) => w.nama === value)
    if (selectedWarga) {
      const alamat =
        selectedWarga.alamat_tinggal ||
        selectedWarga.alamat ||
        selectedWarga.alamat_lengkap ||
        selectedWarga.alamat_rumah ||
        `${selectedWarga.jalan || ""} ${selectedWarga.no_rumah || ""}`.trim() ||
        `${selectedWarga.rt || ""} ${selectedWarga.rw || ""}`.trim() ||
        "Alamat tidak tersedia"

      const telepon =
        selectedWarga.no_telepon ||
        selectedWarga.telepon ||
        selectedWarga.no_hp ||
        selectedWarga.hp ||
        ""

      newFormData.alamat = alamat
      newFormData.no_telepon = telepon
    }
  }

  // Auto set koordinator jika pilih Ketua RT atau Ketua PKK
  if (name === "level") {
    if (value === "pak rt" || value === "ketua pkk") {
      newFormData.koordinator = "ya"
    } else {
      newFormData.koordinator = "tidak"
    }
  }

  setFormData(newFormData)
}



  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        Swal.fire({ icon: "error", title: "Error", text: "File harus berupa gambar (PNG, JPG, JPEG)" })
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({ icon: "error", title: "Error", text: "Ukuran file maksimal 2MB" })
        return
      }
      setSelectedFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target.result
        setFormData((prev) => ({ ...prev, file_tt: base64String }))
        setPreviewUrl(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.koordinator === "ya") {
  const existingKoordinator = pengurusRTData.find(
    (p) => p.level === formData.level && p.koordinator === "ya" && (!editingItem || p.id !== editingItem.id)
  )
  if (existingKoordinator) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: `Level ${formData.level} sudah memiliki koordinator`,
    })
    return
  }
}


    if (!editingItem && !canAddLevel(formData.level)) {
      const option = levelOptions.find((opt) => opt.value === formData.level)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Level ${option.label} sudah mencapai batas maksimal (${option.maxCount} orang)`,
      })
      return
    }

    if (!editingItem) {
      const existingPengurus = (pengurusRTData || []).find((p) => p.warga_menjabat === formData.warga_menjabat)
      if (existingPengurus) {
        Swal.fire({ icon: "error", title: "Error", text: "Warga ini sudah memiliki jabatan" })
        return
      }
    }

    const payload = {
  level: formData.level,
  kepungurusan: formData.kepungurusan,
  jabatan: formData.jabatan,
  nama_warga: formData.warga_menjabat,
  alamat: formData.alamat,
  no_telepon: formData.no_telepon,
  file_tt: formData.file_tt || null,
  status: "Aktif",
  koordinator: formData.koordinator, // ➕ Tambahan
}

    if (editingItem) {
      await updateDoc(doc(db, "pengurusRT", editingItem.id), payload)
      Swal.fire({ icon: "success", title: "Berhasil", text: "Data pengurus berhasil diperbarui" })
    } else {
      await addDoc(collection(db, "pengurusRT"), payload)
      Swal.fire({ icon: "success", title: "Berhasil", text: "Data pengurus berhasil ditambahkan" })
    }

    setShowModal(false)
    setEditingItem(null)
    setFormData({
      level: "",
      kepungurusan: "rt",
      jabatan: "",
      warga_menjabat: "",
      alamat: "",
      no_telepon: "",
      file_tt: null,
    })
    setSelectedFile(null)
    setPreviewUrl("")
  }

  // Handle delete
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus data pengurus ini?",
      icon: "warning",
      showCancelButton: true,
    })

    if (result.isConfirmed) {
      await deleteDoc(doc(db, "pengurusRT", id))
      Swal.fire({ icon: "success", title: "Terhapus", text: "Data pengurus berhasil dihapus" })
    }
  }

  // Handle edit
  const handleEdit = (item) => {
  setEditingItem(item)
  setFormData({
    level: item.level,
    kepungurusan: item.kepungurusan,
    jabatan: item.jabatan,
    warga_menjabat: item.nama_warga || item.warga_menjabat,
    alamat: item.alamat,
    no_telepon: item.no_telepon,
    file_tt: item.file_tt,
    koordinator: item.koordinator || "tidak", // ➕ tambahkan ini
  })
  if (item.file_tt) {
    setPreviewUrl(item.file_tt)
    setSelectedFile(null)
  }
  setShowModal(true)
}


  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({
      level: "",
      kepungurusan: "rt",
      jabatan: "",
      warga_menjabat: "",
      alamat: "",
      no_telepon: "",
      file_tt: null,
    })
    setSelectedFile(null)
    setPreviewUrl("")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengurus RT</h1>
          <p className="text-gray-600">Kelola data pengurus RT dan PKK</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengurus
        </motion.button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari pengurus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jabatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No Telepon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Koordinator
</th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foto TT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.jabatan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.nama_warga || item.nama}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.no_telepon}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
  {item.koordinator === "ya" ? "✔️ Ya" : "❌ Tidak"}
</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.file_tt && item.file_tt.startsWith("data:") ? (
                      <img
                        src={item.file_tt}
                        alt="Foto TT"
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          Swal.fire({
                            imageUrl: item.file_tt,
                            imageAlt: "Foto Tanda Tangan",
                            showConfirmButton: false,
                            showCloseButton: true,
                          })
                        }}
                      />
                    ) : item.file_tt ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">Foto</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Photo</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Menampilkan <span className="font-medium">{startIndex + 1}</span> sampai{" "}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredData.length)}
                </span>{" "}
                dari <span className="font-medium">{filteredData.length}</span> data
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

            {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? "Edit Pengurus" : "Tambah Pengurus"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Jabatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    name="jabatan"
                    value={formData.jabatan}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    required
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Level
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    required
                  >
                    <option value="">Pilih Level</option>
                    {levelOptions.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={!editingItem && !canAddLevel(opt.value)}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warga Menjabat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Warga Menjabat
                  </label>
                  <select
                    name="warga_menjabat"
                    value={formData.warga_menjabat}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    required
                  >
                    <option value="">Pilih Warga</option>
                    {wargaData.map((w) => (
                      <option key={w.id} value={w.nama}>                        
                        {w.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Alamat
                  </label>
                  <input
                    type="text"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    readOnly
                  />
                </div>

                {/* No Telepon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    No Telepon
                  </label>
                  <input
                    type="text"
                    name="no_telepon"
                    value={formData.no_telepon}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    readOnly
                  />
                </div>

                {/* Upload Foto TT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Foto TT
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Pilih File
                    </label>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </div>
                </div>

                {/* Koordinator */}
<div>
  <label className="block text-sm font-medium text-gray-700">
    Koordinator
  </label>
  <div className="mt-1 flex gap-4">
    <label className="flex items-center">
      <input
        type="radio"
        name="koordinator"
        value="ya"
        checked={formData.koordinator === "ya"}
        onChange={handleInputChange}
        className="mr-2"
        disabled={!(formData.level === "pak rt" || formData.level === "ketua pkk")} 
      />
      Ya
    </label>
    <label className="flex items-center">
      <input
        type="radio"
        name="koordinator"
        value="tidak"
        checked={formData.koordinator === "tidak"}
        onChange={handleInputChange}
        className="mr-2"
      />
      Tidak
    </label>
  </div>
  <p className="text-xs text-gray-500">
    Hanya Ketua RT & Ketua PKK yang bisa jadi koordinator
  </p>
</div>


                {/* Tombol Submit */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingItem ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PengurusRTPage
