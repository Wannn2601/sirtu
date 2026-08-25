"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  X,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react"
import Swal from "sweetalert2"
import { firestoreService } from "../../services/firebase"
import jsPDF from "jspdf"
import "jspdf-autotable"
// import jsPDF from "jspdf"
import { PDFDocument } from "pdf-lib" // 🧩 tambahan

import { useAppState } from "../../contexts/AppContext"

const PermohonanSuratPage = () => {
  const [permohonanList, setPermohonanList] = useState([])
  const [wargaList, setWargaList] = useState([])
  const [kkList, setKKList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPermohonan, setSelectedPermohonan] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Filter states
  const [filterKelurahan, setFilterKelurahan] = useState("Keseluruhan")
  const [filterRTRW, setFilterRTRW] = useState("Keseluruhan")
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())
  const [filterBulan, setFilterBulan] = useState("Keseluruhan")
  const [searchTerm, setSearchTerm] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    kota: "",
    kecamatan: "",
    kelurahan: "",
    rt: "",
    rw: "",
    pemohon: "",
    nama: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    kewarganegaraan: "",
    agama: "",
    jenis_kelamin: "",
    status: "",
    pendidikan_terakhir: "",
    pekerjaan: "",
    alamat: "",
    nik: "",
    keperluan: "",
    lampiran: null,
    status_permohonan: "Antrian layanan",
    tanggal_pengajuan: new Date().toISOString().split("T")[0],
  })

  const { state } = useAppState()
  const loggedInUser = state?.auth?.user || {}

  const userDefaults = useMemo(() => {
  const normalize = (key) => loggedInUser[key] || loggedInUser[key.toLowerCase()] || loggedInUser[key.toUpperCase()] || "";
  return {
    kota: normalize("kota") || normalize("kabupaten_kota"),
    kecamatan: normalize("kecamatan"),
    kelurahan: normalize("kelurahan"),
    rt: normalize("rt"),
    rw: normalize("rw"),
    pemohon: normalize("nama_pemilik_akun") || normalize("nama"),
  };
}, [loggedInUser]);

  useEffect(() => {
    loadData()
  }, [])

  // setelah loadData selesai, isi kelurahan, RT, RW secara otomatis
useEffect(() => {
  if (!loading && wargaList.length > 0 && kkList.length > 0 && loggedInUser) {
    // cari warga sesuai user login (by id / nik / nama)
    const wargaUser = wargaList.find(
      (w) =>
        w.userId === loggedInUser.id ||
        w.nik === loggedInUser.nik ||
        w.nama === loggedInUser.nama
    );
    if (!formData.kelurahan && (loggedInUser.Kelurahan || loggedInUser.kelurahan)) {
    setFormData((prev) => ({
      ...prev,
      kelurahan: loggedInUser.Kelurahan || loggedInUser.kelurahan,
    }));
  }

    if (wargaUser) {
      const kkUser = kkList.find((kk) => kk.no_kk === wargaUser.no_kk);

      // update kelurahan, rt, rw dari data KK
      setFormData((prev) => ({
        ...prev,
        kota:
          prev.kota ||
          loggedInUser.kota ||
          loggedInUser.kabupaten_kota ||
          "Semarang",
        kecamatan:
          prev.kecamatan || loggedInUser.kecamatan || "Semarang Utara",
        kelurahan: kkUser?.kelurahan || wargaUser.kelurahan || prev.kelurahan,
        rt: kkUser?.rt || wargaUser.rt || prev.rt,
        rw: kkUser?.rw || wargaUser.rw || prev.rw,
        pemohon:
          prev.pemohon ||
          loggedInUser.nama_pemilik_akun ||
          loggedInUser.nama ||
          "User",
      }));
    }
  }
}, [loading, wargaList, kkList, loggedInUser, formData.kelurahan]);


  const loadData = async () => {
    try {
      setLoading(true)
      const [permohonanData, wargaData, kkData] = await Promise.all([
        firestoreService.getAll("permohonanSurat"),
        firestoreService.getAll("wargaData"),
        firestoreService.getAll("kkData"),
      ])

      console.log("[v0] Loaded permohonan data:", permohonanData)
      setPermohonanList(permohonanData || [])
      setWargaList(wargaData || [])
      setKKList(kkData || [])
    } catch (error) {
      console.error("[v0] Error loading data:", error)
      Swal.fire("Error", "Gagal memuat data", "error")
    } finally {
      setLoading(false)
    }
  }

  const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

  // Get unique values for filters
  const kelurahanOptions = useMemo(() => {
    const unique = [...new Set(kkList.map((kk) => kk.kelurahan).filter(Boolean))]
    return ["Keseluruhan", ...unique]
  }, [kkList])

  const rtRwOptions = useMemo(() => {
    const unique = [...new Set(kkList.map((kk) => (kk.rt && kk.rw ? `${kk.rt}/${kk.rw}` : null)).filter(Boolean))]
    return ["Keseluruhan", ...unique]
  }, [kkList])

  const tahunOptions = useMemo(() => {
    const years = permohonanList.map((p) => new Date(p.tanggal_pengajuan).getFullYear())
    const unique = [...new Set(years)].sort((a, b) => b - a)
    return unique.length > 0 ? unique : [new Date().getFullYear()]
  }, [permohonanList])

  const bulanOptions = [
    "Keseluruhan",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]

  // Filter permohonan list
  const filteredPermohonan = useMemo(() => {
    return permohonanList.filter((permohonan) => {
      // Filter by kelurahan
      if (filterKelurahan !== "Keseluruhan" && permohonan.kelurahan !== filterKelurahan) {
        return false
      }

      // Filter by RT/RW
      if (filterRTRW !== "Keseluruhan") {
        const rtRw = `${permohonan.rt}/${permohonan.rw}`
        if (rtRw !== filterRTRW) return false
      }

      // Filter by tahun
      const tahunPermohonan = new Date(permohonan.tanggal_pengajuan).getFullYear().toString()
      if (tahunPermohonan !== filterTahun) return false

      // Filter by bulan
      if (filterBulan !== "Keseluruhan") {
        const bulanIndex = bulanOptions.indexOf(filterBulan) - 1
        const bulanPermohonan = new Date(permohonan.tanggal_pengajuan).getMonth()
        if (bulanPermohonan !== bulanIndex) return false
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          permohonan.nama?.toLowerCase().includes(search) ||
          permohonan.nik?.toLowerCase().includes(search) ||
          permohonan.keperluan?.toLowerCase().includes(search)
        )
      }

      return true
    })
  }, [permohonanList, filterKelurahan, filterRTRW, filterTahun, filterBulan, searchTerm])

  const handleOpenModal = (permohonan = null) => {
    if (permohonan) {
      setIsEditMode(true)
      setFormData({
        ...formData,
        ...permohonan,
      })
      setSelectedPermohonan(permohonan)
    } else {
      setIsEditMode(false)
      setFormData({
        kota: userDefaults.kota,
        kecamatan: userDefaults.kecamatan,
        kelurahan: userDefaults.kelurahan,
        rt: userDefaults.rt,
        rw: userDefaults.rw,
        pemohon: userDefaults.pemohon,
        nama: "",
        tempat_lahir: "",
        tanggal_lahir: "",
        kewarganegaraan: "WNI",
        agama: "",
        jenis_kelamin: "",
        status: "Belum Kawin",
        pendidikan_terakhir: "",
        pekerjaan: "",
        alamat: "",
        nik: "",
        keperluan: "",
        lampiran: null,
        status_permohonan: "Antrian layanan",
        tanggal_pengajuan: new Date().toISOString().split("T")[0],
      })
      setSelectedPermohonan(null)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setIsEditMode(false)
    setSelectedPermohonan(null)
  }

  const handleWargaSelect = (wargaId) => {
  const warga = wargaList.find((w) => w.id === wargaId)
  if (warga) {
    const kk = kkList.find((k) => k.no_kk === warga.no_kk)
    setFormData((prev) => ({
      ...prev,
      nama: warga.nama || "",
      tempat_lahir: warga.tempat_lahir || "",
      tanggal_lahir: warga.tanggal_lahir || "",
      kewarganegaraan: warga.kewarganegaraan || "WNI",
      agama: warga.agama || "",
      jenis_kelamin: warga.jenis_kelamin || "",
      status: warga.status_perkawinan || "Belum Kawin",
      pendidikan_terakhir: warga.pendidikan_terakhir || "",
      pekerjaan: warga.pekerjaan || "",
      alamat: kk?.alamat_tinggal || warga.alamat_tinggal || "",
      nik: warga.nik || "",
    }))
  }
}


  const handleSubmit = async (e) => {
  e.preventDefault()

  if (!formData.nama || !formData.nik || !formData.keperluan) {
    Swal.fire("Error", "Nama, NIK, dan Keperluan wajib diisi", "error")
    return
  }

  try {
    const dataToSave = {
      ...formData,
      createdByUserId: loggedInUser?.id || loggedInUser?.uid || loggedInUser?.username || null,
      updatedAt: new Date().toISOString(),
    }

    if (isEditMode && selectedPermohonan) {
      await firestoreService.update("permohonanSurat", selectedPermohonan.id, dataToSave)
      Swal.fire("Berhasil", "Permohonan berhasil diperbarui", "success")
    } else {
      dataToSave.createdAt = new Date().toISOString()
      await firestoreService.add("permohonanSurat", dataToSave)
      Swal.fire("Berhasil", "Permohonan berhasil ditambahkan", "success")
    }

    handleCloseModal()
    loadData()
  } catch (error) {
    console.error("[v0] Error saving permohonan:", error)
    Swal.fire("Error", "Gagal menyimpan permohonan", "error")
  }
}


  const handleDelete = async (permohonan) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus permohonan dari ${permohonan.nama}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        await firestoreService.delete("permohonanSurat", permohonan.id)
        Swal.fire("Berhasil", "Permohonan berhasil dihapus", "success")
        loadData()
      } catch (error) {
        console.error("[v0] Error deleting permohonan:", error)
        Swal.fire("Error", "Gagal menghapus permohonan", "error")
      }
    }
  }

  const handleUpdateStatus = async (permohonan, newStatus) => {
    try {
      await firestoreService.update("permohonanSurat", permohonan.id, {
        status_permohonan: newStatus,
        updatedAt: new Date().toISOString(),
      })
      Swal.fire("Berhasil", `Status diubah menjadi: ${newStatus}`, "success")
      loadData()
    } catch (error) {
      console.error("[v0] Error updating status:", error)
      Swal.fire("Error", "Gagal mengubah status", "error")
    }
  }

 

// ganti fungsi generatePDF lama dengan ini
const generatePDF = async (permohonan) => {
  // buat dokumen utama
  const doc = new jsPDF() // gunakan konfigurasi default seperti sebelumnya

  // ----- HEADER -----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("KOTA SEMARANG", 105, 20, { align: "center" })
  doc.setFontSize(12)
  doc.text(`KECAMATAN ${String(permohonan.kecamatan || "SEMARANG UTARA").toUpperCase()}`, 105, 28, { align: "center" })
  doc.text(`KELURAHAN ${String(permohonan.kelurahan || "SEMARANG").toUpperCase()}`, 105, 36, { align: "center" })

  doc.setFontSize(10)
  doc.text(`RT. ${permohonan.rt || "..." } / RW. ${permohonan.rw || "..."}`, 105, 44, { align: "center" })

  // garis pemisah
  doc.setLineWidth(0.5)
  doc.line(18, 48, 192, 48)

  // ----- Nomor / Lampiran / Hal (kiri)  dan tanggal (kanan) -----
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const leftX = 20
  const rightX = 150
  const topInfoY = 60
  doc.text("Nomor :", leftX, topInfoY)
  doc.text("Lampiran :", leftX, topInfoY + 6)
  doc.text("Hal :", leftX, topInfoY + 12)

  const currentDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  // Tanggal di kanan (align kanan supaya posisinya rapih)
  doc.text(`Semarang, ${currentDate}`, rightX, topInfoY, { align: "right" })

  // Kepada (tetap di kanan, sedikit ke bawah)
  const kepadaStartY = topInfoY + 18
  doc.text("Kepada Yth.", rightX, kepadaStartY, { align: "right" })
  doc.text(`Kepala Kelurahan ${permohonan.kelurahan || ""}`, rightX, kepadaStartY + 6, { align: "right" })
  doc.text(`Kecamatan ${permohonan.kecamatan || ""}`, rightX, kepadaStartY + 12, { align: "right" })
  doc.text("di", rightX, kepadaStartY + 18, { align: "right" })
  doc.setFont("helvetica", "bold")
  doc.text("SEMARANG", rightX, kepadaStartY + 24, { align: "right" })
  doc.setFont("helvetica", "normal")

  // ----- Bagian pembuka -----
  const pembukaY = topInfoY + 42
  doc.text("Bersama ini menerangkan bahwa :", leftX, pembukaY)

  // ----- Daftar info (1..10) dengan kolom: nomor+label | nilai -----
  const infoStartY = pembukaY + 10
  const numX = 22
  const labelX = 32
  const valueX = 95
  const pageRightMargin = 185
  const maxValueWidth = pageRightMargin - valueX // lebar area nilai
  let cursorY = infoStartY
  const lineHeight = 7.5

  const info = [
    { label: "Nama", value: permohonan.nama || "-" },
    { label: "Tempat / Tgl. Lahir", value: `${permohonan.tempat_lahir || "-"}, ${permohonan.tanggal_lahir || "-"}` },
    { label: "Kewarganegaraan/Agama", value: `${permohonan.kewarganegaraan || "-"} / ${permohonan.agama || "-"}` },
    { label: "Status", value: permohonan.status || "-" },
    { label: "Pendidikan terakhir", value: permohonan.pendidikan_terakhir || "-" },
    { label: "Pekerjaan", value: permohonan.pekerjaan || "-" },
    { label: "Alamat", value: permohonan.alamat || "-" },
    { label: "No. NIK", value: permohonan.nik || "-" },
    { label: "Keperluan", value: permohonan.keperluan || "-" },
    { label: "Keterangan lain-lain", value: "-" },
  ]

  // helper untuk menulis baris dengan wrapping pada kolom nilai
  for (let i = 0; i < info.length; i++) {
    const idx = i + 1
    const label = info[i].label
    const value = String(info[i].value || "-")

    // nomor dan label
    doc.text(`${idx}.`, numX, cursorY)
    doc.text(label, labelX, cursorY)

    // split value agar wrap sesuai kolom
    const splitValue = doc.splitTextToSize(value, maxValueWidth)
    doc.text(splitValue, valueX, cursorY)

    // naikkan cursor sesuai jumlah baris value (split)
    cursorY += splitValue.length * lineHeight
  }

  // penutup, tanda tangan
  const closingY = cursorY + 8
  doc.text("Demikian untuk menjadikan periksa dan guna seperlunya.", leftX, closingY)

  const signatureY = closingY + 20
  doc.text("Mengetahui", leftX, signatureY)
  doc.text(`Ketua RT. ${permohonan.rt || "..." } / RW ${permohonan.rw || "..." }`, 110, signatureY)

  doc.text(`Ketua RW. ${permohonan.rw || "..." }`, leftX, signatureY + 30)
  doc.text("_______________________", leftX, signatureY + 35)
  doc.text("_______________________", 110, signatureY + 35)

  // ----- Siapkan main PDF bytes (untuk merge jika ada lampiran PDF / gambar) -----
  const mainPdfBytes = doc.output("arraybuffer")

  // jika tidak ada lampiran, cukup unduh
  if (!permohonan.lampiran) {
    doc.save(`Surat_Pengantar_${(permohonan.nama || "pemohon").replace(/\s+/g, "_")}_${Date.now()}.pdf`)
    return
  }

  // ----- Merge menggunakan pdf-lib agar lampiran PDF ikut tersisip -----
  try {
    const mainPdfDoc = await PDFDocument.load(mainPdfBytes)

    // Lampiran berupa gambar (data:image/...)
    if (permohonan.lampiran.startsWith("data:image")) {
      // ambil arraybuffer dari dataURL
      const imageBytes = await fetch(permohonan.lampiran).then(res => res.arrayBuffer())
      // embed sesuai tipe
      const mime = permohonan.lampiran.split(";")[0].split(":")[1] // e.g. image/png
      let embeddedImage
      if (mime === "image/png") {
        embeddedImage = await mainPdfDoc.embedPng(imageBytes)
      } else {
        embeddedImage = await mainPdfDoc.embedJpg(imageBytes)
      }
      const page = mainPdfDoc.addPage()
      const { width, height } = page.getSize()
      // scale agar muat ke halaman (maks lebar = width - margin)
      const maxImageWidth = width - 40
      const scale = Math.min(1, maxImageWidth / embeddedImage.width)
      const imgWidth = embeddedImage.width * scale
      const imgHeight = embeddedImage.height * scale

      page.drawImage(embeddedImage, {
        x: (width - imgWidth) / 2,
        y: (height - imgHeight) / 2,
        width: imgWidth,
        height: imgHeight,
      })
    }

    // Lampiran berupa PDF (data:application/pdf;base64,...)
    else if (permohonan.lampiran.startsWith("data:application/pdf")) {
      const pdfBase64 = permohonan.lampiran.split(",")[1] || ""
      // decode base64
      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
      const pdfDocToMerge = await PDFDocument.load(pdfBytes)
      const copiedPages = await mainPdfDoc.copyPages(pdfDocToMerge, pdfDocToMerge.getPageIndices())
      copiedPages.forEach(p => mainPdfDoc.addPage(p))
    }

    // simpan merged pdf dan unduh
    const mergedBytes = await mainPdfDoc.save()
    const blob = new Blob([mergedBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Surat_Pengantar_${(permohonan.nama || "pemohon").replace(/\s+/g, "_")}_${Date.now()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error("Error saat menggabungkan lampiran:", err)
    // fallback: unduh hanya surat utama
    const fallbackDoc = new jsPDF()
    fallbackDoc.text("Gagal menggabungkan lampiran. Mengunduh dokumen utama saja.", 20, 20)
    fallbackDoc.save(`Surat_Pengantar_${(permohonan.nama || "pemohon").replace(/\s+/g, "_")}_${Date.now()}.pdf`)
  }
}




  const getStatusBadge = (status) => {
    const statusConfig = {
      "Antrian layanan": { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      "Disetujui Pak RT": { color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      "TIDAK BISA edit surat": { color: "bg-red-100 text-red-800", icon: XCircle },
      Ditolak: { color: "bg-red-100 text-red-800", icon: XCircle },
    }

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", icon: AlertCircle }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Permohonan Surat</h1>
          <p className="text-sm text-gray-600 mt-1">Layanan Warga - Permohonan Surat</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buat Permohonan
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelurahan</label>
            <select
              value={filterKelurahan}
              onChange={(e) => setFilterKelurahan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {kelurahanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RT / RW</label>
            <select
              value={filterRTRW}
              onChange={(e) => setFilterRTRW(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {rtRwOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pembuatan</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tahunOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan Permohonan</label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {bulanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari data permohonan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nama Warga
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Pengajuan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Disetujui Pak RT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Perihal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Alamat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredPermohonan.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data permohonan
                  </td>
                </tr>
              ) : (
                filteredPermohonan.map((permohonan) => (
                  <tr key={permohonan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(permohonan.tanggal_pengajuan).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{permohonan.nama}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{permohonan.tanggal_pengajuan}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {permohonan.status_permohonan === "Disetujui Pak RT" ? "Ya" : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{permohonan.keperluan}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{permohonan.alamat}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(permohonan.status_permohonan)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPermohonan(permohonan)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(permohonan)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generatePDF(permohonan)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Unduh PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(permohonan)}
                          className="text-red-600 hover:text-red-800"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditMode ? "Edit Permohonan Surat" : "Form Online Pengajuan Surat Pengantar"}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                    <input
                      type="text"
                      value={formData.kota}
                      onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                    <input
                      type="text"
                      value={formData.kecamatan}
                      onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kelurahan</label>
                    <input
                      type="text"
                      value={formData.kelurahan}
                      onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RT</label>
                      <input
                        type="text"
                        value={formData.rt}
                        onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RW</label>
                      <input
                        type="text"
                        value={formData.rw}
                        onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Pemohon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pemohon</label>
                  <input
                    type="text"
                    value={formData.pemohon}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">← nama pemilik user</p>
                </div>

                {/* Warga Selection */}
                {!isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Warga</label>
                    <select
                      onChange={(e) => handleWargaSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Pilih Warga --</option>
                      {wargaList.map((warga) => (
                        <option key={warga.id} value={warga.id}>
  {warga.nama + " - " + (warga.nik || "")}
</option>

                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">← Isi nama warga by kepala keluarga</p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Bersama ini mengajukan permohonan sbb:</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          value={formData.tempat_lahir}
                          onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                        <input
                          type="date"
                          value={formData.tanggal_lahir}
                          onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kewarganegaraan</label>
                        <select
                          value={formData.kewarganegaraan}
                          onChange={(e) => setFormData({ ...formData, kewarganegaraan: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="WNI">WNI</option>
                          <option value="WNA">WNA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
                        <select
                          value={formData.agama}
                          onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Pilih Agama</option>
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Konghucu">Konghucu</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                        <select
                          value={formData.jenis_kelamin}
                          onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Belum Kawin">Belum Kawin</option>
                          <option value="Kawin">Kawin</option>
                          <option value="Janda">Janda</option>
                          <option value="Duda">Duda</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
                      <input
                        type="text"
                        value={formData.pendidikan_terakhir}
                        onChange={(e) => setFormData({ ...formData, pendidikan_terakhir: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pekerjaan</label>
                      <input
                        type="text"
                        value={formData.pekerjaan}
                        onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                      <textarea
                        value={formData.alamat}
                        onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        N.I.K <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nik}
                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Keperluan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.keperluan}
                        onChange={(e) => setFormData({ ...formData, keperluan: e.target.value })}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lampiran (optional)</label>
                     <input
  type="file"
  onChange={async (e) => {
    const file = e.target.files[0]
    if (file) {
      const base64 = await convertToBase64(file)
      setFormData({ ...formData, lampiran: base64 })
    }
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
<p className="text-xs text-gray-500 mt-1">← File akan disimpan sebagai Base64</p>


                    </div>
                  </div>
                </div>

                {/* Confirmation */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Mohon Perhatian,</strong>
                    </p>
                    <p className="text-sm text-gray-700">
                      Untuk percepatan pelayanan, sebaiknya sebelum anda menyimpan proses permohonan ini, dapat
                      memberitahukan/melaporkan permohonan melalui RT dimohon layanan (no_ayanan_Online+).
                    </p>
                  </div>
                  <div className="flex items-center mt-4">
                    <input type="checkbox" id="confirm" className="mr-2" required />
                    <label htmlFor="confirm" className="text-sm text-gray-700">
                      menyatakan dengan ini data telah diisi dengan sebenar-benarnya.
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedPermohonan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-800">Detail Permohonan</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nama</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.nama}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">NIK</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.nik}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tempat, Tanggal Lahir</p>
                    <p className="text-base text-gray-900">
                      {selectedPermohonan.tempat_lahir}, {selectedPermohonan.tanggal_lahir}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Jenis Kelamin</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.jenis_kelamin}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Agama</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.agama}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pendidikan</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.pendidikan_terakhir}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pekerjaan</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.pekerjaan}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Alamat</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.alamat}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Keperluan</p>
                    <p className="text-base text-gray-900">{selectedPermohonan.keperluan}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status Permohonan</p>
                    <div className="mt-1">{getStatusBadge(selectedPermohonan.status_permohonan)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tanggal Pengajuan</p>
                    <p className="text-base text-gray-900">
                      {new Date(selectedPermohonan.tanggal_pengajuan).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Ubah Status:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedPermohonan, "Antrian layanan")}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm"
                    >
                      Antrian layanan
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedPermohonan, "Disetujui Pak RT")}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      Disetujui Pak RT
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedPermohonan, "Ditolak")}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
                    >
                      Ditolak
                    </button>
                  </div>
                </div>
                {selectedPermohonan.lampiran && (
  <div className="col-span-2 mt-4">
    <p className="text-sm font-medium text-gray-500">Lampiran</p>

    {/* Jika lampiran gambar */}
    {selectedPermohonan.lampiran.startsWith("data:image") ? (
      <img
        src={selectedPermohonan.lampiran}
        alt="Lampiran"
        className="mt-2 rounded-md border border-gray-200 max-h-64 object-contain"
      />
    ) : selectedPermohonan.lampiran.startsWith("data:application/pdf") ? (
      <iframe
        src={selectedPermohonan.lampiran}
        title="Lampiran PDF"
        className="mt-2 w-full h-64 border rounded-md"
      />
    ) : (
      <a
        href={selectedPermohonan.lampiran}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline mt-2 block"
      >
        Buka Lampiran
      </a>
    )}
  </div>
)}


                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => generatePDF(selectedPermohonan)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Unduh PDF
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

export default PermohonanSuratPage
