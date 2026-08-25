"use client"
import { motion } from "framer-motion"
import { Users, FileText, Package, DollarSign, TrendingUp, Calendar, Bell, Activity, Database } from "lucide-react"
import { useAppState, useAppContext } from "../contexts/AppContext"
import Swal from "sweetalert2"
import { useState, useEffect } from "react"

const DashboardPage = () => {
  const state = useAppState()
  const { syncDummyDataToFirebase } = useAppContext()

  const { auth } = state || {}

  // DEBUG LOG
  useEffect(() => {
    console.log("STATE >>>", state)
    console.log("AUTH >>>", auth)
  }, [state, auth])

  // fallback dummy kalau userLevel kosong
  const dummyAuth = {
    user: { nama: "Dummy User" },
    userLevel: "superadmin", // ganti sesuai role yang mau dites
  }

  const { user, userLevel } = auth?.user && auth?.userLevel ? auth : dummyAuth

  const [syncing, setSyncing] = useState(false)

  const handleSyncToFirebase = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Sync Data",
      text: "Apakah Anda yakin ingin mengirim data dummy ke Firebase? Data yang sudah ada akan ditambahkan.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Sync Data",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        setSyncing(true)
        await syncDummyDataToFirebase()

        Swal.fire({
          icon: "success",
          title: "Sync Berhasil!",
          text: "Data dummy berhasil dikirim ke Firebase",
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Sync Gagal!",
          text: "Terjadi kesalahan saat sync data ke Firebase",
        })
      } finally {
        setSyncing(false)
      }
    }
  }

  // --- FUNCTION GET DATA SESUAI ROLE ---
  const getRoleSpecificStats = () => {
    switch (userLevel) {
      case "superadmin":
        return [
          { title: "Total Warga", value: "1,234", icon: Users, color: "bg-blue-500", change: "+12%" },
          { title: "Surat Masuk", value: "45", icon: FileText, color: "bg-green-500", change: "+8%" },
          { title: "Asset RT", value: "89", icon: Package, color: "bg-purple-500", change: "+5%" },
          { title: "Iuran Bulan Ini", value: "Rp 12.5M", icon: DollarSign, color: "bg-orange-500", change: "+15%" },
        ]
      case "pak rt":
        return [
          { title: "Total Warga", value: "1,234", icon: Users, color: "bg-blue-500", change: "+12%" },
          { title: "Surat Pending", value: "12", icon: FileText, color: "bg-yellow-500", change: "+3%" },
          { title: "Kegiatan RT", value: "8", icon: Calendar, color: "bg-green-500", change: "+2%" },
          { title: "Iuran Terkumpul", value: "Rp 8.2M", icon: DollarSign, color: "bg-orange-500", change: "+10%" },
        ]
      // tambahkan role lain sesuai kode kamu...
      default:
        return []
    }
  }

  const stats = getRoleSpecificStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Selamat Datang, {user?.nama}!</h1>
              <p className="text-gray-600 capitalize">Dashboard {userLevel} - Sistem Informasi RT Terpadu</p>
            </div>
            {userLevel === "superadmin" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSyncToFirebase}
                disabled={syncing}
                className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{syncing ? "Syncing..." : "Sync ke Firebase"}</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">{stat.change}</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
