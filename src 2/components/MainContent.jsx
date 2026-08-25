"use client"

import { Routes, Route, useLocation } from "react-router-dom"
import { useEffect } from "react"
import DashboardPage from "../pages/DashboardPage"
import TableModulPage from "../pages/superadmin/TableModulPage"
import SetDefaultAksesPage from "../pages/superadmin/SetDefaultAksesPage"
import KategoriUsiaPage from "../pages/superadmin/KategoriUsiaPage"
import TableSatuanAssetPage from "../pages/superadmin/TableSatuanAssetPage"
import PembuatanKelompokAssetPage from "../pages/pengaturan/PembuatanKelompokAssetPage"
import PembuatanJenisAssetPage from "../pages/pengaturan/PembuatanJenisAssetPage"
import PembuatanDawisPkkPage from "../pages/pengaturan/PembuatanDawisPkkPage"
import UnderDevelopmentPage from "../pages/UnderDevelopmentPage"
import DataKKPage from "../pages/secretariat/DataKKPage"
import DataWargaPage from "../pages/secretariat/DataWargaPage"
import PengurusRTPage from "../pages/secretariat/PengurusRTPage"
import PenggunaPage from "../pages/secretariat/PenggunaPage"
import PencatatanPage from "../pages/asset/PencatatanPage"
import BuatRekeningKegiatanPage from "../pages/eoffice/BuatRekeningKegiatanPage"
import BuatSubRekeningKegiatanPage from "../pages/eoffice/BuatSubRekeningKegiatanPage"
import DataHunianPage from "../pages/eoffice/DataHunianPage"
import IURKuPage from "../pages/bendahara/IURKuPage"
import SetIuranWargaPage from "../pages/bendahara/SetIuranWargaPage"
import IuranWargaPage from "../pages/pelaporan/IuranWargaPage"
import KeuanganPage from "../pages/pelaporan/KeuanganPage"
import AboutPage from "../pages/AboutPage"
import TablePekerjaanPage from "../pages/superadmin/TablePekerjaanPage"
import AnggotaDawisPage from "../pages/secretariat/AnggotaDawisPage"
import PembukaanPage from "../pages/bendahara/PembukuanPage"

const MainContent = () => {
  const location = useLocation()

  useEffect(() => {
    const scrollToTop = () => {
      // Strategy 1: Scroll window
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })

      // Strategy 2: Scroll document elements
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      // Strategy 3: Scroll main content container
      const mainContent = document.querySelector("main")
      if (mainContent) {
        mainContent.scrollTop = 0
      }

      // Strategy 4: Scroll any scrollable containers
      const scrollableElements = document.querySelectorAll('[class*="overflow"], [class*="scroll"]')
      scrollableElements.forEach((element) => {
        element.scrollTop = 0
      })
    }

    // Immediate scroll
    scrollToTop()

    // Multiple fallback scrolls with increasing delays to handle dynamic content
    const timeouts = [50, 100, 200, 500].map((delay) => setTimeout(scrollToTop, delay))

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [location.pathname])

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gray-50 max-w-full">
      <div className="max-w-full">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Superadmin routes */}
          <Route path="/superadmin" element={<UnderDevelopmentPage pageName="Superadmin" />} />
          <Route path="/superadmin/table-modul" element={<TableModulPage />} />
          <Route path="/superadmin/set-default-akses" element={<SetDefaultAksesPage />} />
          <Route path="/superadmin/kategori-usia" element={<KategoriUsiaPage />} />
          <Route path="/superadmin/table-satuan-asset" element={<TableSatuanAssetPage />} />
          <Route path="/superadmin/table-pekerjaan" element={<TablePekerjaanPage pageName="Table Pekerjaan" />} />

          {/* Pengaturan routes */}
          <Route path="/pengaturan" element={<UnderDevelopmentPage pageName="Pengaturan" />} />
          <Route path="/pengaturan/kelompok-asset" element={<PembuatanKelompokAssetPage />} />
          <Route path="/pengaturan/jenis-asset" element={<PembuatanJenisAssetPage />} />
          <Route path="/pengaturan/dawis-pkk" element={<PembuatanDawisPkkPage />} />

          {/* Secretariat routes */}
          <Route path="/secretariat" element={<UnderDevelopmentPage pageName="Secretariat" />} />
          <Route path="/secretariat/data-kk" element={<DataKKPage />} />
          <Route path="/secretariat/data-warga" element={<DataWargaPage />} />
          <Route path="/secretariat/pengurus-rt" element={<PengurusRTPage />} />
          <Route path="/secretariat/pencatatan-surat" element={<UnderDevelopmentPage pageName="Pencatatan Surat" />} />
          <Route path="/secretariat/data-anggota-dawis" element={<AnggotaDawisPage />} />
          <Route path="/secretariat/pengguna" element={<PenggunaPage />} />
          <Route path="/secretariat/kependudukan" element={<UnderDevelopmentPage pageName="Kependudukan" />} />
          <Route path="/secretariat/pembukaan" element={<PembukaanPage />} />

          {/* Asset routes */}
          <Route path="/asset" element={<UnderDevelopmentPage pageName="Asset" />} />
          <Route path="/asset/pencatatan" element={<PencatatanPage />} />
          <Route
            path="/asset/penghapusan-mutasi"
            element={<UnderDevelopmentPage pageName="Penghapusan/Mutasi Asset" />}
          />

          {/* eOFFICE Pak RT routes */}
          <Route path="/eoffice-pak-rt" element={<UnderDevelopmentPage pageName="eOFFICE Pak RT" />} />
          <Route
            path="/eoffice-pak-rt/approval-permohonan-dokumen"
            element={<UnderDevelopmentPage pageName="Approval Permohonan Dokumen" />}
          />
          <Route path="/eoffice-pak-rt/keringanan-iur" element={<UnderDevelopmentPage pageName="Keringanan IUR" />} />
          <Route
            path="/eoffice-pak-rt/monitoring-rt-ku"
            element={<UnderDevelopmentPage pageName="Monitoring RT-Ku" />}
          />
          <Route path="/eoffice-pak-rt/laporan-tahunan" element={<UnderDevelopmentPage pageName="Laporan Tahunan" />} />
          <Route
            path="/eoffice-pak-rt/set-pengurus-rt-pkk"
            element={<UnderDevelopmentPage pageName="Set Pengurus RT & PKK" />}
          />
          <Route path="/eoffice-pak-rt/buat-rekening-kegiatan" element={<BuatRekeningKegiatanPage />} />
          <Route path="/eoffice-pak-rt/buat-sub-rekening-kegiatan" element={<BuatSubRekeningKegiatanPage />} />
          <Route path="/eoffice-pak-rt/data-hunian" element={<DataHunianPage />} />

          {/* Bendahara routes */}
          <Route path="/bendahara" element={<UnderDevelopmentPage pageName="Bendahara" />} />
          <Route path="/bendahara/pencatatan-pembukuan" element={<PembukaanPage />} />
          <Route path="/bendahara/mutasi-hutang" element={<UnderDevelopmentPage pageName="Mutasi/Hutang" />} />
          <Route path="/bendahara/iur-ku" element={<IURKuPage />} />
          <Route path="/bendahara/set-iuran-warga" element={<SetIuranWargaPage />} />

          {/* Usaha Mandiri routes */}
          <Route path="/usaha-mandiri" element={<UnderDevelopmentPage pageName="Usaha Mandiri" />} />
          <Route path="/usaha-mandiri/penjualan" element={<UnderDevelopmentPage pageName="Penjualan" />} />

          {/* Layanan Warga routes */}
          <Route path="/layanan-warga" element={<UnderDevelopmentPage pageName="Layanan Warga" />} />
          <Route
            path="/layanan-warga/permohonan-surat"
            element={<UnderDevelopmentPage pageName="Permohonan Surat" />}
          />

          {/* Pelaporan routes */}
          <Route path="/pelaporan" element={<UnderDevelopmentPage pageName="Pelaporan" />} />
          <Route path="/pelaporan/iuran-warga" element={<IuranWargaPage />} />
          <Route path="/pelaporan/keuangan" element={<KeuanganPage />} />
          <Route path="/pelaporan/history-warga" element={<UnderDevelopmentPage pageName="History Warga" />} />
          <Route
            path="/pelaporan/e-arsip-agenda-surat"
            element={<UnderDevelopmentPage pageName="E-Arsip/Agenda Surat" />}
          />
          <Route path="/pelaporan/stok-okname-asset" element={<UnderDevelopmentPage pageName="Stok Okname Asset" />} />

          {/* Additional specific routes */}
          <Route path="/tabel-modul" element={<TableModulPage />} />

          {/* About route */}
          <Route path="/about" element={<AboutPage />} />

          {/* Default route */}
          <Route path="*" element={<UnderDevelopmentPage pageName="Page Not Found" />} />
        </Routes>
      </div>
    </main>
  )
}

export default MainContent
