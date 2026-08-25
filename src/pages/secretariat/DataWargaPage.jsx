"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  FileText,
  Download,
  X,
  Save,
  Users,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { firestoreService } from "../../services/firebase"
import Swal from "sweetalert2"
import * as XLSX from "xlsx"

const DataWargaPage = () => {
  const [wargaData, setWargaData] = useState([])
  const [kkData, setKkData] = useState([])
  const [pekerjaanData, setPekerjaanData] = useState([])
  const [currentUser] = useState({ level: "superadmin" }) // Mock user for now
  const [loading, setLoading] = useState(false)

  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [statusPenduduk, setStatusPenduduk] = useState("Keseluruhan")
  const [statusWarga, setStatusWarga] = useState("Aktif")
  const [agamaFilter, setAgamaFilter] = useState("Keseluruhan")
  const [statusDomisili, setStatusDomisili] = useState("Keseluruhan")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortField, setSortField] = useState("id_warga")
  const [sortDirection, setSortDirection] = useState("asc")
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingWarga, setEditingWarga] = useState(null)
  const [selectedWarga, setSelectedWarga] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
  // ================= DATA KK =================
  id_kk: "",
  nama_kepala_keluarga: "",
  alamat_tinggal: "",
  rt: "",
  rw: "",
  kelurahan: "",
  kabupaten_kota: "",
  provinsi: "",
  negara: "",
  no_kk: "",
  tanggal_terbit_kk: "",

  // ================= DATA WARGA =================
  id_warga: "",
  nama: "",
  nik: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "Islam",
  pekerjaan: "",
  no_telepon: "+62",

  // ================= STATUS KEPENDUDUKAN =================
  kewarganegaraan: "WNI",
  status_perkawinan: "Belum Kawin",
  status_kependudukan: "",
  status_hubungan_keluarga: "",
  hubungan_lainnya: "",
  hubungan_kk: "",
  tanggal_register: new Date().toISOString().split("T")[0],

  // ================= STATUS DOMISILI =================
  status_domisili: "Tinggal",
  alamat_lain: "",

  // ================= LAINNYA =================
  status_warga: "Aktif",
  tanggal_selesai_tinggal: null,
})



  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadWargaData(), loadKKData(), loadPekerjaanData()])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadWargaData = async () => {
  try {
    const data = await firestoreService.getAll("wargaData")
    // simpan doc.id agar bisa update/delete dengan benar
    const withIds = Array.isArray(data)
      ? data.map((item) => ({ ...item, id: item.id }))
      : []
    setWargaData(withIds)
  } catch (error) {
    console.error("Error loading warga data:", error)
    setWargaData([])
  }
}



  const loadKKData = async () => {
    try {
      const data = await firestoreService.getAll("kkData")
      setKkData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading KK data:", error)
      setKkData([])
    }
  }

  const loadPekerjaanData = async () => {
    try {
      const data = await firestoreService.getAll("pekerjaan")
      // Filter hanya yang status = "Aktif"
      const aktif = Array.isArray(data) ? data.filter((p) => p.status === "Aktif") : []
      setPekerjaanData(aktif)
    } catch (error) {
      console.error("Error loading pekerjaan data:", error)
      setPekerjaanData([])
    }
  }

 const addWarga = async (data) => {
  await firestoreService.add("wargaData", data)
  await loadWargaData()
}



 const updateWarga = async (id, data) => {
  await firestoreService.update("wargaData", id, data) // id = Firestore doc.id
  await loadWargaData()
}



  const deleteWarga = async (id) => {
    console.log("[v0] Deleting warga with ID:", id)
    await firestoreService.delete("wargaData", id) // Changed from "wargaData" to "warga"
    await loadWargaData()
  }

  // Filter and sort data
  const filteredData = useMemo(() => {
    const filtered = wargaData.filter((warga) => {
      const matchesSearch = Object.values(warga).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      )

      const matchesStatusPenduduk = statusPenduduk === "Keseluruhan" || warga.status_kependudukan === statusPenduduk

      const matchesStatusWarga =
        statusWarga === "Keseluruhan" ||
        (statusWarga === "Aktif" ? warga.status_warga === "Aktif" : warga.status_warga !== "Aktif")

      const matchesAgama = agamaFilter === "Keseluruhan" || warga.agama === agamaFilter

      const matchesStatusDomisili = statusDomisili === "Keseluruhan" || warga.status_domisili === statusDomisili

      return matchesSearch && matchesStatusPenduduk && matchesStatusWarga && matchesAgama && matchesStatusDomisili
    })

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [wargaData, searchTerm, statusPenduduk, statusWarga, agamaFilter, statusDomisili, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  // Statistics
  const totalWarga = wargaData.length
  const pendudukTetap = wargaData.filter((w) => w.status_kependudukan === "Penduduk Tetap").length
  const pendudukTidakTetap = wargaData.filter((w) => w.status_kependudukan === "Penduduk Tidak Tetap").length

  // Handle form changes
  const handleInputChange = (e) => {
  const { name, value } = e.target
  setFormData((prev) => {
    const newData = { ...prev, [name]: value }

    // Jika pilih KK → isi data otomatis
    if (name === "id_kk") {
      const selectedKK = kkData.find((kk) => kk.id_kk === value)
      if (selectedKK) {
        newData.nama_kepala_keluarga = selectedKK.nama_kepala_keluarga
        newData.no_kk = selectedKK.nomor_kk
        newData.alamat_tinggal = `${selectedKK.alamat}, No ${selectedKK.no_rumah}`

        // isi field tambahan
        newData.rt = selectedKK.rt || ""
        newData.rw = selectedKK.rw || ""
        newData.kelurahan = selectedKK.kelurahan || ""
        newData.kabupaten_kota = selectedKK.kabupaten_kota || ""
        newData.provinsi = selectedKK.provinsi || ""
        newData.negara = selectedKK.negara || ""
        newData.tanggal_terbit_kk = selectedKK.tanggal_terbit || ""

        // status kependudukan
        newData.status_kependudukan =
          selectedKK.status_kk === "Tetap" ? "Penduduk Tetap" : "Penduduk Tidak Tetap"

        // tanggal register default ikut KK
        newData.tanggal_register = selectedKK.tanggal_daftar_kk
      }
    }

    // hubungan dalam keluarga
    if (name === "status_kependudukan" && value === "Penduduk Tetap") {
      newData.status_hubungan_keluarga = ""
    }

    if (name === "status_hubungan_keluarga" && value !== "Lainnya") {
      newData.hubungan_lainnya = ""
    }

    if (name === "status_domisili" && value === "Tinggal") {
      newData.alamat_lain = ""
    }

    // auto generate id warga
    if (name === "id_kk" && !editingWarga) {
      const existingIds = wargaData
        .filter((w) => w.id_kk === value)
        .map((w) => Number.parseInt(w.id_warga.split(".")[1]))
        .sort((a, b) => b - a)

      const nextNumber = existingIds.length > 0 ? existingIds[0] + 1 : 1
      newData.id_warga = `${value}.${nextNumber.toString().padStart(2, "0")}`
    }

    return newData
  })
}



  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSubmit = async (e) => {
  e.preventDefault()
  e.stopPropagation()

  const result = await Swal.fire({
    title: "Konfirmasi Simpan",
    text: `Apakah Anda yakin ingin ${editingWarga ? "mengubah" : "menambahkan"} data warga ini?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Simpan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#ef4444",
    customClass: {
      popup: "max-h-screen overflow-y-auto",
    },
  })

  if (!result.isConfirmed) return

  // 🔹 Validasi NIK
  if (formData.nik.length !== 16) {
    Swal.fire({
      title: "Error",
      text: "NIK harus 16 digit",
      icon: "error",
      customClass: { popup: "max-h-screen overflow-y-auto" },
    })
    return
  }

  // 🔹 Validasi No. Telepon
  if (!formData.no_telepon.startsWith("+62")) {
    Swal.fire({
      title: "Error",
      text: "Nomor telepon harus dimulai dengan +62",
      icon: "error",
      customClass: { popup: "max-h-screen overflow-y-auto" },
    })
    return
  }

  // 🔹 Cek duplikat ID Warga hanya saat tambah baru
  if (!editingWarga) {
    const existingWarga = wargaData.find((w) => w.id_warga === formData.id_warga)
    if (existingWarga) {
      Swal.fire({
        title: "Error",
        text: "ID Warga sudah digunakan, silahkan buat ID lain atau batal.",
        icon: "error",
        customClass: { popup: "max-h-screen overflow-y-auto" },
      })
      return
    }
  }

  try {
    if (editingWarga) {
      // ✅ PAKAI doc.id dari Firestore, bukan id_warga
      await updateWarga(editingWarga.id, formData)
      Swal.fire({
        title: "Berhasil",
        text: "Data warga berhasil diperbarui",
        icon: "success",
        customClass: { popup: "max-h-screen overflow-y-auto" },
      })
    } else {
      await addWarga(formData)
      Swal.fire({
        title: "Berhasil",
        text: "Data warga berhasil ditambahkan",
        icon: "success",
        customClass: { popup: "max-h-screen overflow-y-auto" },
      })
    }

    setShowModal(false)
    resetForm()
  } catch (error) {
    Swal.fire({
      title: "Error",
      text: "Terjadi kesalahan saat menyimpan data",
      icon: "error",
      customClass: { popup: "max-h-screen overflow-y-auto" },
    })
  }
}


  // Reset form
  const resetForm = () => {
    setFormData({
      id_warga: "",
      nama: "",
      nik: "",
      id_kk: "",
      nama_kepala_keluarga: "",
      no_kk: "",
      status_kependudukan: "",
      alamat_tinggal: "",
      hubungan_kk: "",
      status_dalam_keluarga: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      agama: "Islam",
      pekerjaan: "",
      tanggal_register: new Date().toISOString().split("T")[0],
      status_domisili: "Tinggal",
      no_telepon: "+62",
      alamat_lain: "",
      tanggal_selesai_tinggal: null,
      status_warga: "Aktif",
      rt:"",
    rw: "",
    kelurahan:"",
    kecamatan: "",
    kabupaten_kota: "",
    provinsi: "",
    negara: "",
    })
    setEditingWarga(null)
  }

  // Handle edit
  const handleEdit = (warga) => {
    setEditingWarga(warga)
    setFormData(warga)
    setShowModal(true)
  }

  const handleDelete = async (warga) => {
    if (currentUser?.level !== "superadmin") {
      Swal.fire({
        title: "Error",
        text: "Hanya superadmin yang dapat menghapus data",
        icon: "error",
        customClass: { popup: "max-h-screen overflow-y-auto" },
      })
      return
    }

    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus data ${warga.nama}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    })

    if (result.isConfirmed) {
      try {
        await deleteWarga(warga.id) // Changed from warga.id_warga to warga.id
        Swal.fire({
          title: "Berhasil",
          text: "Data warga berhasil dihapus",
          icon: "success",
          customClass: { popup: "max-h-screen overflow-y-auto" },
        })
      } catch (error) {
        console.error("[v0] Error deleting warga:", error)
        Swal.fire({
          title: "Error",
          text: "Terjadi kesalahan saat menghapus data",
          icon: "error",
          customClass: { popup: "max-h-screen overflow-y-auto" },
        })
      }
    }
  }

  const handleCancel = async () => {
    const hasUnsavedData = Object.values(formData).some(
      (value) => value !== "" && value !== null && value !== undefined,
    )

    if (hasUnsavedData) {
      const result = await Swal.fire({
        title: "Konfirmasi Batal",
        text: "Data yang belum disimpan akan hilang. Apakah Anda yakin ingin membatalkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Batal",
        cancelButtonText: "Tidak",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })

      if (!result.isConfirmed) return
    }

    setShowModal(false)
    resetForm()
  }

  // Handle detail view
  const handleDetail = (warga) => {
    setSelectedWarga(warga)
    setShowDetailModal(true)
  }

  // Export functions
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank")
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Data Warga</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .sub-header { text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Data Warga</h2>
            <p class="sub-header">Kelola data warga RT</p>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">No</th>
                <th rowspan="2">ID Warga</th>
                <th rowspan="2">Nama</th>
                <th rowspan="2">Alamat</th>
                <th rowspan="2">NIK</th>
                <th rowspan="2">Tempat</th>
                <th rowspan="2">Tanggal Lahir</th>
                <th rowspan="2">No Telepon</th>
                <th colspan="2">Tanggal</th>
                <th rowspan="2">Status Keluarga</th>
                <th rowspan="2">Status Domisili</th>
              </tr>
              <tr>
                <th>Terdaftar</th>
                <th>Selesai Tinggal</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData
                .map(
                  (warga, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${warga.id_warga}</td>
                  <td>${warga.nama}</td>
                  <td>${warga.alamat_tinggal}</td>
                  <td>${warga.nik}</td>
                  <td>${warga.tempat_lahir}</td>
                  <td>${warga.tanggal_lahir}</td>
                  <td>${warga.no_telepon}</td>
                  <td>${warga.tanggal_register}</td>
                  <td>${warga.tanggal_selesai_tinggal || "-"}</td>
                  <td>${warga.status_dalam_keluarga}</td>
                  <td>${warga.status_domisili}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const exportToExcel = () => {
    const exportData = filteredData.map((warga, index) => ({
      No: index + 1,
      "ID Warga": warga.id_warga,
      Nama: warga.nama,
      Alamat: warga.alamat_tinggal,
      NIK: warga.nik,
      "Tempat Lahir": warga.tempat_lahir,
      "Tanggal Lahir": warga.tanggal_lahir,
      "No Telepon": warga.no_telepon,
      "Tanggal Terdaftar": warga.tanggal_register,
      "Tanggal Selesai Tinggal": warga.tanggal_selesai_tinggal || "-",
      "Status Keluarga": warga.status_dalam_keluarga,
      "Status Domisili": warga.status_domisili,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data Warga")
    XLSX.writeFile(wb, "data_warga.xlsx")
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Warga</h1>
          <p className="text-gray-600">Kelola data warga RT</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText size={16} />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Tambah Warga
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Penduduk</label>
            <select
              value={statusPenduduk}
              onChange={(e) => setStatusPenduduk(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Keseluruhan">Keseluruhan</option>
              <option value="Penduduk Tetap">Penduduk Tetap</option>
              <option value="Penduduk Tidak Tetap">Penduduk Tidak Tetap</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Warga</label>
            <select
              value={statusWarga}
              onChange={(e) => setStatusWarga(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Keseluruhan">Keseluruhan</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
            <select
              value={agamaFilter}
              onChange={(e) => setAgamaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Keseluruhan">Keseluruhan</option>
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen</option>
              <option value="Katholik">Katholik</option>
              <option value="Hindu">Hindu</option>
              <option value="Budha">Budha</option>
              <option value="Kepercayaan">Kepercayaan</option>
              <option value="Lain-Lain">Lain-Lain</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusDomisili}
              onChange={(e) => setStatusDomisili(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Keseluruhan">Keseluruhan</option>
              <option value="Tinggal">Tinggal</option>
              <option value="Meninggal">Meninggal</option>
              <option value="Tinggal diluar kota/wilayah lain">Tinggal di luar kota/wilayah lain</option>
              <option value="Tinggal diluar negeri">Tinggal di luar negeri</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari data warga..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  <button
                    onClick={() => handleSort("id_warga")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    ID Warga
                    {sortField === "id_warga" &&
                      (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  <button onClick={() => handleSort("nama")} className="flex items-center gap-1 hover:text-gray-700">
                    Nama
                    {sortField === "nama" &&
                      (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Alamat
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  NIK
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Tempat
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Tanggal Lahir
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  No Telepon
                </th>
                <th
                  colSpan={2}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Tanggal
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Status Keluarga
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                >
                  Status Domisili
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  AKSI
                </th>
              </tr>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Terdaftar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Selesai Tinggal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((warga, index) => (
                <tr key={warga.id_warga} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.id_warga}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.nama}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.alamat_tinggal}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.nik}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.tempat_lahir}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.tanggal_lahir}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.no_telepon}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.tanggal_register}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.tanggal_selesai_tinggal || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.status_dalam_keluarga}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.status_domisili}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(warga)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDetail(warga)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Detail"
                      >
                        <Eye size={16} />
                      </button>
                      {currentUser?.level === "superadmin" && (
                        <button
                          onClick={() => handleDelete(warga)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
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
                <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> dari{" "}
                <span className="font-medium">{filteredData.length}</span> data
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
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
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Warga</p>
              <p className="text-2xl font-bold text-gray-900">{totalWarga}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Penduduk Tetap</p>
              <p className="text-2xl font-bold text-gray-900">{pendudukTetap}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserX className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Penduduk Tidak Tetap</p>
              <p className="text-2xl font-bold text-gray-900">{pendudukTidakTetap}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingWarga ? "Edit Data Warga" : "Tambah Data Warga"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>



                <form onSubmit={handleSubmit} className="space-y-6">
  {/* ================= DATA KK ================= */}
  <h2 className="font-bold">DATA KK</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium">Kepala Keluarga *</label>
    <select
      name="id_kk"
      value={formData.id_kk}
      onChange={handleInputChange}
      required
      className="w-full border px-3 py-2 rounded-lg"
    >
      <option value="">Pilih KK</option>
      {kkData.map((kk) => (
        <option key={kk.id_kk} value={kk.id_kk}>
          {kk.nama_kepala_keluarga} - {kk.alamat} (No {kk.no_rumah})
        </option>
      ))}
    </select>
  </div>
  <div>
    <label className="block text-sm">Alamat Tinggal</label>
    <input type="text" value={formData.alamat_tinggal} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">RT</label>
    <input type="text" name="rt" value={formData.rt} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">RW</label>
    <input type="text" name="rw" value={formData.rw} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">Kelurahan</label>
    <input type="text" name="kelurahan" value={formData.kelurahan} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">Kabupaten/Kota</label>
    <input type="text" name="kabupaten_kota" value={formData.kabupaten_kota} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">Provinsi</label>
    <input type="text" name="provinsi" value={formData.provinsi} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">Negara</label>
    <input type="text" name="negara" value={formData.negara} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">No KK</label>
    <input type="text" name="no_kk" value={formData.no_kk} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
  <div>
    <label className="block text-sm">Tanggal Terbit KK</label>
    <input type="date" name="tanggal_terbit_kk" value={formData.tanggal_terbit_kk} readOnly className="w-full border px-3 py-2 bg-gray-100" />
  </div>
</div>

  {/* ================= DATA WARGA ================= */}
  <h2 className="font-bold">DATA WARGA</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm">ID Warga *</label>
      <input type="text" name="id_warga" value={formData.id_warga} onChange={handleInputChange} disabled={editingWarga} required className="w-full border px-3 py-2" />
    </div>
    <div>
      <label className="block text-sm">Nama *</label>
      <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} required className="w-full border px-3 py-2" />
    </div>
    <div>
      <label className="block text-sm">NIK (16 digit) *</label>
      <input type="text" name="nik" value={formData.nik} onChange={handleInputChange} maxLength={16} pattern="[0-9]{16}" required className="w-full border px-3 py-2" />
    </div>
    <div>
      <label className="block text-sm">Tempat Lahir *</label>
      <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange} required className="w-full border px-3 py-2" />
    </div>
    <div>
      <label className="block text-sm">Tanggal Lahir *</label>
      <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange} required className="w-full border px-3 py-2" />
    </div>
    <div>
      <label className="block text-sm">Agama *</label>
      <select name="agama" value={formData.agama} onChange={handleInputChange} required className="w-full border px-3 py-2">
        <option value="Islam">Islam</option>
        <option value="Kristen">Kristen</option>
        <option value="Katholik">Katholik</option>
        <option value="Hindu">Hindu</option>
        <option value="Budha">Budha</option>
        <option value="Kepercayaan">Kepercayaan</option>
        <option value="Lain-Lain">Lain-Lain</option>
      </select>
    </div>
    <div>
      <label className="block text-sm">Pekerjaan *</label>
      <select name="pekerjaan" value={formData.pekerjaan} onChange={handleInputChange} required className="w-full border px-3 py-2">
        <option value="">Pilih</option>
        {pekerjaanData.map((job) => (
          <option key={job.id} value={job.nama_pekerjaan}>{job.nama_pekerjaan}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm">No Telepon *</label>
      <input type="text" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="+62xxxxx" required className="w-full border px-3 py-2" />
    </div>
  </div>

  {/* ================= STATUS KEPENDUDUKAN ================= */}
  <h2 className="font-bold">STATUS KEPENDUDUKAN</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm">Kewarganegaraan *</label>
      <select name="kewarganegaraan" value={formData.kewarganegaraan} onChange={handleInputChange} className="w-full border px-3 py-2">
        <option value="WNI">WNI</option>
        <option value="WNA">WNA</option>
      </select>
    </div>
    <div>
      <label className="block text-sm">Status Perkawinan *</label>
      <select name="status_perkawinan" value={formData.status_perkawinan} onChange={handleInputChange} className="w-full border px-3 py-2">
        <option value="Belum Kawin">Belum Kawin</option>
        <option value="Kawin">Kawin</option>
        <option value="Janda">Janda</option>
        <option value="Duda">Duda</option>
      </select>
    </div>
    <div>
      <label className="block text-sm">Status Kependudukan</label>
      <input type="text" name="status_kependudukan" value={formData.status_kependudukan} readOnly className="w-full border px-3 py-2 bg-gray-100" />
    </div>
    {formData.status_kependudukan === "Penduduk Tetap" && (
      <>
        <div>
          <label className="block text-sm">Status Hubungan dalam Keluarga *</label>
          <select name="status_hubungan_keluarga" value={formData.status_hubungan_keluarga} onChange={handleInputChange} className="w-full border px-3 py-2">
            <option value="">Pilih</option>
            <option value="Suami">Suami</option>
            <option value="Istri">Istri</option>
            <option value="Anak">Anak</option>
            <option value="Orang Tua">Orang Tua</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        {formData.status_hubungan_keluarga === "Lainnya" && (
          <div>
            <label className="block text-sm">Hubungan dengan Kepala Keluarga</label>
            <select name="hubungan_lainnya" value={formData.hubungan_lainnya} onChange={handleInputChange} className="w-full border px-3 py-2">
              <option value="">Pilih</option>
              <option value="Saudara">Saudara</option>
              <option value="Teman">Teman</option>
              <option value="Pegawai ART">Pegawai ART</option>
            </select>
          </div>
        )}
      </>
    )}
    <div>
      <label className="block text-sm">Tanggal Registrasi *</label>
      <input type="date" name="tanggal_register" value={formData.tanggal_register} onChange={handleInputChange} required className="w-full border px-3 py-2" />
    </div>
  </div>

  {/* ================= STATUS DOMISILI ================= */}
  <h2 className="font-bold">STATUS DOMISILI</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm">Status Domisili *</label>
      <select name="status_domisili" value={formData.status_domisili} onChange={handleInputChange} className="w-full border px-3 py-2">
        <option value="Tinggal">Sesuai Alamat</option>
        <option value="Meninggal">Meninggal</option>
        <option value="Tinggal diluar kota/wilayah lain">Merantau</option>
        <option value="Tinggal diluar kota/wilayah lain">pindah</option>
      </select>
    </div>
    {formData.status_domisili !== "Tinggal" && (
      <div className="md:col-span-2">
        <label className="block text-sm">Alamat Selama Tinggal di Lokasi Lain / Keterangan Lain</label>
        <textarea name="alamat_lain" value={formData.alamat_lain} onChange={handleInputChange} rows={3} className="w-full border px-3 py-2" />
      </div>
    )}
  </div>

  <div className="flex justify-end gap-3 pt-6">
    <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg">Batal</button>
    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Simpan</button>
  </div>
</form>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {/* Detail Modal */}
<AnimatePresence>
  {showDetailModal && selectedWarga && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Detail Data Warga</h2>
            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6 text-sm text-gray-900">
            {/* ================= DATA KK ================= */}
           <div>
  <h3 className="font-bold mb-2">DATA KK</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <p><strong>Kepala Keluarga:</strong> {selectedWarga.nama_kepala_keluarga}</p>
    <p><strong>Alamat Tinggal:</strong> {selectedWarga.alamat_tinggal}</p>
    <p><strong>RT:</strong> {selectedWarga.rt}</p>
    <p><strong>RW:</strong> {selectedWarga.rw}</p>
    <p><strong>Kelurahan:</strong> {selectedWarga.kelurahan}</p>
    <p><strong>Kabupaten/Kota:</strong> {selectedWarga.kabupaten_kota}</p>
    <p><strong>Provinsi:</strong> {selectedWarga.provinsi}</p>
    <p><strong>Negara:</strong> {selectedWarga.negara}</p>
    <p><strong>No KK:</strong> {selectedWarga.no_kk}</p>
    <p><strong>Tanggal Terbit KK:</strong> {selectedWarga.tanggal_terbit_kk}</p>
  </div>
</div>


            {/* ================= DATA WARGA ================= */}
            <div>
              <h3 className="font-bold mb-2">DATA WARGA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p><strong>ID Warga:</strong> {selectedWarga.id_warga}</p>
                <p><strong>Nama:</strong> {selectedWarga.nama}</p>
                <p><strong>NIK:</strong> {selectedWarga.nik}</p>
                <p><strong>Tempat Lahir:</strong> {selectedWarga.tempat_lahir}</p>
                <p><strong>Tanggal Lahir:</strong> {selectedWarga.tanggal_lahir}</p>
                <p><strong>Agama:</strong> {selectedWarga.agama}</p>
                <p><strong>Pekerjaan:</strong> {selectedWarga.pekerjaan}</p>
                <p><strong>No Telepon:</strong> {selectedWarga.no_telepon}</p>
              </div>
            </div>

            {/* ================= STATUS KEPENDUDUKAN ================= */}
            <div>
              <h3 className="font-bold mb-2">STATUS KEPENDUDUKAN</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p><strong>Kewarganegaraan:</strong> {selectedWarga.kewarganegaraan}</p>
                <p><strong>Status Perkawinan:</strong> {selectedWarga.status_perkawinan}</p>
                <p><strong>Status Kependudukan:</strong> {selectedWarga.status_kependudukan}</p>
                {selectedWarga.status_kependudukan === "Penduduk Tetap" && (
                  <>
                    <p><strong>Status Hubungan dalam Keluarga:</strong> {selectedWarga.status_hubungan_keluarga}</p>
                    {selectedWarga.status_hubungan_keluarga === "Lainnya" && (
                      <p><strong>Hubungan dengan Kepala Keluarga:</strong> {selectedWarga.hubungan_lainnya}</p>
                    )}
                  </>
                )}
                <p><strong>Tanggal Registrasi:</strong> {selectedWarga.tanggal_register}</p>
              </div>
            </div>

            {/* ================= STATUS DOMISILI ================= */}
            <div>
              <h3 className="font-bold mb-2">STATUS DOMISILI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p><strong>Status Domisili:</strong> {selectedWarga.status_domisili}</p>
                {selectedWarga.status_domisili !== "Tinggal" && (
                  <p className="md:col-span-2"><strong>Alamat Selama Tinggal di Lokasi Lain / Keterangan Lain:</strong> {selectedWarga.alamat_lain}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                // Cetak detail
                const printWindow = window.open("", "_blank")
                printWindow.document.write(`<pre>${JSON.stringify(selectedWarga, null, 2)}</pre>`)
                printWindow.document.close()
                printWindow.print()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cetak Data
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

    </div>
  )
}

export default DataWargaPage
