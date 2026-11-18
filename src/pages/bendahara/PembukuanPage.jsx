"use client";

import { useState, useEffect } from "react";
import { firestoreService } from "../../services/firebase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { X, Edit, Trash2, Plus, Search, Eye, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useBendaharaLock } from "../../hooks/use-bendahara-lock";

const PembukaanPage = () => {
  const [pembukaanData, setPembukaanData] = useState([]);
  const [rekeningKegiatanData, setRekeningKegiatanData] = useState([]);
  const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([]);
  const [userData, setUserData] = useState(null);
  const [pengurusList, setPengurusList] = useState([]);
  const [kkList, setKkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedPembukuan, setSelectedPembukuan] = useState("RT");
  const [selectedJenisPembukuan, setSelectedJenisPembukuan] =
    useState("keseluruhan");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { lockStatus } = useBendaharaLock();

  // 🟢 Token Fonnte sesuai permintaan
  const FONNTE_TOKEN = "YgWtBV2NEqbVWtu2b4Ne";

  const defaultSubRekenings = [
    {
      id: "1.1",
      uraian: "Silpa Warga Tahun Lalu",
      pencatatan: "Penerimaan",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
    },
    {
      id: "1.2",
      uraian: "Iuran Wajib Warga",
      pencatatan: "Penerimaan",
      pembukuan: "RT",
      id_kelompok: "1",
      status: "aktif",
      is_locked: true,
    },
    {
      id: "2.1",
      uraian: "Silpa PKK Tahun Lalu",
      pencatatan: "Penerimaan",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
    },
    {
      id: "2.2",
      uraian: "Iuran Wajib PKK",
      pencatatan: "Penerimaan",
      pembukuan: "PKK",
      id_kelompok: "2",
      status: "aktif",
      is_locked: true,
    },
  ];

  const [formData, setFormData] = useState({
    id: null,
    tanggal: new Date().toISOString().split("T")[0],
    kas_type: "KAS RT",
    jenis_pembukuan: "Penerimaan",
    id_sub_rekening_asal: "",
    id_sub_rekening_tujuan: "",
    jumlah: "",
    terbilang: "",
    keterangan: "",
    uraian: "",
    pembukuan: "",
    status: false,
    dibuat_oleh: "",
    id_user: "",
    jabatan_user: "",
    no_arsip: "",
    tipe_donatur: "warga",
    id_warga_kk: "",
    nama_donatur: "",
    no_wa_donatur: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);

      const userId = localStorage.getItem("userId") || "1";
      const usersData = await firestoreService.getAll("users");
      const currentUser =
        usersData.find((u) => u.id.toString() === userId) ||
        usersData.find((u) => u.level === "superadmin" && u.status === "aktif");

      setUserData(currentUser);

      if (currentUser?.jabatan?.toLowerCase().includes("bendahara rt")) {
        setSelectedPembukuan("RT");
      } else if (
        currentUser?.jabatan?.toLowerCase().includes("bendahara pkk")
      ) {
        setSelectedPembukuan("PKK");
      }

      const [pembukaanList, rekeningList, subRekeningList, pengurusListRes, kkDataRes] = await Promise.all([
        firestoreService.getAll("laporanKeuangan"),
        firestoreService.getAll("rekeningKegiatan"),
        firestoreService.getAll("subRekeningKegiatan"),
        firestoreService.getAll("pengurusRT"),
        firestoreService.getAll("kkData"),
      ]);

      setPembukaanData(pembukaanList);
      setRekeningKegiatanData(rekeningList);
      setSubRekeningKegiatanData(subRekeningList);
      setPengurusList(pengurusListRes || []);
      setKkList(kkDataRes || []);
    } catch (error) {
      console.error("Error loading data:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Gagal memuat data",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAutoNoArsip = () => {
    const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    return `${randomSixDigits}.${currentMonth}`;
  };

  const getPenandatanganInfo = () => {
    const isPkk = selectedPembukuan === "PKK";
    const ketuaJabatanTarget = isPkk ? "ketua pkk" : "ketua rt";
    const bendaharaJabatanTarget = isPkk ? "bendahara pkk" : "bendahara rt";

    const ketua = pengurusList.find(
      (p) =>
        p.status?.toLowerCase() === "aktif" &&
        p.jabatan?.toLowerCase().trim() === ketuaJabatanTarget
    );

    const bendahara = pengurusList.find(
      (p) =>
        p.status?.toLowerCase() === "aktif" &&
        p.jabatan?.toLowerCase().trim() === bendaharaJabatanTarget
    );

    return {
      labelKetua: isPkk ? "Ketua PKK" : "Ketua RT",
      namaKetua: ketua?.nama_warga || "[Nama Ketua]",
      labelBendahara: isPkk ? "Bendahara PKK" : "Bendahara RT",
      namaBendahara: bendahara?.nama_warga || "[Nama Bendahara]",
    };
  };

  const sendFonnteNotification = async (targetPhone, messageText) => {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": FONNTE_TOKEN,
        },
        body: new URLSearchParams({
          target: targetPhone,
          message: messageText,
        }),
      });

      const result = await response.json();
      if (!result.status) {
        console.error("Gagal mengirim pesan Fonnte:", result.reason);
      }
    } catch (error) {
      console.error("Error Fonnte API:", error);
    }
  };

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const jenisPembukaanOptions = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "Penerimaan", label: "Penerimaan" },
    { value: "Pengeluaran", label: "Pengeluaran" },
  ];

  const toTerbilang = (angka) => {
    const satuan = [
      "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan",
    ];
    const belasan = [
      "Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas", 
      "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas",
    ];

    if (angka === 0) return "Nol Rupiah";

    const convert = (n) => {
      if (n < 10) return satuan[n];
      if (n < 20) return belasan[n - 10];
      if (n < 100) {
        const puluhan = Math.floor(n / 10);
        const sisa = n % 10;
        return satuan[puluhan] + " Puluh " + satuan[sisa];
      }
      if (n < 200) return "Seratus " + convert(n - 100);
      if (n < 1000) {
        const ratusan = Math.floor(n / 100);
        const sisa = n % 100;
        return satuan[ratusan] + " Ratus " + convert(sisa);
      }
      if (n < 2000) return "Seribu " + convert(n - 1000);
      if (n < 1000000) {
        const ribuan = Math.floor(n / 1000);
        const sisa = n % 1000;
        return convert(ribuan) + " Ribu " + convert(sisa);
      }
      if (n < 1000000000) {
        const jutaan = Math.floor(n / 1000000);
        const sisa = n % 1000000;
        return convert(jutaan) + " Juta " + convert(sisa);
      }
      if (n < 1000000000000) {
        const miliaran = Math.floor(n / 1000000000);
        const sisa = n % 1000000000;
        return convert(miliaran) + " Miliar " + convert(sisa);
      }
      return "";
    };

    return convert(angka).trim() + " Rupiah";
  };

  const filteredData = pembukaanData.filter((item) => {
    const itemYear = new Date(item.tanggal).getFullYear();
    const itemMonth = new Date(item.tanggal).getMonth() + 1;

    const matchesYear = itemYear === selectedYear;
    const matchesMonth = itemMonth === selectedMonth;
    const matchesPembukuan =
      selectedPembukuan === "" || item.pembukuan === selectedPembukuan;
    const matchesJenis =
      selectedJenisPembukuan === "keseluruhan" ||
      item.jenis_pembukuan === selectedJenisPembukuan;

    const matchesSearch =
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.uraian?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.no_arsip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nama_donatur?.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      matchesYear &&
      matchesMonth &&
      matchesPembukuan &&
      matchesJenis &&
      matchesSearch
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData
    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    .slice(startIndex, startIndex + itemsPerPage);

  const formatCurrencyInput = (value) => {
    const number = value.replace(/\D/g, "");
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const getSaldoRekening = (subRekeningId, tahunBuku) => {
    if (!subRekeningId) return 0;

    const transactions = pembukaanData.filter((item) => {
      const itemYear = new Date(item.tanggal).getFullYear();
      return (
        item.id_sub_rekening_kegiatan === subRekeningId &&
        itemYear === tahunBuku
      );
    });

    const totalPenerimaan = transactions.reduce(
      (sum, item) => sum + (item.penerimaan || 0),
      0
    );
    const totalPengeluaran = transactions.reduce(
      (sum, item) => sum + (item.pengeluaran || 0),
      0
    );
    return totalPenerimaan - totalPengeluaran;
  };

  const handleOpenModal = (mode, data = null) => {
    if (mode === "add") {
      setModalMode(mode);
      const generatedArsip = generateAutoNoArsip();
      setFormData({
        id: null,
        tanggal: new Date().toISOString().split("T")[0],
        kas_type: userData?.jabatan?.toLowerCase().includes("bendahara pkk")
          ? "KAS PKK"
          : "KAS RT",
        jenis_pembukuan: "Penerimaan",
        id_sub_rekening_asal: "",
        id_sub_rekening_tujuan: "",
        jumlah: "",
        terbilang: "",
        keterangan: "",
        uraian: "",
        pembukuan: "",
        status: false,
        dibuat_oleh: userData?.nama || "",
        id_user: userData?.id || "",
        jabatan_user: userData?.jabatan || userData?.level || "",
        no_arsip: generatedArsip,
        tipe_donatur: "warga",
        id_warga_kk: "",
        nama_donatur: "",
        no_wa_donatur: "",
      });
      setShowModal(true);
    } else if (mode === "edit" && lockStatus.locked) {
      Swal.fire({
        icon: "warning",
        title: "Terkunci!",
        text: "Monitoring RT sedang ON. Tidak dapat mengedit data transaksi.",
      });
      return;
    } else {
      setModalMode(mode);
      if (mode === "edit" && data) {
        if (data.status === true || data.status === "checked") {
          Swal.fire({
            icon: "warning",
            title: "Tidak Dapat Diedit!",
            text: "Data yang sudah dicek oleh Pak RT tidak dapat diedit",
          });
          return;
        }

        let cleanWa = data.no_wa_donatur || "";
        if (cleanWa.startsWith("+62")) {
          cleanWa = cleanWa.replace("+62", "");
        } else if (cleanWa.startsWith("62")) {
          cleanWa = cleanWa.replace("62", "");
        }

        setFormData({
          id: data.id,
          tanggal: data.tanggal,
          kas_type: data.kategori === "kas_pkk" ? "KAS PKK" : "KAS RT",
          jenis_pembukuan: data.jenis_pembukuan || "Penerimaan",
          id_sub_rekening_asal: data.id_sub_rekening_kegiatan || "",
          id_sub_rekening_tujuan: data.id_sub_rekening_mutasi || "",
          jumlah: formatCurrencyInput(
            (data.penerimaan || data.pengeluaran || 0).toString()
          ),
          terbilang: toTerbilang(data.penerimaan || data.pengeluaran || 0),
          keterangan: data.keterangan || data.detail || "",
          uraian: data.uraian || "",
          pembukuan: data.pembukuan || "",
          status: data.status || false,
          dibuat_oleh: data.dibuat_oleh || "",
          id_user: data.id_user || userData?.id || "",
          jabatan_user:
            data.jabatan_user || userData?.jabatan || userData?.level || "",
          no_arsip: data.no_arsip || generateAutoNoArsip(),
          tipe_donatur: data.tipe_donatur || "warga",
          id_warga_kk: data.id_warga_kk || "",
          nama_donatur: data.nama_donatur || "",
          no_wa_donatur: cleanWa,
        });
      }
      setShowModal(true);
    }
  };

  const getAvailableJenisPembukuan = () => {
    const options = [
      { value: "Penerimaan", label: "Penerimaan" },
      { value: "Pengeluaran", label: "Pengeluaran" },
    ];

    if (lockStatus.locked) {
      return options.filter((opt) => opt.value === "Penerimaan");
    }

    return options;
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenDetailModal = (data) => {
    setSelectedDetail(data);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetail(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      lockStatus.locked &&
      (formData.jenis_pembukuan === "Pengeluaran" ||
        formData.jenis_pembukuan === "Mutasi Anggaran")
    ) {
      Swal.fire({
        icon: "error",
        title: "Tidak Diizinkan",
        text: "Saat monitoring sedang ON, hanya Penerimaan yang dapat ditambahkan.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    const allSubRekenings = [
      ...defaultSubRekenings,
      ...subRekeningKegiatanData,
    ];
    const selectedSubRek = allSubRekenings.find(
      (item) => item.id.toString() === formData.id_sub_rekening_asal
    );
    const subRekUraianLower = selectedSubRek?.uraian?.toLowerCase() || "";
    
    const isSpecialNotification = 
      subRekUraianLower.includes("donatur pembangunan") || 
      subRekUraianLower.includes("pemanfaatan/peminjaman aset rt");

    let finalNamaDonatur = "";
    let finalNoWaDonatur = "";

    if (isSpecialNotification) {
      if (formData.tipe_donatur === "warga") {
        if (!formData.id_warga_kk) {
          Swal.fire({ icon: "warning", title: "Peringatan!", text: "Silakan pilih Warga terlebih dahulu!" });
          return;
        }
        const selectedWarga = kkList.find((w) => w.id.toString() === formData.id_warga_kk.toString());
        finalNamaDonatur = selectedWarga?.nama_kepala_keluarga || selectedWarga?.nama || "";
        finalNoWaDonatur = selectedWarga?.no_hp || selectedWarga?.no_wa || selectedWarga?.no_telepon || "";

        if (!finalNoWaDonatur) {
          Swal.fire({ icon: "warning", title: "Peringatan!", text: "Warga yang dipilih tidak memiliki nomor HP (no_hp) di data KK!" });
          return;
        }
      } else {
        if (!formData.nama_donatur.trim()) {
          Swal.fire({ icon: "warning", title: "Peringatan!", text: "Nama/Peminjam wajib diisi!" });
          return;
        }
        if (!formData.no_wa_donatur.trim()) {
          Swal.fire({ icon: "warning", title: "Peringatan!", text: "Nomor WhatsApp wajib diisi!" });
          return;
        }

        const rawWa = formData.no_wa_donatur.trim();
        if (rawWa.startsWith("0") || rawWa.startsWith("+62")) {
          Swal.fire({
            icon: "error",
            title: "Format Nomor Salah!",
            text: "Jangan gunakan angka '0' di depan atau awalan '+62'. Masukkan nomor setelah +62 (contoh: 81234567890).",
          });
          return;
        }
        finalNamaDonatur = formData.nama_donatur;
        finalNoWaDonatur = `+62${rawWa}`;
      }
    }

    if (
      !formData.tanggal ||
      !formData.id_sub_rekening_asal ||
      !formData.jumlah ||
      !formData.keterangan.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan!",
        text: "Semua field wajib diisi. Mohon lengkapi data terlebih dahulu.",
      });
      return;
    }

    const jumlahValue = Number.parseFloat(formData.jumlah.replace(/\s/g, ""));
    const tahunBuku = new Date(formData.tanggal).getFullYear();

    if (formData.jenis_pembukuan === "Mutasi Anggaran") {
      if (!formData.id_sub_rekening_tujuan) {
        Swal.fire({
          icon: "warning",
          title: "Peringatan!",
          text: "Mohon pilih Rekening Tujuan untuk Mutasi Anggaran",
        });
        return;
      }

      const saldoAsal = getSaldoRekening(
        formData.id_sub_rekening_asal,
        tahunBuku
      );
      if (jumlahValue > saldoAsal) {
        Swal.fire({
          icon: "warning",
          title: "Peringatan!",
          text: `Jumlah tidak boleh lebih besar dari Saldo Rekening Asal (${formatCurrency(
            saldoAsal
          )})`,
        });
        return;
      }
    }

    try {
      setLoading(true);

      const subRekeningAsal = allSubRekenings.find(
        (item) => item.id.toString() === formData.id_sub_rekening_asal
      );

      if (formData.jenis_pembukuan === "Mutasi Anggaran") {
        const recordAsal = {
          tanggal: formData.tanggal,
          uraian: formData.uraian,
          detail: formData.keterangan,
          keterangan: formData.keterangan,
          saldo_bulan_lalu: 0,
          penerimaan: 0,
          pengeluaran: jumlahValue,
          saldo_bulan_ini: 0,
          pembukuan: formData.kas_type === "KAS PKK" ? "PKK" : "RT",
          kategori: formData.kas_type === "KAS PKK" ? "kas_pkk" : "kas_rt",
          jenis_pembukuan: formData.jenis_pembukuan,
          id_sub_rekening_kegiatan: formData.id_sub_rekening_asal,
          id_sub_rekening_mutasi: formData.id_sub_rekening_tujuan,
          status: formData.status,
          dibuat_oleh: formData.dibuat_oleh || userData?.nama || "",
          id_user: formData.id_user || userData?.id || "",
          jabatan_user:
            formData.jabatan_user || userData?.jabatan || userData?.level || "",
          is_mutasi_source: true,
          createdAt: modalMode === "add" ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
          no_arsip: formData.no_arsip,
        };

        const recordTujuan = {
          tanggal: formData.tanggal,
          uraian: formData.uraian,
          detail: formData.keterangan,
          keterangan: formData.keterangan,
          saldo_bulan_lalu: 0,
          penerimaan: jumlahValue,
          pengeluaran: 0,
          saldo_bulan_ini: 0,
          pembukuan: formData.kas_type === "KAS PKK" ? "PKK" : "RT",
          kategori: formData.kas_type === "KAS PKK" ? "kas_pkk" : "kas_rt",
          jenis_pembukuan: formData.jenis_pembukuan,
          id_sub_rekening_kegiatan: formData.id_sub_rekening_tujuan,
          id_sub_rekening_mutasi: formData.id_sub_rekening_asal,
          status: formData.status,
          dibuat_oleh: formData.dibuat_oleh || userData?.nama || "",
          id_user: formData.id_user || userData?.id || "",
          jabatan_user:
            formData.jabatan_user || userData?.jabatan || userData?.level || "",
          is_mutasi_destination: true,
          createdAt: modalMode === "add" ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
          no_arsip: formData.no_arsip,
        };

        if (modalMode === "add") {
          await firestoreService.add("laporanKeuangan", recordAsal);
          await firestoreService.add("laporanKeuangan", recordTujuan);
        } else {
          await firestoreService.update(
            "laporanKeuangan",
            formData.id,
            recordAsal
          );

          const destinationRecord = pembukaanData.find(
            (item) =>
              item.id_sub_rekening_kegiatan ===
                formData.id_sub_rekening_tujuan &&
              item.id_sub_rekening_mutasi === formData.id_sub_rekening_asal &&
              item.tanggal === formData.tanggal &&
              item.is_mutasi_destination === true
          );

          if (destinationRecord) {
            await firestoreService.update(
              "laporanKeuangan",
              destinationRecord.id,
              recordTujuan
            );
          }
        }
      } else {
        const laporanData = {
          tanggal: formData.tanggal,
          uraian: subRekeningAsal?.uraian || "",
          detail: formData.keterangan,
          saldo_bulan_lalu: 0,
          penerimaan:
            formData.jenis_pembukuan === "Penerimaan" ? jumlahValue : 0,
          pengeluaran:
            formData.jenis_pembukuan === "Pengeluaran" ? jumlahValue : 0,
          saldo_bulan_ini: 0,
          pembukuan: formData.kas_type === "KAS PKK" ? "PKK" : "RT",
          kategori: formData.kas_type === "KAS PKK" ? "kas_pkk" : "kas_rt",
          jenis_pembukuan: formData.jenis_pembukuan,
          id_sub_rekening_kegiatan: formData.id_sub_rekening_asal,
          dibuat_oleh: userData?.nama || "",
          createdAt: new Date().toISOString(),
          no_arsip: formData.no_arsip,
          ...(isSpecialNotification && {
            tipe_donatur: formData.tipe_donatur,
            id_warga_kk: formData.tipe_donatur === "warga" ? formData.id_warga_kk : null,
            nama_donatur: finalNamaDonatur,
            no_wa_donatur: finalNoWaDonatur,
          }),
        };

        let generatedId = formData.id;
        if (modalMode === "add") {
          const resAdd = await firestoreService.add("laporanKeuangan", laporanData);
          generatedId = resAdd?.id || formData.no_arsip;
        } else {
          await firestoreService.update(
            "laporanKeuangan",
            formData.id,
            laporanData
          );
        }

        if (isSpecialNotification) {
          let cleanWaTarget = finalNoWaDonatur.trim().replace(/\D/g, "");
          if (cleanWaTarget.startsWith("0")) {
            cleanWaTarget = "62" + cleanWaTarget.slice(1);
          } else if (cleanWaTarget.startsWith("+62")) {
            cleanWaTarget = "62" + cleanWaTarget.slice(3);
          } else if (!cleanWaTarget.startsWith("62")) {
            cleanWaTarget = "62" + cleanWaTarget;
          }

          const noArsipText = formData.no_arsip || generatedId;
          const uraianText = formData.keterangan.trim() || "Pemanfaatan/Peminjaman Aset RT";
          const nominalFormatted = formatCurrency(jumlahValue);
          const rtVal = userData?.RT || userData?.rt || "-";
          const rwVal = userData?.RW || userData?.rw || "-";
          const kelVal = userData?.Kelurahan || userData?.kelurahan || "-";

          const pesanWa = `Tanda Terima ${noArsipText} guna ${uraianText} sebesar ${nominalFormatted}. Atas nama warga RT ${rtVal} RW ${rwVal} Kel. ${kelVal} menyampaikan Terima Kasih sebesar-besarnya, Semoga Rahmat Kesehatan dan Kelancaran Rizqi tercurah untuk Bapak/Ibu/Sdr ${finalNamaDonatur} dan Keluarga. Aamin`;

          await sendFonnteNotification(cleanWaTarget, pesanWa);
        }
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Data pembukuan berhasil ${
          modalMode === "add" ? "ditambahkan" : "diupdate"
        } ${isSpecialNotification ? "dan Pesan WA Tanda Terima telah dikirim." : ""}`,
        timer: 2500,
        showConfirmButton: false,
      });

      handleCloseModal();
      await loadAllData();
    } catch (error) {
      console.error("Error saving data:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Gagal menyimpan data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, item) => {
    if (lockStatus.locked) {
      Swal.fire({
        icon: "warning",
        title: "Terkunci!",
        text: "Monitoring RT sedang ON. Tidak dapat menghapus data transaksi.",
      });
      return;
    }

    if (item.status === true || item.status === "checked") {
      Swal.fire({
        icon: "warning",
        title: "Tidak Dapat Dihapus!",
        text: "Data yang sudah dicek oleh Pak RT tidak dapat dihapus",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Hapus Data?",
      text: "Data yang dihapus akan menghapus catatan keuangan dan mereset status pembayaran di IUR-Ku warga terkait!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);

        const detailText = item.detail || item.keterangan || "";
        const isIurPayment = item.id_sub_rekening_kegiatan === "1.2" || item.id_sub_rekening_kegiatan === "2.2" || detailText.toLowerCase().includes("ipl bulan");

        if (isIurPayment) {
          const allKkData = await firestoreService.getAll("kkData");
          
          for (const kk of allKkData) {
            const namaWarga = (kk.nama_kepala_keluarga || kk.nama || "").trim();
            if (namaWarga && detailText.toLowerCase().includes(namaWarga.toLowerCase())) {
              const paymentKeys = Object.keys(kk).filter(k => k.startsWith("payments_"));
              
              for (const pKey of paymentKeys) {
                const yearNum = pKey.replace("payments_", "");
                const monthsMap = kk[pKey] || {};
                const updatedMonthsMap = { ...monthsMap };
                let needUpdate = false;

                const monthMapping = {
                  "jan": "januari", "feb": "februari", "mar": "maret", "apr": "april",
                  "mei": "mei", "jun": "juni", "jul": "juli", "agt": "agustus", "sep": "september",
                  "okt": "oktober", "nov": "november", "des": "desember"
                };

                for (const [shortM, fullM] of Object.entries(monthMapping)) {
                  const yearShort = yearNum.slice(-2);
                  if (
                    (detailText.toLowerCase().includes(shortM) || detailText.toLowerCase().includes(fullM)) &&
                    (detailText.includes(yearShort) || detailText.includes(yearNum))
                  ) {
                    if (updatedMonthsMap[fullM] && updatedMonthsMap[fullM].status === "lunas") {
                      updatedMonthsMap[fullM] = {
                        ...updatedMonthsMap[fullM],
                        amount: 0,
                        status: "belum_bayar",
                        tanggal_bayar: null,
                        cancelled_at: new Date().toISOString(),
                        cancelled_by: userData?.nama || "Admin"
                      };
                      needUpdate = true;
                    }
                  }
                }

                if (needUpdate) {
                  await firestoreService.update("kkData", kk.id, {
                    [pKey]: updatedMonthsMap,
                    updatedAt: new Date()
                  });
                }
              }
            }
          }
        }

        if (item.jenis_pembukuan === "Mutasi Anggaran") {
          await firestoreService.delete("laporanKeuangan", id);

          const correspondingRecord = pembukaanData.find(
            (record) =>
              record.id !== id &&
              record.tanggal === item.tanggal &&
              record.jenis_pembukuan === "Mutasi Anggaran" &&
              ((record.id_sub_rekening_kegiatan ===
                item.id_sub_rekening_mutasi &&
                record.id_sub_rekening_mutasi ===
                  item.id_sub_rekening_kegiatan) ||
                (record.id_sub_rekening_kegiatan ===
                  item.id_sub_rekening_kegiatan &&
                  record.id_sub_rekening_mutasi ===
                    item.id_sub_rekening_mutasi))
          );

          if (correspondingRecord) {
            await firestoreService.delete(
              "laporanKeuangan",
              correspondingRecord.id
            );
          }
        } else {
          await firestoreService.delete("laporanKeuangan", id);
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data pembukuan dihapus.",
          timer: 2000,
          showConfirmButton: false,
        });
        await loadAllData();
      } catch (error) {
        console.error("Error deleting data:", error);
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Gagal menghapus data: " + error.message,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    if (
      userData?.level !== "superadmin" &&
      !userData?.jabatan?.toLowerCase().includes("pak rt")
    ) {
      Swal.fire({
        icon: "warning",
        title: "Tidak Diizinkan!",
        text: "Hanya Pak RT yang dapat mengubah status",
      });
      return;
    }

    try {
      setLoading(true);
      await firestoreService.update("laporanKeuangan", id, {
        status: !currentStatus,
        updatedAt: new Date().toISOString(),
      });
      await loadAllData();
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Gagal mengubah status",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredData.map((item, index) => ({
        No: index + 1,
        Tanggal: formatDate(item.tanggal),
        "No Arsip": item.no_arsip || "",
        Uraian: item.uraian || "",
        Kegiatan: item.detail || item.keterangan || "",
        "Nama Donatur": item.nama_donatur || "-",
        Pembukuan: item.pembukuan || "",
        Penerimaan: item.penerimaan || 0,
        Pengeluaran: item.pengeluaran || 0,
        Status: item.status ? "Checked" : "Unchecked",
        User: item.dibuat_oleh || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pembukuan");
      XLSX.writeFile(wb, `Pembukuan_${selectedYear}_${selectedMonth}.xlsx`);

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke Excel",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const ttd = getPenandatanganInfo(); 

      doc.setFontSize(16);
      doc.text("Histori Pembukuan Keuangan", 14, 15);

      doc.setFontSize(10);
      doc.text(`Tahun: ${selectedYear}`, 14, 25);
      doc.text(
        `Bulan: ${
          months.find((m) => m.value === selectedMonth)?.label || "Semua"
        }`,
        14,
        30
      );

      if (userData) {
        const rt = userData.rt || userData.RT || "-";
        const rw = userData.rw || userData.RW || "-";
        const kelurahan = userData.kelurahan || userData.Kelurahan || "-";

        doc.text(`RT ${rt} RW ${rw} Kelurahan ${kelurahan}`, 14, 35);
      }

      const tableData = filteredData
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .map((item, index) => [
          index + 1,
          formatDate(item.tanggal),
          item.no_arsip || "",
          item.uraian || "",
          item.detail || item.keterangan || "",
          item.nama_donatur || "-",
          item.pembukuan || "",
          formatCurrency(item.penerimaan || 0),
          formatCurrency(item.pengeluaran || 0),
          item.status ? "✓" : "✗",
          item.dibuat_oleh || "",
        ]);

      autoTable(doc, {
        startY: 45,
        head: [
          [
            "No",
            "Tanggal",
            "No Arsip",
            "Uraian",
            "Kegiatan",
            "Donatur",
            "Pembukuan",
            "Penerimaan",
            "Pengeluaran",
            "Status",
            "User",
          ],
        ],
        body: tableData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [66, 139, 202] },
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.height;
          const pageWidth = doc.internal.pageSize.width;

          const finalY = data.cursor.finalY + 15;
          if (finalY < pageHeight - 40) {
            doc.setFontSize(10);
            doc.text("Mengetahui,", 14, finalY);
            doc.text(ttd.labelKetua, 14, finalY + 6);
            doc.text(ttd.namaKetua, 14, finalY + 25);

            doc.text(`Bendahara,`, pageWidth - 50, finalY);
            doc.text(ttd.labelBendahara, pageWidth - 50, finalY + 6);
            doc.text(ttd.namaBendahara, pageWidth - 50, finalY + 25);
          }

          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Dicetak melalui aplikasi SIRTU | ${window.location.origin}`,
            14,
            pageHeight - 10
          );
        },
      });

      const pdfBlob = doc.output("blob");
      const pdfURL = URL.createObjectURL(pdfBlob);
      window.open(pdfURL, "_blank");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat membuat PDF: " + error.message,
      });
    }
  };

  const getAvailableSubRekening = () => {
    const allSubRekenings = [
      ...defaultSubRekenings,
      ...subRekeningKegiatanData,
    ];

    return allSubRekenings.filter((sr) => {
      const kasType = formData.kas_type === "KAS RT" ? "RT" : "PKK";
      const matchesPembukuan = sr.pembukuan === kasType;
      const matchesJenis = sr.pencatatan === formData.jenis_pembukuan;
      const matchesStatus = sr.status === "aktif";

      return matchesPembukuan && matchesJenis && matchesStatus;
    });
  };

  const currentTtd = getPenandatanganInfo();
  
  const activeSelectedSubRek = [...defaultSubRekenings, ...subRekeningKegiatanData].find(
    (sr) => sr.id.toString() === formData.id_sub_rekening_asal
  );
  const activeSubRekUraianLower = activeSelectedSubRek?.uraian?.toLowerCase() || "";
  const showSpecialInput = 
    activeSubRekUraianLower.includes("donatur pembangunan") || 
    activeSubRekUraianLower.includes("pemanfaatan/peminjaman aset rt");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pembukuan Keuangan</h1>
        {userData && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Kab/Kota - {userData.kabupaten_kota || "-"}</p>
            <p>
              Kecamatan - {userData.kecamatan || "-"} Kelurahan{" "}
              {userData.Kelurahan || userData.kelurahan || "-"}
            </p>
            <p>
              RT {userData.RT || userData.rt || "-"} RW{" "}
              {userData.RW || userData.rw || "-"}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tahun Buku
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2023, 2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bulan Pembukuan
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pembukuan
          </label>
          <select
            value={selectedPembukuan}
            onChange={(e) => setSelectedPembukuan(e.target.value)}
            disabled={
              userData?.jabatan?.toLowerCase().includes("bendahara rt") ||
              userData?.jabatan?.toLowerCase().includes("bendahara pkk")
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="RT">RT</option>
            <option value="PKK">PKK</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jenis Pembukuan
          </label>
          <select
            value={selectedJenisPembukuan}
            onChange={(e) => setSelectedJenisPembukuan(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {jenisPembukaanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number.parseInt(e.target.value));
              setCurrentPage(1);
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
          <FileText size={20} />
          Excel
        </button>
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <FileText size={20} />
          PDF
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Cari data dalam tabel (Uraian, Keterangan, Nama Donatur/Peminjam)..."
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
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                  Tgl Pembukuan
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                  No Arsip
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                  Uraian / Keterangan
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                  Nama Donatur / Peminjam
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-right">
                  Penerimaan
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-right">
                  Pengeluaran
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                  Audited
                </th>
                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-400 px-3 py-2 text-sm">
                      {formatDate(item.tanggal)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700">
                      {item.no_arsip || "-"}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">
                      <span
                        className={
                          item.jenis_pembukuan === "Mutasi Anggaran"
                            ? "text-green-600 font-medium"
                            : ""
                        }
                      >
                        {item.detail || item.uraian || "-"}
                      </span>
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm font-medium text-blue-700">
                      {item.nama_donatur || "-"}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.penerimaan || 0)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.pengeluaran || 0)}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center">
                      <input
                        type="checkbox"
                        checked={
                          item.status === true || item.status === "checked"
                        }
                        onChange={() =>
                          handleToggleStatus(item.id, item.status)
                        }
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetailModal(item)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenModal("edit", item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          disabled={
                            item.status === true || item.status === "checked"
                          }
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
                          disabled={
                            item.status === true || item.status === "checked"
                          }
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
            Menampilkan {startIndex + 1} sampai{" "}
            {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Tanda Tangan Dinamis Di Bawah Tabel */}
      <div className="mt-8 bg-white p-6 border border-gray-300 rounded-lg flex justify-between items-center text-sm">
        <div>
          <p className="font-medium">Mengetahui,</p>
          <p className="font-semibold">{currentTtd.labelKetua}</p>
          <div className="mt-16">
            <p className="font-bold underline">{currentTtd.namaKetua}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-medium">
            {userData?.kabupaten_kota || "Kota"}, {formatDate(new Date())}
          </p>
          <p className="font-semibold">{currentTtd.labelBendahara}</p>
          <div className="mt-16">
            <p className="font-bold underline">{currentTtd.namaBendahara}</p>
          </div>
        </div>
      </div>

      {/* Modal Buat/Edit Pembukuan */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === "add"
                  ? "Buat Pembukuan Keuangan"
                  : "Edit Pembukuan Keuangan"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No Arsip (Otomatis)
                </label>
                <input
                  type="text"
                  value={formData.no_arsip}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 font-mono cursor-not-allowed"
                />
                {/* <p className="text-xs text-gray-500 mt-1">
                  *Format nomor arsip: 6 angka acak dan bulan berjalan (contoh: 123456.11) dan tidak dapat diubah.
                </p> */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pembukuan
                </label>
                <div className="flex gap-6 mt-2">
                  {["KAS RT", "KAS PKK"].map((kas) => (
                    <label key={kas} className="flex items-center">
                      <input
                        type="radio"
                        value={kas}
                        checked={formData.kas_type === kas}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kas_type: e.target.value,
                            id_sub_rekening_asal: "",
                            id_sub_rekening_tujuan: "",
                          })
                        }
                        disabled={
                          (kas === "KAS RT" &&
                            userData?.jabatan
                              ?.toLowerCase()
                              .includes("bendahara pkk")) ||
                          (kas === "KAS PKK" &&
                            userData?.jabatan
                              ?.toLowerCase()
                              .includes("bendahara rt"))
                        }
                        className="mr-2"
                      />
                      {kas}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Pembukuan
                </label>
                <div className="flex gap-6 mt-2">
                  {getAvailableJenisPembukuan().map((jenis) => (
                    <label key={jenis.value} className="flex items-center">
                      <input
                        type="radio"
                        value={jenis.value}
                        checked={formData.jenis_pembukuan === jenis.value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jenis_pembukuan: e.target.value,
                            id_sub_rekening_tujuan: "",
                          })
                        }
                        className="mr-2"
                      />
                      {jenis.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kelompok Pembukuan
                </label>
                <select
                  value={formData.id_sub_rekening_asal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_sub_rekening_asal: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">-- Pilih Sub Rekening Asal --</option>
                  {getAvailableSubRekening().map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.uraian} {sr.is_locked ? "(Terkunci)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* INPUT KONDISIONAL UNTUK DONATUR & PEMANFAATAN ASET RT */}
              {showSpecialInput && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-4">
                  <h3 className="text-sm font-semibold text-blue-800">
                    Informasi Pihak Terkait & Pengiriman Tanda Terima WA
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori Sumber <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="tipe_donatur"
                          value="warga"
                          checked={formData.tipe_donatur === "warga"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tipe_donatur: e.target.value,
                              id_warga_kk: "",
                              nama_donatur: "",
                              no_wa_donatur: "",
                            })
                          }
                          className="mr-2"
                        />
                        Warga (Dari Data KK)
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="tipe_donatur"
                          value="non_warga"
                          checked={formData.tipe_donatur === "non_warga"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tipe_donatur: e.target.value,
                              id_warga_kk: "",
                              nama_donatur: "",
                              no_wa_donatur: "",
                            })
                          }
                          className="mr-2"
                        />
                        Non Warga (Input Manual)
                      </label>
                    </div>
                  </div>

                  {formData.tipe_donatur === "warga" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Kepala Keluarga / Warga <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.id_warga_kk}
                        onChange={(e) => {
                          const wId = e.target.value;
                          const selectedWarga = kkList.find((w) => w.id.toString() === wId.toString());
                          setFormData({
                            ...formData,
                            id_warga_kk: wId,
                            nama_donatur: selectedWarga?.nama_kepala_keluarga || selectedWarga?.nama || "",
                            no_wa_donatur: selectedWarga?.no_hp || selectedWarga?.no_wa || selectedWarga?.no_telepon || "",
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        required
                      >
                        <option value="">-- Pilih Warga --</option>
                        {kkList.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.nama_kepala_keluarga || w.nama} {w.no_hp || w.no_wa ? `(HP: ${w.no_hp || w.no_wa})` : "(No HP Kosong)"}
                          </option>
                        ))}
                      </select>
                      {formData.id_warga_kk && (
                        <div className="mt-2 p-2 bg-white border border-green-200 rounded-md">
                          <p className="text-xs text-gray-700">
                            Nama: <b className="text-blue-700">{formData.nama_donatur}</b>
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            Nomor WhatsApp: <b className="text-green-700">{formData.no_wa_donatur || "Tidak tersedia"}</b> 
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nama <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.nama_donatur}
                          onChange={(e) =>
                            setFormData({ ...formData, nama_donatur: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-md bg-white"
                          placeholder="Masukkan nama lengkap..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nomor WhatsApp <span className="text-red-500">*</span>
                        </label>
                        <div className="flex rounded-md shadow-sm">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-sm font-bold">
                            +62
                          </span>
                          <input
                            type="text"
                            value={formData.no_wa_donatur}
                            onChange={(e) =>
                              setFormData({ ...formData, no_wa_donatur: e.target.value })
                            }
                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 bg-white"
                            placeholder="81234567890 (tanpa 0 di depan)"
                            required
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          *Jangan ketik 0 atau +62 di depan nomor (cukup nomor setelahnya).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keterangan
                </label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) =>
                    setFormData({ ...formData, keterangan: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Masukkan keterangan tambahan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rp.
                  </span>
                  <input
                    type="text"
                    value={formData.jumlah}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      const num =
                        Number(String(formatted).replace(/\s/g, "")) || 0;
                      setFormData({
                        ...formData,
                        jumlah: formatted,
                        terbilang: toTerbilang(num),
                      });
                    }}
                    className="w-full pl-12 pr-3 py-2 border rounded-md"
                    placeholder="999 999 999"
                    required
                  />
                </div>
              </div>

              {formData.terbilang && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terbilang
                  </label>
                  <input
                    type="text"
                    value={formData.terbilang}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600"
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "SIMPAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {showDetailModal && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Detail Pembukuan
              </h2>
              <button
                onClick={handleCloseDetailModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Tanggal</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedDetail.tanggal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">No Arsip</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">
                    {selectedDetail.no_arsip || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Pembukuan</p>
                  <p className="text-sm text-gray-900">
                    {selectedDetail.pembukuan || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Jenis Pembukuan
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedDetail.jenis_pembukuan || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <p className="text-sm text-gray-900">
                    {selectedDetail.status === true ||
                    selectedDetail.status === "checked"
                      ? "Checked"
                      : "Unchecked"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-700">Uraian</p>
                  <p className="text-sm text-gray-900">
                    {selectedDetail.uraian || "-"}
                  </p>
                </div>
                {selectedDetail.nama_donatur && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Nama / Peminjam</p>
                      <p className="text-sm text-blue-700 font-semibold">
                        {selectedDetail.nama_donatur} ({selectedDetail.tipe_donatur === "warga" ? "Warga" : "Non-Warga"})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">No WhatsApp</p>
                      <p className="text-sm text-gray-900">
                        {selectedDetail.no_wa_donatur || "-"}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Penerimaan
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedDetail.penerimaan || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Pengeluaran
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedDetail.pengeluaran || 0)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-700">Keterangan</p>
                  <p className="text-sm text-gray-900">
                    {selectedDetail.keterangan || selectedDetail.detail || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseDetailModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PembukaanPage;