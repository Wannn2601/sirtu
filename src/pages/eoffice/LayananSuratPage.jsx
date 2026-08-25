"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import firestoreService, { db } from "../../services/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import Swal from "sweetalert2"


const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ title, subtitle }) => (
  <div className="border-b border-gray-100 px-4 py-3">
    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
  </div>
)
const CardBody = ({ children, className = "" }) => <div className={`p-4 ${className}`}>{children}</div>
const Button = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
)
const SecondaryButton = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
)

const monthNames = [
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
const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
const toDateInput = (d) => {
  if (!d) return "" // kalau kosong, langsung balikin string kosong
  const date = d instanceof Date ? d : new Date(d)
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}
const currency = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(n || 0),
  )

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser")
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    id: "local-demo",
    nama: "User Demo",
    kelurahan: "Padangsari",
    kecamatan: "Banyumanik",
    kabupaten_kota: "Semarang",
    RT: "001",
    RW: "003",
    level: "superadmin",
  }
}

const COLL = "permohonanSurat"

function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
              <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// Helper to normalize user fields from Firestore
function normalizeUser(u = {}) {
  return {
    id: String(u.id ?? ""),
    nama: u.nama ?? u.username ?? "",
    RT: u.RT ?? u.rt ?? "",
    RW: u.RW ?? u.rw ?? "",
    kelurahan: u.kelurahan ?? u.Kelurahan ?? "",
    kecamatan: u.kecamatan ?? u.Kecamatan ?? "",
    kabupaten_kota: u.kabupaten_kota ?? u.kabupatenKota ?? u.kota ?? "",
    level: u.level ?? "",
  }
}

export default function LayananSuratPage() {
  const [user, setUser] = useState(getCurrentUser())
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [warga, setWarga] = useState([])
  const [users, setUsers] = useState([])
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const now = new Date()
const [kkData, setKkData] = useState([])
const [selectedKK, setSelectedKK] = useState(null)
const [wargaData, setWargaData] = useState([])
const [selectedRowId, setSelectedRowId] = useState(null)



  const [filter, setFilter] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: "keseluruhan", // keseluruhan | baru | diterima | selesai | ditolak
    view: 25,
    search: "",
  })

  const emptyForm = {
    // A. Data Permohonan
    tanggalPermohonan: toDateInput(now),
    pemohon: user?.nama || "",
    // B. Data Surat Pengantar
    wargaId: "",
    namaWarga: "",
    ttl: "",
    kewarganegaraan: "",
    agama: "",
    statusKawin: "",
    pendidikan: "",
    pekerjaan: "",
    alamat: "",
    nik: "",
    keperluan: "",
    keperluanLain: "",
    lampiranNama: "",
    lampiranJumlah: "",
    lampiranSatuan: "lembar",
    // C. Approval RT
    approvalStatus: "diterima", // diterima | ditolak
    approvalKeterangan: "",
    tanggalTerbit: toDateInput(now),
    autoNomor: true,
    nomorSurat: "",
    // flags
    unggahDone: false,
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await firestoreService.ensureConnection()

        // Try localStorage user id
        const storedId =
          localStorage.getItem("userId") ||
          (() => {
            try {
              const raw = localStorage.getItem("currentUser")
              return raw ? JSON.parse(raw).id : null
            } catch {
              return null
            }
          })()

        // Load all users so we can pick the best wilayah source if needed
        const allUsers = await firestoreService.getAll("users").catch(() => [])
        const byId = storedId ? await firestoreService.getById("users", String(storedId)).catch(() => null) : null

        // Choose wilayah user similar to DataKKPage
        const wilayahUser =
          byId ||
          allUsers.find((u) => u.level === "superadmin") ||
          allUsers.find(
            (u) => u.RT || u.RW || u.Kelurahan || u.kelurahan || u.kecamatan || u.kabupaten_kota || u.kota,
          ) ||
          allUsers[0] ||
          null

        if (!cancelled && wilayahUser) {
          const norm = normalizeUser(wilayahUser)
          console.log("[v0] eOFFICE wilayah user loaded:", norm)
          setUser((prev) => ({ ...prev, ...norm }))
        } else {
          console.warn("[v0] No wilayah user found in Firestore users")
        }
      } catch (e) {
        console.error("[v0] Failed to load current user from Firestore:", e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
useEffect(() => {
  async function fetchKKData() {
    try {
      const snapshot = await getDocs(collection(db, "kkData"))
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setKkData(list)
    } catch (err) {
      console.error("Gagal ambil kkData:", err)
    }
  }
  fetchKKData()
}, [])
useEffect(() => {
  const fetchWarga = async () => {
    const data = await firestoreService.getAll("wargaData")
    setWargaData(data)
  }
  fetchWarga()
}, [])

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        setLoading(true)
        await firestoreService.ensureConnection()

        const usersArr = await firestoreService.getAll("users").catch(() => [])
        if (isMounted) setUsers(usersArr || [])

        const wargaDocs = await firestoreService.getAll("wargaData").catch(() => [])
        if (isMounted) setWarga(wargaDocs || [])

        const all = await firestoreService.getAll(COLL)

        const scoped = all.filter((d) => {
          const tRaw = d.tanggal || d.tanggalPermohonan || d.createdAt || Date.now()
          const t =
            typeof tRaw?.toDate === "function"
              ? tRaw.toDate()
              : typeof tRaw === "string"
                ? new Date(tRaw)
                : new Date(tRaw)
          const y = d.tahun || t.getFullYear()
          const matchScope =
            (d.RT ?? d.rt ?? user.RT) === user.RT &&
            (d.RW ?? d.rw ?? user.RW) === user.RW &&
            (d.kelurahan ?? d.Kelurahan ?? user.kelurahan) === user.kelurahan &&
            (d.kecamatan ?? user.kecamatan) === user.kecamatan &&
            (d.kabupaten_kota ?? user.kabupaten_kota) === user.kabupaten_kota
          return matchScope && y === filter.year
        })

        const usersMap = Object.fromEntries((usersArr || []).map((u) => [String(u.id), u]))
        const joined = scoped.map((d) => {
          const uid = String(d.id_user || d.pemohonId || "")
          return { ...d, pemohonUser: usersMap[uid] || null }
        })

        if (isMounted) setData(joined)
      } catch (e) {
        console.error("[v0] Load LayananSurat error:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter.year])

  function deriveStatus(row) {
    // preferred eOFFICE field
    if (row.statusPermohonan) return row.statusPermohonan
    // map from Layanan Warga field
    const s = (row.status || "").toLowerCase()
    if (s.includes("diterima")) return "diterima"
    if (s.includes("ditolak")) return "ditolak"
    if (row.unggahDone && (s.includes("diterima") || row.approvalStatus === "diterima")) return "selesai"
    return "baru"
  }


  // Klik tombol "Unggah" atau "Upload Ulang"
const handleUploadClick = async (rowId) => {
  setSelectedRowId(rowId)

  // cari data permohonan terkait
  const existing = data.find((d) => d.id === rowId)
  const sudahAdaFile = !!existing?.fileName

  if (sudahAdaFile) {
    const confirmResult = await Swal.fire({
      title: "Upload Ulang File?",
      text: `File "${existing.fileName}" sudah ada. Apakah kamu yakin ingin menggantinya dengan file baru?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, ganti file",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
    })

    if (!confirmResult.isConfirmed) {
      setSelectedRowId(null)
      return
    }
  }

  // buka file picker
  document.getElementById("hiddenFileInput").click()
}

// Saat file dipilih dari input
const handleFileSelected = async (e) => {
  const file = e.target.files[0]
  if (!file || !selectedRowId) return

  try {
    // batas ukuran 1MB agar tidak melebihi limit Firestore
    if (file.size > 900 * 1024) {
      await Swal.fire({
        icon: "error",
        title: "File Terlalu Besar",
        text: "Ukuran file melebihi 900KB. Silakan kompres atau pilih file yang lebih kecil.",
      })
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64File = event.target.result

      // buat payload file baru
      const newFileData = {
        fileData: base64File,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
      }

      // simpan ke Firestore (otomatis menimpa data lama)
      await firestoreService.update(COLL, selectedRowId, newFileData)

      // update state agar UI langsung berubah
      setData((prev) =>
        prev.map((item) =>
          item.id === selectedRowId ? { ...item, ...newFileData } : item
        )
      )

      await Swal.fire({
        icon: "success",
        title: "Upload Berhasil",
        text: `File "${file.name}" berhasil diunggah dan menggantikan file lama.`,
        timer: 2000,
      })

      // reset
      e.target.value = ""
      setSelectedRowId(null)
    }

    reader.readAsDataURL(file)
  } catch (err) {
    console.error("Upload error:", err)
    await Swal.fire({
      icon: "error",
      title: "Gagal Upload",
      text: "Terjadi kesalahan saat menyimpan file ke Firestore.",
    })
  }
}


  const filtered = useMemo(() => {
    const text = filter.search.trim().toLowerCase()
    return data
      .filter((d) => {
        const tRaw = d.tanggal || d.tanggalPermohonan || d.createdAt || Date.now()
        const t =
          typeof tRaw?.toDate === "function"
            ? tRaw.toDate()
            : typeof tRaw === "string"
              ? new Date(tRaw)
              : new Date(tRaw)
        const byMonth = filter.month ? t.getMonth() + 1 === Number(filter.month) : true
        const normStatus = deriveStatus(d)
        const byStatus = filter.status === "keseluruhan" ? true : normStatus === filter.status
        const bySearch =
          !text ||
          [
            d.namaWarga || d.nama_warga,
            d.pemohon || d.pengajuan || d.pemohonUser?.nama,
            d.keperluan || d.keperluan_lainnya,
            d.alamat,
            d.nomorSurat || d.nomor_surat,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(text)
        return byMonth && byStatus && bySearch
      })
      .sort((a, b) => {
        const aT = new Date(a.tanggal || a.tanggalPermohonan || a.createdAt || Date.now())
        const bT = new Date(b.tanggal || b.tanggalPermohonan || b.createdAt || Date.now())
        return bT - aT
      })
      .slice(0, Number(filter.view || 25))
  }, [data, filter])

  function onChange(k, v) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditing(null)
  }

  async function genNomorSuratIfNeeded(base) {
    if (!base.autoNomor) return base
    const terbit = new Date(base.tanggalTerbit || Date.now())
    const year = terbit.getFullYear()
    const qSnap = await getDocs(
      query(
        collection(db, COLL),
        where("tahun", "==", year),
        where("RT", "==", user.RT),
        where("RW", "==", user.RW),
        where("kelurahan", "==", user.kelurahan),
      ),
    )
    let maxSeq = 0
    qSnap.forEach((doc) => {
      const s = doc.data()
      if (s.seq && s.tahun === year) maxSeq = Math.max(maxSeq, Number(s.seq))
    })
    const seq = maxSeq + 1
    const month = terbit.getMonth()
    const nomorSurat = `${String(seq).padStart(5, "0")}/${"SP"}.${romanMonths[month]}/${String(year)}`
    return { ...base, seq, tahun: year, monthRoman: romanMonths[month], nomorSurat, nomor_surat: nomorSurat } // save both styles
  }

  async function handleSubmit(ev) {
  ev.preventDefault()
  try {
    // --- Base payload umum untuk semua status ---
    const payloadBase = {
      ...form,
      RT: user.RT,
      rt: user.RT,
      RW: user.RW,
      rw: user.RW,
      kelurahan: user.kelurahan,
      Kelurahan: user.kelurahan,
      kecamatan: user.kecamatan,
      kabupaten_kota: user.kabupaten_kota,
      kota: user.kabupaten_kota,
      pemohonId: user.id,
      id_user: user.id,
      nama_warga: form.namaWarga,
      tanggal: form.tanggalPermohonan,
      updatedAt: new Date(),
      createdAt: form.createdAt || new Date(),
    }

    let payload = {}

    // --- Jika DITOLAK ---
    if (form.approvalStatus === "ditolak") {
      payload = {
        ...payloadBase,
        approvalStatus: "ditolak",
        approvalKeterangan: form.approvalKeterangan || "(tidak ada keterangan)",
        statusPermohonan: "ditolak",
        status: "Ditolak",
        tanggalTerbit: null,
        nomorSurat: null,
        lampiranNama: null,
        lampiranJumlah: null,
        lampiranSatuan: null,
      }
    }

    // --- Jika DITERIMA ---
    else if (form.approvalStatus === "diterima") {
      // generate nomor otomatis jika Ya
      const withNo = form.autoNomor
        ? await genNomorSuratIfNeeded(payloadBase)
        : payloadBase

      payload = {
        ...withNo,
        approvalStatus: "diterima",
        statusPermohonan: "diterima",
        status: "Diterima",
        perihal: form.perihal || "Surat Pengantar",
        tanggalTerbit: form.tanggalTerbit || toDateInput(new Date()),
        lampiranNama: form.lampiranAda ? form.lampiranNama || "-" : null,
        lampiranJumlah: form.lampiranAda ? form.lampiranJumlah || 0 : null,
        lampiranSatuan: form.lampiranAda ? form.lampiranSatuan || "lembar" : null,
      }
    }

    // --- Simpan ke Firestore ---
    if (editing) {
      await firestoreService.update(COLL, editing.id, payload)
    } else {
      await firestoreService.add(COLL, payload)
    }

    // --- Refresh data setelah simpan ---
    const all = await firestoreService.getAll(COLL)
    setData(all)
    setOpenForm(false)
    resetForm()

    console.log("[v0] Saved permohonan:", payload)
  } catch (e) {
    console.error("[v0] Save permohonan error:", e)
    alert("Gagal menyimpan data")
  }
}


  async function handleDelete(row) {
    if (!confirm("Hapus permohonan ini?")) return
    try {
      await firestoreService.delete(COLL, row.id)
      const all = await firestoreService.getAll(COLL)
      setData(all)
    } catch (e) {
      console.error("[v0] Delete permohonan error:", e)
      alert("Gagal menghapus data")
    }
  }

  function openEdit(row) {
  const nama = row.namaWarga || row.nama_warga || ""
  const alamat = row.alamat || ""
  const nik = row.nik || ""
  const ttl =
    row.ttl ||
    (row.tempat_lahir && row.tanggal_lahir ? `${row.tempat_lahir}, ${row.tanggal_lahir}` : row.tanggal_lahir || "")

  const existingNomor = row.nomorSurat || row.nomor_surat || ""
  const nomorLocked = Boolean(existingNomor) // jika ada nomor -> kunci

  setEditing(row)
  setForm({
    ...emptyForm,
    ...row,
    namaWarga: nama,
    alamat,
    nik,
    ttl,
    keperluan: row.keperluan || (row.keperluan === "Lain-lain" ? "lain-lain" : row.keperluan),
    keperluanLain: row.keperluan_lainnya || row.keperluanLain || "",
    approvalKeterangan: row.keterangan || row.approvalKeterangan || "",
    tanggalPermohonan: toDateInput(row.tanggal || row.tanggalPermohonan || Date.now()),
    tanggalTerbit: toDateInput(row.tanggalTerbit || Date.now()),
    nomorSurat: existingNomor,
    // normalisasi: autoNomor boolean — kalau sudah ada nomor => false & kunci;
    autoNomor: nomorLocked ? false : (!row.nomorSurat && !row.nomor_surat),
    nomorLocked, // tambahkan flag ini ke form state
  })
  setOpenForm(true)
}


  async function exportPDF(row) {
    try {
      const mod = await import("jspdf")
      // jsPDF may be default or named export depending on bundler; cover both.
      const JsPDFCtor = mod.jsPDF || mod.default || window.jsPDF
      const doc = new JsPDFCtor({ unit: "mm", format: "a4" })

      const namaWarga = row.namaWarga || row.nama_warga || "-"
      const alamat = row.alamat || "-"
      const nik = row.nik || "-"
      const ttl =
        row.ttl ||
        (row.tempat_lahir && row.tanggal_lahir ? `${row.tempat_lahir}, ${row.tanggal_lahir}` : row.tanggal_lahir || "-")
      const keperluan =
        row.keperluan === "lain-lain" ? row.keperluanLain || row.keperluan_lainnya || "-" : row.keperluan || "-"
      const keterangan = row.approvalKeterangan || row.keterangan || "-"
      const nomor = row.nomorSurat || row.nomor_surat || "-"

      const left = 20
      let y = 20

      doc.setFont("times", "bold")
      doc.setFontSize(18)
      doc.text("KOTA SEMARANG", 105, y, { align: "center" })
      y += 8
      doc.setFontSize(12)
      doc.text("KECAMATAN " + (user.kecamatan || "").toUpperCase(), 105, y, { align: "center" })
      y += 6
      doc.text("KELURAHAN " + (user.kelurahan || "").toUpperCase(), 105, y, { align: "center" })
      y += 6
      doc.text(`RT. ${user.RT || "-"} / RW. ${user.RW || "-"}`, 105, y, { align: "center" })
      y += 8
      doc.line(20, y, 190, y)
      y += 10

      doc.setFont("times", "normal")
      doc.setFontSize(11)
      doc.text("Nomor", left, y)
      doc.text(": " + nomor, left + 25, y)
      y += 6
      doc.text("Lampiran", left, y)
      const lampStr = row.lampiranJumlah ? `${row.lampiranJumlah} ${row.lampiranSatuan || "lembar"}` : "-"
      doc.text(": " + lampStr, left + 25, y)
      y += 6
      doc.text("Hal", left, y)
      doc.text(": Surat Pengantar", left + 25, y)

      doc.text(`${user.kabupaten_kota || "Semarang"}, ${toDateInput(row.tanggalTerbit || Date.now())}`, 140, y - 12)
      y += 16
      doc.text("Kepada Yth.", left, y)
      y += 6
      doc.text("Kepala Kelurahan " + (user.kelurahan || "-"), left, y)
      y += 6
      doc.text("Kecamatan " + (user.kecamatan || "-"), left, y)
      y += 6
      doc.text("di", left, y)
      doc.text("SEMARANG", left + 25, y)
      y += 10

      doc.setFont("times", "bold")
      doc.text("Bersama ini menerangkan bahwa:", left, y)
      y += 8
      doc.setFont("times", "normal")

      const lines = [
        ["1. Nama", namaWarga],
        ["2. Tempat/Tgl. Lahir", ttl],
        ["3. Kewarganegaraan/Agama", `${row.kewarganegaraan || "-"} / ${row.agama || "-"}`],
        ["4. Status", row.statusKawin || row.status_perkawinan || "-"],
        ["5. Pendidikan terakhir", row.pendidikan || row.pendidikan_terakhir || "-"],
        ["6. Pekerjaan", row.pekerjaan || "-"],
        ["7. Alamat", alamat],
        ["8. No. NIK", nik],
        ["9. Keperluan", keperluan],
        ["10. Keterangan lain-lain", keterangan],
      ]
      lines.forEach(([k, v]) => {
        doc.text(k, left, y)
        doc.text(": " + String(v), left + 45, y)
        y += 6
      })

      y += 10
      doc.text("Demikian untuk menjadikan periksa dan guna seperlunya.", left, y)
      y += 18
      doc.text("Mengetahui", left, y)
      doc.text("Ketua RW. ...................", left, y + 30)
      doc.text(`Ketua RT. ${user.RT || ""} / RW ${user.RW || ""}`, 130, y)
      doc.text("..............................", 130, y + 30)

      doc.save(`surat-pengantar-${namaWarga}.pdf`)
    } catch (e) {
      console.error("[v0] exportPDF error:", e)
      alert("Export PDF gagal. Coba ulangi.")
    }
  }

  // UI
  return (
    <div className="mx-auto w-full max-w-7xl p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card>
          <CardHeader
            title="ANTRIAN PERMOHONAN SURAT WARGA"
            subtitle={`RT ${user.RT || "-"} RW ${user.RW || "-"} Kelurahan ${user.kelurahan || "-"} - ${user.kabupaten_kota || "-"}`}
          />
          <CardBody>
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tahun</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={filter.year}
                  onChange={(e) => setFilter((s) => ({ ...s, year: Number(e.target.value) }))}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Bulan</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={filter.month}
                  onChange={(e) => setFilter((s) => ({ ...s, month: Number(e.target.value) }))}
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={filter.status}
                  onChange={(e) => setFilter((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="keseluruhan">Keseluruhan</option>
                  <option value="baru">Baru</option>
                  <option value="diterima">Diterima</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">View</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={filter.view}
                  onChange={(e) => setFilter((s) => ({ ...s, view: Number(e.target.value) }))}
                >
                  {[25, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Cari</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Cari nama/keperluan/nomor surat…"
                  value={filter.search}
                  onChange={(e) => setFilter((s) => ({ ...s, search: e.target.value }))}
                />
              </div>
            </div>

            {/* <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {loading ? "Memuat…" : `Menampilkan ${filtered.length} dari ${data.length} data`}
              </div>
              <Button onClick={() => setOpenForm(true)}>Buat Permohonan</Button>
            </div> */}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Pemohon</th>
                    <th className="px-3 py-2">Nama Warga</th>
                    <th className="px-3 py-2">Alamat</th>
                    <th className="px-3 py-2">Keperluan</th>
                    <th className="px-3 py-2">Keterangan</th>
                    <th className="px-3 py-2">Tgl Terbit</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">file</th>
                    <th className="px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
  {filtered.map((row) => {
    const tStr = toDateInput(row.tanggal || row.tanggalPermohonan)
    const namaWarga = row.namaWarga || row.nama_warga
    const pemohonNama = row.pemohonUser?.nama || row.pemohon || "-"
    const statusNorm = deriveStatus(row)
    const statusClass =
      statusNorm === "diterima"
        ? "bg-green-100 text-green-700"
        : statusNorm === "ditolak"
        ? "bg-red-100 text-red-700"
        : statusNorm === "selesai"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700"

    return (
      <tr key={row.id} className="text-sm">
        {/* tanggal */}
        <td className="px-3 py-2">{tStr}</td>

        {/* pemohon */}
        <td className="px-3 py-2">{pemohonNama}</td>

        {/* nama warga */}
        <td className="px-3 py-2">{namaWarga}</td>

        {/* alamat */}
        <td className="px-3 py-2">{row.alamat}</td>

        {/* keperluan */}
        <td className="px-3 py-2">
          {row.keperluan === "lain-lain"
            ? row.keperluanLain || row.keperluan_lainnya
            : row.keperluan}
        </td>

        {/* keterangan */}
        <td className="px-3 py-2">
          {row.approvalKeterangan || row.keterangan || "-"}
        </td>

        {/* tanggal terbit */}
        <td className="px-3 py-2">
          {toDateInput(row.tanggalTerbit || row.createdAt?.toDate?.() || "")}
        </td>

        {/* status */}
        <td className="px-3 py-2">
          <span className={`rounded-full px-2 py-1 text-xs ${statusClass}`}>
            {statusNorm}
          </span>
        </td>

        {/* kolom file */}
        <td className="px-3 py-2">
          {row.fileData ? (
            <div className="flex flex-col items-start gap-1">
              <span className="text-green-700 text-sm">📎 {row.fileName}</span>

              {/* tombol lihat */}
              <button
                type="button"
                className="text-blue-600 text-xs underline hover:text-blue-800"
                onClick={() => {
                  const newTab = window.open()
                  if (newTab) {
                    newTab.document.write(
                      `<iframe src="${row.fileData}" width="100%" height="100%" style="border:none;"></iframe>`
                    )
                  }
                }}
              >
                Lihat File
              </button>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Belum ada file</span>
          )}
        </td>

        {/* kolom aksi */}
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => openEdit(row)}>Proses / Edit</SecondaryButton>
            <SecondaryButton onClick={() => exportPDF(row)}>Print</SecondaryButton>
            <SecondaryButton
              onClick={() => handleDelete(row)}
              disabled={row.unggahDone}
            >
              Hapus
            </SecondaryButton>
            <SecondaryButton onClick={() => handleUploadClick(row.id)}>
              {row.fileName ? "Upload Ulang" : "Unggah"}
            </SecondaryButton>
          </div>
        </td>
      </tr>
    )
  })}

  {/* jika tidak ada data */}
  {filtered.length === 0 && !loading ? (
    <tr>
      <td
        className="px-3 py-6 text-center text-sm text-gray-500"
        colSpan={10}
      >
        Tidak ada data
      </td>
    </tr>
  ) : null}
</tbody>

              </table>
              <input
  type="file"
  id="hiddenFileInput"
  className="hidden"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={handleFileSelected}
/>

            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Modal Form */}
      <Modal
        open={openForm}
        onClose={() => {
          setOpenForm(false)
          resetForm()
        }}
        title={editing ? "Edit Permohonan Surat" : "Buat Permohonan Surat"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lokasi */}
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 md:grid-cols-4">
            <div>
              <span className="font-medium text-gray-700">Kota</span>: {user.kabupaten_kota || "-"}
            </div>
            <div>
              <span className="font-medium text-gray-700">Kecamatan</span>: {user.kecamatan || "-"}
            </div>
            <div>
              <span className="font-medium text-gray-700">Kelurahan</span>: {user.kelurahan || "-"}
            </div>
            <div>
              <span className="font-medium text-gray-700">RT/RW</span>: {user.RT || "-"} / {user.RW || "-"}
            </div>
          </div>

          {/* A. Data Permohonan */}
          <Card className="border-gray-200">
            <CardHeader title="A. Data Permohonan" />
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Surat dimohonkan oleh</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.pemohon}
                  onChange={(e) => onChange("pemohon", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tanggal Permohonan</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.tanggalPermohonan}
                  onChange={(e) => onChange("tanggalPermohonan", e.target.value)}
                />
              </div>
            </CardBody>
          </Card>

          {/* B. Data Surat Pengantar */}
{/* B. Data Surat Pengantar */}
<Card>
  <CardHeader title="B. Data Surat Pengantar" />
  <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* Nama Warga */}
    <div>
      <label className="mb-1 block text-sm font-medium">Nama Warga</label>
      <select
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.wargaId}
        onChange={(e) => {
          const id = e.target.value
          const w = wargaData.find((x) => x.id === id)
          onChange("wargaId", id)
          onChange("namaWarga", w?.nama || "")
          onChange("alamat", w?.alamat_tinggal || "")
          onChange("nik", w?.nik || "")
          onChange("ttl", `${w?.tempat_lahir || ""}, ${w?.tanggal_lahir || ""}`)
          onChange("kewarganegaraan", w?.negara || "")
          onChange("agama", w?.agama || "")
          onChange("statusKawin", w?.status_kawin || "")
          onChange("pendidikan", w?.pendidikan || "")
          onChange("pekerjaan", w?.pekerjaan || "")
        }}
      >
        <option value="">-- pilih warga --</option>
        {wargaData.map((w) => (
          <option key={w.id} value={w.id}>
            {w.nama}
          </option>
        ))}
      </select>
    </div>

    {/* Tempat/Tgl Lahir */}
    <div>
      <label className="mb-1 block text-sm font-medium">Tempat/Tgl Lahir</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.ttl}
        onChange={(e) => onChange("ttl", e.target.value)}
      />
    </div>

    {/* Kewarganegaraan / Agama */}
    <div>
      <label className="mb-1 block text-sm font-medium">
        Kewarganegaraan / Agama
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Kewarganegaraan"
          value={form.kewarganegaraan}
          onChange={(e) => onChange("kewarganegaraan", e.target.value)}
        />
        <input
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Agama"
          value={form.agama}
          onChange={(e) => onChange("agama", e.target.value)}
        />
      </div>
    </div>

    {/* Status Kawin */}
    <div>
      <label className="mb-1 block text-sm font-medium">Status Kawin</label>
      <select
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.statusKawin}
        onChange={(e) => onChange("statusKawin", e.target.value)}
      >
        <option value="">-- wajib pilih --</option>
        <option>Belum Kawin</option>
        <option>Kawin</option>
        <option>Janda</option>
        <option>Duda</option>
      </select>
    </div>

    {/* Pendidikan Terakhir */}
    <div>
      <label className="mb-1 block text-sm font-medium">Pendidikan Terakhir</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.pendidikan}
        onChange={(e) => onChange("pendidikan", e.target.value)}
      />
    </div>

    {/* Pekerjaan */}
    <div>
      <label className="mb-1 block text-sm font-medium">Pekerjaan</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.pekerjaan}
        onChange={(e) => onChange("pekerjaan", e.target.value)}
      />
    </div>

    {/* Alamat */}
    <div className="md:col-span-2">
      <label className="mb-1 block text-sm font-medium">Alamat</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.alamat}
        onChange={(e) => onChange("alamat", e.target.value)}
      />
    </div>

    {/* NIK */}
    <div>
      <label className="mb-1 block text-sm font-medium">NIK</label>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.nik}
        onChange={(e) => onChange("nik", e.target.value)}
      />
    </div>

    {/* Keperluan */}
    <div>
      <label className="mb-1 block text-sm font-medium">Keperluan</label>
      <select
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={form.keperluan}
        onChange={(e) => onChange("keperluan", e.target.value)}
      >
        <option value="">-- pilih --</option>
        <option value="pembuatan_ktp">Pembuatan KTP</option>
        <option value="pembuatan_kk">Pembuatan KK</option>
        <option value="permohonan_bantuan">Permohonan Bantuan</option>
        <option value="lain-lain">Lain-lain</option>
      </select>
      {form.keperluan === "lain-lain" ? (
        <input
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Jelaskan keperluan"
          value={form.keperluanLain}
          onChange={(e) => onChange("keperluanLain", e.target.value)}
          required
        />
      ) : null}
    </div>

    {/* Lampiran */}
    <div className="md:col-span-2 grid grid-cols-3 gap-2">
      <div>
        <label className="mb-1 block text-sm font-medium">Lampiran (nama)</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.lampiranNama}
          onChange={(e) => onChange("lampiranNama", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Jumlah</label>
        <input
          type="number"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.lampiranJumlah}
          onChange={(e) => onChange("lampiranJumlah", e.target.value)}
          min={0}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Satuan</label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={form.lampiranSatuan}
          onChange={(e) => onChange("lampiranSatuan", e.target.value)}
        >
          <option value="lembar">Lembar</option>
          <option value="set">Set</option>
          <option value="bendel">Bendel</option>
          <option value="buku">Buku</option>
        </select>
      </div>
    </div>
  </CardBody>
</Card>


{/* C. APPROVED / DITERIMA PAK RT */}
<Card>
  <CardHeader title="C. APPROVED / DITERIMA PAK RT" />
  <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* Status Permohonan */}
    <div>
      <label className="mb-1 block text-sm font-medium">Status Permohonan</label>
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="approvalStatus"
            value="diterima"
            checked={form.approvalStatus === "diterima"}
            onChange={(e) => onChange("approvalStatus", e.target.value)}
          />
          <span>Diterima</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="approvalStatus"
            value="ditolak"
            checked={form.approvalStatus === "ditolak"}
            onChange={(e) => onChange("approvalStatus", e.target.value)}
          />
          <span>Ditolak</span>
        </label>
      </div>
    </div>

    {/* Keterangan (muncul hanya kalau ditolak) */}
    {form.approvalStatus === "ditolak" && (
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">Keterangan</label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          value={form.keterangan}
          onChange={(e) => onChange("keterangan", e.target.value)}
          placeholder="Masukkan alasan penolakan..."
        />
      </div>
    )}

    {/* Kalau diterima, tampilkan field-field lainnya */}
    {form.approvalStatus === "diterima" && (
      <>
        {/* Tanggal Terbit */}
        <div>
          <label className="mb-1 block text-sm font-medium">Tanggal Terbit Surat</label>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.tanggalTerbitSurat || new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange("tanggalTerbitSurat", e.target.value)}
          />
        </div>

        {/* Otomatis Nomor Surat */}
<div>
  <label className="mb-1 block text-sm font-medium">Otomatis Nomor Surat</label>
  <div className="flex gap-4 items-center">
    <label className="flex items-center gap-1">
      <input
        type="radio"
        name="autoNomor"
        value="true"
        checked={Boolean(form.autoNomor) === true}
        onChange={(e) => {
          if (form.nomorLocked) return // jika terkunci, jangan ubah
          onChange("autoNomor", true)
          // generate nomor otomatis langsung jika dipilih
          const romawiBulan = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"]
          const bln = romawiBulan[new Date().getMonth()]
          const thn = new Date().getFullYear()
          const random = String(Math.floor(Math.random() * 99999)).padStart(5, "0")
          const nomor = `${random}/SP/${bln}/${thn}`
          onChange("nomorSurat", nomor)
        }}
        disabled={form.nomorLocked}
      />
      <span>Ya</span>
    </label>
    <label className="flex items-center gap-1">
      <input
        type="radio"
        name="autoNomor"
        value="false"
        checked={Boolean(form.autoNomor) === false}
        onChange={(e) => {
          if (form.nomorLocked) return
          onChange("autoNomor", false)
          onChange("nomorSurat", "")
          setTimeout(() => {
            document.getElementById("manualNomorInput")?.focus()
          }, 100)
        }}
        disabled={form.nomorLocked}
      />
      <span>Tidak</span>
    </label>
    {form.nomorLocked && (
      <span className="ml-2 text-sm text-gray-500">Nomor surat sudah ada — tidak bisa diubah</span>
    )}
  </div>
</div>

{/* Input Nomor Surat */}
{form.autoNomor ? (
  <div>
    <label className="mb-1 block text-sm font-medium">Nomor Surat</label>
    <input
      type="text"
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
      value={form.nomorSurat || ""}
      readOnly
    />
  </div>
) : (
  <div>
    <label className="mb-1 block text-sm font-medium">Nomor Surat (Manual)</label>
    <input
      id="manualNomorInput"
      type="text"
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      value={form.nomorSurat || ""}
      onChange={(e) => {
        if (form.nomorLocked) return // jika terkunci, jangan izinkan edit
        onChange("nomorSurat", e.target.value)
      }}
      placeholder="Masukkan nomor surat manual..."
      readOnly={form.nomorLocked}
    />
  </div>
)}


        {/* Input Nomor Surat */}
        {form.autoNomor === "ya" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Nomor Surat</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
              value={form.nomorSurat || ""}
              readOnly
            />
          </div>
        )}

        {form.autoNomor === "tidak" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Nomor Surat (Manual)</label>
            <input
              id="manualNomorInput"
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.nomorSurat || ""}
              onChange={(e) => onChange("nomorSurat", e.target.value)}
              placeholder="Masukkan nomor surat manual..."
            />
          </div>
        )}

        {/* Perihal Surat */}
        <div>
          <label className="mb-1 block text-sm font-medium">Perihal Surat</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.perihal || "Surat Pengantar"}
            onChange={(e) => onChange("perihal", e.target.value)}
          />
        </div>

        {/* Lampiran */}
        <div>
          <label className="mb-1 block text-sm font-medium">Lampiran</label>
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="lampiran"
                value="ada"
                checked={form.lampiran === "ada"}
                onChange={(e) => onChange("lampiran", e.target.value)}
              />
              <span>Ada</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="lampiran"
                value="tidak"
                checked={form.lampiran === "tidak"}
                onChange={(e) => onChange("lampiran", e.target.value)}
              />
              <span>Tidak Ada</span>
            </label>
          </div>
        </div>

        {/* Jika ada lampiran */}
        {form.lampiran === "ada" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Jumlah Lampiran</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.jumlahLampiran || ""}
                onChange={(e) => onChange("jumlahLampiran", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Satuan Lampiran</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.satuanLampiran || "lembar"}
                onChange={(e) => onChange("satuanLampiran", e.target.value)}
              >
                <option value="lembar">Lembar</option>
                <option value="set">Set</option>
                <option value="bendel">Bendel</option>
                <option value="buku">Buku</option>
              </select>
            </div>
          </div>
        )}
      </>
    )}
  </CardBody>
</Card>



          <div className="flex items-center justify-between">
            <SecondaryButton
              type="button"
              onClick={() => {
                setOpenForm(false)
                resetForm()
              }}
            >
              Batal
            </SecondaryButton>
            <div className="flex gap-2">
              <SecondaryButton
                type="button"
                onClick={async () => {
                  const payload = await genNomorSuratIfNeeded({ ...form })
                  await exportPDF({
                    ...payload,
                    namaWarga: payload.namaWarga || "Nama Warga",
                  })
                }}
              >
                Simpan dan Cetak
              </SecondaryButton>
              <Button type="submit">Simpan</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
