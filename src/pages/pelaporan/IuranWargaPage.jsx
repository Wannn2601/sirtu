"use client";

import { useState, useEffect, useMemo } from "react";
import { firestoreService } from "../../services/firebase";
import { toKey } from "../../utils/helpers";

const IuranWargaPage = () => {
  const [wargaData, setWargaData] = useState([]);
  const [rewardData, setRewardData] = useState([]);
  const [keringananData, setKeringananData] = useState([]);
  const [pengurusList, setPengurusList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState("keseluruhan");
  const [selectedWarga, setSelectedWarga] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [iurRates, setIurRates] = useState([]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [kkResult, rewards, keringanan, rates, pengurusRes] = await Promise.all([
        firestoreService.getAll("kkData"),
        firestoreService.getAll("rewardSadarIW"),
        firestoreService.getAll("keringananIUR"),
        firestoreService.getAll("iurRates"),
        firestoreService.getAll("pengurusRT"),
      ]);
      setWargaData(kkResult || []);
      setRewardData(rewards || []);
      setKeringananData(keringanan || []);
      setIurRates(rates || []);
      setPengurusList(pengurusRes || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const getPenandatanganInfo = () => {
    const bendahara = pengurusList.find(
      (p) =>
        p.status?.toLowerCase() === "aktif" &&
        p.jabatan?.toLowerCase().includes("bendahara")
    );
    return {
      namaBendahara: bendahara?.nama_warga || "[Nama Bendahara]",
    };
  };

  const getNominalForMonth = (monthKey, year) => {
    const monthIndex = monthKeys.indexOf(monthKey) + 1;
    const key = `${monthIndex}-${year}`;
    const keyZeroPad = `${String(monthIndex).padStart(2, "0")}-${year}`;

    let rate = iurRates.find((r) => {
      const formatted = (r.bulan_berlaku || "").replace(/^(\d{1})-/, "$1-");
      return formatted === key || formatted === keyZeroPad || (Number(r.bulan) === monthIndex && Number(r.tahun) === year);
    });

    if (!rate && iurRates.length > 0) {
      const sortedRates = [...iurRates].sort((a, b) => {
        const [mA, yA] = (a.bulan_berlaku || "1-2026").split("-").map(Number);
        const [mB, yB] = (b.bulan_berlaku || "1-2026").split("-").map(Number);
        return (yA * 12 + mA) - (yB * 12 + mB);
      });

      const validRates = sortedRates.filter(r => {
        const [m, y] = (r.bulan_berlaku || "1-2026").split("-").map(Number);
        return (y * 12 + m) <= (year * 12 + monthIndex);
      });

      if (validRates.length > 0) {
        rate = validRates[validRates.length - 1];
      } else {
        rate = sortedRates[0];
      }
    }

    return rate ? Number(rate.besaran_iuran) || 0 : 15000;
  };

  function expandRange(startKey, endKey) {
    const result = [];
    let cursor = startKey;

    while (cursor <= endKey) {
      result.push(cursor);
      const [y, m] = cursor.split("-");
      const next = new Date(Number(y), Number(m), 1);
      cursor = `${next.getFullYear()}-${String(next.getMonth()).padStart(2, "0")}`;
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

      for (const reward of rewardData) {
        if ((reward.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase()) continue;
        if (reward.kepalaWarga?.toLowerCase() !== namaKK?.toLowerCase()) continue;

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

      for (const k of keringananData) {
        if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase()) continue;
        if (k.kepalaWarga?.toLowerCase() !== namaKK?.toLowerCase()) continue;

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
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agustus", "Sept", "Okt", "Nov", "Des"
  ];

  const monthKeys = [
    "januari", "februari", "maret", "april", "mei", "juni", 
    "juli", "agustus", "september", "oktober", "november", "desember"
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

        const adj = getAdjustedPaymentStatus(w, monthKey, selectedYear, nominal);

        if (adj) {
          base.amount = adj.amount;
          if (adj.status === "reward") {
            base.isReward = true;
            base.status = "reward";
            base.amount = 0;
            base.originalAmount = nominal;
          } else if (adj.status === "PEMBEBASAN") {
            base.isPembebasan = true;
            base.status = "bebas";
            base.amount = 0;
          } else if (adj.status === "PENGHAPUSAN") {
            base.isPenghapusan = true;
            base.status = "hapus";
            base.amount = 0;
          } else if (adj.status === "keringanan") {
            base.isKeringanan = true;
            base.status = "keringanan";
          }
        } else {
          base.status = raw?.status ?? "belum_bayar";
          base.amount = raw?.status === "lunas" ? (raw?.amount ?? nominal) : nominal;
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
    const currentRealYear = new Date().getFullYear();
    const currentRealMonth = new Date().getMonth() + 1;

    return combinedData.map((item) => {
      let totalTunggakan = 0;
      let totalPembebasan = 0;
      let totalKeringanan = 0;
      let totalDibayar = 0;

      monthKeys.forEach((monthKey, index) => {
        const monthNumber = index + 1;
        const p = item.payments[monthKey];
        const nominalRate = p.originalAmount || getNominalForMonth(monthKey, selectedYear);

        const isFutureMonthInCurrentYear = (selectedYear === currentRealYear && monthNumber >= currentRealMonth);
        const isPastOrCurrentYear = selectedYear < currentRealYear;

        if (p.isPembebasan || p.isPenghapusan) {
          totalPembebasan += nominalRate;
        } else if (p.isKeringanan) {
          totalKeringanan += (nominalRate - p.amount);
          if (p.status === "lunas") {
            totalDibayar += p.amount;
          } else if (isPastOrCurrentYear || !isFutureMonthInCurrentYear) {
            totalTunggakan += p.amount > 0 ? p.amount : nominalRate;
          }
        } else if (p.isReward) {
          // Reward
        } else if (p.status === "lunas") {
          totalDibayar += p.amount;
        } else {
          if (isPastOrCurrentYear || !isFutureMonthInCurrentYear) {
            totalTunggakan += nominalRate;
          }
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
  }, [combinedData, selectedYear, iurRates]);

  const filteredData = enrichData
    .slice()
    .sort((a, b) => a.nama_kk.localeCompare(b.nama_kk, "id", { sensitivity: "base" }))
    .filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.nama_kk.toLowerCase().includes(search) ||
        item.alamat.toLowerCase().includes(search);
      const matchesWarga = reportType === "keseluruhan" || item.nama_kk === selectedWarga;
      return matchesSearch && matchesWarga;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const wargaNames = [...new Set(enrichData.map((item) => item.nama_kk))];
  const currentTtd = getPenandatanganInfo();

  const formatCurrency = (amount) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const getPaymentStatus = (payment) => {
    if (payment.isReward) return "bg-sky-100 text-sky-800 font-semibold shadow-sm";
    if (payment.isPembebasan) return "bg-purple-100 text-purple-800 font-semibold shadow-sm";
    if (payment.isPenghapusan) return "bg-slate-200 text-slate-800 font-semibold shadow-sm";
    if (payment.isKeringanan) return "bg-amber-100 text-amber-800 font-semibold shadow-sm";
    if (payment.status === "lunas") return "bg-emerald-100 text-emerald-800 font-semibold shadow-sm";
    return "bg-rose-50 text-rose-600 border border-rose-100";
  };

  const getPaymentStatusSymbol = (payment) => {
    if (payment.isReward) return "R";
    if (payment.isPembebasan) return "B";
    if (payment.isPenghapusan) return "H";
    if (payment.isKeringanan) return "K";
    if (payment.status === "lunas") return "✓";
    return "X";
  };

  const renderPaginationFooter = () => (
    <div className="mt-6 px-6 py-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="font-medium">Show:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number.parseInt(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="text-slate-500">data per halaman</span>
      </div>

      <div className="text-sm text-slate-600 font-medium">
        Menampilkan <span className="text-slate-900 font-semibold">{filteredData.length > 0 ? startIndex + 1 : 0}</span> sampai{" "}
        <span className="text-slate-900 font-semibold">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> dari{" "}
        <span className="text-slate-900 font-semibold">{filteredData.length}</span> data
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          ‹ Prev
        </button>
        <div className="px-3 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-sm border border-indigo-100">
          {currentPage} / {totalPages || 1}
        </div>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Next ›
        </button>
      </div>
    </div>
  );

  const renderKeseluruhanTable = () => (
    <div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">LAPORAN IURAN WAJIB WARGA TAHUN {selectedYear}</h2>
          <h3 className="text-base font-semibold text-indigo-600 mt-1">RT 05 RW 08 KELURAHAN PADANGSARI</h3>
          <p className="text-xs text-slate-400 mt-1">Per: {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse bg-white text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">NO</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-xs tracking-wider border-r border-slate-700">Nama KK</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-xs tracking-wider border-r border-slate-700">Alamat</th>
                <th colSpan={12} className="px-4 py-2 font-semibold text-center text-xs tracking-wider bg-indigo-600 border-b border-indigo-500">Bulan Pembayaran</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-l border-r border-slate-700">Jml<br />Tunggakan</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">Pembebasan</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">Keringanan</th>
                <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider">Total<br />Dibayar</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-xs">
                {months.map((month) => (
                  <th key={month} className="px-2 py-2 text-center border-r border-slate-700 font-medium">{month}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-200">{startIndex + index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-200">{item.nama_kk}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-200">{item.alamat}</td>
                  {monthKeys.map((monthKey) => {
                    const payment = item.payments?.[monthKey] || { status: "belum_bayar" };
                    return (
                      <td key={monthKey} className={`px-2 py-2 text-center text-xs border-r border-slate-200 ${getPaymentStatus(payment)}`}>
                        {getPaymentStatusSymbol(payment)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-bold text-rose-600 border-r border-slate-200 bg-rose-50/30">
                    {formatCurrency(item.total_tunggakan)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-200">
                    {formatCurrency(item.pembebasan)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 border-r border-slate-200">
                    {formatCurrency(item.keringanan)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 bg-emerald-50/30">
                    {formatCurrency(item.total_dibayar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan */}
        <div className="mt-10 flex justify-end">
          <div className="text-center">
            <p className="text-sm text-slate-600">Semarang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Bendahara</p>
            <div className="mt-16 border-b border-slate-400 w-48 mx-auto"></div>
            <p className="mt-2 font-bold text-slate-900 underline">({currentTtd.namaBendahara})</p>
          </div>
        </div>
      </div>

      {/* Kontrol Pagination & Show dipindah di bawah tabel */}
      {renderPaginationFooter()}
    </div>
  );

  const renderPerWargaTable = () => {
    const selectedWargaData = filteredData.find((item) => item.nama_kk === selectedWarga);
    if (!selectedWargaData) return <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">Pilih nama warga terlebih dahulu pada filter di atas</div>;

    return (
      <div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">LAPORAN IURAN WAJIB WARGA</h2>
            <h3 className="text-base font-semibold text-indigo-600 mt-1">RT 05 RW 08 KELURAHAN PADANGSARI</h3>
            <p className="text-xs text-slate-400 mt-1">Per: {new Date().toLocaleDateString("id-ID")}</p>
          </div>

          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Nama Kepala Keluarga</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{selectedWargaData.nama_kk}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Alamat</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedWargaData.alamat}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse bg-white text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">NO</th>
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">Tahun</th>
                  <th colSpan={12} className="px-4 py-2 font-semibold text-center text-xs tracking-wider bg-indigo-600 border-b border-indigo-500">Bulan Pembayaran</th>
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-l border-r border-slate-700">Jml<br />Tunggakan</th>
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">Pembebasan</th>
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider border-r border-slate-700">Keringanan</th>
                  <th rowSpan={2} className="px-4 py-3 font-semibold text-center text-xs tracking-wider">Total<br />Dibayar</th>
                </tr>
                <tr className="bg-slate-800 text-slate-200 text-xs">
                  {months.map((month) => (
                    <th key={month} className="px-2 py-2 text-center border-r border-slate-700 font-medium">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-200">1</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-900 border-r border-slate-200">{selectedWargaData.tahun}</td>
                  {monthKeys.map((monthKey) => {
                    const payment = selectedWargaData.payments?.[monthKey] || { status: "belum_bayar" };
                    return (
                      <td key={monthKey} className={`px-2 py-2 text-center text-xs border-r border-slate-200 ${getPaymentStatus(payment)}`}>
                        {getPaymentStatusSymbol(payment)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-bold text-rose-600 border-r border-slate-200 bg-rose-50/30">
                    {formatCurrency(selectedWargaData.total_tunggakan)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-200">
                    {formatCurrency(selectedWargaData.pembebasan)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 border-r border-slate-200">
                    {formatCurrency(selectedWargaData.keringanan)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 bg-emerald-50/30">
                    {formatCurrency(selectedWargaData.total_dibayar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan */}
          <div className="mt-10 flex justify-end">
            <div className="text-center">
              <p className="text-sm text-slate-600">Semarang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">Bendahara</p>
              <div className="mt-16 border-b border-slate-400 w-48 mx-auto"></div>
              <p className="mt-2 font-bold text-slate-900 underline">({currentTtd.namaBendahara})</p>
            </div>
          </div>
        </div>

        {/* Kontrol Pagination & Show dipindah di bawah tabel */}
        {renderPaginationFooter()}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Laporan Iuran Warga</h1>
          <p className="text-slate-500 text-sm mt-0.5">Kelola laporan iuran warga dengan integrasi reward dan keringanan secara transparan</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-slate-500 font-medium">Memuat data laporan...</p>
        </div>
      ) : (
        <>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Tahun Buku</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800"
              >
                {[2023, 2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Pelaporan</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  if (e.target.value === "keseluruhan") setSelectedWarga("");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800"
              >
                <option value="keseluruhan">Keseluruhan Warga</option>
                <option value="per_warga">Per Warga</option>
              </select>
            </div>

            {reportType === "per_warga" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Nama Warga</label>
                <select
                  value={selectedWarga}
                  onChange={(e) => setSelectedWarga(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800"
                  required
                >
                  <option value="">Pilih Nama Warga</option>
                  {wargaNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Cari Data</label>
              <input
                type="text"
                placeholder="Cari nama KK atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
              />
            </div>
          </div>

          {reportType === "keseluruhan" ? renderKeseluruhanTable() : renderPerWargaTable()}
        </>
      )}
    </div>
  );
};

export default IuranWargaPage;