"use client"

import { useState, useEffect } from "react"
import { firestoreService } from "../../services/firebase"
import * as XLSX from "xlsx"
import Swal from "sweetalert2"
import { X, Edit, Trash2, Plus, Search } from "lucide-react"

const PembukaanPage = () => {
  const [pembukaanData, setPembukaanData] = useState([])
  const [rekeningKegiatanData, setRekeningKegiatanData] = useState([])
  const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([])
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("add")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState("keseluruhan")
  const [selectedJenisPembukuan, setSelectedJenisPembukuan] = useState("keseluruhan")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

//   const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([])

  const [formData, setFormData] = useState({
  id: null,
  tanggal: new Date().toISOString().split("T")[0],
  kas_type: "KAS RT",
  jenis_pembukuan: "Penerimaan",
  id_sub_rekening_asal: "",
  id_sub_rekening_tujuan: "", // hanya dipakai kalau Mutasi
  jumlah: "",
  keterangan: "",
  uraian: "",
  pembukuan: "",
  status: "aktif",
  dibuat_oleh: "",
})


  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)

      const userId = localStorage.getItem("userId") || "1"
      const usersData = await firestoreService.getAll("users")
      const currentUser =
        usersData.find((u) => u.id.toString() === userId) ||
        usersData.find((u) => u.level === "superadmin" && u.status === "aktif")

      setUserData(currentUser)

      const [pembukaanList, rekeningList, subRekeningList] = await Promise.all([
        firestoreService.getAll("laporanKeuangan"),
        firestoreService.getAll("rekeningKegiatan"),
        firestoreService.getAll("subRekeningKegiatan"),
      ])

      setPembukaanData(pembukaanList)
      setRekeningKegiatanData(rekeningList)
      setSubRekeningKegiatanData(subRekeningList)
    } catch (error) {
      console.error("Error loading data:", error)
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Gagal memuat data",
      })
    } finally {
      setLoading(false)
    }
  }

  const months = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ]

  const jenisPembukaanOptions = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "Penerimaan", label: "Penerimaan" },
    { value: "Pengeluaran", label: "Pengeluaran" },
    { value: "Mutasi Anggaran", label: "Mutasi Anggaran" },
  ]

  const defaultSubRekenings = [
  { id: "1.1", sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu", pembukuan: "RT", id_kelompok: "1" },
  { id: "1.2", sub_rekening_kegiatan: "Iuran Wajib Warga", pembukuan: "RT", id_kelompok: "1" },
  { id: "2.1", sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu", pembukuan: "PKK", id_kelompok: "2" },
  { id: "2.2", sub_rekening_kegiatan: "Iuran Wajib PKK", pembukuan: "PKK", id_kelompok: "2" },
]


  // Fungsi angka ke terbilang sederhana
const toTerbilang = (angka) => {
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
  if (angka === 0) return "Nol Rupiah";

  const convert = (n) => {
    if (n < 10) return satuan[n];
    if (n < 20) return satuan[n - 10] + " Belas";
    if (n < 100) return convert(Math.floor(n / 10)) + " Puluh " + satuan[n % 10];
    if (n < 200) return "Seratus " + convert(n - 100);
    if (n < 1000) return convert(Math.floor(n / 100)) + " Ratus " + convert(n % 100);
    if (n < 2000) return "Seribu " + convert(n - 1000);
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Ribu " + convert(n % 1000);
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Juta " + convert(n % 1000000);
    return "";
  };

  return convert(angka).trim() + " Rupiah";
};


  const filteredData = pembukaanData.filter((item) => {
    const itemYear = new Date(item.tanggal).getFullYear()
    const itemMonth = (new Date(item.tanggal).getMonth() + 1).toString().padStart(2, "0")

    const matchesYear = itemYear === selectedYear
    const matchesMonth = selectedMonth === "keseluruhan" || itemMonth === selectedMonth
    const matchesJenis = selectedJenisPembukuan === "keseluruhan" || item.jenis_pembukuan === selectedJenisPembukuan
    const matchesSearch =
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.uraian?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesYear && matchesMonth && matchesJenis && matchesSearch
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrencyInput = (value) => {
    const number = value.replace(/\D/g, "")
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID")
  }

  const handleOpenModal = (mode, data = null) => {
    setModalMode(mode)
   if (mode === "edit" && data) {
  setFormData({
    id: data.id,
    tanggal: data.tanggal,
    kas_type: data.kategori === "kas_pkk" ? "KAS PKK" : "KAS RT",
    jenis_pembukuan: data.jenis_pembukuan || "Penerimaan",
    id_sub_rekening_asal: data.id_sub_rekening_kegiatan || "",
    id_sub_rekening_tujuan: data.id_sub_rekening_mutasi || "",
    jumlah: (data.penerimaan || data.pengeluaran || 0).toString(),
    keterangan: data.keterangan || data.detail || "",
    uraian: data.uraian || "",
    pembukuan: data.pembukuan || "",
    status: data.status || "aktif",
    dibuat_oleh: data.dibuat_oleh || "",
  })
}
 else {
      setFormData({
        id: null,
        tanggal: new Date().toISOString().split("T")[0],
        kas_type: "KAS RT",
        jenis_pembukuan: "Penerimaan",
        id_rekening_kegiatan: "",
        id_sub_rekening_kegiatan: "",
        id_rekening_mutasi: "",
        id_sub_rekening_mutasi: "",
        jumlah: "",
        keterangan: "",
        uraian: "",
        pembukuan: "",
        status: "aktif",
        dibuat_oleh: userData?.nama || "",
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      id: null,
      tanggal: new Date().toISOString().split("T")[0],
      kas_type: "KAS RT",
      jenis_pembukuan: "Penerimaan",
      id_rekening_kegiatan: "",
      id_sub_rekening_kegiatan: "",
      id_rekening_mutasi: "",
      id_sub_rekening_mutasi: "",
      jumlah: "",
      keterangan: "",
      uraian: "",
      pembukuan: "",
      status: "aktif",
      dibuat_oleh: "",
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.tanggal || !formData.jumlah) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan!",
        text: "Mohon lengkapi semua field yang wajib diisi",
      })
      return
    }

    if (formData.jenis_pembukuan === "Mutasi Anggaran") {
      const saldoAsal = getSaldoRekening(formData.id_sub_rekening_kegiatan)
      const jumlahInput = Number.parseFloat(formData.jumlah.replace(/\s/g, ""))

      if (jumlahInput > saldoAsal) {
        Swal.fire({
          icon: "warning",
          title: "Peringatan!",
          text: `Jumlah tidak boleh lebih besar dari Saldo Rekening Asal (${formatCurrency(saldoAsal)})`,
        })
        return
      }

      if (!formData.id_rekening_mutasi || !formData.id_sub_rekening_mutasi) {
        Swal.fire({
          icon: "warning",
          title: "Peringatan!",
          text: "Mohon lengkapi Rekening Mutasi untuk Mutasi Anggaran",
        })
        return
      }
    }

    try {
      setLoading(true)

      const subRekening = subRekeningKegiatanData.find(
        (item) => item.id.toString() === formData.id_sub_rekening_kegiatan,
      )

      const jumlahValue = Number.parseFloat(formData.jumlah.replace(/\s/g, ""))

      const previousTransactions = pembukaanData.filter((item) => {
        const itemDate = new Date(item.tanggal)
        const currentDate = new Date(formData.tanggal)
        return (
          item.id_sub_rekening_kegiatan === formData.id_sub_rekening_kegiatan &&
          itemDate < currentDate &&
          item.id !== formData.id // Exclude current item if editing
        )
      })

      const saldo_bulan_lalu = previousTransactions.reduce((sum, item) => {
        return sum + (item.penerimaan || 0) - (item.pengeluaran || 0)
      }, 0)

      const currentPenerimaan = formData.jenis_pembukuan === "Penerimaan" ? jumlahValue : 0
      const currentPengeluaran = formData.jenis_pembukuan === "Pengeluaran" ? jumlahValue : 0
      const saldo_bulan_ini = saldo_bulan_lalu + currentPenerimaan - currentPengeluaran

     const laporanData = {
  tanggal: formData.tanggal,
  uraian:
    formData.jenis_pembukuan === "Mutasi Anggaran" && formData.uraian
      ? formData.uraian
      : subRekening?.sub_rekening_kegiatan || "",
  detail: formData.keterangan,
  keterangan: formData.keterangan,
  saldo_bulan_lalu: saldo_bulan_lalu,
  penerimaan: currentPenerimaan,
  pengeluaran: currentPengeluaran,
  saldo_bulan_ini: saldo_bulan_ini,
  pembukuan: formData.kas_type === "KAS PKK" ? "PKK" : "RT",
  kategori: formData.kas_type === "KAS PKK" ? "kas_pkk" : "kas_rt",
  jenis_pembukuan: formData.jenis_pembukuan,
  id_sub_rekening_kegiatan: formData.id_sub_rekening_asal, // 👈 pakai asal
  id_sub_rekening_mutasi: formData.id_sub_rekening_tujuan || null, // 👈 pakai tujuan
  status: formData.status,
  dibuat_oleh: formData.dibuat_oleh || userData?.nama || "",
  createdAt: modalMode === "add" ? new Date().toISOString() : undefined,
  updatedAt: new Date().toISOString(),
}


      if (modalMode === "add") {
        await firestoreService.add("laporanKeuangan", laporanData)
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data pembukuan berhasil ditambahkan",
          timer: 2000,
          showConfirmButton: false,
        })
      } else {
        await firestoreService.update("laporanKeuangan", formData.id, laporanData)
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data pembukuan berhasil diupdate",
          timer: 2000,
          showConfirmButton: false,
        })
      }

      handleCloseModal()
      await loadAllData()
    } catch (error) {
      console.error("Error saving data:", error)
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Gagal menyimpan data",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Data?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        await firestoreService.delete("laporanKeuangan", id)
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data berhasil dihapus",
          timer: 2000,
          showConfirmButton: false,
        })
        await loadAllData()
      } catch (error) {
        console.error("Error deleting data:", error)
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Gagal menghapus data",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const exportToExcel = () => {
    try {
      const exportData = filteredData.map((item, index) => ({
        No: index + 1,
        Tanggal: formatDate(item.tanggal),
        Uraian: item.uraian || "",
        Kegiatan: item.detail || item.keterangan || "",
        Pembukuan: item.pembukuan || "",
        Penerimaan: item.penerimaan || 0,
        Pengeluaran: item.pengeluaran || 0,
        Status: item.status || "",
        User: item.dibuat_oleh || "",
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Pembukuan")
      XLSX.writeFile(wb, `Pembukuan_${selectedYear}_${selectedMonth}.xlsx`)

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke Excel",
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
      })
    }
  }

  const getFilteredSubRekening = () => {
    if (!formData.id_rekening_kegiatan) return []
    return subRekeningKegiatanData.filter((item) => item.id_kelompok === formData.id_rekening_kegiatan)
  }

  const getSaldoRekening = (subRekeningId) => {
    const transactions = pembukaanData.filter((item) => item.id_sub_rekening_kegiatan === subRekeningId)
    const totalPenerimaan = transactions.reduce((sum, item) => sum + (item.penerimaan || 0), 0)
    const totalPengeluaran = transactions.reduce((sum, item) => sum + (item.pengeluaran || 0), 0)
    return totalPenerimaan - totalPengeluaran
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Histori Pembukuan Keuangan</h1>
        {userData && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Kab/Kota - {userData.kabupaten_kota || "-"}</p>
            <p>
              Kecamatan - {userData.kecamatan || "-"} Kelurahan {userData.Kelurahan || userData.kelurahan || "-"}
            </p>
            <p>
              RT {userData.RT || userData.rt || "-"} RW {userData.RW || userData.rw || "-"}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Buku</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bulan Pembukuan</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pilihan Pembukuan */}
<div className="form-group">
  <label>Pembukuan</label>
  <div>
    <label>
      <input
        type="radio"
        value="KAS RT"
        checked={formData.pembukuan === "KAS RT"}
        onChange={(e) => setFormData({ ...formData, pembukuan: e.target.value })}
        disabled={userData?.jabatan?.toLowerCase().includes("bendahara rt")}
      />
      Kas RT
    </label>
    <label className="ml-4">
      <input
        type="radio"
        value="KAS PKK"
        checked={formData.pembukuan === "KAS PKK"}
        onChange={(e) => setFormData({ ...formData, pembukuan: e.target.value })}
        disabled={userData?.jabatan?.toLowerCase().includes("bendahara pkk")}
      />
      Kas PKK
    </label>
  </div>
</div>


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number.parseInt(e.target.value))
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => handleOpenModal("add")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Buat
        </button>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📊</span>
          Excel
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari data dalam tabel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Tgl Pembukuan</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Uraian</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Kegiatan</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Pembukuan</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-right">Penerimaan</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-right">Pengeluaran</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">Status</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">User</th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-400 px-3 py-2 text-sm">{formatDate(item.tanggal)}</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">{item.uraian || "-"}</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">
                      {item.detail || item.keterangan || "-"}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">{item.pembukuan || "-"}</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.penerimaan || 0)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.pengeluaran || 0)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.status === "aktif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status || "aktif"}
                      </span>
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">{item.dibuat_oleh || "-"}</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal("edit", item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-300 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1} sampai {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
            {filteredData.length} data
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              ‹
            </button>
            <span className="text-sm">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>

     {/* Modal Buat/Edit Pembukuan */}
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {modalMode === "add" ? "Buat Pembukuan Keuangan" : "Edit Pembukuan Keuangan"}
        </h2>
        <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">

        {/* Lokasi RT/RW */}
        {userData && (
          <p className="mb-2 text-sm text-gray-600">
            RT {userData.rt} RW {userData.rw} Kelurahan {userData.kelurahan} 
            Kecamatan {userData.kecamatan} - Kab/Kota {userData.kabupaten_kota}
          </p>
        )}

        {/* 1. Tanggal */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Tanggal</label>
          <input
            type="date"
            value={formData.tanggal}
            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        {/* 2. Pembukuan (Kas RT/PKK) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Pembukuan</label>
          <div className="flex gap-6 mt-2">
            {["KAS RT", "KAS PKK"].map((kas) => (
              <label key={kas} className="flex items-center">
                <input
                  type="radio"
                  value={kas}
                  checked={formData.kas_type === kas}
                  onChange={(e) => setFormData({ ...formData, kas_type: e.target.value })}
                  disabled={
                    (kas === "KAS RT" && userData?.jabatan?.toLowerCase().includes("bendahara pkk")) ||
                    (kas === "KAS PKK" && userData?.jabatan?.toLowerCase().includes("bendahara rt"))
                  }
                  className="mr-2"
                />
                {kas}
              </label>
            ))}
          </div>
        </div>

        {/* 3. Jenis Pembukuan */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Jenis Pembukuan</label>
          <div className="flex gap-6 mt-2">
            {["Penerimaan", "Pengeluaran", "Mutasi Anggaran"].map((jenis) => (
              <label key={jenis} className="flex items-center">
                <input
                  type="radio"
                  value={jenis}
                  checked={formData.jenis_pembukuan === jenis}
                  onChange={(e) => setFormData({ ...formData, jenis_pembukuan: e.target.value })}
                  className="mr-2"
                />
                {jenis}
              </label>
            ))}
          </div>
        </div>

        {/* 4. Rekening Asal */}
        <select
  value={formData.id_sub_rekening_asal}
  onChange={(e) =>
    setFormData({ ...formData, id_sub_rekening_asal: e.target.value })
  }
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  required
>
  <option value="">-- Pilih Sub Rekening Asal --</option>
  {subRekeningKegiatanData
    .filter((sr) => sr.pembukuan === (formData.kas_type === "KAS RT" ? "RT" : "PKK")) // filter sesuai Kas RT/PKK
    .map((sr) => (
      <option key={sr.id} value={sr.id}>
        {sr.sub_rekening_kegiatan}
      </option>
    ))}
</select>



        {/* 5. Rekening Tujuan (hanya Mutasi) */}
        {formData.jenis_pembukuan === "Mutasi Anggaran" && (
  <select
    value={formData.id_sub_rekening_tujuan}
    onChange={(e) => setFormData({ ...formData, id_sub_rekening_tujuan: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    required
  >
    <option value="">-- Pilih Sub Rekening Tujuan --</option>
    {subRekeningKegiatanData
      .filter((sr) =>
        sr.pembukuan === (formData.kas_type === "KAS RT" ? "RT" : "PKK") &&
        sr.id !== formData.id_sub_rekening_asal
      )
      .map((sr) => (
        <option key={sr.id} value={sr.id}>
          {sr.sub_rekening_kegiatan}
        </option>
      ))}
  </select>
)}

        {/* 6. Jumlah + Terbilang */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Jumlah</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp.</span>
            <input
              type="text"
              value={formData.jumlah}
              onChange={(e) => {
                const formatted = formatCurrencyInput(e.target.value)
                const num = Number(String(formatted).replace(/\s/g, "")) || 0
                setFormData({
                  ...formData,
                  jumlah: formatted,
                  terbilang: toTerbilang(num),
                })
              }}
              className="w-full pl-12 pr-3 py-2 border rounded-md"
              placeholder="999 999 999"
              required
            />
          </div>
          {formData.terbilang && (
            <p className="mt-1 text-sm text-gray-600">Terbilang: {formData.terbilang}</p>
          )}
          {formData.jenis_pembukuan === "Mutasi Anggaran" && (
            <p className="mt-1 text-xs text-red-500">
              * Tidak boleh lebih besar dari saldo rekening asal
            </p>
          )}
        </div>

        {/* 7. Uraian (auto) */}
        {formData.jenis_pembukuan === "Mutasi Anggaran" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Uraian</label>
            <input
              type="text"
              readOnly
              className="w-full px-3 py-2 border rounded-md text-green-600 font-semibold"
              value={
                formData.id_sub_rekening_asal && formData.id_sub_rekening_tujuan
                  ? `Mutasi Anggaran dari ${
                      subRekeningKegiatanData.find(s => s.id === formData.id_sub_rekening_asal)?.sub_rekening_kegiatan
                    } ke ${
                      subRekeningKegiatanData.find(s => s.id === formData.id_sub_rekening_tujuan)?.sub_rekening_kegiatan
                    }`
                  : ""
              }
            />
          </div>
        )}

        {/* 8. Dibukukan oleh */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Dibukukan oleh</label>
          <p>Nama: {userData?.nama}</p>
          <p>Jabatan: {userData?.jabatan || userData?.level}</p>
          <p>ID User: {userData?.id}</p>
        </div>

        {/* Tombol */}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={handleCloseModal} className="px-4 py-2 border rounded-md">
            BATAL
          </button>
          <button
            type="submit"
            disabled={loading || (formData.jenis_pembukuan === "Mutasi Anggaran" && Number(formData.jumlah.replace(/\D/g, "")) > getSaldoRekening(formData.id_sub_rekening_asal))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            {loading ? "Menyimpan..." : "SIMPAN"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


    </div>
  )
}

export default PembukaanPage
