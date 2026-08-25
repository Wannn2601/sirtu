"use client"

import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import MainContent from "./MainContent"
import BottomNav from "./BottomNav"
import { useAppContext, setCurrentPage } from "../contexts/AppContext"

const Dashboard = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { state, dispatch } = useAppContext()
  const { ui } = state
  const { sidebarOpen } = ui

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    dispatch(setCurrentPage("dashboard"))
  }, [dispatch])

  return (
    <div className="flex h-screen bg-gray-50 overflow-x-hidden max-w-screen">
      {/* Desktop Sidebar - Always show on desktop */}
      {!isMobile && <Sidebar />}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          !isMobile && sidebarOpen ? "ml-64" : !isMobile ? "ml-16" : ""
        }`}
      >
        <Navbar isMobile={isMobile} />
        <div className={`flex-1 overflow-auto ${isMobile ? "pb-20" : ""}`}>
          <MainContent />
        </div>
      </div>

      <BottomNav isMobile={isMobile} />
    </div>
  )
}

export default Dashboard
