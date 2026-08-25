"use client";

import { useState, useEffect, useMemo } from "react";
import { firestoreService } from "../../services/firebase";
import { toKey } from "../../utils/helpers";

const IuranWargaPage = () => {
  const [iurPaymentsData, setIurPaymentsData] = useState([]);
  const [wargaData, setWargaData] = useState([]);
  const [rewardData, setRewardData] = useState([]);
  const [keringananData, setKeringananData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState("keseluruhan");
  const [selectedWarga, setSelectedWarga] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [iurRates, setIurRates] = useState([]);

  const loadIurRates = async () => {
    try {
      const rates = await firestoreService.getAll("iurRates");
      setIurRates(rates || []);
    } catch (err) {
      console.error("Error loading iurRates:", err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [kkResult, rewards, keringanan] = await Promise.all([
        firestoreService.getAll("kkData"),
        firestoreService.getAll("rewardSadarIW"),
        firestoreService.getAll("keringananIUR"),
      ]);
      setWargaData(kkResult || []);
      setRewardData(rewards || []);
      setKeringananData(keringanan || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    loadIurRates();
  }, []);

  const getNominalForMonth = (monthKey, year) => {
    const monthIndex = monthKeys.indexOf(monthKey) + 1;
    const key = `${String(monthIndex).padStart(2, "0")}-${year}`;

    // Normalisasi data Firestore agar 1-2025 → 01-2025
    const rate = iurRates.find((r) => {
      const formatted = r.bulan_berlaku.replace(/^(\d{1})-/, "0$1-");
      return formatted === key;
    });

    return rate ? Number(rate.besaran_iuran) || 0 : 0;
  };
  function expandRange(startKey, endKey) {
    const result = [];
    let cursor = startKey;

    while (cursor <= endKey) {
      result.push(cursor);
      const [y, m] = cursor.split("-");
      const next = new Date(Number(y), Number(m), 1);
      cursor = `${next.getFullYear()}-${String(next.getMonth()).padStart(
        2,
        "0"
      )}`;
    }

    return result;
  }

  function getRewardMonths(reward) {
    const [sM, sY] = reward.start.split(":");
    const [eM, eY] = reward.end.split(":");

    const startKey = `${sY}-${sM.padStart(2, "0")}`;
    const endKey = `${eY}-${eM.padStart(2, "0")}`;

    const allMonths = expandRange(startKey, endKey);

    const count = Number(reward.bebasBulan || 1);

    // Ambil hanya bulan terakhir sesuai bebasBulan
    return allMonths.slice(allMonths.length - count);
  }
  function isRewardMonth(monthYM, reward) {
    const rewardMonths = getRewardMonths(reward);
    return rewardMonths.includes(monthYM);
  }
  const getAdjustedPaymentStatus = (warga, monthKey, year, nominalAmount) => {
    try {
      const monthIndex = monthKeys.indexOf(monthKey) + 1;
      const monthYM = `${year}-${String(monthIndex).padStart(2, "0")}`;

      const namaKK = warga.nama_kepala_keluarga || warga.nama;
      const pembukuan = warga.pembukuan || "RT";

      // ================================
      // 1. CEK REWARD (koleksi rewardSadarIW)
      // ================================
      for (const reward of rewardData) {
        if ((reward.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
          continue;

        if (reward.kepalaWarga?.toLowerCase() !== namaKK.toLowerCase())
          continue;

        const [sM, sY] = reward.start.split(":");
        const [eM, eY] = reward.end.split(":");

        const startKey = `${sY}-${sM.padStart(2, "0")}`;
        const endKey = `${eY}-${eM.padStart(2, "0")}`;

        if (startKey <= monthYM && monthYM <= endKey) {
          if (isRewardMonth(monthYM, reward)) {
            return { status: "reward", amount: 0 };
          }
        }
      }

      // ================================
      // 2. KERINGANAN / PEMBEBASAN / PENGHAPUSAN
      // ================================
      for (const k of keringananData) {
        if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
          continue;

        if (k.kepalaWarga?.toLowerCase() !== namaKK.toLowerCase()) continue;

        const kStart = toKey(k.start);
        const kEnd = toKey(k.end);

        if (!kStart || !kEnd) continue;

        if (kStart <= monthYM && monthYM <= kEnd) {
          if (k.jenis === "PEMBEBASAN" || k.jenis === "PENGHAPUSAN") {
            return { status: k.jenis, amount: 0 };
          }

          if (k.jenis === "KERINGANAN") {
            let amount = nominalAmount;

            if (k.bentuk === "rupiah") {
              amount = Math.max(0, nominalAmount - (k.potongan || 0));
            } else {
              amount = Math.max(0, nominalAmount * (1 - (k.persen || 0) / 100));
            }
            return { status: "keringanan", amount };
          }
        }
      }

      return null;
    } catch (err) {
      console.error("Error adjustment:", err);
      return null;
    }
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agustus",
    "Sept",
    "Okt",
    "Nov",
    "Des",
  ];

  const monthKeys = [
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

  const formatAlamat = (data) => {
    const alamat = data.alamat || "";
    const noRumah = data.no_rumah ? `No. ${data.no_rumah}` : "";

    if (!alamat && !noRumah) return "-";
    return [alamat, noRumah].filter(Boolean).join(" | ");
  };
  const combinedData = useMemo(() => {
    if (!Array.isArray(wargaData)) return [];

    return wargaData.map((w) => {
      const pembukuan = w.pembukuan || "RT";

      const payments = {};
      monthKeys.forEach((monthKey) => {
        const raw = w[`payments_${selectedYear}`]?.[monthKey] || null;

        const nominal = getNominalForMonth(monthKey, selectedYear);

        // base payment
        const base = {
          amount: raw?.amount ?? nominal,
          originalAmount: nominal,
          status: raw?.status ?? "belum_bayar",

          isReward: false,
          isPembebasan: false,
          isPenghapusan: false,
          isKeringanan: false,

          tanggal_bayar: raw?.tanggal_bayar || null,
        };

        // apply reward / keringanan
        // apply reward / keringanan / pembebasan
        const adj = getAdjustedPaymentStatus(
          w,
          monthKey,
          selectedYear,
          nominal
        );

        if (adj) {
          base.amount = adj.amount;

          if (adj.status === "reward") {
            base.isReward = true;
            base.status = "reward";
            base.amount = 0;
            base.originalAmount = nominal; // tetap 50.000 untuk pelaporan
            return (payments[monthKey] = base);
          }

          if (adj.status === "PEMBEBASAN") {
            base.isPembebasan = true;
            base.status = "bebas";
            base.amount = 0;
          }

          if (adj.status === "PENGHAPUSAN") {
            base.isPenghapusan = true;
            base.status = "hapus";
            base.amount = 0;
          }

          if (adj.status === "keringanan") {
            base.isKeringanan = true;
            base.status = "keringanan";
          }
        } else {
          // Tidak ada reward/keringanan → status asli warga
          base.status = raw?.status ?? "belum_bayar";
          base.amount = raw?.amount ?? nominal;
        }

        payments[monthKey] = base;
      });

      return {
        id: w.id,
        nama_kk: w.nama_kepala_keluarga || w.nama,
        alamat: formatAlamat(w),
        tahun: selectedYear,
        payments,
        pembukuan,
      };
    });
  }, [wargaData, selectedYear, rewardData, keringananData, iurRates]);

  const enrichData = useMemo(() => {
    return combinedData.map((item) => {
      let totalTunggakan = 0;
      let totalPembebasan = 0;
      let totalKeringanan = 0;
      let totalDibayar = 0;

      monthKeys.forEach((monthKey) => {
        const p = item.payments[monthKey];
        if (p.isPembebasan || p.isPenghapusan) {
          totalPembebasan += p.originalAmount;
        } else if (p.isKeringanan) {
          totalKeringanan += p.originalAmount - p.amount;
          totalDibayar += p.amount;
        } else if (p.isReward) {
          // REWARD TIDAK MASUK HITUNGAN APA PUN
          // amount = 0, ditandai biru saja
        } else if (p.status === "lunas" && !p.isReward) {
          totalDibayar += p.amount;
        } else {
          totalTunggakan += p.amount;
        }
      });

      return {
        ...item,
        total_tunggakan: totalTunggakan,
        pembebasan: totalPembebasan,
        keringanan: totalKeringanan,
        total_dibayar: totalDibayar,
      };
    });
  }, [combinedData]);

  const filteredData = enrichData
    // 1. SORT A - Z
    .slice() // supaya tidak mutate enrichData
    .sort((a, b) =>
      a.nama_kk.localeCompare(b.nama_kk, "id", { sensitivity: "base" })
    )

    // 2. APPLY FILTER
    .filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.nama_kk.toLowerCase().includes(search) ||
        item.alamat.toLowerCase().includes(search);

      const matchesWarga =
        reportType === "keseluruhan" || item.nama_kk === selectedWarga;

      return matchesSearch && matchesWarga;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const wargaNames = [...new Set(enrichData.map((item) => item.nama_kk))];

  const formatCurrency = (amount) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const getPaymentStatus = (payment) => {
    if (payment.isReward) return "bg-blue-200 text-blue-800 font-semibold";

    if (payment.isPembebasan)
      return "bg-purple-200 text-purple-800 font-semibold";

    if (payment.isPenghapusan) return "bg-gray-300 text-gray-800 font-semibold";

    if (payment.isKeringanan)
      return "bg-yellow-200 text-yellow-800 font-semibold";

    if (payment.status === "lunas")
      return "bg-green-200 text-green-800 font-semibold";

    return "bg-red-200 text-red-800 font-semibold";
  };

  const getPaymentStatusSymbol = (payment) => {
    if (payment.isReward) return "R";
    if (payment.isPembebasan) return "B";
    if (payment.isPenghapusan) return "H";
    if (payment.isKeringanan) return "K";

    if (payment.status === "lunas") return "✓";
    if (payment.status === "belum_bayar") return "X";

    return "?";
  };

  const renderKeseluruhanTable = () => (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold">
          LAPORAN IURAN WAJIB WARGA TAHUN {selectedYear}
        </h2>
        <h3 className="text-base font-semibold">
          RT 05 RW 08 KELURAHAN PADANGSARI
        </h3>
        <p className="text-sm">Per: {new Date().toLocaleDateString("id-ID")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                NO
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Nama KK
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Alamat
              </th>
              <th
                colSpan={12}
                className="border border-gray-300 px-4 py-2 bg-blue-50 text-center"
              >
                Bulan
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Jml
                <br />
                Tunggakan
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Pembebasan
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Keringanan
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                Total
                <br />
                Dibayar
              </th>
            </tr>
            <tr>
              {months.map((month) => (
                <th
                  key={month}
                  className="border border-gray-300 px-2 py-1 bg-blue-50 text-xs"
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {startIndex + index + 1}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {item.nama_kk}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {item.alamat}
                </td>
                {monthKeys.map((monthKey) => {
                  const payment = item.payments?.[monthKey] || {
                    status: "belum_bayar",
                  };
                  return (
                    <td
                      key={monthKey}
                      className={`border border-gray-300 px-2 py-1 text-center text-xs ${getPaymentStatus(
                        payment
                      )}`}
                    >
                      {getPaymentStatusSymbol(payment)}
                    </td>
                  );
                })}
                <td className="border border-gray-300 px-4 py-2 text-right text-red-600 font-semibold">
                  {formatCurrency(item.total_tunggakan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-gray-600">
                  {formatCurrency(item.pembebasan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-yellow-600">
                  {formatCurrency(item.keringanan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-green-600 font-semibold">
                  {formatCurrency(item.total_dibayar)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p>
              Semarang,{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1">Bendahara</p>
            <div className="mt-16 border-b border-gray-400 w-48"></div>
            <p className="mt-2">(nama_bendahara_berlaku)</p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <p className="font-semibold mb-2">Keterangan:</p>
        <p>✓ = Lunas (Hijau)</p>
        <p>X = Belum Bayar (Merah)</p>
        <p>R = Reward/Bebas (Abu-abu)</p>
        <p>K = Keringanan (Kuning)</p>
        <p>- = Pembebasan (Abu-abu)</p>
      </div>
    </div>
  );

  const renderPerWargaTable = () => {
    const selectedWargaData = filteredData.find(
      (item) => item.nama_kk === selectedWarga
    );
    if (!selectedWargaData)
      return (
        <p className="text-center py-8">Pilih nama warga terlebih dahulu</p>
      );

    return (
      <div>
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">LAPORAN IURAN WAJIB WARGA</h2>
          <h3 className="text-base font-semibold">
            RT 05 RW 08 KELURAHAN PADANGSARI
          </h3>
          <p className="text-sm">
            Per: {new Date().toLocaleDateString("id-ID")}
          </p>
        </div>

        <div className="mb-4">
          <p>
            <strong>Nama Kepala Keluarga:</strong> {selectedWargaData.nama_kk}
          </p>
          <p>
            <strong>Alamat:</strong> {selectedWargaData.alamat}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  Tahun
                </th>
                <th
                  colSpan={12}
                  className="border border-gray-300 px-4 py-2 bg-blue-50 text-center"
                >
                  Bulan
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  Jml
                  <br />
                  Tunggakan
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  Pembebasan
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  Keringanan
                </th>
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-4 py-2 bg-gray-50"
                >
                  Total
                  <br />
                  Dibayar
                </th>
              </tr>
              <tr>
                {months.map((month) => (
                  <th
                    key={month}
                    className="border border-gray-300 px-2 py-1 bg-blue-50 text-xs"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  1
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {selectedWargaData.tahun}
                </td>
                {monthKeys.map((monthKey) => {
                  const payment = selectedWargaData.payments?.[monthKey] || {
                    status: "belum_bayar",
                  };
                  return (
                    <td
                      key={monthKey}
                      className={`border border-gray-300 px-2 py-1 text-center text-xs ${getPaymentStatus(
                        payment
                      )}`}
                    >
                      {getPaymentStatusSymbol(payment)}
                    </td>
                  );
                })}
                <td className="border border-gray-300 px-4 py-2 text-right text-red-600 font-semibold">
                  {formatCurrency(selectedWargaData.total_tunggakan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-gray-600">
                  {formatCurrency(selectedWargaData.pembebasan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-yellow-600">
                  {formatCurrency(selectedWargaData.keringanan)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-green-600 font-semibold">
                  {formatCurrency(selectedWargaData.total_dibayar)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-semibold mb-2">Keterangan:</p>
          <p>✓ = Lunas (Hijau)</p>
          <p>X = Belum Bayar (Merah)</p>
          <p>R = Reward/Bebas (Abu-abu)</p>
          <p>K = Keringanan (Kuning)</p>
          <p>- = Pembebasan (Abu-abu)</p>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p>
              Semarang,{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1">Bendahara</p>
            <div className="mt-16 border-b border-gray-400 w-48"></div>
            <p className="mt-2">(nama_bendahara_berlaku)</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Laporan Iuran Warga
        </h1>
        <p className="text-gray-600">
          Kelola laporan iuran warga dengan integrasi reward dan keringanan
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahun Buku
              </label>
              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number.parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pelaporan
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  if (e.target.value === "keseluruhan") setSelectedWarga("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="keseluruhan">Keseluruhan Warga</option>
                <option value="per_warga">Per Warga</option>
              </select>
            </div>

            {reportType === "per_warga" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Warga
                </label>
                <select
                  value={selectedWarga}
                  onChange={(e) => setSelectedWarga(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Pilih Nama Warga</option>
                  {wargaNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Data
              </label>
              <input
                type="text"
                placeholder="Cari nama KK atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {reportType === "keseluruhan" && (
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number.parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                Menampilkan {startIndex + 1} sampai{" "}
                {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
                {filteredData.length} data
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  ‹
                </button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
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
          )}

          {reportType === "keseluruhan"
            ? renderKeseluruhanTable()
            : renderPerWargaTable()}
        </>
      )}
    </div>
  );
};

export default IuranWargaPage;
