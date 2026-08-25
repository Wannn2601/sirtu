"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, Upload } from "lucide-react"
import Swal from "sweetalert2"

import { db } from "../../services/firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore"

const PembuatanJenisAssetPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" })

  const [formData, setFormData] = useState({
    id_jenis_aset: "",
    kelompok: "",
    jenis_aset: "",
    satuan: "",
    status: "aktif",
  })

  const [data, setData] = useState([])
  const [kelompokOptions, setKelompokOptions] = useState([])
  const [satuanOptions, setSatuanOptions] = useState([])

  // Ambil data jenis aset
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jenisAssets"), (snap) => {
      const items = snap.docs.map((d, i) => ({
        firebaseId: d.id,
        id: i + 1,
        ...d.data(),
      }))
      setData(items)
    })
    return () => unsub()
  }, [])

  // Ambil data kelompok & satuan
  useEffect(() => {
    const unsubKelompok = onSnapshot(collection(db, "kelompokAssets"), (snapshot) => {
      setKelompokOptions(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            kode: data.kode?.toString() || "", // pastikan kode jadi string
            kelompok: data.kelompok || "",
          }
        })
      )
    })

    const unsubSatuan = onSnapshot(collection(db, "satuanAssets"), (snapshot) => {
      setSatuanOptions(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            nama: data.nama || data.kelompok || "", // fallback kalau field-nya beda
          }
        })
      )
    })

    return () => {
      unsubKelompok()
      unsubSatuan()
    }
  }, [])

  // Generate ID jenis aset
  const generateIdJenisAset = (kodeKelompok) => {
    const existingIds = data
      .filter((item) => item.id_jenis_aset?.startsWith(`${kodeKelompok}.`))
      .map((item) => parseInt(item.id_jenis_aset.split(".")[1], 10))
      .sort((a, b) => b - a)

    const nextNumber = existingIds.length > 0 ? existingIds[0] + 1 : 1
    return `${kodeKelompok}.${nextNumber.toString().padStart(3, "0")}`
  }

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.id_jenis_aset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelompok?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_aset?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.satuan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

 const sortedData = useMemo(() => {
  if (!sortConfig.key) {
    // ✅ default urut A-Z berdasarkan id_jenis_aset
    return [...filteredData].sort((a, b) =>
      a.id_jenis_aset.localeCompare(b.id_jenis_aset)
    )
  }
  return [...filteredData].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1
    }
    return 0
  })
}, [filteredData, sortConfig])


  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedData.length / itemsPerPage)

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleAdd = () => {
    setEditMode(false)
    setCurrentItem(null)
    setFormData({
      id_jenis_aset: "",
      kelompok: "",
      jenis_aset: "",
      satuan: "",
      status: "aktif",
    })
    setShowModal(true)
  }

  const handleEdit = (item) => {
  setEditMode(true)
  setCurrentItem(item)

  // cari data kelompok berdasarkan nama
  const kelompok = kelompokOptions.find((k) => k.kelompok === item.kelompok)

  setFormData({
    id_jenis_aset: item.id_jenis_aset,
    kelompokId: kelompok ? kelompok.id : "",   // simpan id kelompok
    kelompok: item.kelompok,
    kodeKelompok: kelompok ? kelompok.kode : "", // ikutkan juga kode jika ada
    jenis_aset: item.jenis_aset,
    satuan: item.satuan,
    status: item.status,
  })

  setShowModal(true)
}


  const handleDelete = (item) => {
    Swal.fire({
      title: "Hapus Data?",
      text: `Apakah Anda yakin ingin menghapus "${item.jenis_aset}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const docRef = doc(db, "jenisAssets", item.firebaseId)
          await deleteDoc(docRef)
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

  const handleKelompokChange = (id) => {
    const kelompok = kelompokOptions.find((k) => k.id === id)
    if (kelompok && !editMode) {
      const newId = generateIdJenisAset(kelompok.kode)
      setFormData({
        ...formData,
        kelompokId: id,
        kelompok: kelompok.kelompok,
        kodeKelompok: kelompok.kode,
        id_jenis_aset: newId,
      })
    } else {
      setFormData({
        ...formData,
        kelompokId: id,
        kelompok: kelompok ? kelompok.kelompok : "",
        kodeKelompok: kelompok ? kelompok.kode : "",
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.kelompok || !formData.jenis_aset || !formData.satuan) {
      Swal.fire("Error!", "Semua field harus diisi!", "error")
      return
    }

    try {
      if (editMode && currentItem) {
        const docRef = doc(db, "jenisAssets", currentItem.firebaseId)
        await updateDoc(docRef, formData)
Swal.fire({
  icon: "success",
  title: "Berhasil!",
  text: "Data berhasil diubah!",
  timer: 3000,
  showConfirmButton: false
})
      } else {
        await addDoc(collection(db, "jenisAssets"), formData)
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

  const handleSeedData = async () => {
    const dummyData = [
      { id_jenis_aset: "1.001", kelompok: "Elektronik", jenis_aset: "Laptop", satuan: "Unit", status: "aktif" },
      { id_jenis_aset: "1.002", kelompok: "Elektronik", jenis_aset: "Printer", satuan: "Unit", status: "aktif" },
      { id_jenis_aset: "2.001", kelompok: "Furniture", jenis_aset: "Meja Kerja", satuan: "Unit", status: "tidak aktif" },
    ]
    try {
      for (const item of dummyData) {
        await addDoc(collection(db, "jenisAssets"), item)
      }
      Swal.fire("Berhasil!", "3 data dummy berhasil dikirim ke Firebase!", "success")
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
                <h1 className="text-2xl font-bold text-gray-900">Pembuatan Jenis Asset</h1>
                <p className="text-gray-600 mt-1">Kelola data jenis asset</p>
              </div>
              <div className="flex space-x-2">
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
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ID</th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ID Jenis Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Jenis Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Kelompok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Satuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((item) => (
                  <tr key={item.firebaseId} className="hover:bg-gray-50">
                    {/* <td className="px-6 py-4">{item.id}</td> */}
                    <td className="px-6 py-4">{item.id_jenis_aset}</td>
                    <td className="px-6 py-4">{item.jenis_aset}</td>
                    <td className="px-6 py-4">{item.kelompok}</td>
                    <td className="px-6 py-4">{item.satuan}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === "aktif"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <h3 className="text-lg font-semibold">{editMode ? "Edit Data" : "Tambah Data"}</h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ID Jenis Asset</label>
                      <input
                        type="text"
                        value={formData.id_jenis_aset}
                        readOnly
                        className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Kelompok *</label>
                      <select
                        value={formData.kelompokId || ""}
                        onChange={(e) => handleKelompokChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Pilih Kelompok</option>
                        {kelompokOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.kelompok}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Jenis Asset *</label>
                      <input
                        type="text"
                        value={formData.jenis_aset}
                        onChange={(e) => setFormData({ ...formData, jenis_aset: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Satuan *</label>
                      <select
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      >
                        <option value="">Pilih Satuan</option>
                        {satuanOptions.map((opt) => (
                          <option key={opt.id} value={opt.nama}>
                            {opt.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Status *</label>
                      <div className="flex space-x-4">
                        <label>
                          <input
                            type="radio"
                            name="status"
                            value="aktif"
                            checked={formData.status === "aktif"}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          />{" "}
                          Aktif
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="status"
                            value="tidak aktif"
                            checked={formData.status === "tidak aktif"}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          />{" "}
                          Tidak Aktif
                        </label>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border rounded text-gray-700"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded"
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
      </div>
    </div>
  )
}

export default PembuatanJenisAssetPage
