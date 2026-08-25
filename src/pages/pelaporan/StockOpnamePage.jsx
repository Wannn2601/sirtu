"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../services/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

export default function StockOpnamePage() {
  const [userData, setUserData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedJenisAset, setSelectedJenisAset] = useState("BHP"); // Default to "BHP"
  const [selectedFormat, setSelectedFormat] = useState("rekap");
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedTanggalPelaporan, setSelectedTanggalPelaporan] = useState("");

  const [assetUsageData, setAssetUsageData] = useState([]);
  const [assetRecordsData, setAssetRecordsData] = useState([]);
  const [jenisAssetsData, setJenisAssetsData] = useState([]);
  const [kelompokAssetsData, setKelompokAssetsData] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const docs = snapshot.docs.filter(
        (doc) => doc.data().id?.toString() === userId
      );

      if (docs.length > 0) {
        setUserData({ id: docs[0].id, ...docs[0].data() });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubJenis = onSnapshot(collection(db, "jenisAssets"), (snapshot) => {
      setJenisAssetsData(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    const unsubKelompok = onSnapshot(
      collection(db, "kelompokAssets"),
      (snapshot) => {
        setKelompokAssetsData(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }
    );

    return () => {
      unsubJenis();
      unsubKelompok();
    };
  }, []);

  useEffect(() => {
    const unsubAssetRecords = onSnapshot(
      collection(db, "assetRecords"),
      (snapshot) => {
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("[v0] assetRecords loaded:", records.length);
        setAssetRecordsData(records);
      }
    );

    return () => unsubAssetRecords();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "assetUsageRecords"),
      (snapshot) => {
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("[v0] assetUsageRecords loaded:", records.length);
        setAssetUsageData(records);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log("[v0] Loading all financial data...");

      const userId = localStorage.getItem("userId") || "1";
      const usersData = await firestoreService.getAll("users");
      const currentUser =
        usersData.find((u) => u.id.toString() === userId) ||
        usersData.find((u) => u.level === "superadmin" && u.status === "aktif");

      const [laporanData, rekeningData, subRekeningData] = await Promise.all([
        firestoreService.getAll("laporanKeuangan"),
        firestoreService.getAll("rekeningKegiatan"),
        firestoreService.getAll("subRekeningKegiatan"),
      ]);

      // 🔹 Gabungkan dengan default (hindari duplikat berdasarkan id)
      const mergedRekening = [
        ...defaultRekenings.filter(
          (def) => !rekeningData.some((d) => d.id === def.id)
        ),
        ...rekeningData,
      ];

      const mergedSubRekening = [
        ...defaultSubRekenings.filter(
          (def) => !subRekeningData.some((d) => d.id === def.id)
        ),
        ...subRekeningData,
      ];

      // 🔹 Urutkan berdasarkan ID sebelum diset ke state
      const sortedRekening = mergedRekening.sort((a, b) => {
        const aNum = Number.parseFloat(a.id.replace(/[^0-9.]/g, ""));
        const bNum = Number.parseFloat(b.id.replace(/[^0-9.]/g, ""));
        return aNum - bNum;
      });

      const sortedSubRekening = mergedSubRekening.sort((a, b) => {
        const aNum = Number.parseFloat(a.id.replace(/[^0-9.]/g, ""));
        const bNum = Number.parseFloat(b.id.replace(/[^0-9.]/g, ""));
        return aNum - bNum;
      });

      // 🔹 Laporan keuangan juga bisa diurutkan berdasarkan ID atau tanggal
      const sortedLaporan = laporanData.sort((a, b) => {
        // Jika ada tanggal, urutkan berdasarkan tanggal
        if (a.tanggal && b.tanggal) {
          return new Date(a.tanggal) - new Date(b.tanggal);
        }
        // Jika tidak ada tanggal, urutkan berdasarkan ID
        return a.id > b.id ? 1 : -1;
      });

      // 🔹 Set ke state
      setLaporanKeuanganData(sortedLaporan);
      setRekeningKegiatanData(sortedRekening);
      setSubRekeningKegiatanData(sortedSubRekening);

      console.log(
        "[v0] Data keuangan berhasil dimuat & diurutkan berdasarkan ID."
      );
    } catch (error) {
      console.error("[v0] Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  function parseTanggal(tgl) {
    if (!tgl) return null;

    // Jika Firestore Timestamp
    if (tgl.toDate) return tgl.toDate();

    // Jika format: YYYY-MM-DD → aman
    if (/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
      return new Date(tgl);
    }

    // Jika format dd-mm-yyyy atau dd/mm/yyyy
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(tgl)) {
      const [d, m, y] = tgl.split(/[-/]/);
      return new Date(`${y}-${m}-${d}`);
    }

    return new Date(tgl);
  }

  const stockOpnameData = useMemo(() => {
    if (!selectedJenisAset) {
      return [];
    }

    console.log("[v0] Calculating stock opname for:", {
      jenis: selectedJenisAset,
      year: selectedYear,
      month: selectedMonth,
    });

    const kelompokMap = {
      BHP: ["bhp", "BHP"],
      "Aset Tetap": ["aset", "ASET"],
    };

    const selectedKelompokValues = kelompokMap[selectedJenisAset] || [];

    const filteredAssetRecords = assetRecordsData.filter((r) => {
      const kelompok = (r.kelompok_aset || "").toLowerCase();
      return selectedKelompokValues.some((k) => k.toLowerCase() === kelompok);
    });

    console.log("[v0] Filtered assetRecords:", filteredAssetRecords.length);

    const pencatatanMap = {
      pemakaian_bhp: "BHP",
      penghapusan_aset: "Aset Tetap",
    };

    const filteredUsageRecords = assetUsageData.filter(
      (r) => pencatatanMap[r.pencatatan] === selectedJenisAset
    );

    console.log(
      "[v0] Filtered assetUsageRecords:",
      filteredUsageRecords.length
    );

    const groupedByJenis = {};

    filteredAssetRecords.forEach((record) => {
      const jenisKey = `${record.jenis_aset.trim().toLowerCase()}_${
        record.satuan
      }_${record.jenis_aset_id || ""}`;

      if (!groupedByJenis[jenisKey]) {
        groupedByJenis[jenisKey] = {
          jenis_aset: record.jenis_aset,
          satuan: record.satuan,
          keterangan: record.keterangan || "",
          kelompok_aset: record.kelompok_aset,
          stockRecords: [],
          usageRecords: [],
        };
      }

      groupedByJenis[jenisKey].stockRecords.push(record);
    });

    filteredUsageRecords.forEach((record) => {
      const jenisKey = `${record.jenis_aset.trim().toLowerCase()}_${
        record.satuan
      }_${record.jenis_aset_id || ""}`;

      if (!groupedByJenis[jenisKey]) {
        groupedByJenis[jenisKey] = {
          jenis_aset: record.jenis_aset,
          satuan: record.satuan,
          keterangan: record.keterangan || "",
          kelompok_aset: selectedJenisAset === "BHP" ? "bhp" : "aset",
          stockRecords: [],
          usageRecords: [],
        };
      }

      groupedByJenis[jenisKey].usageRecords.push(record);
    });

    console.log("[v0] Grouped by jenis:", Object.keys(groupedByJenis).length);

    const currentYear = Number.parseInt(selectedYear);
    const currentMonth = Number.parseInt(selectedMonth);

    const result = [];

    Object.values(groupedByJenis).forEach((group) => {
      // Hitung total seluruh waktu (bukan hanya bulan aktif)
      const totalMasukSemua = group.stockRecords.reduce(
        (sum, r) => sum + Number(r.volume || 0),
        0
      );

      const totalKeluarSemua = group.usageRecords.reduce(
        (sum, r) => sum + Number(r.volume || 0),
        0
      );

      const stockMasukSampaiBulanLalu = group.stockRecords
        .filter((r) => {
          const date = parseTanggal(r.tanggal);
          return (
            date &&
            date.getFullYear() === currentYear &&
            date.getMonth() + 1 <= currentMonth - 1
          );
        })
        .reduce((sum, r) => sum + (Number(r.volume) || 0), 0);

      const usageUpToLastMonth = group.usageRecords
        .filter((r) => {
          const date = parseTanggal(r.tanggal);
          return (
            date &&
            date.getFullYear() === currentYear &&
            date.getMonth() + 1 <= currentMonth - 1
          );
        })
        .reduce((sum, r) => sum + (Number(r.volume) || 0), 0);

      const sdBulanLalu = stockMasukSampaiBulanLalu - usageUpToLastMonth;

      const stockMasukBulanIni = group.stockRecords
        .filter((r) => {
          const date = parseTanggal(r.tanggal);
          return (
            date &&
            date.getFullYear() === currentYear &&
            date.getMonth() + 1 === currentMonth
          );
        })
        .reduce((sum, r) => sum + (Number(r.volume) || 0), 0);

      const usageThisMonth = group.usageRecords
        .filter((r) => {
          const date = parseTanggal(r.tanggal);
          return (
            date &&
            date.getFullYear() === currentYear &&
            date.getMonth() + 1 === currentMonth
          );
        })
        .reduce((sum, r) => sum + (Number(r.volume) || 0), 0);

      const stokSaatIni = sdBulanLalu + stockMasukBulanIni - usageThisMonth;

      // Detail bulan ini
      const detailMasuk = group.stockRecords.map((r) => ({
        ...r,
        jenis: "MASUK",
      }));

      const detailKeluar = group.usageRecords.map((r) => ({
        ...r,
        jenis: "KELUAR",
      }));

      const detailRecords = [...detailMasuk, ...detailKeluar]
        .filter((r) => {
          const date = parseTanggal(r.tanggal);
          if (!date) return false;

          const recordYear = date.getFullYear();
          const recordMonth = date.getMonth() + 1;

          const selectedYearNum = Number(selectedYear);
          const selectedMonthNum = Number(selectedMonth);

          // 1. FILTER TANGGAL (PALING KUAT)
          if (selectedTanggalPelaporan) {
            const filterDate = new Date(selectedTanggalPelaporan);
            return (
              date.getFullYear() === filterDate.getFullYear() &&
              date.getMonth() === filterDate.getMonth() &&
              date.getDate() === filterDate.getDate()
            );
          }

          // 2. FILTER TAHUN + BULAN (COMBINED)
          if (selectedYear && selectedMonth) {
            // hanya tampilkan data sampai titik (tahun, bulan) itu
            if (recordYear < selectedYearNum) return true;
            if (
              recordYear === selectedYearNum &&
              recordMonth <= selectedMonthNum
            )
              return true;
            return false;
          }

          // 3. FILTER TAHUN SAJA
          if (selectedYear) {
            return recordYear <= selectedYearNum;
          }

          return true;
        })

        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

      result.push({
        uraian: group.uraian
          ? `${group.jenis_aset} ${group.uraian}`
          : group.jenis_aset,

        satuan: group.satuan,
        keterangan: group.keterangan,
        sdBulanLalu,
        stockMasukBulanIni,
        pengeluaranBulanIni: usageThisMonth,
        stokSaatIni,
        detailRecords,
        stockRecordsTotal: totalMasukSemua,
        usageRecordsTotal: totalKeluarSemua,
      });
    });

    result.sort((a, b) => a.uraian.localeCompare(b.uraian));

    // HAPUS KELOMPOK YANG TIDAK PUNYA DATA SAMA SEKALI
    // HANYA tampilkan kategori yang PUNYA DATA SESUAI FILTER
    const finalResult = result.filter((item) => {
      return item.detailRecords.length > 0; // hanya detail hasil FILTER
    });

    return finalResult;
  }, [
    selectedJenisAset,
    selectedMonth,
    selectedYear,
    selectedTanggalPelaporan, // <= WAJIB DITAMBAHKAN
    assetRecordsData,
    assetUsageData,
  ]);

  const minTanggalPelaporan = useMemo(() => {
    const monthNames = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];
    const month = monthNames[Number.parseInt(selectedMonth) - 1];
    return `${selectedYear}-${month}-01`;
  }, [selectedYear, selectedMonth]);

  const rekapData = useMemo(() => {
    return stockOpnameData.filter((item) => item.detailRecords.length > 0);
  }, [stockOpnameData]);
  const jurnalData = useMemo(() => {
    return stockOpnameData.filter((item) => item.detailRecords.length > 0);
  }, [stockOpnameData]);

  // const safeFix = (num) => Number(num ?? 0).toFixed(2);

  const generatePDF = () => {
    if (!selectedJenisAset) {
      Swal.fire("Error", "Pilih Jenis Aset terlebih dahulu", "error");
      return;
    }

    const doc = new jsPDF("landscape");
    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const headerY = 15;
    doc.text(
      `LAPORAN STOCK OPNAME ${selectedFormat.toUpperCase()} ${selectedJenisAset} TAHUN ${selectedYear}`,
      doc.internal.pageSize.getWidth() / 2,
      headerY,
      { align: "center" }
    );
    doc.text(
      `RT ${userData?.RT || ""} RW ${userData?.RW || ""} KELURAHAN ${
        userData?.Kelurahan || ""
      }`,
      doc.internal.pageSize.getWidth() / 2,
      headerY + 8,
      { align: "center" }
    );
    doc.text(
      `${userData?.["Kota/Kabupaten"] || ""}`,
      doc.internal.pageSize.getWidth() / 2,
      headerY + 15,
      {
        align: "center",
      }
    );
    doc.setFontSize(11);
    doc.text(
      `Bulan Pelaporan: ${monthNames[Number.parseInt(selectedMonth) - 1]}`,
      doc.internal.pageSize.getWidth() / 2,
      headerY + 22,
      { align: "center" }
    );

    if (selectedFormat === "rekap") {
      const tableData = rekapData.map((item) => [
        item.uraian,
        safeFix(item.sdBulanLalu),
        safeFix(item.stockMasukBulanIni),
        safeFix(item.pengeluaranBulanIni),
        safeFix(item.stokSaatIni),
        item.satuan,
      ]);

      autoTable(doc, {
        startY: 60,
        head: [
          [
            "Uraian",
            "s.d. Bulan lalu",
            "Bulan Ini - Penerimaan",
            "Bulan Ini - Pengeluaran",
            "Stok Saat ini",
            "Satuan",
          ],
        ],
        body: tableData,
        theme: "grid",
      });
    } else {
      const tableData = [];

      jurnalData.forEach((item) => {
        tableData.push([
          {
            content: item.uraian,
            colSpan: 6,
            styles: { fontStyle: "bold", fillColor: [200, 200, 200] },
          },
        ]);

        if (item.detailRecords.length > 0) {
          item.detailRecords.forEach((detail) => {
            const date = new Date(detail.tanggal);
            const jenis =
              detail.jenis === "MASUK" ? "Penerimaan" : "Pengeluaran";
            tableData.push([
              date.toLocaleDateString("id-ID"),
              jenis,
              detail.keterangan || "-",
              safeFix(detail.volume),
              item.satuan,
              safeFix(item.stokSaatIni),
            ]);
          });

          tableData.push([
            {
              content: `Ringkas: S.d Bulan Lalu: ${safeFix(
                item.sdBulanLalu
              )} + Penerimaan: ${safeFix(
                item.stockMasukBulanIni
              )} - Pengeluaran: ${safeFix(
                item.pengeluaranBulanIni
              )} = ${safeFix(item.stokSaatIni)}`,
            },
          ]);
        } else {
          tableData.push([
            {
              content: "Tidak ada data",
              colSpan: 6,
              styles: { halign: "center" },
            },
          ]);
        }

        tableData.push([]); // Empty row
      });

      autoTable(doc, {
        startY: 60,
        head: [
          ["Tanggal", "Jenis", "Uraian", "Volume", "Satuan", "Stok Saat ini"],
        ],
        body: tableData,
        theme: "grid",
      });
    }

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text("Mengetahui,", 50, finalY);
    doc.text(
      `${userData?.["Kota/Kabupaten"] || ""}, ${
        selectedTanggalPelaporan || new Date().toLocaleDateString("id-ID")
      }`,
      doc.internal.pageSize.getWidth() - 80,
      finalY
    );
    doc.text(`Ketua RT`, 50, finalY + 7);
    doc.text("Sekretaris", doc.internal.pageSize.getWidth() - 80, finalY + 7);

    doc.text(`(${userData?.nama || ""})`, 50, finalY + 30);
    doc.text(
      `(${userData?.nama || ""})`,
      doc.internal.pageSize.getWidth() - 80,
      finalY + 30
    );

    doc.save(
      `Laporan-Stock-Opname-${selectedFormat}-${selectedYear}-${selectedMonth}.pdf`
    );
  };

  const generateExcel = () => {
    if (!selectedJenisAset) {
      Swal.fire("Error", "Pilih Jenis Aset terlebih dahulu", "error");
      return;
    }

    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];

    if (selectedFormat === "rekap") {
      const worksheetData = [
        [
          `LAPORAN STOCK OPNAME REKAP ${selectedJenisAset} TAHUN ${selectedYear}`,
        ],
        [
          `RT ${userData?.RT || ""} RW ${userData?.RW || ""} KELURAHAN ${
            userData?.Kelurahan || ""
          }`,
        ],
        [`${userData?.["Kota/Kabupaten"] || ""}`],
        [`Bulan Pelaporan: ${monthNames[Number.parseInt(selectedMonth) - 1]}`],
        [],
        [
          "Uraian",
          "s.d. Bulan lalu",
          "Bulan Ini - Penerimaan",
          "Bulan Ini - Pengeluaran",
          "Stok Saat ini",
          "Satuan",
        ],
        ...rekapData.map((item) => [
          item.uraian,
          safeFix(item.sdBulanLalu),
          safeFix(item.stockMasukBulanIni),
          safeFix(item.pengeluaranBulanIni),
          safeFix(item.stokSaatIni),

          item.satuan,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Opname");
      XLSX.writeFile(
        workbook,
        `Stock_Opname_Rekap_${selectedJenisAset}_${selectedYear}.xlsx`
      );
    } else {
      const worksheetData = [
        [
          `LAPORAN STOCK OPNAME JURNAL ${selectedJenisAset} TAHUN ${selectedYear}`,
        ],
        [
          `RT ${userData?.RT || ""} RW ${userData?.RW || ""} KELURAHAN ${
            userData?.Kelurahan || ""
          }`,
        ],
        [`${userData?.["Kota/Kabupaten"] || ""}`],
        [`Bulan Pelaporan: ${monthNames[Number.parseInt(selectedMonth) - 1]}`],
        [],
        ["Tanggal", "Jenis", "Uraian", "Volume", "Satuan", "Stok Saat ini"],
      ];

      jurnalData.forEach((item) => {
        worksheetData.push([item.uraian, "", "", "", "", ""]);

        if (item.detailRecords.length > 0) {
          item.detailRecords.forEach((detail) => {
            const date = new Date(detail.tanggal);
            const jenis =
              detail.jenis === "MASUK" ? "Penerimaan" : "Pengeluaran";
            worksheetData.push([
              date.toLocaleDateString("id-ID"),
              jenis,
              detail.keterangan || "-",
              safeFix(detail.volume),
              item.satuan,
              safeFix(item.stokSaatIni),
            ]);
          });

          worksheetData.push([
            `Ringkas: S.d Bulan Lalu: ${safeFix(
              item.sdBulanLalu
            )} + Penerimaan: ${safeFix(
              item.stockMasukBulanIni
            )} - Pengeluaran: ${safeFix(item.pengeluaranBulanIni)} = ${safeFix(
              item.stokSaatIni
            )}`,
            "",
            "",
            "",
            "",
            "",
          ]);
        } else {
          worksheetData.push(["Tidak ada data", "", "", "", "", ""]);
        }

        worksheetData.push([]); // Empty row
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Opname");
      XLSX.writeFile(
        workbook,
        `Stock_Opname_Jurnal_${selectedJenisAset}_${selectedYear}.xlsx`
      );
    }

    Swal.fire("Berhasil", "Excel berhasil didownload", "success");
  };
  const formatNumber = (num) => {
    const value = Number(num || 0);
    return value === 0 ? "-" : value;
  };
  const resetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedTanggalPelaporan("");
    setSelectedJenisAset("BHP");
    setSelectedFormat("rekap");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Pelaporan Barang Habis Pakai (BHP) / Aset Tetap
        </h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Filter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tahun Pembukuan
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - i
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Jenis</label>
              <select
                value={selectedJenisAset}
                onChange={(e) => setSelectedJenisAset(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BHP">Bahan Habis Pakai</option>
                <option value="Aset Tetap">Aset Tetap</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="rekap">Rekap</option>
                <option value="jurnal">Jurnal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Bulan Pelaporan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString("id-ID", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tanggal Pelaporan
              </label>
              <input
                type="date"
                value={selectedTanggalPelaporan}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTanggalPelaporan(value);

                  if (value) {
                    const d = new Date(value);
                    setSelectedYear(d.getFullYear().toString());
                    setSelectedMonth((d.getMonth() + 1).toString());
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={resetFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset Filter
            </button>

            <button
              onClick={generatePDF}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Export PDF
            </button>
            <button
              onClick={generateExcel}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Export Excel
            </button>
          </div>
        </div>

        {selectedJenisAset && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center py-4 border-b border-gray-300">
              <h2 className="text-lg font-bold">
                LAPORAN STOCK OPNAME{" "}
                {selectedJenisAset === "BHP" ? "BHP" : "ASET TETAP"}
              </h2>

              {/* <div className="bg-white p-4 rounded-lg shadow mb-6"> */}
              <p className="text-gray-700">
                RT {userData?.RT || "005"} RW {userData?.RW || "008"} Kelurahan{" "}
                {userData?.Kelurahan || "Padangsari"}{" "}
                {userData?.kabupaten_kota || "Semarang"}
              </p>
              {/* </div> */}

              <p className="text-sm font-semibold mt-2">
                Bulan Pelaporan:{" "}
                {new Date(2000, selectedMonth - 1).toLocaleString("id-ID", {
                  month: "long",
                })}{" "}
                {selectedYear}
              </p>
            </div>

            {stockOpnameData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Tidak ada data untuk filter yang dipilih
              </p>
            ) : selectedFormat === "rekap" ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Uraian</th>
                      <th className="border p-2">s.d. Bulan lalu</th>
                      <th className="border p-2">Bulan Ini - Penerimaan</th>
                      <th className="border p-2">Bulan Ini - Pengeluaran</th>
                      <th className="border p-2">Jumlah Saat ini</th>
                      <th className="border p-2">Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockOpnameData.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-2">{item.uraian}</td>
                        <td className="border p-2 text-center">
                          {formatNumber(item.sdBulanLalu)}
                        </td>

                        <td className="border p-2 text-center">
                          {formatNumber(item.stockMasukBulanIni || 0)}
                        </td>

                        <td className="border p-2 text-center">
                          {formatNumber(item.pengeluaranBulanIni)}
                        </td>

                        <td className="border p-2 text-center">
                          {formatNumber(item.stokSaatIni)}
                        </td>

                        <td className="border p-2">{item.satuan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-10 flex justify-between px-10">
                  <div className="text-center">
                    <p className="font-semibold"></p>
                    <div className="h-16"></div>
                    <p className="font-semibold"></p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Ketua RT</p>
                    <div className="h-16"></div>
                    <p className="font-semibold">
                      {userData?.nama_ketua || "(Nama Ketua RT)"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Tanggal</th>
                      <th className="border p-2">Uraian</th>
                      <th className="border p-2">Volume</th>
                      <th className="border p-2">Satuan</th>
                      <th className="border p-2">Keterangan</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rekapData.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="border p-2 font-bold">
                            {item.uraian}
                          </td>
                        </tr>

                        {item.detailRecords.length > 0 ? (
                          <>
                            {item.detailRecords.map((detail, detailIdx) => {
                              const date = new Date(detail.tanggal);
                              return (
                                <tr
                                  key={`${idx}-${detailIdx}`}
                                  className={
                                    detail.jenis === "KELUAR"
                                      ? "text-red-600 font-bold"
                                      : ""
                                  }
                                >
                                  <td className="border p-2 ">
                                    {date.toLocaleDateString("id-ID")}
                                  </td>
                                  <td className="border p-2">
                                    {detail.uraian || "-"}
                                  </td>
                                  <td className="border p-2 text-center">
                                    {detail.volume}
                                  </td>
                                  <td className="border p-2">{item.satuan}</td>
                                  <td className="border p-2">
                                    {detail.keterangan}
                                  </td>
                                </tr>
                              );
                            })}

                            <tr className="bg-gray-100 font-bold">
                              <td colSpan={2} className="border p-2">
                                Total
                              </td>
                              <td className="border p-2 text-center">
                                {item.stokSaatIni}
                              </td>
                              <td className="border p-2">{item.satuan}</td>
                              <td className="border p-2"></td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="border p-2 text-center text-gray-500"
                            >
                              Tidak ada data
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={5} className="h-10"></td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                <div className="mt-10">
                  {/* <p className="font-bold mb-4">TTD JURNAL</p> */}

                  <div className="flex justify-between px-10">
                    <div className="text-center">
                      <p className="font-semibold">Ketua RT</p>
                      <div className="h-16"></div>
                      <p className="font-semibold">
                        {userData?.nama_ketua || "(Nama Ketua RT)"}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="font-semibold">Sekretaris</p>
                      <div className="h-16"></div>
                      <p className="font-semibold">
                        {userData?.nama_sekretaris || "(Nama Sekretaris)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
