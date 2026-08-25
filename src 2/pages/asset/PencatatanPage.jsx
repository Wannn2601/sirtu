"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, FileText, Edit, Trash2, X, FileSpreadsheet } from "lucide-react"
import Swal from "sweetalert2"
import * as XLSX from "xlsx"
import { getDoc } from "firebase/firestore"

// Firebase imports
import { db } from "../../services/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"

const PencatatanPage = () => {
  // Firestore-backed state (replaces useAppContext)
  const [assetRecordsData, setAssetRecordsData] = useState([])
  const [kelompokAssetsData, setKelompokAssetsData] = useState([])
  const [jenisAssetsData, setJenisAssetsData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState("keseluruhan")
  const [selectedPembukuan, setSelectedPembukuan] = useState("");



  // Sub kegiatan static
  const subKegiatanOptions = [
    { id: "001", nama: "Pembangunan Infrastruktur" },
    { id: "002", nama: "Pemeliharaan Fasilitas" },
    { id: "003", nama: "Pengadaan Peralatan" },
    { id: "004", nama: "Kegiatan Sosial" },
    { id: "005", nama: "Administrasi RT" },
  ]

  // state sub rekening dari context




  // Filter states
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState("keseluruhan")
  const [filterKelompok, setFilterKelompok] = useState("keseluruhan")
  const [filterJenis, setFilterJenis] = useState("keseluruhan")

  // Table states
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortField, setSortField] = useState("tanggal")
  const [sortDirection, setSortDirection] = useState("desc")

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [formData, setFormData] = useState({
  tanggal: new Date().toISOString().split("T")[0],
  jenis_aset: "",
  kelompok_aset: "",
  volume: "",
  satuan: "",
  sumber_anggaran: "anggaran rtku",
  sub_rekening_kegiatan: "",
  nilai_satuan: "", 
  total_nilai: "",
  keterangan: "",
})
  const [wargaData, setWargaData] = useState([]);
useEffect(() => {
  const unsub = onSnapshot(collection(db, "wargaData"), (snapshot) => {
    setWargaData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
  return () => unsub();
}, []);
const [subRekeningData, setSubRekeningData] = useState([])

useEffect(() => {
  const unsub = onSnapshot(collection(db, "subRekeningKegiatan"), (snapshot) => {
    setSubRekeningData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  })
  return () => unsub()
}, [])

const defaultSubRekenings = [
  {
    id: "1.1",
    sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu",
    kelompok_pembukuan: "Rekening Kas",
    pembukuan: "Kas RT",
    id_kelompok: "1",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "1.2",
    sub_rekening_kegiatan: "Iuran Wajib Warga",
    kelompok_pembukuan: "Rekening Kas",
    pembukuan: "Kas RT",
    id_kelompok: "1",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2.1",
    sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu",
    kelompok_pembukuan: "Rekening Kas",
    pembukuan: "Kas PKK",
    id_kelompok: "2",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2.2",
    sub_rekening_kegiatan: "Iuran Wajib PKK",
    kelompok_pembukuan: "Rekening Kas",
    pembukuan: "Kas PKK",
    id_kelompok: "2",
    status: "aktif",
    is_locked: true,
    created_at: new Date().toISOString(),
  },
]

// combine default + firestore
const combinedSubRekening = [...defaultSubRekenings, ...subRekeningData]

const normalize = (val) => {
  if (!val) return ""
  return val.replace(/^Kas\s+/i, "").trim() // buang prefix "Kas " kalau ada
}

const filteredSubRekening = combinedSubRekening.filter(
  (item) =>
    normalize(item.pembukuan) === normalize(formData.sumber_anggaran) &&
    item.status === "aktif"
)




  // hitung otomatis total nilai
useEffect(() => {
  const vol = parseFloat(formData.volume) || 0;
  const satuan = parseFloat(formData.nilai_satuan) || 0;
  const total = vol * satuan;

  setFormData((prev) => ({ ...prev, total_nilai: total }));
}, [formData.volume, formData.nilai_satuan]);


  // Sync data from Firestore in realtime
  useEffect(() => {
    const unsubRecords = onSnapshot(
      collection(db, "assetRecords"),
      (snap) => {
        setAssetRecordsData(snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() })))
      },
      (err) => {
        console.error("assetRecords snapshot error:", err)
      },
    )

    const unsubKelompok = onSnapshot(
      collection(db, "kelompokAssets"),
      (snap) => {
        setKelompokAssetsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error("kelompokAssets snapshot error:", err)
      },
    )

    const unsubJenis = onSnapshot(
      collection(db, "jenisAssets"),
      (snap) => {
        setJenisAssetsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        // console.log("ini adalah jenis dari page pencatatan", snap);
      },
      (err) => {
        console.error("jenisAssets snapshot error:", err)
      },
    )

    return () => {
      try {
        unsubRecords()
      } catch (e) {}
      try {
        unsubKelompok()
      } catch (e) {}
      try {
        unsubJenis()
      } catch (e) {}
    }
  }, [])

  // Firestore CRUD wrappers (used by the UI handlers)
  const addAssetRecord = async (payload) => {
    return addDoc(collection(db, "assetRecords"), payload)
  }

  const updateAssetRecord = async (payload) => {
  if (!payload?.firebaseId) throw new Error("Missing firebaseId for update")
  const { firebaseId, ...data } = payload
  const ref = doc(db, "assetRecords", firebaseId)
  return updateDoc(ref, data)
}


  const deleteAssetRecord = async (id) => {
    if (!id) throw new Error("Missing id for delete")

    console.log("[v0] Deleting asset record with Firebase document ID:", id)
    console.log("[v0] Collection: assetRecords")

    try {
      const ref = doc(db, "assetRecords", id)
      console.log("[v0] Document reference created:", ref.path)

      const docSnap = await getDoc(ref)
      if (!docSnap.exists()) {
        throw new Error(`Document with ID ${id} does not exist in Firestore`)
      }
      console.log("[v0] Document exists, proceeding with delete")
      console.log("[v0] Document data:", docSnap.data())

      await deleteDoc(ref)
      console.log("[v0] Delete operation completed successfully")

      const verifySnap = await getDoc(ref)
      if (verifySnap.exists()) {
        throw new Error("Document still exists after delete operation")
      }
      console.log("[v0] Delete verified - document no longer exists")

      return true
    } catch (error) {
      console.error("[v0] Firebase delete error:", error)
      console.error("[v0] Error code:", error.code)
      console.error("[v0] Error message:", error.message)
      throw error
    }
  }

  const addFinancialRecord = async (payload) => {
    // Save to collection financialRecords
    return addDoc(collection(db, "financialRecords"), payload)
  }

  // Utility to generate record id matching original pattern
  const generateRecordId = (tanggal, subKegiatan, sumberSumberAnggaran) => {
    const date = new Date(tanggal)
    const ddmmyy = date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
      .replace(/\//g, "")

    let idSubKegiatan = "0000"
    if (sumberSumberAnggaran === "anggaran rtku" && subKegiatan) {
      idSubKegiatan = subKegiatan.padStart(4, "0")
    }

    // Generate GGGG (0001-9999)
    const existingRecords = assetRecordsData.filter(
      (record) => record.firebaseId && record.firebaseId.startsWith(`${ddmmyy}.${idSubKegiatan}.2.`),
    )
    const nextNumber = (existingRecords.length + 1).toString().padStart(4, "0")

    return `${ddmmyy}.${idSubKegiatan}.2.${nextNumber}`
  }

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set()
    // Add null check to prevent forEach error
    if (assetRecordsData && Array.isArray(assetRecordsData)) {
      assetRecordsData.forEach((record) => {
        years.add(new Date(record.tanggal).getFullYear().toString())
      })
    }
    return Array.from(years).sort().reverse()
  }, [assetRecordsData])

  // Get filtered jenis assets based on selected kelompok
  const filteredJenisAssets = useMemo(() => {
    if (!jenisAssetsData || !Array.isArray(jenisAssetsData)) return []
    if (filterKelompok === "keseluruhan") return jenisAssetsData
    return jenisAssetsData.filter((jenis) => jenis.kelompok === filterKelompok)
  }, [jenisAssetsData, filterKelompok])

  console.log("ini jenis dari page [pencatatan", jenisAssetsData)

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!assetRecordsData || !Array.isArray(assetRecordsData)) return []

    const filtered = assetRecordsData.filter((record) => {
      const recordDate = new Date(record.tanggal)
      const yearMatch = filterYear === "keseluruhan" || recordDate.getFullYear().toString() === filterYear
      const monthMatch = filterMonth === "keseluruhan" || (recordDate.getMonth() + 1).toString() === filterMonth
      const kelompokMatch = filterKelompok === "keseluruhan" || record.kelompok_aset === filterKelompok
      const jenisMatch = filterJenis === "keseluruhan" || record.jenis_aset === filterJenis

      const searchMatch =
        searchTerm === "" ||
        (record.jenis_aset || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.sumber_anggaran || "").toLowerCase().includes(searchTerm.toLowerCase())

      return yearMatch && monthMatch && kelompokMatch && jenisMatch && searchMatch
    })

    // Sort data by date (newest first)
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === "tanggal") {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      } else if (sortField === "total_nilai") {
        aValue = Number.parseFloat(aValue)
        bValue = Number.parseFloat(bValue)
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [assetRecordsData, filterYear, filterMonth, filterKelompok, filterJenis, searchTerm, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  // Handle form submission
 // Ganti fungsi handleSubmit saat ini dengan yang berikut:
const handleSubmit = async (e) => {
  e.preventDefault()

  const actionText = editingRecord ? "memperbarui" : "menambahkan"

  const result = await Swal.fire({
    title: `Konfirmasi ${editingRecord ? "Update" : "Tambah"}`,
    text: `Apakah Anda yakin ingin ${actionText} data pencatatan ini?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#dc2626",
    confirmButtonText: "Ya, Simpan!",
    cancelButtonText: "Batal",
    customClass: { popup: "max-h-screen overflow-y-auto" },
  })

  if (!result.isConfirmed) return

  try {
    // === buat id & recordData asset ===
    const recordId = editingRecord
      ? editingRecord.id
      : generateRecordId(
          formData.tanggal,
          formData.sub_rekening_kegiatan || formData.sub_rekening_id,
          formData.sumber_anggaran
        )

    const totalNilai =
      (Number.parseFloat(formData.volume || 0) *
        Number.parseFloat(formData.nilai_satuan || 0)) ||
      0

    const recordData = {
      ...formData,
      total_nilai: totalNilai.toString(),
      id: recordId,
    }

    // === siapkan data laporanKeuangan jika sumber Kas RT / Kas PKK ===
    const isKas =
      formData.sumber_anggaran === "Kas RT" ||
      formData.sumber_anggaran === "Kas PKK"

    let laporanKeuanganRecord = null
    if (isKas) {
      const sub =
        combinedSubRekening.find((s) => s.id === formData.sub_rekening_id) || {}
      const uraianVal =
        sub.sub_rekening_kegiatan ||
        formData.sub_rekening_kegiatan ||
        "Transaksi"
      const detailVal = `Pembelian aset: ${formData.jenis_aset || ""} (${
        formData.volume || 0
      } ${formData.satuan || ""})`
      const pengeluaranVal = Number(totalNilai) || 0
      const penerimaanVal = 0

      const pembukuanVal =
        formData.sumber_anggaran === "Kas RT"
          ? "RT"
          : formData.sumber_anggaran === "Kas PKK"
          ? "PKK"
          : formData.sumber_anggaran

      const kategoriVal =
        pembukuanVal === "RT"
          ? "kas_rt"
          : pembukuanVal === "PKK"
          ? "kas_pkk"
          : ""

      laporanKeuanganRecord = {
        tanggal: formData.tanggal,
        uraian: uraianVal,
        detail: detailVal,
        saldo_bulan_lalu: 0,
        penerimaan: penerimaanVal,
        pengeluaran: pengeluaranVal,
        saldo_bulan_ini: 0,
        pembukuan: pembukuanVal,
        kategori: kategoriVal,
        updated_at: new Date().toISOString(),
      }
    }

    // === simpan / update ===
    if (editingRecord) {
      // update asset record
      await updateAssetRecord({
        ...recordData,
        firebaseId: editingRecord.firebaseId,
        laporan_id: editingRecord.laporan_id || null,
      })

      // update laporanKeuangan kalau ada
      if (isKas) {
        let laporanId = editingRecord.laporan_id

        // fallback kalau record lama belum punya laporan_id
        if (!laporanId) {
          const q = query(
            collection(db, "laporanKeuangan"),
            where("tanggal", "==", formData.tanggal),
            where(
              "uraian",
              "==",
              combinedSubRekening.find((s) => s.id === formData.sub_rekening_id)
                ?.sub_rekening_kegiatan || formData.sub_rekening_kegiatan
            )
          )
          const snap = await getDocs(q)
          if (!snap.empty) {
            laporanId = snap.docs[0].id
            // simpan laporan_id ke assetRecords agar ke depan tidak hilang
            await updateAssetRecord({
              firebaseId: editingRecord.firebaseId,
              laporan_id: laporanId,
            })
          }
        }

        if (laporanId) {
          const laporanRef = doc(db, "laporanKeuangan", laporanId)
          await updateDoc(laporanRef, laporanKeuanganRecord)
        }
      }
    } else {
      if (isKas) {
        // buat laporanKeuangan baru
        const laporanRef = await addDoc(
          collection(db, "laporanKeuangan"),
          laporanKeuanganRecord
        )

        // simpan asset record dengan laporan_id
        await addAssetRecord({
          ...recordData,
          laporan_id: laporanRef.id,
        })
      } else {
        await addAssetRecord(recordData)
      }
    }

    await Swal.fire({
      title: "Berhasil!",
      text: editingRecord
        ? "Data pencatatan aset berhasil diperbarui"
        : `Data pencatatan aset berhasil ditambahkan dengan ID: ${recordId}`,
      icon: "success",
      timer: 3000,
      showConfirmButton: false,
      customClass: { popup: "max-h-screen overflow-y-auto" },
    })

    setShowModal(false)
    resetForm()
  } catch (error) {
    console.error("Error saving record:", error)
    await Swal.fire({
      title: "Error!",
      text: "Terjadi kesalahan saat menyimpan data",
      icon: "error",
      customClass: { popup: "max-h-screen overflow-y-auto" },
    })
  }
}


  // Reset form
  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      jenis_aset: "",
      kelompok_aset: "",
      volume: "",
      satuan: "",
      sumber_anggaran: "anggaran rtku",
      sub_rekening_kegiatan: "",
      nilai_satuan: "0",
      total_nilai: "",
      keterangan: "",
    })
    setEditingRecord(null)
  }

  // Handle edit
  const handleEdit = (record) => {
    setFormData(record)
    setEditingRecord(record)
    setShowModal(true)
  }

  const handleDelete = async (firebaseId) => {
    const record = assetRecordsData.find((r) => r.firebaseId === firebaseId)

    console.log("[v0] Delete function called with Firebase ID:", firebaseId)
    console.log("[v0] Found record:", record)
    console.log("[v0] Record Firebase ID:", record?.firebaseId)
    console.log("[v0] Record Custom Asset ID:", record?.id)
    console.log(
      "[v0] All asset records:",
      assetRecordsData.map((r) => ({ firebaseId: r.firebaseId, assetId: r.id })),
    )

    if (!record) {
      await Swal.fire({
        title: "Error",
        text: "Data tidak ditemukan",
        icon: "error",
      })
      return
    }

    // Check if annual report is locked (business rule from image)
    const isLocked = false // This should check actual lock status
    if (isLocked) {
      await Swal.fire({
        title: "Tidak Dapat Dihapus",
        text: "Data tidak dapat dihapus karena laporan tahunan sudah dibuat/lock",
        icon: "warning",
      })
      return
    }

    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus data pencatatan ${record.id || record.firebaseId}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        console.log("[v0] Attempting to delete asset record with Firebase ID:", firebaseId)
        console.log("[v0] Document reference path:", `assetRecords/${firebaseId}`)

        if (!firebaseId || typeof firebaseId !== "string") {
          throw new Error(`Invalid Firebase document ID: ${firebaseId}`)
        }

        await deleteAssetRecord(firebaseId)

        // Delete associated financial record if exists (optional implementation)
        // TODO: if you want to delete corresponding financialRecords, implement query & delete here

        await Swal.fire({
          title: "Berhasil",
          text: "Data pencatatan berhasil dihapus",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        })

        console.log("[v0] Refreshing data after deletion")
      } catch (error) {
        console.error("[v0] Error deleting asset record:", error)
        console.error("[v0] Error details:", error.message)
        await Swal.fire({
          title: "Error",
          text: `Gagal menghapus data: ${error.message}`,
          icon: "error",
        })
      }
    }
  }

  // Export to PDF
  const exportToPDF = () => {
    if (!filteredData || filteredData.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data untuk diekspor",
        icon: "warning",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
      return
    }

    Swal.fire({
      title: "Konfirmasi Export PDF",
      text: "Apakah Anda yakin ingin mengekspor data ke PDF?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const printWindow = window.open("", "_blank")
        const printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Data Pencatatan Aset</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .header { text-align: center; margin-bottom: 20px; }
                .sub-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Data Pencatatan Aset</h2>
                <p>Sistem Informasi RT Terpadu (SIRTU)</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Tanggal
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Jenis
                    </th>
                    <th
                      colSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Asal Aset
                    </th>
                    <th
                      colSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Jumlah
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Keterangan
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                    >
                      Aksi
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Sumber Anggaran
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Nilai Perolehan
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Unit</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Nilai
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredData
                    .map(
                      (record, index) => `
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                        {new Date(record.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">{record.jenis_aset}</td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        {record.sumber_anggaran}
                        {record.sub_rekening_kegiatan && (
                          <div className="text-xs text-gray-500 mt-1">Sub: {record.sub_rekening_kegiatan}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        Rp {Number.parseInt(record.nilai_satuan).toLocaleString("id-ID")}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        {record.volume} {record.satuan}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                        Rp {Number.parseInt(record.total_nilai).toLocaleString("id-ID")}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">{record.keterangan}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.firebaseId)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </body>
          </html>
        `
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()

        Swal.fire({
          title: "Berhasil!",
          text: "Data berhasil diekspor ke PDF",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        })
      }
    })
  }

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data untuk diekspor",
        icon: "warning",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      })
      return
    }

    Swal.fire({
      title: "Konfirmasi Export Excel",
      text: "Apakah Anda yakin ingin mengekspor data ke Excel?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const exportData = filteredData.map((record, index) => ({
          No: index + 1,
          Tanggal: new Date(record.tanggal).toLocaleDateString("id-ID"),
          "Jenis Aset": record.jenis_aset,
          "Asal Aset Sumber Anggaran": record.sumber_anggaran,
          "Asal Aset Nilai Perolehan": record.nilai_satuan,
          "Jumlah Unit": `${record.volume} ${record.satuan}`,
          "Jumlah Nilai": record.total_nilai,
          Keterangan: record.keterangan,
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Data Pencatatan Aset")
        XLSX.writeFile(wb, `Data_Pencatatan_Aset_${new Date().toISOString().split("T")[0]}.xlsx`)

        Swal.fire({
          title: "Berhasil!",
          text: "Data berhasil diekspor ke Excel",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        })
      }
    })
  }

  const handleCancel = () => {
    Swal.fire({
      title: "Konfirmasi Batal",
      text: "Apakah Anda yakin ingin membatalkan? Data yang belum disimpan akan hilang.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Batal!",
      cancelButtonText: "Tidak",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setShowModal(false)
        resetForm()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pencatatan Aset</h1>
          <p className="text-gray-600">Kelola data pencatatan aset RT</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Pencatatan
          </button>
          <button
            onClick={async () => {
              // quick dummy insert for testing
              try {
                await addDoc(collection(db, "assetRecords"), {
                  tanggal: new Date().toISOString().split("T")[0],
                  jenis_aset: "Dummy Aset",
                  kelompok_aset: "dummy_kelompok",
                  volume: "1",
                  satuan: "unit",
                  sumber_anggaran: "hibah",
                  sub_rekening_kegiatan: "",
                  nilai_satuan: "1000",
                  total_nilai: "1000",
                  keterangan: "Data dummy untuk testing",
                })
                Swal.fire("Berhasil", "Data dummy berhasil ditambahkan!", "success")
              } catch (err) {
                console.error(err)
                Swal.fire("Error", "Gagal menambahkan dummy", "error")
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Kirim Dummy
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Pencatatan</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="keseluruhan">Keseluruhan</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
    \n</select>

{/* Jika Hibah Warga */}
{formData.sumber_anggaran === "Hibah Warga" && (
  <div>
    <label className="block text-sm font-medium mb-1">Pilih Warga</label>
    <input
      type="text"
      list="wargaList"
      value={formData.warga_id || ""}
      onChange={(e) => setFormData({ ...formData, warga_id: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Ketik nama warga"
    />
    <datalist id="wargaList">
      {wargaData.map((w) => (
        <option key={w.id} value={w.nama} />
      ))}
    </datalist>
  </div>
)}

{/* Jika Lain-Lain */}
{formData.sumber_anggaran === "Lain-Lain" && (
  <div>
    <label className="block text-sm font-medium mb-1">Keterangan Lain-lain</label>
    <input
      type="text"
      maxLength={100}
      value={formData.keterangan_lain || ""}
      onChange={(e) => setFormData({ ...formData, keterangan_lain: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Isi keterangan lain"
    />
  </div>
)}


          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bulan Pencatatan</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="keseluruhan">Keseluruhan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
    \n</select>

{formData.sumber_anggaran === "Hibah Warga" && (
  <div>
    <label className="block text-sm font-medium mb-1">Pilih Warga</label>
    <select
      value={formData.warga_id}
      onChange={(e) => setFormData({ ...formData, warga_id: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
    >
      <option value="">-- pilih warga --</option>
      {wargaData && wargaData.map((w) => (
        <option key={w.id} value={w.id}>{w.nama}</option>
      ))}
    </select>
  </div>
)}
{formData.sumber_anggaran === "Lain-Lain" && (
  <div>
    <label className="block text-sm font-medium mb-1">Keterangan Lain-lain</label>
    <input
      type="text"
      maxLength={100}
      value={formData.keterangan_lain}
      onChange={(e) => setFormData({ ...formData, keterangan_lain: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Isi keterangan lain"
    />
  </div>
)}

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kelompok Aset</label>
            {/* Filter Kelompok Aset */}
            <select
              value={filterKelompok}
              onChange={(e) => {
                setFilterKelompok(e.target.value)
                setFilterJenis("keseluruhan")
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="keseluruhan">Keseluruhan</option>
              {kelompokAssetsData.map((kelompok) => (
                <option key={kelompok.id} value={kelompok.kelompok}>
                  {kelompok.kelompok}
                </option>
              ))}
            
        
    \n</select>
{formData.sumber_anggaran === "Hibah Warga" && (
  <div>
    <label className="block text-sm font-medium mb-1">Pilih Warga</label>
    <select
      value={formData.warga_id}
      onChange={(e) => setFormData({ ...formData, warga_id: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
    >
      <option value="">-- pilih warga --</option>
      {wargaData && wargaData.map((w) => (
        <option key={w.id} value={w.id}>{w.nama}</option>
      ))}
    </select>
  </div>
)}

{formData.sumber_anggaran === "Lain-Lain" && (
  <div>
    <label className="block text-sm font-medium mb-1">Keterangan Lain-lain</label>
    <input
      type="text"
      maxLength={100}
      value={formData.keterangan_lain}
      onChange={(e) => setFormData({ ...formData, keterangan_lain: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Isi keterangan lain"
    />
  </div>
)}


          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Aset</label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={filterKelompok === "keseluruhan"}
            >
              <option value="keseluruhan">Keseluruhan</option>
              {filteredJenisAssets.map((jenis) => (
                <option key={jenis.id} value={jenis.jenis_aset}>
                  {jenis.jenis_aset}
                </option>
              ))}
            
        
    \n</select>

{formData.sumber_anggaran === "Hibah Warga" && (
  <div>
    <label className="block text-sm font-medium mb-1">Pilih Warga</label>
    <select
      value={formData.warga_id}
      onChange={(e) => setFormData({ ...formData, warga_id: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
    >
      <option value="">-- pilih warga --</option>
      {wargaData && wargaData.map((w) => (
        <option key={w.id} value={w.id}>{w.nama}</option>
      ))}
    </select>
  </div>
)}
{formData.sumber_anggaran === "Lain-Lain" && (
  <div>
    <label className="block text-sm font-medium mb-1">Keterangan Lain-lain</label>
    <input
      type="text"
      maxLength={100}
      value={formData.keterangan_lain}
      onChange={(e) => setFormData({ ...formData, keterangan_lain: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Isi keterangan lain"
    />
  </div>
)}

          </div>
        </div>
      </div>

      {/* Search and Table Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari data pencatatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number.parseInt(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            
    \n</select>

{formData.sumber_anggaran === "Hibah Warga" && (
  <div>
    <label className="block text-sm font-medium mb-1">Pilih Warga</label>
    <select
      value={formData.warga_id}
      onChange={(e) => setFormData({ ...formData, warga_id: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
    >
      <option value="">-- pilih warga --</option>
      {wargaData && wargaData.map((w) => (
        <option key={w.id} value={w.id}>{w.nama}</option>
      ))}
    </select>
  </div>
)}
{formData.sumber_anggaran === "Lain-Lain" && (
  <div>
    <label className="block text-sm font-medium mb-1">Keterangan Lain-lain</label>
    <input
      type="text"
      maxLength={100}
      value={formData.keterangan_lain}
      onChange={(e) => setFormData({ ...formData, keterangan_lain: e.target.value })}
      className="w-full border rounded-lg px-3 py-2"
      placeholder="Isi keterangan lain"
    />
  </div>
)}

          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Tanggal
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Jenis
                </th>
                <th
                  colSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Asal Aset
                </th>
                <th
                  colSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Jumlah
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Keterangan
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Aksi
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                  Sumber Anggaran
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                  Nilai Perolehan
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Unit</th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                  Nilai
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((record, index) => (
                <tr key={record.firebaseId} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                    {new Date(record.tanggal).toLocaleDateString("id-ID")}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm">{record.jenis_aset}</td>
                  <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                    {record.sumber_anggaran}
                    {record.sub_rekening_kegiatan && (
                      <div className="text-xs text-gray-500 mt-1">Sub: {record.sub_rekening_kegiatan}</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                    Rp {Number.parseInt(record.nilai_satuan).toLocaleString("id-ID")}
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                    {record.volume} {record.satuan}
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-sm text-center">
                    Rp {Number.parseInt(record.total_nilai).toLocaleString("id-ID")}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm">{record.keterangan}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.firebaseId)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1} sampai {Math.min(endIndex, filteredData.length)} dari {filteredData.length}{" "}
            data
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ←
            </button>
            <span className="px-3 py-1 text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              →
            </button>
          </div>
        </div>
      </div>

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
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRecord ? "Edit Pencatatan Aset" : "Tambah Pencatatan Aset"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
  {/* Baris 1: Tanggal & Jenis Aset */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tanggal Pencatatan *
      </label>
      <input
        type="date"
        value={formData.tanggal}
        onChange={(e) =>
          setFormData({ ...formData, tanggal: e.target.value })
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Jenis Aset *
      </label>
      <select
        value={formData.jenis_aset_id || ""}
        onChange={(e) => {
          const selectedJenis = jenisAssetsData.find(
            (j) => j.id === e.target.value
          )
          setFormData({
            ...formData,
            jenis_aset_id: selectedJenis?.id || "",
            jenis_aset: selectedJenis?.jenis_aset || "",
            kelompok_aset: selectedJenis?.kelompok || "",
            satuan: selectedJenis?.satuan || "",
          })
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
      >
        <option value="">-- pilih jenis aset --</option>
        {jenisAssetsData.map((jenis) => (
          <option key={jenis.id} value={jenis.id}>
            {jenis.jenis_aset}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Baris 2: Kelompok Aset */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Kelompok Aset
    </label>
    <input
      type="text"
      value={formData.kelompok_aset}
      readOnly
      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
    />
  </div>

  {/* Baris 3: Sumber Perolehan Aset */}
  <div className="border-t pt-4">
    <h3 className="text-lg font-medium text-gray-900 mb-4">
      Sumber Perolehan Aset
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sumber Anggaran *
        </label>
        <select
          value={formData.sumber_anggaran}
          onChange={(e) =>
            setFormData({ ...formData, sumber_anggaran: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">-- pilih sumber --</option>
          <option value="Kas RT">Kas RT</option>
          <option value="Kas PKK">Kas PKK</option>
          <option value="Hibah Warga">Hibah Warga</option>
          <option value="Lain-Lain">Lain-Lain</option>
        </select>
      </div>

      <div>
<label className="block text-sm font-medium text-gray-700 mb-2">
          Sub Rekening Kegiatan *
        </label>        {(formData.sumber_anggaran === "Kas RT" ||
          formData.sumber_anggaran === "Kas PKK") && (
          <select
            value={formData.sub_rekening_id || ""}
            onChange={(e) =>
              setFormData({ ...formData, sub_rekening_id: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- pilih sub kegiatan --</option>
            {filteredSubRekening.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.sub_rekening_kegiatan}
              </option>
            ))}
          </select>
        )}

        {formData.sumber_anggaran === "Hibah Warga" && (
          
          <select
            value={formData.warga_id || ""}
            onChange={(e) =>
              setFormData({ ...formData, warga_id: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- pilih warga --</option>
            {wargaData.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
        )}

        {formData.sumber_anggaran === "Lain-Lain" && (
          <input
            type="text"
            maxLength={100}
            value={formData.keterangan_lain || ""}
            onChange={(e) =>
              setFormData({ ...formData, keterangan_lain: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Isi keterangan lain"
          />
        )}
      </div>
    </div>
  </div>

  {/* Baris 4: Nilai Perolehan Aset */}
  <div className="border-t pt-4">
  <h3 className="text-lg font-medium text-gray-900 mb-4">
    Nilai Perolehan Aset
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Harga Satuan */}
    <div>
  <label className="block text-sm font-medium mb-1">Harga Satuan *</label>
  <input
    type="text"
    value={
      formData.nilai_satuan
        ? Number(formData.nilai_satuan).toLocaleString("id-ID")
        : ""
    }
    onChange={(e) => {
      // Hilangkan semua karakter non-angka
      const raw = e.target.value.replace(/\D/g, "");
      setFormData({ ...formData, nilai_satuan: raw });
    }}
    className="w-full border rounded-lg px-3 py-2 text-right"
    required
  />
  <p className="text-xs text-gray-500 mt-1">Input angka saja, contoh: 3.000</p>
</div>


    {/* Volume */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Banyaknya / Volume *
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={formData.volume}
          onChange={(e) =>
            setFormData({ ...formData, volume: e.target.value })
          }
          className="flex-1 border rounded-lg px-3 py-2 text-right"
          required
        />
        <input
          type="text"
          value={formData.satuan}
          readOnly
          className="w-24 border rounded-lg px-3 py-2 bg-gray-100 text-center"
        />
      </div>
    </div>

    {/* Total Nilai */}
    <div className="md:col-span-2">
      <label className="block text-sm font-medium mb-1">
        Total Nilai Perolehan
      </label>
      <input
        type="text"
        value={Number(formData.total_nilai || 0).toLocaleString("id-ID")}
        readOnly
        className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-right"
      />
    </div>
  </div>
</div>


  {/* Baris 5: Keterangan */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Keterangan
    </label>
    <textarea
      value={formData.keterangan}
      onChange={(e) =>
        setFormData({ ...formData, keterangan: e.target.value })
      }
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      rows={3}
      placeholder="Keterangan tambahan"
    />
  </div>

  {/* Baris 6: Tombol */}
  <div className="flex justify-end gap-3 pt-4 border-t">
    <button
      type="button"
      onClick={handleCancel}
      className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
    </div>
  )
}

export default PencatatanPage
