"use client"

import { createContext, useContext, useReducer, useEffect } from "react"
import { firestoreService, db } from "../services/firebase"
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore"

// Session management utilities
const SESSION_KEY = "sirtu_session"
const SESSION_DURATION = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

const saveSession = (user, userLevel) => {
  const sessionData = {
    user,
    userLevel,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
}

const getSession = () => {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) return null

    const session = JSON.parse(sessionData)
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return session
  } catch (error) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
}

const getInitialAuthState = () => {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      user: null,
      userLevel: "superadmin",
      userPermissions: {}, // Initialize userPermissions
    }
  }

  const session = getSession()
  if (session) {
    return {
      isAuthenticated: true,
      user: session.user,
      userLevel: session.userLevel,
      userPermissions: session.user?.hak_akses || session.user?.permissions || {}, // Load permissions from session
    }
  }

  return {
    isAuthenticated: false,
    user: null,
    userLevel: "superadmin",
    userPermissions: {}, // Initialize userPermissions
  }
}

// Initial state
const initialState = {
  rekeningKegiatan: { data: [] },
  subRekeningKegiatan: { data: [] },
  ageCategories: [],
  dataHunian: [],
  iurPaymentsData: [],

  auth: getInitialAuthState(), // Use session-aware initial state
  ui: {
    sidebarOpen: true,
    currentPage: "dashboard",
    notifications: [],
    loading: false, // Added loading state
    error: null, // Added error state
  },
  user: {
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
  },
  kk: {
    data: [
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
      {
        id_kk: "B01-01",
        nomor_kk: "3201012345678904",
        nama_kepala_keluarga: "Dewi Lestari",
        alamat: "Jl. Anggrek No. 1",
        blok_hunian: "B01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-04-20",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_dewi_lestari.pdf",
        file_kontrak: null,
        jumlah_warga: 5,
      },
      {
        id_kk: "B01-02",
        nomor_kk: "3201012345678905",
        nama_kepala_keluarga: "Rudi Hartono",
        alamat: "Jl. Anggrek No. 2",
        blok_hunian: "B01",
        no_rumah: "2",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-05-12",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_rudi_hartono.pdf",
        file_kontrak: null,
        jumlah_warga: 3,
      },
      {
        id_kk: "B02-01",
        nomor_kk: "3201012345678906",
        nama_kepala_keluarga: "Maya Sari",
        alamat: "Jl. Dahlia No. 1",
        blok_hunian: "B02",
        no_rumah: "1",
        status_kk: "Penduduk Tidak Tetap",
        tanggal_daftar_kk: "2023-06-08",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_maya_sari.pdf",
        file_kontrak: "kontrak_maya_sari.pdf",
        jumlah_warga: 2,
      },
      {
        id_kk: "C01-01",
        nomor_kk: "3201012345678907",
        nama_kepala_keluarga: "Andi Pratama",
        alamat: "Jl. Kenanga No. 1",
        blok_hunian: "C01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-07-15",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_andi_pratama.pdf",
        file_kontrak: null,
        jumlah_warga: 4,
      },
      {
        id_kk: "C01-02",
        nomor_kk: "3201012345678908",
        nama_kepala_keluarga: "Linda Kusuma",
        alamat: "Jl. Kenanga No. 2",
        blok_hunian: "C01",
        no_rumah: "2",
        status_kk: "Pindah Keluar",
        tanggal_daftar_kk: "2023-08-01",
        tanggal_pindah: "2024-08-01",
        keterangan: "Pindah ke kota lain karena pekerjaan",
        file_kk_surat_pengantar: "kk_linda_kusuma.pdf",
        file_kontrak: null,
        jumlah_warga: 3,
      },
      {
        id_kk: "D01-01",
        nomor_kk: "3201012345678909",
        nama_kepala_keluarga: "Hendra Gunawan",
        alamat: "Jl. Cempaka No. 1",
        blok_hunian: "D01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2023-09-10",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_hendra_gunawan.pdf",
        file_kontrak: null,
        jumlah_warga: 2,
      },
      {
        id_kk: "D01-02",
        nomor_kk: "3201012345678910",
        nama_kepala_keluarga: "Ratna Dewi",
        alamat: "Jl. Cempaka No. 2",
        blok_hunian: "D01",
        no_rumah: "2",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2024-01-05",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_ratna_dewi.pdf",
        file_kontrak: null,
        jumlah_warga: 4,
      },
      {
        id_kk: "E01-01",
        nomor_kk: "3201012345678911",
        nama_kepala_keluarga: "Bambang Sutrisno",
        alamat: "Jl. Flamboyan No. 1",
        blok_hunian: "E01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2025-01-10",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_bambang_sutrisno.pdf",
        file_kontrak: null,
        jumlah_warga: 3,
      },
      {
        id_kk: "E01-02",
        nomor_kk: "3201012345678912",
        nama_kepala_keluarga: "Sri Wahyuni",
        alamat: "Jl. Flamboyan No. 2",
        blok_hunian: "E01",
        no_rumah: "2",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2025-02-15",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_sri_wahyuni.pdf",
        file_kontrak: null,
        jumlah_warga: 5,
      },
      {
        id_kk: "E02-01",
        nomor_kk: "3201012345678913",
        nama_kepala_keluarga: "Agus Setiawan",
        alamat: "Jl. Bougenville No. 1",
        blok_hunian: "E02",
        no_rumah: "1",
        status_kk: "Penduduk Tidak Tetap",
        tanggal_daftar_kk: "2025-03-20",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_agus_setiawan.pdf",
        file_kontrak: "kontrak_agus_setiawan.pdf",
        jumlah_warga: 2,
      },
      {
        id_kk: "F01-01",
        nomor_kk: "3201012345678914",
        nama_kepala_keluarga: "Indah Permata",
        alamat: "Jl. Sakura No. 1",
        blok_hunian: "F01",
        no_rumah: "1",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2025-04-05",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_indah_permata.pdf",
        file_kontrak: null,
        jumlah_warga: 4,
      },
      {
        id_kk: "F01-02",
        nomor_kk: "3201012345678915",
        nama_kepala_keluarga: "Dedi Kurniawan",
        alamat: "Jl. Sakura No. 2",
        blok_hunian: "F01",
        no_rumah: "2",
        status_kk: "Penduduk Tetap",
        tanggal_daftar_kk: "2025-05-12",
        tanggal_pindah: null,
        keterangan: "",
        file_kk_surat_pengantar: "kk_dedi_kurniawan.pdf",
        file_kontrak: null,
        jumlah_warga: 3,
      },
    ],
    hunianOptions: [
      { blok: "A01", alamat: "Jl. Mawar", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "A02", alamat: "Jl. Melati", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "B01", alamat: "Jl. Anggrek", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "B02", alamat: "Jl. Dahlia", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "C01", alamat: "Jl. Kenanga", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "C02", alamat: "Jl. Teratai", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "D01", alamat: "Jl. Cempaka", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "D02", alamat: "Jl. Seruni", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "E01", alamat: "Jl. Flamboyan", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "E02", alamat: "Jl. Bougenville", available_numbers: ["1", "2", "3", "4", "5"] },
      { blok: "F01", alamat: "Jl. Sakura", available_numbers: ["1", "2", "3", "4", "5"] },
    ],
  },
  // permissions: {
  //   "1.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: true, warga: true },
  //   "2.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   2.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   2.02: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   2.03: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   2.04: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   2.05: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   "3.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   3.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   3.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   3.03: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   "4.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.02: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.03: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.04: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.05: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.06: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   4.07: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
  //   "5.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   5.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   5.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   "6.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.03: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.04: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.05: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.06: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.07: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   6.08: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
  //   "7.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
  //   7.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
  //   7.02: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
  //   7.03: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
  //   7.04: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
  //   "8.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: false, warga: false },
  //   8.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: false, warga: false },
  //   "9.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: true },
  //   9.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: true },
  //   "10.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   10.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   10.02: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   10.03: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   10.04: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   10.05: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
  //   "11.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: true, warga: true },
  // },
  modul: {
    modules: [],
    loading: false,
    error: null,
  },
  warga: {
    data: [
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
      {
        id_warga: "A01-02.01",
        nama: "Siti Rahayu",
        nik: "3201011234567892",
        id_kk: "A01-02",
        nama_kepala_keluarga: "Siti Rahayu",
        no_kk: "3201012345678902",
        status_kependudukan: "Penduduk Tetap",
        alamat_tinggal: "Jl. Mawar No. 2",
        hubungan_kk: "Kepala Keluarga",
        status_dalam_keluarga: "Ibu",
        tempat_lahir: "Surabaya",
        tanggal_lahir: "1980-12-10",
        agama: "Islam",
        pekerjaan: "Guru",
        tanggal_register: "2023-02-10",
        status_domisili: "Tinggal",
        no_telepon: "+628123456791",
        alamat_lain: "",
        tanggal_selesai_tinggal: null,
        status_warga: "Aktif",
      },
      {
        id_warga: "A02-01.01",
        nama: "Ahmad Wijaya",
        nik: "3201011234567893",
        id_kk: "A02-01",
        nama_kepala_keluarga: "Ahmad Wijaya",
        no_kk: "3201012345678903",
        status_kependudukan: "Penduduk Tidak Tetap",
        alamat_tinggal: "Jl. Melati No. 1",
        hubungan_kk: "Kepala Keluarga",
        status_dalam_keluarga: "Suami",
        tempat_lahir: "Medan",
        tanggal_lahir: "1990-03-25",
        agama: "Islam",
        pekerjaan: "Karyawan Kontrak",
        tanggal_register: "2023-03-05",
        status_domisili: "Tinggal diluar kota/wilayah lain",
        no_telepon: "+628123456792",
        alamat_lain: "Jl. Sudirman No. 123, Jakarta",
        tanggal_selesai_tinggal: "2024-03-05",
        status_warga: "Tidak Aktif",
      },
      {
        id_warga: "B01-01.01",
        nama: "Dewi Lestari",
        nik: "3201011234567894",
        id_kk: "B01-01",
        nama_kepala_keluarga: "Dewi Lestari",
        no_kk: "3201012345678904",
        status_kependudukan: "Penduduk Tetap",
        alamat_tinggal: "Jl. Anggrek No. 1",
        hubungan_kk: "Kepala Keluarga",
        status_dalam_keluarga: "Ibu",
        tempat_lahir: "Yogyakarta",
        tanggal_lahir: "1983-07-12",
        agama: "Kristen",
        pekerjaan: "Dokter",
        tanggal_register: "2023-04-20",
        status_domisili: "Tinggal",
        no_telepon: "+628123456793",
        alamat_lain: "",
        tanggal_selesai_tinggal: null,
        status_warga: "Aktif",
      },
      {
        id_warga: "E01-01.01",
        nama: "Bambang Sutrisno",
        nik: "3201011234567895",
        id_kk: "E01-01",
        nama_kepala_keluarga: "Bambang Sutrisno",
        no_kk: "3201012345678911",
        status_kependudukan: "Penduduk Tetap",
        alamat_tinggal: "Jl. Flamboyan No. 1",
        hubungan_kk: "Kepala Keluarga",
        status_dalam_keluarga: "Suami",
        tempat_lahir: "Semarang",
        tanggal_lahir: "1988-09-18",
        agama: "Islam",
        pekerjaan: "Wiraswasta",
        tanggal_register: "2025-01-10",
        status_domisili: "Tinggal",
        no_telepon: "+628123456794",
        alamat_lain: "",
        tanggal_selesai_tinggal: null,
        status_warga: "Aktif",
      },
    ],
  },
  pekerjaan: {
    data: [
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
      { id: 11, nama_pekerjaan: "Mahasiswa", status: "Aktif" },
      { id: 12, nama_pekerjaan: "Pelajar", status: "Aktif" },
      { id: 13, nama_pekerjaan: "Pensiunan", status: "Aktif" },
      { id: 14, nama_pekerjaan: "Karyawan Kontrak", status: "Aktif" },
      { id: 15, nama_pekerjaan: "Freelancer", status: "Aktif" },
    ],
  },
  pengurusRT: {
    data: [
      {
        id_user: "RT001",
        level: "pak rt",
        kepungurusan: "rt",
        jabatan: "Ketua RT",
        nama_warga: "Budi Santoso",
        alamat: "Jl. Mawar No. 1",
        no_telepon: "+628123456789",
        file_tt: "specimen_rt001.png",
        status: "Aktif",
      },
      {
        id_user: "PKK001",
        level: "ketua pkk",
        kepungurusan: "pkk",
        jabatan: "Ketua PKK",
        nama_warga: "Siti Rahayu",
        alamat: "Jl. Mawar No. 2",
        no_telepon: "+628123456791",
        file_tt: "specimen_pkk001.png",
        status: "Aktif",
      },
      {
        id_user: "SEK001",
        level: "sekretaris",
        kepungurusan: "rt",
        jabatan: "Sekretaris RT",
        nama_warga: "Dewi Lestari",
        alamat: "Jl. Anggrek No. 1",
        no_telepon: "+628123456793",
        file_tt: "specimen_sek001.png",
        status: "Aktif",
      },
      {
        id_user: "BEN001",
        level: "bendahara",
        kepungurusan: "rt",
        jabatan: "Bendahara RT",
        nama_warga: "Ahmad Wijaya",
        alamat: "Jl. Melati No. 1",
        no_telepon: "+628123456792",
        file_tt: "specimen_ben001.png",
        status: "Aktif",
      },
      {
        id_user: "PEN001",
        level: "pengurus",
        kepungurusan: "rt",
        jabatan: "Pengurus Keamanan",
        nama_warga: "Bambang Sutrisno",
        alamat: "Jl. Flamboyan No. 1",
        no_telepon: "+628123456794",
        file_tt: "specimen_pen001.png",
        status: "Aktif",
      },
    ],
  },
  userAccounts: {
    data: [
      {
        id: "ACC001",
        kepala_keluarga: "Budi Santoso",
        alamat: "Jl. Mawar No. 1",
        nama_pemilik_akun: "Budi Santoso",
        jabatan: "Ketua RT",
        level_akun: "pak rt",
        username: "A01",
        password: "pakrt123",
        hak_akses: ["dashboard", "superadmin", "pengaturan", "secretariat", "asset", "eoffice-pak-rt"],
        status: "Aktif",
      },
      {
        id: "ACC002",
        kepala_keluarga: "Siti Rahayu",
        alamat: "Jl. Mawar No. 2",
        nama_pemilik_akun: "Siti Rahayu",
        jabatan: "Ketua PKK",
        level_akun: "ketua pkk",
        username: "A01",
        password: "ketuapkk123",
        hak_akses: ["dashboard", "pengaturan", "secretariat"],
        status: "Aktif",
      },
      {
        id: "ACC003",
        kepala_keluarga: "Dewi Lestari",
        alamat: "Jl. Anggrek No. 1",
        nama_pemilik_akun: "Dewi Lestari",
        jabatan: "Sekretaris RT",
        level_akun: "sekretaris",
        username: "B01",
        password: "sekretaris123",
        hak_akses: ["dashboard", "secretariat"],
        status: "Aktif",
      },
      {
        id: "ACC004",
        kepala_keluarga: "Ahmad Wijaya",
        alamat: "Jl. Melati No. 1",
        nama_pemilik_akun: "Ahmad Wijaya",
        jabatan: "Bendahara RT",
        level_akun: "bendahara",
        username: "A02",
        password: "bendahara123",
        hak_akses: ["dashboard", "bendahara"],
        status: "Aktif",
      },
      {
        id: "ACC005",
        kepala_keluarga: "Bambang Sutrisno",
        alamat: "Jl. Flamboyan No. 1",
        nama_pemilik_akun: "Bambang Sutrisno",
        jabatan: "Pengurus Keamanan",
        level_akun: "pengurus",
        username: "E01",
        password: "pengurus123",
        hak_akses: ["dashboard", "layanan-warga"],
        status: "Aktif",
      },
    ],
  },
  kelompokAssets: {
    data: [
      { id: "KLP001", nama: "Peralatan Kantor", keterangan: "Peralatan untuk administrasi RT", status: "Aktif" },
      { id: "KLP002", nama: "Peralatan Kebersihan", keterangan: "Alat-alat kebersihan lingkungan", status: "Aktif" },
      { id: "KLP003", nama: "Peralatan Keamanan", keterangan: "Peralatan untuk keamanan RT", status: "Aktif" },
      { id: "KLP004", nama: "Infrastruktur", keterangan: "Bangunan dan infrastruktur RT", status: "Aktif" },
      { id: "KLP005", nama: "Kendaraan", keterangan: "Kendaraan operasional RT", status: "Aktif" },
    ],
  },
  satuanAssets: {
    data: [
      { id: "STN001", kelompok: "Unit", keterangan: "Satuan untuk barang per unit", status: "Aktif" },
      { id: "STN002", kelompok: "Set", keterangan: "Satuan untuk barang per set", status: "Aktif" },
      { id: "STN003", kelompok: "Buah", keterangan: "Satuan untuk barang per buah", status: "Aktif" },
      { id: "STN004", kelompok: "Meter", keterangan: "Satuan untuk panjang", status: "Aktif" },
      { id: "STN005", kelompok: "Kg", keterangan: "Satuan untuk berat", status: "Aktif" },
    ],
  },
  jenisAssets: {
    data: [
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
      {
        id: "JNS003",
        id_jenis_aset: "KLP002.001",
        kelompok_id: "KLP002",
        kelompok_nama: "Peralatan Kebersihan",
        nama: "Sapu",
        satuan: "Buah",
        status: "Aktif",
      },
      {
        id: "JNS004",
        id_jenis_aset: "KLP003.001",
        kelompok_id: "KLP003",
        kelompok_nama: "Peralatan Keamanan",
        nama: "CCTV",
        satuan: "Unit",
        status: "Aktif",
      },
      {
        id: "JNS005",
        id_jenis_aset: "KLP004.001",
        kelompok_id: "KLP004",
        kelompok_nama: "Infrastruktur",
        nama: "Pos Keamanan",
        satuan: "Unit",
        status: "Aktif",
      },
    ],
  },
  assetRecords: {
    data: [
      {
        id: "100125.001.2.0001",
        tanggal: "2025-01-10",
        jenis_aset: "JNS001",
        kelompok_aset: "KLP001",
        volume: "2",
        satuan: "Unit",
        sumber_anggaran: "anggaran rtku",
        sub_kegiatan: "001",
        nilai_satuan: "5000000",
        total_nilai: "10000000",
        keterangan: "Pembelian komputer untuk administrasi RT",
      },
      {
        id: "050125.002.2.0001",
        tanggal: "2025-01-05",
        jenis_aset: "JNS002",
        kelompok_aset: "KLP001",
        volume: "1",
        satuan: "Unit",
        sumber_anggaran: "hibah",
        sub_kegiatan: "",
        nilai_satuan: "2000000",
        total_nilai: "2000000",
        keterangan: "Hibah printer dari warga",
      },
      {
        id: "151224.003.2.0001",
        tanggal: "2024-12-15",
        jenis_aset: "JNS003",
        kelompok_aset: "KLP002",
        volume: "10",
        satuan: "Buah",
        sumber_anggaran: "anggaran rtku",
        sub_kegiatan: "002",
        nilai_satuan: "25000",
        total_nilai: "250000",
        keterangan: "Pembelian sapu untuk kebersihan",
      },
      {
        id: "201224.001.2.0002",
        tanggal: "2024-12-20",
        jenis_aset: "JNS004",
        kelompok_aset: "KLP003",
        volume: "4",
        satuan: "Unit",
        sumber_anggaran: "anggaran rtku",
        sub_kegiatan: "001",
        nilai_satuan: "1500000",
        total_nilai: "6000000",
        keterangan: "Instalasi CCTV untuk keamanan",
      },
      {
        id: "081224.0000.2.0001",
        tanggal: "2024-12-08",
        jenis_aset: "JNS005",
        kelompok_aset: "KLP004",
        volume: "1",
        satuan: "Unit",
        sumber_anggaran: "hibah",
        sub_kegiatan: "",
        nilai_satuan: "15000000",
        total_nilai: "15000000",
        keterangan: "Hibah renovasi pos keamanan dari donatur",
      },
    ],
  },
  // Account management data
  rekeningKegiatan: {
    data: [
      // RT Rekening Kegiatan
      {
        id: 1,
        kelompok_pembukuan: "Rekening Kas RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      {
        id: 2,
        kelompok_pembukuan: "Rekening Operasional RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 3,
        kelompok_pembukuan: "Rekening Pembangunan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 4,
        kelompok_pembukuan: "Rekening Keamanan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 5,
        kelompok_pembukuan: "Rekening Sosial RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // PKK Rekening Kegiatan
      {
        id: 6,
        kelompok_pembukuan: "Rekening Kas PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      {
        id: 7,
        kelompok_pembukuan: "Rekening Operasional PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 8,
        kelompok_pembukuan: "Rekening Kegiatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 9,
        kelompok_pembukuan: "Rekening Kesehatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: 10,
        kelompok_pembukuan: "Rekening Pendidikan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
    ],
  },

  subRekeningKegiatan: {
    data: [
      // RT Sub Rekening - Kas
      {
        id: "1.1",
        sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu",
        kelompok_pembukuan: "Rekening Kas RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 1,
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      {
        id: "1.2",
        sub_rekening_kegiatan: "Iuran Wajib Warga RT",
        kelompok_pembukuan: "Rekening Kas RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 1,
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      {
        id: "1.3",
        sub_rekening_kegiatan: "Iuran Sukarela Warga RT",
        kelompok_pembukuan: "Rekening Kas RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 1,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // RT Sub Rekening - Operasional
      {
        id: "2.1",
        sub_rekening_kegiatan: "Pemeliharaan Fasilitas Umum",
        kelompok_pembukuan: "Rekening Operasional RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 2,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "2.2",
        sub_rekening_kegiatan: "Kebersihan Lingkungan",
        kelompok_pembukuan: "Rekening Operasional RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 2,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "2.3",
        sub_rekening_kegiatan: "Administrasi RT",
        kelompok_pembukuan: "Rekening Operasional RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 2,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // RT Sub Rekening - Pembangunan
      {
        id: "3.1",
        sub_rekening_kegiatan: "Pembangunan Sarana RT",
        kelompok_pembukuan: "Rekening Pembangunan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 3,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "3.2",
        sub_rekening_kegiatan: "Renovasi Fasilitas RT",
        kelompok_pembukuan: "Rekening Pembangunan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 3,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // RT Sub Rekening - Keamanan
      {
        id: "4.1",
        sub_rekening_kegiatan: "Sistem Keamanan RT",
        kelompok_pembukuan: "Rekening Keamanan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 4,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "4.2",
        sub_rekening_kegiatan: "Penjagaan Malam",
        kelompok_pembukuan: "Rekening Keamanan RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 4,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // RT Sub Rekening - Sosial
      {
        id: "5.1",
        sub_rekening_kegiatan: "Bantuan Sosial Warga",
        kelompok_pembukuan: "Rekening Sosial RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 5,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "5.2",
        sub_rekening_kegiatan: "Kegiatan 17 Agustus",
        kelompok_pembukuan: "Rekening Sosial RT",
        pembukuan: "RT",
        kepungurusan: "RT",
        kategori: "kas_rt",
        id_kelompok: 5,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // PKK Sub Rekening - Kas
      {
        id: "6.1",
        sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu",
        kelompok_pembukuan: "Rekening Kas PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 6,
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      {
        id: "6.2",
        sub_rekening_kegiatan: "Iuran Wajib PKK",
        kelompok_pembukuan: "Rekening Kas PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 6,
        status: "aktif",
        is_locked: true,
        created_at: "2024-01-01",
      },
      // PKK Sub Rekening - Operasional
      {
        id: "7.1",
        sub_rekening_kegiatan: "Administrasi PKK",
        kelompok_pembukuan: "Rekening Operasional PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 7,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "7.2",
        sub_rekening_kegiatan: "Peralatan PKK",
        kelompok_pembukuan: "Rekening Operasional PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 7,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // PKK Sub Rekening - Kegiatan
      {
        id: "8.1",
        sub_rekening_kegiatan: "Kegiatan Sosial Kemasyarakatan",
        kelompok_pembukuan: "Rekening Kegiatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 8,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "8.2",
        sub_rekening_kegiatan: "Arisan PKK",
        kelompok_pembukuan: "Rekening Kegiatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 8,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // PKK Sub Rekening - Kesehatan
      {
        id: "9.1",
        sub_rekening_kegiatan: "Posyandu Balita",
        kelompok_pembukuan: "Rekening Kesehatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 9,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "9.2",
        sub_rekening_kegiatan: "Posyandu Lansia",
        kelompok_pembukuan: "Rekening Kesehatan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 9,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      // PKK Sub Rekening - Pendidikan
      {
        id: "10.1",
        sub_rekening_kegiatan: "PAUD PKK",
        kelompok_pembukuan: "Rekening Pendidikan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 10,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
      {
        id: "10.2",
        sub_rekening_kegiatan: "Keaksaraan Fungsional",
        kelompok_pembukuan: "Rekening Pendidikan PKK",
        pembukuan: "PKK",
        kepungurusan: "PKK",
        kategori: "kas_pkk",
        id_kelompok: 10,
        status: "aktif",
        is_locked: false,
        created_at: "2024-01-01",
      },
    ],
  },

  dataHunian: {
    data: [
      {
        id: 1,
        blok: "A",
        nomor_rumah: "01",
        alamat: "Jl. Mawar No. 1",
        status_hunian: "Dihuni",
        pemilik: "Budi Santoso",
        penghuni: "Budi Santoso",
        jumlah_penghuni: 4,
        created_at: "2024-01-01",
      },
      {
        id: 2,
        blok: "A",
        nomor_rumah: "02",
        alamat: "Jl. Mawar No. 2",
        status_hunian: "Kosong",
        pemilik: "Siti Aminah",
        penghuni: null,
        jumlah_penghuni: 0,
        created_at: "2024-01-01",
      },
    ],
  },
  // IUR Rates Management
  iurRates: {
    data: [
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
  },

  // IUR Payments Management
  iurPayments: {
    data: [
      {
        id: 1,
        nama_kk: "Budi Santoso",
        alamat: "Jl. Mawar No. 1",
        tahun: 2025,
        payments: {
          januari: { amount: 15000, status: "lunas", tanggal_bayar: "2025-01-15", keringanan: 0 },
          februari: { amount: 15000, status: "lunas", tanggal_bayar: "2025-02-10", keringanan: 0 },
          maret: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          april: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          mei: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juni: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juli: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          agustus: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          september: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          oktober: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          november: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          desember: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
        },
      },
      {
        id: 2,
        nama_kk: "Siti Aminah",
        alamat: "Jl. Melati No. 5",
        tahun: 2025,
        payments: {
          januari: { amount: 12000, status: "lunas", tanggal_bayar: "2025-01-20", keringanan: 20 },
          februari: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          maret: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          april: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          mei: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juni: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juli: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          agustus: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          september: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          oktober: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          november: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          desember: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
        },
      },
      {
        id: 3,
        nama_kk: "Ahmad Rahman",
        alamat: "Jl. Anggrek No. 12",
        tahun: 2025,
        payments: {
          januari: { amount: 15000, status: "lunas", tanggal_bayar: "2025-01-25", keringanan: 0 },
          februari: { amount: 15000, status: "lunas", tanggal_bayar: "2025-02-15", keringanan: 0 },
          maret: { amount: 15000, status: "lunas", tanggal_bayar: "2025-03-10", keringanan: 0 },
          april: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          mei: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juni: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          juli: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          agustus: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          september: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          oktober: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          november: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
          desember: { amount: 15000, status: "belum_bayar", tanggal_bayar: null, keringanan: 0 },
        },
      },
    ],
  },
  laporanKeuangan: {
    data: [
      // RT Data - 2024 - January
      {
        id: 1,
        rekening: "Rekening Kas RT",
        tanggal: "2024-01-01",
        uraian: "Saldo Kas Warga Tahun Lalu",
        detail: "Saldo awal kas RT dari tahun 2023",
        saldo_bulan_lalu: 0,
        penerimaan: 8000000,
        pengeluaran: 0,
        saldo_bulan_ini: 8000000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.1",
        type: "rekening_kegiatan",
      },
      {
        id: 2,
        rekening: "Saldo Kas Warga Tahun Lalu",
        tanggal: "2024-01-01",
        uraian: "Saldo awal kas RT tahun 2024",
        detail: "Transfer saldo dari tahun 2023",
        saldo_bulan_lalu: 0,
        penerimaan: 8000000,
        pengeluaran: 0,
        saldo_bulan_ini: 8000000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.1",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 3,
        rekening: "Saldo Kas Warga Tahun Lalu",
        tanggal: "2024-01-01",
        uraian: "Transfer saldo dari tahun 2023",
        detail: "Pencatatan saldo awal RT",
        saldo_bulan_lalu: 0,
        penerimaan: 8000000,
        pengeluaran: 0,
        saldo_bulan_ini: 8000000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.1",
        type: "transaksi",
      },
      {
        id: 4,
        rekening: "Rekening Kas RT",
        tanggal: "2024-01-15",
        uraian: "Iuran Wajib Warga RT",
        detail: "Penerimaan iuran bulanan warga RT",
        saldo_bulan_lalu: 8000000,
        penerimaan: 3750000,
        pengeluaran: 0,
        saldo_bulan_ini: 11750000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.2",
        type: "rekening_kegiatan",
      },
      {
        id: 5,
        rekening: "Iuran Wajib Warga RT",
        tanggal: "2024-01-15",
        uraian: "Pembayaran iuran bulanan warga RT",
        detail: "Iuran bulan Januari 2024",
        saldo_bulan_lalu: 0,
        penerimaan: 3750000,
        pengeluaran: 0,
        saldo_bulan_ini: 3750000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.2",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 6,
        rekening: "Iuran Wajib Warga RT",
        tanggal: "2024-01-15",
        uraian: "Iuran warga RT bulan Januari",
        detail: "Pembayaran dari 75 KK @ Rp 50.000",
        saldo_bulan_lalu: 0,
        penerimaan: 3750000,
        pengeluaran: 0,
        saldo_bulan_ini: 3750000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.2",
        type: "transaksi",
      },
      {
        id: 7,
        rekening: "Rekening Kas RT",
        tanggal: "2024-01-20",
        uraian: "Iuran Sukarela Warga RT",
        detail: "Penerimaan iuran sukarela untuk kegiatan khusus",
        saldo_bulan_lalu: 11750000,
        penerimaan: 1500000,
        pengeluaran: 0,
        saldo_bulan_ini: 13250000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.3",
        type: "rekening_kegiatan",
      },
      {
        id: 8,
        rekening: "Iuran Sukarela Warga RT",
        tanggal: "2024-01-20",
        uraian: "Iuran sukarela untuk pembangunan",
        detail: "Donasi warga untuk proyek RT",
        saldo_bulan_lalu: 0,
        penerimaan: 1500000,
        pengeluaran: 0,
        saldo_bulan_ini: 1500000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.3",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 9,
        rekening: "Iuran Sukarela Warga RT",
        tanggal: "2024-01-20",
        uraian: "Donasi warga untuk kegiatan RT",
        detail: "Sumbangan sukarela dari 30 KK",
        saldo_bulan_lalu: 0,
        penerimaan: 1500000,
        pengeluaran: 0,
        saldo_bulan_ini: 1500000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.3",
        type: "transaksi",
      },
      // RT Data - 2024 - February
      {
        id: 10,
        rekening: "Rekening Operasional RT",
        tanggal: "2024-02-05",
        uraian: "Pemeliharaan Fasilitas Umum",
        detail: "Pengeluaran untuk pemeliharaan fasilitas RT",
        saldo_bulan_lalu: 13250000,
        penerimaan: 0,
        pengeluaran: 750000,
        saldo_bulan_ini: 12500000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 2,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 2,
        id_sub_rekening: "2.1",
        type: "rekening_kegiatan",
      },
      {
        id: 11,
        rekening: "Pemeliharaan Fasilitas Umum",
        tanggal: "2024-02-05",
        uraian: "Pembelian alat kebersihan dan perbaikan fasilitas",
        detail: "Maintenance rutin fasilitas RT",
        saldo_bulan_lalu: 0,
        penerimaan: 0,
        pengeluaran: 750000,
        saldo_bulan_ini: -750000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 2,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 2,
        id_sub_rekening: "2.1",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 12,
        rekening: "Pemeliharaan Fasilitas Umum",
        tanggal: "2024-02-05",
        uraian: "Pembelian sapu, pel, dan deterjen",
        detail: "Alat kebersihan untuk pos RT",
        saldo_bulan_lalu: 0,
        penerimaan: 0,
        pengeluaran: 450000,
        saldo_bulan_ini: -450000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 2,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 2,
        id_sub_rekening: "2.1",
        type: "transaksi",
      },
      {
        id: 13,
        rekening: "Pemeliharaan Fasilitas Umum",
        tanggal: "2024-02-10",
        uraian: "Perbaikan lampu jalan RT",
        detail: "Ganti lampu yang rusak",
        saldo_bulan_lalu: -450000,
        penerimaan: 0,
        pengeluaran: 300000,
        saldo_bulan_ini: -750000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 2,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 2,
        id_sub_rekening: "2.1",
        type: "transaksi",
      },
      // RT Data - March 2024 - Pembangunan
      {
        id: 20,
        rekening: "Rekening Pembangunan RT",
        tanggal: "2024-03-01",
        uraian: "Pembangunan Sarana RT",
        detail: "Proyek pembangunan pos keamanan",
        saldo_bulan_lalu: 12500000,
        penerimaan: 0,
        pengeluaran: 8000000,
        saldo_bulan_ini: 4500000,
        kategori: "kas_rt",
        tahun: 2024,
        bulan: 3,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 3,
        id_sub_rekening: "3.1",
        type: "rekening_kegiatan",
      },
      // PKK Data - 2024 - January
      {
        id: 14,
        rekening: "Rekening Kas PKK",
        tanggal: "2024-01-01",
        uraian: "Saldo Kas PKK Tahun Lalu",
        detail: "Saldo awal kas PKK dari tahun 2023",
        saldo_bulan_lalu: 0,
        penerimaan: 5000000,
        pengeluaran: 0,
        saldo_bulan_ini: 5000000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.1",
        type: "rekening_kegiatan",
      },
      {
        id: 15,
        rekening: "Saldo Kas PKK Tahun Lalu",
        tanggal: "2024-01-01",
        uraian: "Saldo awal kas PKK tahun 2024",
        detail: "Transfer saldo dari tahun 2023",
        saldo_bulan_lalu: 0,
        penerimaan: 5000000,
        pengeluaran: 0,
        saldo_bulan_ini: 5000000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.1",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 16,
        rekening: "Saldo Kas PKK Tahun Lalu",
        tanggal: "2024-01-01",
        uraian: "Transfer saldo PKK dari tahun 2023",
        detail: "Pencatatan saldo awal PKK",
        saldo_bulan_lalu: 0,
        penerimaan: 5000000,
        pengeluaran: 0,
        saldo_bulan_ini: 5000000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.1",
        type: "transaksi",
      },
      {
        id: 17,
        rekening: "Rekening Kas PKK",
        tanggal: "2024-01-10",
        uraian: "Iuran Wajib PKK",
        detail: "Penerimaan iuran bulanan anggota PKK",
        saldo_bulan_lalu: 5000000,
        penerimaan: 2250000,
        pengeluaran: 0,
        saldo_bulan_ini: 7250000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.2",
        type: "rekening_kegiatan",
      },
      {
        id: 18,
        rekening: "Iuran Wajib PKK",
        tanggal: "2024-01-10",
        uraian: "Iuran bulanan anggota PKK",
        detail: "Iuran PKK bulan Januari 2024",
        saldo_bulan_lalu: 0,
        penerimaan: 2250000,
        pengeluaran: 0,
        saldo_bulan_ini: 2250000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.2",
        type: "sub_rekening_kegiatan",
      },
      {
        id: 19,
        rekening: "Iuran Wajib PKK",
        tanggal: "2024-01-10",
        uraian: "Iuran anggota PKK bulan Januari",
        detail: "Pembayaran dari 45 anggota PKK @ Rp 50.000",
        saldo_bulan_lalu: 0,
        penerimaan: 2250000,
        pengeluaran: 0,
        saldo_bulan_ini: 2250000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.2",
        type: "transaksi",
      },
      // PKK Data - March 2024 - Kesehatan
      {
        id: 21,
        rekening: "Rekening Kesehatan PKK",
        tanggal: "2024-03-15",
        uraian: "Posyandu Balita",
        detail: "Kegiatan posyandu bulanan",
        saldo_bulan_lalu: 7250000,
        penerimaan: 0,
        pengeluaran: 500000,
        saldo_bulan_ini: 6750000,
        kategori: "kas_pkk",
        tahun: 2024,
        bulan: 3,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 9,
        id_sub_rekening: "9.1",
        type: "rekening_kegiatan",
      },
      // 2025 Data - RT
      {
        id: 22,
        rekening: "Rekening Kas RT",
        tanggal: "2025-01-01",
        uraian: "Saldo Kas Warga Tahun Lalu",
        detail: "Saldo awal kas RT dari tahun 2024",
        saldo_bulan_lalu: 0,
        penerimaan: 4500000,
        pengeluaran: 0,
        saldo_bulan_ini: 4500000,
        kategori: "kas_rt",
        tahun: 2025,
        bulan: 1,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 1,
        id_sub_rekening: "1.1",
        type: "rekening_kegiatan",
      },
      // 2025 Data - PKK
      {
        id: 23,
        rekening: "Rekening Kas PKK",
        tanggal: "2025-01-01",
        uraian: "Saldo Kas PKK Tahun Lalu",
        detail: "Saldo awal kas PKK dari tahun 2024",
        saldo_bulan_lalu: 0,
        penerimaan: 6750000,
        pengeluaran: 0,
        saldo_bulan_ini: 6750000,
        kategori: "kas_pkk",
        tahun: 2025,
        bulan: 1,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 6,
        id_sub_rekening: "6.1",
        type: "rekening_kegiatan",
      },
      // Additional comprehensive data for better filtering...
      // Adding more entries to reach 50+ records for robust testing
      {
        id: 24,
        rekening: "Rekening Keamanan RT",
        tanggal: "2025-02-01",
        uraian: "Sistem Keamanan RT",
        detail: "Instalasi CCTV dan sistem alarm",
        saldo_bulan_lalu: 4500000,
        penerimaan: 5000000,
        pengeluaran: 7500000,
        saldo_bulan_ini: 2000000,
        kategori: "kas_rt",
        tahun: 2025,
        bulan: 2,
        pembukuan: "RT",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 4,
        id_sub_rekening: "4.1",
        type: "rekening_kegiatan",
      },
      {
        id: 25,
        rekening: "Rekening Pendidikan PKK",
        tanggal: "2025-02-15",
        uraian: "PAUD PKK",
        detail: "Kegiatan PAUD dan pembelian alat peraga",
        saldo_bulan_lalu: 6750000,
        penerimaan: 1000000,
        pengeluaran: 2500000,
        saldo_bulan_ini: 5250000,
        kategori: "kas_pkk",
        tahun: 2025,
        bulan: 2,
        pembukuan: "PKK",
        jenis_pelaporan: "keseluruhan",
        id_rekening: 10,
        id_sub_rekening: "10.1",
        type: "rekening_kegiatan",
      },
    ],
  },

  laporanIuranWarga: {
    data: [
      {
        id: 1,
        nama_kk: "Budi Santoso",
        alamat: "Jl. Mawar No. 1",
        tahun: 2025,
        pembayaran: {
          januari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-01-05" },
          februari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-02-03" },
          maret: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          april: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          mei: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-05-02" },
          juni: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-06-01" },
          juli: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          agustus: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          september: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-09-05" },
          oktober: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          november: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          desember: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
        },
        total_tunggakan: 90000,
        pembebasan: 0,
      },
      {
        id: 2,
        nama_kk: "Siti Aminah",
        alamat: "Jl. Melati No. 5",
        tahun: 2025,
        pembayaran: {
          januari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-01-10" },
          februari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-02-08" },
          maret: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-03-05" },
          april: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-04-02" },
          mei: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-05-01" },
          juni: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-06-03" },
          juli: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-07-01" },
          agustus: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          september: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          oktober: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          november: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          desember: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
        },
        total_tunggakan: 75000,
        pembebasan: 0,
      },
      {
        id: 3,
        nama_kk: "Ahmad Wijaya",
        alamat: "Jl. Anggrek No. 12",
        tahun: 2025,
        pembayaran: {
          januari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-01-15" },
          februari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-02-12" },
          maret: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-03-10" },
          april: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-04-08" },
          mei: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-05-05" },
          juni: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-06-02" },
          juli: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-07-01" },
          agustus: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-08-03" },
          september: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-09-02" },
          oktober: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-10-01" },
          november: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-11-02" },
          desember: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
        },
        total_tunggakan: 15000,
        pembebasan: 0,
      },
      {
        id: 4,
        nama_kk: "Dewi Sartika",
        alamat: "Jl. Kenanga No. 8",
        tahun: 2025,
        pembayaran: {
          januari: { status: "bebas", jumlah: 0, tanggal_bayar: null },
          februari: { status: "bebas", jumlah: 0, tanggal_bayar: null },
          maret: { status: "bebas", jumlah: 0, tanggal_bayar: null },
          april: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-04-05" },
          mei: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-05-03" },
          juni: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-06-01" },
          juli: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          agustus: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          september: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          oktober: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          november: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          desember: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
        },
        total_tunggakan: 90000,
        pembebasan: 45000,
      },
      {
        id: 5,
        nama_kk: "Rudi Hartono",
        alamat: "Jl. Dahlia No. 15",
        tahun: 2025,
        pembayaran: {
          januari: { status: "lunas", jumlah: 15000, tanggal_bayar: "2025-01-08" },
          februari: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          maret: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          april: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          mei: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          juni: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          juli: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          agustus: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          september: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          oktober: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          november: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
          desember: { status: "tunggak", jumlah: 15000, tanggal_bayar: null },
        },
        total_tunggakan: 165000,
        pembebasan: 0,
      },
    ],
  },
}

// App reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_IUR_PAYMENTS":
      return {
        ...state,
        iurPaymentsData: action.payload, // Corrected path
      }
    case "ADD_IUR_PAYMENT":
      return {
        ...state,
        iurPaymentsData: [...state.iurPaymentsData, action.payload], // Corrected path
      }
    case "UPDATE_IUR_PAYMENT":
      return {
        ...state,
        iurPaymentsData: state.iurPaymentsData.map(
          (
            item, // Corrected path
          ) =>
            item.id === action.payload.rowId
              ? {
                  ...item,
                  payments: {
                    ...item.payments,
                    [action.payload.month]: {
                      ...item.payments[action.payload.month],
                      ...action.payload.paymentData,
                    },
                  },
                }
              : item,
        ),
      }
    case "DELETE_IUR_PAYMENT":
      return {
        ...state,
        iurPaymentsData: state.iurPaymentsData.filter((item) => item.id !== action.payload), // Corrected path
      }
    case "SET_DATA_HUNIAN":
      return {
        ...state,
        dataHunian: {
          ...state.dataHunian,
          data: action.payload,
        },
      }

    case "ADD_DATA_HUNIAN":
      return {
        ...state,
        dataHunian: {
          ...state.dataHunian,
          data: [...state.dataHunian.data, action.payload],
        },
      }

    case "UPDATE_DATA_HUNIAN":
      return {
        ...state,
        dataHunian: {
          ...state.dataHunian,
          data: state.dataHunian.data.map((item) =>
            item.id === action.payload.id ? { ...item, ...action.payload } : item,
          ),
        },
      }

    case "DELETE_DATA_HUNIAN":
      return {
        ...state,
        dataHunian: {
          ...state.dataHunian,
          data: state.dataHunian.data.filter((item) => item.id !== action.payload),
        },
      }
    case "SET_SUB_REKENING_KEGIATAN":
      return {
        ...state,
        subRekeningKegiatan: {
          ...state.subRekeningKegiatan,
          data: action.payload,
        },
      }

    case "ADD_SUB_REKENING_KEGIATAN":
      return {
        ...state,
        subRekeningKegiatan: {
          ...state.subRekeningKegiatan,
          data: [...(state.subRekeningKegiatan?.data || []), action.payload],
        },
      }

    case "UPDATE_SUB_REKENING_KEGIATAN":
      return {
        ...state,
        subRekeningKegiatan: {
          ...state.subRekeningKegiatan,
          data: state.subRekeningKegiatan.data.map((item) => (item.id === action.payload.id ? action.payload : item)),
        },
      }
    case "DELETE_SUB_REKENING_KEGIATAN":
      return {
        ...state,
        subRekeningKegiatan: {
          ...state.subRekeningKegiatan,
          data: state.subRekeningKegiatan.data.filter((item) => item.id !== action.payload),
        },
      }

    case "SET_REKENING_KEGIATAN":
      return {
        ...state,
        rekeningKegiatan: { ...state.rekeningKegiatan, data: action.payload },
      }
    case "ADD_REKENING_KEGIATAN":
      return {
        ...state,
        rekeningKegiatan: {
          ...state.rekeningKegiatan,
          data: [...state.rekeningKegiatan.data, action.payload],
        },
      }
    case "UPDATE_REKENING_KEGIATAN":
      return {
        ...state,
        rekeningKegiatan: {
          ...state.rekeningKegiatan,
          data: state.rekeningKegiatan.data.map((item) => (item.id === action.payload.id ? action.payload : item)),
        },
      }
    case "DELETE_REKENING_KEGIATAN":
      return {
        ...state,
        rekeningKegiatan: {
          ...state.rekeningKegiatan,
          data: state.rekeningKegiatan.data.filter((item) => item.id !== action.payload),
        },
      }
    case "SET_AUTH":
      return {
        ...state,
        auth: action.payload,
      }
    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      }
    case "SET_FIREBASE_DATA":
      console.log("[v0] Reducer: SET_FIREBASE_DATA payload:", action.payload)
      const newState = {
        ...state,
        ...action.payload,
        ui: { ...state.ui, loading: false },
      }
      console.log("[v0] Reducer: New state modul:", state.modul)
      console.log("[v0] Reducer: New modules count:", state.modul?.modules?.length || 0)
      return { ...newState }
    case "SET_LOADING":
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload },
      }
    case "TOGGLE_SIDEBAR":
      return {
        ...state,
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
      }
    case "SET_MODULES":
      console.log("[v0] Reducer: SET_MODULES with", action.payload?.length || 0, "modules")
      console.log("[v0] Reducer: payload data:", action.payload)
      const updatedState = {
        ...state,
        modul: {
          ...state.modul,
          modules: action.payload || [],
          loading: false,
          error: null,
        },
      }
      console.log("[v0] Reducer: new modul state:", updatedState.modul)
      console.log("[v0] Reducer: new modules count:", updatedState.modul.modules.length)
      return updatedState
    case "UPDATE_PERMISSIONS":
      return {
        ...state,
        permissions: action.payload,
      }
    case "UPDATE_USER_PERMISSIONS":
      return {
        ...state,
        userPermissions: action.payload,
      }
    case "SET_USER":
      return { ...state, user: action.payload }
    case "SET_AGE_CATEGORIES":
      return {
        ...state,
        ageCategories: action.payload,
      }
    case "ADD_AGE_CATEGORY":
      return {
        ...state,
        ageCategories: [...state.ageCategories, action.payload],
      }
    case "UPDATE_AGE_CATEGORY":
      return {
        ...state,
        ageCategories: state.ageCategories.map((cat) => (cat.id === action.payload.id ? action.payload : cat)),
      }
    case "DELETE_AGE_CATEGORY":
      return {
        ...state,
        ageCategories: state.ageCategories.filter((cat) => cat.id !== action.payload),
      }
    case "SET_KK_DATA":
      return {
        ...state,
        kk: {
          // Corrected path
          ...state.kk,
          data: action.payload,
        },
      }
    case "ADD_KK":
      return {
        ...state,
        kk: {
          // Corrected path
          ...state.kk,
          data: [...(state.kk?.data || []), action.payload],
        },
      }
    case "UPDATE_KK":
      return {
        ...state,
        kk: {
          // Corrected path
          ...state.kk,
          data: (state.kk?.data || []).map((kk) => (kk.id === action.payload.id ? action.payload : kk)),
        },
      }
    case "DELETE_KK":
      return {
        ...state,
        kk: {
          // Corrected path
          ...state.kk,
          data: (state.kk?.data || []).filter((kk) => kk.id !== action.payload),
        },
      }

    // Add cases for other data types if needed, e.g., warga, pekerjaan, etc.
    case "SET_WARGA_DATA":
      return {
        ...state,
        warga: { ...state.warga, data: action.payload },
      }
    case "ADD_WARGA":
      return {
        ...state,
        warga: { ...state.warga, data: [...state.warga.data, action.payload] },
      }
    case "UPDATE_WARGA":
      return {
        ...state,
        warga: {
          ...state.warga,
          data: state.warga.data.map((warga) => (warga.id_warga === action.payload.id_warga ? action.payload : warga)),
        },
      }
    case "DELETE_WARGA":
      return {
        ...state,
        warga: { ...state.warga, data: state.warga.data.filter((warga) => warga.id_warga !== action.payload) },
      }
    case "SET_PEKERJAAN_DATA":
      return {
        ...state,
        pekerjaan: { ...state.pekerjaan, data: action.payload },
      }
    case "ADD_PEKERJAAN":
      return {
        ...state,
        pekerjaan: { ...state.pekerjaan, data: [...state.pekerjaan.data, action.payload] },
      }
    case "UPDATE_PEKERJAAN":
      return {
        ...state,
        pekerjaan: {
          ...state.pekerjaan,
          data: state.pekerjaan.data.map((p) => (p.id === action.payload.id ? action.payload : p)),
        },
      }
    case "DELETE_PEKERJAAN":
      return {
        ...state,
        pekerjaan: { ...state.pekerjaan, data: state.pekerjaan.data.filter((p) => p.id !== action.payload) },
      }
    case "SET_PENGURUS_RT_DATA":
      return {
        ...state,
        pengurusRT: { ...state.pengurusRT, data: action.payload },
      }
    case "ADD_PENGURUS_RT":
      return {
        ...state,
        pengurusRT: { ...state.pengurusRT, data: [...state.pengurusRT.data, action.payload] },
      }
    case "UPDATE_PENGURUS_RT":
      return {
        ...state,
        pengurusRT: {
          ...state.pengurusRT,
          data: state.pengurusRT.data.map((p) => (p.id_user === action.payload.id_user ? action.payload : p)),
        },
      }
    case "DELETE_PENGURUS_RT":
      return {
        ...state,
        pengurusRT: { ...state.pengurusRT, data: state.pengurusRT.data.filter((p) => p.id_user !== action.payload) },
      }
    case "SET_USER_ACCOUNTS_DATA":
      return {
        ...state,
        userAccounts: { ...state.userAccounts, data: action.payload },
      }
    case "ADD_USER_ACCOUNT":
      return {
        ...state,
        userAccounts: { ...state.userAccounts, data: [...state.userAccounts.data, action.payload] },
      }
    case "UPDATE_USER_ACCOUNT":
      return {
        ...state,
        userAccounts: {
          ...state.userAccounts,
          data: state.userAccounts.data.map((ua) => (ua.id === action.payload.id ? action.payload : ua)),
        },
      }
    case "DELETE_USER_ACCOUNT":
      return {
        ...state,
        userAccounts: { ...state.userAccounts, data: state.userAccounts.data.filter((ua) => ua.id !== action.payload) },
      }
    case "SET_KELUPOK_ASSET_DATA":
      return {
        ...state,
        kelompokAssets: { ...state.kelompokAssets, data: action.payload },
      }
    case "ADD_KELUPOK_ASSET":
      return {
        ...state,
        kelompokAssets: { ...state.kelompokAssets, data: [...state.kelompokAssets.data, action.payload] },
      }
    case "UPDATE_KELUPOK_ASSET":
      return {
        ...state,
        kelompokAssets: {
          ...state.kelompokAssets,
          data: state.kelompokAssets.data.map((ka) => (ka.id === action.payload.id ? action.payload : ka)),
        },
      }
    case "DELETE_KELUPOK_ASSET":
      return {
        ...state,
        kelompokAssets: {
          ...state.kelompokAssets,
          data: state.kelompokAssets.data.filter((ka) => ka.id !== action.payload),
        },
      }
    case "SET_SATUAN_ASSET_DATA":
      return {
        ...state,
        satuanAssets: { ...state.satuanAssets, data: action.payload },
      }
    case "ADD_SATUAN_ASSET":
      return {
        ...state,
        satuanAssets: { ...state.satuanAssets, data: [...state.satuanAssets.data, action.payload] },
      }
    case "UPDATE_SATUAN_ASSET":
      return {
        ...state,
        satuanAssets: {
          ...state.satuanAssets,
          data: state.satuanAssets.data.map((sa) => (sa.id === action.payload.id ? action.payload : sa)),
        },
      }
    case "DELETE_SATUAN_ASSET":
      return {
        ...state,
        satuanAssets: { ...state.satuanAssets, data: state.satuanAssets.data.filter((sa) => sa.id !== action.payload) },
      }
    case "SET_JENIS_ASSET_DATA":
      return {
        ...state,
        jenisAssets: { ...state.jenisAssets, data: action.payload },
      }
    case "ADD_JENIS_ASSET":
      return {
        ...state,
        jenisAssets: { ...state.jenisAssets, data: [...state.jenisAssets.data, action.payload] },
      }
    case "UPDATE_JENIS_ASSET":
      return {
        ...state,
        jenisAssets: {
          ...state.jenisAssets,
          data: state.jenisAssets.data.map((ja) => (ja.id === action.payload.id ? action.payload : ja)),
        },
      }
    case "DELETE_JENIS_ASSET":
      return {
        ...state,
        jenisAssets: { ...state.jenisAssets, data: state.jenisAssets.data.filter((ja) => ja.id !== action.payload) },
      }
    case "SET_ASSET_RECORDS_DATA":
      return {
        ...state,
        assetRecords: { ...state.assetRecords, data: action.payload },
      }
    case "ADD_ASSET_RECORD":
      return {
        ...state,
        assetRecords: { ...state.assetRecords, data: [...state.assetRecords.data, action.payload] },
      }
    case "UPDATE_ASSET_RECORD":
      return {
        ...state,
        assetRecords: {
          ...state.assetRecords,
          data: state.assetRecords.data.map((ar) => (ar.id === action.payload.id ? action.payload : ar)),
        },
      }
    case "DELETE_ASSET_RECORD":
      return {
        ...state,
        assetRecords: { ...state.assetRecords, data: state.assetRecords.data.filter((ar) => ar.id !== action.payload) },
      }
    case "UPDATE_LAPORAN_KEUANGAN":
      return {
        ...state,
        laporanKeuangan: { ...state.laporanKeuangan, data: action.payload },
      }
    case "UPDATE_LAPORAN_IURAN_WARGA":
      return {
        ...state,
        laporanIuranWarga: { ...state.laporanIuranWarga, data: action.payload },
      }
    case "SET_MODULES_LOADING":
      return {
        ...state,
        modul: { ...state.modul, loading: action.payload },
      }
    case "SET_MODULES_ERROR":
      return {
        ...state,
        modul: { ...state.modul, error: action.payload, loading: false },
      }
    case "LOGOUT": // Added LOGOUT case
      return {
        ...state,
        auth: {
          isAuthenticated: false,
          user: null,
          userLevel: "superadmin",
          userPermissions: {},
        },
        userPermissions: {}, // Clear user permissions on logout
      }
    case "SET_ERROR":
      return {
        ...state,
        ui: { ...state.ui, error: action.payload, loading: false },
      }
    default:
      return state
  }
}

// Create contexts
const AppStateContext = createContext()
const AppDispatchContext = createContext()

export const addIurPaymentFirestore = async (newData) => {
  const ref = doc(collection(db, "iurPayments"))
  await setDoc(ref, newData)
  return ref.id
}

export const updateIurPaymentFirestore = async (rowId, month, paymentData) => {
  const ref = doc(db, "iurPayments", rowId.toString())
  await updateDoc(ref, {
    [`payments.${month}`]: paymentData,
  })
}

export const deleteIurPaymentFirestore = async (id) => {
  await deleteDoc(doc(db, "iurPayments", id.toString()))
}

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Check for existing user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        dispatch({ type: "LOGIN_SUCCESS", payload: user })
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("user")
        dispatch({ type: "LOGOUT" })
      }
    } else {
      dispatch({ type: "LOGOUT" })
    }
  }, [])

  // Load modules and permissions
  useEffect(() => {
    const unsubModules = onSnapshot(
      collection(db, "modules"),
      (snapshot) => {
        const modules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        dispatch({ type: "SET_MODULES", payload: modules })
      },
      (error) => {
        console.error("Error loading modules:", error)
      },
    )

    const unsubPermissions = onSnapshot(
      doc(db, "permissions", "default"),
      (snapshot) => {
        if (snapshot.exists()) {
          dispatch({ type: "SET_PERMISSIONS", payload: snapshot.data() })
        }
      },
      (error) => {
        console.error("Error loading permissions:", error)
      },
    )

    return () => {
      unsubModules()
      unsubPermissions()
    }
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "permissions", "default"), (snap) => {
      if (snap.exists()) {
        dispatch({ type: "UPDATE_PERMISSIONS", payload: snap.data() })
      }
    })
    return () => unsub()
  }, [dispatch])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "iurPayments"), (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      dispatch({ type: "SET_IUR_PAYMENTS", payload: payments })
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "hunian"), (snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log("🔥 realtime hunian:", results)
      dispatch({ type: "SET_DATA_HUNIAN", payload: results })
    })

    return () => unsubscribe()
  }, [dispatch])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await firestoreService.getAll("subRekeningKegiatan")
        dispatch({ type: "SET_SUB_REKENING_KEGIATAN", payload: data })
      } catch (err) {
        console.error("Gagal ambil data:", err)
      }
    }
    fetchData()
  }, [dispatch])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rekeningKegiatan"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      dispatch({ type: "SET_REKENING_KEGIATAN", payload: data })
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("[v0] AppContext: Initializing app...")

        // Test Firebase connection first
        const isConnected = await firestoreService.testFirebaseConnection()
        console.log("[v0] AppContext: Firebase connection test result:", isConnected)

        if (isConnected) {
          // Load modules automatically on app start
          console.log("[v0] AppContext: Loading modules on app initialization...")
          await refreshModulesFromFirebase()
        } else {
          console.error("[v0] AppContext: Cannot load modules - Firebase connection failed")
        }
      } catch (error) {
        console.error("[v0] AppContext: Error during app initialization:", error)
      }
    }

    initializeApp()
  }, []) // Run once on mount

  useEffect(() => {
    let unsubscribe = null

    const setupFirebaseListener = async () => {
      try {
        console.log("[v0] Setting up Firebase real-time listener...")

        // Test connection first
        const isConnected = await firestoreService.testFirebaseConnection()
        if (!isConnected) {
          console.error("[v0] Firebase connection failed")
          return
        }

        // Set up real-time listener for modules collection
        const { onSnapshot, collection } = await import("firebase/firestore")
        const modulesRef = collection(firestoreService.db, "modules")

        unsubscribe = onSnapshot(
          modulesRef,
          (snapshot) => {
            console.log("[v0] Firebase modules collection changed, updating state...")
            const updatedModules = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
              .filter((module) => module && module.id_menu) // Filter out invalid modules
              .sort((a, b) => {
                return Number.parseFloat(a.id_menu || 0) - Number.parseFloat(b.id_menu || 0)
              })

            console.log("[v0] Real-time update: received", updatedModules.length, "modules")
            console.log("[v0] Sample modules:", updatedModules.slice(0, 2))

            dispatch({
              type: "SET_MODULES",
              payload: updatedModules,
            })
          },
          (error) => {
            console.error("[v0] Firebase listener error:", error)
            dispatch(setError("Gagal mendengarkan perubahan data Firebase"))
          },
        )
      } catch (error) {
        console.error("[v0] Error setting up Firebase listener:", error)
        dispatch(setError("Gagal terhubung ke Firebase"))
      }
    }

    // Only setup listener after initial load
    const timer = setTimeout(setupFirebaseListener, 1000)

    return () => {
      clearTimeout(timer)
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const refreshModulesFromFirebase = () => async (dispatch) => {
    console.log("[v0] AppContext: Starting refreshModulesFromFirebase")
    dispatch({ type: "SET_MODULES_LOADING", payload: true })
    try {
      const snapshot = await firestoreService.getModules()
      const modules = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log("[v0] AppContext: Fetched modules from Firebase:", modules.length)
      console.log("[v0] AppContext: Sample modules:", modules.slice(0, 3))

      dispatch({ type: "SET_MODULES", payload: modules })
    } catch (error) {
      console.error("Error fetching modules:", error)
      dispatch({ type: "SET_MODULES_ERROR", payload: error.message })
    } finally {
      dispatch({ type: "SET_MODULES_LOADING", payload: false })
    }
  }

  const loginWithFirebase = async (username, password) => {
    try {
      console.log("[v0] AppContext: Attempting Firebase login...")
      dispatch(setLoading(true))

      // Query users collection to find matching user
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("username", "==", username), where("password", "==", password)),
      )

      if (usersSnapshot.empty) {
        throw new Error("Username atau password salah")
      }

      const userDoc = usersSnapshot.docs[0]
      const userData = { id: userDoc.id, ...userDoc.data() }

      // Save user to localStorage
      localStorage.setItem("user", JSON.stringify(userData))

      const authData = {
        isAuthenticated: true,
        user: userData,
        userLevel: userData.level_akun || userData.level || "superadmin",
        userPermissions: userData.hak_akses || userData.permissions || {},
      }

      dispatch({
        type: "SET_AUTH",
        payload: authData,
      })

      dispatch({
        type: "UPDATE_USER_PERMISSIONS",
        payload: userData.hak_akses || userData.permissions || {},
      })

      // Save session
      saveSession(userData, userData.level_akun || userData.level || "superadmin")

      console.log("[v0] AppContext: Login successful")
      return userData // Return userData as per the update
    } catch (error) {
      console.error("[v0] AppContext: Login error:", error)
      dispatch(setError(error.message)) // Set error message
      throw error // Re-throw error as per the update
    } finally {
      dispatch(setLoading(false))
    }
  }

  const syncDummyDataToFirebase = async () => {
    try {
      console.log("[v0] AppContext: Syncing dummy data to Firebase...")
      dispatch(setLoading(true))

      // Prepare dummy data from initial state
      const dummyData = {
        users: initialState.user.users,
        modules: [], // We'll use Firebase modules instead
        ageCategories: initialState.user.ageCategories,
        kkData: initialState.kk.data,
        wargaData: initialState.warga.data,
        pengurusRT: initialState.pengurusRT.data,
        pekerjaan: initialState.pekerjaan.data,
      }

      const result = await firestoreService.syncDummyData(dummyData)

      console.log("[v0] AppContext: Dummy data sync completed:", result)

      // Refresh modules after sync
      await refreshModulesFromFirebase()

      return { success: true, result }
    } catch (error) {
      console.error("[v0] AppContext: Error syncing dummy data:", error)
      dispatch(setError("Gagal sinkronisasi data ke Firebase"))
      return { success: false, error: error.message }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const addKKToFirebase = async (kkData) => {
    try {
      console.log("[v0] AppContext: Adding KK to Firebase:", kkData)
      const result = await firestoreService.add("kk", kkData)
      console.log("[v0] AppContext: KK added successfully:", result)
      return result
    } catch (error) {
      console.error("[v0] AppContext: Error adding KK:", error)
      throw error
    }
  }

  const updateKKInFirebase = async (id, kkData) => {
    try {
      console.log("[v0] AppContext: Updating KK in Firebase:", id, kkData)
      const result = await firestoreService.update("kk", id, kkData)
      console.log("[v0] AppContext: KK updated successfully:", result)
      return result
    } catch (error) {
      console.error("[v0] AppContext: Error updating KK:", error)
      throw error
    }
  }

  const deleteKKFromFirebase = async (id) => {
    try {
      console.log("[v0] AppContext: Deleting KK from Firebase:", id)
      const result = await firestoreService.delete("kk", id)
      console.log("[v0] AppContext: KK deleted successfully:", result)
      return result
    } catch (error) {
      console.error("[v0] AppContext: Error deleting KK:", error)
      throw error
    }
  }

  const loadKKFromFirebase = async () => {
    try {
      console.log("[v0] AppContext: Loading KK data from Firebase")
      const kkData = await firestoreService.getAll("kk")
      console.log("[v0] AppContext: KK data loaded:", kkData.length)
      return kkData
    } catch (error) {
      console.error("[v0] AppContext: Error loading KK data:", error)
      throw error
    }
  }

  const contextValue = {
    // Renamed from value to contextValue for clarity
    state,
    dispatch,
    loginWithFirebase,
    syncDummyDataToFirebase,
    refreshModulesFromFirebase,
    firestoreService,
    addKKToFirebase,
    updateKKInFirebase,
    deleteKKFromFirebase,
    loadKKFromFirebase,
    logout, // Include logout in the context value
  }

  return (
    <AppStateContext.Provider value={contextValue}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

// Custom hooks
export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppProvider")
  }
  return context
}

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext)
  if (context === undefined) {
    throw new Error("useAppDispatch must be used within an AppProvider")
  }
  return context
}

export const useAppContext = () => {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}

// AppContext.jsx

// Action creators
export const login = (userData, userLevel) => ({
  type: "LOGIN",
  payload: { user: userData, userLevel },
})

// export const logout = () => ({ // This was duplicated, removed the original one
//   type: "LOGOUT",
// })

export const setCurrentPage = (page) => ({
  type: "SET_CURRENT_PAGE",
  payload: page,
})

export const toggleSidebar = () => ({
  type: "TOGGLE_SIDEBAR",
})

export const addModule = (module) => ({
  type: "ADD_MODULE",
  payload: module,
})

export const updateModule = (module) => ({
  type: "UPDATE_MODULE",
  payload: module,
})

export const deleteModule = (id) => ({
  type: "DELETE_MODULE",
  payload: id,
})

export const addAgeCategory = (category) => ({
  type: "ADD_AGE_CATEGORY",
  payload: category,
})

export const updateAgeCategory = (category) => ({
  type: "UPDATE_AGE_CATEGORY",
  payload: category,
})

export const deleteAgeCategory = (id) => ({
  type: "DELETE_AGE_CATEGORY",
  payload: id,
})

export const updatePermissions = (permissions) => ({
  type: "UPDATE_PERMISSIONS",
  payload: permissions,
})

export const addKK = (kk) => ({
  type: "ADD_KK",
  payload: kk,
})

export const updateKK = (kk) => ({
  type: "UPDATE_KK",
  payload: kk,
})

export const deleteKK = (id) => ({
  type: "DELETE_KK",
  payload: id, // Added payload for deleteKK
})

export const addWarga = (warga) => ({
  type: "ADD_WARGA",
  payload: warga,
})

export const updateWarga = (warga) => ({
  type: "UPDATE_WARGA",
  payload: warga,
})

export const deleteWarga = (id) => ({
  // Added id parameter
  type: "DELETE_WARGA",
  payload: id,
})

export const addPekerjaan = (pekerjaan) => ({
  type: "ADD_PEKERJAAN",
  payload: pekerjaan,
})

export const updatePekerjaan = (pekerjaan) => ({
  type: "UPDATE_PEKERJAAN",
  payload: pekerjaan,
})

export const deletePekerjaan = (id) => ({
  type: "DELETE_PEKERJAAN",
  payload: id,
})

export const addPengurusRT = (pengurusRT) => ({
  type: "ADD_PENGURUS_RT",
  payload: pengurusRT,
})

export const updatePengurusRT = (pengurusRT) => ({
  type: "UPDATE_PENGURUS_RT",
  payload: pengurusRT,
})

export const deletePengurusRT = (id) => ({
  type: "DELETE_PENGURUS_RT",
  payload: id,
})

export const addUserAccount = (userAccount) => ({
  type: "ADD_USER_ACCOUNT",
  payload: userAccount,
})

export const updateUserAccount = (userAccount) => ({
  type: "UPDATE_USER_ACCOUNT",
  payload: userAccount,
})

export const deleteUserAccount = (id) => ({
  type: "DELETE_USER_ACCOUNT",
  payload: id,
})

export const addKelompokAsset = (kelompokAsset) => ({
  type: "ADD_KELUPOK_ASSET",
  payload: kelompokAsset,
})

export const updateKelompokAsset = (kelompokAsset) => ({
  type: "UPDATE_KELUPOK_ASSET",
  payload: kelompokAsset,
})

export const deleteKelompokAsset = (id) => ({
  type: "DELETE_KELUPOK_ASSET",
  payload: id,
})

export const addSatuanAsset = (satuanAsset) => ({
  type: "ADD_SATUAN_ASSET",
  payload: satuanAsset,
})

export const updateSatuanAsset = (satuanAsset) => ({
  type: "UPDATE_SATUAN_ASSET",
  payload: satuanAsset,
})

export const deleteSatuanAsset = (id) => ({
  type: "DELETE_SATUAN_ASSET",
  payload: id,
})

export const addJenisAsset = (jenisAsset) => ({
  type: "ADD_JENIS_ASSET",
  payload: jenisAsset,
})

export const updateJenisAsset = (jenisAsset) => ({
  type: "UPDATE_JENIS_ASSET",
  payload: jenisAsset,
})

export const deleteJenisAsset = (id) => ({
  type: "DELETE_JENIS_ASSET",
  payload: id,
})

export const addAssetRecord = (assetRecord) => ({
  type: "ADD_ASSET_RECORD",
  payload: assetRecord,
})

export const updateAssetRecord = (assetRecord) => ({
  type: "UPDATE_ASSET_RECORD",
  payload: assetRecord,
})

export const deleteAssetRecord = (id) => ({
  type: "DELETE_ASSET_RECORD",
  payload: id,
})

export const updateIurPayment = (dispatch) => (id, month, updates) => {
  dispatch({
    type: "UPDATE_IUR_PAYMENT",
    payload: { rowId: id, month, paymentData: updates }, // Corrected payload structure
  })
}

export const updateLaporanKeuangan = (data) => ({
  type: "UPDATE_LAPORAN_KEUANGAN",
  payload: data,
})

export const updateLaporanIuranWarga = (data) => ({
  type: "UPDATE_LAPORAN_IURAN_WARGA",
  payload: data,
})

export const setFirebaseData = (data) => ({
  type: "SET_FIREBASE_DATA",
  payload: data,
})

export const setLoading = (loading) => ({
  type: "SET_LOADING",
  payload: loading,
})

export const setError = (error) => ({
  type: "SET_ERROR",
  payload: error,
})

export const logout = () => {
  clearSession()
  localStorage.removeItem("user")
  localStorage.removeItem("userLevel")
  localStorage.removeItem("userPermissions")
  sessionStorage.clear()

  // Clear all session data
  const event = new CustomEvent("logout")
  window.dispatchEvent(event)

  // Force page reload to ensure clean state
  window.location.href = "/"
}
