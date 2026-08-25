"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { RotateCcw, Save } from "lucide-react"
import Swal from "sweetalert2"
import { collection, getDocs, setDoc, getDoc, doc, onSnapshot  } from "firebase/firestore"
import { db } from "../../services/firebase"
import { useAppState, useAppDispatch, useAppContext, updatePermissions } from "../../contexts/AppContext"

const SetDefaultAksesPage = () => {
const { state } = useAppState()
  const dispatch = useAppDispatch()
  const { firestoreService, refreshModulesFromFirebase } = useAppContext()

  const modules = state?.modul?.modules || []
  const loading = state?.modul?.loading || false

  console.log("[v0] SetDefaultAksesPage: Current state:", state)
  console.log("[v0] SetDefaultAksesPage: Modul state:", state?.modul)
  console.log("[v0] SetDefaultAksesPage: Modules array:", state?.modul?.modules)

  const { modul, permissions } = state || {}
  // const { modules = [], loading = false } = modul || {}
  // const [localPermissions, setLocalPermissions] = useState(permissions || {})

  console.log("[v0] SetDefaultAksesPage: Final modules:", modules)
  console.log("[v0] SetDefaultAksesPage: Loading state:", loading)

  const [localPermissions, setLocalPermissions] = useState(permissions || {})

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions)
    }
  }, [permissions])



useEffect(() => {
  const unsub = onSnapshot(doc(db, "permissions", "default"), (snap) => {
    if (snap.exists()) {
      dispatch({ type: "UPDATE_PERMISSIONS", payload: snap.data() })
    }
  })

  return () => unsub()
}, [dispatch])



const dummyPermissions = {
   "1.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: true, warga: true },
    "2.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    2.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    2.02: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    2.03: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    2.04: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    2.05: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    "3.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    3.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    3.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    3.03: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    "4.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.02: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.03: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.04: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.05: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.06: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    4.07: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: true, warga: false },
    "5.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    5.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    5.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    "6.00": { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.01: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.02: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.03: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.04: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.05: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.06: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.07: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    6.08: { superadmin: true, "pak rt": true, "ketua pkk": false, bendahara: false, pengurus: false, warga: false },
    "7.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
    7.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
    7.02: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
    7.03: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
    7.04: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: true, pengurus: false, warga: false },
    "8.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: false, warga: false },
    8.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: false, pengurus: false, warga: false },
    "9.00": { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: true },
    9.01: { superadmin: true, "pak rt": false, "ketua pkk": false, bendahara: false, pengurus: false, warga: true },
    "10.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    10.01: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    10.02: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    10.03: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    10.04: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    10.05: { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: false, warga: false },
    "11.00": { superadmin: true, "pak rt": true, "ketua pkk": true, bendahara: true, pengurus: true, warga: true },
}

const seedDummyPermissions = async () => {
  try {
    await setDoc(doc(db, "permissions", "default"), dummyPermissions)
    Swal.fire({
      icon: "success",
      title: "Dummy permissions berhasil dikirim ke Firebase!",
      timer: 2000,
      showConfirmButton: false,
    })
  } catch (err) {
    console.error("Error seeding permissions:", err)
    Swal.fire("Error", "Gagal mengirim dummy permissions", "error")
  }
}


  const userRoles = ["superadmin", "pak rt", "ketua pkk", "bendahara", "pengurus", "warga"]

const handlePermissionChange = (moduleId, role, checked) => {
  const updated = {
    ...localPermissions,
    [moduleId]: {
      ...localPermissions[moduleId],
      [role]: checked,
    },
  }

  // auto-check children
  if (checked) {
    const childModules = modules.filter((m) => m.id_parent === moduleId)
    childModules.forEach((child) => {
      updated[child.id_menu] = {
        ...updated[child.id_menu],
        [role]: true,
      }
    })
  }

  setLocalPermissions(updated)
  dispatch({ type: "UPDATE_PERMISSIONS", payload: updated })
}



  const handleSavePermissions = async () => {
  const result = await Swal.fire({
    title: "Simpan Perubahan",
    text: "Apakah Anda yakin ingin menyimpan perubahan hak akses?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Simpan",
    cancelButtonText: "Batal",
  })

  if (result.isConfirmed) {
    try {
      // Simpan ke Firestore
      await setDoc(doc(db, "permissions", "default"), localPermissions)

      // Update context
      dispatch({ type: "UPDATE_PERMISSIONS", payload: localPermissions })

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Hak akses berhasil disimpan",
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error("Gagal menyimpan permissions:", error)
      Swal.fire("Error", "Gagal menyimpan ke database", "error")
    }
  }
}



  const handleSetToDefault = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Set to Default",
      text: "Apakah Anda yakin ingin mengatur semua hak akses ke pengaturan default?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Set Default",
      cancelButtonText: "Batal",
    })

    if (result.isConfirmed) {
      const defaultPermissions = {}
      modules.forEach((module) => {
        defaultPermissions[module.id_menu] = {
          superadmin: true,
          "pak rt": module.id_menu.startsWith("2") ? false : true,
          "ketua pkk": module.id_menu.startsWith("2") || module.id_menu.startsWith("7") ? false : true,
          bendahara:
            module.id_menu.startsWith("2") || module.id_menu === "7.00" || module.id_menu.startsWith("7.")
              ? true
              : false,
          pengurus:
            module.id_menu === "1.00" || module.id_menu.startsWith("4") || module.id_menu === "11.00" ? true : false,
          warga:
            module.id_menu === "1.00" ||
            module.id_menu === "9.00" ||
            module.id_menu === "9.01" ||
            module.id_menu === "11.00"
              ? true
              : false,
        }
      })

      setLocalPermissions(defaultPermissions)
      dispatch(updatePermissions(defaultPermissions))

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Hak akses berhasil diatur ke pengaturan default",
        timer: 2000,
        showConfirmButton: false,
      })
    }
  }

  const parentModules = modules.filter((m) => !m.id_parent)
  const getChildModules = (parentId) => modules.filter((m) => m.id_parent === parentId)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{loading ? "Memuat data modul..." : "Tidak ada data modul tersedia"}</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>Loading: {loading ? "true" : "false"}</p>
              <p>Modules count: {modules?.length || 0}</p>
              <p>State available: {state ? "true" : "false"}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Set Default Akses</h1>
            <p className="text-gray-600">Atur hak akses default untuk setiap level pengguna</p>
            <p className="text-sm text-blue-600 mt-1">
              Menampilkan {modules.length} modul ({parentModules.length} parent modules)
            </p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSavePermissions}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSetToDefault}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Set to Default</span>
            </motion.button>
            {/* <button
  onClick={seedDummyPermissions}
  className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
>
  Seed Dummy Permissions
</button> */}

          </div>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Modul
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Modul
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Modul
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  colSpan={userRoles.length}
                >
                  Default Hak Akses
                </th>
              </tr>
              <tr className="bg-gray-50 border-t">
                <th colSpan={3}></th>
                {userRoles.map((role) => (
                  <th
                    key={role}
                    className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parentModules.map((module) => (
                <React.Fragment key={module.id_menu}>
                  {/* Parent Module */}
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{module.id_menu}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {module.nama_modul}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          module.status === "aktif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {module.status}
                      </span>
                    </td>
                    {userRoles.map((role) => (
                      <td key={role} className="px-3 py-4 text-center border-l">
                        <input
  type="checkbox"
  checked={localPermissions[module.id_menu]?.[role] || false}
  onChange={(e) => handlePermissionChange(module.id_menu, role, e.target.checked)}
  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
/>

                      </td>
                    ))}
                  </motion.tr>

                  {/* Child Modules */}
                  {getChildModules(module.id_menu).map((child) => (
                    <motion.tr
                      key={child.id_menu}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 bg-gray-25"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 pl-12">{child.id_menu}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 pl-8">↳ {child.nama_modul}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            child.status === "aktif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {child.status}
                        </span>
                      </td>
                      {userRoles.map((role) => (
                        <td key={role} className="px-3 py-4 text-center border-l">
                          <input
                            type="checkbox"
                            checked={localPermissions[child.id_menu]?.[role] || false}
                            onChange={(e) => handlePermissionChange(child.id_menu, role, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SetDefaultAksesPage
