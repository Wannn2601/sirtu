"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { firestoreService } from "../../services/firebase"

export default function JenisSuratTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [jenis, setJenis] = useState("")
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const data = await firestoreService.getAll("jenisSurat")
      const sorted = (data || []).sort((a, b) => (a.jenis || a.nama || "").localeCompare(b.jenis || b.nama || ""))
      setRows(sorted)
    } catch (e) {
      console.log("[v0] load jenisSurat error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let r = rows
    if (q) r = rows.filter((x) => (x.jenis || x.nama || "").toLowerCase().includes(q))
    return r
  }, [rows, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openAdd = () => {
    setEditing(null)
    setJenis("")
    setOpen(true)
  }
  const openEdit = (r) => {
    setEditing(r)
    setJenis(r.jenis || r.nama || "")
    setOpen(true)
  }
  const closeModal = () => setOpen(false)

  const onSave = async () => {
    if (!jenis.trim()) return
    try {
      if (editing) {
        await firestoreService.update("jenisSurat", editing.id, {
          jenis,
          nama: jenis, // keep both keys for compatibility
          updatedAt: new Date().toISOString(),
        })
      } else {
        await firestoreService.add("jenisSurat", {
          jenis,
          nama: jenis,
          createdAt: new Date().toISOString(),
        })
      }
      closeModal()
      load()
    } catch (e) {
      console.log("[v0] save jenisSurat error:", e)
    }
  }

  const onDelete = async (id) => {
    if (!confirm("Hapus jenis surat ini?")) return
    try {
      await firestoreService.delete("jenisSurat", id)
      load()
    } catch (e) {
      console.log("[v0] delete jenisSurat error:", e)
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 md:p-6"
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">JENIS SURAT</h1>
            <p className="text-sm text-muted-foreground">Kelola master jenis surat</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Cari jenis…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button onClick={openAdd} className="h-9 rounded-md bg-primary text-primary-foreground px-4">
              Tambah
            </button>
          </div>
        </header>

        <section className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Jenis Surat</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                      Memuat data…
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">{r.jenis || r.nama}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(r)} className="h-8 rounded-md border border-input px-3">
                            ubah
                          </button>
                          <button
                            onClick={() => onDelete(r.id)}
                            className="h-8 rounded-md bg-destructive text-destructive-foreground px-3"
                          >
                            hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-3 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">View</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Halaman {page} dari {Math.max(1, Math.ceil(filtered.length / pageSize))}
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 min-w-8 rounded border border-input text-xs px-2" onClick={() => setPage(1)}>
                {"<<"}
              </button>
              <button
                className="h-8 min-w-8 rounded border border-input text-xs px-2"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {"<"}
              </button>
              <button
                className="h-8 min-w-8 rounded border border-input text-xs px-2"
                onClick={() => setPage((p) => p + 1)}
              >
                {">"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg bg-card border border-border rounded-lg p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">{editing ? "UBAH JENIS SURAT" : "TAMBAH JENIS SURAT"}</h2>
              <div className="space-y-2">
                <label className="text-sm">JENIS SURAT</label>
                <input
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="cth: Surat Pengantar"
                  maxLength={50}
                />
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={closeModal} className="h-9 rounded-md bg-muted px-4">
                  BATAL
                </button>
                <button onClick={onSave} className="h-9 rounded-md bg-primary text-primary-foreground px-4">
                  SIMPAN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  )
}
