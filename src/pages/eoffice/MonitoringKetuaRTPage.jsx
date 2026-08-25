"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import firestoreService from "../../services/firebase"

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getStoredUserId() {
  // direct id keys
  const idKeys = ["userId", "user_id", "uid", "currentUserId", "loggedUserId"]
  for (const key of idKeys) {
    const v = localStorage.getItem(key)
    if (v && v !== "[object Object]") return String(v)
  }
  // json blobs
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
  const rt = get("rt", "RT", "rt_client", "RT_client")
  const rw = get("rw", "RW", "rw_client", "RW_client")
  const kelurahan = get("kelurahan", "Kelurahan", "kel_client", "kelurahan_client")
  const kecamatan = get("kecamatan", "Kecamatan", "kecamatan_client")
  const kabupaten_kota = get("kabupaten_kota", "kab_kota", "kota", "Kota", "kota_client")
  const displayKota = kabupaten_kota
  return { rt, rw, kelurahan, kecamatan, kabupaten_kota: displayKota }
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

function pad2(n) {
  return String(n).padStart(2, "0")
}

function makeDocId(w, year) {
  // deterministic doc id for wilayah + year
  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
  return `rt${slug(w.rt)}-rw${slug(w.rw)}-kel${slug(w.kelurahan)}-kec${slug(w.kecamatan)}-kot${slug(w.kabupaten_kota)}-${year}`
}

function defaultMonths() {
  const obj = {}
  for (let i = 1; i <= 12; i++) obj[pad2(i)] = { locked: false, date: null }
  return obj
}

async function ensureModuleRegistered() {
  try {
    const modules = await firestoreService.getModules()
    const exists = modules?.some((m) => m?.path === "/eoffice/monitoring-rt")
    if (!exists) {
      await firestoreService.addModule({
        title: "Monitoring Ketua RT",
        group: "eoffice-rt",
        path: "/eoffice/monitoring-rt",
        id_menu: "52",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log("[v0] Module Monitoring Ketua RT registered")
    }
  } catch (e) {
    console.log("[v0] Skipped module auto-register:", e?.message || e)
  }
}

export default function MonitoringKetuaRTPage() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [wilayah, setWilayah] = useState({ rt: "", rw: "", kelurahan: "", kecamatan: "", kabupaten_kota: "" })
  const [months, setMonths] = useState(defaultMonths())
  const [docId, setDocId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadUserAndWilayah() {
      try {
        setLoading(true)
        setError(null)

        // ensure modules entry
        ensureModuleRegistered()

        let u = null
        const storedId = getStoredUserId()
        if (storedId) {
          u = await firestoreService.getById("users", storedId)
        }

        // fallback: pick superadmin, then first user with wilayah, then first user
        if (!u) {
          const allUsers = await firestoreService.getAll("users")
          u =
            allUsers.find((x) =>
              String(x?.level || x?.role || "")
                .toLowerCase()
                .includes("superadmin"),
            ) ||
            allUsers.find((x) => x?.rt || x?.RT || x?.kelurahan || x?.Kelurahan) ||
            allUsers[0] ||
            null
        }

        const w = normalizeWilayah(u || {})
        if (!cancelled) {
          setUser(u)
          setWilayah(w)
          const newDocId = makeDocId(w, year)
          setDocId(newDocId)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Gagal memuat user/wilayah")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadUserAndWilayah()
    return () => {
      cancelled = true
    }
  }, [year])

  useEffect(() => {
    const cancelled = false
    async function loadMonitoring() {
      if (!docId) return
      try {
        setLoading(true)
        const doc = await firestoreService.getById("monitoringRT", docId)
        if (!cancelled) {
          if (doc && doc.months) {
            setMonths({ ...defaultMonths(), ...doc.months })
          } else {
            // create default doc
            const data = {
              year,
              wilayah,
              months: defaultMonths(),
            }
            await firestoreService.set("monitoringRT", docId, data)
            setMonths(defaultMonths())
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Gagal memuat data monitoring")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadMonitoring()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  const yearsOptions = useMemo(() => {
    const now = currentYear
    const start = now - 6
    const arr = []
    for (let y = now; y >= start; y--) arr.push(y)
    return arr
  }, [currentYear])

  async function toggleMonth(mm) {
    try {
      const prev = months[mm] || { locked: false, date: null }
      const nextLocked = !prev.locked
      const nextDate = nextLocked ? new Date().toISOString() : prev.date // keep last ON date
      const nextMonths = { ...months, [mm]: { locked: nextLocked, date: nextDate } }
      setMonths(nextMonths)
      await firestoreService.update("monitoringRT", docId, { months: nextMonths, updatedAt: new Date() })
    } catch (e) {
      setError(e?.message || "Gagal menyimpan perubahan")
    }
  }

  const disabledFutureYear = (y) => y > currentYear

  return (
  <motion.main
    className="flex flex-col min-h-0 h-auto bg-background"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <motion.section
      className="space-y-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-none p-5 shadow-md"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold">eOFFICE Pak RT - Monitoring</h1>
      <p className="text-sm text-white/90">
        {"MONITORING KETUA RT"} • {"Kab./Kota"}: {wilayah.kabupaten_kota || "-"} • {"Kecamatan"}:{" "}
        {wilayah.kecamatan || "-"} • {"Kelurahan"}: {wilayah.kelurahan || "-"} • {"RT"}: {wilayah.rt || "-"} • {"RW"}:{" "}
        {wilayah.rw || "-"}
      </p>
    </motion.section>

    <motion.section
      className="bg-white dark:bg-card border-t border-border p-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Tahun Pembukuan</label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 transition"
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value)
              if (y > currentYear) return
              setYear(y)
            }}
          >
            {yearsOptions.map((y) => (
              <option key={y} value={y} disabled={y > currentYear}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground italic">
            {"default tahun berjalan, tidak bisa memilih tahun > tahun berjalan"}
          </span>
        </div>
      </div>
    </motion.section>

    <section className="flex flex-col lg:flex-row gap-6 p-4">
      <motion.div
        className="flex-1"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-white dark:bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold text-foreground">#</th>
                <th className="px-3 py-3 font-semibold text-foreground">Bulan Pembukuan</th>
                <th className="px-3 py-3 font-semibold text-foreground">Lock Pembukuan Keuangan</th>
                <th className="px-3 py-3 font-semibold text-foreground">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((name, i) => {
                const mm = pad2(i + 1)
                const state = months[mm] || { locked: false, date: null }
                return (
                  <motion.tr
                    key={mm}
                    className="border-t hover:bg-muted/30 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.02 * i }}
                  >
                    <td className="px-3 py-3 font-medium">{i + 1}</td>
                    <td className="px-3 py-3">{name}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        aria-pressed={state.locked}
                        onClick={() => toggleMonth(mm)}
                        className={[
                          "inline-flex h-7 w-12 items-center rounded-full transition-all shadow-sm",
                          state.locked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-300 hover:bg-gray-400",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                            state.locked ? "translate-x-5" : "translate-x-0.5",
                          ].join(" ")}
                        />
                      </button>
                      <span className="ml-2 text-xs align-middle font-medium">{state.locked ? "ON" : "OFF"}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {state.date ? new Date(state.date).toLocaleDateString() : "-"}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.aside
        className="w-full lg:w-1/3"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="rounded-lg border border-border shadow-sm bg-white dark:bg-card p-5 space-y-3">
          <h3 className="font-semibold text-lg text-foreground">Informasi</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>Default awal adalah OFF.</li>
            <li>Jika ON, maka:</li>
            <li className="ml-4">• Tidak bisa menghapus data transaksi keuangan.</li>
            <li className="ml-4">• Tidak bisa entry pengeluaran atau mutasi keuangan.</li>
            <li className="ml-4">• Pembelian aset dari kas keuangan pada bulan ON tidak bisa.</li>
            <li className="ml-4">• Masih bisa menambah/entry debet/pemasukan.</li>
            <li>Jika OFF, maka berlaku normal.</li>
            <li>Date adalah tanggal saat terakhir kali status ON.</li>
          </ul>
        </div>
      </motion.aside>
    </section>
  </motion.main>
)

}
