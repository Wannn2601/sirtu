"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Edit, Eye, Trash2, FileText, Download, X, Users, ChevronUp, ChevronDown } from "lucide-react"
import { firestoreService } from "../../services/firebase"
import Swal from "sweetalert2"
import * as XLSX from "xlsx"

const AnggotaDawisPage = () => {
  const [wargaData, setWargaData] = useState([])
  const [kkData, setKkData] = useState([])
  const [pekerjaanData, setPekerjaanData] = useState([])
  const [dawisData, setDawisData] = useState([])
  const [userData, setUserData] = useState({
    rt: "",
    rw: "",
    kelurahan: "",
    kecamatan: "",
    kabupaten_kota: "",
    provinsi: "",
  })
  const [currentUser] = useState({ level: "superadmin" })
  const [loading, setLoading] = useState(false)


  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [sortField, setSortField] = useState("alamat_tinggal")
  const [sortDirection, setSortDirection] = useState("asc")
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingWarga, setEditingWarga] = useState(null)
  const [selectedWarga, setSelectedWarga] = useState(null)

 const loadDawisData = async () => {
  try {
    const data = await firestoreService.getAll("dawisPkk")
    let aktif = Array.isArray(data) ? data.filter((d) => d.status === "aktif") : []

    // urut berdasarkan field "dawis"
    aktif.sort((a, b) => a.dawis.localeCompare(b.dawis, "id", { numeric: true }))

    setDawisData(aktif)
  } catch (error) {
    console.error("Error loading dawis data:", error)
    setDawisData([])
  }
}


  // Form state
  const [formData, setFormData] = useState({
     id_dawis: "",
  nama_dawis: "",
    id_kk: "",
    nama_kepala_keluarga: "",
    alamat_tinggal: "",
    rt: "",
    rw: "",
    kelurahan: "",
    kecamatan: "",
    kabupaten_kota: "",
    provinsi: "",
    negara: "",
    no_kk: "",
    tanggal_terbit_kk: "",
    id_warga: "",
    nama: "",
    nik: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    agama: "Islam",
    pekerjaan: "",
    no_telepon: "+62",
    kewarganegaraan: "WNI",
    status_perkawinan: "Belum Kawin",
    status_kependudukan: "",
    status_hubungan_keluarga: "",
    hubungan_lainnya: "",
    hubungan_kk: "",
    tanggal_register: new Date().toISOString().split("T")[0],
    status_domisili: "Tinggal",
    alamat_lain: "",
    status_warga: "Aktif",
    tanggal_selesai_tinggal: null,
  })

  useEffect(() => {
    loadAllData()
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Try to get user ID from localStorage
      const userId = localStorage.getItem("userId")

      if (userId) {
        // Fetch specific user by ID
        const users = await firestoreService.getAll("users")
        const user = users.find((u) => u.id === userId || u.id === Number(userId))

        if (user) {
          setUserData({
            rt: user.RT || user.rt || "",
            rw: user.RW || user.rw || "",
            kelurahan: user.Kelurahan || user.kelurahan || "",
            kecamatan: user.kecamatan || "",
            kabupaten_kota: user.kabupaten_kota || "",
            provinsi: user.Provinsi || user.provinsi || "",
          })
          return
        }
      }

      // Fallback: get first active superadmin user
      const users = await firestoreService.getAll("users")
      const activeUser = users.find((u) => u.status === "aktif" && u.level === "superadmin")

      if (activeUser) {
        setUserData({
          rt: activeUser.RT || activeUser.rt || "",
          rw: activeUser.RW || activeUser.rw || "",
          kelurahan: activeUser.Kelurahan || activeUser.kelurahan || "",
          kecamatan: activeUser.kecamatan || "",
          kabupaten_kota: activeUser.kabupaten_kota || "",
          provinsi: activeUser.Provinsi || activeUser.provinsi || "",
        })
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const loadAllData = async () => {
    try {
      setLoading(true)
await Promise.all([loadWargaData(), loadKKData(), loadPekerjaanData(), loadDawisData()])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadWargaData = async () => {
    try {
      const data = await firestoreService.getAll("wargaData")
      const withIds = Array.isArray(data) ? data.map((item) => ({ ...item, id: item.id })) : []
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
    await firestoreService.update("wargaData", id, data)
    await loadWargaData()
  }

  const deleteWarga = async (id) => {
    await firestoreService.delete("wargaData", id)
    await loadWargaData()
  }

  // Calculate age in years and months
  const calculateAge = (birthDate) => {
    if (!birthDate) return { years: 0, months: 0 }

    const birth = new Date(birthDate)
    const today = new Date()

    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    return { years, months }
  }

  // Filter data for Anggota Dawis
  const filteredData = useMemo(() => {
    const filtered = wargaData.filter((warga) => {
      // Filter conditions based on image requirements
      const isStatusTetap = warga.status_kependudukan === "Penduduk Tetap"
      const isIstri = warga.status_hubungan_keluarga === "Istri"
      const isDomisiliValid =
        warga.status_domisili === "Tinggal" || warga.status_domisili === "Tinggal diluar kota/wilayah lain"

      // Search filter
      const matchesSearch = Object.values(warga).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      )

      return isStatusTetap && isIstri && isDomisiliValid && matchesSearch
    })

    // Sort data by alamat (default)
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
  }, [wargaData, searchTerm, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      if (name === "id_kk") {
        const selectedKK = kkData.find((kk) => kk.id_kk === value)
        if (selectedKK) {
          newData.nama_kepala_keluarga = selectedKK.nama_kepala_keluarga
          newData.no_kk = selectedKK.nomor_kk
          newData.alamat_tinggal = `${selectedKK.alamat}, No ${selectedKK.no_rumah}`
          newData.rt = selectedKK.rt || ""
          newData.rw = selectedKK.rw || ""
          newData.kelurahan = selectedKK.kelurahan || ""
          newData.kecamatan = selectedKK.kecamatan || ""
          newData.kabupaten_kota = selectedKK.kabupaten_kota || ""
          newData.provinsi = selectedKK.provinsi || ""
          newData.negara = selectedKK.negara || ""
          newData.tanggal_terbit_kk = selectedKK.tanggal_terbit || ""
          newData.status_kependudukan = selectedKK.status_kk === "Tetap" ? "Penduduk Tetap" : "Penduduk Tidak Tetap"
          newData.tanggal_register = selectedKK.tanggal_daftar_kk
        }
      }

      if (name === "status_kependudukan" && value === "Penduduk Tetap") {
        newData.status_hubungan_keluarga = ""
      }

      if (name === "status_hubungan_keluarga" && value !== "Lainnya") {
        newData.hubungan_lainnya = ""
      }

      if (name === "status_domisili" && value === "Tinggal") {
        newData.alamat_lain = ""
      }

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
      text: `Apakah Anda yakin ingin ${editingWarga ? "mengubah" : "menambahkan"} data anggota dawis ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#ef4444",
    })

    if (!result.isConfirmed) return

    if (formData.nik.length !== 16) {
      Swal.fire({
        title: "Error",
        text: "NIK harus 16 digit",
        icon: "error",
      })
      return
    }

    if (!formData.no_telepon.startsWith("+62")) {
      Swal.fire({
        title: "Error",
        text: "Nomor telepon harus dimulai dengan +62",
        icon: "error",
      })
      return
    }

    if (!editingWarga) {
      const existingWarga = wargaData.find((w) => w.id_warga === formData.id_warga)
      if (existingWarga) {
        Swal.fire({
          title: "Error",
          text: "ID Warga sudah digunakan, silahkan buat ID lain atau batal.",
          icon: "error",
        })
        return
      }
    }

    try {
      if (editingWarga) {
        await updateWarga(editingWarga.id, formData)
        Swal.fire({
          title: "Berhasil",
          text: "Data anggota dawis berhasil diperbarui",
          icon: "success",
        })
      } else {
        await addWarga(formData)
        Swal.fire({
          title: "Berhasil",
          text: "Data anggota dawis berhasil ditambahkan",
          icon: "success",
        })
      }

      setShowModal(false)
      resetForm()
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Terjadi kesalahan saat menyimpan data",
        icon: "error",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      id_kk: "",
      nama_kepala_keluarga: "",
      alamat_tinggal: "",
      rt: "",
      rw: "",
      kelurahan: "",
      kecamatan: "",
      kabupaten_kota: "",
      provinsi: "",
      negara: "",
      no_kk: "",
      tanggal_terbit_kk: "",
      id_warga: "",
      nama: "",
      nik: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      agama: "Islam",
      pekerjaan: "",
      no_telepon: "+62",
      kewarganegaraan: "WNI",
      status_perkawinan: "Belum Kawin",
      status_kependudukan: "",
      status_hubungan_keluarga: "",
      hubungan_lainnya: "",
      hubungan_kk: "",
      tanggal_register: new Date().toISOString().split("T")[0],
      status_domisili: "Tinggal",
      alamat_lain: "",
      status_warga: "Aktif",
      tanggal_selesai_tinggal: null,
    })
    setEditingWarga(null)
  }

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
    })

    if (result.isConfirmed) {
      try {
        await deleteWarga(warga.id)
        Swal.fire({
          title: "Berhasil",
          text: "Data anggota dawis berhasil dihapus",
          icon: "success",
        })
      } catch (error) {
        console.error("Error deleting warga:", error)
        Swal.fire({
          title: "Error",
          text: "Terjadi kesalahan saat menghapus data",
          icon: "error",
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
      })

      if (!result.isConfirmed) return
    }

    setShowModal(false)
    resetForm()
  }

  const handleDetail = (warga) => {
    setSelectedWarga(warga)
    setShowDetailModal(true)
  }

  // Export functions
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank")

    const rt = userData.rt || "{rt}"
    const rw = userData.rw || "{rw}"
    const kelurahan = userData.kelurahan || "{kelurahan}"
    const kecamatan = userData.kecamatan || "{kecamatan}"
    const kabKota = userData.kabupaten_kota || "{kab/kota}"

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Data Anggota Dawis</title>
          <style>
            @page { size: landscape; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 9px; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            .header { text-align: center; margin-bottom: 10px; }
            .sub-header { text-align: center; font-size: 12px; margin: 2px 0; }
            .view-info { text-align: left; font-size: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 5px 0;">Data Anggota Dawis</h2>
            <p class="sub-header">RT ${rt} RW ${rw}</p>
            <p class="sub-header">Kelurahan ${kelurahan} - Kecamatan ${kecamatan}</p>
            <p class="sub-header">${kabKota}</p>
          </div>
          <div class="view-info">
            <strong>View:</strong> 25, 50, 100 &nbsp;&nbsp;&nbsp; <strong>PDF</strong> &nbsp; EXCEL &nbsp;&nbsp;&nbsp; <-- pdf viewer landscape
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Alamat<br/>(alamat_) (no_rumah)</th>
                <th>tempat, tanggal lahir</th>
                <th>Usiian<br/>(th) Th. (bln) Bl.</th>
                <th>Status Perkawinan<br/>(status_kawin by dt warga)</th>
                <th>Keterangan<br/>(status_domisili)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData
                .map((warga, index) => {
                  const age = calculateAge(warga.tanggal_lahir)
                  return `
                    <tr>
                      <td style="text-align: center;">${index + 1}</td>
                      <td>${warga.nama}</td>
                      <td>${warga.alamat_tinggal}</td>
                      <td>${warga.tempat_lahir}, ${warga.tanggal_lahir}</td>
                      <td style="text-align: center;">${age.years} Th. ${age.months} Bl.</td>
                      <td>${warga.status_perkawinan}</td>
                      <td>${warga.status_domisili}</td>
                    </tr>
                  `
                })
                .join("")}
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 10px;">
            <p><strong>Bisnis:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>Short by alamat</li>
              <li>Diambil dari data warga dengan kondisi:</li>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>1. Status Kependudukan adalah Tetap</li>
                <li>2. Status Hubungan dalam keluarga adalah Istri</li>
                <li>3. Status Domisili Sesuai Alamat, dan Merantau.</li>
              </ul>
            </ul>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const exportToExcel = () => {
    const exportData = filteredData.map((warga, index) => {
      const age = calculateAge(warga.tanggal_lahir)
      return {
        No: index + 1,
        Nama: warga.nama,
        Alamat: warga.alamat_tinggal,
        "Tempat, Tanggal Lahir": `${warga.tempat_lahir}, ${warga.tanggal_lahir}`,
        "Usia (Tahun)": age.years,
        "Usia (Bulan)": age.months,
        "Status Perkawinan": warga.status_perkawinan,
        Keterangan: warga.status_domisili,
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data Anggota Dawis")
    XLSX.writeFile(wb, "data_anggota_dawis.xlsx")
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Anggota Dawis</h1>
          <p className="text-gray-600">
            RT {userData.rt || "{rt}"} RW {userData.rw || "{rw}"}
          </p>
          <p className="text-sm text-gray-500">
            Kelurahan {userData.kelurahan || "{kelurahan}"} - Kecamatan {userData.kecamatan || "{kecamatan}"}
          </p>
          <p className="text-sm text-gray-500">Kota/Kabupaten - {userData.kabupaten_kota || "{kab/kota}"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            EXCEL
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari data anggota dawis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  <button onClick={() => handleSort("nama")} className="flex items-center gap-1 hover:text-gray-700">
                    Nama
                    {sortField === "nama" &&
                      (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  <button
                    onClick={() => handleSort("alamat_tinggal")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Alamat
                    {sortField === "alamat_tinggal" &&
                      (sortDirection === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>
                  {/* <span className="text-xs font-normal">(alamat_) (no_rumah)</span> */}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  tempat, tanggal lahir
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Usiian
                  <br />
                  {/* <span className="text-xs font-normal">(th) Th. (bln) Bl.</span> */}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Status Perkawinan
                  <br />
                  {/* <span className="text-xs font-normal">(status_kawin by dt warga)</span> */}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Keterangan
                  <br />
                  {/* <span className="text-xs font-normal">(status_domisili)</span> */}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">
  Dawis
</th>

                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((warga, index) => {
                const age = calculateAge(warga.tanggal_lahir)
                return (
                  <tr key={warga.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r text-center">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.nama}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.alamat_tinggal}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">
                      {warga.tempat_lahir}, {warga.tanggal_lahir}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r text-center">
                      {age.years} Th. {age.months} Bl.
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.status_perkawinan}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.status_domisili}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">{warga.nama_dawis || "-"}</td>

                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center justify-center gap-2">
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
                )
              })}
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
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

      {/* Business Rules Info */}
      {/* <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-900 mb-2">Bisnis:</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Short by alamat</li>
          <li>Diambil dari data warga dengan kondisi:</li>
          <ul className="list-decimal list-inside ml-6 space-y-1">
            <li>Status Kependudukan adalah Tetap</li>
            <li>Status Hubungan dalam keluarga adalah Istri</li>
            <li>Status Domisili Sesuai Alamat, dan Merantau.</li>
          </ul>
        </ul>
      </div> */}

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Anggota Dawis</p>
              <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
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
                    {editingWarga ? "Edit Data Anggota Dawis" : "Tambah Data Anggota Dawis"}
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
                  {/* DATA KK */}
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
                      <input
                        type="text"
                        value={formData.alamat_tinggal}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">RT</label>
                      <input
                        type="text"
                        name="rt"
                        value={formData.rt}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">RW</label>
                      <input
                        type="text"
                        name="rw"
                        value={formData.rw}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Kelurahan</label>
                      <input
                        type="text"
                        name="kelurahan"
                        value={formData.kelurahan}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Kecamatan</label>
                      <input
                        type="text"
                        name="kecamatan"
                        value={formData.kecamatan}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Kabupaten/Kota</label>
                      <input
                        type="text"
                        name="kabupaten_kota"
                        value={formData.kabupaten_kota}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">No KK</label>
                      <input
                        type="text"
                        name="no_kk"
                        value={formData.no_kk}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                  </div>

                  {/* DATA WARGA */}
                  <h2 className="font-bold">DATA WARGA</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">ID Warga *</label>
                      <input
                        type="text"
                        name="id_warga"
                        value={formData.id_warga}
                        onChange={handleInputChange}
                        disabled={editingWarga}
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Nama *</label>
                      <input
                        type="text"
                        name="nama"
                        value={formData.nama}
                        onChange={handleInputChange}
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">NIK (16 digit) *</label>
                      <input
                        type="text"
                        name="nik"
                        value={formData.nik}
                        onChange={handleInputChange}
                        maxLength={16}
                        pattern="[0-9]{16}"
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Tempat Lahir *</label>
                      <input
                        type="text"
                        name="tempat_lahir"
                        value={formData.tempat_lahir}
                        onChange={handleInputChange}
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Tanggal Lahir *</label>
                      <input
                        type="date"
                        name="tanggal_lahir"
                        value={formData.tanggal_lahir}
                        onChange={handleInputChange}
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Agama *</label>
                      <select
                        name="agama"
                        value={formData.agama}
                        onChange={handleInputChange}
                        required
                        className="w-full border px-3 py-2"
                      >
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
                      <select
                        name="pekerjaan"
                        value={formData.pekerjaan}
                        onChange={handleInputChange}
                        required
                        className="w-full border px-3 py-2"
                      >
                        <option value="">Pilih</option>
                        {pekerjaanData.map((job) => (
                          <option key={job.id} value={job.nama_pekerjaan}>
                            {job.nama_pekerjaan}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">No Telepon *</label>
                      <input
                        type="text"
                        name="no_telepon"
                        value={formData.no_telepon}
                        onChange={handleInputChange}
                        placeholder="+62xxxxx"
                        required
                        className="w-full border px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* STATUS KEPENDUDUKAN */}
                  <h2 className="font-bold">STATUS KEPENDUDUKAN</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">Status Perkawinan *</label>
                      <select
                        name="status_perkawinan"
                        value={formData.status_perkawinan}
                        onChange={handleInputChange}
                        className="w-full border px-3 py-2"
                      >
                        <option value="Belum Kawin">Belum Kawin</option>
                        <option value="Kawin">Kawin</option>
                        <option value="Janda">Janda</option>
                        <option value="Duda">Duda</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">Status Kependudukan</label>
                      <input
                        type="text"
                        name="status_kependudukan"
                        value={formData.status_kependudukan}
                        readOnly
                        className="w-full border px-3 py-2 bg-gray-100"
                      />
                    </div>
                    {formData.status_kependudukan === "Penduduk Tetap" && (
                      <div>
                        <label className="block text-sm">Status Hubungan dalam Keluarga *</label>
                        <select
                          name="status_hubungan_keluarga"
                          value={formData.status_hubungan_keluarga}
                          onChange={handleInputChange}
                          className="w-full border px-3 py-2"
                        >
                          <option value="">Pilih</option>
                          <option value="Suami">Suami</option>
                          <option value="Istri">Istri</option>
                          <option value="Anak">Anak</option>
                          <option value="Orang Tua">Orang Tua</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* STATUS DOMISILI */}
                  <h2 className="font-bold">STATUS DOMISILI</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">Status Domisili *</label>
                      <select
                        name="status_domisili"
                        value={formData.status_domisili}
                        onChange={handleInputChange}
                        className="w-full border px-3 py-2"
                      >
                        <option value="Tinggal">Sesuai Alamat</option>
                        <option value="Tinggal diluar kota/wilayah lain">Merantau</option>
                      </select>
                    </div>
                    {formData.status_domisili !== "Tinggal" && (
                      <div className="md:col-span-2">
                        <label className="block text-sm">Alamat Selama Merantau</label>
                        <textarea
                          name="alamat_lain"
                          value={formData.alamat_lain}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full border px-3 py-2"
                        />
                      </div>
                    )}
                  </div>

                  <h2 className="font-bold">DAWIS</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm">Pilih Dawis *</label>
    <select
      name="id_dawis"
      value={formData.id_dawis}
      onChange={(e) => {
        const selected = dawisData.find(d => d.id === e.target.value)
        setFormData((prev) => ({
          ...prev,
          id_dawis: e.target.value,
          nama_dawis: selected ? selected.nama_dawis : ""
        }))
      }}
      className="w-full border px-3 py-2"
      required
    >
      <option value="">Pilih Dawis</option>
      {dawisData.map((dawis) => (
        <option key={dawis.id} value={dawis.id}>
          {dawis.dawis} - {dawis.nama_dawis}
        </option>
      ))}
    </select>
  </div>
</div>



                  <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg">
                      Batal
                    </button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <h2 className="text-xl font-bold text-gray-900">Detail Data Anggota Dawis</h2>
                  <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 text-sm text-gray-900">
                  <div>
                    <h3 className="font-bold mb-2">DATA KK</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p>
                        <strong>Kepala Keluarga:</strong> {selectedWarga.nama_kepala_keluarga}
                      </p>
                      <p>
                        <strong>Alamat Tinggal:</strong> {selectedWarga.alamat_tinggal}
                      </p>
                      <p>
                        <strong>RT:</strong> {selectedWarga.rt}
                      </p>
                      <p>
                        <strong>RW:</strong> {selectedWarga.rw}
                      </p>
                      <p>
                        <strong>Kelurahan:</strong> {selectedWarga.kelurahan}
                      </p>
                      <p>
                        <strong>Kecamatan:</strong> {selectedWarga.kecamatan}
                      </p>
                      <p>
                        <strong>Kabupaten/Kota:</strong> {selectedWarga.kabupaten_kota}
                      </p>
                      <p>
                        <strong>No KK:</strong> {selectedWarga.no_kk}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">DATA WARGA</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p>
                        <strong>ID Warga:</strong> {selectedWarga.id_warga}
                      </p>
                      <p>
                        <strong>Nama:</strong> {selectedWarga.nama}
                      </p>
                      <p>
                        <strong>NIK:</strong> {selectedWarga.nik}
                      </p>
                      <p>
                        <strong>Tempat Lahir:</strong> {selectedWarga.tempat_lahir}
                      </p>
                      <p>
                        <strong>Tanggal Lahir:</strong> {selectedWarga.tanggal_lahir}
                      </p>
                      <p>
                        <strong>Usia:</strong> {calculateAge(selectedWarga.tanggal_lahir).years} Tahun{" "}
                        {calculateAge(selectedWarga.tanggal_lahir).months} Bulan
                      </p>
                      <p>
                        <strong>Agama:</strong> {selectedWarga.agama}
                      </p>
                      <p>
                        <strong>Pekerjaan:</strong> {selectedWarga.pekerjaan}
                      </p>
                      <p>
                        <strong>No Telepon:</strong> {selectedWarga.no_telepon}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">STATUS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p>
                        <strong>Status Perkawinan:</strong> {selectedWarga.status_perkawinan}
                      </p>
                      <p>
                        <strong>Status Kependudukan:</strong> {selectedWarga.status_kependudukan}
                      </p>
                      <p>
                        <strong>Status Hubungan dalam Keluarga:</strong> {selectedWarga.status_hubungan_keluarga}
                      </p>
                      <p>
                        <strong>Status Domisili:</strong> {selectedWarga.status_domisili}
                      </p>
                      {selectedWarga.status_domisili !== "Tinggal" && (
                        <p className="md:col-span-2">
                          <strong>Alamat Selama Merantau:</strong> {selectedWarga.alamat_lain}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
  <h3 className="font-bold mb-2 pt-6">DAWIS</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
    <p>
      <strong>Nama Dawis:</strong> {selectedWarga.nama_dawis || "-"}
    </p>
  </div>
</div>


                <div className="flex justify-end gap-3 pt-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Tutup
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

export default AnggotaDawisPage
