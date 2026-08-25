"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Trash2, Search, X, Eye, EyeOff } from "lucide-react"
import Swal from "sweetalert2"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "../../services/firebase"
import React from "react"
import iconMap from "../../utils/iconMap"

const PenggunaPage = () => {
  // Firestore-backed state
  const [userAccountsData, setUserAccountsData] = useState([])
  const [kkData, setKkData] = useState([])
  const [wargaData, setWargaData] = useState([])
  const [pengurusRTData, setPengurusRTData] = useState([])
  const [modulesData, setModulesData] = useState([])
  const [defaultPermissions, setDefaultPermissions] = useState({})

  // UI state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // form state
  const [formData, setFormData] = useState({
    kepala_keluarga: "",
    alamat: "",
    nama_pemilik_akun: "",
    jabatan: "",
    level_akun: "",
    username: "",
    password: "",
    confirm_password: "",
    permissions: {},
  })

  // levels we consider
  const LEVELS = ["pak rt", "ketua pkk", "sekretaris", "bendahara", "pengurus", "warga", "superadmin"]

  // Build kkOptions from kkData
  const kkOptions = kkData.map((kk) => ({
    value: kk.nama_kepala_keluarga,
    label: kk.nama_kepala_keluarga,
    alamat: `${kk.alamat || ""} ${kk.no_rumah || ""}`.trim(),
    no_kk: kk.no_kk || "",
    no_rumah: kk.no_rumah || "",
  }))

  // helper to get warga under a kepala keluarga
  const getWargaByKK = (kepalaKeluarga) => {
    return (wargaData || []).filter((warga) => {
      // warga might store kepala_keluarga as field nama_kepala_keluarga or kepala_keluarga
      return warga.kepala_keluarga === kepalaKeluarga || warga.nama_kepala_keluarga === kepalaKeluarga
    })
  }

  // helper to find pengurus info by warga name
  const findPengurusByNama = (nama) => {
    if (!pengurusRTData) return null
    return pengurusRTData.find((p) => p.nama_warga === nama || p.nama === nama)
  }

  // permissions template built from modulesData: { level: {moduleId: false, ...}, ...}
  const buildPermissionsTemplate = (modulesArr = []) => {
    const perms = {}
    LEVELS.forEach((lvl) => {
      perms[lvl] = {}
      modulesArr.forEach((m) => {
        const id = m.id || m.moduleId || m.nama_modul || String(m.name || m.title || m.code || Math.random())
        perms[lvl][id] = false
      })
    })
    return perms
  }

  // permissions template (kept in state derived from modules)
  const [permissionsTemplate, setPermissionsTemplate] = useState({})

  // ----------------------------------------
  // Firestore listeners - load realtime data
  // ----------------------------------------
  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUserAccountsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error("Error listening users:", err)
      },
    )

    const unsubKK = onSnapshot(
      collection(db, "kkData"),
      (snap) => {
        setKkData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error("Error listening kk:", err)
      },
    )

    const unsubWarga = onSnapshot(
      collection(db, "wargaData"),
      (snap) => {
        setWargaData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error("Error listening warga:", err)
      },
    )

    const unsubPengurus = onSnapshot(
      collection(db, "pengurusRT"),
      (snap) => {
        setPengurusRTData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (err) => {
        console.error("Error listening pengurusRT:", err)
      },
    )

    const unsubModules = onSnapshot(
      collection(db, "modules"),
      (snap) => {
        const modules = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setModulesData(modules)
        setPermissionsTemplate(buildPermissionsTemplate(modules))
      },
      (err) => {
        console.error("Error listening modules:", err)
      },
    )

    const unsubDefaultPermissions = onSnapshot(
      doc(db, "permissions", "default"),
      (snap) => {
        if (snap.exists()) {
          setDefaultPermissions(snap.data())
        }
      },
      (err) => {
        console.error("Error listening default permissions:", err)
      },
    )

    return () => {
      unsubUsers()
      unsubKK()
      unsubWarga()
      unsubPengurus()
      unsubModules()
      unsubDefaultPermissions()
    }
  }, [])

  // ----------------------------------------
  // Filtering, sorting, pagination
  // ----------------------------------------
  const filteredData = (userAccountsData || []).filter(
    (user) =>
      (user.nama_pemilik_akun && user.nama_pemilik_akun.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.kepala_keluarga && user.kepala_keluarga.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  // helpers for level limits
  const getUserLevelCount = (level) => {
    return (userAccountsData || []).filter((u) => u.level_akun === level).length
  }

  const canAddUserLevel = (level) => {
    const limits = {
      "pak rt": 1,
      sekretaris: 1,
      bendahara: 1,
    }
    return !limits[level] || getUserLevelCount(level) < limits[level]
  }

  // ----------------------------------------
  // Form behavior
  // ----------------------------------------
 const handleInputChange = (e) => {
  const { name, value } = e.target
  setFormData((prev) => ({ ...prev, [name]: value }))

  if (name === "kepala_keluarga") {
    const kk = kkData.find(
      (k) => k.nama_kepala_keluarga === value || k.kepala_keluarga === value
    )
    if (kk) {
      setFormData((prev) => ({
        ...prev,
        alamat: `${kk.alamat || ""} ${kk.no_rumah || ""}`.trim(),
        username: "",
        nama_pemilik_akun: "",
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        alamat: "",
        username: "",
        nama_pemilik_akun: "",
      }))
    }
  }

  if (name === "nama_pemilik_akun") {
    // cari data warga berdasarkan nama
    const selectedWarga = wargaData.find((w) => w.nama === value)
    const nik = selectedWarga ? selectedWarga.nik || "" : ""

    const pengurus = findPengurusByNama(value)
    if (pengurus) {
      const level = pengurus.level || ""
      const levelPerms = {}
      if (defaultPermissions && Object.keys(defaultPermissions).length > 0) {
        Object.keys(defaultPermissions).forEach((moduleId) => {
          if (defaultPermissions[moduleId] && defaultPermissions[moduleId][level]) {
            levelPerms[moduleId] = defaultPermissions[moduleId][level]
          }
        })
      }
      setFormData((prev) => ({
        ...prev,
        username: nik, // otomatis isi dengan NIK
        jabatan: pengurus.jabatan || "",
        level_akun: level || "warga",
        permissions: levelPerms,
      }))
    } else {
      const levelPerms = {}
      if (defaultPermissions && Object.keys(defaultPermissions).length > 0) {
        Object.keys(defaultPermissions).forEach((moduleId) => {
          if (defaultPermissions[moduleId] && defaultPermissions[moduleId]["warga"]) {
            levelPerms[moduleId] = defaultPermissions[moduleId]["warga"]
          }
        })
      }
      setFormData((prev) => ({
        ...prev,
        username: nik, // otomatis isi dengan NIK
        jabatan: "Warga",
        level_akun: "warga",
        permissions: levelPerms,
      }))
    }
  }
}


  // permission checkbox change
  const handlePermissionChange = (moduleId, checked) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: checked,
      },
    }))
  }

  // ----------------------------------------
  // Submit (add / update) to Firestore
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()

    // basic validation
    if (!formData.kepala_keluarga || !formData.nama_pemilik_akun || !formData.username || !formData.password) {
      await Swal.fire("Error", "Semua field wajib diisi", "error")
      return
    }

    if (formData.password !== formData.confirm_password) {
      await Swal.fire("Error", "Password tidak sama, silahkan entry ulang password.", "error")
      return
    }

    if (formData.password.length > 10) {
      await Swal.fire("Error", "Password maksimal 10 karakter", "error")
      return
    }

    if (!editingItem) {
      const existingUser = (userAccountsData || []).find(
        (u) => u.kepala_keluarga === formData.kepala_keluarga && u.nama_pemilik_akun === formData.nama_pemilik_akun,
      )
      if (existingUser) {
        await Swal.fire("Error", "Kepala Keluarga dan Nama Pemilik Akun sudah digunakan/ada dalam database", "error")
        return
      }

      if (!canAddUserLevel(formData.level_akun)) {
        await Swal.fire("Error", `Level user ${formData.level_akun} sudah mencapai batas maksimal`, "error")
        return
      }
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, "users", editingItem.id), {
          ...formData,
          hak_akses: formData.permissions,
        })
        await Swal.fire("Berhasil", "Data pengguna berhasil diperbarui", "success")
      } else {
        await addDoc(collection(db, "users"), {
          ...formData,
          hak_akses: formData.permissions,
          status: "Aktif",
          createdAt: new Date().toISOString(),
        })
        await Swal.fire("Berhasil", "Akun pengguna berhasil dibuat", "success")
      }

      handleCloseModal()
    } catch (err) {
      console.error("Error saving user account:", err)
      await Swal.fire("Error", "Terjadi kesalahan saat menyimpan data", "error")
    }
  }

  // ----------------------------------------
  // Delete user
  // ----------------------------------------
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin ingin menghapus akun pengguna ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", id))
        await Swal.fire("Terhapus", "Akun pengguna berhasil dihapus", "success")
      } catch (err) {
        console.error("Error deleting user:", err)
        await Swal.fire("Error", "Gagal menghapus akun", "error")
      }
    }
  }

  // ----------------------------------------
  // Edit user (populate form)
  // ----------------------------------------
  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      kepala_keluarga: item.kepala_keluarga || "",
      alamat: item.alamat || "",
      nama_pemilik_akun: item.nama_pemilik_akun || "",
      jabatan: item.jabatan || "",
      level_akun: item.level_akun || "",
      username: item.username || "",
      password: item.password || "",
      confirm_password: item.password || "",
      permissions: item.hak_akses || item.permissions || {},
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({
      kepala_keluarga: "",
      alamat: "",
      nama_pemilik_akun: "",
      jabatan: "",
      level_akun: "",
      username: "",
      password: "",
      confirm_password: "",
      permissions: {},
    })
  }

  // ----------------------------------------
  // Render UI (table + modal)
  // ----------------------------------------
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
          <p className="text-gray-600">Kelola akun pengguna sistem</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Akun
        </motion.button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pemilik Akun
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kepala Keluarga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alamat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.nama_pemilik_akun}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.kepala_keluarga}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.alamat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {"*".repeat((item.password || "").length)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.level_akun || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Menampilkan <span className="font-medium">{startIndex + 1}</span> sampai{" "}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> dari{" "}
                <span className="font-medium">{filteredData.length}</span> data
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page ? "z-10 bg-blue-50 border-blue-500 text-blue-600" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{editingItem ? "Edit Pengguna" : "Buat Akun"}</h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - User Data */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Data User</h4>

                    {/* Kepala Keluarga */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kepala Keluarga <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="kepala_keluarga"
                        value={formData.kepala_keluarga}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Pilih Kepala Keluarga</option>
                        {kkOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alamat */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                      <input
                        type="text"
                        name="alamat"
                        value={formData.alamat}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                        readOnly
                      />
                    </div>

                    {/* Nama Pemilik Akun */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Pemilik Akun <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="nama_pemilik_akun"
                        value={formData.nama_pemilik_akun}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Pilih Nama Pemilik Akun</option>
                        {formData.kepala_keluarga &&
                          getWargaByKK(formData.kepala_keluarga).map((warga) => (
                            <option key={warga.id} value={warga.nama}>
                              {warga.nama}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Jabatan */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                      <input
                        type="text"
                        name="jabatan"
                        value={formData.jabatan}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                        readOnly
                      />
                    </div>

                    {/* Level Akun */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level Akun</label>
                      <input
                        type="text"
                        name="level_akun"
                        value={formData.level_akun}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                        readOnly
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Akun <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Username"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Maksimal 10 karakter"
                          maxLength={10}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ulang Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ulangi password"
                          maxLength={10}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Permissions */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Hak Akses</h4>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {(() => {
                        // Group modules by type (menu vs submenu)
                        const menuModules = modulesData.filter(
                          (m) => !m.id_parent || m.id_parent === null || m.id_parent === "",
                        )
                        const submenuModules = modulesData.filter(
                          (m) => m.id_parent && m.id_parent !== null && m.id_parent !== "",
                        )

                        console.log("[v0] PenggunaPage: All menu modules:", menuModules.length)
                        console.log("[v0] PenggunaPage: All submenu modules:", submenuModules.length)
                        console.log("[v0] PenggunaPage: Current form permissions:", formData.permissions)

                        if (menuModules.length === 0 && submenuModules.length === 0) {
                          return <p className="text-sm text-gray-500">Tidak ada modul tersedia.</p>
                        }

                        return (
                          <div className="space-y-6">
                            {/* Menu Section */}
                            {menuModules.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-800 mb-3 bg-gray-50 px-3 py-2 rounded">
                                  Menu Utama ({menuModules.length} tersedia)
                                </h5>
                                <div className="space-y-2 pl-2">
                                  {menuModules
                                    .sort((a, b) => Number.parseFloat(a.id_menu) - Number.parseFloat(b.id_menu))
                                    .map((module) => {
                                      const moduleId = module.id_menu
                                      const hasAccess = !!formData.permissions[moduleId]

                                      return (
                                        <label
                                          key={moduleId}
                                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            onChange={(e) => handlePermissionChange(moduleId, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex items-center space-x-2">
                                            {module.icon && iconMap[module.icon] && (
                                              <span className="text-gray-600">
                                                {React.createElement(iconMap[module.icon], { className: "w-4 h-4" })}
                                              </span>
                                            )}
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium text-gray-700">
                                                {module.nama_modul}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                ID: {moduleId} | Status: {module.status}
                                              </span>
                                            </div>
                                          </div>
                                        </label>
                                      )
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Submenu Section */}
                            {submenuModules.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-800 mb-3 bg-gray-50 px-3 py-2 rounded">
                                  Sub Menu ({submenuModules.length} tersedia)
                                </h5>
                                <div className="space-y-2 pl-2">
                                  {submenuModules
                                    .sort((a, b) => Number.parseFloat(a.id_menu) - Number.parseFloat(b.id_menu))
                                    .map((module) => {
                                      const moduleId = module.id_menu
                                      const hasAccess = !!formData.permissions[moduleId]

                                      // Find parent menu name
                                      const parentMenu = menuModules.find((m) => m.id_menu === module.id_parent)

                                      return (
                                        <label
                                          key={moduleId}
                                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            onChange={(e) => handlePermissionChange(moduleId, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex items-center space-x-2">
                                            {module.icon && iconMap[module.icon] && (
                                              <span className="text-gray-600">
                                                {React.createElement(iconMap[module.icon], { className: "w-4 h-4" })}
                                              </span>
                                            )}
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium text-gray-700">
                                                {module.nama_modul}
                                              </span>
                                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                <span>ID: {moduleId}</span>
                                                <span>•</span>
                                                <span>Status: {module.status}</span>
                                                {parentMenu && (
                                                  <>
                                                    <span>•</span>
                                                    <span>Parent: {parentMenu.nama_modul}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </label>
                                      )
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Show current level permissions info */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-700">
                                <strong>Level:</strong> {formData.level_akun || "Belum dipilih"}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                {editingItem
                                  ? "Menampilkan semua modul tersedia. Centang untuk memberikan akses."
                                  : "Menampilkan semua modul tersedia. Hak akses default akan diterapkan berdasarkan level."}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Total modul: {menuModules.length + submenuModules.length} | Dipilih:{" "}
                                {Object.values(formData.permissions).filter(Boolean).length}
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PenggunaPage
