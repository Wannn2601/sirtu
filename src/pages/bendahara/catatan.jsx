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
          payments:
            w.payments ||
            months.reduce((a, m) => {
              a[m] = { amount: 0, status: "belum_bayar", tanggal_bayar: null };
              return a;
            }, {}),
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

    // 2. Jika mode = display → tampilkan Rp 0 sebelum bulan berjalan
    if (mode === "display") {
      const shouldShowZero =
        isFutureYear || (isCurrentMonthYear && !isAfter0001);

      if (shouldShowZero) {
        return {
          amount: 0,
          originalAmount: baseAmount,
          status: "Belum Bayar",
          type: "normal",
        };
      }
    }

    // 4. Apply reward/keringanan jika ada
    const reward = rewardData.find((r) => {
      if ((r.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      const rStart = r.start.replace(":", "-");
      const rEnd = r.end.replace(":", "-");
      return rStart <= monthKey && monthKey <= rEnd;
    });

    const keringanan = keringananData.find((k) => {
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;

      // Cek apakah keringanan ditujukan untuk warga ini
      const namaWarga = wargaData.find(
        (w) => w.id === wargaId
      )?.nama_kepala_keluarga;
      if (k.kepalaWarga && k.kepalaWarga !== namaWarga) return false;

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

    if (reward) {
      adjustedAmount = 0;
      status = "Lunas (Reward)";
      type = "reward";
    } else if (keringanan) {
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
    };
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
      const nominal = getNominalForMonth(
        rowId,
        month,
        year,
        row.pembukuan,
        "payment"
      );

      const updateData = {
        [`payments.${month}.amount`]: paymentData.amount,

        [`payments.${month}.status`]: paymentData.status,
        [`payments.${month}.tanggal_bayar`]: paymentData.tanggal_bayar,
        updatedAt: new Date(),
      };

      await firestoreService.update("kkData", rowId, updateData);

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

          const existing = warga.payments?.[month] || {};

          mergedPayments[month] = {
            amount:
              existing.status === "lunas"
                ? existing.amount ?? adjusted.amount
                : adjusted.amount,
            status: existing.status || adjusted.status || "belum_bayar",
            tanggal_bayar: existing.tanggal_bayar || null,
            isReward: adjusted.type === "reward",
            isKeringanan: adjusted.type === "keringanan",
            isPembebasan: adjusted.type === "pembebasan",
            isPenghapusan: adjusted.type === "penghapusan",
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
            [`payments.${month}.status`]: "belum_bayar",
            [`payments.${month}.tanggal_bayar`]: null,
            [`payments.${month}.amount`]: 0,
            [`payments.${month}.cancelled_by`]: user?.nama || "Unknown",
            [`payments.${month}.cancelled_at`]: new Date().toISOString(),
          });

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

  const handleBatchPayment = async () => {
    if (selectedPayments.size === 0) return;

    // Lock status doesn't prevent adding new payments, only editing existing ones
    // This is per the requirement: "masih bisa menambah/entry debet/pemasukan"

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

    if (result.isConfirmed) {
      const currentDate = new Date().toISOString().split("T")[0];
      const paymentArray = Array.from(selectedPayments);

      let successCount = 0;
      let errorCount = 0;

      try {
        await Promise.all(
          paymentArray.map(async (paymentKey, i) => {
            // ambil rowId & month dengan aman
            const idx = paymentKey.lastIndexOf("-");
            const rowId = paymentKey.substring(0, idx - 4);
            const month = paymentKey.substring(idx - 3, idx);
            const year = paymentKey.substring(idx + 1);

            console.log(
              `[v0] Processing payment ${i + 1}/${paymentArray.length}:`,
              rowId,
              month
            );

            try {
              const bulanData = wargaData.find((w) => w.id === rowId).payments[
                month
              ];

              await updateIurPayment(rowId, month, {
                status: "lunas",
                tanggal_bayar: currentDate,
                amount: bulanData.amount, // ← simpan nominal saat ini
              });

              successCount++;
              console.log(
                `[v0] Successfully updated payment ${i + 1}:`,
                rowId,
                month
              );
            } catch (error) {
              errorCount++;
              console.error(`[v0] Error updating payment ${i + 1}:`, error);
            }
          })
        );

        setSelectedPayments(new Set());

        if (errorCount === 0) {
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: `${successCount} pembayaran berhasil diproses!`,
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
    selectedPayments.forEach((paymentKey) => {
      const parts = paymentKey.split("-");
      const year = Number.parseInt(parts.pop());
      const month = parts.pop();
      const rowId = parts.join("-");

      const row = filteredData.find((item) => item.id === rowId);
      if (row && row.payments[month]) {
        const nominal = getNominalForMonth(
          row.id,
          month,
          selectedYear,
          row.pembukuan,
          "display"
        );
        total += nominal.amount || nominal.originalAmount;
      }
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
                      nominal.amount > 0
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
