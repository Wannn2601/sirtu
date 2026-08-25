"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import Swal from "sweetalert2"
import { firestoreService } from "../../services/firebase"

const IURKuPage = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedPayments, setSelectedPayments] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [wargaData, setWargaData] = useState([])
  const [iurPaymentsData, setIurPaymentsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState({ nama: "Admin", level_user: "superadmin" })
   const [iurRates, setIurRates] = useState([])

  const months = [
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

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

  useEffect(() => {
    loadWargaData()
    loadIurPaymentsData()
  }, [])

// Load KK Data
const loadWargaData = async () => {
  try {
    setLoading(true)
    const data = await firestoreService.getAll("kkData")
    setWargaData(data || [])
  } catch (error) {
    console.error("Error loading kkData:", error)
    Swal.fire("Error", "Gagal memuat data KK", "error")
  } finally {
    setLoading(false)
  }
}

// Ambil nominal iuran dari iurRates sesuai bulan & tahun
const getNominalForMonth = (month, year) => {
  const monthIndex = months.indexOf(month.toLowerCase()) + 1 // konversi nama bulan → angka (1-12)
  const key = `${monthIndex}-${year}` // contoh: "9-2025"

  const rate = iurRates.find((r) => r.bulan_berlaku === key)
  return rate ? rate.besaran_iuran : 0
}


// Load Tarif Iuran
const loadIurRates = async () => {
  try {
    const data = await firestoreService.getAll("iurRates")
    setIurRates(data || [])
  } catch (error) {
    console.error("Error loading iurRates:", error)
  }
}

useEffect(() => {
  loadWargaData()
  loadIurRates()
}, [])



  const loadIurPaymentsData = async () => {
    try {
      const data = await firestoreService.getAll("iurPayments")
      console.log("[v0] Loaded IUR payments data:", data)
      setIurPaymentsData(data || [])
    } catch (error) {
      console.error("[v0] Error loading IUR payments:", error)
    }
  }

  // Helper untuk format alamat agar tidak keluar "undefined"
const formatAlamat = (data) => {
  const alamat = data.alamat || ""
  const noRumah = data.no_rumah ? `No. ${data.no_rumah}` : ""

  if (!alamat && !noRumah) return "-"
  return [alamat, noRumah].filter(Boolean).join(" | ")
}




  const createIurRecordsFromCitizens = async (citizenData) => {
    try {
      const existingIurData = await firestoreService.getAll("iurPayments")
      const existingIds = new Set(existingIurData.map((item) => item.warga_id))

      const newIurRecords = []

      for (const citizen of citizenData) {
        if (!existingIds.has(citizen.id_warga)) {
          // Create payment structure for all months
          const payments = {}
          months.forEach((month) => {
            payments[month] = {
              amount: 0, // Default IUR amount
              status: "belum_bayar",
              tanggal_bayar: null,
            }
          })

          newIurRecords.push({
  warga_id: citizen.id_warga,
  nama_kk: citizen.nama_kepala_keluarga || citizen.nama,
  alamat: `${citizen.alamat_tinggal || citizen.alamat_lain} | Blok ${citizen.blok_hunian || "-"} | No. ${citizen.nomor_rumah || "-"}`,
  tahun: selectedYear,
  payments: payments,
  createdAt: new Date(),
  updatedAt: new Date(),
})


        }
      }

      // Save new IUR records to Firestore
      for (const record of newIurRecords) {
        await firestoreService.add("iurPayments", record)
      }

      if (newIurRecords.length > 0) {
        console.log(`[v0] Created ${newIurRecords.length} new IUR payment records`)
        await loadIurPaymentsData() // Reload IUR payments data
      }
    } catch (error) {
      console.error("[v0] Error creating IUR records from citizens:", error)
    }
  }

const updateIurPayment = async (rowId, month, paymentData) => {
  try {
    const nominal = getNominalForMonth(month, selectedYear)

    const updateData = {
      [`payments.${month}.amount`]: nominal,
      [`payments.${month}.status`]: paymentData.status,
      [`payments.${month}.tanggal_bayar`]: paymentData.tanggal_bayar,
      updatedAt: new Date(),
    }

    await firestoreService.update("kkData", rowId, updateData)

    setWargaData((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
              ...item,
              payments: {
                ...item.payments,
                [month]: {
                  amount: nominal,
                  ...paymentData,
                },
              },
            }
          : item
      )
    )
  } catch (error) {
    console.error("Error updating payment:", error)
    Swal.fire("Error", "Gagal update pembayaran", "error")
  }
}





const filteredData = useMemo(() => {
  if (!wargaData || !Array.isArray(wargaData)) return []

  return wargaData.map((warga) => {
  const defaultPayments = {}
  months.forEach((month) => {
    defaultPayments[month] = {
      amount: getNominalForMonth(month, selectedYear),
      status: "belum_bayar",
      tanggal_bayar: null,
    }
  })

  return {
    id: warga.id,
    nama_kk: warga.nama_kepala_keluarga || warga.nama,
alamat: formatAlamat(warga),
    tahun: selectedYear,
    payments: warga.payments || defaultPayments,
  }
})
.filter(
    (item) =>
      item.nama_kk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alamat?.toLowerCase().includes(searchTerm.toLowerCase())
  )
}, [wargaData, iurRates, selectedYear, searchTerm])


  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const handleCheckboxChange = (rowId, month, isChecked) => {
    const paymentKey = `${rowId}-${month}`
    const newSelected = new Set(selectedPayments)

    if (isChecked) {
      newSelected.add(paymentKey)
    } else {
      newSelected.delete(paymentKey)
    }

    setSelectedPayments(newSelected)
  }

  const handleRightClick = (event, rowId, month, payment) => {
    event.preventDefault()

    if (payment.status === "lunas") {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        rowId,
        month,
        payment,
      })
    }
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleBatchPayment = async () => {
    if (selectedPayments.size === 0) return

    const result = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      text: `Apakah Anda yakin ingin memproses ${selectedPayments.size} pembayaran yang dipilih?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Bayar",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    })

    if (result.isConfirmed) {
      const currentDate = new Date().toISOString().split("T")[0]
      const paymentArray = Array.from(selectedPayments)

      let successCount = 0
      let errorCount = 0

      try {
        await Promise.all(
          paymentArray.map(async (paymentKey, i) => {
            // ambil rowId & month dengan aman
            const idx = paymentKey.lastIndexOf("-")
            const rowId = paymentKey.substring(0, idx)
            const month = paymentKey.substring(idx + 1)

            console.log(`[v0] Processing payment ${i + 1}/${paymentArray.length}:`, rowId, month)

            try {
              await updateIurPayment(rowId, month, {
                status: "lunas",
                tanggal_bayar: currentDate,
              })
              successCount++
              console.log(`[v0] Successfully updated payment ${i + 1}:`, rowId, month)
            } catch (error) {
              errorCount++
              console.error(`[v0] Error updating payment ${i + 1}:`, error)
            }
          }),
        )

        setSelectedPayments(new Set())

        if (errorCount === 0) {
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: `${successCount} pembayaran berhasil diproses!`,
            timer: 2000,
            showConfirmButton: false,
          })
        } else {
          Swal.fire({
            icon: "warning",
            title: "Sebagian Berhasil",
            text: `${successCount} pembayaran berhasil, ${errorCount} gagal diproses.`,
            confirmButtonText: "OK",
          })
        }

        await loadIurPaymentsData()
      } catch (error) {
        console.error("[v0] Batch payment error:", error)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Terjadi kesalahan saat memproses batch pembayaran.",
        })
      }
    }
  }

  const handleCancelPayment = (rowId, month) => {
    const row = filteredData.find((item) => item.id === rowId)
    if (!row) return

    const currentMonthIndex = months.indexOf(month)
    const currentDate = new Date()
    const currentRealMonthIndex = currentDate.getMonth()

    const userRole = user?.level_user?.toLowerCase() || ""
    const canCancelDirectly = userRole === "pak rt" || userRole === "superadmin"

    const hasLaterPayments = months.slice(currentRealMonthIndex + 1).some((laterMonth) => {
      const laterMonthIndex = months.indexOf(laterMonth)
      return laterMonthIndex > currentMonthIndex && row.payments[laterMonth]?.status === "lunas"
    })

    if (hasLaterPayments) {
      Swal.fire({
        icon: "error",
        title: "Tidak Dapat Dibatalkan",
        text: "Tidak bisa dibatalkan jika bulan setelah bulan berjalan yang dipilih status bayar lunas",
        confirmButtonText: "OK",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
      closeContextMenu()
      return
    }

    if (!canCancelDirectly) {
      const isApprovedByAuthorizedRole =
        row.payments[month]?.approved_by_rt || row.payments[month]?.approved_by_superadmin

      if (!isApprovedByAuthorizedRole) {
        Swal.fire({
          icon: "error",
          title: "Tidak Dapat Dibatalkan",
          text: "Bendahara dan role lainnya tidak bisa membatalkan pembayaran kecuali sudah di-approve oleh Pak RT atau Superadmin",
          confirmButtonText: "OK",
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        })
        closeContextMenu()
        return
      }
    }

    const roleText = canCancelDirectly
      ? "Anda memiliki akses untuk membatalkan pembayaran ini."
      : "Pembayaran ini sudah di-approve untuk dibatalkan."

    Swal.fire({
      title: "Konfirmasi Batal Bayar",
      html: `
        <p>Apakah Anda yakin ingin membatalkan pembayaran bulan ${month}?</p>
        <p class="text-sm text-gray-600 mt-2">${roleText}</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Batal Bayar",
      cancelButtonText: "Tidak",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        updateIurPayment(rowId, month, {
          status: "belum_bayar",
          tanggal_bayar: null,
          cancelled_by: user?.nama || "Unknown",
          cancelled_at: new Date().toISOString(),
        })

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pembayaran berhasil dibatalkan!",
          timer: 2000,
          showConfirmButton: false,
        })
      }
      closeContextMenu()
    })
  }

  const getCellStyle = (payment) => {
    if (payment.status === "lunas") {
      return "bg-green-500 text-white border-green-600"
    } else {
      return "bg-red-50 text-red-600 border-red-200"
    }
  }

  const selectedTotal = useMemo(() => {
    let total = 0
    selectedPayments.forEach((paymentKey) => {
      const [rowId, month] = paymentKey.split("-")
      const row = filteredData.find((item) => item.id === rowId)
      if (row && row.payments[month]) {
        total += row.payments[month].amount
      }
    })
    return total
  }, [selectedPayments, filteredData])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pembayaran iuran...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IUR-Ku</h1>
          <p className="text-gray-600">Kelola pembayaran iuran warga</p>
        </div>
        <div className="flex gap-2">
          {/* <button
            onClick={addDummyData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Kirim Data Dummy
          </button> */}
          {selectedPayments.size > 0 && (
            <button
              onClick={handleBatchPayment}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Bayar ({selectedPayments.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Buku</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari Data</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nama KK atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">
            <strong>Catatan:</strong> Penetapan secara sistem setiap pukul 00.01 setiap bulan sesuai tarif IUR yang
            berlaku.
          </p>
          <p className="text-red-600 text-sm mt-1">
            <strong>Rumus penetapan:</strong> {"{iur_berlaku}"} - (keringanan % x {"{iur_berlaku}"})
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <p className="text-blue-800 font-medium mb-2">Cara Pembayaran:</p>
          <p className="text-blue-700 mb-1">
            <strong>Pilih Pembayaran:</strong> Centang kotak pada bulan yang ingin dibayar
          </p>
          <p className="text-blue-700 mb-1">
            <strong>Proses Pembayaran:</strong> Klik tombol "Bayar" yang muncul di atas tabel
          </p>
          <p className="text-blue-700 mb-1">
            <strong>Batal Bayar:</strong> Klik kanan pada pembayaran yang sudah lunas untuk membatalkan
          </p>
          <p className="text-blue-700 text-xs mt-2 italic">
            *Pembayaran yang sudah lunas akan berwarna hijau dan tidak dapat dipilih lagi
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
          <p className="text-yellow-800 font-medium mb-2">Aturan Pembatalan Pembayaran:</p>
          <p className="text-yellow-700 mb-1">
            • Tidak bisa dibatalkan jika bulan setelah bulan berjalan yang dipilih status bayar lunas
          </p>
          <p className="text-yellow-700 mb-1">• Pembatalan harus satu per satu, tidak boleh langsung banyak</p>
          <p className="text-yellow-700 mb-1">• Pak RT dan Superadmin dapat membatalkan pembayaran langsung</p>
          <p className="text-yellow-700 text-xs mt-2 italic">
            *Bendahara dan role lainnya hanya bisa membatalkan jika sudah di-approve oleh Pak RT atau Superadmin
          </p>
        </div> */}

        {selectedPayments.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-green-600 text-sm">
              <strong>Total yang dipilih:</strong> Rp {selectedTotal.toLocaleString("id-ID")} ({selectedPayments.size}{" "}
              pembayaran)
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {selectedPayments.size > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-end">
            <button
              onClick={handleBatchPayment}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
            >
              Bayar ({selectedPayments.size}) - Rp {selectedTotal.toLocaleString("id-ID")}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  Nama KK
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  Alamat
                </th>
                <th
                  colSpan={12}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  Bulan
                </th>
              </tr>
              <tr>
                {monthNames.map((month) => (
                  <th
                    key={month}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedData.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{startIndex + index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{row.nama_kk}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{row.alamat}</td>
                  {months.map((month) => {
                    // ambil data pembayaran bulan ini, kalau tidak ada → fallback
                    const payment = row.payments?.[month] ?? { amount: 0, status: "belum_bayar" }
                    const paymentKey = `${row.id}-${month}`
                    const isSelected = selectedPayments.has(paymentKey)
                    const isPaid = payment.status === "lunas"

                    // ✅ tampilkan amount apa adanya dari Firestore
                    const displayAmount = payment.amount ?? 0

                    return (
                      <td
                        key={month}
                        className={`px-2 py-3 text-center text-xs border border-gray-300 relative ${getCellStyle(payment)}`}
                        onContextMenu={(e) => handleRightClick(e, row.id, month, payment)}
                      >
                        <div className="relative">
                          {/* checkbox muncul hanya kalau belum bayar */}
                          {!isPaid && (
                            <div className="flex justify-center mb-1">
  <input
    type="checkbox"
    checked={isSelected}
    onChange={(e) => handleCheckboxChange(row.id, month, e.target.checked)}
    onClick={(e) => e.stopPropagation()}
    title="Pilih untuk pembayaran"
    className={`
      w-5 h-5 cursor-pointer
      appearance-none
      border-2 border-gray-400 rounded-full bg-white
      checked:bg-blue-600 checked:border-blue-600
      hover:border-blue-500
      focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
      transition-colors
    `}
  />
</div>


                          )}

                          {/* nominal iuran */}
                          <div className={`font-medium ${isPaid ? "text-white" : ""}`}>
                            Rp {displayAmount.toLocaleString("id-ID")}
                          </div>

                          {/* kalau sudah lunas + ada tanggal_bayar, tampilkan tanggal */}
                          {isPaid && payment.tanggal_bayar && (
                            <div className="text-xs mt-1 text-white opacity-90">
                              {new Date(payment.tanggal_bayar).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number.parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Menampilkan {startIndex + 1} sampai {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
              {filteredData.length} data
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              onClick={() => handleCancelPayment(contextMenu.rowId, contextMenu.month)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
            >
              Batal Bayar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default IURKuPage
