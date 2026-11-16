"use client";

import { useState, useEffect } from "react";
import { firestoreService } from "../../services/firebase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const KeuanganPage = () => {
  const [laporanKeuanganData, setLaporanKeuanganData] = useState([]);
  const [rekeningKegiatanData, setRekeningKegiatanData] = useState([]);
  const [subRekeningKegiatanData, setSubRekeningKegiatanData] = useState([]);
  const [pengurusList, setPengurusList] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0"); 
  const currentYear = today.getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPembukuan, setSelectedPembukuan] = useState("RT");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedTanggalPerlaporan, setSelectedTanggalPerlaporan] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [selectedJenisLaporan, setSelectedJenisLaporan] = useState("keuangan"); 
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const today = new Date();
    const currentMonthValue = today.getMonth() + 1;
    const currentYearValue = today.getFullYear();

    if (
      selectedYear > currentYearValue ||
      (selectedYear === currentYearValue &&
        Number.parseInt(selectedMonth) > currentMonthValue)
    ) {
      setSelectedTanggalPerlaporan(today.toISOString().split("T")[0]);
    } else {
      const selectedDate = new Date(selectedTanggalPerlaporan);
      if (
        selectedDate.getFullYear() !== selectedYear ||
        (selectedDate.getMonth() + 1).toString().padStart(2, "0") !==
          selectedMonth
      ) {
        if (selectedMonth === "keseluruhan") {
          setSelectedTanggalPerlaporan(today.toISOString().split("T")[0]);
        }
      }
    }
  }, [selectedYear, selectedMonth, selectedTanggalPerlaporan]);

  const loadAllData = async () => {
    try {
      setLoading(true);

      const userId = localStorage.getItem("userId") || "1";
      const usersData = await firestoreService.getAll("users");
      const currentUser =
        usersData.find((u) => u.id.toString() === userId) ||
        usersData.find((u) => u.level === "superadmin" && u.status === "aktif");

      const pengurusRTData = await firestoreService.getAll("pengurusRT");
      setPengurusList(pengurusRTData || []);

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
        });
      }

      const [laporanData, rekeningData, subRekeningData] = await Promise.all([
        firestoreService.getAll("laporanKeuangan"),
        firestoreService.getAll("rekeningKegiatan"),
        firestoreService.getAll("subRekeningKegiatan"),
      ]);

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

      setLaporanKeuanganData(laporanData);
      setRekeningKegiatanData(mergedRekening);
      setSubRekeningKegiatanData(mergedSubRekening);
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPenandatanganInfo = () => {
    const isPkk = selectedPembukuan === "PKK";
    let labelPengurus = selectedPembukuan === "keseluruhan" ? "RT" : selectedPembukuan;

    const ketuaJabatanTarget = isPkk ? "ketua pkk" : "pak rt";
    const bendaharaJabatanTarget = isPkk ? "bendahara pkk" : "bendahara rt";

    const ketua = pengurusList.find(
      (p) =>
        p.status?.toLowerCase() === "aktif" &&
        p.jabatan?.toLowerCase().includes("ketua") &&
        (selectedPembukuan === "keseluruhan" || 
         p.jabatan?.toLowerCase().includes(selectedPembukuan.toLowerCase()) ||
         p.kepungurusan?.toLowerCase() === selectedPembukuan.toLowerCase())
    );

    const bendahara = pengurusList.find(
      (p) =>
        p.status?.toLowerCase() === "aktif" &&
        p.jabatan?.toLowerCase().includes("bendahara") &&
        (selectedPembukuan === "keseluruhan" || 
         p.jabatan?.toLowerCase().includes(selectedPembukuan.toLowerCase()) ||
         p.kepungurusan?.toLowerCase() === selectedPembukuan.toLowerCase())
    );

    return {
      labelKetua: `Ketua ${labelPengurus}`,
      namaKetua: ketua?.nama_warga || "[nama ketua]",
      labelBendahara: `Bendahara ${labelPengurus}`,
      namaBendahara: bendahara?.nama_warga || "[nama bendahara]",
    };
  };

  const defaultRekenings = [
    { id: "1", kelompok_pembukuan: "Kas", pembukuan: "RT", status: "aktif", is_locked: true },
    { id: "2", kelompok_pembukuan: "Kas", pembukuan: "PKK", status: "aktif", is_locked: true },
  ];

  const defaultSubRekenings = [
    { id: "1.1", uraian: "Silpa Warga Tahun Lalu", pembukuan: "RT", id_kelompok: "1", is_locked: true },
    { id: "1.2", uraian: "Iuran Wajib Warga", pembukuan: "RT", id_kelompok: "1", is_locked: true },
    { id: "2.1", uraian: "Silpa PKK Tahun Lalu", pembukuan: "PKK", id_kelompok: "2", is_locked: true },
    { id: "2.2", uraian: "Iuran Wajib PKK", pembukuan: "PKK", id_kelompok: "2", is_locked: true },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAllData();
  }, []);

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

    if (selectedYear) {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const itemYear = new Date(item.tanggal).getFullYear();
        return itemYear === selectedYear;
      });
    }

    if (selectedMonth !== "keseluruhan") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const [yearStr, monthStr] = (item.tanggal || "").split("-");
        return monthStr === selectedMonth;
      });
    }

    if (selectedMonth === "keseluruhan" && selectedTanggalPerlaporan) {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        return new Date(item.tanggal) <= new Date(selectedTanggalPerlaporan);
      });
    }

    if (selectedPembukuan !== "keseluruhan") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const pembukuan = (item.pembukuan || "").trim().toUpperCase();
        const selected = selectedPembukuan.trim().toUpperCase();
        return pembukuan === selected;
      });
    }

    if (selectedJenisLaporan === "cashbon") {
      filteredLaporanData = filteredLaporanData.filter((item) => {
        const uraian = (item.uraian || "").toLowerCase();
        return (
          uraian.includes("cash bon") ||
          uraian.includes("uang panjar") ||
          uraian.includes("uang muka")
        );
      });
    }

    // 🟢 Gabungkan sumber sub-rekening untuk mapping nama kelompok pembukuan
    const allSubRekenings = [
      ...defaultSubRekenings,
      ...subRekeningKegiatanData,
    ];

    filteredLaporanData.forEach((trans) => {
      const jenisPembukuan = trans.jenis_pembukuan || "";

      // 🟢 Cocokkan id_sub_rekening_kegiatan untuk mendapatkan nama kelompok/uraian
      const matchedSub = allSubRekenings.find(
        (sr) => sr.id?.toString() === trans.id_sub_rekening_kegiatan?.toString()
      );

      const resolvedUraian =
        trans.uraian && trans.uraian.trim() !== ""
          ? trans.uraian
          : matchedSub?.uraian || matchedSub?.sub_rekening_kegiatan || "Lain-lain";

      const transItem = {
        id: trans.id,
        tanggal: trans.tanggal,
        uraian: resolvedUraian,
        detail: trans.detail || trans.keterangan || "",
        jumlah: trans.pengeluaran > 0 ? trans.pengeluaran : trans.penerimaan,
        jenis_pembukuan: jenisPembukuan,
        sub_rekening: resolvedUraian,
        no_arsip: trans.no_arsip || "",
      };

      if (jenisPembukuan === "Penerimaan" || trans.penerimaan > 0) {
        sections.penerimaan.push(transItem);
      } else if (jenisPembukuan === "Pengeluaran" || trans.pengeluaran > 0) {
        sections.pengeluaran.push(transItem);
      }
    });

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

  const currentMonthNum =
    selectedMonth === "keseluruhan"
      ? new Date().getMonth() + 1
      : Number.parseInt(selectedMonth);
  const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const lastMonthYear = currentMonthNum === 1 ? selectedYear - 1 : selectedYear;

  const lastMonthLabel =
    months.find((m) => Number.parseInt(m.value) === lastMonth)?.label ||
    "Bulan Sebelumnya";

  let saldoKasBulanLalu = 0;

  const transaksiBulanSebelumnya = laporanKeuanganData.filter((item) => {
    if (!item.tanggal) return false;

    const [yearStr, monthStr] = (item.tanggal || "").split("-");
    const year = Number.parseInt(yearStr);
    const month = Number.parseInt(monthStr);
    const pembukuan = (item.pembukuan || "").toUpperCase();
    const selected = selectedPembukuan.toUpperCase();

    if (selectedPembukuan !== "keseluruhan" && pembukuan !== selected) {
      return false;
    }

    if (year < lastMonthYear) return true;
    if (year === lastMonthYear && month <= lastMonth) return true;

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
      return true;
    }
  );

  if (transaksiBulanSebelumnyaFiltered.length > 0) {
    const totalPenerimaanSebelumnya = transaksiBulanSebelumnyaFiltered.reduce(
      (sum, item) => sum + (Number(item.penerimaan) || 0),
      0
    );

    const totalPengeluaranSebelumnya = transaksiBulanSebelumnyaFiltered.reduce(
      (sum, item) => sum + (Number(item.pengeluaran) || 0),
      0
    );

    saldoKasBulanLalu = totalPenerimaanSebelumnya - totalPengeluaranSebelumnya;
  }

  const saldoKasBulanIni =
    totalPenerimaan - totalPengeluaran + saldoKasBulanLalu;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
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
    });

    if (!result.isConfirmed) return;

    try {
      const exportData = [];
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
      exportData.push({});

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
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
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
    });

    if (!result.isConfirmed) return;

    try {
      const ttd = getPenandatanganInfo();

      let tableRows = "";
      tableRows += `
        <tr style="background-color: #86efac;">
          <td colspan="4" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">I. PENERIMAAN</td>
        </tr>
      `;

      if (selectedMonth === "01") {
        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">Saldo Kas Tahun Lalu</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(0)}</td>
          </tr>
        `;
      }

      Object.keys(groupedPenerimaan).forEach((uraianGroup) => {
        const items = groupedPenerimaan[uraianGroup];
        const subtotal = items.reduce(
          (sum, item) => sum + (item.jumlah || 0),
          0
        );

        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">${uraianGroup}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
          </tr>
        `;

        items.forEach((item) => {
          tableRows += `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatDate(item.tanggal)}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; padding-left: 20px;">${item.detail}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(item.jumlah)}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;"></td>
            </tr>
          `;
        });
      });

      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">Jumlah Penerimaan Bulan Ini</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(totalPenerimaan)}</td>
        </tr>
      `;

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

        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">${uraianGroup}</td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
          </tr>
        `;

        items.forEach((item) => {
          tableRows += `
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${formatDate(item.tanggal)}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; padding-left: 20px;">${item.detail}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;">${formatCurrency(item.jumlah)}</td>
              <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right;"></td>
            </tr>
          `;
        });
      });

      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">Jumlah Pengeluaran Bulan Ini</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(totalPengeluaran)}</td>
        </tr>
      `;

      tableRows += `
        <tr style="background-color: #93c5fd;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">III. Saldo Kas s.d. Bulan Lalu (${lastMonthLabel} ${lastMonthYear})</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(saldoKasBulanLalu)}</td>
        </tr>
      `;

      tableRows += `
        <tr style="background-color: #fef08a;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold;">IV. Saldo Kas Bulan Ini (I - II) + III</td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: center;"></td>
          <td style="border: 1px solid #000; padding: 4px; font-size: 10px; text-align: right; font-weight: bold;">${formatCurrency(saldoKasBulanIni)}</td>
        </tr>
      `;

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
            </style>
          </head>
          <body>
            <div class="header">
              <h1>LAPORAN KEUANGAN KAS ${selectedPembukuan.toUpperCase()}</h1>
              <h2>RT ${userData?.rt_client || "..."} RW ${userData?.rw_client || "..."} Kelurahan ${userData?.kelurahan_client || "..."} Kecamatan ${userData?.kecamatan_client || "..."} - Kab/Kota ${userData?.kota_client || "..."}</h2>
              <p>Bulan Pelaporan: ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}</p>
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
                <p><strong>${ttd.labelKetua}</strong></p>
                <div class="signature-space">
                  <p><u>${ttd.namaKetua}</u></p>
                </div>
              </div>
              <div style="text-align: right;">
                <p>${userData?.kota_client || "..."}, ${formatDate(selectedTanggalPerlaporan)}</p>
                <p><strong>${ttd.labelBendahara}</strong></p>
                <div class="signature-space">
                  <p><u>${ttd.namaBendahara}</u></p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      document.body.innerHTML = printContent;
      window.print();
      window.location.reload(); 

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "Data berhasil diexport ke PDF",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: "Terjadi kesalahan saat mengexport data",
      });
    }
  };

  const currentTtd = getPenandatanganInfo();

  return (
    <div className="p-6">
      <div className="mb-6 bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold">
          {selectedJenisLaporan === "cashbon"
            ? "Laporan Cash Bon / Uang Panjar"
            : "Laporan Keuangan"}
        </h1>
        <p className="text-gray-600">
          Laporan {selectedPembukuan === "keseluruhan" ? "RT/PKK" : selectedPembukuan}
        </p>
      </div>

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
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
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
          </div>

          <div className="mb-6 flex gap-4">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <span>📄</span> Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📊</span> Export Excel
            </button>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
            <div className="text-center py-4 border-b border-gray-300">
              <h2 className="text-lg font-bold">
                {selectedJenisLaporan === "cashbon"
                  ? "Laporan Cash Bon / Uang Panjar"
                  : "LAPORAN KEUANGAN KAS"}{" "}
                {selectedPembukuan.toUpperCase()}
              </h2>
              <h3 className="text-md font-semibold">
                RT {userData?.rt_client || "..."} RW {userData?.rw_client || "..."} Kelurahan {userData?.kelurahan_client || "..."}
              </h3>
              <p className="text-sm">{userData?.kota_client || "..."}</p>
              <p className="text-sm font-semibold mt-2">
                Bulan Pelaporan: {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">Tanggal / No Arsip</th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-left">URAIAN</th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">Rp.</th>
                    <th className="border border-gray-400 px-3 py-2 text-sm font-semibold text-center">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {/* I. PENERIMAAN */}
                  <tr className="bg-green-300">
                    <td colSpan="4" className="border border-gray-400 px-3 py-2 text-sm font-bold">
                      I. PENERIMAAN
                    </td>
                  </tr>

                  {selectedMonth === "01" && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">Saldo Kas Tahun Lalu</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-center">Rp.</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">{formatCurrency(0)}</td>
                    </tr>
                  )}

                  {Object.keys(groupedPenerimaan).map((uraianGroup) => {
                    const items = groupedPenerimaan[uraianGroup];
                    const subtotal = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);

                    return (
                      <>
                        <tr key={`header-${uraianGroup}`}>
                          <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm font-semibold">{uraianGroup}</td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">{formatCurrency(subtotal)}</td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="border border-gray-400 px-3 py-2 text-sm">
                              {formatDate(item.tanggal)} {item.no_arsip && <span className="text-gray-500">/ {item.no_arsip}</span>}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm pl-6">{item.detail}</td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right">{formatCurrency(item.jumlah)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right"></td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  <tr className="bg-yellow-200">
                    <td colSpan="2" className="border border-gray-400 px-3 py-2 text-sm font-semibold">Jumlah Penerimaan Bulan Ini</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">{formatCurrency(totalPenerimaan)}</td>
                  </tr>

                  {/* II. PENGELUARAN */}
                  <tr className="bg-red-300">
                    <td colSpan="4" className="border border-gray-400 px-3 py-2 text-sm font-bold">
                      II. PENGELUARAN
                    </td>
                  </tr>

                  {Object.keys(groupedPengeluaran).map((uraianGroup) => {
                    const items = groupedPengeluaran[uraianGroup];
                    const subtotal = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);

                    return (
                      <>
                        <tr key={`header-${uraianGroup}`}>
                          <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm font-semibold">{uraianGroup}</td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                          <td className="border border-gray-400 px-3 py-2 text-sm text-right font-semibold">{formatCurrency(subtotal)}</td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="border border-gray-400 px-3 py-2 text-sm">
                              {formatDate(item.tanggal)} {item.no_arsip && <span className="text-gray-500">/ {item.no_arsip}</span>}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-sm pl-6">{item.detail}</td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right">{formatCurrency(item.jumlah)}</td>
                            <td className="border border-gray-400 px-3 py-2 text-sm text-right"></td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  <tr className="bg-yellow-200">
                    <td colSpan="2" className="border border-gray-400 px-3 py-2 text-sm font-semibold">Jumlah Pengeluaran Bulan Ini</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">{formatCurrency(totalPengeluaran)}</td>
                  </tr>

                  {/* III. SALDO KAS S.D BULAN LALU */}
                  <tr className="bg-blue-300">
                    <td colSpan="2" className="border border-gray-400 px-3 py-2 text-sm font-semibold">
                      III. Saldo Kas s.d. Bulan Lalu ({lastMonthLabel} {lastMonthYear})
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">{formatCurrency(saldoKasBulanLalu)}</td>
                  </tr>

                  {/* IV. SALDO KAS BULAN INI */}
                  <tr className="bg-yellow-300">
                    <td colSpan="2" className="border border-gray-400 px-3 py-2 text-sm font-semibold">
                      IV. Saldo Kas Bulan Ini (I - II) + III
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-center"></td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right font-bold">{formatCurrency(saldoKasBulanIni)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-300">
              <div className="flex justify-between mt-8 text-sm">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">{currentTtd.labelKetua}</p>
                  <div className="mt-16">
                    <p className="font-bold underline">{currentTtd.namaKetua}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p>{userData?.kota_client || "..."}, {formatDate(selectedTanggalPerlaporan)}</p>
                  <p className="font-semibold">{currentTtd.labelBendahara}</p>
                  <div className="mt-16">
                    <p className="font-bold underline">{currentTtd.namaBendahara}</p>
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