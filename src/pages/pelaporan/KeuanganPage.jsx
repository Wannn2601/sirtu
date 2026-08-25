"use client";

import { useState, useEffect } from "react";
import { firestoreService } from "../../services/firebase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const KeuanganPage = () => {
  const [laporanKeuanganData, setLaporanKeuanganData] = useState([]);
  const [rekeningKegiatanData, setRekeningKegiatanData] = useState([]);
  const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([]);
  const [loading, setLoading] = useState(true);
  // Dapatkan tanggal saat ini
  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0"); // misal "10"
  const currentYear = today.getFullYear();

  // Set default bulan & tahun berjalan
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPembukuan, setSelectedPembukuan] = useState("RT");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedTanggalPerlaporan, setSelectedTanggalPerlaporan] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [selectedJenisLaporan, setSelectedJenisLaporan] = useState("keuangan"); // "keuangan" or "cashbon"

  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const today = new Date();
    const currentMonthValue = today.getMonth() + 1;
    const currentYearValue = today.getFullYear();

    // If selected month/year is future, set to today
    if (
      selectedYear > currentYearValue ||
      (selectedYear === currentYearValue &&
        Number.parseInt(selectedMonth) > currentMonthValue)
    ) {
      setSelectedTanggalPerlaporan(today.toISOString().split("T")[0]);
    } else {
      // Ensure the date is within the selected month/year
      const selectedDate = new Date(selectedTanggalPerlaporan);
      if (
        selectedDate.getFullYear() !== selectedYear ||
        (selectedDate.getMonth() + 1).toString().padStart(2, "0") !==
          selectedMonth
      ) {
        // Jangan ubah tanggal pelaporan kalau bukan keseluruhan
        if (selectedMonth === "keseluruhan") {
          setSelectedTanggalPerlaporan(today.toISOString().split("T")[0]);
        }
      }
    }
  }, [selectedYear, selectedMonth, selectedTanggalPerlaporan]); // Added selectedTanggalPerlaporan to dependency array

  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log("[v0] Loading all financial data...");

      const userId = localStorage.getItem("userId") || "1";
      const usersData = await firestoreService.getAll("users");
      const currentUser =
        usersData.find((u) => u.id.toString() === userId) ||
        usersData.find((u) => u.level === "superadmin" && u.status === "aktif");

      if (currentUser) {
        setUserData({
          rt_client: currentUser.RT || currentUser.rt || "",
          rw_client: currentUser.RW || currentUser.rw || "",
          kelurahan_client:
            currentUser.Kelurahan || currentUser.kelurahan || "",
          kecamatan_client: currentUser.kecamatan || "",
          kota_client: currentUser.kabupaten_kota || currentUser.kota || "",
          provincia_client: currentUser.Provinsi || currentUser.provinsi || "",
          nama: currentUser.nama || "",
          nama_bendahara: currentUser.nama_bendahara || "",
          nama_ketua: currentUser.nama_ketua || "",
        });
      } else {
        setUserData({});
      }

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

  // 🔹 Definisi data default (sama dengan yang ada di BuatRekening & BuatSubRekening)
  const defaultRekenings = [
    {
      id: "1",
      kelompok_pembukuan: "Kas",
      pembukuan: "RT",
      status: "aktif",
      is_locked: true,
    },
    {
      id: "2",
      kelompok_pembukuan: "Kas",
      pembukuan: "PKK",
      status: "aktif",
      is_locked: true,
    },
  ];

  const defaultSubRekenings = [
    {
      id: "1.1",
      sub_rekening_kegiatan: "Saldo Kas Warga Tahun Lalu",
      pembukuan: "RT",
      id_kelompok: "1",
      is_locked: true,
    },
    {
      id: "1.2",
      sub_rekening_kegiatan: "Iuran Wajib Warga",
      pembukuan: "RT",
      id_kelompok: "1",
      is_locked: true,
    },
    {
      id: "2.1",
      sub_rekening_kegiatan: "Saldo Kas PKK Tahun Lalu",
      pembukuan: "PKK",
      id_kelompok: "2",
      is_locked: true,
    },
    {
      id: "2.2",
      sub_rekening_kegiatan: "Iuran Wajib PKK",
      pembukuan: "PKK",
      id_kelompok: "2",
      is_locked: true,
    },
  ];

  const createDummyData = async () => {
    try {
      setLoading(true);
      console.log("[v0] Creating dummy financial data...");

      // Clear existing data
      const collections = [
        "laporanKeuangan",
        "rekeningKegiatan",
        "subRekeningKegiatan",
      ];
      for (const collection of collections) {
        const existingData = await firestoreService.getAll(collection);
        for (const item of existingData) {
          await firestoreService.delete(collection, item.id);
        }
      }

      // Create rekening kegiatan data
      const rekeningKegiatanDummy = [
        {
          kelompok_pembukuan: "RT",
          kepungurusan: "RT",
          kategori: "KAS_RT",
        },
        {
          kelompok_pembukuan: "PKK",
          kepungurusan: "PKK",
          kategori: "KAS_PKK",
        },
      ];

      const createdRekening = [];
      for (const item of rekeningKegiatanDummy) {
        const created = await firestoreService.add("rekeningKegiatan", item);
        createdRekening.push(created);
      }

      // Create sub rekening kegiatan data
      const subRekeningDummy = [
        {
          id_kelompok: createdRekening[0].id,
          sub_rekening_kegiatan: "Iuran Warga RT",
        },
        {
          id_kelompok: createdRekening[0].id,
          sub_rekening_kegiatan: "Kegiatan Sosial RT",
        },
        {
          id_kelompok: createdRekening[1].id,
          sub_rekening_kegiatan: "Iuran PKK",
        },
        {
          id_kelompok: createdRekening[1].id,
          sub_rekening_kegiatan: "Kegiatan PKK",
        },
      ];

      for (const item of subRekeningDummy) {
        await firestoreService.add("subRekeningKegiatan", item);
      }

      // Create laporan keuangan data
      const laporanKeuanganDummy = [
        {
          tanggal: "2025-01-15",
          uraian: "Iuran Warga RT",
          detail: "Pembayaran iuran bulan Januari",
          saldo_bulan_lalu: 1000000,
          penerimaan: 500000,
          pengeluaran: 0,
          saldo_bulan_ini: 1500000,
          pembukuan: "RT",
          kategori: "kas_rt",
          jenis_pembukuan: "Penerimaan",
          jumlah: 500000,
        },
        {
          tanggal: "2025-01-20",
          uraian: "Kegiatan Sosial RT",
          detail: "Bantuan untuk warga kurang mampu",
          saldo_bulan_lalu: 1500000,
          penerimaan: 0,
          pengeluaran: 200000,
          saldo_bulan_ini: 1300000,
          pembukuan: "RT",
          kategori: "kas_rt",
          jenis_pembukuan: "Pengeluaran",
          jumlah: 200000,
        },
        {
          tanggal: "2025-02-10",
          uraian: "Iuran PKK",
          detail: "Pembayaran iuran PKK bulan Februari",
          saldo_bulan_lalu: 800000,
          penerimaan: 300000,
          pengeluaran: 0,
          saldo_bulan_ini: 1100000,
          pembukuan: "PKK",
          kategori: "kas_pkk",
          jenis_pembukuan: "Penerimaan",
          jumlah: 300000,
        },
        {
          tanggal: "2025-02-15",
          uraian: "Kegiatan PKK",
          detail: "Pelatihan keterampilan ibu-ibu",
          saldo_bulan_lalu: 1100000,
          penerimaan: 0,
          pengeluaran: 150000,
          saldo_bulan_ini: 950000,
          pembukuan: "PKK",
          kategori: "kas_pkk",
          jenis_pembukuan: "Pengeluaran",
          jumlah: 150000,
        },
      ];

      for (const item of laporanKeuanganDummy) {
        await firestoreService.add("laporanKeuangan", item);
      }

      console.log("[v0] Dummy financial data created successfully");
      await loadAllData();
    } catch (error) {
      console.error("[v0] Error creating dummy financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAllData();
  }, []); // hanya saat komponen pertama kali dimuat

  const months = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const jenisLaporan = [
    { value: "keseluruhan", label: "Keseluruhan" },
    { value: "sesuai_urutan", label: "Sesuai Urutan" },
  ];

  const pembukaanOptions = [
    { value: "keseluruhan", label: "Keseluruhan (RT & PKK)" },
    { value: "RT", label: "RT" },
    { value: "PKK", label: "PKK" },
  ];

  const createReportData = () => {
    const sections = {
      penerimaan: [],
      pengeluaran: [],
    };

    let filteredLaporanData = laporanKeuanganData;

    // ✅ Filter tahun
    if (selectedYear) {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const itemYear = new Date(item.tanggal).getFullYear();
        return itemYear === selectedYear;
      });
    }

    // ✅ Filter bulan (kecuali keseluruhan)
    if (selectedMonth !== "keseluruhan") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const [yearStr, monthStr] = (item.tanggal || "").split("-");
        return monthStr === selectedMonth;
      });
    }

    // ✅ Filter tanggal pelaporan hanya berlaku jika bulan = keseluruhan
    if (selectedMonth === "keseluruhan" && selectedTanggalPerlaporan) {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        return new Date(item.tanggal) <= new Date(selectedTanggalPerlaporan);
      });
    }

    // ✅ Filter berdasarkan pembukuan (RT / PKK)
    if (selectedPembukuan !== "keseluruhan") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const pembukuan = (item.pembukuan || "").trim().toUpperCase();
        const selected = selectedPembukuan.trim().toUpperCase();
        return pembukuan === selected;
      });
    }

    // ✅ Filter berdasarkan jenis laporan (Keuangan vs Cash Bon)
    if (selectedJenisLaporan === "cashbon") {
      // Filter hanya akun yang mengandung "Cash Bon", "Uang Panjar", atau "Uang Muka"
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const uraian = (item.uraian || "").toLowerCase();
        return (
          uraian.includes("cash bon") ||
          uraian.includes("uang panjar") ||
          uraian.includes("uang muka")
        );
      });
    }

    // ✅ Kelompokkan data
    filteredLaporanData.forEach((trans) => {
      const jenisPembukuan = trans.jenis_pembukuan || "";

      const transItem = {
        id: trans.id,
        tanggal: trans.tanggal,
        uraian: trans.uraian,
        detail: trans.detail,
        jumlah: trans.pengeluaran > 0 ? trans.pengeluaran : trans.penerimaan,
        jenis_pembukuan: jenisPembukuan,
        sub_rekening: trans.uraian || "",
        no_arsip: trans.no_arsip || "", // Added for Excel/PDF export
      };

      if (jenisPembukuan === "Penerimaan" || trans.penerimaan > 0) {
        sections.penerimaan.push(transItem);
      } else if (jenisPembukuan === "Pengeluaran" || trans.pengeluaran > 0) {
        sections.pengeluaran.push(transItem);
      }
    });

    // ✅ Urutkan berdasarkan tanggal
    sections.penerimaan.sort(
      (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
    );
    sections.pengeluaran.sort(
      (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
    );

    return sections;
  };

  const groupByUraian = (items) => {
    const grouped = {};
    items.forEach((item) => {
      const uraian = item.uraian;
      if (!grouped[uraian]) {
        grouped[uraian] = [];
      }
      grouped[uraian].push(item);
    });
    return grouped;
  };

  const reportData = createReportData();
  const groupedPenerimaan = groupByUraian(reportData.penerimaan);
  const groupedPengeluaran = groupByUraian(reportData.pengeluaran);

  const totalPenerimaan = reportData.penerimaan.reduce(
    (sum, item) => sum + (item.jumlah || 0),
    0
  );
  const totalPengeluaran = reportData.pengeluaran.reduce(
    (sum, item) => sum + (item.jumlah || 0),
    0
  );

  // For now using formula: saldoBulanLalu + penerimaan - pengeluaran = saldoBulanIni
  // This assumes saldoKasBulanLalu is obtained from previous month data
  // Hitung saldo bulan lalu otomatis
  // Hitung saldo kas s.d. bulan lalu berdasarkan saldo akhir bulan sebelumnya
  // Hitung saldo bulan lalu otomatis
  // === Hitung saldo kas s.d. bulan lalu dengan rantai penuh ===

  // === Hitung saldo kas s.d. bulan lalu dengan rantai penuh (versi debug) ===
  // === Hitung saldo kas s.d. bulan lalu dengan mengambil nilai terakhir dari bulan sebelumnya ===
  const currentMonthNum =
    selectedMonth === "keseluruhan"
      ? new Date().getMonth() + 1
      : Number.parseInt(selectedMonth);
  const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const lastMonthYear = currentMonthNum === 1 ? selectedYear - 1 : selectedYear;

  // Label bulan lalu
  const lastMonthLabel =
    months.find((m) => Number.parseInt(m.value) === lastMonth)?.label ||
    "Bulan Sebelumnya";

  let saldoKasBulanLalu = 0;

  // Filter all transactions from beginning of year until end of previous month
  const transaksiBulanSebelumnya = laporanKeuanganData.filter((item) => {
    if (!item.tanggal) return false;

    const [yearStr, monthStr] = (item.tanggal || "").split("-");
    const year = Number.parseInt(yearStr);
    const month = Number.parseInt(monthStr);
    const pembukuan = (item.pembukuan || "").toUpperCase();
    const selected = selectedPembukuan.toUpperCase();

    // Filter berdasarkan pembukuan
    if (selectedPembukuan !== "keseluruhan" && pembukuan !== selected) {
      return false;
    }

    // Include all transactions from January until end of previous month
    if (year < lastMonthYear) return true; // Include all from previous years
    if (year === lastMonthYear && month <= lastMonth) return true; // Include up to last month

    return false;
  });

  const transaksiBulanSebelumnyaFiltered = transaksiBulanSebelumnya.filter(
    (item) => {
      if (selectedJenisLaporan === "cashbon") {
        const uraian = (item.uraian || "").toLowerCase();
        return (
          uraian.includes("cash bon") ||
          uraian.includes("uang panjar") ||
          uraian.includes("uang muka")
        );
      }
      return true; // Include all for regular keuangan
    }
  );

  // Calculate cumulative saldo: sum all penerimaan and pengeluaran
  if (transaksiBulanSebelumnyaFiltered.length > 0) {
    const totalPenerimaanSebelumnya = transaksiBulanSebelumnyaFiltered.reduce(
      (sum, item) => {
        return sum + (Number(item.penerimaan) || 0);
      },
      0
    );

    const totalPengeluaranSebelumnya = transaksiBulanSebelumnyaFiltered.reduce(
      (sum, item) => {
        return sum + (Number(item.pengeluaran) || 0);
      },
      0
    );

    saldoKasBulanLalu = totalPenerimaanSebelumnya - totalPengeluaranSebelumnya;

    console.log(
      "[v0] Transaksi bulan sebelumnya:",
      transaksiBulanSebelumnyaFiltered.length,
      "items"
    );
    console.log(
      "[v0] Total Penerimaan sampai",
      lastMonthLabel,
      ":",
      totalPenerimaanSebelumnya
    );
    console.log(
      "[v0] Total Pengeluaran sampai",
      lastMonthLabel,
      ":",
      totalPengeluaranSebelumnya
    );
    console.log("[v0] Saldo Kas s.d. Bulan Lalu (III):", saldoKasBulanLalu);
  } else {
    console.log(
      "[v0] Tidak ada transaksi sebelum bulan",
      lastMonth,
      "tahun",
      lastMonthYear
    );
  }

  // Rumus saldo kas bulan ini
  const saldoKasBulanIni =
    totalPenerimaan - totalPengeluaran + saldoKasBulanLalu;

  // Debug hasil akhir
  console.log("[v0] Saldo Calculation:");
  console.log("[v0] Saldo Kas Bulan Lalu (III):", saldoKasBulanLalu);
  console.log("[v0] Penerimaan Bulan Ini:", totalPenerimaan);
  console.log("[v0] Pengeluaran Bulan Ini:", totalPengeluaran);
  console.log("[v0] Saldo Kas Bulan Ini (IV):", saldoKasBulanIni);

  // The createHierarchicalData function is no longer directly used for rendering the table but might be useful for other purposes.
  const createHierarchicalData = () => {
    const filteredLaporanData = laporanKeuanganData.filter((item) => {
      if (!item.tanggal) return false;

      // Filter berdasarkan tanggal pelaporan (sampai tanggal yang dipilih)
      const itemDate = new Date(item.tanggal);
      const selectedDate = new Date(selectedTanggalPerlaporan);
      if (itemDate > selectedDate) return false;

      // Filter berdasarkan jenis pembukuan (Penerimaan/Pengeluaran)
      // This filter should only be applied if 'selectedJenisLaporan' is not 'keseluruhan'
      // if (selectedJenisLaporan !== "keseluruhan" && item.jenis_pembukuan !== selectedJenisLaporan) {
      //   return false
      // }

      // Filter berdasarkan kategori (Kas RT/PKK)
      // This filter should only be applied if 'selectedPembukuan' is not 'keseluruhan'
      if (
        selectedPembukuan !== "keseluruhan" &&
        item.kategori !== selectedPembukuan
      ) {
        return false;
      }

      return true;
    });

    // Group data by jenis_pembukuan (Penerimaan/Pengeluaran)
    const groupedByJenis = {};
    filteredLaporanData.forEach((item) => {
      const jenis = item.jenis_pembukuan;
      if (!groupedByJenis[jenis]) {
        groupedByJenis[jenis] = [];
      }
      groupedByJenis[jenis].push(item);
    });

    // Create hierarchical structure
    const hierarchical = [];
    let mainCounter = 1;

    Object.keys(groupedByJenis).forEach((jenis) => {
      // Add main category header (Penerimaan/Pengeluaran)
      const jenisTotal = groupedByJenis[jenis].reduce(
        (acc, item) => {
          acc.penerimaan += item.penerimaan || 0;
          acc.pengeluaran += item.pengeluaran || 0;
          return acc;
        },
        { penerimaan: 0, pengeluaran: 0 }
      );

      const mainItem = {
        id: `main_${jenis}`,
        type: "main",
        rekening: "",
        uraian: `${mainCounter}. ${jenis.toUpperCase()}`,
        saldo_bulan_lalu: 0, // This might need to be calculated based on the previous month's closing balance
        penerimaan: jenisTotal.penerimaan,
        pengeluaran: jenisTotal.pengeluaran,
        saldo_bulan_ini: 0, // This will be calculated later
        children: [],
      };

      // Group by uraian (sub kategori)
      const groupedByUraian = {};
      groupedByJenis[jenis].forEach((item) => {
        const uraian = item.uraian;
        if (!groupedByUraian[uraian]) {
          groupedByUraian[uraian] = [];
        }
        groupedByUraian[uraian].push(item);
      });

      let subCounter = 1;
      Object.keys(groupedByUraian).forEach((uraian) => {
        const subTotal = groupedByUraian[uraian].reduce(
          (acc, item) => {
            acc.penerimaan += item.penerimaan || 0;
            acc.pengeluaran += item.pengeluaran || 0;
            acc.jumlahTransaksi += 1;
            return acc;
          },
          { penerimaan: 0, pengeluaran: 0, jumlahTransaksi: 0 }
        );

        // Add sub category header
        mainItem.children.push({
          id: `sub_${uraian}`,
          type: "sub_header",
          rekening: "",
          uraian: `${mainCounter}.${subCounter}. ${uraian}`,
          saldo_bulan_lalu: 0,
          penerimaan: subTotal.penerimaan,
          pengeluaran: subTotal.pengeluaran,
          saldo_bulan_ini: 0,
          isSubHeader: true,
        });

        // Add individual transactions
        let transCounter = 1;
        groupedByUraian[uraian].forEach((item) => {
          mainItem.children.push({
            id: `trans_${item.id}`,
            type: "transaction",
            rekening: "",
            tanggal: item.tanggal,
            uraian: `${mainCounter}.${subCounter}.${transCounter}. ${
              item.detail || "Transaksi"
            }`,
            saldo_bulan_lalu: item.saldo_bulan_lalu || 0,
            penerimaan: item.penerimaan || 0,
            pengeluaran: item.pengeluaran || 0,
            saldo_bulan_ini: item.saldo_bulan_ini || 0, // This should be calculated based on other fields
            isTransaction: true,
          });
          transCounter++;
        });

        subCounter++;
      });

      hierarchical.push(mainItem);
      mainCounter++;
    });

    return hierarchical;
  };

  const hierarchicalData = createHierarchicalData();

  const filteredData = hierarchicalData.filter((item) => {
    if (!item) return false;

    const uraian = item.uraian || "";
    const rekening = item.rekening || "";

    const matchesSearch =
      uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rekening.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const flattenedData = [];
  filteredData.forEach((mainItem) => {
    flattenedData.push(mainItem);
    if (mainItem.children) {
      mainItem.children.forEach((subItem) => {
        flattenedData.push(subItem);
      });
    }
  });

  const totalPages = Math.ceil(flattenedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = flattenedData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    // Ensure dateString is valid before formatting
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString; // Return original string if formatting fails
    }
  };

  const exportToExcel = async () => {
    const result = await Swal.fire({
      title: "Export ke Excel",
      text: "Apakah Anda yakin ingin mengexport data ke Excel?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const exportData = [];

      // Add header information
      exportData.push({
        Tanggal: "LAPORAN KEUANGAN",
        Uraian: "",
        "Rp.": "",
        Jumlah: "",
      });
      exportData.push({
        Tanggal: `RT ${userData?.rt_client || "..."} RW ${
          userData?.rw_client || "..."
        } Kelurahan ${userData?.kelurahan_client || "..."}`,
        Uraian: "",
        "Rp.": "",
        Jumlah: "",
      });
      exportData.push({
        Tanggal: `${userData?.kota_client || "..."}`,
        Uraian: "",
        "Rp.": "",
        Jumlah: "",
      });
      exportData.push({
        Tanggal: `Bulan Pelaporan: ${
          months.find((m) => m.value === selectedMonth)?.label
        } ${selectedYear}`,
        Uraian: "",
        "Rp.": "",
        Jumlah: "",
      });
      exportData.push({}); // Empty row

      // Add table headers
      exportData.push({
        Tanggal: "TANGGAL",
        Uraian: "URAIAN",
        "Rp.": "Rp.",
        Jumlah: "JUMLAH",
      });

      // I. PENERIMAAN
      exportData.push({
        Tanggal: "",
        Uraian: "I. PENERIMAAN",
        "Rp.": "",
        Jumlah: "",
      });

      Object.keys(groupedPenerimaan).forEach((uraianGroup) => {
        const items = groupedPenerimaan[uraianGroup];
        const subtotal = items.reduce(
          (sum, item) => sum + (item.jumlah || 0),
          0
        );

        // Kelompok header
        exportData.push({
          Tanggal: "",
          Uraian: uraianGroup,
          "Rp.": "",
          Jumlah: subtotal,
        });

        // Detail items
        items.forEach((item) => {
          exportData.push({
            Tanggal: formatDate(item.tanggal),
            Uraian: `  ${item.uraian}`,
            "Rp.": item.jumlah,
            Jumlah: "",
          });
        });
      });

      // Total Penerimaan
      exportData.push({
        Tanggal: "",
        Uraian: "Jumlah Penerimaan Bulan Ini",
        "Rp.": "",
        Jumlah: totalPenerimaan,
      });

      // II. PENGELUARAN
      exportData.push({
        Tanggal: "",
        Uraian: "II. PENGELUARAN",
        "Rp.": "",
        Jumlah: "",
      });

      Object.keys(groupedPengeluaran).forEach((uraianGroup) => {
        const items = groupedPengeluaran[uraianGroup];
        const subtotal = items.reduce(
          (sum, item) => sum + (item.jumlah || 0),
          0
        );

        // Kelompok header
        exportData.push({
          Tanggal: "",
          Uraian: uraianGroup,
          "Rp.": "",
          Jumlah: subtotal,
        });

        // Detail items
        items.forEach((item) => {
          exportData.push({
            Tanggal: formatDate(item.tanggal),
            Uraian: `  ${item.uraian}`,
            "Rp.": item.jumlah,
            Jumlah: "",
          });
        });
      });

      // Total Pengeluaran
      exportData.push({
        Tanggal: "",
        Uraian: "Jumlah Pengeluaran Bulan Ini",
        "Rp.": "",
        Jumlah: totalPengeluaran,
      });

      // III. Saldo Kas s.d. Bulan Lalu
      exportData.push({
        Tanggal: "",
        Uraian: `III. Saldo Kas s.d. Bulan Lalu (${lastMonthLabel} ${lastMonthYear})`,
        "Rp.": "",
        Jumlah: saldoKasBulanLalu,
      });

      // IV. Saldo Kas Bulan Ini
      exportData.push({
        Tanggal: "",
        Uraian: "IV. Saldo Kas Bulan Ini (I - II) + III",
        "Rp.": "",
        Jumlah: saldoKasBulanIni,
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
      XLSX.writeFile(
        wb,
        `Laporan_Keuangan_${
          months.find((m) => m.value === selectedMonth)?.label
        }_${selectedYear}.xlsx`
      );

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke Excel",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
    }
  };

  const exportToPDF = async () => {
    const result = await Swal.fire({
      title: "Export ke PDF",
      text: "Apakah Anda yakin ingin mengexport data ke PDF?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Export",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    });

    if (!result.isConfirmed) return;

    try {
      // const printWindow = window.open("", "_blank");
      // Hitung bulan sebelumnya berdasarkan bulan yang dipilih
      const getPreviousMonthInfo = (monthValue, yearValue) => {
        let prevMonth = Number.parseInt(monthValue) - 1;
        let prevYear = Number.parseInt(yearValue);

        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }

        const prevMonthLabel =
          months.find((m) => m.value === String(prevMonth))?.label ||
          "Desember";

        return { prevMonthLabel, prevYear };
      };

      let tableRows = "";

      // I. PENERIMAAN
      tableRows += `
        <tr style="background-color: #86efac;">
          <td colspan="4" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">I. PENERIMAAN</td>
        </tr>
      `;

      // Saldo Kas Tahun Lalu (hanya untuk Januari)
      if (selectedMonth === "01") {
        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">Saldo Kas Tahun Lalu</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
              0
            )}</td>
          </tr>
        `;
      }

      Object.keys(groupedPenerimaan).forEach((uraianGroup) => {
        const items = groupedPenerimaan[uraianGroup];
        const subtotal = items.reduce(
          (sum, item) => sum + (item.jumlah || 0),
          0
        );

        // Kelompok header
        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">${uraianGroup}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
              subtotal
            )}</td>
          </tr>
        `;

        // Detail items
        items.forEach((item) => {
          tableRows += `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatDate(
                item.tanggal
              )}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; padding-left: 20px;">${
                item.detail
              }</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(
                item.jumlah
              )}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;"></td>
            </tr>
          `;
        });
      });

      // Total Penerimaan
      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">Jumlah Penerimaan Bulan Ini</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
            totalPenerimaan
          )}</td>
        </tr>
      `;

      // II. PENGELUARAN
      tableRows += `
        <tr style="background-color: #fca5a5;">
          <td colspan="4" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">II. PENGELUARAN</td>
        </tr>
      `;

      Object.keys(groupedPengeluaran).forEach((uraianGroup) => {
        const items = groupedPengeluaran[uraianGroup];
        const subtotal = items.reduce(
          (sum, item) => sum + (item.jumlah || 0),
          0
        );

        // Kelompok header
        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">${uraianGroup}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
              subtotal
            )}</td>
          </tr>
        `;

        // Detail items
        items.forEach((item) => {
          tableRows += `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatDate(
                item.tanggal
              )}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; padding-left: 20px;">${
                item.detail
              }</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(
                item.jumlah
              )}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;"></td>
            </tr>
          `;
        });
      });

      // Total Pengeluaran
      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">Jumlah Pengeluaran Bulan Ini</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
            totalPengeluaran
          )}</td>
        </tr>
      `;

      // III. Saldo Kas s.d. Bulan Lalu
      tableRows += `
        <tr style="background-color: #93c5fd;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">III. Saldo Kas s.d. Bulan Lalu (${lastMonthLabel} ${lastMonthYear})</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
            saldoKasBulanLalu
          )}</td>
        </tr>
      `;

      // IV. Saldo Kas Bulan Ini
      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">IV. Saldo Kas Bulan Ini (I - II) + III</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(
            saldoKasBulanIni
          )}</td>
        </tr>
      `;
      const { prevMonthLabel, prevYear } = getPreviousMonthInfo(
        selectedMonth,
        selectedYear
      );

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laporan Keuangan</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h1 { font-size: 14px; margin: 5px 0; }
              .header h2 { font-size: 12px; margin: 5px 0; }
              .header p { font-size: 10px; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background-color: #f3f4f6; font-weight: bold; font-size: 10px; padding: 4px; border: 1px solid #000; text-align: center; }
              .signature { display: flex; justify-content: space-between; margin-top: 30px; }
              .signature div { font-size: 10px; }
              .signature-space { margin-top: 40px; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>LAPORAN KEUANGAN KAS ${
                selectedPembukuan === "keseluruhan"
                  ? "RT/PKK"
                  : selectedPembukuan
              }</h1>
              <!-- Use userData from state -->
              <h2>RT ${userData?.rt_client || "..."} RW ${
        userData?.rw_client || "..."
      } Kelurahan ${userData?.kelurahan_client || "..."} Kecamatan ${
        userData?.kecamatan_client || "..."
      } - Kab/Kota ${userData?.kota_client || "..."}</h2>
              <p>Bulan Pelaporan: ${
                months.find((m) => m.value === selectedMonth)?.label
              } ${selectedYear}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>TANGGAL</th>
                  <th>URAIAN</th>
                  <th>Rp.</th>
                  <th>JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <div class="signature">
              <div>
                <p>Mengetahui,</p>
                <p>Ketua ${
                  selectedPembukuan === "keseluruhan"
                    ? "RT/PKK"
                    : selectedPembukuan
                }</p>
                <div class="signature-space">
                  <p>${userData?.nama_ketua || "[nama ketua]"}</p>
                </div>
              </div>
              <div style="text-align: right;">
                <p>${userData?.kota_client || "..."}, ${formatDate(
        selectedTanggalPerlaporan
      )}</p>
                <p>Bendahara ${
                  selectedPembukuan === "keseluruhan"
                    ? "RT/PKK"
                    : selectedPembukuan
                }</p>
                <div class="signature-space">
                  <p>${userData?.nama_bendahara || "[nama bendahara]"}</p>
                </div>
              </div>
            </div>
<!-- Footer Fixed Section -->
<div class="pdf-footer">
  <div class="footer-left">
    Dicetak melalui aplikasi <strong>SIRTU (Sistem Informasi RT Ku)</strong>
  </div>
  <div class="footer-center">
    Dicetak oleh: <strong>${
      userData?.nama_ketua || userData?.nama || "Administrator"
    }</strong>
  </div>
  <div class="footer-right">
    Tanggal Cetak: ${new Date().toLocaleString("id-ID")}
  </div>
</div>

<style>
  @media print {
    body {
      margin-bottom: 40px; /* beri ruang agar footer tidak menutupi tanda tangan */
    }

    .pdf-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #444;
      border-top: 1px solid #aaa;
      padding: 6px 25px;
      background-color: #fff;
      font-style: italic;
      line-height: 1.4;
    }

    /* pastikan footer muncul di setiap halaman PDF */
    .pdf-footer::after {
      content: "";
      display: block;
      position: running(footer);
    }

    @page {
      @bottom-center {
        content: element(footer);
      }
    }

    .footer-left {
      text-align: left;
      flex: 1;
    }

    .footer-center {
      text-align: center;
      flex: 1;
    }

    .footer-right {
      text-align: right;
      flex: 1;
    }
  }
</style>

          </body>
        </html>
      `;

      document.body.innerHTML = printContent;
      window.print();
      window.location.reload(); // biar halaman kembali normal setelah print

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke PDF",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
        customClass: {
          popup: "max-h-screen overflow-y-auto",
        },
      });
    }
  };

  const getRowColor = (item) => {
    // This logic needs to be adjusted since selectedJenisLaporan is removed
    // if (selectedJenisLaporan !== "keseluruhan") {
    //   return ""
    // }

    if (item.type === "main") {
      return "bg-blue-200"; // rekening kegiatan
    } else if (item.type === "sub" || item.type === "sub_header") {
      return "bg-yellow-200"; // sub rekening kegiatan
    }
    return ""; // transaksi default tanpa warna
  };

  const calculateTotals = () => {
    // This function needs to sum up the totals from the hierarchicalData.
    // It should consider the 'saldo_bulan_ini' for each main item.
    return hierarchicalData.reduce(
      (totals, mainItem) => {
        // The 'saldo_bulan_ini' for the main item already represents the total for that category.
        // We are summing these category totals to get the grand total.
        totals.saldo_bulan_ini += mainItem.saldo_bulan_ini || 0;
        return totals;
      },
      { saldo_bulan_lalu: 0, penerimaan: 0, pengeluaran: 0, saldo_bulan_ini: 0 }
    );
  };

  const totals = calculateTotals();

  return (
    <div className="p-6">
      <div className="mb-6 bg-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">
          {selectedJenisLaporan === "cashbon"
            ? "Laporan Cash Bon / Uang Panjar"
            : "Laporan Keuangan RT"}
        </h1>
        <p className="text-gray-600">
          Laporan{" "}
          {selectedPembukuan === "keseluruhan" ? "RT/PKK" : selectedPembukuan}
        </p>
      </div>

      {/* <div className="mb-6">
        <button
          onClick={createDummyData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Buat Data Dummy"}
        </button>
      </div> */}

      {loading ? (
        <div className="text-center py-8">
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahun Pembukuan
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
                Bulan Pelaporan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pembukaanOptions.map((pembukuan) => (
                  <option key={pembukuan.value} value={pembukuan.value}>
                    {pembukuan.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Cash Bon filter in filter section, right after Pembukuan filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Laporan
              </label>
              <select
                value={selectedJenisLaporan}
                onChange={(e) => setSelectedJenisLaporan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="keuangan">Keuangan</option>
                <option value="cashbon">Cash Bon / Uang Panjar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Pelaporan
              </label>
              <input
                type="date"
                value={selectedTanggalPerlaporan}
                onChange={(e) => setSelectedTanggalPerlaporan(e.target.value)}
                min={`${selectedYear}-${String(selectedMonth).padStart(
                  2,
                  "0"
                )}-01`}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Data sampai tanggal ini yang ditampilkan
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <span>📄</span>
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📊</span>
              Export Excel
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Cari data dalam tabel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table Controls */}
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
              {Math.min(startIndex + itemsPerPage, flattenedData.length)} dari{" "}
              {flattenedData.length} data
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

          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            {/* Report Header */}
            <div className="text-center py-4 border-b border-gray-300">
              <h2 className="text-lg font-bold">
                {selectedJenisLaporan === "cashbon"
                  ? "Laporan Cash Bon / Uang Panjar"
                  : "LAPORAN KEUANGAN KAS"}{" "}
                {selectedPembukuan === "keseluruhan"
                  ? "RT/PKK"
                  : selectedPembukuan}
              </h2>
              <h3 className="text-md font-semibold">
                RT {userData?.rt_client || "..."} RW{" "}
                {userData?.rw_client || "..."} Kelurahan{" "}
                {userData?.kelurahan_client || "..."}
              </h3>
              <p className="text-sm">{userData?.kota_client || "..."}</p>
              <p className="text-sm font-semibold mt-2">
                Bulan Pelaporan:{" "}
                {months.find((m) => m.value === selectedMonth)?.label}{" "}
                {selectedYear}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                      Tanggal / No Arsip {/* Updated header */}
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">
                      URAIAN
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                      Rp.
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">
                      JUMLAH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* I. PENERIMAAN */}
                  <tr className="bg-green-300">
                    <td
                      colSpan="4"
                      className="border border-gray-400 px-3 py-2 text-sm font-bold"
                    >
                      I. PENERIMAAN
                    </td>
                  </tr>

                  {/* Saldo Kas Tahun Lalu (hanya untuk Januari) */}
                  {selectedMonth === "01" && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">
                        Saldo Kas Tahun Lalu
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-center">
                        Rp.
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}

                  {Object.keys(groupedPenerimaan).map((uraianGroup) => {
                    const items = groupedPenerimaan[uraianGroup];
                    const subtotal = items.reduce(
                      (sum, item) => sum + (item.jumlah || 0),
                      0
                    );

                    return (
                      <>
                        {/* Kelompok Pembukuan Header */}
                        <tr key={`header-${uraianGroup}`}>
                          <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm font-semibold">
                            {uraianGroup}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>

                        {/* Detail Items */}
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="border border-gray-400 px-3 py-2 text-sm">
                              {formatDate(item.tanggal)}
                              {item.no_arsip && (
                                <span className="text-gray-500">
                                  {" "}
                                  / {item.no_arsip}
                                </span>
                              )}{" "}
                              {/* Add no_arsip display */}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm pl-6">
                              {item.detail}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                              {formatCurrency(item.jumlah)}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right"></td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  {/* Total Penerimaan Bulan Ini */}
                  <tr className="bg-yellow-200">
                    <td
                      colSpan="2"
                      className="border border-gray-400 px-3 py-2 text-sm font-semibold"
                    >
                      Jumlah Penerimaan Bulan Ini
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">
                      {formatCurrency(totalPenerimaan)}
                    </td>
                  </tr>

                  {/* II. PENGELUARAN */}
                  <tr className="bg-red-300">
                    <td
                      colSpan="4"
                      className="border border-gray-400 px-3 py-2 text-sm font-bold"
                    >
                      II. PENGELUARAN
                    </td>
                  </tr>

                  {Object.keys(groupedPengeluaran).length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="border border-gray-400 px-3 py-2 text-sm text-center text-gray-500"
                      >
                        Tidak ada pengeluaran
                      </td>
                    </tr>
                  ) : (
                    Object.keys(groupedPengeluaran).map((uraianGroup) => {
                      const items = groupedPengeluaran[uraianGroup];
                      const subtotal = items.reduce(
                        (sum, item) => sum + (item.jumlah || 0),
                        0
                      );

                      return (
                        <>
                          {/* Kelompok Pembukuan Header */}
                          <tr key={`header-${uraianGroup}`}>
                            <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                            <td className="border border-gray-400 px-3 py-2 text-sm font-semibold">
                              {uraianGroup}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">
                              {formatCurrency(subtotal)}
                            </td>
                          </tr>

                          {/* Detail Items */}
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="border border-gray-400 px-3 py-2 text-sm">
                                {formatDate(item.tanggal)}
                                {item.no_arsip && (
                                  <span className="text-gray-500">
                                    {" "}
                                    / {item.no_arsip}
                                  </span>
                                )}{" "}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-sm pl-6">
                                {item.detail}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-sm text-right">
                                {formatCurrency(item.jumlah)}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-sm text-right"></td>
                            </tr>
                          ))}
                        </>
                      );
                    })
                  )}

                  {/* Total Pengeluaran Bulan Ini */}
                  <tr className="bg-yellow-200">
                    <td
                      colSpan="2"
                      className="border border-gray-400 px-3 py-2 text-sm font-semibold"
                    >
                      Jumlah Pengeluaran Bulan Ini
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">
                      {formatCurrency(totalPengeluaran)}
                    </td>
                  </tr>

                  {/* III. Saldo Kas s.d. Bulan Lalu */}
                  <tr className="bg-blue-300">
                    <td
                      colSpan="2"
                      className="border border-gray-400 px-3 py-2 text-sm font-semibold"
                    >
                      III. Saldo Kas s.d. Bulan Lalu ({lastMonthLabel}{" "}
                      {lastMonthYear})
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">
                      {formatCurrency(saldoKasBulanLalu)}
                    </td>
                  </tr>

                  {/* IV. Saldo Kas Bulan Ini */}
                  <tr className="bg-yellow-300">
                    <td
                      colSpan="2"
                      className="border border-gray-400 px-3 py-2 text-sm font-semibold"
                    >
                      IV. Saldo Kas Bulan Ini (I - II) + III
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">
                      {formatCurrency(saldoKasBulanIni)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Section */}
            <div className="p-6 border-t border-gray-300">
              <div className="flex justify-between mt-8">
                <div>
                  <p className="text-sm">Mengetahui,</p>
                  <p className="text-sm font-semibold">
                    Ketua{" "}
                    {selectedPembukuan === "keseluruhan"
                      ? "RT/PKK"
                      : selectedPembukuan}
                  </p>
                  <div className="mt-16">
                    <p className="text-sm">
                      {userData?.nama_ketua || "[nama ketua]"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {userData?.kota_client || "..."},{" "}
                    {formatDate(selectedTanggalPerlaporan)}
                  </p>
                  <p className="text-sm font-semibold">
                    Bendahara{" "}
                    {selectedPembukuan === "keseluruhan"
                      ? "RT/PKK"
                      : selectedPembukuan}
                  </p>
                  <div className="mt-16">
                    <p className="text-sm">
                      {userData?.nama_bendahara || "[nama bendahara]"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KeuanganPage;
