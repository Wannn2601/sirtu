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
  const [wargaData, setWargaData] = useState([]);
  const [iurPaymentsData, setIurPaymentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ nama: "Admin", level_user: "superadmin" });
  const [iurRates, setIurRates] = useState([]);
  const [rewardData, setRewardData] = useState([]);
  const [keringananData, setKeringananData] = useState([]);
  const { lockStatus } = useBendaharaLock();

  const FONNTE_TOKEN = "VjmncfdGbtxg9J3NhNyt";

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

  const shortMonthNames = {
    januari: "jan",
    februari: "feb",
    maret: "mar",
    april: "apr",
    mei: "mei",
    juni: "jun",
    juli: "jul",
    agustus: "agt",
    september: "sep",
    oktober: "okt",
    november: "nov",
    desember: "des",
  };

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

      if (!iurPayments || iurPayments.length === 0) {
        await createIurRecordsFromCitizens(kkData);
      }

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

  const getNominalForMonth = (
    wargaId,
    month,
    year,
    pembukuan = "RT",
    mode = "display"
  ) => {
    const monthLower = month.toLowerCase();
    const monthIndex = months.indexOf(monthLower) + 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isAfter0001 =
      currentHour > 0 || (currentHour === 0 && currentMinute >= 1);

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

    const currentWarga = wargaData.find((w) => w.id === wargaId);
    const paymentsByYear = currentWarga
      ? currentWarga[`payments_${year}`] || {}
      : {};
    const existing = paymentsByYear[monthLower] || paymentsByYear[month] || {};

    if (mode === "display" && existing.status !== "lunas") {
      const isFutureMonth =
        year > currentYear ||
        (year === currentYear && monthIndex > currentMonth) ||
        (year === currentYear && monthIndex === currentMonth && !isAfter0001);

      if (isFutureMonth) {
        return {
          amount: 0,
          originalAmount: baseAmount,
          status: "belum_bayar",
          type: "normal",
        };
      }
    }

    let adjustedAmount = baseAmount;
    let status = "Belum Bayar";
    let type = "normal";
    let isRewardFlag = existing.isReward || false;

    if (existing.isReward) {
      adjustedAmount = 0;
      status = "Lunas (Reward)";
      type = "reward";
    }

    const keringanan = keringananData.find((k) => {
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
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
      const kStartYear = Number.parseInt(kStart.split("-")[1]);
      const kEndYear = Number.parseInt(kEnd.split("-")[1]);

      if (year < kStartYear || year > kEndYear) return false;
      return kStart <= monthKey && monthKey <= kEnd;
    });

    if (keringanan && !isRewardFlag) {
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
      isReward: isRewardFlag,
      isPembebasan: type === "pembebasan",
      isPenghapusan: type === "penghapusan",
      isKeringanan: type === "keringanan",
    };
  };

  const recalculateAndSaveWargaYear = async (wargaId, year, pembukuanType, specificCancelledMonth = null) => {
    const warga = wargaData.find((w) => w.id === wargaId);
    if (!warga) return;

    const paymentsByYear = warga[`payments_${year}`] || {};
    const activeReward = rewardData.find(
      (r) => (r.pembukuan || "RT").toUpperCase() === pembukuanType.toUpperCase()
    );

    const updatedPaymentsYear = {};
    months.forEach((m) => {
      const existingM = paymentsByYear[m] || { status: "belum_bayar", amount: 0 };
      
      if (m === specificCancelledMonth) {
        updatedPaymentsYear[m] = {
          amount: 0,
          status: "belum_bayar",
          tanggal_bayar: null,
          isReward: false,
          isPembebasan: false,
          isPenghapusan: false,
          isKeringanan: false,
        };
      } else {
        updatedPaymentsYear[m] = { ...existingM, isReward: false };
        if (updatedPaymentsYear[m].status === "lunas" && (updatedPaymentsYear[m].amount === 0 || updatedPaymentsYear[m].amount === undefined)) {
          const nominal = getNominalForMonth(wargaId, m, year, pembukuanType, "payment");
          updatedPaymentsYear[m].amount = nominal.amount;
        }
      }
    });

    if (activeReward) {
      const frequency = Number(activeReward.frequency || 6);
      const bebasBulan = Number(activeReward.bebasBulan || 1);

      let validPaidMonths = [];
      months.forEach((m) => {
        const p = updatedPaymentsYear[m];
        if (p && p.status === "lunas" && !p.isReward && m !== specificCancelledMonth) {
          validPaidMonths.push(m);
        }
      });

      validPaidMonths.sort((a, b) => months.indexOf(a) - months.indexOf(b));

      if (validPaidMonths.length >= frequency) {
        const multiplier = Math.floor(validPaidMonths.length / frequency);
        
        for (let i = 0; i < multiplier; i++) {
          const chunk = validPaidMonths.slice(i * frequency, (i + 1) * frequency);
          if (chunk.length === frequency) {
            const lastMonthOfChunk = chunk[chunk.length - 1];
            const lastIndex = months.indexOf(lastMonthOfChunk);
            
            for (let b = 1; b <= bebasBulan; b++) {
              const freeIndex = lastIndex + b;
              if (freeIndex < months.length) {
                const freeMonthName = months[freeIndex];
                if (freeMonthName !== specificCancelledMonth && updatedPaymentsYear[freeMonthName] && updatedPaymentsYear[freeMonthName].status === "lunas") {
                  updatedPaymentsYear[freeMonthName].isReward = true;
                  updatedPaymentsYear[freeMonthName].amount = 0;
                }
              }
            }
          }
        }
      }
    }

    await firestoreService.update("kkData", wargaId, {
      [`payments_${year}`]: updatedPaymentsYear,
      updatedAt: new Date(),
    });
  };

  const calculateRewardMonthsFromBatch = (paymentArray, pembukuan = "RT") => {
    const activeReward = rewardData.find(
      (r) => (r.pembukuan || "RT").toUpperCase() === pembukuan.toUpperCase()
    );

    if (!activeReward) return [];

    const frequency = Number(activeReward.frequency || 6);
    const bebasBulan = Number(activeReward.bebasBulan || 1);

    const wargaPaymentMap = {};
    paymentArray.forEach((paymentKey) => {
      const lastHyphenIndex = paymentKey.lastIndexOf("-");
      const year = paymentKey.substring(lastHyphenIndex + 1);
      const secondLastHyphenIndex = paymentKey.lastIndexOf("-", lastHyphenIndex - 1);
      const month = paymentKey.substring(secondLastHyphenIndex + 1, lastHyphenIndex);
      const rowId = paymentKey.substring(0, secondLastHyphenIndex);

      if (!wargaPaymentMap[rowId]) {
        wargaPaymentMap[rowId] = [];
      }
      wargaPaymentMap[rowId].push({ month: month.toLowerCase(), year, paymentKey });
    });

    const rewardKeysToApply = [];

    Object.keys(wargaPaymentMap).forEach((rowId) => {
      const payments = wargaPaymentMap[rowId];
      const warga = wargaData.find((w) => w.id === rowId);
      const paymentsByYear = warga ? warga[`payments_${selectedYear}`] || {} : {};

      const allPaidMonths = [];
      months.forEach((m) => {
        const isCurrentBatch = payments.some((p) => p.month === m);
        const isAlreadyPaid = paymentsByYear[m]?.status === "lunas" && !paymentsByYear[m]?.isReward;
        if (isCurrentBatch || isAlreadyPaid) {
          allPaidMonths.push(m);
        }
      });

      allPaidMonths.sort((a, b) => months.indexOf(a) - months.indexOf(b));

      if (allPaidMonths.length >= frequency) {
        const multiplier = Math.floor(allPaidMonths.length / frequency);
        for (let i = 0; i < multiplier; i++) {
          const chunk = allPaidMonths.slice(i * frequency, (i + 1) * frequency);
          if (chunk.length === frequency) {
            const lastMonthOfChunk = chunk[chunk.length - 1];
            const lastIndex = months.indexOf(lastMonthOfChunk);

            for (let b = 1; b <= bebasBulan; b++) {
              const freeIndex = lastIndex + b;
              if (freeIndex < months.length) {
                const freeMonthName = months[freeIndex];
                const matchInBatch = payments.find((p) => p.month === freeMonthName);
                if (matchInBatch) {
                  rewardKeysToApply.push(matchInBatch.paymentKey);
                }
              }
            }
          }
        }
      }
    });

    return rewardKeysToApply;
  };

  const createIurRecordsFromCitizens = async (citizenData) => {
    try {
      const existingIurData = await firestoreService.getAll("iurPayments");
      const existingIds = new Set(existingIurData.map((item) => item.warga_id));
      const newIurRecords = [];

      for (const citizen of citizenData) {
        if (!existingIds.has(citizen.id_warga)) {
          const payments = {};
          months.forEach((month) => {
            payments[month] = {
              amount: 0,
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

      for (const record of newIurRecords) {
        await firestoreService.add("iurPayments", record);
      }

      if (newIurRecords.length > 0) {
        await loadAllData();
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
      const monthLower = month.toLowerCase();
      const nominal = getNominalForMonth(
        rowId,
        monthLower,
        tahun,
        row.pembukuan || "RT",
        "payment"
      );

      const updateData = {
        [`payments_${tahun}.${monthLower}.amount`]:
          paymentData.amount !== undefined ? paymentData.amount : nominal.amount,
        [`payments_${tahun}.${monthLower}.status`]: paymentData.status,
        [`payments_${tahun}.${monthLower}.tanggal_bayar`]: paymentData.tanggal_bayar,
        [`payments_${tahun}.${monthLower}.isReward`]: paymentData.isReward || false,
        [`payments_${tahun}.${monthLower}.isPembebasan`]:
          paymentData.isPembebasan || false,
        [`payments_${tahun}.${monthLower}.isPenghapusan`]:
          paymentData.isPenghapusan || false,
        [`payments_${tahun}.${monthLower}.isKeringanan`]:
          paymentData.isKeringanan || false,
        updatedAt: new Date(),
      };

      await firestoreService.update("kkData", rowId, updateData);
      await loadAllData();
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
          alamat: warga.alamat || warga.alamat_tinggal || "-",
          tahun: selectedYear,
          pembukuan: pembukuan,
          payments: mergedPayments,
        };
      })
      .filter(
        (item) =>
          item.tahun === selectedYear &&
          (item.nama_kk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alamat?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.nama_kk?.localeCompare(b.nama_kk));
  }, [wargaData, iurRates, selectedYear, searchTerm, rewardData, keringananData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAllData();
  }, []);

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
    e.preventDefault();
    if (!payment || payment.status !== "lunas") return;

    const monthLower = month.toLowerCase();

    Swal.fire({
      title: "Batalkan pembayaran?",
      text: `Kamu yakin ingin membatalkan pembayaran bulan ${month}? Status reward dan data di laporan keuangan akan disesuaikan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, batalkan",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const row = wargaData.find((w) => w.id === userId);
          const namaWarga = row ? (row.nama_kepala_keluarga || row.nama) : "Warga";
          const pembukuanType = row?.pembukuan || "RT";
          
          const shortM = shortMonthNames[monthLower] || month;
          const shortY = String(selectedYear).slice(-2);
          const targetStr = `${shortM}'${shortY}`;

          await recalculateAndSaveWargaYear(userId, selectedYear, pembukuanType, monthLower);

          const allLaporan = await firestoreService.getAll("laporanKeuangan");
          const matchedLaporanList = allLaporan.filter(
            (l) =>
              l.detail &&
              l.detail.toLowerCase().includes(namaWarga.toLowerCase()) &&
              l.detail.toLowerCase().includes(targetStr.toLowerCase())
          );

          for (const lap of matchedLaporanList) {
            await firestoreService.delete("laporanKeuangan", lap.id);
          }

          Swal.fire("Berhasil!", "Pembayaran telah dibatalkan, reward dikalkulasi ulang, dan laporan diperbarui.", "success");
          await loadAllData();
        } catch (error) {
          console.error("Error batal bayar:", error);
          Swal.fire("Error", "Gagal membatalkan pembayaran.", "error");
        }
      }
    });
  };

  const sendWhatsAppNotification = async (targetPhone, messageContent) => {
    if (!targetPhone) {
      console.warn("Nomor WhatsApp warga tidak ditemukan.");
      return false;
    }

    let formattedPhone = targetPhone.toString().replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    }

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: messageContent,
        }),
      });

      const resData = await response.json();
      if (resData.status) {
        console.log("✅ Pesan WhatsApp berhasil dikirim via Fonnte ke:", formattedPhone);
        return true;
      } else {
        console.error("❌ Gagal mengirim WhatsApp oleh Fonnte:", resData.reason || resData.message);
        return false;
      }
    } catch (err) {
      console.error("❌ Error koneksi ke Fonnte API:", err);
      return false;
    }
  };

  const recordToLaporanKeuangan = async (paymentArray, pembukuanType, customInputDate) => {
    try {
      const transactionDate = customInputDate || new Date().toISOString().split("T")[0];
      const nowTimestamp = new Date();
      const wargaMap = {};

      paymentArray.forEach((paymentKey) => {
        const lastHyphenIndex = paymentKey.lastIndexOf("-");
        const year = paymentKey.substring(lastHyphenIndex + 1);
        const secondLastHyphenIndex = paymentKey.lastIndexOf("-", lastHyphenIndex - 1);
        const month = paymentKey.substring(secondLastHyphenIndex + 1, lastHyphenIndex);
        const rowId = paymentKey.substring(0, secondLastHyphenIndex);

        if (!wargaMap[rowId]) {
          wargaMap[rowId] = { items: [], year };
        }
        wargaMap[rowId].items.push({ month: month.toLowerCase(), year });
      });

      for (const [rowId, data] of Object.entries(wargaMap)) {
        const row = wargaData.find((w) => w.id === rowId);
        const namaWarga = row ? (row.nama_kepala_keluarga || row.nama) : "Warga";
        const idKkVal = row?.id_kk || row?.id || "KK";
        const items = data.items;

        let totalPenerimaanForWarga = 0;
        items.forEach((item) => {
          const nominal = getNominalForMonth(rowId, item.month, Number(item.year), pembukuanType, "payment");
          totalPenerimaanForWarga += nominal.amount;
        });

        if (totalPenerimaanForWarga <= 0) continue;

        const random6Digits = Math.floor(100000 + Math.random() * 900000);
        const currentActiveMonthNumber = new Date().getMonth() + 1;
        const formattedCurrentMonthCode = String(currentActiveMonthNumber).padStart(2, "0");
        const generatedNoArsip = `${random6Digits}.${formattedCurrentMonthCode}`;

        const formattedMonthsList = items.map((item) => {
          const sm = shortMonthNames[item.month] || item.month;
          const sy = String(item.year).slice(-2);
          return `${sm}'${sy}`;
        }).join(", ");

        const detailText = `IPL bulan: ${formattedMonthsList} (${namaWarga})`;

        const laporanPayload = {
          createdAt: nowTimestamp,
          detail: detailText,
          dibuat_oleh: user?.nama || "Super Administrator",
          id_sub_rekening_kegiatan: "1.2",
          jenis_pembukuan: "Penerimaan",
          kategori: "kas_rt",
          no_arsip: generatedNoArsip,
          pembukuan: pembukuanType,
          penerimaan: totalPenerimaanForWarga,
          pengeluaran: 0,
          saldo_bulan_ini: 0,
          saldo_bulan_lalu: 0,
          tanggal: transactionDate,
          updatedAt: nowTimestamp,
          uraian: "",
        };

        await firestoreService.add("laporanKeuangan", laporanPayload);

        // Kirim WhatsApp ke nomor HP warga bersangkutan
        const rtVal = row?.rt || "-";
        const rwVal = row?.rw || "-";
        const kelurahanVal = row?.kelurahan || "-";
        const targetNumber = row?.no_hp || row?.whatsapp || row?.telepon || row?.no_telepon;

        const waMessage = `Terima kasih telah melaksanakan kewajiban Pembayaran IPL Warga RT ${rtVal} RW ${rwVal} kelurahan ${kelurahanVal}, bulan ${formattedMonthsList}. No Bukti Bayar: ${generatedNoArsip} Total Bayar: Rp. ${totalPenerimaanForWarga.toLocaleString("id-ID")}. Hormat kami, Ketua RT.`;

        if (targetNumber) {
          await sendWhatsAppNotification(targetNumber, waMessage);
        }
      }
      console.log("✅ Berhasil mencatat laporan keuangan dan mengirim WA");
    } catch (err) {
      console.error("Gagal mencatat laporan keuangan / kirim WA:", err);
    }
  };

  const handleBatchPayment = async () => {
    if (selectedPayments.size === 0) return;

    const paymentArray = Array.from(selectedPayments);
    const sampleKey = paymentArray[0];
    const sampleRowId = sampleKey.substring(0, sampleKey.lastIndexOf("-", sampleKey.lastIndexOf("-") - 1));
    const sampleRow = filteredData.find((item) => item.id === sampleRowId);
    const pembukuanType = sampleRow?.pembukuan || "RT";

    const rewardKeysSet = new Set(calculateRewardMonthsFromBatch(paymentArray, pembukuanType));

    const wargaMapSummary = {};
    paymentArray.forEach((paymentKey) => {
      const lastHyphenIndex = paymentKey.lastIndexOf("-");
      const year = paymentKey.substring(lastHyphenIndex + 1);
      const secondLastHyphenIndex = paymentKey.lastIndexOf("-", lastHyphenIndex - 1);
      const month = paymentKey.substring(secondLastHyphenIndex + 1, lastHyphenIndex);
      const rowId = paymentKey.substring(0, secondLastHyphenIndex);

      if (!wargaMapSummary[rowId]) {
        wargaMapSummary[rowId] = { monthsList: [] };
      }
      const sm = shortMonthNames[month.toLowerCase()] || month;
      const sy = String(year).slice(-2);
      wargaMapSummary[rowId].monthsList.push(`${sm}'${sy}`);
    });

    const firstRowId = Object.keys(wargaMapSummary)[0];
    const rowDetailWarga = wargaData.find((w) => w.id === firstRowId);
    const namaKKPopup = rowDetailWarga ? (rowDetailWarga.nama_kepala_keluarga || rowDetailWarga.nama) : "Warga";
    
    let allMonthsStr = "";
    if (firstRowId && wargaMapSummary[firstRowId]) {
      allMonthsStr = wargaMapSummary[firstRowId].monthsList.join(", ");
    }
    if (Object.keys(wargaMapSummary).length > 1) {
      allMonthsStr += ` (+ Warga lainnya)`;
    }

    let previewTotal = 0;
    paymentArray.forEach((pk) => {
      const parts = pk.split("-");
      const yr = Number.parseInt(parts.pop());
      const mn = parts.pop();
      const rId = parts.join("-");
      if (!rewardKeysSet.has(pk)) {
        const rItem = filteredData.find(x => x.id === rId);
        const nom = getNominalForMonth(rId, mn.toLowerCase(), yr, rItem?.pembukuan || "RT", "display");
        previewTotal += nom.amount || nom.originalAmount;
      }
    });

    const todayStr = new Date().toISOString().split("T")[0];

    // Konfirmasi dengan SweetAlert mencakup input tanggal pembayaran
    const result = await Swal.fire({
      title: `<div style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">Konfirmasi Pembayaran</div>`,
      html: `
        <style>
          @keyframes pulse-icon {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            70% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
          .custom-icon-box {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px auto;
            animation: pulse-icon 2s infinite ease-in-out;
            color: white;
            font-size: 24px;
          }
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px;
            text-align: left;
            margin-top: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .info-label {
            color: #64748b;
            font-weight: 500;
          }
          .info-value {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
          }
          .swal2-input-date {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
          }
        </style>
        <div>
          <div class="custom-icon-box">💰</div>
          <p style="font-size: 14px; color: #334155; margin-bottom: 10px; font-weight: 500;">
            Anda akan mencatat Penerimaan Iuran Warga a.n. <span style="color: #059669; font-weight: 700;">${namaKKPopup}</span>
          </p>
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Iuran Bulan</span>
              <span class="info-value" style="max-width: 180px; word-break: break-word;">${allMonthsStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sejumlah</span>
              <span class="info-value" style="color: #059669; font-size: 14px;">Rp ${previewTotal.toLocaleString("id-ID")}</span>
            </div>
            <div class="info-row" style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <span class="info-label">Tanggal Pembayaran</span>
              <input type="date" id="swal-input-tanggal" class="swal2-input-date" value="${todayStr}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Proses Pembayaran",
      cancelButtonText: "Batal",
      reverseButtons: true,
      preConfirm: () => {
        const tanggalInput = document.getElementById("swal-input-tanggal").value;
        if (!tanggalInput) {
          Swal.showValidationMessage("Tanggal pembayaran wajib diisi!");
        }
        return tanggalInput;
      }
    });

    if (result.isConfirmed) {
      const customInputDate = result.value;
      let successCount = 0;
      let errorCount = 0;

      try {
        await Promise.all(
          paymentArray.map(async (paymentKey) => {
            const lastHyphenIndex = paymentKey.lastIndexOf("-");
            const year = paymentKey.substring(lastHyphenIndex + 1);
            const secondLastHyphenIndex = paymentKey.lastIndexOf(
              "-",
              lastHyphenIndex - 1
            );
            const month = paymentKey.substring(
              secondLastHyphenIndex + 1,
              lastHyphenIndex
            );
            const rowId = paymentKey.substring(0, secondLastHyphenIndex);

            try {
              const wargaRow = wargaData.find((w) => w.id === rowId);
              if (!wargaRow) {
                errorCount++;
                return;
              }

              const nominal = getNominalForMonth(
                rowId,
                month.toLowerCase(),
                selectedYear,
                wargaRow.pembukuan || "RT",
                "payment"
              );

              const isThisMonthReward = rewardKeysSet.has(paymentKey);

              await updateIurPayment(rowId, month.toLowerCase(), {
                status: "lunas",
                tanggal_bayar: customInputDate,
                amount: isThisMonthReward ? 0 : nominal.amount,
                isReward: isThisMonthReward,
              });

              successCount++;
            } catch (err) {
              console.error("Error payment item:", err);
              errorCount++;
            }
          })
        );

        await recordToLaporanKeuangan(paymentArray, pembukuanType, customInputDate);

        setSelectedPayments(new Set());
        await loadAllData();

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `${successCount} pembayaran berhasil diproses, dicatat ke Laporan Keuangan, dan WA terkirim!`,
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Batch payment error:", err);
        Swal.fire("Error", "Terjadi kesalahan saat memproses pembayaran.", "error");
      }
    }
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

    if (paymentArray.length === 0) return 0;

    const sampleKey = paymentArray[0];
    const sampleRowId = sampleKey.substring(0, sampleKey.lastIndexOf("-", sampleKey.lastIndexOf("-") - 1));
    const sampleRow = filteredData.find((item) => item.id === sampleRowId);
    const pembukuanType = sampleRow?.pembukuan || "RT";

    const rewardKeysSet = new Set(calculateRewardMonthsFromBatch(paymentArray, pembukuanType));

    paymentArray.forEach((paymentKey) => {
      const parts = paymentKey.split("-");
      const year = Number.parseInt(parts.pop());
      const month = parts.pop();
      const rowId = parts.join("-");

      const row = filteredData.find((item) => item.id === rowId);
      if (!row) return;

      if (rewardKeysSet.has(paymentKey)) {
        return; 
      }

      const nominal = getNominalForMonth(
        row.id,
        month.toLowerCase(),
        selectedYear,
        row.pembukuan,
        "display"
      );

      if (nominal.isReward || nominal.isPembebasan) {
        return;
      }

      total += nominal.amount || nominal.originalAmount;
    });

    return total;
  }, [selectedPayments, filteredData, rewardData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data pembayaran iuran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IUR-Ku</h1>
          <p className="text-gray-600">
            Kelola pembayaran iuran warga terintegrasi Reward Sadar IW & Laporan Keuangan
          </p>
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
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-blue-700">Lunas (Reward Berdasarkan Frequency)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-blue-700">Pembebasan / Keringanan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-blue-700">Belum Bayar</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {selectedPayments.size > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total Tagihan Dipilih: Rp {selectedTotal.toLocaleString("id-ID")}
            </span>
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border border-gray-300"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border border-gray-300"
                >
                  Nama KK
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border border-gray-300"
                >
                  Alamat
                </th>
                <th
                  colSpan={12}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300"
                >
                  Bulan Pembayaran ({selectedYear})
                </th>
              </tr>
              <tr>
                {months.map((month, idx) => (
                  <th
                    key={month}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300"
                  >
                    {monthNames[idx]}
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
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300 font-medium">
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

                    const displayAmount =
                      payment.isPembebasan || payment.isPenghapusan || payment.isReward
                        ? 0
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
                        <div className="relative pointer-events-none sm:pointer-events-auto">
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
                                className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                              />
                            </div>
                          )}

                          <div className={`font-medium pointer-events-auto ${isPaid ? "text-white" : ""}`}>
                            Rp {displayAmount.toLocaleString("id-ID")}
                          </div>

                          {isPaid && payment.isReward && (
                            <div className="text-[10px] mt-1 text-white font-bold bg-blue-700 rounded px-1">
                              REWARD
                            </div>
                          )}
                          {isPaid && payment.isPembebasan && (
                            <div className="text-[10px] mt-1 text-white font-bold bg-purple-700 rounded px-1">
                              BEBAS
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

        {/* 🟢 Kontrol Pagination & Show Items per Page */}
        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number.parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
            </select>
            <span>data per halaman</span>
          </div>

          <div className="text-sm text-gray-600">
            Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} sampai{" "}
            {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
            {filteredData.length} data
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm font-medium">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IURKuPage;