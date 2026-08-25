"use client"

import { useState, useEffect } from "react"
import { firestoreService } from "../services/firebase"

export const useBendaharaLock = () => {
  const [lockStatus, setLockStatus] = useState({ locked: false, date: null, month: null, year: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkLockStatus()
  }, [])

  const checkLockStatus = async (checkDate = null) => {
    try {
      setLoading(true)
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : null

      if (!user) {
        setLockStatus({ locked: false, date: null, month: null, year: null })
        return
      }

      const wilayah = {
        rt: user.rt || user.RT || "001",
        rw: user.rw || user.RW || "001",
        kelurahan: user.kelurahan || user.Kelurahan || "",
        kecamatan: user.kecamatan || user.Kecamatan || "",
        kabupaten_kota: user.kabupaten_kota || user.Kabupaten_Kota || "",
      }

      const dateToCheck = checkDate ? new Date(checkDate) : new Date()
      const year = dateToCheck.getFullYear()
      const month = String(dateToCheck.getMonth() + 1).padStart(2, "0")

      const status = await firestoreService.getMonitoringLockStatus(wilayah, year, month)
      setLockStatus({ ...status, month, year })
    } catch (error) {
      console.error("[v0] Error checking lock status:", error)
      setLockStatus({ locked: false, date: null, month: null, year: null })
    } finally {
      setLoading(false)
    }
  }

  const checkLockForDate = async (dateString) => {
    try {
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : null

      if (!user) return { locked: false, date: null, month: null, year: null }

      const wilayah = {
        rt: user.rt || user.RT || "001",
        rw: user.rw || user.RW || "001",
        kelurahan: user.kelurahan || user.Kelurahan || "",
        kecamatan: user.kecamatan || user.Kecamatan || "",
        kabupaten_kota: user.kabupaten_kota || user.Kabupaten_Kota || "",
      }

      const dateToCheck = new Date(dateString)
      const year = dateToCheck.getFullYear()
      const month = String(dateToCheck.getMonth() + 1).padStart(2, "0")

      const status = await firestoreService.getMonitoringLockStatus(wilayah, year, month)
      return { ...status, month, year }
    } catch (error) {
      console.error("[v0] Error checking lock for date:", error)
      return { locked: false, date: null, month: null, year: null }
    }
  }

  return { lockStatus, loading, checkLockStatus, checkLockForDate }
}
