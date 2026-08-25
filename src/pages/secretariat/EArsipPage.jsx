"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { firestoreService } from "../../services/firebase"
import { FileText, Plus, X, Upload, AlertCircle, Search, Eye, Edit2, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import jsPDF from "jspdf"

const months = [
  { value: "all", label: "Keseluruhan" },
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

const jenisSuratOptions = [
  { value: "all", label: "Keseluruhan" },
  { value: "masuk", label: "Surat Masuk" },
  { value: "keluar", label: "Surat Keluar" },
  { value: "pengantar", label: "Surat Pengantar" },
]

const pad2 = (n) => String(n).padStart(2, "0")
const formatDate = (d) => {
  if (!d) return "-"
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return "-"
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`
}

function FormModal({ isOpen, onClose, onSave, editingData, currentUser, wilayah }) {
  const [formData, setFormData] = useState({
    jenisSurat: "masuk",
    tanggalSurat: new Date().toISOString().split("T")[0],
    nomorSurat: "",
    perihal: "",
    asalSurat: "",
    ditujukanKepada: "",
    tanggalArsip: new Date().toISOString().split("T")[0],
    file: null,
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingData) {
      setFormData({
        jenisSurat: editingData.jenisSurat || "masuk",
        tanggalSurat: editingData.tanggalSurat || new Date().toISOString().split("T")[0],
        nomorSurat: editingData.nomorSurat || "",
        perihal: editingData.perihal || "",
        asalSurat: editingData.asalSurat || "",
        ditujukanKepada: editingData.ditujukanKepada || "",
        tanggalArsip: editingData.tanggalArsip || new Date().toISOString().split("T")[0],
        file: null,
      })
    } else {
      setFormData({
        jenisSurat: "masuk",
        tanggalSurat: new Date().toISOString().split("T")[0],
        nomorSurat: "",
        perihal: "",
        asalSurat: "",
        ditujukanKepada: "",
        tanggalArsip: new Date().toISOString().split("T")[0],
        file: null,
      })
    }
    setErrors({})
  }, [editingData, isOpen])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.jenisSurat) newErrors.jenisSurat = "Jenis surat wajib dipilih"
    if (!formData.tanggalSurat) newErrors.tanggalSurat = "Tanggal surat wajib dipilih"
    if (!formData.nomorSurat.trim()) newErrors.nomorSurat = "Nomor surat wajib diisi"
    if (!formData.perihal.trim()) newErrors.perihal = "Perihal wajib diisi"
    if (!formData.asalSurat.trim()) newErrors.asalSurat = "Asal surat wajib diisi"
    if (!formData.ditujukanKepada.trim()) newErrors.ditujukanKepada = "Ditujukan kepada wajib diisi"
    if (!editingData && !formData.file) newErrors.file = "File PDF wajib diunggah"
    if (formData.file && formData.file.size > 500 * 1024) newErrors.file = "Ukuran file maksimal 500KB"
    if (formData.file && formData.file.type !== "application/pdf") newErrors.file = "Format file harus PDF"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const generateAgendaNumber = () => {
    const year = new Date(formData.tanggalSurat).getFullYear()
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `${currentUser?.id || "CLIENT"} ${random}.${year}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      let base64File = null

      // Kalau user upload file baru
      if (formData.file) {
        base64File = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(formData.file)
          reader.onload = () => resolve(reader.result)
          reader.onerror = (error) => reject(error)
        })
      }

      // Nomor agenda otomatis
      const agendaNumber = editingData ? formData.nomorAgenda : generateAgendaNumber()

      // Data yang disimpan ke Firestore
      const dataToSave = {
        ...formData,
        file: base64File, // simpan dalam bentuk Base64
        nomorAgenda: agendaNumber,
        RT: wilayah.rt,
        RW: wilayah.rw,
        Kelurahan: wilayah.kelurahan,
        kabupaten_kota: wilayah.kota,
        createdAt: editingData?.createdAt || new Date(),
        updatedAt: new Date(),
      }

      if (editingData) {
        await firestoreService.update("arsipSurat", editingData.id, dataToSave)
        Swal.fire("Berhasil", "Data berhasil diperbarui", "success")
      } else {
        await firestoreService.add("arsipSurat", dataToSave)
        Swal.fire("Berhasil", "Data berhasil ditambahkan", "success")
      }

      onClose()
    } catch (error) {
      console.error("Gagal menyimpan data:", error)
      Swal.fire("Error", "Gagal menyimpan data", "error")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      jenisSurat: "masuk",
      tanggalSurat: new Date().toISOString().split("T")[0],
      nomorSurat: "",
      perihal: "",
      asalSurat: "",
      ditujukanKepada: "",
      tanggalArsip: new Date().toISOString().split("T")[0],
      file: null,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingData ? "Edit Arsip Surat" : "Buat Arsip Surat Baru"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errors.submit}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                Jenis Surat <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                {["masuk", "keluar"].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jenisSurat"
                      value={type}
                      checked={formData.jenisSurat === type}
                      onChange={(e) => setFormData({ ...formData, jenisSurat: e.target.value })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type === "masuk" ? "Surat Masuk" : "Surat Keluar"}
                    </span>
                  </label>
                ))}
              </div>
              {errors.jenisSurat && <p className="text-xs text-red-600">{errors.jenisSurat}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                Tanggal Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tanggalSurat}
                onChange={(e) => setFormData({ ...formData, tanggalSurat: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.tanggalSurat && <p className="text-xs text-red-600">{errors.tanggalSurat}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Nomor Surat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength="99"
              value={formData.nomorSurat}
              onChange={(e) => setFormData({ ...formData, nomorSurat: e.target.value })}
              placeholder="Contoh: 001/RT/2025"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.nomorSurat && <p className="text-xs text-red-600">{errors.nomorSurat}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Perihal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength="100"
              value={formData.perihal}
              onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
              placeholder="Masukkan perihal surat"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.perihal && <p className="text-xs text-red-600">{errors.perihal}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Asal Surat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength="100"
              value={formData.asalSurat}
              onChange={(e) => setFormData({ ...formData, asalSurat: e.target.value })}
              placeholder="Masukkan asal surat"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.asalSurat && <p className="text-xs text-red-600">{errors.asalSurat}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Ditujukan Kepada <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength="101"
              value={formData.ditujukanKepada}
              onChange={(e) => setFormData({ ...formData, ditujukanKepada: e.target.value })}
              placeholder="Masukkan tujuan surat"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.ditujukanKepada && <p className="text-xs text-red-600">{errors.ditujukanKepada}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Unggah eArsip (PDF) {!editingData && <span className="text-red-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="p-3 bg-blue-100 rounded-lg w-fit">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {formData.file ? formData.file.name : "Klik untuk memilih file PDF"}
                </span>
                <span className="text-xs text-gray-500">Format PDF, maksimal 500KB</span>
              </label>
            </div>
            {errors.file && <p className="text-xs text-red-600">{errors.file}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Tanggal Arsip / Pencatatan</label>
            <input
              type="date"
              value={formData.tanggalArsip}
              onChange={(e) => setFormData({ ...formData, tanggalArsip: e.target.value })}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500">Default: tanggal hari ini</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function EArsipPage() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [arsipData, setArsipData] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState("all")
  const [jenisSurat, setJenisSurat] = useState("all")
  const [pageSize, setPageSize] = useState(25)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingData, setEditingData] = useState(null)

  const wilayah = useMemo(() => {
    if (!currentUser) return { rt: "-", rw: "-", kelurahan: "-", kota: "-" }
    const u = currentUser
    return {
      rt: u.RT || u.rt || "-",
      rw: u.RW || u.rw || "-",
      kelurahan: u.Kelurahan || u.kelurahan || "-",
      kota: u.kabupaten_kota || u.kota || "-",
    }
  }, [currentUser])

  // Bagian 1 — Ambil Data Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil arsip selain surat pengantar
        const arsipSnapshot = await firestoreService.getAll("arsipSurat")
        const arsipData = arsipSnapshot.filter((item) => item.jenis_surat !== "Surat Pengantar")

        // Ambil surat pengantar dari permohonanSurat
        const suratSnapshot = await firestoreService.getAll("permohonanSurat")
        const suratPengantar = suratSnapshot
          .filter((item) => item.jenis_surat === "Surat Pengantar")
          .map((item) => ({
            ...item,
            perihal: item.keperluan, // aturan: perihal = keperluan
            sumber: "permohonanSurat",
          }))

        // Gabungkan dua data
        const combined = [...arsipData, ...suratPengantar]

        // Urutkan berdasarkan tanggal agenda (desc)
        const sorted = combined.sort((a, b) => new Date(b.tanggal_agenda) - new Date(a.tanggal_agenda))

        setArsipData(sorted)
      } catch (error) {
        console.error("Gagal memuat data arsip:", error)
      }
    }

    fetchData()
  }, [])

  // Load users + resolve current logged in user
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const allUsers = await firestoreService.getAll("users")
        if (!mounted) return
        setUsers(allUsers || [])

        const lsUser =
          JSON.parse(localStorage.getItem("user")) ||
          JSON.parse(localStorage.getItem("authUser")) ||
          JSON.parse(localStorage.getItem("currentUser")) ||
          null

        const uid = lsUser?.id || lsUser?.uid || lsUser?.userId || lsUser?.user?.uid || null

        let found = null
        if (uid) {
          found = allUsers.find((u) => u.id === uid || u.uid === uid)
        }
        if (!found) {
          found =
            allUsers.find((u) => (u.RT || u.rt) && (u.RW || u.rw)) ||
            allUsers.find((u) => (u.role || u.level) === "client") ||
            allUsers.find((u) => (u.role || u.level) === "superadmin") ||
            allUsers[0]
        }
        setCurrentUser(found || null)
      } catch (e) {
        console.log("[v0] Load users error:", e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const mounted = true
    ;(async () => {
      if (!currentUser) return
      setLoading(true)
      try {
        const arsipRows = await firestoreService.getAll("arsipSurat")
        const permohonanRows = await firestoreService.getAll("permohonanSurat")

        const { rt, rw, kelurahan, kota } = wilayah

        // Filter arsipSurat by wilayah
        const filteredArsip = (arsipRows || []).filter((r) => {
          const w = {
            rt: r.RT || r.rt || "",
            rw: r.RW || r.rw || "",
            kelurahan: r.Kelurahan || r.kelurahan || "",
            kota: r.kabupaten_kota || r.kota || "",
          }
          return (
            String(w.rt) === String(rt) &&
            String(w.rw) === String(rw) &&
            String(w.kelurahan).toLowerCase() === String(kelurahan).toLowerCase() &&
            String(w.kota).toLowerCase() === String(kota).toLowerCase()
          )
        })

        // Filter permohonanSurat by wilayah and status
        const filteredPermohonan = (permohonanRows || [])
          .filter((r) => {
            const w = {
              rt: r.RT || r.rt || "",
              rw: r.RW || r.rw || "",
              kelurahan: r.Kelurahan || r.kelurahan || "",
              kota: r.kabupaten_kota || r.kota || "",
            }
            const status = (r.status || "").toLowerCase()
            const isApproved = ["diterima", "selesai", "approved"].includes(status)
            return (
              isApproved &&
              String(w.rt) === String(rt) &&
              String(w.rw) === String(rw) &&
              String(w.kelurahan).toLowerCase() === String(kelurahan).toLowerCase() &&
              String(w.kota).toLowerCase() === String(kota).toLowerCase()
            )
          })
          .map((r) => ({
            ...r,
            source: "permohonanSurat",
            jenisSurat: r.jenisSurat || r.jenis_surat || "pengantar",
            tanggalSurat: r.tanggalPermohonan || r.tanggal_permohonan || r.createdAt || r.created_at,
            nomorSurat: r.nomorPermohonan || r.nomor_permohonan || "-",
            perihal: r.keperluan || r.perihal || "-",
            asalSurat: r.namaPemohon || r.nama_pemohon || "-",
            ditujukanKepada: r.tujuanSurat || r.tujuan_surat || "-",
            agendaNumber: r.nomorAgenda || r.nomor_agenda || "-",
          }))

        // Merge kedua data
        const mergedData = [...filteredArsip, ...filteredPermohonan]

        if (!mounted) return
        setArsipData(mergedData)
      } catch (e) {
        console.log("[v0] Load arsip data error:", e)
      } finally {
        setLoading(false)
      }
    })()
  }, [currentUser, wilayah])
  const handleView = (item) => {
    // contoh membuka file PDF base64
    if (item.file) {
      const newWindow = window.open()
      newWindow.document.write(`<iframe src="${item.file}" width="100%" height="100%"></iframe>`)
    } else {
      Swal.fire("Tidak ada file", "Surat ini belum memiliki file terlampir", "info")
    }
  }

  const years = useMemo(() => {
    const arr = []
    for (let y = currentYear - 5; y <= currentYear + 1; y++) arr.push(y)
    return arr.reverse()
  }, [currentYear])

  const filteredRows = useMemo(() => {
    let rows = [...arsipData]

    rows = rows.filter((r) => {
      const tglStr =
        r.tanggalSurat || r.tanggal_terbit || r.tanggalTerbitSurat || r.tanggal || r.createdAt || r.created_at || null
      const dt = tglStr ? new Date(tglStr) : null
      const y = dt ? dt.getFullYear() : null
      const m = dt ? pad2(dt.getMonth() + 1) : null
      const byYear = y === year
      const byMonth = month === "all" ? true : m === month
      const byJenis = jenisSurat === "all" ? true : (r.jenisSurat || "").toLowerCase() === jenisSurat.toLowerCase()
      return byYear && byMonth && byJenis
    })

    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const nm = (r.nomorSurat || r.nomor_surat || "").toLowerCase()
        const perihal = (r.perihal || "").toLowerCase()
        const asal = (r.asalSurat || r.asal_surat || "").toLowerCase()
        const tujuan = (r.ditujukanKepada || r.ditujuan_kepada || "").toLowerCase()
        return nm.includes(q) || perihal.includes(q) || asal.includes(q) || tujuan.includes(q)
      })
    }

    // Sort by tanggal agenda (descending)
    rows.sort((a, b) => {
      const da = new Date(a.tanggalArsip || a.tanggal_agenda || a.tanggalSurat || a.createdAt || 0).getTime() || 0
      const db = new Date(b.tanggalArsip || b.tanggal_agenda || b.tanggalSurat || b.createdAt || 0).getTime() || 0
      return db - da
    })

    return rows
  }, [arsipData, query, year, month, jenisSurat])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pageItems = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  const handleViewPdf = async (row) => {
    try {
      // Jika sudah ada file di Firestore (URL atau Base64)
      if (row.pdfUrl || row.fileUrl || row.file) {
        const fileData = row.pdfUrl || row.fileUrl || row.file
        window.open(fileData, "_blank", "noopener,noreferrer")
        return
      }

      // Generate PDF otomatis untuk Surat Pengantar
      const doc = new jsPDF({ unit: "mm", format: "a4" })

      const city = (wilayah?.kota || "KOTA").toUpperCase()
      const kec = (row.kecamatan || currentUser?.kecamatan || "").toUpperCase()
      const kel = (wilayah?.kelurahan || "").toUpperCase()
      const rtRw = `RT ${wilayah?.rt} / RW ${wilayah?.rw}`

      // Header
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(city, 105, 18, { align: "center" })
      doc.setFontSize(12)
      doc.text(`KECAMATAN ${kec}`, 105, 26, { align: "center" })
      doc.text(`KELURAHAN ${kel}`, 105, 32, { align: "center" })
      doc.text(rtRw, 105, 38, { align: "center" })
      doc.line(20, 42, 190, 42)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)

      const nomor = row.nomorSurat || row.nomor_surat || "-"
      const lampiran = row.jumlah_lampiran ? `${row.jumlah_lampiran} ${row.satuan_lampiran || ""}` : "-"
      const hal = row.perihal || row.keperluan || "Surat Pengantar"

      doc.text(`Nomor   : ${nomor}`, 20, 50)
      doc.text(`Lampiran: ${lampiran}`, 20, 56)
      doc.text(`Hal     : ${hal}`, 20, 62)

      const tanggal = new Date(row.tanggalSurat || row.tanggal_agenda || new Date())
      doc.text(`${city}, ${tanggal.toLocaleDateString("id-ID")}`, 140, 50)
      doc.text("Kepada Yth.", 140, 56)
      doc.text(`Kepala Kelurahan ${kel}`, 140, 62)
      doc.text(`Kecamatan ${kec}`, 140, 68)
      doc.text("di", 140, 74)
      doc.setFont("helvetica", "bold")
      doc.text(city, 156, 74)
      doc.setFont("helvetica", "normal")

      let y = 86
      doc.text("Bersama ini menerangkan bahwa:", 20, y)
      y += 8

      const dataList = [
        ["Nama", row.namaPemohon || row.nama_pemohon || row.asalSurat || "-"],
        ["NIK", row.nik || "-"],
        ["Alamat", row.alamat || "-"],
        ["Keperluan", row.keperluan || row.perihal || "-"],
        ["Keterangan", row.keterangan || "-"],
      ]

      dataList.forEach(([label, value]) => {
        doc.text(`${label}`, 20, y)
        doc.text(": ", 60, y)
        doc.text(String(value).substring(0, 60), 66, y)
        y += 7
      })

      y += 6
      doc.text("Demikian untuk menjadikan periksa dan guna seperlunya.", 20, y)
      y += 14
      doc.text("Mengetahui", 20, y)
      doc.text(`Ketua RW ${wilayah?.rw}`, 20, y + 6)
      doc.text(`Ketua RT ${wilayah?.rt} / RW ${wilayah?.rw}`, 140, y + 6)

      window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Gagal menampilkan PDF:", error)
      Swal.fire("Error", "Gagal menampilkan dokumen PDF", "error")
    }
  }

  const handleEdit = (row) => {
    // Surat Pengantar tidak bisa diedit dari sini
    if (row.source === "permohonanSurat" || row.jenisSurat === "Surat Pengantar") {
      Swal.fire("Tidak Diizinkan", "Surat Pengantar hanya bisa diedit dari menu Layanan Surat Warga", "warning")
      return
    }

    setEditingData(row)
    setIsModalOpen(true)
  }

  const handleDelete = async (row) => {
    // Surat Pengantar tidak bisa dihapus dari sini
    if (row.source === "permohonanSurat" || row.jenisSurat === "Surat Pengantar") {
      Swal.fire("Tidak Diizinkan", "Surat Pengantar hanya bisa dihapus dari menu Layanan Surat Warga", "warning")
      return
    }

    if (!confirm("Apakah Anda yakin ingin menghapus arsip surat ini?")) return
    try {
      await firestoreService.delete("arsipSurat", row.id)
      setArsipData(arsipData.filter((r) => r.id !== row.id))
      Swal.fire("Berhasil", "Arsip surat berhasil dihapus", "success")
    } catch (error) {
      console.error("[v0] Error deleting arsip surat:", error)
      Swal.fire("Error", "Gagal menghapus arsip surat", "error")
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingData(null)
  }

  const handleSave = async () => {
    try {
      const rows = await firestoreService.getAll("arsipSurat")
      const { rt, rw, kelurahan, kota } = wilayah
      const filtered = (rows || []).filter((r) => {
        const w = {
          rt: r.RT || r.rt || "",
          rw: r.RW || r.rw || "",
          kelurahan: r.Kelurahan || r.kelurahan || "",
          kota: r.kabupaten_kota || r.kota || "",
        }
        return (
          String(w.rt) === String(rt) &&
          String(w.rw) === String(rw) &&
          String(w.kelurahan).toLowerCase() === String(kelurahan).toLowerCase() &&
          String(w.kota).toLowerCase() === String(kota).toLowerCase()
        )
      })
      setArsipData(filtered)
    } catch (e) {
      console.log("[v0] Error reloading data:", e)
    }
  }

  const renderActions = (item) => {
    // Surat Pengantar hanya bisa dilihat, tidak bisa edit/hapus dari eArsip
    const isSuratPengantar =
      item.jenisSurat === "Surat Pengantar" ||
      item.jenis_surat === "Surat Pengantar" ||
      item.source === "permohonanSurat"

    if (isSuratPengantar) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewPdf(item)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
            title="Lihat PDF surat dan lampirannya"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Lihat
          </button>
        </div>
      )
    }

    // Arsip surat biasa bisa edit/hapus
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleEdit(item)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
        >
          <Edit2 className="w-4 h-4 inline mr-1" />
          Edit
        </button>
        <button
          onClick={() => handleDelete(item)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4 inline mr-1" />
          Hapus
        </button>
        <button
          onClick={() => handleViewPdf(item)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
        >
          <Eye className="w-4 h-4 inline mr-1" />
          Lihat
        </button>
      </div>
    )
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">eARSIP SURAT</h1>
                <p className="text-sm text-gray-600 mt-1">
                  RT {wilayah.rt} RW {wilayah.rw} Kelurahan {wilayah.kelurahan} - {wilayah.kota}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Buat Surat</span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tahun Buku</label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value))
                  setPage(1)
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Bulan Agenda</label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value)
                  setPage(1)
                }}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Jenis Surat</label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={jenisSurat}
                onChange={(e) => {
                  setJenisSurat(e.target.value)
                  setPage(1)
                }}
              >
                {jenisSuratOptions.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tampilkan</label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} data
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Nomor, perihal, asal, tujuan..."
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Tanggal / Nomor Agenda</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Tanggal / No Surat</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Dari</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Kepada</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Perihal</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <span>Memuat data…</span>
                      </div>
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                      Tidak ada arsip untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => {
                    const tgl = r.tanggalSurat || r.tanggal_terbit || r.tanggalTerbitSurat || r.createdAt || r.tanggal
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          <div className="text-sm">{formatDate(tgl)}</div>
                          <div className="text-xs text-gray-500">{r.agendaNumber || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          <div className="text-sm">{formatDate(tgl)}</div>
                          <div className="text-xs text-gray-500">{r.nomorSurat || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{r.asalSurat || "-"}</td>
                        <td className="px-6 py-4 text-gray-700">{r.ditujukanKepada || "-"}</td>
                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{r.perihal || "-"}</td>
                        <td className="border p-2 flex gap-2 justify-center">{renderActions(r)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredRows.length}</span> data • Halaman{" "}
              <span className="font-semibold text-gray-900">{page}</span> dari{" "}
              <span className="font-semibold text-gray-900">{pageCount}</span>
            </div>
            <div className="flex items-center gap-1">
              {["<<<", "<<", "<"].map((lab, idx) => (
                <button
                  key={lab}
                  className="h-9 min-w-9 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (idx === 0) setPage(1)
                    if (idx === 1) setPage(Math.max(1, page - 5))
                    if (idx === 2) setPage(Math.max(1, page - 1))
                  }}
                >
                  {lab}
                </button>
              ))}
              {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                const start = Math.max(1, Math.min(page - 2, pageCount - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 min-w-9 rounded-lg border text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-700 hover:bg-white hover:border-blue-500 hover:text-blue-600"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              {[">", ">>", ">>>"].map((lab, idx) => (
                <button
                  key={lab}
                  className="h-9 min-w-9 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (idx === 0) setPage(Math.min(pageCount, page + 1))
                    if (idx === 1) setPage(Math.min(pageCount, page + 5))
                    if (idx === 2) setPage(pageCount)
                  }}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingData={editingData}
        currentUser={currentUser}
        wilayah={wilayah}
      />
    </motion.main>
  )
}
