"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import Swal from "sweetalert2";
import { firestoreService } from "../../services/firebase";
import { useBendaharaLock } from "../../hooks/use-bendahara-lock";

const fromKey = (yyyyDashMM) => {
  if (!yyyyDashMM) return "";
  const [yyyy, mm] = yyyyDashMM.split("-");
  return `${mm}:${yyyy}`;
};
const toComparable = (mmDashYYYY) => {
  const [mm, yyyy] = mmDashYYYY.split("-");
  return Number(`${yyyy}${mm.padStart(2, "0")}`);
};

const IURKuPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [wargaData, setWargaData] = useState([]);
  const [iurPaymentsData, setIurPaymentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ nama: "Admin", level_user: "superadmin" });
  const [iurRates, setIurRates] = useState([]);
  const [rewardData, setRewardData] = useState([]);
  const [keringananData, setKeringananData] = useState([]);
  const { lockStatus } = useBendaharaLock();

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
  ];

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  // useEffect(() => {
  //   loadAllData();
  // }, []);

  // Load KK Data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [kkData, iurPayments, rewards, keringanan, rates] =
        await Promise.all([
          firestoreService.getAll("kkData"),
          firestoreService.getAll("iurPayments"),
          firestoreService.getAll("rewardSadarIW"),
          firestoreService.getAll("keringananIUR"),
          firestoreService.getAll("iurRates"),
        ]);

      // jika belum ada data iurPayments sama sekali → buat baru dari KK
      if (!iurPayments || iurPayments.length === 0) {
        console.log("[v0] No iurPayments found, creating default records...");
        await createIurRecordsFromCitizens(kkData);
      }

      setWargaData(kkData || []);
      setWargaData(
        (kkData || []).map((w) => ({
          ...w,
          id: w.id || w.id_warga || w.docId || w.uid,
        }))
      );

      setIurPaymentsData(iurPayments || []);
      setRewardData(rewards || []);
      setKeringananData(keringanan || []);
      setIurRates(rates || []);
    } catch (error) {
      console.error("[v0] Error loading all data:", error);
      Swal.fire("Error", "Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const syncIuranNominal = async () => {
    const rates = await firestoreService.getAll("iurRates");
    const payments = await firestoreService.getAll("iurPayments");

    for (const p of payments) {
      const updatedPayments = { ...p.payments };
      for (const [month, data] of Object.entries(updatedPayments)) {
        const monthIndex = months.indexOf(month.toLowerCase()) + 1;
        const monthKey = `${String(monthIndex).padStart(2, "0")}-${
          p.tahun || 2025
        }`;

        const rate = rates.find((r) => r.bulan_berlaku === monthKey);
        if (rate) {
          updatedPayments[month].amount = Number(rate.besaran_iuran);
        }
      }
      await firestoreService.update("iurPayments", p.id, {
        payments: updatedPayments,
      });
    }

    console.log("✅ Sinkronisasi nominal iuran selesai");
  };

  // Hitung bulan reward berdasarkan bebasBulan
  const getRewardMonthsFromConfig = (rewardConfig) => {
    if (!rewardConfig) return [];

    const { start, end, bebasBulan } = rewardConfig;
    if (!start || !end || !bebasBulan) return [];

    const [em, ey] = end.split(":").map(Number);

    let y = ey;
    let m = em;

    const list = [];

    // Ambil sebanyak bebasBulan dari bulan END
    for (let i = 0; i < bebasBulan; i++) {
      const key = `${String(m).padStart(2, "0")}-${y}`;
      list.push(key);

      m--;
      if (m === 0) {
        m = 12;
        y--;
      }
    }

    return list; // contoh hasil: ["06-2026"] atau ["06-2026","05-2026"]
  };

  // Ambil nominal iuran dari iurRates sesuai bulan & tahun
  const getNominalForMonth = (
    wargaId,
    month,
    year,
    pembukuan = "RT",
    mode = "display"
  ) => {
    const monthIndex = months.indexOf(month.toLowerCase()) + 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isFutureYear = year > currentYear;
    const isCurrentMonthYear =
      currentYear === year && currentMonth === monthIndex;
    const isAfter0001 =
      currentHour > 0 || (currentHour === 0 && currentMinute >= 1);

    // 1. Hitung latest rate dari iurRates
    const monthKey = `${String(monthIndex).padStart(2, "0")}-${year}`;
    const monthKeyComparable = toComparable(monthKey);

    const applicableRates = iurRates
      .map((r) => ({
        ...r,
        comp: toComparable(r.bulan_berlaku.padStart(7, "0")),
      }))
      .filter((r) => r.comp <= monthKeyComparable)
      .sort((a, b) => b.comp - a.comp);

    const latestRate = applicableRates[0];
    const baseAmount = latestRate ? Number(latestRate.besaran_iuran) : 0;

    // Ambil data pembayaran sesuai tahun
    const currentWarga = wargaData.find((w) => w.id === wargaId);
    const paymentsByYear = currentWarga
      ? currentWarga[`payments_${year}`] || {}
      : {};
    const existing = paymentsByYear[month] || {};

    // 2. Jika mode = display → tampilkan Rp 0 sebelum bulan berjalan
    // --- PEMBATAS BULAN BERJALAN ---
    // Jika bulan tersebut BELUM MASUK bulan berjalan → tampilkan Rp 0
    if (mode === "display" && existing.status !== "lunas") {
      const isFutureMonth =
        year > currentYear ||
        (year === currentYear && monthIndex > currentMonth) ||
        (year === currentYear && monthIndex === currentMonth && !isAfter0001); // sebelum 00.01

      if (isFutureMonth) {
        return {
          amount: 0,
          originalAmount: baseAmount,
          status: "belum_bayar",
          type: "normal",
        };
      }
    }

    // 4. Apply reward/keringanan jika ada
    // 4. Apply reward/keringanan jika ada
    const reward = rewardData.find((r) => {
      if ((r.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;

      const warga = wargaData.find((w) => w.id === wargaId);
      if (!warga) return false;

      // wilayah filter aman
      if (r.wilayah?.rw && r.wilayah.rw !== warga.rw) return false;
      if (r.wilayah?.rt && r.wilayah.rt !== warga.rt) return false;

      const rStart = r.start.replace(":", "-");
      const rEnd = r.end.replace(":", "-");

      return rStart <= monthKey && monthKey <= rEnd;
    });

    const keringanan = keringananData.find((k) => {
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;

      // Cek apakah keringanan ditujukan untuk warga ini
      const warga = wargaData.find((w) => w.id === wargaId);
      const namaKK = warga?.nama_kepala_keluarga || warga?.nama;

      if (
        k.kepalaWarga &&
        k.kepalaWarga.trim().toLowerCase() !== namaKK?.trim().toLowerCase()
      ) {
        return false;
      }

      const kStart = k.start.replace(":", "-");
      const kEnd = k.end.replace(":", "-");

      // Only apply keringanan if it's within the selected year
      // Extract year from kStart and kEnd (format MM-YYYY)
      const kStartYear = Number.parseInt(kStart.split("-")[1]);
      const kEndYear = Number.parseInt(kEnd.split("-")[1]);

      // If keringanan year range doesn't include selected year, skip it
      if (year < kStartYear || year > kEndYear) return false;

      return kStart <= monthKey && monthKey <= kEnd;
    });
    // 3. Jika mode = payment → SELALU gunakan baseAmount meskipun bulan belum masuk
    let adjustedAmount = baseAmount;
    let status = "Belum Bayar";
    let type = "normal";

    if (keringanan) {
      if (keringanan.jenis === "PEMBEBASAN") {
        adjustedAmount = 0;
        status = "Lunas (Pembebasan)";
        type = "pembebasan";
      } else if (keringanan.jenis === "KERINGANAN") {
        if (keringanan.bentuk === "rupiah") {
          adjustedAmount = Math.max(
            0,
            baseAmount - Number(keringanan.potongan)
          );
        } else if (keringanan.bentuk === "persen") {
          adjustedAmount = Math.max(
            0,
            baseAmount * (1 - Number(keringanan.persen) / 100)
          );
        }
        status = "Keringanan";
        type = "keringanan";
      } else if (keringanan.jenis === "PENGHAPUSAN") {
        adjustedAmount = 0;
        status = "Lunas (Penghapusan)";
        type = "penghapusan";
      }
    }

    return {
      amount: Math.round(adjustedAmount),
      originalAmount: baseAmount,
      status,
      type,

      // Tambahkan flag otomatis agar warna tampil
      isReward: type === "reward",
      isPembebasan: type === "pembebasan",
      isPenghapusan: type === "penghapusan",
      isKeringanan: type === "keringanan",
    };
  };

  // Tentukan bulan paling akhir sebagai bulan reward
  // Return 1 or 2 reward months based on selected count
  const getRewardMonths = (paymentArray) => {
    const monthIndices = paymentArray
      .map((key) => {
        const parts = key.split("-");
        const month = parts[parts.length - 2];
        return months.indexOf(month.toLowerCase());
      })
      .sort((a, b) => a - b);

    const rewardCount = monthIndices.length === 12 ? 2 : 1;

    // Ambil bulan paling akhir sesuai jumlah reward
    return monthIndices.slice(-rewardCount).map((i) => months[i]); // kembalikan nama bulan
  };

  const getKeringananAdjustmentForWarga = (wargaId, month, year, pembukuan) => {
    const monthIndex = months.indexOf(month.toLowerCase()) + 1;
    const monthKey = `${year}-${String(monthIndex).padStart(2, "0")}`;

    const keringanan = keringananData.find((k) => {
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      // Match by kepalaWarga name or wargaId if available
      if (k.kepalaWarga) {
        const wargaName = wargaData.find(
          (w) => w.id === wargaId
        )?.nama_kepala_keluarga;
        if (wargaName && k.kepalaWarga !== wargaName) return false;
      }
      const kStart = fromKey(k.start);
      const kEnd = fromKey(k.end);
      return kStart && kEnd && kStart <= monthKey && monthKey <= kEnd;
    });
    return keringanan || null;
  };

  // Load Tarif Iuran
  const loadIurRates = async () => {
    try {
      const data = await firestoreService.getAll("iurRates");
      setIurRates(data || []);
    } catch (error) {
      console.error("Error loading iurRates:", error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadIurPaymentsData = async () => {
    try {
      const data = await firestoreService.getAll("iurPayments");
      console.log("[v0] Loaded IUR payments data:", data);
      setIurPaymentsData(data || []);
    } catch (error) {
      console.error("[v0] Error loading IUR payments:", error);
    }
  };

  // Helper untuk format alamat agar tidak keluar "undefined"
  const formatAlamat = (data) => {
    const alamat = data.alamat || "";
    const noRumah = data.no_rumah ? `No. ${data.no_rumah}` : "";

    if (!alamat && !noRumah) return "-";
    return [alamat, noRumah].filter(Boolean).join(" | ");
  };

  const loadRewardData = async () => {
    try {
      const data = await firestoreService.getAll("rewardSadarIW");
      setRewardData(data || []);
    } catch (error) {
      console.error("[v0] Error loading reward data:", error);
    }
  };

  const loadKeringananData = async () => {
    try {
      const data = await firestoreService.getAll("keringananIUR");
      setKeringananData(data || []);
    } catch (error) {
      console.error("[v0] Error loading keringanan data:", error);
    }
  };

  const isMonthInReward = (month, year, pembukuan) => {
    const monthKey = `${year}-${
      months.indexOf(month.toLowerCase()) + 1
    }`.replace(/(\d+)$/, (m) => String(m).padStart(2, "0"));
    return rewardData.some((r) => {
      if ((r.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      const rStart = fromKey(r.start);
      const rEnd = fromKey(r.end);
      return rStart && rEnd && rStart <= monthKey && monthKey <= rEnd;
    });
  };

  const getKeringananAdjustment = (month, year, pembukuan) => {
    const monthKey = `${year}-${
      months.indexOf(month.toLowerCase()) + 1
    }`.replace(/(\d+)$/, (m) => String(m).padStart(2, "0"));
    const keringanan = keringananData.find((k) => {
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      const kStart = fromKey(k.start);
      const kEnd = fromKey(k.end);
      return kStart && kEnd && kStart <= monthKey && monthKey <= kEnd;
    });
    return keringanan || null;
  };

  const createIurRecordsFromCitizens = async (citizenData) => {
    try {
      const existingIurData = await firestoreService.getAll("iurPayments");
      const existingIds = new Set(existingIurData.map((item) => item.warga_id));

      const newIurRecords = [];

      for (const citizen of citizenData) {
        if (!existingIds.has(citizen.id_warga)) {
          // Create payment structure for all months
          const payments = {};
          months.forEach((month) => {
            payments[month] = {
              amount: 0, // Default IUR amount
              status: "belum_bayar",
              tanggal_bayar: null,
            };
          });

          newIurRecords.push({
            warga_id: citizen.id_warga,
            nama_kk: citizen.nama_kepala_keluarga || citizen.nama,
            alamat: `${citizen.alamat_tinggal || citizen.alamat_lain} | Blok ${
              citizen.blok_hunian || "-"
            } | No. ${citizen.nomor_rumah || "-"}`,
            tahun: selectedYear,
            payments: payments,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Save new IUR records to Firestore
      for (const record of newIurRecords) {
        await firestoreService.add("iurPayments", record);
      }

      if (newIurRecords.length > 0) {
        console.log(
          `[v0] Created ${newIurRecords.length} new IUR payment records`
        );
        await loadIurPaymentsData(); // Reload IUR payments data
      }
    } catch (error) {
      console.error("[v0] Error creating IUR records from citizens:", error);
    }
  };

  const updateIurPayment = async (rowId, month, paymentData) => {
    try {
      const row = wargaData.find((w) => w.id === rowId);
      if (!row) return;

      const tahun = selectedYear;
      const nominal = getNominalForMonth(
        rowId,
        month,
        tahun,
        row.pembukuan || "RT",
        "payment"
      );

      // Also use actual amount from paymentData, not nominal.amount which is 0 for future months
      const updateData = {
        [`payments_${tahun}.${month}.amount`]:
          paymentData.amount || nominal.amount,
        [`payments_${tahun}.${month}.status`]: paymentData.status,
        [`payments_${tahun}.${month}.tanggal_bayar`]: paymentData.tanggal_bayar,
        [`payments_${tahun}.${month}.isReward`]: paymentData.isReward || false,
        [`payments_${tahun}.${month}.isPembebasan`]:
          paymentData.isPembebasan || false,
        [`payments_${tahun}.${month}.isPenghapusan`]:
          paymentData.isPenghapusan || false,
        [`payments_${tahun}.${month}.isKeringanan`]:
          paymentData.isKeringanan || false,

        updatedAt: new Date(),
      };

      await firestoreService.update("kkData", rowId, updateData);
      await loadAllData();

      setWargaData((prev) =>
        prev.map((item) =>
          item.id === rowId
            ? {
                ...item,
                payments: {
                  ...item.payments,
                  [month]: {
                    amount: paymentData.amount || nominal.amount,
                    ...paymentData,
                  },
                },
              }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating payment:", error);
      Swal.fire("Error", "Gagal update pembayaran", "error");
    }
  };

  const filteredData = useMemo(() => {
    if (!wargaData || !Array.isArray(wargaData)) return [];

    return wargaData
      .map((warga) => {
        const pembukuan = warga.pembukuan || "RT";
        const defaultPayments = {};
        const mergedPayments = {};

        months.forEach((month) => {
          const adjusted = getNominalForMonth(
            warga.id,
            month,
            selectedYear,
            pembukuan
          );

          const paymentsByYear = warga[`payments_${selectedYear}`] || {};
          const existing = paymentsByYear[month] || {
            status: "belum_bayar",
            amount: 0,
          };

          mergedPayments[month] = {
            amount:
              existing.status === "lunas"
                ? existing.amount ?? adjusted.amount
                : adjusted.amount,

            status: existing.status || adjusted.status,

            tanggal_bayar: existing.tanggal_bayar || null,

            // FLAG PRIORITAS dari aturan keringanan
            isReward: adjusted.isReward || existing.isReward || false,
            isPembebasan:
              adjusted.isPembebasan || existing.isPembebasan || false,
            isPenghapusan:
              adjusted.isPenghapusan || existing.isPenghapusan || false,
            isKeringanan:
              adjusted.isKeringanan || existing.isKeringanan || false,

            originalAmount: adjusted.originalAmount,
          };
        });

        return {
          id: warga.id,
          nama_kk: warga.nama_kepala_keluarga || warga.nama,
          alamat: formatAlamat(warga),
          tahun: selectedYear,
          pembukuan: pembukuan,
          payments: mergedPayments, // ← PENTING!
        };
      })
      .filter(
        (item) =>
          item.tahun === selectedYear && // Filter by selected year only
          (item.nama_kk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alamat?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.nama_kk?.localeCompare(b.nama_kk)); // Sort A-Z by nama_kk
  }, [
    wargaData,
    iurRates,
    selectedYear,
    searchTerm,
    rewardData,
    keringananData,
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleCheckboxChange = (rowId, month, isChecked) => {
    const paymentKey = `${rowId}-${month}-${selectedYear}`;
    const newSelected = new Set(selectedPayments);

    if (isChecked) {
      newSelected.add(paymentKey);
    } else {
      newSelected.delete(paymentKey);
    }

    setSelectedPayments(newSelected);
  };

  const handleRightClick = (e, userId, month, payment) => {
    e.preventDefault(); // penting! cegah menu klik kanan default

    if (!payment || payment.status !== "lunas") return;

    Swal.fire({
      title: "Batalkan pembayaran?",
      text: `Kamu yakin ingin membatalkan pembayaran bulan ${month}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, batalkan",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Update data Firestore (sesuaikan nama collection dan struktur dokumenmu)
          await firestoreService.update("kkData", userId, {
            [`payments_${selectedYear}.${month}.amount`]: 0,
            [`payments_${selectedYear}.${month}.status`]: "belum_bayar",
            [`payments_${selectedYear}.${month}.tanggal_bayar`]: null,
            [`payments_${selectedYear}.${month}.isReward`]: false,
            [`payments_${selectedYear}.${month}.isPembebasan`]: false,
            [`payments_${selectedYear}.${month}.isPenghapusan`]: false,
            [`payments_${selectedYear}.${month}.isKeringanan`]: false,
            [`payments_${selectedYear}.${month}.cancelled_by`]:
              user?.nama || "Admin",
            [`payments_${selectedYear}.${month}.cancelled_at`]:
              new Date().toISOString(),
          });
          await removeRewardIfInvalid(userId, selectedYear);

          Swal.fire("Berhasil!", "Pembayaran telah dibatalkan.", "success");
          await loadAllData();
        } catch (error) {
          console.error("Error batal bayar:", error);
          Swal.fire("Error", "Gagal membatalkan pembayaran.", "error");
        }
      }
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const calculateRewardDiscount = (selectedMonths) => {
    // Count consecutive months selected
    const monthIndices = selectedMonths
      .map((key) => {
        const parts = key.split("-");
        const month = parts[parts.length - 2];
        return months.indexOf(month.toLowerCase());
      })
      .sort((a, b) => a - b);

    // Check if 6 or 12 consecutive months are selected
    let rewardMonths = 0;
    if (monthIndices.length === 6) {
      rewardMonths = 1; // 1 month free for 6 months payment
    } else if (monthIndices.length === 12) {
      rewardMonths = 2; // 2 months free for 12 months payment
    }

    return rewardMonths;
  };

  const handleBatchPayment = async () => {
    if (selectedPayments.size === 0) return;

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
    });
    // === HITUNG REWARD BERDASARKAN KONFIG FIREBASE ===
    const rewardConfig = rewardData.find(
      (r) => (r.pembukuan || "RT").toUpperCase() === "RT"
    );

    let rewardMonths = [];

    if (rewardConfig) {
      const listReward = getRewardMonthsFromConfig(rewardConfig);
      const selectedCount = selectedPayments.size;

      // Jika bayar minimal sesuai frequency
      if (selectedCount >= rewardConfig.frequency) {
        rewardMonths = listReward.slice(0, rewardConfig.bebasBulan);
      }
    }

    console.log("Reward months:", rewardMonths);

    if (result.isConfirmed) {
      const currentDate = new Date().toISOString().split("T")[0];
      const paymentArray = Array.from(selectedPayments);

      const rewardMonths = calculateRewardDiscount(paymentArray);
      const rewardApplied = false;

      // Tentukan bulan reward jika ada
      const rewardMonthList =
        rewardMonths > 0 ? getRewardMonths(paymentArray) : [];

      let successCount = 0;
      let errorCount = 0;

      try {
        await Promise.all(
          paymentArray.map(async (paymentKey, i) => {
            // paymentKey format: {rowId}-{month}-{year}
            const lastHyphonIndex = paymentKey.lastIndexOf("-");
            const year = paymentKey.substring(lastHyphonIndex + 1);
            const secondLastHyphenIndex = paymentKey.lastIndexOf(
              "-",
              lastHyphonIndex - 1
            );
            const month = paymentKey.substring(
              secondLastHyphenIndex + 1,
              lastHyphonIndex
            );
            const rowId = paymentKey.substring(0, secondLastHyphenIndex);

            console.log(
              `[v0] Processing payment ${i + 1}/${paymentArray.length}:`,
              rowId
            );

            try {
              const wargaRow = wargaData.find((w) => w.id === rowId);
              if (!wargaRow) {
                console.error(`[v0] Warga not found for rowId: ${rowId}`);
                errorCount++;
                return;
              }

              // Ambil data asli untuk tahun terpilih
              const rowOriginal = wargaData.find((w) => w.id === rowId);
              const paymentsByYear =
                rowOriginal[`payments_${selectedYear}`] || {};

              const bulanData = paymentsByYear[month] || {
                amount: 0,
                status: "belum_bayar",
                tanggal_bayar: null,
              };

              // TIDAK PERLU VALIDASI, Firestore bisa auto-buat bulan baru
              if (!bulanData) {
                console.error(
                  `[v0] Payment data not found for month: ${month}`
                );
                errorCount++;
                return;
              }

              // For future months, bulanData.amount contains the revealed besaran
              const paymentAmount =
                bulanData.amount || bulanData.originalAmount || 0;

              // Cek apakah bulan ini adalah bulan reward
              const isRewardThisMonth = rewardMonthList.includes(month);

              await updateIurPayment(rowId, month, {
                status: "lunas",
                tanggal_bayar: currentDate,
                amount: isRewardThisMonth ? 0 : paymentAmount,
                isReward: isRewardThisMonth,
              });

              successCount++;
              console.log(`[v0] Successfully updated payment ${i + 1}:`, rowId);
            } catch (error) {
              console.error(`[v0] Error processing payment:`, error);
              errorCount++;
            }
          })
        );

        setSelectedPayments(new Set());

        let message = `${successCount} pembayaran berhasil diproses!`;
        if (rewardMonths > 0) {
          message += `\n\nReward: ${rewardMonths} bulan gratis!`;
        }

        if (errorCount === 0) {
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: message,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Sebagian Berhasil",
            text: `${successCount} pembayaran berhasil, ${errorCount} gagal diproses.`,
            confirmButtonText: "OK",
          });
        }

        await loadIurPaymentsData();
      } catch (error) {
        console.error("[v0] Batch payment error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Terjadi kesalahan saat memproses batch pembayaran.",
        });
      }
    }
  };

  const removeRewardIfInvalid = async (rowId, year) => {
    const warga = wargaData.find((w) => w.id === rowId);
    if (!warga) return;

    const payments = warga[`payments_${year}`] || {};

    // 1. Kumpulkan hanya bulan yang lunas normal (bukan reward)
    const normalPaid = months
      .map((m, i) => {
        const p = payments[m];
        if (!p) return -1;
        if (p.isReward) return -1; // JANGAN hitung reward
        if (p.status !== "lunas") return -1;
        return i;
      })
      .filter((i) => i !== -1);

    // 2. Jika tidak ada lunas → bersihkan semua reward
    if (normalPaid.length === 0) {
      for (const m of months) {
        const p = payments[m];
        if (p?.isReward) {
          await firestoreService.update("kkData", rowId, {
            [`payments_${year}.${m}.isReward`]: false,
            [`payments_${year}.${m}.amount`]: p.originalAmount ?? 0,
            [`payments_${year}.${m}.status`]: "belum_bayar",
          });
        }
      }
      return;
    }

    // 3. Hitung streak berurutan HANYA dari normalPaid
    let longestStreak = 1;
    let cur = 1;

    for (let i = 1; i < normalPaid.length; i++) {
      if (normalPaid[i] === normalPaid[i - 1] + 1) {
        cur++;
        longestStreak = Math.max(longestStreak, cur);
      } else {
        cur = 1;
      }
    }

    // 4. Hitung reward lama
    const rewardMonths = months.filter((m) => payments[m]?.isReward);
    const rewardBefore = rewardMonths.length;

    // 5. Tentukan reward yang seharusnya
    let allowedRewards = 0;
    if (longestStreak >= 12) allowedRewards = 2;
    else if (longestStreak >= 6) allowedRewards = 1;

    // 6. Jika reward lama lebih banyak → hapus reward bulan paling akhir
    if (rewardBefore > allowedRewards) {
      const toRemove = rewardMonths.slice(0, rewardBefore - allowedRewards);

      for (const m of toRemove) {
        const p = payments[m];
        await firestoreService.update("kkData", rowId, {
          [`payments_${year}.${m}.isReward`]: false,
          [`payments_${year}.${m}.amount`]: p.originalAmount ?? 0,
          [`payments_${year}.${m}.status`]: "belum_bayar",
        });
      }
    }
  };

  const handleCancelPayment = (rowId, month) => {
    if (lockStatus.locked) {
      Swal.fire({
        icon: "warning",
        title: "Terkunci!",
        text: "Monitoring RT sedang ON. Tidak dapat membatalkan pembayaran.",
      });
      return;
    }

    const row = filteredData.find((item) => item.id === rowId);
    if (!row) return;

    const currentMonthIndex = months.indexOf(month);
    const currentDate = new Date();
    const currentRealMonthIndex = currentDate.getMonth();

    const userRole = user?.level_user?.toLowerCase() || "";
    const canCancelDirectly =
      userRole === "pak rt" || userRole === "superadmin";

    const hasLaterPayments = months
      .slice(currentRealMonthIndex + 1)
      .some((laterMonth) => {
        const laterMonthIndex = months.indexOf(laterMonth);
        return (
          laterMonthIndex > currentMonthIndex &&
          row.payments[laterMonth]?.status === "lunas"
        );
      });

    if (hasLaterPayments) {
      Swal.fire({
        icon: "error",
        title: "Tidak Dapat Dibatalkan",
        text: "Tidak bisa dibatalkan jika bulan setelah bulan berjalan yang dipilih status bayar lunas",
        confirmButtonText: "OK",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
      closeContextMenu();
      return;
    }

    if (!canCancelDirectly) {
      const isApprovedByAuthorizedRole =
        row.payments[month]?.approved_by_rt ||
        row.payments[month]?.approved_by_superadmin;

      if (!isApprovedByAuthorizedRole) {
        Swal.fire({
          icon: "error",
          title: "Tidak Dapat Dibatalkan",
          text: "Bendahara dan role lainnya tidak bisa membatalkan pembayaran kecuali sudah di-approve oleh Pak RT atau Superadmin",
          confirmButtonText: "OK",
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        });
        closeContextMenu();
        return;
      }
    }

    const roleText = canCancelDirectly
      ? "Anda memiliki akses untuk membatalkan pembayaran ini."
      : "Pembayaran ini sudah di-approve untuk dibatalkan.";

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
        });

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pembayaran berhasil dibatalkan!",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      closeContextMenu();
    });
  };

  const getCellStyle = (payment) => {
    if (payment.isReward) return "bg-blue-600 text-white";
    if (payment.isPembebasan) return "bg-purple-500 text-white";
    if (payment.isPenghapusan) return "bg-gray-500 text-white";
    if (payment.isKeringanan) return "bg-yellow-400 text-black";

    if (payment.status === "lunas") return "bg-green-500 text-white";

    return "bg-red-100 text-red-700";
  };

  const selectedTotal = useMemo(() => {
    let total = 0;

    const paymentArray = Array.from(selectedPayments);

    // Hitung total bulan reward: 1 reward untuk 6, 2 reward untuk 12
    const rewardMonths = calculateRewardDiscount(paymentArray);

    // Ambil 1 atau 2 bulan reward
    const rewardMonthList =
      rewardMonths > 0 ? getRewardMonths(paymentArray) : [];

    paymentArray.forEach((paymentKey) => {
      const parts = paymentKey.split("-");
      const year = Number.parseInt(parts.pop());
      const month = parts.pop();
      const rowId = parts.join("-");

      const row = filteredData.find((item) => item.id === rowId);
      if (!row) return;

      const nominal = getNominalForMonth(
        row.id,
        month,
        selectedYear,
        row.pembukuan,
        "display"
      );

      // Jika bulan ini adalah bulan reward → GRATIS
      if (rewardMonthList.includes(month)) {
        return;
      }

      total += nominal.amount || nominal.originalAmount;
    });

    return total;
  }, [selectedPayments, filteredData]);

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
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IUR-Ku</h1>
          <p className="text-gray-600">Kelola pembayaran iuran warga</p>
        </div>
        <div className="flex gap-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tahun Buku
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Data
            </label>
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

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <p className="text-blue-800 font-medium mb-2">Keterangan Status:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-blue-700">Lunas (Normal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-blue-700">Lunas (Reward)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span className="text-blue-700">Belum Bayar</span>
            </div>
          </div>
        </div>

        {selectedPayments.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-green-600 text-sm">
              <strong>Total yang dipilih:</strong> Rp{" "}
              {selectedTotal.toLocaleString("id-ID")} ({selectedPayments.size}{" "}
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
              Bayar ({selectedPayments.size}) - Rp{" "}
              {selectedTotal.toLocaleString("id-ID")}
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
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                    {row.nama_kk}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                    {row.alamat}
                  </td>
                  {months.map((month) => {
                    const payment = row.payments?.[month] ?? {
                      amount: 0,
                      status: "belum_bayar",
                    };
                    const paymentKey = `${row.id}-${month}-${selectedYear}`;
                    const isSelected = selectedPayments.has(paymentKey);
                    const isPaid = payment.status === "lunas";
                    const isNonPayable =
                      payment.isReward ||
                      payment.isPembebasan ||
                      payment.isPenghapusan;
                    const nominal = getNominalForMonth(
                      row.id,
                      month,
                      selectedYear,
                      row.pembukuan,
                      "display"
                    );

                    // originalAmount is the actual besaran rate before any adjustments (reward, keringanan, etc)
                    const displayAmount =
                      payment.isPembebasan || payment.isPenghapusan
                        ? nominal.originalAmount // Show actual amount for exempted statuses
                        : nominal.amount > 0
                        ? nominal.amount
                        : isSelected
                        ? nominal.originalAmount
                        : 0;

                    return (
                      <td
                        key={month}
                        className={`px-2 py-3 text-center text-xs border border-gray-300 relative ${getCellStyle(
                          payment
                        )}`}
                        onContextMenu={(e) =>
                          handleRightClick(e, row.id, month, payment)
                        }
                      >
                        <div className="relative">
                          {!isPaid && !isNonPayable && (
                            <div className="flex justify-center mb-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleCheckboxChange(
                                    row.id,
                                    month,
                                    e.target.checked
                                  )
                                }
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

                          <div
                            className={`font-medium ${
                              isPaid ? "text-white" : ""
                            }`}
                          >
                            Rp {displayAmount.toLocaleString("id-ID")}
                          </div>

                          {isPaid && payment.isReward && (
                            <div className="text-xs mt-1 text-white opacity-90 font-semibold">
                              REWARD
                            </div>
                          )}

                          {isPaid && payment.isPembebasan && (
                            <div className="text-xs mt-1 text-white opacity-90 font-semibold">
                              PEMBEBASAN
                            </div>
                          )}

                          {isPaid && payment.isPenghapusan && (
                            <div className="text-xs mt-1 text-white opacity-90 font-semibold">
                              PENGHAPUSAN
                            </div>
                          )}

                          {isPaid && payment.isKeringanan && (
                            <div className="text-xs mt-1 text-white opacity-90 font-semibold">
                              KERINGANAN
                            </div>
                          )}

                          {isPaid && payment.tanggal_bayar && (
                            <div className="text-xs mt-1 text-white opacity-90">
                              {new Date(
                                payment.tanggal_bayar
                              ).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IURKuPage;
