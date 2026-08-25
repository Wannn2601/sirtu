"use client"
import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Home,
  Shield,
  Settings,
  FileText,
  Package,
  Users,
  ChevronUp,
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
  Menu,
} from "lucide-react"
import { useAppState } from "../contexts/AppContext"

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

const BottomNav = ({ isMobile = false }) => {
  const { state } = useAppState()

  const { userLevel = "superadmin" } = state?.auth || {}
  const { modules = [] } = state?.modul || {}
  const { permissions = {} } = state || {}

  const navigate = useNavigate()
  const location = useLocation()

  const [showSubmenu, setShowSubmenu] = useState(false)
  const [activeParent, setActiveParent] = useState(null)

  useEffect(() => {
    const handleModulesUpdated = () => {
      // console.log("[v0] BottomNav: Received modulesUpdated event")
      setShowSubmenu(false)
    }

    window.addEventListener("modulesUpdated", handleModulesUpdated)
    return () => {
      window.removeEventListener("modulesUpdated", handleModulesUpdated)
    }
  }, [])

  const menuItems = useMemo(() => {
    if (!modules || modules.length === 0) return []

    // console.log("[v0] BottomNav: Processing modules for menu items:", modules.length)
    // console.log("[v0] BottomNav: Permissions:", permissions)
    // console.log("[v0] BottomNav: User level:", userLevel)

    const parentModules = modules
      .filter((m) => {
        const hasNoParent = !m.id_parent || m.id_parent === null || m.id_parent === ""
        const isActive = m.status === "aktif"
        const hasPermission = true // permissions[m.id_menu]?.[userLevel] === true

        // console.log(
        //   `[v0] BottomNav Parent check - ${m.nama_modul}: hasNoParent=${hasNoParent}, isActive=${isActive}, hasPermission=${hasPermission}`,
        // )

        return hasNoParent && isActive && hasPermission
      })
      .sort((a, b) => {
        const aNum = Number.parseFloat(a.id_menu)
        const bNum = Number.parseFloat(b.id_menu)
        return aNum - bNum
      })

    // console.log("[v0] BottomNav: Found parent modules:", parentModules.length)

    return parentModules.map((parent) => {
      const children = modules
        .filter((m) => {
          const isChild = m.id_parent === parent.id_menu
          const isActive = m.status === "aktif"
          const hasPermission = true // permissions[m.id_menu]?.[userLevel] === true

          if (isChild) {
            console.log(
              `[v0] BottomNav Child check`
            )
          }

          return isChild && isActive && hasPermission
        })
        .sort((a, b) => {
          const aNum = Number.parseFloat(a.id_menu)
          const bNum = Number.parseFloat(b.id_menu)
          return aNum - bNum
        })
        .map((child) => ({
          id: child.id_menu,
          title: child.nama_modul,
          icon: iconMap[child.icon] || FileText,
          path: child.url,
        }))

      // console.log(
      //   `[v0] BottomNav Parent ${parent.nama_modul} has ${children.length} children:`,
      //   children.map((c) => c.title),
      // )

      return {
        id: parent.id_menu,
        title: parent.nama_modul,
        icon: iconMap[parent.icon] || FileText,
        path: parent.url,
        children: children.length > 0 ? children : undefined,
      }
    })
  }, [modules, permissions, userLevel])

  const finalMenuItems =
    menuItems.length > 0
      ? menuItems
      : [
          {
            id: "1",
            title: "Dashboard",
            icon: Home,
            path: "/dashboard",
          },
        ]

  const handleNavClick = (item) => {
    if (item.children) {
      setActiveParent(item.id)
      setShowSubmenu(true)
    } else {
      navigate(item.path)
      setShowSubmenu(false)
    }
  }

  const handleSubmenuClick = (child) => {
    navigate(child.path)
    setShowSubmenu(false)
  }

  const isCurrentPage = (path) => location.pathname === path

  if (!isMobile) {
    return null
  }

  const activeParentItem = finalMenuItems.find((item) => item.id === activeParent)

  return (
    <>
      <AnimatePresence>
        {showSubmenu && activeParentItem?.children && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-50 max-h-64 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{activeParentItem.title}</h3>
                <button onClick={() => setShowSubmenu(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeParentItem.children.map((child) => (
                  <motion.button
                    key={child.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubmenuClick(child)}
                    className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                      isCurrentPage(child.path) ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <child.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{child.title}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center py-2 px-1 overflow-x-auto">
          {finalMenuItems.slice(0, 5).map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center py-2 px-2 rounded-lg transition-colors duration-200 min-w-0 flex-1 ${
                isCurrentPage(item.path) || (item.children && activeParent === item.id)
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 mb-1 flex-shrink-0" />
                {item.children && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>}
              </div>
              <span className="text-xs truncate w-full text-center">{item.title}</span>
            </motion.button>
          ))}

          {finalMenuItems.length > 5 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveParent("more")
                setShowSubmenu(true)
              }}
              className="flex flex-col items-center py-2 px-2 rounded-lg transition-colors duration-200 min-w-0 flex-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            >
              <Menu className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="text-xs truncate w-full text-center">More</span>
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSubmenu && activeParent === "more" && finalMenuItems.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-50 max-h-64 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">More Menus</h3>
                <button onClick={() => setShowSubmenu(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {finalMenuItems.slice(5).map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavClick(item)}
                    className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                      isCurrentPage(item.path) ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{item.title}</span>
                    {item.children && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default BottomNav
