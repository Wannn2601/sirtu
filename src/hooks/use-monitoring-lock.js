"use client"

import { useEffect, useState } from "react"
import firestoreService from "../services/firebase"

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getStoredUserId() {
  const idKeys = ["userId", "user_id", "uid", "currentUserId", "loggedUserId"]
  for (const key of idKeys) {
    const v = localStorage.getItem(key)
    if (v && v !== "[object Object]") return String(v)
  }
  const jsonKeys = ["user", "authUser", "loggedInUser", "currentUser"]
  for (const key of jsonKeys) {
    const raw = localStorage.getItem(key)
    const obj = safeParse(raw || "")
    const candidate = obj?.id ?? obj?.uid ?? obj?._id ?? obj?.userId ?? obj?.user?.uid ?? null
    if (candidate) return String(candidate)
  }
  return null
}

function normalizeWilayah(userDoc) {
  const get = (...keys) => {
    for (const k of keys) {
      if (userDoc?.[k] !== undefined && userDoc?.[k] !== null && String(userDoc?.[k]).trim() !== "")
        return String(userDoc[k])
    }
    return ""
  }
  return {
    rt: get("rt", "RT", "rt_client", "RT_client"),
    rw: get("rw", "RW", "rw_client", "RW_client"),
    kelurahan: get("kelurahan", "Kelurahan", "kel_client", "kelurahan_client"),
    kecamatan: get("kecamatan", "Kecamatan", "kecamatan_client"),
    kabupaten_kota: get("kabupaten_kota", "kab_kota", "kota", "Kota", "kota_client"),
  }
}

export function useMonitoringLock(year, month) {
  const [lockStatus, setLockStatus] = useState({ locked: false, date: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkLock() {
      try {
        setLoading(true)
        const storedId = getStoredUserId()
        let user = null

        if (storedId) {
          user = await firestoreService.getById("users", storedId)
        }

        if (!user) {
          const allUsers = await firestoreService.getAll("users")
          user =
            allUsers.find((x) =>
              String(x?.level || x?.role || "")
                .toLowerCase()
                .includes("superadmin"),
            ) || allUsers[0]
        }

        if (user && year && month) {
          const wilayah = normalizeWilayah(user)
          const status = await firestoreService.getMonitoringLockStatus(wilayah, year, month)
          if (!cancelled) setLockStatus(status)
        }
      } catch (e) {
        console.log("[v0] Error checking lock:", e?.message)
        if (!cancelled) setLockStatus({ locked: false, date: null })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkLock()
    return () => {
      cancelled = true
    }
  }, [year, month])

  return { ...lockStatus, loading }
}
