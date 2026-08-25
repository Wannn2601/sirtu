"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { firestoreService } from "../../services/firebase";
import Swal from "sweetalert2";

const months = [
  "01-Januari",
  "02-Februari",
  "03-Maret",
  "04-April",
  "05-Mei",
  "06-Juni",
  "07-Juli",
  "08-Agustus",
  "09-September",
  "10-Oktober",
  "11-November",
  "12-Desember",
];
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentYMKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

const toKey = (mmYYYY) => {
  if (!mmYYYY) return "";
  const [mm, yyyy] = mmYYYY.split(":");
  return `${yyyy}-${mm.padStart(2, "0")}`;
};
function getYearOptions(range = 7) {
  return Array.from({ length: range }, (_, i) => currentYear - i);
}

function parseStoredUser() {
  try {
    const raw =
      localStorage.getItem("user") || localStorage.getItem("currentUser");
    if (!raw) return null;
    if (raw.startsWith("{")) return JSON.parse(raw);
    return { id: raw };
  } catch {
    return null;
  }
}
function normalizeWilayah(user) {
  return {
    kab_kota: user?.kabupaten_kota || user?.kota || user?.kab_kota || "",
    kecamatan: user?.kecamatan || "",
    kelurahan: user?.kelurahan || user?.kel || "",
    rt: user?.RT || user?.rt || "",
    rw: user?.RW || user?.rw || "",
    role: user?.role || user?.level || user?.jabatan || "",
  };
}
function inferDefaultPembukuan(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("pkk")) return "PKK";
  if (r.includes("rt")) return "RT";
  return "RT";
}

async function checkRewardConflicts(
  startKey,
  endKey,
  pembukuan,
  excludeId = null
) {
  try {
    const rewardData = await firestoreService.getAll("rewardSadarIW");
    return rewardData.some((r) => {
      if (excludeId && r.id === excludeId) return false;
      if ((r.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      const rStart = toKey(r.start);
      const rEnd = toKey(r.end);
      return overlaps(startKey, endKey, rStart, rEnd);
    });
  } catch {
    return false;
  }
}

function overlaps(aStartKey, aEndKey, bStartKey, bEndKey) {
  if (!aStartKey || !aEndKey || !bStartKey || !bEndKey) return false;
  return !(aEndKey < bStartKey || aStartKey > bEndKey);
}

export default function KeringananIURPage() {
  // Filters
  const [tahun, setTahun] = useState(currentYear);
  const [pembukuan, setPembukuan] = useState("RT");
  const [bulanFilter, setBulanFilter] = useState("keseluruhan");
  const [view, setView] = useState(25);
  const [q, setQ] = useState("");

  // Data
  const [wilayah, setWilayah] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    pembukuan: "RT",
    date: new Date().toISOString().slice(0, 10),
    kepalaWarga: "",
    alamat: "",
    jenis: "KERINGANAN", // KERINGANAN | PEMBEBASAN | PENGHAPUSAN
    bentuk: "rupiah", // rupiah | persen (only for KERINGANAN)
    potongan: "", // rupiah
    persen: "", // percent
    start: "", // mm:yyyy
    end: "",
    docName: "",
    docDataUrl: "",
  });
  const [error, setError] = useState("");

  // Modules auto-register
  useEffect(() => {
    (async () => {
      try {
        const modules = await firestoreService.getAll("modules");
        const exists = modules?.some(
          (m) => m?.path === "/eoffice-pak-rt/keringanan-iur"
        );
        if (!exists) {
          await firestoreService.add("modules", {
            group: "eOFFICE Pak RT",
            name: "Keringanan IUR",
            path: "/eoffice-pak-rt/keringanan-iur",
          });
        }
      } catch {}
    })();
  }, []);

  // Load wilayah + defaults
  useEffect(() => {
    (async () => {
      try {
        const allUsers = await firestoreService.getAll("users");
        const stored = parseStoredUser();
        let me = null;
        if (stored?.id)
          me =
            allUsers.find((u) => u.id === stored.id || u.uid === stored.id) ||
            stored;
        else if (stored?.uid)
          me = allUsers.find((u) => u.uid === stored.uid) || stored;
        else
          me =
            allUsers.find((u) =>
              String(u.level || u.role || "")
                .toLowerCase()
                .includes("superadmin")
            ) || allUsers.find((u) => u.kelurahan && (u.rt || u.RT));
        const w = normalizeWilayah(me || {});
        setWilayah(w);
        const def = inferDefaultPembukuan(w.role);
        setPembukuan(def);
        setForm((f) => ({ ...f, pembukuan: def }));
      } catch (e) {
        console.log("[v0] wilayah load error:", e?.message);
      }
    })();
  }, []);

  // Load items
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await firestoreService.getAll("keringananIUR");
        const filtered = data
          .filter((r) => {
            const w = normalizeWilayah(r?.wilayah || r);
            const same =
              (w.kab_kota || "") === (wilayah.kab_kota || "") &&
              (w.kecamatan || "") === (wilayah.kecamatan || "") &&
              (w.kelurahan || "") === (wilayah.kelurahan || "") &&
              String(w.rt || "") === String(wilayah.rt || "") &&
              String(w.rw || "") === String(wilayah.rw || "");
            if (!same) return false;
            const y = (r?.date || "").slice(0, 4); // yyyy-mm-dd
            return String(y) === String(tahun);
          })
          .filter((r) =>
            pembukuan === "keseluruhan"
              ? true
              : (r?.pembukuan || "").toUpperCase() === pembukuan.toUpperCase()
          )
          .filter((r) => {
            if (bulanFilter === "keseluruhan") return true;
            const m = (r?.date || "").slice(5, 7);
            return m === bulanFilter;
          })
          .filter((r) => {
            if (!q) return true;
            const hay = `${r?.kepalaWarga || ""} ${r?.alamat || ""} ${
              r?.jenis || ""
            }`;
            return hay.toLowerCase().includes(q.toLowerCase());
          })
          .sort((a, b) => (a.date > b.date ? -1 : 1));
        setItems(filtered);
      } finally {
        setLoading(false);
      }
    })();
  }, [wilayah, tahun, pembukuan, bulanFilter, q]);

  const [wargaDataList, setWargaDataList] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const wargaList = await firestoreService.getAll("kkData");
        setWargaDataList(wargaList || []);
      } catch (e) {
        console.log("[v0] Error loading wargaData:", e?.message);
      }
    })();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({
      pembukuan,
      date: new Date().toISOString().slice(0, 10),
      kepalaWarga: "",
      alamat: "",
      jenis: "KERINGANAN",
      bentuk: "rupiah",
      potongan: "",
      persen: "",
      start: "",
      end: "",
      docName: "",
      docDataUrl: "",
    });
    setError("");
    setOpenModal(true);
  }
  function openEdit(row) {
    setEditId(row.id);
    setForm({
      pembukuan: row.pembukuan || pembukuan,
      date: row.date || new Date().toISOString().slice(0, 10),
      kepalaWarga: row.kepalaWarga || "",
      alamat: row.alamat || "",
      jenis: row.jenis || "KERINGANAN",
      bentuk: row.bentuk || "rupiah",
      potongan: row.potongan ? String(row.potongan) : "",
      persen: row.persen ? String(row.persen) : "",
      start: row.start || "",
      end: row.end || "",
      docName: row.docName || "",
      docDataUrl: row.docDataUrl || "",
    });
    setError("");
    setOpenModal(true);
  }

  async function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Dokumen harus PDF.");
      return;
    }
    if (f.size > 100 * 1024) {
      setError("Maksimal 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((s) => ({ ...s, docName: f.name, docDataUrl: reader.result }));
    reader.readAsDataURL(f);
  }

  const handleKepalaWargaChange = (e) => {
    const selectedName = e.target.value;
    setForm((s) => ({ ...s, kepalaWarga: selectedName }));

    // Find warga from kkData (not wargaDataList which might be different)
    const selectedWarga = wargaDataList.find(
      (w) => w.nama_kepala_keluarga === selectedName
    );
    if (selectedWarga) {
      const alamat =
        selectedWarga.alamat ||
        selectedWarga.alamat_tinggal ||
        selectedWarga.alamat_lain ||
        "";
      setForm((s) => ({ ...s, alamat }));
    }
  };

  function validateKeringanan(data) {
    const ymd = data.date; // yyyy-mm-dd format
    const yKey = ymd.slice(0, 7); // yyyy-mm

    if (data.jenis === "KERINGANAN") {
      if (!data.bentuk) return "Pilih bentuk keringanan.";
      if (data.bentuk === "rupiah" && !data.potongan)
        return "Isi nilai potongan rupiah.";
      if (data.bentuk === "persen" && !data.persen)
        return "Isi nilai prosentase.";
      // Periode bebas; validation of paid status happens elsewhere
    } else if (data.jenis === "PEMBEBASAN") {
      const startKey = toKey(data.start);
      if (startKey <= yKey)
        return "Bulan periode mulai tidak boleh kurang atau sama dengan bulan date dipilih.";
    } else if (data.jenis === "PENGHAPUSAN") {
      const startKey = toKey(data.start);
      const endKey = toKey(data.end);
      if (!startKey || !endKey) return "Isi periode mulai dan s.d.";
      if (endKey >= yKey)
        return "Bulan periode akhir tidak boleh sama atau lebih dari bulan date dipilih.";
    }
    return "";
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      potongan: form.potongan ? Number(form.potongan) : null,
      persen: form.persen ? Number(form.persen) : null,
      wilayah,
      updatedAt: Date.now(),
    };
    const err = validateKeringanan(payload);
    if (err) {
      Swal.fire({ icon: "error", title: "Validasi", text: err });
      setError(err);
      return;
    }

    if (form.start && form.end) {
      const hasRewardConflict = await checkRewardConflicts(
        toKey(form.start),
        toKey(form.end),
        form.pembukuan,
        editId
      );
      if (hasRewardConflict) {
        Swal.fire({
          icon: "warning",
          title: "Konflik Data",
          text: "Periode keringanan tabrakan dengan periode reward. Silakan pilih periode lain.",
        });
        return;
      }
    }

    if (editId) await firestoreService.update("keringananIUR", editId, payload);
    else
      await firestoreService.add("keringananIUR", {
        ...payload,
        createdAt: Date.now(),
      });
    setOpenModal(false);
    Swal.fire({
      icon: "success",
      title: "Tersimpan",
      timer: 1200,
      showConfirmButton: false,
    });
  }

  async function handleDelete(row) {
    if (row.hasPayment) return; // guarded
    const res = await Swal.fire({
      icon: "warning",
      title: "Hapus data keringanan?",
      text: "Tindakan ini tidak bisa dibatalkan.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });
    if (!res.isConfirmed) return;
    await firestoreService.delete("keringananIUR", row.id);
    Swal.fire({
      icon: "success",
      title: "Dihapus",
      timer: 1000,
      showConfirmButton: false,
    });
  }

  const [page, setPage] = useState(1);
  const paged = useMemo(() => {
    const start = (page - 1) * view;
    return items.slice(start, start + view);
  }, [items, page, view]);
  const pageCount = Math.max(1, Math.ceil(items.length / view));

  const headerWilayah = `Kab./Kota: ${wilayah.kab_kota || "-"}  Kecamatan: ${
    wilayah.kecamatan || "-"
  }  Kelurahan: ${wilayah.kelurahan || "-"}  RT: ${wilayah.rt || "-"}  RW: ${
    wilayah.rw || "-"
  }`;

  return (
    <main className="p-4 md:p-6 space-y-4 bg-gradient-to-br from-background to-amber-50/30 dark:to-amber-950/10 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg p-5 shadow-lg"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          e-OFFICE Pak RT - Keringanan IUR
        </h1>
        <p className="text-sm text-white/90">{headerWilayah}</p>
      </motion.div>

      <motion.section
        className="grid gap-3 md:grid-cols-4 items-end bg-white dark:bg-card rounded-lg border shadow-sm p-4"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col">
          <label className="text-sm mb-1 font-medium">Tahun Buku</label>
          <select
            className="border rounded px-2 py-2 bg-background shadow-sm focus:ring-2 focus:ring-amber-500 transition"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
          >
            {getYearOptions(7).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 font-medium">Iuran Wajib</label>
          <select
            className="border rounded px-2 py-2 bg-background shadow-sm focus:ring-2 focus:ring-amber-500 transition"
            value={pembukuan}
            onChange={(e) => setPembukuan(e.target.value)}
            disabled
          >
            <option value="RT">RT</option>
            <option value="PKK">PKK</option>
            <option value="keseluruhan">Keseluruhan</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 font-medium">Bulan Pembukuan</label>
          <select
            className="border rounded px-2 py-2 bg-background shadow-sm focus:ring-2 focus:ring-amber-500 transition"
            value={bulanFilter}
            onChange={(e) => setBulanFilter(e.target.value)}
          >
            <option value="keseluruhan">Keseluruhan</option>
            {Array.from({ length: 12 }, (_, i) =>
              String(i + 1).padStart(2, "0")
            ).map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium shadow-md hover:shadow-lg hover:from-amber-700 hover:to-orange-700 transition-all"
          >
            Buat
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm font-medium">View</label>
            <select
              className="border rounded px-2 py-2 bg-background shadow-sm focus:ring-2 focus:ring-amber-500 transition"
              value={view}
              onChange={(e) => setView(Number(e.target.value))}
            >
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <input
              className="border rounded px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-amber-500 transition"
              placeholder="Cari..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        className="overflow-x-auto border rounded-lg shadow-md bg-white dark:bg-card"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-amber-950">
            <tr className="text-left text-white">
              <th className="p-3 font-semibold">Tanggal</th>
              <th className="p-3 font-semibold">Kepala Warga</th>
              <th className="p-3 font-semibold">Alamat</th>
              <th className="p-3 font-semibold">Jenis Keringanan</th>
              <th className="p-3 font-semibold">Periode Keringanan</th>
              <th className="p-3 font-semibold">Iuran Wajib</th>
              <th className="p-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={7}>
                  Memuat...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={7}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">{row.kepalaWarga}</td>
                  <td className="p-3">{row.alamat}</td>
                  <td className="p-3">{row.jenis}</td>
                  <td className="p-3">
                    {row.start} - {row.end || "-"}
                  </td>
                  <td className="p-3">{row.pembukuan}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded border hover:bg-muted transition disabled:opacity-50"
                      onClick={() => openEdit(row)}
                      disabled={row.hasPayment}
                    >
                      edit
                    </button>
                    <button
                      className="px-3 py-1.5 rounded border hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                      onClick={() => handleDelete(row)}
                      disabled={row.hasPayment}
                    >
                      hapus
                    </button>
                    {row.docDataUrl ? (
                      <a
                        className="px-3 py-1.5 rounded border hover:bg-amber-50 hover:border-amber-300 transition"
                        href={row.docDataUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        view
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.section>

      <div className="flex items-center justify-center gap-2">
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage(1)}
          disabled={page === 1}
        >
          {"<<"}
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {"<"}
        </button>
        <span className="text-sm">
          Hal {page} / {pageCount}
        </span>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={page === pageCount}
        >
          {">"}
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage(pageCount)}
          disabled={page === pageCount}
        >
          {">>"}
        </button>
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-card rounded-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-bold text-lg text-foreground">
              BUAT / EDIT KERINGANAN IURAN WAJIB
            </h3>
            {error ? (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            ) : null}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Iuran Wajib
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.pembukuan}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, pembukuan: e.target.value }))
                    }
                    disabled
                  >
                    <option value="RT">RT</option>
                    <option value="PKK">PKK</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">Tanggal</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 bg-background"
                    value={form.date}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, date: e.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Wajib Iur – Kepala Warga{" "}
                    <span className="text-xs text-muted-foreground">
                      ({pembukuan === "PKK" ? "Ibu (PKK)" : "Bapak (RT)"})
                    </span>
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.kepalaWarga}
                    onChange={handleKepalaWargaChange}
                  >
                    <option value="">Pilih Kepala Keluarga</option>
                    {wargaDataList
                      .filter((w) => w.nama_kepala_keluarga)
                      .map((w) => (
                        <option key={w.id} value={w.nama_kepala_keluarga}>
                          {w.nama_kepala_keluarga}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">Alamat</label>
                  <input
                    className="border rounded px-2 py-1 bg-background"
                    placeholder="Alamat"
                    value={form.alamat}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, alamat: e.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Jenis Keringanan
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.jenis}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, jenis: e.target.value }))
                    }
                  >
                    <option value="KERINGANAN">KERINGANAN</option>
                    <option value="PEMBEBASAN">PEMBEBASAN</option>
                    <option value="PENGHAPUSAN">PENGHAPUSAN</option>
                  </select>
                </div>

                {form.jenis === "KERINGANAN" && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-sm mb-1 font-medium">
                        Bentuk Keringanan
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="bentuk"
                            checked={form.bentuk === "rupiah"}
                            onChange={() =>
                              setForm((s) => ({ ...s, bentuk: "rupiah" }))
                            }
                          />
                          <span>Potongan Rupiah</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="bentuk"
                            checked={form.bentuk === "persen"}
                            onChange={() =>
                              setForm((s) => ({ ...s, bentuk: "persen" }))
                            }
                          />
                          <span>Prosentase</span>
                        </label>
                      </div>
                    </div>
                    {form.bentuk === "rupiah" ? (
                      <div className="flex flex-col">
                        <label className="text-sm mb-1 font-medium">
                          Jumlah Potongan (Rp)
                        </label>
                        <input
                          className="border rounded px-2 py-1 bg-background"
                          value={form.potongan}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, potongan: e.target.value }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <label className="text-sm mb-1 font-medium">
                          Prosentase (%)
                        </label>
                        <input
                          className="border rounded px-2 py-1 bg-background"
                          value={form.persen}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, persen: e.target.value }))
                          }
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-col md:col-span-2">
                  <label className="text-sm mb-1 font-medium">
                    Mulai bulan
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.start}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, start: e.target.value }))
                    }
                  >
                    <option value="">Pilih</option>
                    {months.map((m) => {
                      const [mm, name] = m.split("-");
                      return (
                        <option key={m} value={`${mm}:${tahun}`}>
                          {name} {tahun}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">s.d. bulan</label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.end}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, end: e.target.value }))
                    }
                  >
                    <option value="">Pilih</option>
                    {months.map((m) => {
                      const [mm, name] = m.split("-");
                      return (
                        <option key={m} value={`${mm}:${tahun}`}>
                          {name} {tahun}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label className="text-sm mb-1 font-medium">
                    Unggah Dokumen/BA (PDF, max 100KB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={onUpload}
                  />
                  {form.docName ? (
                    <span className="text-xs text-muted-foreground mt-1">
                      {form.docName}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-foreground font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  onClick={() => setOpenModal(false)}
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium shadow-md hover:shadow-lg hover:from-amber-700 hover:to-orange-700 transition-all"
                >
                  SIMPAN
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
