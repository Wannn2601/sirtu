"use client"

import { useState, useEffect } from "react"
import { firestoreService } from "../../services/firebase"
import * as XLSX from "xlsx"
import Swal from "sweetalert2"

const KeuanganPage = () => {
  const [laporanKeuanganData, setLaporanKeuanganData] = useState([])
  const [rekeningKegiatanData, setRekeningKegiatanData] = useState([])
  const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState("01")
  const [selectedPembukuan, setSelectedPembukuan] = useState("keseluruhan")
  const [selectedJenisLaporan, setSelectedJenisLaporan] = useState("keseluruhan")
  const [selectedRekeningKegiatan, setSelectedRekeningKegiatan] = useState("keseluruhan")
  const [selectedSubRekeningKegiatan, setSelectedSubRekeningKegiatan] = useState("keseluruhan")
  const [selectedLaporanPer, setSelectedLaporanPer] = useState(new Date().toISOString().split("T")[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const loadAllData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading all financial data...")

      const [laporanData, rekeningData, subRekeningData] = await Promise.all([
  firestoreService.getAll("laporanKeuangan"),
  firestoreService.getAll("rekeningKegiatan"),
  firestoreService.getAll("subRekeningKegiatan"),
])

// 🔹 Gabungkan dengan default (hindari duplikat berdasarkan id)
const mergedRekening = [
  ...defaultRekenings.filter(def => !rekeningData.some(d => d.id === def.id)),
  ...rekeningData,
]

const mergedSubRekening = [
  ...defaultSubRekenings.filter(def => !subRekeningData.some(d => d.id === def.id)),
  ...subRekeningData,
]

// 🔹 Set ke state
setLaporanKeuanganData(laporanData)
setRekeningKegiatanData(mergedRekening)
setSubRekeningKegiatanData(mergedSubRekening)

    } catch (error) {
      console.error("[v0] Error loading financial data:", error)
    } finally {
      setLoading(false)
    }
  }
// 🔹 Definisi data default (sama dengan yang ada di BuatRekening & BuatSubRekening)
const defaultRekenings = [
  { id: "1", kelompok_pembukuan: "Kas", status: "aktif", is_locked: true },
]

const defaultSubRekenings = [
  { id: "1.1", sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu", pembukuan: "RT", id_kelompok: "1", is_locked: true },
  { id: "1.2", sub_rekening_kegiatan: "Iuran Wajib Warga", pembukuan: "RT", id_kelompok: "1", is_locked: true },
  { id: "2.1", sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu", pembukuan: "PKK", id_kelompok: "2", is_locked: true },
  { id: "2.2", sub_rekening_kegiatan: "Iuran Wajib PKK", pembukuan: "PKK", id_kelompok: "2", is_locked: true },
]

  const createDummyData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Creating dummy financial data...")

      // Clear existing data
      const collections = ["laporanKeuangan", "rekeningKegiatan", "subRekeningKegiatan"]
      for (const collection of collections) {
        const existingData = await firestoreService.getAll(collection)
        for (const item of existingData) {
          await firestoreService.delete(collection, item.id)
        }
      }

      // Create rekening kegiatan data
      const rekeningKegiatanDummy = [
        {
          kelompok_pembukuan: "RT",
          kepungurusan: "RT",
          kategori: "KAS_RT",
        },
        {
          kelompok_pembukuan: "PKK",
          kepungurusan: "PKK",
          kategori: "KAS_PKK",
        },
      ]

      const createdRekening = []
      for (const item of rekeningKegiatanDummy) {
        const created = await firestoreService.add("rekeningKegiatan", item)
        createdRekening.push(created)
      }

      // Create sub rekening kegiatan data
      const subRekeningDummy = [
        {
          id_kelompok: createdRekening[0].id,
          sub_rekening_kegiatan: "Iuran Warga RT",
        },
        {
          id_kelompok: createdRekening[0].id,
          sub_rekening_kegiatan: "Kegiatan Sosial RT",
        },
        {
          id_kelompok: createdRekening[1].id,
          sub_rekening_kegiatan: "Iuran PKK",
        },
        {
          id_kelompok: createdRekening[1].id,
          sub_rekening_kegiatan: "Kegiatan PKK",
        },
      ]

      for (const item of subRekeningDummy) {
        await firestoreService.add("subRekeningKegiatan", item)
      }

      // Create laporan keuangan data
      const laporanKeuanganDummy = [
        {
          tanggal: "2025-01-15",
          uraian: "Iuran Warga RT",
          detail: "Pembayaran iuran bulan Januari",
          saldo_bulan_lalu: 1000000,
          penerimaan: 500000,
          pengeluaran: 0,
          saldo_bulan_ini: 1500000,
          pembukuan: "RT",
          kategori: "kas_rt",
        },
        {
          tanggal: "2025-01-20",
          uraian: "Kegiatan Sosial RT",
          detail: "Bantuan untuk warga kurang mampu",
          saldo_bulan_lalu: 1500000,
          penerimaan: 0,
          pengeluaran: 200000,
          saldo_bulan_ini: 1300000,
          pembukuan: "RT",
          kategori: "kas_rt",
        },
        {
          tanggal: "2025-02-10",
          uraian: "Iuran PKK",
          detail: "Pembayaran iuran PKK bulan Februari",
          saldo_bulan_lalu: 800000,
          penerimaan: 300000,
          pengeluaran: 0,
          saldo_bulan_ini: 1100000,
          pembukuan: "PKK",
          kategori: "kas_pkk",
        },
        {
          tanggal: "2025-02-15",
          uraian: "Kegiatan PKK",
          detail: "Pelatihan keterampilan ibu-ibu",
          saldo_bulan_lalu: 1100000,
          penerimaan: 0,
          pengeluaran: 150000,
          saldo_bulan_ini: 950000,
          pembukuan: "PKK",
          kategori: "kas_pkk",
        },
      ]

      for (const item of laporanKeuanganDummy) {
        await firestoreService.add("laporanKeuangan", item)
      }

      console.log("[v0] Dummy financial data created successfully")
      await loadAllData()
    } catch (error) {
      console.error("[v0] Error creating dummy financial data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    loadAllData()
  }, [])

  
  

  const months = [
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

  const jenisLaporan = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "sesuai_urutan", label: "Sesuai Urutan" },
  ]

  const pembukaanOptions = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "rt", label: "RT" },
    { value: "pkk", label: "PKK" },
  ]

  const rekeningKegiatanOptions = [
    { value: "keseluruhan", label: "Keseluruhan" },
    ...rekeningKegiatanData.map((item) => ({
      value: item.id.toString(),
      label: item.kelompok_pembukuan,
    })),
  ]

  const subRekeningKegiatanOptions = [
    { value: "keseluruhan", label: "Keseluruhan" },
    ...subRekeningKegiatanData.map((item) => ({
      value: item.id.toString(),
      label: item.sub_rekening_kegiatan,
    })),
  ]

  const createHierarchicalData = () => {
    const hierarchical = []
    let aCounter = 1 // Counter for rekening kegiatan (A1, A2, etc.)
    let bCounter = 1 // Counter for sub rekening kegiatan (B1, B2, etc.)
    let cCounter = 1 // Counter for transactions (C1, C2, etc.)

    // Filter data based on selected filters
    let filteredLaporanData = laporanKeuanganData

    console.log("[v0] Original laporan data count:", laporanKeuanganData.length)
    console.log("[v0] Selected pembukuan:", selectedPembukuan)
    console.log("[v0] Sample laporan data:", laporanKeuanganData.slice(0, 3))

    // Apply year filter
    if (selectedYear) {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const itemYear = new Date(item.tanggal).getFullYear()
        return itemYear === selectedYear
      })
    }

    // Apply month filter
    if (selectedMonth !== "keseluruhan") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const itemMonth = new Date(item.tanggal).getMonth() + 1
        return itemMonth.toString().padStart(2, "0") === selectedMonth
      })
    }

    if (selectedPembukuan !== "keseluruhan") {
      console.log("[v0] Before pembukuan filter:", filteredLaporanData.length)
      filteredLaporanData = filteredLaporanData.filter((item) => {
        // Convert both values to uppercase for comparison
        const itemPembukuan = item.pembukuan?.toUpperCase()
        const selectedPembukaanUpper = selectedPembukuan.toUpperCase()
        const matches = itemPembukuan === selectedPembukaanUpper
        console.log("[v0] Item pembukuan:", item.pembukuan, "Selected:", selectedPembukuan, "Matches:", matches)
        return matches
      })
      console.log("[v0] After pembukuan filter:", filteredLaporanData.length)
    }

    let filteredRekeningData = rekeningKegiatanData
    if (selectedPembukuan !== "keseluruhan") {
      console.log("[v0] Original rekening data count:", rekeningKegiatanData.length)
      filteredRekeningData = rekeningKegiatanData.filter((item) => {
        // Check multiple possible field names for pembukuan matching
        const itemKepungurusan = item.kepungurusan?.toUpperCase()
        const itemKategori = item.kategori?.toUpperCase()
        const itemPembukuan = item.pembukuan?.toUpperCase()
        const selectedUpper = selectedPembukuan.toUpperCase()

        const matches =
          itemKepungurusan === selectedUpper ||
          itemKategori === selectedUpper ||
          itemPembukuan === selectedUpper ||
          (selectedUpper === "RT" && (itemKepungurusan === "KAS RT" || itemKategori === "KAS_RT")) ||
          (selectedUpper === "PKK" && (itemKepungurusan === "KAS PKK" || itemKategori === "KAS_PKK"))

        console.log(
          "[v0] Rekening item:",
          item.kelompok_pembukuan,
          "kepungurusan:",
          item.kepungurusan,
          "kategori:",
          item.kategori,
          "matches:",
          matches,
        )
        return matches
      })
      console.log("[v0] Filtered rekening data count:", filteredRekeningData.length)
    }

    // Apply rekening kegiatan filter
    if (selectedRekeningKegiatan !== "keseluruhan") {
      filteredRekeningData = filteredRekeningData.filter((item) => item.id.toString() === selectedRekeningKegiatan)
    }

    // Group sub rekening by main rekening
    filteredRekeningData.forEach((mainRekening) => {
      let filteredSubItems = subRekeningKegiatanData.filter((sub) => sub.id_kelompok === mainRekening.id)

      // Apply sub rekening kegiatan filter
      if (selectedSubRekeningKegiatan !== "keseluruhan") {
        filteredSubItems = filteredSubItems.filter((item) => item.id.toString() === selectedSubRekeningKegiatan)
      }

      if (filteredSubItems.length === 0) return

      if (selectedJenisLaporan === "keseluruhan") {
        // For keseluruhan: show rekening kegiatan, sub kegiatan, and transactions

        // Calculate totals for main category
        const mainTotals = filteredSubItems.reduce(
          (acc, sub) => {
            const relatedTransactions = filteredLaporanData.filter(
              (trans) => trans.uraian === sub.sub_rekening_kegiatan,
            )

            relatedTransactions.forEach((trans) => {
              acc.saldo_bulan_lalu += trans.saldo_bulan_lalu || 0
              acc.penerimaan += trans.penerimaan || 0
              acc.pengeluaran += trans.pengeluaran || 0
              acc.saldo_bulan_ini += trans.saldo_bulan_ini || 0
            })

            return acc
          },
          { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 },
        )

        const mainItem = {
          id: `main_${mainRekening.id}`,
          type: "main",
          rekening: "rekening kegiatan",
          uraian: `A${aCounter}. ${mainRekening.kelompok_pembukuan}`,
          saldo_bulan_lalu: mainTotals.saldo_bulan_lalu,
          penerimaan: mainTotals.penerimaan,
          pengeluaran: mainTotals.pengeluaran,
          saldo_bulan_ini: mainTotals.saldo_bulan_ini,
          children: [],
        }

        aCounter++

        // Add sub items with transactions
        filteredSubItems.forEach((subItem) => {
          // Add sub rekening kegiatan header
          const subTotals = filteredLaporanData
            .filter((trans) => trans.uraian === subItem.sub_rekening_kegiatan)
            .reduce(
              (acc, trans) => {
                acc.saldo_bulan_lalu += trans.saldo_bulan_lalu || 0
                acc.penerimaan += trans.penerimaan || 0
                acc.pengeluaran += trans.pengeluaran || 0
                acc.saldo_bulan_ini += trans.saldo_bulan_ini || 0
                return acc
              },
              { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 },
            )

          mainItem.children.push({
            id: `sub_header_${subItem.id}`,
            type: "sub_header",
            rekening: "",
            uraian: `B${bCounter}. ${subItem.sub_rekening_kegiatan}`,
            saldo_bulan_lalu: subTotals.saldo_bulan_lalu,
            penerimaan: subTotals.penerimaan,
            pengeluaran: subTotals.pengeluaran,
            saldo_bulan_ini: subTotals.saldo_bulan_ini,
          })

          bCounter++

          // Add individual transactions
          const transactions = filteredLaporanData.filter((trans) => trans.uraian === subItem.sub_rekening_kegiatan)
          transactions.forEach((trans) => {
            mainItem.children.push({
              id: `trans_${trans.id}`,
              type: "transaction",
              rekening: "",
              tanggal: trans.tanggal,
              uraian: `C${cCounter}. ${trans.detail || trans.keterangan || "Transaksi"}`,
              saldo_bulan_lalu: trans.saldo_bulan_lalu || 0,
              penerimaan: trans.penerimaan || 0,
              pengeluaran: trans.pengeluaran || 0,
              saldo_bulan_ini: trans.saldo_bulan_ini || 0,
              kategori: trans.kategori,
            })
            cCounter++
          })
        })

        hierarchical.push(mainItem)
      } else {
        // For sesuai urutan: show only rekening kegiatan and sub rekening kegiatan
        const mainTotals = filteredSubItems.reduce(
          (acc, sub) => {
            const relatedTransactions = filteredLaporanData.filter(
              (trans) => trans.uraian === sub.sub_rekening_kegiatan,
            )

            relatedTransactions.forEach((trans) => {
              acc.saldo_bulan_lalu += trans.saldo_bulan_lalu || 0
              acc.penerimaan += trans.penerimaan || 0
              acc.pengeluaran += trans.pengeluaran || 0
              acc.saldo_bulan_ini += trans.saldo_bulan_ini || 0
            })

            return acc
          },
          { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 },
        )

        const mainItem = {
          id: `main_${mainRekening.id}`,
          type: "main",
          rekening: "rekening kegiatan",
          uraian: `A${aCounter}. ${mainRekening.kelompok_pembukuan}`,
          saldo_bulan_lalu: mainTotals.saldo_bulan_lalu,
          penerimaan: mainTotals.penerimaan,
          pengeluaran: mainTotals.pengeluaran,
          saldo_bulan_ini: mainTotals.saldo_bulan_ini,
          children: [],
        }

        aCounter++

        // Add only sub rekening kegiatan (no individual transactions)
        filteredSubItems.forEach((subItem) => {
          const subTotals = filteredLaporanData
            .filter((trans) => trans.uraian === subItem.sub_rekening_kegiatan)
            .reduce(
              (acc, trans) => {
                acc.saldo_bulan_lalu += trans.saldo_bulan_lalu || 0
                acc.penerimaan += trans.penerimaan || 0
                acc.pengeluaran += trans.pengeluaran || 0
                acc.saldo_bulan_ini += trans.saldo_bulan_ini || 0
                return acc
              },
              { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 },
            )

          mainItem.children.push({
            id: `sub_${subItem.id}`,
            type: "sub",
            rekening: "",
            uraian: `B${bCounter}. ${subItem.sub_rekening_kegiatan}`,
            saldo_bulan_lalu: subTotals.saldo_bulan_lalu,
            penerimaan: subTotals.penerimaan,
            pengeluaran: subTotals.pengeluaran,
            saldo_bulan_ini: subTotals.saldo_bulan_ini,
          })
          bCounter++
        })

        hierarchical.push(mainItem)
      }
    })

    return hierarchical
  }

  const hierarchicalData = createHierarchicalData()

  const filteredData = hierarchicalData.filter((item) => {
    // Apply search filter
    const matchesSearch =
      item.uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rekening.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const flattenedData = []
  filteredData.forEach((mainItem) => {
    flattenedData.push(mainItem)
    if (mainItem.children) {
      mainItem.children.forEach((subItem) => {
        flattenedData.push(subItem)
      })
    }
  })

  const totalPages = Math.ceil(flattenedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = flattenedData.slice(startIndex, startIndex + itemsPerPage)

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

  const exportToExcel = async () => {
    const result = await Swal.fire({
      title: "Export ke Excel",
      text: "Apakah Anda yakin ingin mengexport data ke Excel?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    })

    if (!result.isConfirmed) return

    try {
      const exportData = []

      // Add header information
      exportData.push({
        Rekening: "LAPORAN KEUANGAN [JURNAL]",
        Tanggal: "",
        Uraian: "",
        "Saldo s.d. Bulan Lalu": "",
        Penerimaan: "",
        Pengeluaran: "",
        "Saldo s.d. Bulan Ini": "",
      })
      exportData.push({
        Rekening: "PENGURUS RT 05 RW 08 KELURAHAN PADANGSARI",
        Tanggal: "",
        Uraian: "",
        "Saldo s.d. Bulan Lalu": "",
        Penerimaan: "",
        Pengeluaran: "",
        "Saldo s.d. Bulan Ini": "",
      })
      exportData.push({
        Rekening: `Bulan Pelaporan: [${months.find((m) => m.value === selectedMonth)?.label}] [${selectedYear}]`,
        Tanggal: "",
        Uraian: "",
        "Saldo s.d. Bulan Lalu": "",
        Penerimaan: "",
        Pengeluaran: "",
        "Saldo s.d. Bulan Ini": "",
      })
      exportData.push({}) // Empty row

      // Add table headers
      const headers = {
        Rekening: "Rekening",
        Uraian: "Uraian",
        "Saldo s.d. Bulan Lalu": "Saldo s.d. Bulan Lalu",
        Penerimaan: "Penerimaan",
        Pengeluaran: "Pengeluaran",
        "Saldo s.d. Bulan Ini": "Saldo s.d. Bulan Ini",
      }

      if (selectedJenisLaporan === "keseluruhan") {
        headers.Tanggal = "Tanggal"
      }

      exportData.push(headers)

      // Add hierarchical data
      hierarchicalData.forEach((mainItem) => {
        const mainRow = {
          Rekening: mainItem.rekening,
          Uraian: mainItem.uraian,
          "Saldo s.d. Bulan Lalu": mainItem.saldo_bulan_lalu,
          Penerimaan: mainItem.penerimaan,
          Pengeluaran: mainItem.pengeluaran,
          "Saldo s.d. Bulan Ini": mainItem.saldo_bulan_ini,
        }

        if (selectedJenisLaporan === "keseluruhan") {
          mainRow.Tanggal = mainItem.tanggal ? formatDate(mainItem.tanggal) : ""
        }

        exportData.push(mainRow)

        // Add children with proper indentation
        if (mainItem.children) {
          mainItem.children.forEach((subItem) => {
            const subRow = {
              Rekening: "",
              Uraian: `  ${subItem.uraian}`, // Indentation with spaces
              "Saldo s.d. Bulan Lalu": subItem.saldo_bulan_lalu,
              Penerimaan: subItem.penerimaan,
              Pengeluaran: subItem.pengeluaran,
              "Saldo s.d. Bulan Ini": subItem.saldo_bulan_ini,
            }

            if (selectedJenisLaporan === "keseluruhan") {
              subRow.Tanggal = subItem.tanggal ? formatDate(subItem.tanggal) : ""
            }

            exportData.push(subRow)
          })
        }
      })

      // Add totals row
      const totalsRow = {
        Rekening: "",
        Uraian: "JUMLAH",
        "Saldo s.d. Bulan Lalu": "",
        Penerimaan: "",
        Pengeluaran: "",
        "Saldo s.d. Bulan Ini": totals.saldo_bulan_ini,
      }

      if (selectedJenisLaporan === "keseluruhan") {
        totalsRow.Tanggal = ""
      }

      exportData.push(totalsRow)

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan")
      XLSX.writeFile(
        wb,
        `Laporan_Keuangan_${months.find((m) => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`,
      )

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke Excel",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
    }
  }

  const exportToPDF = async () => {
    const result = await Swal.fire({
      title: "Export ke PDF",
      text: "Apakah Anda yakin ingin mengexport data ke PDF?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    })

    if (!result.isConfirmed) return

    try {
      const printWindow = window.open("", "_blank")

      // Prepare table data with hierarchical structure
      let tableRows = ""

      hierarchicalData.forEach((mainItem) => {
        const mainRowColor = selectedJenisLaporan === "keseluruhan" ? "background-color: #fef3c7;" : ""

        tableRows += `
          <tr style="${mainRowColor}">
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${mainItem.rekening}</td>
            ${selectedJenisLaporan === "keseluruhan" ? `<td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>` : ""}
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${mainItem.uraian}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(mainItem.saldo_bulan_lalu)}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(mainItem.penerimaan)}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(mainItem.pengeluaran)}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(mainItem.saldo_bulan_ini)}</td>
          </tr>
        `

        // Add children with indentation
        if (mainItem.children) {
          mainItem.children.forEach((subItem, subIndex) => {
            let subRowColor = ""
            if (selectedJenisLaporan === "keseluruhan") {
              if (subItem.kategori === "kas_rt") {
                subRowColor = "background-color: #fef3c7;"
              } else if (subItem.kategori === "kas_pkk") {
                subRowColor = "background-color: #dcfce7;"
              } else if (subItem.type === "transaction") {
                const colors = ["background-color: #fecaca;", "background-color: #dbeafe;"]
                subRowColor = colors[subIndex % colors.length]
              }
            }

            tableRows += `
              <tr style="${subRowColor}">
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
                ${selectedJenisLaporan === "keseluruhan" ? `<td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${subItem.tanggal ? formatDate(subItem.tanggal) : ""}</td>` : ""}
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px; padding-left: ${subItem.type === "transaction" ? "24px" : "12px"};">${subItem.uraian}</td>
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(subItem.saldo_bulan_lalu)}</td>
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(subItem.penerimaan)}</td>
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(subItem.pengeluaran)}</td>
                <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(subItem.saldo_bulan_ini)}</td>
              </tr>
            `
          })
        }
      })

      // Add totals row
      tableRows += `
        <tr style="background-color: #e5e7eb; font-weight: bold;">
          <td colspan="${selectedJenisLaporan === "keseluruhan" ? "6" : "5"}" style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;">JUMLAH</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(totals.saldo_bulan_ini)}</td>
        </tr>
      `

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laporan Keuangan</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h1 { font-size: 14px; margin: 5px 0; }
              .header h2 { font-size: 12px; margin: 5px 0; }
              .header p { font-size: 10px; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background-color: #f3f4f6; font-weight: bold; font-size: 10px; padding: 4px; border: 1px solid #000; text-align: center; }
              .signature { display: flex; justify-content: space-between; margin-top: 30px; }
              .signature div { font-size: 10px; }
              .signature-space { margin-top: 40px; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>LAPORAN KEUANGAN [JURNAL]</h1>
              <h2>PENGURUS RT 05 RW 08 KELURAHAN PADANGSARI</h2>
              <p>Bulan Pelaporan: [${months.find((m) => m.value === selectedMonth)?.label}] [${selectedYear}]</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Rekening</th>
                  ${selectedJenisLaporan === "keseluruhan" ? "<th>Tanggal</th>" : ""}
                  <th>Uraian</th>
                  <th>Saldo s.d.<br/>Bulan Lalu</th>
                  <th>Bulan Ini<br/>Penerimaan</th>
                  <th>Pengeluaran</th>
                  <th>Saldo s.d. Bulan Ini</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <div class="signature">
              <div>
                <p>Mengetahui,</p>
                <p>Ketua RT 05 RW 08 Kelurahan Padangsari</p>
                <div class="signature-space">
                  <p>[nama ketua RT]</p>
                </div>
              </div>
              <div style="text-align: right;">
                <p>Semarang, [tgl] [${selectedYear}]</p>
                <p>Bendahara</p>
                <div class="signature-space">
                  <p>[nama bendahara]</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke PDF",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
    }
  }

  const getRowColor = (item) => {
    if (selectedJenisLaporan !== "keseluruhan") {
      return ""
    }

    if (item.type === "main") {
      return "bg-blue-200" // rekening kegiatan
    } else if (item.type === "sub" || item.type === "sub_header") {
      return "bg-yellow-200" // sub rekening kegiatan
    }
    return "" // transaksi default tanpa warna
  }

  const calculateTotals = () => {
    return hierarchicalData.reduce(
      (totals, mainItem) => {
        totals.saldo_bulan_lalu += mainItem.saldo_bulan_lalu
        totals.penerimaan += mainItem.penerimaan
        totals.pengeluaran += mainItem.pengeluaran
        totals.saldo_bulan_ini += mainItem.saldo_bulan_ini
        return totals
      },
      { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 },
    )
  }

  const totals = calculateTotals()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
        <p className="text-gray-600">Kelola laporan keuangan RT</p>
      </div>

      {/* <div className="mb-6">
        <button
          onClick={createDummyData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Buat Data Dummy"}
        </button>
      </div> */}

      {loading ? (
        <div className="text-center py-8">
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Pembukuan</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Bulan Pelaporan</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pembukuan</label>
              <select
                value={selectedPembukuan}
                onChange={(e) => setSelectedPembukuan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pembukaanOptions.map((pembukuan) => (
                  <option key={pembukuan.value} value={pembukuan.value}>
                    {pembukuan.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Pelaporan</label>
              <select
                value={selectedJenisLaporan}
                onChange={(e) => setSelectedJenisLaporan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {jenisLaporan.map((jenis) => (
                  <option key={jenis.value} value={jenis.value}>
                    {jenis.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rekening Kegiatan</label>
              <select
                value={selectedRekeningKegiatan}
                onChange={(e) => setSelectedRekeningKegiatan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {rekeningKegiatanOptions.map((rekening) => (
                  <option key={rekening.value} value={rekening.value}>
                    {rekening.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sub Rekening Kegiatan</label>
              <select
                value={selectedSubRekeningKegiatan}
                onChange={(e) => setSelectedSubRekeningKegiatan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {subRekeningKegiatanOptions.map((subRekening) => (
                  <option key={subRekening.value} value={subRekening.value}>
                    {subRekening.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Laporan Per</label>
              <input
                type="date"
                value={selectedLaporanPer}
                onChange={(e) => setSelectedLaporanPer(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <span>📄</span>
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📊</span>
              Export Excel
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Cari data dalam tabel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table Controls */}
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
              Menampilkan {startIndex + 1} sampai {Math.min(startIndex + itemsPerPage, flattenedData.length)} dari{" "}
              {flattenedData.length} data
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

          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            {/* Report Header */}
            <div className="text-center py-4 border-b border-gray-300">
              <h2 className="text-lg font-bold">LAPORAN KEUANGAN [JURNAL]</h2>
              <h3 className="text-md font-semibold">PENGURUS RT 05 RW 08 KELURAHAN PADANGSARI</h3>
              <p className="text-sm">
                Bulan Pelaporan: [{months.find((m) => m.value === selectedMonth)?.label}] [{selectedYear}]
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Rekening</th>
                    {selectedJenisLaporan === "keseluruhan" && (
                      <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Tanggal</th>
                    )}
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Uraian</th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                      Saldo s.d.
                      <br />
                      Bulan Lalu
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                      Bulan Ini
                      <br />
                      Penerimaan
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">Pengeluaran</th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                      Saldo s.d. Bulan Ini
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={item.id} className={getRowColor(item)}>
                      <td className="border border-gray-400 px-3 py-2 text-sm">
                        {item.type === "main" ? item.rekening : ""}
                      </td>
                      {selectedJenisLaporan === "keseluruhan" && (
                        <td className="border border-gray-400 px-3 py-2 text-sm">
                          {item.tanggal ? formatDate(item.tanggal) : ""}
                        </td>
                      )}
                      <td
                        className={`border border-gray-400 px-3 py-2 text-sm ${
                          item.type === "sub" || item.type === "sub_header" ? "pl-8" : ""
                        } ${item.type === "transaction" ? "pl-16" : ""}`}
                      >
                        {item.uraian}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                        {formatCurrency(item.saldo_bulan_lalu)}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                        {formatCurrency(item.penerimaan)}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                        {formatCurrency(item.pengeluaran)}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">
                        {formatCurrency(item.saldo_bulan_ini)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 font-bold">
                    <td
                      colSpan={selectedJenisLaporan === "keseluruhan" ? "3" : "2"}
                      className="border border-gray-400 px-3 py-2 text-sm text-center"
                    >
                      JUMLAH
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(totals.saldo_bulan_lalu)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(totals.penerimaan)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(totals.pengeluaran)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(totals.saldo_bulan_ini)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-300">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm">Mengetahui,</p>
                  <p className="text-sm">Ketua RT 05 RW 08 Kelurahan Padangsari</p>
                  <div className="mt-12">
                    <p className="text-sm">[nama ketua RT]</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">Semarang, [tgl] [{selectedYear}]</p>
                  <p className="text-sm">Bendahara</p>
                  <div className="mt-12">
                    <p className="text-sm">[nama bendahara]</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default KeuanganPage
