"use client"

import { useState, useEffect, useMemo } from "react"
import { firestoreService } from "../../services/firebase"

const IuranWargaPage = () => {
  const [iurPaymentsData, setIurPaymentsData] = useState([])
  const [wargaData, setWargaData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportType, setReportType] = useState("keseluruhan")
  const [selectedWarga, setSelectedWarga] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [iurRates, setIurRates] = useState([])

const loadIurRates = async () => {
  try {
    const rates = await firestoreService.getAll("iurRates")
    setIurRates(rates || [])
  } catch (err) {
    console.error("Error loading iurRates:", err)
  }
}

useEffect(() => {
  loadIuranWargaData()
  loadIurRates()
}, [])

const getNominalForMonth = (monthKey, year) => {
  const monthIndex = monthKeys.indexOf(monthKey) + 1 // 1-12
  const key = `${monthIndex}-${year}`               // contoh: "9-2025"

  const rate = iurRates.find((r) => r.bulan_berlaku === key)
  return rate ? rate.besaran_iuran : 0
}



  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agustus", "Sept", "Okt", "Nov", "Des"]

  const monthKeys = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
  ]

  const loadIuranWargaData = async () => {
  try {
    setLoading(true)
    const kkResult = await firestoreService.getAll("kkData")
    setWargaData(kkResult || [])
  } catch (error) {
    console.error("Error loading kkData:", error)
  } finally {
    setLoading(false)
  }

}
const formatAlamat = (data) => {
  const alamat = data.alamat || ""
  const noRumah = data.no_rumah ? `No. ${data.no_rumah}` : ""

  if (!alamat && !noRumah) return "-"
  return [alamat, noRumah].filter(Boolean).join(" | ")
}



  useEffect(() => {
    window.scrollTo(0, 0)
    loadIuranWargaData()
  }, [])

  const combinedData = useMemo(() => {
  if (!wargaData || !Array.isArray(wargaData)) {
    return []
  }

  return wargaData.map((warga) => {
    const payments = warga.payments || {}

    // kalau kkData belum punya payments, kasih default amount 0
    const defaultPayments = {}
monthKeys.forEach((monthKey) => {
  defaultPayments[monthKey] = payments[monthKey] || {
    amount: getNominalForMonth(monthKey, selectedYear),  // ✅ ambil tarif
    status: "belum_bayar",
    tanggal_bayar: null,
  }
})


    return {
      id: warga.id,
      nama_kk: warga.nama_kepala_keluarga || warga.nama,
alamat: formatAlamat(warga),
      tahun: selectedYear,
      payments: defaultPayments,
    }
  })
}, [wargaData, selectedYear])


  const enrichData = useMemo(() => {
  return combinedData.map((item) => {
    let totalTunggakan = 0
    let totalPembebasan = 0

    monthKeys.forEach((monthKey) => {
  const nominal = getNominalForMonth(monthKey, selectedYear)
  const payment = item.payments?.[monthKey]

  if (payment?.status === "lunas") {
    totalPembebasan += nominal
  } else {
    totalTunggakan += nominal
  }
})

    return {
      ...item,
      total_tunggakan: totalTunggakan,
      pembebasan: totalPembebasan,
    }
  })
}, [combinedData, iurRates, selectedYear])


  // Filter data sesuai tahun, pencarian, dan jenis laporan
  const filteredData = enrichData.filter((item) => {
    const matchesSearch =
      item.nama_kk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alamat.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWarga = reportType === "keseluruhan" || item.nama_kk === selectedWarga
    return matchesSearch && matchesWarga
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const wargaNames = [...new Set(enrichData.map((item) => item.nama_kk))]

  // Formatter
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  

  const getPaymentStatus = (payment) => {
    if (payment.status === "lunas") return "bg-green-100 text-green-800"
    if (payment.status === "belum_bayar") return "bg-red-100 text-red-800"
    if (payment.status === "bebas") return "bg-gray-100 text-gray-600"
    return ""
  }

  // Tabel keseluruhan
  const renderKeseluruhanTable = () => (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold">LAPORAN IURAN WAJIB WARGA TAHUN {selectedYear}</h2>
        <h3 className="text-base font-semibold">RT 05 RW 08 KELURAHAN PADANGSARI</h3>
        <p className="text-sm">Per: {new Date().toLocaleDateString("id-ID")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                NO
              </th>
              <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                Nama KK
              </th>
              <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                Alamat
              </th>
              <th colSpan={12} className="border border-gray-300 px-4 py-2 bg-blue-50 text-center">
                Bulan
              </th>
              <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                Jml
                <br />
                Tunggakan
              </th>
              <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                Pembebasan
              </th>
            </tr>
            <tr>
              {months.map((month) => (
                <th key={month} className="border border-gray-300 px-2 py-1 bg-blue-50 text-xs">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-4 py-2 text-center">{startIndex + index + 1}</td>
                <td className="border border-gray-300 px-4 py-2">{item.nama_kk}</td>
                <td className="border border-gray-300 px-4 py-2">{item.alamat}</td>
                {monthKeys.map((monthKey) => {
                  const payment = item.payments?.[monthKey] || { status: "belum_bayar" }
                  return (
                    <td
                      key={monthKey}
                      className={`border border-gray-300 px-2 py-1 text-center text-xs ${getPaymentStatus(payment)}`}
                    >
                      {payment.status === "lunas" ? "✓" : payment.status === "bebas" ? "-" : "X"}
                    </td>
                  )
                })}
                <td className="border border-gray-300 px-4 py-2 text-right text-red-600 font-semibold">
                  {formatCurrency(item.total_tunggakan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-gray-600">
                  {formatCurrency(item.pembebasan)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda tangan */}
        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p>
              Semarang,{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1">Bendahara</p>
            <div className="mt-16 border-b border-gray-400 w-48"></div>
            <p className="mt-2">(nama_bendahara_berlaku)</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Tabel per warga
  const renderPerWargaTable = () => {
    const selectedWargaData = filteredData.find((item) => item.nama_kk === selectedWarga)
    if (!selectedWargaData) return <p className="text-center py-8">Pilih nama warga terlebih dahulu</p>

    return (
      <div>
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">LAPORAN IURAN WAJIB WARGA</h2>
          <h3 className="text-base font-semibold">RT 05 RW 08 KELURAHAN PADANGSARI</h3>
          <p className="text-sm">Per: {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        <div className="mb-4">
          <p>
            <strong>Nama Kepala Keluarga:</strong> {selectedWargaData.nama_kk}
          </p>
          <p>
            <strong>Alamat:</strong> {selectedWargaData.alamat}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                  NO
                </th>
                <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                  Tahun
                </th>
                <th colSpan={12} className="border border-gray-300 px-4 py-2 bg-blue-50 text-center">
                  Bulan
                </th>
                <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                  Jml
                  <br />
                  Tunggakan
                </th>
                <th rowSpan={2} className="border border-gray-300 px-4 py-2 bg-gray-50">
                  Pembebasan
                </th>
              </tr>
              <tr>
                {months.map((month) => (
                  <th key={month} className="border border-gray-300 px-2 py-1 bg-blue-50 text-xs">
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                <td className="border border-gray-300 px-4 py-2">{selectedWargaData.tahun}</td>
                {monthKeys.map((monthKey) => {
                  const payment = selectedWargaData.payments?.[monthKey] || { status: "belum_bayar" }
                  return (
                    <td
                      key={monthKey}
                      className={`border border-gray-300 px-2 py-1 text-center text-xs ${getPaymentStatus(payment)}`}
                    >
                      {payment.status === "lunas" ? "✓" : payment.status === "bebas" ? "-" : "X"}
                    </td>
                  )
                })}
                <td className="border border-gray-300 px-4 py-2 text-right text-red-600 font-semibold">
                  {formatCurrency(selectedWargaData.total_tunggakan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-gray-600">
                  {formatCurrency(selectedWargaData.pembebasan)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Catatan */}
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <span className="text-red-600">Catatan:</span>
          </p>
          <p>✓ = Lunas (Hijau)</p>
          <p>X = Belum Bayar (Merah)</p>
          <p>- = Bebas (Abu)</p>
        </div>

        {/* Tanda tangan */}
        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p>
              Semarang,{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1">Bendahara</p>
            <div className="mt-16 border-b border-gray-400 w-48"></div>
            <p className="mt-2">(nama_bendahara_berlaku)</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Iuran Warga</h1>
        <p className="text-gray-600">Kelola laporan iuran warga</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading data...</p>
        </div>
      ) : (
        <>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Pelaporan</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value)
                  if (e.target.value === "keseluruhan") setSelectedWarga("")
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="keseluruhan">Keseluruhan Warga</option>
                <option value="per_warga">Per Warga</option>
              </select>
            </div>

            {reportType === "per_warga" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Warga</label>
                <select
                  value={selectedWarga}
                  onChange={(e) => setSelectedWarga(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Pilih Nama Warga</option>
                  {wargaNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Data</label>
              <input
                type="text"
                placeholder="Cari nama KK atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {reportType === "keseluruhan" && (
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number.parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

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
                  {currentPage} / {totalPages}
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
          )}

          {reportType === "keseluruhan" ? renderKeseluruhanTable() : renderPerWargaTable()}
        </>
      )}
    </div>
  )
}

export default IuranWargaPage
