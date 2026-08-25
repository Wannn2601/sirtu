"use client"

import React, { useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Home,
  Shield,
  Settings,
  FileText,
  Package,
  Users,
  ChevronRight,
  Table,
  Key,
  Calendar,
  Briefcase,
  UserCheck,
  Building,
  Edit,
  Trash2,
  CheckCircle,
  DollarSign,
  Monitor,
  CreditCard,
  BookOpen,
  ArrowRightLeft,
  Wallet,
  Store,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  History,
  Archive,
  Info,
} from "lucide-react"
import { useAppState, useAppContext } from "../contexts/AppContext"

const iconMap = {
  Home,
  Shield,
  Settings,
  FileText,
  Package,
  Users,
  Table,
  Key,
  Calendar,
  Briefcase,
  UserCheck,
  Building,
  Edit,
  Trash2,
  CheckCircle,
  DollarSign,
  Monitor,
  CreditCard,
  BookOpen,
  ArrowRightLeft,
  Wallet,
  Store,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  History,
  Archive,
  Info,
}

const Sidebar = () => {
  const { state } = useAppState()
  const { refreshModulesFromFirebase } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  // ambil permissions dari context
  const { permissions = {} } = state || {}
  // console.log("[v0] Sidebar - Full permissions object:", permissions)
  // console.log("[v0] Sidebar - Permissions keys:", Object.keys(permissions))

  // Safe destructuring with fallback values
  const { sidebarOpen = true } = state?.ui || {}
  const { userLevel = "superadmin" } = state?.auth || {}
  const modules = state?.modul?.modules || []
  const loading = state?.modul?.loading || false

  // console.log("[v0] Sidebar - Full state:", state)
  // console.log("[v0] Sidebar - state.modul:", state?.modul)
  // console.log("[v0] Sidebar - modules:", modules)
  // console.log("[v0] Sidebar - modules length:", modules.length)
  // console.log("[v0] Sidebar - userLevel:", userLevel)

  useEffect(() => {
    // console.log("[v0] Sidebar mounted")
    // console.log("[v0] Sidebar modules:", modules?.length || 0)
    // console.log("[v0] Sidebar sidebarOpen:", sidebarOpen)

    if (!modules || modules.length === 0) {
      // console.log("[v0] Sidebar: No modules available, refreshing...")
      refreshModulesFromFirebase()
    } else {
      // console.log("[v0] Sidebar: modules available, count:", modules.length)
    }
  }, [refreshModulesFromFirebase])

  useEffect(() => {
    const handleModulesUpdated = () => {
      // console.log("[v0] Sidebar: Received modulesUpdated event, refreshing...")
      refreshModulesFromFirebase()
    }

    window.addEventListener("modulesUpdated", handleModulesUpdated)
    return () => {
      window.removeEventListener("modulesUpdated", handleModulesUpdated)
    }
  }, [refreshModulesFromFirebase])

  useEffect(() => {
    // console.log("[v0] Sidebar: modules updated, count:", modules?.length || 0)
    if (modules && modules.length > 0) {
      // console.log("[v0] Sidebar: first few modules:", modules.slice(0, 3))
    }
  }, [modules])

  const menuItems = useMemo(() => {
    if (!modules || modules.length === 0) return []

    // console.log("[v0] Sidebar: Processing modules for menu items:", modules.length)
    // console.log("[v0] Sidebar: Sample modules:", modules.slice(0, 5))
    console.log("[v0] Sidebar: Permissions:", permissions)
    console.log("[v0] Sidebar: User level:", userLevel)

    const parentModules = modules
      .filter((m) => {
        const hasNoParent = !m.id_parent || m.id_parent === null || m.id_parent === ""
        const isActive = m.status === "aktif"
        const hasPermission = true // permissions[m.id_menu]?.[userLevel] === true

        console.log(
          `[v0] Parent check - ${m.nama_modul}: hasNoParent=${hasNoParent}, isActive=${isActive}, hasPermission=${hasPermission}`,
        )
        console.log(`[v0] Module details:`, {
          id_menu: m.id_menu,
          nama_modul: m.nama_modul,
          id_parent: m.id_parent,
          status: m.status,
          url: m.url,
        })

        return hasNoParent && isActive && hasPermission
      })
      .sort((a, b) => Number.parseFloat(a.id_menu) - Number.parseFloat(b.id_menu))

    console.log("[v0] Sidebar: Found parent modules:", parentModules.length)
    parentModules.forEach((p) => console.log(`[v0] Parent: ${p.nama_modul} (${p.id_menu})`))

    return parentModules.map((parent) => {
      const children = modules
        .filter((m) => {
          const isChild = m.id_parent === parent.id_menu
          const isActive = m.status === "aktif"
          const hasPermission = true // permissions[m.id_menu]?.[userLevel] === true

          if (isChild) {
            console.log(
              `[v0] Child check - ${m.nama_modul}: isChild=${isChild}, isActive=${isActive}, hasPermission=${hasPermission}`,
            )
            console.log(`[v0] Child details:`, {
              id_menu: m.id_menu,
              nama_modul: m.nama_modul,
              id_parent: m.id_parent,
              parent_id_menu: parent.id_menu,
              status: m.status,
              url: m.url,
            })
          }

          return isChild && isActive && hasPermission
        })
        .sort((a, b) => Number.parseFloat(a.id_menu) - Number.parseFloat(b.id_menu))
        .map((child) => ({
          id: child.id_menu,
          title: child.nama_modul,
          icon: iconMap[child.icon] || FileText,
          path: child.url,
        }))

      console.log(
        `[v0] Parent ${parent.nama_modul} has ${children.length} children:`,
        children.map((c) => c.title),
      )

      return {
        id: parent.id_menu,
        title: parent.nama_modul,
        icon: iconMap[parent.icon] || FileText,
        path: parent.url,
        children: children.length > 0 ? children : undefined,
      }
    })
  }, [modules, permissions, userLevel]) // ⬅️ tambah permissions

  const [expandedMenus, setExpandedMenus] = React.useState(["1.00", "2.00"])

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]))
  }

  const handleMenuClick = (item) => {
    console.log("[v0] Sidebar: Menu clicked:", item.title, "Path:", item.path)
    if (item.children) {
      toggleMenu(item.id)
    } else {
      if (item.path && item.path !== "#") {
        console.log("[v0] Sidebar: Navigating to:", item.path)
        navigate(item.path)
      } else {
        console.warn("[v0] Sidebar: Invalid path for menu item:", item.title)
      }
    }
  }

  const isCurrentPage = (path) => location.pathname === path

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0, width: sidebarOpen ? 256 : 64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-full bg-white shadow-lg border-r border-gray-200 z-40 overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200 flex-shrink-0">
          <motion.div animate={{ scale: sidebarOpen ? 1 : 0.8 }} className="flex items-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={localStorage.getItem("appLogo") || "/placeholder.svg?height=32&width=32&query=SIRTU logo"}
                alt="SIRTU Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none"
                  e.target.nextSibling.style.display = "flex"
                }}
              />
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg items-center justify-center hidden">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-3 text-xl font-bold text-gray-800"
                >
                  SIRTU
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {menuItems.map((item) => (
            <div key={item.id} className="mb-1">
              <motion.button
                whileHover={{ backgroundColor: "#f3f4f6" }}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                  isCurrentPage(item.path) || expandedMenus.includes(item.id)
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="ml-3 flex-1 text-sm font-medium"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.children && sidebarOpen && (
                  <motion.div
                    animate={{ rotate: expandedMenus.includes(item.id) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                )}
              </motion.button>

              {/* Submenu */}
              <AnimatePresence>
                {item.children && expandedMenus.includes(item.id) && sidebarOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {item.children.map((child) => (
                      <motion.button
                        key={child.id}
                        whileHover={{ backgroundColor: "#f9fafb" }}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center px-8 py-2 text-left text-sm transition-colors duration-200 ${
                          isCurrentPage(child.path) ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <child.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                        <span className="text-xs">{child.title}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default Sidebar
