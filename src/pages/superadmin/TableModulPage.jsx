"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit, Trash2, X, ChevronLeft, ChevronRight, Upload } from "lucide-react"
import Swal from "sweetalert2"
import { useAppState, useAppDispatch, useAppContext } from "../../contexts/AppContext"

const TableModulPage = () => {
  const { state } = useAppState()
  const dispatch = useAppDispatch()
  const { firestoreService, refreshModulesFromFirebase } = useAppContext()

  const modules = state?.modul?.modules || []
  const loading = state?.modul?.loading || false

  const [showModal, setShowModal] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    parent: "none",
    no_urut: "",
    nama_modul: "",
    url: "",
    icon: null,
    status: "aktif",
  })

  const dummyModules = [
    {
      id_menu: "1.00",
      nama_modul: "Dashboard",
      url: "/dashboard",
      id_parent: null,
      icon: "Home",
      status: "aktif",
      no_urut: 1,
    },
    {
      id_menu: "2.00",
      nama_modul: "Superadmin",
      url: "/superadmin",
      id_parent: null,
      icon: "Shield",
      status: "aktif",
      no_urut: 2,
    },
    {
      id_menu: "2.01",
      nama_modul: "Table Modul",
      url: "/superadmin/table-modul",
      id_parent: "2.00",
      icon: "Table",
      status: "aktif",
    },
    {
      id_menu: "2.02",
      nama_modul: "Set Default Akses",
      url: "/superadmin/set-default-akses",
      id_parent: "2.00",
      icon: "Key",
      status: "aktif",
    },
    {
      id_menu: "2.03",
      nama_modul: "Kategori Usia",
      url: "/superadmin/kategori-usia",
      id_parent: "2.00",
      icon: "Calendar",
      status: "aktif",
    },
    {
      id_menu: "2.04",
      nama_modul: "Table Satuan Asset",
      url: "/superadmin/table-satuan-asset",
      id_parent: "2.00",
      icon: "Package",
      status: "aktif",
    },
    {
      id_menu: "2.05",
      nama_modul: "Table Pekerjaan",
      url: "/superadmin/table-pekerjaan",
      id_parent: "2.00",
      icon: "Briefcase",
      status: "aktif",
    },
    {
      id_menu: "3.00",
      nama_modul: "Pengaturan",
      url: "/pengaturan",
      id_parent: null,
      icon: "Settings",
      status: "aktif",
      no_urut: 3,
    },
    {
      id_menu: "3.01",
      nama_modul: "Pembuatan Kelompok Asset",
      url: "/pengaturan/kelompok-asset",
      id_parent: "3.00",
      icon: "Package",
      status: "aktif",
    },
    {
      id_menu: "3.02",
      nama_modul: "Pembuatan Jenis Asset",
      url: "/pengaturan/jenis-asset",
      id_parent: "3.00",
      icon: "Package",
      status: "aktif",
    },
    {
      id_menu: "3.03",
      nama_modul: "Pembuatan Dawis PKK",
      url: "/pengaturan/dawis-pkk",
      id_parent: "3.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "4.00",
      nama_modul: "Secretariat",
      url: "/secretariat",
      id_parent: null,
      icon: "FileText",
      status: "aktif",
      no_urut: 4,
    },
    {
      id_menu: "4.01",
      nama_modul: "Data KK",
      url: "/secretariat/data-kk",
      id_parent: "4.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "4.02",
      nama_modul: "Data Warga",
      url: "/secretariat/data-warga",
      id_parent: "4.00",
      icon: "UserCheck",
      status: "aktif",
    },
    {
      id_menu: "4.03",
      nama_modul: "Pengurus RT",
      url: "/secretariat/pengurus-rt",
      id_parent: "4.00",
      icon: "Building",
      status: "aktif",
    },
    {
      id_menu: "4.04",
      nama_modul: "Pencatatan Surat",
      url: "/secretariat/pencatatan-surat",
      id_parent: "4.00",
      icon: "FileText",
      status: "aktif",
    },
    {
      id_menu: "4.05",
      nama_modul: "Data Anggota Dawis",
      url: "/secretariat/data-anggota-dawis",
      id_parent: "4.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "4.06",
      nama_modul: "Pengguna",
      url: "/secretariat/pengguna",
      id_parent: "4.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "4.07",
      nama_modul: "Kependudukan",
      url: "/secretariat/kependudukan",
      id_parent: "4.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "5.00",
      nama_modul: "Asset",
      url: "/asset",
      id_parent: null,
      icon: "Package",
      status: "aktif",
      no_urut: 5,
    },
    {
      id_menu: "5.01",
      nama_modul: "Pencatatan",
      url: "/asset/pencatatan",
      id_parent: "5.00",
      icon: "Edit",
      status: "aktif",
    },
    {
      id_menu: "5.02",
      nama_modul: "Penghapusan/Mutasi",
      url: "/asset/penghapusan-mutasi",
      id_parent: "5.00",
      icon: "Trash2",
      status: "aktif",
    },
    {
      id_menu: "6.00",
      nama_modul: "eOFFICE Pak RT",
      url: "/eoffice-pak-rt",
      id_parent: null,
      icon: "Briefcase",
      status: "aktif",
      no_urut: 6,
    },
    {
      id_menu: "6.01",
      nama_modul: "Approval Permohonan Dokumen",
      url: "/eoffice-pak-rt/approval-permohonan-dokumen",
      id_parent: "6.00",
      icon: "CheckCircle",
      status: "aktif",
    },
    {
      id_menu: "6.02",
      nama_modul: "Keringanan IUR",
      url: "/eoffice-pak-rt/keringanan-iur",
      id_parent: "6.00",
      icon: "DollarSign",
      status: "aktif",
    },
    {
      id_menu: "6.03",
      nama_modul: "Monitoring RT-Ku",
      url: "/eoffice-pak-rt/monitoring-rt-ku",
      id_parent: "6.00",
      icon: "Monitor",
      status: "aktif",
    },
    {
      id_menu: "6.04",
      nama_modul: "Laporan Tahunan",
      url: "/eoffice-pak-rt/laporan-tahunan",
      id_parent: "6.00",
      icon: "FileText",
      status: "aktif",
    },
    {
      id_menu: "6.05",
      nama_modul: "Set Pengurus RT & PKK",
      url: "/eoffice-pak-rt/set-pengurus-rt-pkk",
      id_parent: "6.00",
      icon: "Users",
      status: "aktif",
    },
    {
      id_menu: "6.06",
      nama_modul: "Buat Rekening Kegiatan",
      url: "/eoffice-pak-rt/buat-rekening-kegiatan",
      id_parent: "6.00",
      icon: "CreditCard",
      status: "aktif",
    },
    {
      id_menu: "6.07",
      nama_modul: "Buat Sub Rekening Kegiatan",
      url: "/eoffice-pak-rt/buat-sub-rekening-kegiatan",
      id_parent: "6.00",
      icon: "CreditCard",
      status: "aktif",
    },
    {
      id_menu: "6.08",
      nama_modul: "Data Hunian",
      url: "/eoffice-pak-rt/data-hunian",
      id_parent: "6.00",
      icon: "Home",
      status: "aktif",
    },
    {
      id_menu: "7.00",
      nama_modul: "Bendahara",
      url: "/bendahara",
      id_parent: null,
      icon: "DollarSign",
      status: "aktif",
      no_urut: 7,
    },
    {
      id_menu: "7.01",
      nama_modul: "Pencatatan/Pembukuan",
      url: "/bendahara/pencatatan-pembukuan",
      id_parent: "7.00",
      icon: "BookOpen",
      status: "aktif",
    },
    {
      id_menu: "7.02",
      nama_modul: "Mutasi/Hutang",
      url: "/bendahara/mutasi-hutang",
      id_parent: "7.00",
      icon: "ArrowRightLeft",
      status: "aktif",
    },
    {
      id_menu: "7.03",
      nama_modul: "IUR-KU",
      url: "/bendahara/iur-ku",
      id_parent: "7.00",
      icon: "Wallet",
      status: "aktif",
    },
    {
      id_menu: "7.04",
      nama_modul: "Set Iuran Warga",
      url: "/bendahara/set-iuran-warga",
      id_parent: "7.00",
      icon: "Settings",
      status: "aktif",
    },
    {
      id_menu: "8.00",
      nama_modul: "Usaha Mandiri",
      url: "/usaha-mandiri",
      id_parent: null,
      icon: "Store",
      status: "aktif",
      no_urut: 8,
    },
    {
      id_menu: "8.01",
      nama_modul: "Penjualan",
      url: "/usaha-mandiri/penjualan",
      id_parent: "8.00",
      icon: "ShoppingCart",
      status: "aktif",
    },
    {
      id_menu: "9.00",
      nama_modul: "Layanan Warga",
      url: "/layanan-warga",
      id_parent: null,
      icon: "Users",
      status: "aktif",
      no_urut: 9,
    },
    {
      id_menu: "9.01",
      nama_modul: "Permohonan Surat",
      url: "/layanan-warga/permohonan-surat",
      id_parent: "9.00",
      icon: "FileText",
      status: "aktif",
    },
    {
      id_menu: "10.00",
      nama_modul: "Pelaporan",
      url: "/pelaporan",
      id_parent: null,
      icon: "BarChart3",
      status: "aktif",
      no_urut: 10,
    },
    {
      id_menu: "10.01",
      nama_modul: "Iuran Warga",
      url: "/pelaporan/iuran-warga",
      id_parent: "10.00",
      icon: "DollarSign",
      status: "aktif",
    },
    {
      id_menu: "10.02",
      nama_modul: "Keuangan",
      url: "/pelaporan/keuangan",
      id_parent: "10.00",
      icon: "TrendingUp",
      status: "aktif",
    },
    {
      id_menu: "10.03",
      nama_modul: "History Warga",
      url: "/pelaporan/history-warga",
      id_parent: "10.00",
      icon: "History",
      status: "aktif",
    },
    {
      id_menu: "10.04",
      nama_modul: "E-Arsip/Agenda Surat",
      url: "/pelaporan/e-arsip-agenda-surat",
      id_parent: "10.00",
      icon: "Archive",
      status: "aktif",
    },
    {
      id_menu: "10.05",
      nama_modul: "Stok Okname Asset",
      url: "/pelaporan/stok-okname-asset",
      id_parent: "10.00",
      icon: "Package",
      status: "aktif",
    },
    {
      id_menu: "11.00",
      nama_modul: "About",
      url: "/about",
      id_parent: null,
      icon: "Info",
      status: "aktif",
      no_urut: 11,
    },
  ]

  const comprehensiveDummyData = {
    users: [
      {
        id: 1,
        username: "superadmin",
        password: "admin123",
        nama: "Super Administrator",
        level: "superadmin",
        status: "aktif",
      },
      { id: 2, username: "pakrt", password: "pakrt123", nama: "Pak RT", level: "pak rt", status: "aktif" },
      {
        id: 3,
        username: "ketuapkk",
        password: "ketuapkk123",
        nama: "Ketua PKK",
        level: "ketua pkk",
        status: "aktif",
      },
      {
        id: 4,
        username: "bendahara",
        password: "bendahara123",
        nama: "Bendahara RT",
        level: "bendahara",
        status: "aktif",
      },
      {
        id: 5,
        username: "pengurus1",
        password: "pengurus123",
        nama: "Pengurus RT 1",
        level: "pengurus",
        status: "aktif",
      },
      { id: 6, username: "warga1", password: "warga123", nama: "Warga 1", level: "warga", status: "aktif" },
    ],
    ageCategories: [
      { id: 1, kategori: "Balita", dari: 0, sampai: 5 },
      { id: 2, kategori: "Anak-anak", dari: 6, sampai: 12 },
      { id: 3, kategori: "Remaja", dari: 13, sampai: 17 },
      { id: 4, kategori: "Dewasa", dari: 18, sampai: 59 },
      { id: 5, kategori: "Lansia", dari: 60, sampai: 100 },
    ],
    kk: [
      {
        id_kk: "A01-01",
        nomor_kk: "3201012345678901",
        nama_kepala_keluarga: "Budi Santoso",
        alamat: "Jl. Mawar No. 1",
        blok_hunian: "A01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-01-15",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_budi_santoso.pdf",
        file_kontrak: null,
        jumlah_warga: 4,
      },
      {
        id_kk: "A01-02",
        nomor_kk: "3201012345678902",
        nama_kepala_keluarga: "Siti Rahayu",
        alamat: "Jl. Mawar No. 2",
        blok_hunian: "A01",
        no_rumah: "2",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-02-10",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_siti_rahayu.pdf",
        file_kontrak: null,
        jumlah_warga: 3,
      },
      {
        id_kk: "A02-01",
        nomor_kk: "3201012345678903",
        nama_kepala_keluarga: "Ahmad Wijaya",
        alamat: "Jl. Melati No. 1",
        blok_hunian: "A02",
        no_rumah: "1",
        status_kk: "Penduduk Tidak Tetap",
        tanggal_daftar_kk: "2023-03-05",
        tanggal_pindah: "2024-03-05",
        keterangan: "Kontrak kerja berakhir",
        file_kk_surat_pengantar: "kk_ahmad_wijaya.pdf",
        file_kontrak: "kontrak_ahmad_wijaya.pdf",
        jumlah_warga: 2,
      },
    ],
    warga: [
      {
        id_warga: "A01-01.01",
        nama: "Budi Santoso",
        nik: "3201011234567890",
        id_kk: "A01-01",
        nama_kepala_keluarga: "Budi Santoso",
        no_kk: "3201012345678901",
        status_kependudukan: "Penduduk Tetap",
        alamat_tinggal: "Jl. Mawar No. 1",
        hubungan_kk: "Kepala Keluarga",
        status_dalam_keluarga: "Suami",
        tempat_lahir: "Jakarta",
        tanggal_lahir: "1985-05-15",
        agama: "Islam",
        pekerjaan: "Pegawai Swasta",
        tanggal_register: "2023-01-15",
        status_domisili: "Tinggal",
        no_telepon: "+628123456789",
        alamat_lain: "",
        tanggal_selesai_tinggal: null,
        status_warga: "Aktif",
      },
      {
        id_warga: "A01-01.02",
        nama: "Sari Santoso",
        nik: "3201011234567891",
        id_kk: "A01-01",
        nama_kepala_keluarga: "Budi Santoso",
        no_kk: "3201012345678901",
        status_kependudukan: "Penduduk Tetap",
        alamat_tinggal: "Jl. Mawar No. 1",
        hubungan_kk: "Istri",
        status_dalam_keluarga: "Istri",
        tempat_lahir: "Bandung",
        tanggal_lahir: "1987-08-20",
        agama: "Islam",
        pekerjaan: "Ibu Rumah Tangga",
        tanggal_register: "2023-01-15",
        status_domisili: "Tinggal",
        no_telepon: "+628123456790",
        alamat_lain: "",
        tanggal_selesai_tinggal: null,
        status_warga: "Aktif",
      },
    ],
    pekerjaan: [
      { id: 1, nama_pekerjaan: "Pegawai Swasta", status: "Aktif" },
      { id: 2, nama_pekerjaan: "PNS", status: "Aktif" },
      { id: 3, nama_pekerjaan: "TNI/POLRI", status: "Aktif" },
      { id: 4, nama_pekerjaan: "Wiraswasta", status: "Aktif" },
      { id: 5, nama_pekerjaan: "Guru", status: "Aktif" },
      { id: 6, nama_pekerjaan: "Dokter", status: "Aktif" },
      { id: 7, nama_pekerjaan: "Perawat", status: "Aktif" },
      { id: 8, nama_pekerjaan: "Petani", status: "Aktif" },
      { id: 9, nama_pekerjaan: "Buruh", status: "Aktif" },
      { id: 10, nama_pekerjaan: "Ibu Rumah Tangga", status: "Aktif" },
    ],
    kelompokAssets: [
      { id: "KLP001", nama: "Peralatan Kantor", keterangan: "Peralatan untuk administrasi RT", status: "Aktif" },
      { id: "KLP002", nama: "Peralatan Kebersihan", keterangan: "Alat-alat kebersihan lingkungan", status: "Aktif" },
      { id: "KLP003", nama: "Peralatan Keamanan", keterangan: "Peralatan untuk keamanan RT", status: "Aktif" },
      { id: "KLP004", nama: "Infrastruktur", keterangan: "Bangunan dan infrastruktur RT", status: "Aktif" },
      { id: "KLP005", nama: "Kendaraan", keterangan: "Kendaraan operasional RT", status: "Aktif" },
    ],
    jenisAssets: [
      {
        id: "JNS001",
        id_jenis_aset: "KLP001.001",
        kelompok_id: "KLP001",
        kelompok_nama: "Peralatan Kantor",
        nama: "Komputer Desktop",
        satuan: "Unit",
        status: "Aktif",
      },
      {
        id: "JNS002",
        id_jenis_aset: "KLP001.002",
        kelompok_id: "KLP001",
        kelompok_nama: "Peralatan Kantor",
        nama: "Printer",
        satuan: "Unit",
        status: "Aktif",
      },
    ],
    iurRates: [
      {
        id: 1,
        bulan_berlaku: "Januari 2025",
        dasar_hukum: "SK RT No. 001/2025",
        besaran_iuran: 15000,
        tanggal_berlaku: "2025-01-01",
        status: "aktif",
      },
      {
        id: 2,
        bulan_berlaku: "Februari 2025",
        dasar_hukum: "SK RT No. 002/2025",
        besaran_iuran: 15000,
        tanggal_berlaku: "2025-02-01",
        status: "aktif",
      },
    ],
  }

  const parentModules = modules.filter((m) => !m.id_parent)

  useEffect(() => {
    const loadModules = async () => {
      try {
        await refreshModulesFromFirebase()
      } catch (error) {
        console.error("Error loading modules:", error)
      }
    }

    loadModules()
  }, [refreshModulesFromFirebase])

  const handleSendDummyData = async () => {
    const result = await Swal.fire({
      title: "Kirim Data Dummy Lengkap",
      text: "Apakah Anda yakin ingin mengirim semua data dummy lengkap ke Firebase? Ini akan mengirim modules, users, KK, warga, assets, dan data lainnya.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kirim Semua",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "Mengirim Data Lengkap...",
          text: "Mohon tunggu, sedang mengirim semua data dummy ke Firebase",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading()
          },
        })

        const allDummyData = {
          modules: dummyModules,
          users: comprehensiveDummyData.users,
          ageCategories: comprehensiveDummyData.ageCategories,
          kkData: comprehensiveDummyData.kk,
          wargaData: comprehensiveDummyData.warga,
          pekerjaan: comprehensiveDummyData.pekerjaan,
          kelompokAssets: comprehensiveDummyData.kelompokAssets,
          jenisAssets: comprehensiveDummyData.jenisAssets,
          iurRates: comprehensiveDummyData.iurRates,
        }

        console.log("[v0] Sending comprehensive dummy data:", allDummyData)
        const results = await firestoreService.syncDummyData(allDummyData)

        let totalSent = 0
        Object.values(results).forEach((collection) => {
          if (Array.isArray(collection)) {
            totalSent += collection.length
          }
        })

        await refreshModulesFromFirebase()

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: `${totalSent} data dummy berhasil dikirim ke Firebase`,
          timer: 3000,
          showConfirmButton: false,
        })
      } catch (error) {
        console.error("Error sending comprehensive dummy data:", error)
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: error.message || "Terjadi kesalahan saat mengirim data dummy",
        })
      }
    }
  }

  useEffect(() => {
    if (modules && modules.length > 0) {
      console.log("First module sample:", modules[0])
    }
  }, [modules])

  useEffect(() => {
    if (formData.parent !== "none" && !editingModule) {
      const parentModule = modules.find((m) => m.id_menu === formData.parent)
      if (parentModule) {
        const parentUrl = parentModule.url.endsWith("/") ? parentModule.url : parentModule.url + "/"

        setFormData((prev) => ({
          ...prev,
          url: parentUrl,
        }))
      }
    }
  }, [formData.parent, modules, editingModule])

  const filteredModules = useMemo(() => {
    if (!modules || modules.length === 0) {
      return []
    }

    const filtered = modules
  .filter((module) => {
    const nama = module?.nama_modul?.toLowerCase() || "";
    const url = module?.url?.toLowerCase() || "";
    const id = module?.id_menu || "";

    return (
      nama.includes(searchTerm.toLowerCase()) ||
      url.includes(searchTerm.toLowerCase()) ||
      id.includes(searchTerm)
    );
  })
  .sort((a, b) => {
    if (a.id_menu !== b.id_menu) {
      return Number.parseInt(a.id_menu) - Number.parseInt(b.id_menu);
    }
    return a.status === "aktif" ? -1 : 1;
  });


    return filtered
  }, [modules, searchTerm])

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedModules = filteredModules.slice(startIndex, startIndex + itemsPerPage)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/svg+xml"]
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          icon: "error",
          title: "Format File Tidak Valid",
          text: "Hanya file gambar (JPG, PNG, GIF, SVG) yang diperbolehkan",
        })
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Terlalu Besar",
          text: "Ukuran file maksimal 2MB",
        })
        return
      }

      setFormData((prev) => ({
        ...prev,
        icon: file,
      }))
    }
  }

  const resetForm = () => {
    setFormData({
      parent: "none",
      no_urut: "",
      nama_modul: "",
      url: "",
      icon: null,
      status: "aktif",
    })
    setEditingModule(null)
  }

  const handleAddModule = () => {
    setShowModal(true)
    resetForm()
  }

  const handleEditModule = (module) => {
    setEditingModule({ ...module, firebaseId: module.id })
    setFormData({
      parent: module.id_parent || "none",
      no_urut: module.no_urut || "",
      nama_modul: module.nama_modul,
      url: module.url,
      icon: module.icon,
      status: module.status,
    })
    setShowModal(true)
  }

  const generateModuleId = () => {
    if (formData.parent === "none") {
      const parentIds = modules
        .filter((m) => !m.id_parent)
        .map((m) => Number.parseInt(m.id_menu))
        .filter((id) => !isNaN(id))
        .sort((a, b) => a - b)

      let nextId = 1
      for (const id of parentIds) {
        if (id === nextId) {
          nextId++
        } else {
          break
        }
      }
      return nextId.toString().padStart(2, "0") + ".00"
    } else {
      const parentId = formData.parent
      const childModules = modules
        .filter((m) => m.id_parent === parentId)
        .map((m) => {
          const parts = m.id_menu.split(".")
          return parts.length > 1 ? Number.parseInt(parts[1]) : 0
        })
        .filter((id) => !isNaN(id))
        .sort((a, b) => a - b)

      let nextSubId = 1
      for (const id of childModules) {
        if (id === nextSubId) {
          nextSubId++
        } else {
          break
        }
      }

      const parentParts = parentId.split(".")
      return parentParts[0] + "." + nextSubId.toString().padStart(2, "0")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nama_modul.trim()) {
      Swal.fire("Error!", "Nama modul wajib diisi!", "error")
      return
    }

    try {
      const moduleData = {
        id_parent: formData.parent === "none" ? null : formData.parent,
        nama_modul: formData.nama_modul,
        url: formData.url,
        icon: formData.icon instanceof File ? formData.icon.name : formData.icon || "Archive",
        status: formData.status,
        no_urut: formData.no_urut || "",
      }

      if (editingModule) {
        if (editingModule.id_parent !== moduleData.id_parent) {
          // Parent changed, update URL and ID based on new parent
          if (moduleData.id_parent) {
            const newParent = modules.find((m) => m.id_menu === moduleData.id_parent)
            if (newParent) {
              const parentUrl = newParent.url.endsWith("/") ? newParent.url : newParent.url + "/"
              const currentModuleName = moduleData.url.split("/").pop() || ""
              moduleData.url = parentUrl + currentModuleName

              // Update module ID to match new parent structure
              const parentParts = newParent.id_menu.split(".")
              const childModules = modules
                .filter((m) => m.id_parent === moduleData.id_parent)
                .map((m) => {
                  const parts = m.id_menu.split(".")
                  return parts.length > 1 ? Number.parseInt(parts[1]) : 0
                })
                .filter((id) => !isNaN(id))
                .sort((a, b) => a - b)

              let nextSubId = 1
              for (const id of childModules) {
                if (id === nextSubId) {
                  nextSubId++
                } else {
                  break
                }
              }

              moduleData.id_menu = parentParts[0] + "." + nextSubId.toString().padStart(2, "0")
            }
          } else {
            // Moving to root level, clean up URL and generate new root ID
            const currentModuleName = moduleData.url.split("/").pop() || ""
            moduleData.url = "/" + currentModuleName

            // Generate new root level ID
            const parentIds = modules
              .filter((m) => !m.id_parent)
              .map((m) => Number.parseInt(m.id_menu))
              .filter((id) => !isNaN(id))
              .sort((a, b) => a - b)

            let nextId = 1
            for (const id of parentIds) {
              if (id === nextId) {
                nextId++
              } else {
                break
              }
            }
            moduleData.id_menu = nextId.toString().padStart(2, "0") + ".00"
          }
        }

        await firestoreService.updateModule(editingModule.id, moduleData)
      } else {
        // Generate ID for new module
        moduleData.id_menu = generateModuleId()
        await firestoreService.addModule(moduleData)
      }

      await refreshModulesFromFirebase()

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("modulesUpdated"))
        // Force complete page refresh to update routing and navigation
        if (editingModule) {
          console.log("[v0] Module parent changed, forcing navigation refresh")
          window.location.reload()
        }
      }, 500)

      setShowModal(false)
      resetForm()

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Modul berhasil ${editingModule ? "diubah" : "ditambahkan"}!`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err) {
      console.error("Error saving module:", err)
      Swal.fire("Error!", err.message, "error")
    }
  }

  const handleDeleteModule = async (module) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus modul "${module.nama_modul}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#22c55e",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        console.log("[v0] Deleting module with Firebase ID:", module.id)
        await firestoreService.deleteModule(module.id)

        await refreshModulesFromFirebase()

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("modulesUpdated"))
        }, 500)

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Modul berhasil dihapus",
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        console.error("[v0] Error deleting module:", error)
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: "Terjadi kesalahan saat menghapus modul",
        })
      }
    }
  }

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Batal",
      text: "Apakah Anda yakin ingin membatalkan? Data yang diinput akan hilang.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Batal",
      cancelButtonText: "Tidak",
    })

    if (result.isConfirmed) {
      setShowModal(false)
      resetForm()
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Table Modul</h1>
            <p className="text-sm md:text-base text-gray-600">Kelola modul dan submenu sistem</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendDummyData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 text-sm md:text-base"
            >
              <Upload className="w-4 h-4" />
              <span>Kirim Data Dummy Lengkap</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddModule}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Modul</span>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari modul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            />
          </div>
          <div className="text-xs md:text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredModules.length)} dari{" "}
            {filteredModules.length} data
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Menu
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Modul
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Parent
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Icon
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {modules.length === 0 ? (
                        <div>
                          <p className="text-lg font-medium">Tidak ada data modul</p>
                          <p className="text-sm mt-1">
                            Klik "Kirim Data Dummy Lengkap" untuk menambah data atau "Tambah Modul" untuk menambah
                            manual
                          </p>
                        </div>
                      ) : (
                        "Tidak ada data yang sesuai dengan pencarian"
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedModules.map((module) => (
                    <motion.tr
                      key={module.id || module.id_menu}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                        {module.id_menu}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {module.nama_modul}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {module.url}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {module.id_parent || "-"}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {module.icon}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            module.status === "aktif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {module.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditModule(module)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? "bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {editingModule ? "Edit Modul" : "Tambah Modul"}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
                    <select
                      name="parent"
                      value={formData.parent}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">None</option>
                      {parentModules.map((module) => (
                        <option key={module.id_menu} value={module.id_menu}>
                          {module.nama_modul}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.parent === "none" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No Urut</label>
                      <input
                        type="number"
                        name="no_urut"
                        value={formData.no_urut}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Modul</label>
                    <input
                      type="text"
                      name="nama_modul"
                      value={formData.nama_modul}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      name="url"
                      value={formData.url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="icon-upload"
                      />
                      <label
                        htmlFor="icon-upload"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500 text-sm">
                          {formData.icon
                            ? formData.icon instanceof File
                              ? formData.icon.name
                              : formData.icon
                            : "Pilih file icon..."}
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, GIF, SVG (Max: 2MB)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="tidak aktif">Tidak Aktif</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TableModulPage
