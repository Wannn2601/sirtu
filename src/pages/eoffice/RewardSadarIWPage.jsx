"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { firestoreService } from "../../services/firebase";
import Swal from "sweetalert2";

// Helpers
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

function getMonthYearOptions(centerYear, range = 1) {
  const years = [];
  for (let y = centerYear - range; y <= centerYear + range; y++) {
    years.push(y);
  }

  const list = [];
  years.forEach((yr) => {
    months.forEach((m) => {
      const [mm, name] = m.split("-");

      list.push({
        value: `${mm}:${yr}`, // contoh "01:2024"
        label: `${name} ${yr}`, // contoh "Januari 2024"
        year: yr,
        mm: mm,
      });
    });
  });

  return list;
}

const toKey = (mmYYYY) => {
  if (!mmYYYY) return "";
  const [mm, yyyy] = mmYYYY.split(":");
  return `${yyyy}-${mm.padStart(2, "0")}`;
};
const fromKey = (yyyyDashMM) => {
  if (!yyyyDashMM) return "";
  const [yyyy, mm] = yyyyDashMM.split("-");
  return `${mm}:${yyyy}`;
};
const now = new Date();
const currentYear = now.getFullYear();
const currentYMKey = `${currentYear}-${String(now.getMonth() + 1).padStart(
  2,
  "0"
)}`;

function getYearOptions(past = 5, future = 3) {
  const years = [];
  for (let y = currentYear - past; y <= currentYear + future; y++) {
    years.push(y);
  }
  return years;
}

function parseStoredUser() {
  try {
    const raw =
      localStorage.getItem("user") || localStorage.getItem("currentUser");
    if (!raw) return null;
    // may be id string or JSON
    if (raw.startsWith("{")) {
      const obj = JSON.parse(raw);
      return obj;
    }
    return { id: raw };
  } catch {
    return null;
  }
}

function normalizeWilayah(user) {
  if (!user) return {};
  return {
    kab_kota: user.kabupaten_kota || user.kota || user.kab_kota || "",
    kecamatan: user.kecamatan || "",
    kelurahan: user.kelurahan || user.kel || "",
    rt: user.RT || user.rt || "",
    rw: user.RW || user.rw || "",
    role: user.role || user.level || user.jabatan || "",
  };
}

function inferDefaultPembukuan(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("pkk")) return "PKK";
  if (r.includes("rt")) return "RT";
  return "RT"; // default
}

function overlaps(aStartKey, aEndKey, bStartKey, bEndKey) {
  if (!aStartKey || !aEndKey || !bStartKey || !bEndKey) return false;
  return !(aEndKey < bStartKey || aStartKey > bEndKey);
}

async function checkKeringananConflicts(
  startKey,
  endKey,
  pembukuan,
  excludeId = null
) {
  try {
    const keringananData = await firestoreService.getAll("keringananIUR");
    return keringananData.some((k) => {
      if (excludeId && k.id === excludeId) return false;
      if ((k.pembukuan || "").toUpperCase() !== pembukuan.toUpperCase())
        return false;
      const kStart = toKey(k.start);
      const kEnd = toKey(k.end);
      return overlaps(startKey, endKey, kStart, kEnd);
    });
  } catch {
    return false;
  }
}

export default function RewardSadarIWPage() {
  // Filters
  const [tahun, setTahun] = useState(currentYear);
  const [pembukuan, setPembukuan] = useState("RT");
  const [bulanFilter, setBulanFilter] = useState("keseluruhan");
  const [view, setView] = useState(25);
  const [q, setQ] = useState("");

  // Data
  const [users, setUsers] = useState([]);
  const [wilayah, setWilayah] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    pembukuan: "RT",
    start: "", // mm:yyyy
    end: "",
    frequency: "6", // 6 or 12
    bebasBulan: "1", // 1 or 2
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
          (m) => m?.path === "/eoffice-pak-rt/reward-sadar-iw"
        );
        if (!exists) {
          await firestoreService.add("modules", {
            group: "eOFFICE Pak RT",
            name: "Reward Sadar IW",
            path: "/eoffice-pak-rt/reward-sadar-iw",
          });
        }
      } catch {}
    })();
  }, []);

  // Load users + wilayah + defaults
  useEffect(() => {
    (async () => {
      try {
        const allUsers = await firestoreService.getAll("users");
        setUsers(allUsers);
        const stored = parseStoredUser();
        let me = null;
        if (stored?.id) {
          me =
            allUsers.find((u) => u.id === stored.id || u.uid === stored.id) ||
            stored;
        } else if (stored?.uid) {
          me = allUsers.find((u) => u.uid === stored.uid) || stored;
        } else {
          // fallback: a user carrying wilayah or superadmin
          me =
            allUsers.find((u) =>
              String(u.level || u.role || "")
                .toLowerCase()
                .includes("superadmin")
            ) || allUsers.find((u) => u.kelurahan && (u.rt || u.RT));
        }
        const w = normalizeWilayah(me || {});
        setWilayah(w);
        const def = inferDefaultPembukuan(w.role);
        setPembukuan(def);
        setForm((f) => ({ ...f, pembukuan: def }));
      } catch (e) {
        console.log("[v0] users load error:", e?.message);
      }
    })();
  }, []);

  // Load rewards
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await firestoreService.getAll("rewardSadarIW");
        // Scope by wilayah + tahun (by period)
        const filtered = data
          .filter((r) => {
            const rw = normalizeWilayah(r?.wilayah || r);
            const sameWil =
              (rw.kab_kota || "") === (wilayah.kab_kota || "") &&
              (rw.kecamatan || "") === (wilayah.kecamatan || "") &&
              (rw.kelurahan || "") === (wilayah.kelurahan || "") &&
              String(rw.rt || "") === String(wilayah.rt || "") &&
              String(rw.rw || "") === String(wilayah.rw || "");
            if (!sameWil) return false;
            const sk = toKey(r?.start);
            const ek = toKey(r?.end);
            if (!sk || !ek) return false;
            const yearIn =
              sk.startsWith(String(tahun)) || ek.startsWith(String(tahun));
            return yearIn;
          })
          .filter((r) =>
            pembukuan === "keseluruhan"
              ? true
              : (r?.pembukuan || "").toUpperCase() === pembukuan.toUpperCase()
          )
          .filter((r) => {
            if (bulanFilter === "keseluruhan") return true;
            const mKey = `${tahun}-${bulanFilter.padStart(2, "0")}`;
            const sk = toKey(r?.start);
            const ek = toKey(r?.end);
            return sk && ek && sk <= mKey && mKey <= ek;
          })
          .filter((r) => {
            if (!q) return true;
            const hay = `${r?.pembukuan || ""} ${r?.start || ""} ${
              r?.end || ""
            } ${r?.bebasBulan || ""}`;
            return hay.toLowerCase().includes(q.toLowerCase());
          })
          .sort((a, b) => (toKey(a.start) > toKey(b.start) ? -1 : 1));
        setItems(filtered);
      } finally {
        setLoading(false);
      }
    })();
  }, [wilayah, tahun, pembukuan, bulanFilter, q]);

  const canDelete = (row) => {
    const sk = toKey(row.start);
    const ek = toKey(row.end);
    return !(sk && ek && sk <= currentYMKey && currentYMKey <= ek);
  };

  function openCreate() {
    setEditId(null);
    setForm({
      pembukuan,
      start: "",
      end: "",
      frequency: "6",
      bebasBulan: "1",
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
      start: row.start || "",
      end: row.end || "",
      frequency: String(row.frequency || "6"),
      bebasBulan: String(row.bebasBulan || "1"),
      docName: row.docName || "",
      docDataUrl: row.docDataUrl || "",
    });
    setError("");
    setOpenModal(true);
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Dokumen harus PDF.");
      return;
    }
    if (file.size > 100 * 1024) {
      setError("Maksimal ukuran 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, docName: file.name, docDataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  const validateReward = (data, existing, isEdit) => {
    const sk = toKey(data.start);
    const ek = toKey(data.end);
    if (!sk || !ek) return "Pilih masa pembayaran (mulai/s.d.).";
    if (!(ek > sk && ek > currentYMKey))
      return "Bulan s.d. harus lebih besar dari bulan mulai dan bulan berjalan.";
    if (isEdit && toKey(form.start) === currentYMKey && sk !== currentYMKey) {
      return "Mulai bulan tidak bisa diubah jika sama dengan bulan berjalan.";
    }
    const overl = existing.some((r) => {
      if (isEdit && r.id === editId) return false;
      if (
        (r.pembukuan || "").toUpperCase() !==
        (data.pembukuan || "").toUpperCase()
      )
        return false;
      return overlaps(sk, ek, toKey(r.start), toKey(r.end));
    });
    if (overl) return "Tanggal dipilih tabrakan dengan program reward lain.";
    return "";
  };

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      pembukuan: form.pembukuan,
      start: form.start,
      end: form.end,
      frequency: Number(form.frequency),
      bebasBulan: Number(form.bebasBulan),
      docName: form.docName,
      docDataUrl: form.docDataUrl,
      wilayah: wilayah,
      updatedAt: Date.now(),
    };
    const err = validateReward(payload, items, !!editId);
    if (err) {
      Swal.fire({ icon: "error", title: "Validasi", text: err });
      setError(err);
      return;
    }

    const hasKeringananConflict = await checkKeringananConflicts(
      toKey(form.start),
      toKey(form.end),
      form.pembukuan,
      editId
    );
    if (hasKeringananConflict) {
      Swal.fire({
        icon: "warning",
        title: "Konflik Data",
        text: "Periode reward tabrakan dengan periode keringanan. Silakan pilih periode lain.",
      });
      return;
    }

    if (editId) {
      await firestoreService.update("rewardSadarIW", editId, payload);
    } else {
      await firestoreService.add("rewardSadarIW", {
        ...payload,
        createdAt: Date.now(),
      });
    }
    setOpenModal(false);
    Swal.fire({
      icon: "success",
      title: "Tersimpan",
      timer: 1200,
      showConfirmButton: false,
    });
  }

  async function handleDelete(row) {
    if (!canDelete(row)) return;
    const res = await Swal.fire({
      icon: "warning",
      title: "Hapus reward?",
      text: "Tindakan ini tidak bisa dibatalkan.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });
    if (!res.isConfirmed) return;
    await firestoreService.delete("rewardSadarIW", row.id);
    Swal.fire({
      icon: "success",
      title: "Dihapus",
      timer: 1000,
      showConfirmButton: false,
    });
  }

  // Pagination
  const [page, setPage] = useState(1);
  const paged = useMemo(() => {
    const startIdx = (page - 1) * view;
    return items.slice(startIdx, startIdx + view);
  }, [items, page, view]);
  const pageCount = Math.max(1, Math.ceil(items.length / view));

  const headerWilayah = `Kab./Kota: ${wilayah.kab_kota || "-"}  Kecamatan: ${
    wilayah.kecamatan || "-"
  }  Kelurahan: ${wilayah.kelurahan || "-"}  RT: ${wilayah.rt || "-"}  RW: ${
    wilayah.rw || "-"
  }`;

  return (
    <main className="p-4 md:p-6 space-y-4 bg-gradient-to-br from-background to-blue-50/30 dark:to-blue-950/10 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-5 shadow-lg"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          e-OFFICE Pak RT - Reward Sadar IW
        </h1>
        <p className="text-sm text-white/90">{headerWilayah}</p>
      </motion.div>

      <motion.section
        className="flex flex-wrap items-end justify-between gap-4 bg-white dark:bg-card rounded-lg border shadow-sm p-4"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Bagian kiri: filter utama */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Tahun Buku */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 font-medium">Tahun Buku</label>
            <select
              className="border rounded px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-blue-500 transition"
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

          {/* Iuran Wajib */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 font-medium">Iuran Wajib</label>
            <select
              className="border rounded px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-blue-500 transition"
              value={pembukuan}
              onChange={(e) => setPembukuan(e.target.value)}
              disabled
            >
              <option value="RT">RT</option>
              <option value="PKK">PKK</option>
              <option value="keseluruhan">Keseluruhan</option>
            </select>
          </div>

          {/* Bulan Pembukuan */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 font-medium">Bulan Pembukuan</label>
            <select
              className="border rounded px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-blue-500 transition"
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
        </div>

        {/* Bagian kanan: tombol dan pencarian */}
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Buat
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View</label>
            <select
              className="border rounded px-2 py-2 bg-background shadow-sm focus:ring-2 focus:ring-blue-500 transition"
              value={view}
              onChange={(e) => setView(Number(e.target.value))}
            >
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>

          <input
            className="border rounded px-3 py-2 bg-background shadow-sm focus:ring-2 focus:ring-blue-500 transition w-40 sm:w-56"
            placeholder="Cari..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </motion.section>

      <motion.section
        className="overflow-x-auto border rounded-lg shadow-md bg-white dark:bg-card"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <tr className="text-left text-white">
              <th className="p-3 font-semibold">Masa Pembayaran - Awal</th>
              <th className="p-3 font-semibold">Masa Pembayaran - Akhir</th>
              <th className="p-3 font-semibold">Pembayaran</th>
              <th className="p-3 font-semibold">Reward Warga</th>
              <th className="p-3 font-semibold">Iuran Wajib</th>
              <th className="p-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  Memuat...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">{row.start}</td>
                  <td className="p-3">{row.end}</td>
                  <td className="p-3">
                    {row.frequency === 6
                      ? "Semesteran (6 bulan)"
                      : "Tahunan (12 bulan)"}
                  </td>
                  <td className="p-3">pembebasan {row.bebasBulan} bulan</td>
                  <td className="p-3">{row.pembukuan}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded border hover:bg-muted transition"
                      onClick={() => openEdit(row)}
                    >
                      edit
                    </button>
                    <button
                      className="px-3 py-1.5 rounded border hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                      disabled={!canDelete(row)}
                      onClick={() => handleDelete(row)}
                    >
                      hapus
                    </button>
                    {row.docDataUrl ? (
                      <a
                        className="px-3 py-1.5 rounded border bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition"
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
              BUAT / EDIT REWARD WARGA SADAR IURAN WAJIB
            </h3>

            {/* Business rules helper */}
            <div className="rounded-md border border-blue-100 bg-blue-50 text-blue-800 p-3 text-xs leading-relaxed">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Tanggal tidak boleh tabrakan dengan program reward lain untuk
                  Iuran Wajib yang sama.
                </li>
                <li>
                  Edit hanya untuk perubahan bulan. Mulai bulan tidak bisa
                  diubah jika sama dengan bulan berjalan.
                </li>
                <li>
                  Bulan s.d. harus lebih besar dari bulan mulai dan dari bulan
                  berjalan.
                </li>
                <li>
                  Pembayaran: Semesteran (6 bulan) atau Tahunan (12 bulan).
                  Pembebasan Iuran: 1 atau 2 bulan.
                </li>
                <li>Perubahan bulan tidak mempengaruhi ketetapan iur bebas.</li>
                <li>Dokumen PDF opsional, maksimal 100KB.</li>
                <li>
                  Periode reward tidak boleh tabrakan dengan periode keringanan.
                </li>
              </ul>
            </div>

            {error ? (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            ) : null}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Iuran Wajib (Locked) */}
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Iuran Wajib
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-gray-100 text-gray-700"
                    value={form.pembukuan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pembukuan: e.target.value }))
                    }
                    disabled
                  >
                    <option value="RT">RT</option>
                    <option value="PKK">PKK</option>
                  </select>
                  <span className="text-[11px] text-gray-500 mt-1">
                    LOCK sesuai login (Ketua RT/PKK)
                  </span>
                </div>

                {/* Pembayaran */}
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">Pembayaran</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="frequency"
                        checked={form.frequency === "6"}
                        onChange={() =>
                          setForm((f) => ({ ...f, frequency: "6" }))
                        }
                      />
                      <span>Semesteran (6 bulan)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="frequency"
                        checked={form.frequency === "12"}
                        onChange={() =>
                          setForm((f) => ({ ...f, frequency: "12" }))
                        }
                      />
                      <span>Tahunan (12 bulan)</span>
                    </label>
                  </div>
                </div>

                {/* Mulai Bulan */}
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Mulai bulan
                  </label>
                  <select
                    className="border rounded px-2 py-1 bg-background disabled:bg-gray-100 disabled:text-gray-500"
                    value={form.start}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start: e.target.value }))
                    }
                    disabled={
                      Boolean(editId) && toKey(form.start) === currentYMKey
                    }
                  >
                    <option value="">Pilih</option>

                    {getMonthYearOptions(tahun, 1).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {Boolean(editId) && toKey(form.start) === currentYMKey ? (
                    <span className="text-[11px] text-amber-600 mt-1">
                      Mulai bulan terkunci karena sama dengan bulan berjalan.
                    </span>
                  ) : null}
                </div>

                {/* s.d. Bulan */}
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">s.d. bulan</label>
                  <select
                    className="border rounded px-2 py-1 bg-background"
                    value={form.end}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end: e.target.value }))
                    }
                  >
                    <option value="">Pilih</option>

                    {getMonthYearOptions(tahun, 1).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pembebasan Iuran */}
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">
                    Pembebasan Iuran
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bebas"
                        checked={form.bebasBulan === "1"}
                        onChange={() =>
                          setForm((f) => ({ ...f, bebasBulan: "1" }))
                        }
                      />
                      <span>1 Bulan</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bebas"
                        checked={form.bebasBulan === "2"}
                        onChange={() =>
                          setForm((f) => ({ ...f, bebasBulan: "2" }))
                        }
                      />
                      <span>2 Bulan</span>
                    </label>
                  </div>
                </div>

                {/* Dokumen */}
                <div className="flex flex-col">
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
                      📎 {form.docName}
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
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
