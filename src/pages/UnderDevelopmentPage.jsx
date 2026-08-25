"use client"
import { motion } from "framer-motion"
import { Construction, Wrench, Cog, ArrowLeft } from "lucide-react"
import { useAppDispatch, setCurrentPage } from "../contexts/AppContext"

const UnderDevelopmentPage = ({ pageName }) => {
  const dispatch = useAppDispatch()

  const getPageTitle = (pageName) => {
    const pageNames = {
      "table-satuan-asset": "Table Satuan Asset",
      "table-pekerjaan": "Table Pekerjaan",
      "kelompok-asset": "Pembuatan Kelompok Asset",
      "jenis-asset": "Pembuatan Jenis Asset",
      "dawis-pkk": "Pembuatan Dawis PKK",
      "data-kk": "Data KK",
      "data-warga": "Data Warga",
      "pengurus-rt": "Pengurus RT",
      "pencatatan-surat": "Pencatatan Surat",
      "data-anggota-dawis": "Data Anggota Dawis",
      pengguna: "Pengguna",
      about: "About",
    }
    return pageNames[pageName] || "Halaman"
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        {/* Animated Icons */}
        <div className="relative mb-8">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
              scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            }}
            className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4"
          >
            <Construction className="w-12 h-12 text-white" />
          </motion.div>

          {/* Floating Tools */}
          <motion.div
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute -top-2 -left-8"
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          <motion.div
            animate={{
              y: [10, -10, 10],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute -top-2 -right-8"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Cog className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{getPageTitle(pageName)}</h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-100">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">Dalam Proses Pengembangan</h2>
              <p className="text-blue-600 leading-relaxed">
                Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia. Tim developer kami sedang bekerja
                keras untuk memberikan pengalaman terbaik.
              </p>
            </div>

            {/* Progress Animation */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress Pengembangan</span>
                <span className="text-sm text-gray-500">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 2, delay: 1 }}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                />
              </div>
            </div>

            {/* Features Coming Soon */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Yang Akan Datang:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 }}
                  className="flex items-center"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Interface yang user-friendly
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 }}
                  className="flex items-center"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Fitur lengkap dan terintegrasi
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 }}
                  className="flex items-center"
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Performa yang optimal
                </motion.li>
              </ul>
            </div>
          </motion.div>

          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch(setCurrentPage("dashboard"))}
            className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default UnderDevelopmentPage
