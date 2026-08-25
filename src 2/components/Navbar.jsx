"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react"
import Swal from "sweetalert2"
import { useNavigate } from "react-router-dom"
import { useAppState, useAppDispatch, logout, toggleSidebar } from "../contexts/AppContext"

const Navbar = ({ isMobile = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const profileDropdownRef = useRef(null)
  const notificationDropdownRef = useRef(null)

  const state = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { user = null } = state?.auth || {}
  const { notifications = [] } = state?.ui || {}

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false)
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const formatTime = (date) => {
    return date
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\./g, ":")
  }

  const formatDate = (date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleLogout = () => {
    Swal.fire({
      title: "Konfirmasi Logout",
      text: "Apakah Anda yakin ingin keluar?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      customClass: {
        popup: "max-h-screen overflow-y-auto",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(logout())
        navigate("/")
        Swal.fire({
          icon: "success",
          title: "Logout Berhasil",
          text: "Terima kasih telah menggunakan SIRTU",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "max-h-screen overflow-y-auto",
          },
        })
      }
    })
  }

  const unreadNotifications = notifications.filter((n) => !n.read)

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          {!isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}

          <div className="flex flex-col">
            <div className="text-lg font-semibold text-gray-800">{formatTime(currentTime)}</div>
            <div className="text-sm text-gray-600">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1"
                >
                  {/* Notification items */}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-2 ${notification.read ? "text-gray-500" : "text-gray-800 font-bold"}`}
                    >
                      {notification.message}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">{user?.name || "Guest"}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2 text-gray-600" />
                    Logout
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-200">
                    <Settings className="w-4 h-4 mr-2 text-gray-600" />
                    Settings
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
