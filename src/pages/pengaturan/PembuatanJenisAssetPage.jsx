"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";

import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";

const PembuatanJenisAssetPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterPencatatan, setFilterPencatatan] = useState("keseluruhan");
  const [filterPembukuan, setFilterPembukuan] = useState("RT");

  const [formData, setFormData] = useState({
    id_jenis_aset: "",
    kelompok: "",
    jenis: "",
    uraian: "",
    pencatatan: "",
    satuan: "",
    status: "aktif",
    locked: false, // ✅ tambahkan ini
  });

  const [data, setData] = useState([]);
  const [kelompokOptions, setKelompokOptions] = useState([]);
  const [satuanOptions, setSatuanOptions] = useState([]);

  // Ambil data jenis aset
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jenisAssets"), (snap) => {
      const items = snap.docs.map((d, i) => ({
        firebaseId: d.id,
        id: i + 1,
        ...d.data(),
      }));
      setData(items);
    });
    return () => unsub();
  }, []);

  // Ambil data kelompok & satuan
  useEffect(() => {
    const unsubKelompok = onSnapshot(
      collection(db, "kelompokAssets"),
      (snapshot) => {
        setKelompokOptions(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              kode: data.kode?.toString() || "",
              uraian: data.uraian || "",
              jenis: data.jenis || null, // tambahkan jika nanti digunakan
            };
          })
        );
      }
    );

    const unsubSatuan = onSnapshot(
      collection(db, "satuanAssets"),
      (snapshot) => {
        setSatuanOptions(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              nama: data.kelompok || "", // Biarkan nama dari field 'kelompok'
              keterangan: data.keterangan || "",
            };
          })
        );
      }
    );

    return () => {
      unsubKelompok();
      unsubSatuan();
    };
  }, []);

  // Generate ID jenis aset
  const generateIdJenisAset = (kodeKelompok) => {
    const existingIds = data
      .filter((item) => item.id_jenis_aset?.startsWith(`${kodeKelompok}.`))
      .map((item) => Number.parseInt(item.id_jenis_aset.split(".")[1], 10))
      .sort((a, b) => b - a);

    const nextNumber = existingIds.length > 0 ? existingIds[0] + 1 : 1;
    return `${kodeKelompok}.${nextNumber.toString().padStart(3, "0")}`;
  };

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        if (
          filterPencatatan !== "keseluruhan" &&
          item.jenis?.toLowerCase().trim() !==
            filterPencatatan.toLowerCase().trim()
        ) {
          return false;
        }
        if (
          filterPembukuan !== "keseluruhan" &&
          item.pencatatan?.toLowerCase().trim() !==
            filterPembukuan.toLowerCase().trim()
        ) {
          return false;
        }
        return true;
      })

      .filter(
        (item) =>
          item.uraian?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.jenis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.satuan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [data, filterPencatatan, filterPembukuan, searchTerm]);

  const handleJenisChange = (e) => {
    if (formData.locked) return; // ✅ hanya stop kalau memang locked

    const newJenis = e.target.value;

    setFormData({
      ...formData,
      jenis: newJenis,
      kelompokId: "",
      kelompok: "",
      kodeKelompok: "",
      id_jenis_aset: "",
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) {
      // ✅ default urut A-Z berdasarkan id_jenis_aset
      return [...filteredData].sort((a, b) =>
        a.id_jenis_aset.localeCompare(b.id_jenis_aset)
      );
    }
    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const handleAdd = () => {
    setEditMode(false);
    setCurrentItem(null);
    setFormData({
      id_jenis_aset: "",
      kelompok: "",
      jenis: "", // ✅ diperbaiki
      uraian: "",
      pencatatan: "",
      satuan: "",
      status: "aktif",
      locked: false,
    });

    setShowModal(true);
  };

  const handleEdit = (item) => {
    // if (item.locked) {
    //   Swal.fire(
    //     "Warning!",
    //     "Pencatatan & Jenis tidak dapat diubah karena sudah digunakan!",
    //     "warning"
    //   );
    // }

    setEditMode(true);
    setCurrentItem(item);

    const kelompok = kelompokOptions.find((k) => k.uraian === item.kelompok);

    setFormData({
      id_jenis_aset: item.id_jenis_aset,
      kelompokId: kelompok ? kelompok.id : "",
      kelompok: item.kelompok,
      kodeKelompok: kelompok ? kelompok.kode : "",
      jenis: item.jenis,
      uraian: item.uraian,
      pencatatan: item.pencatatan,
      satuan: item.satuan,
      status: item.status,
      locked: item.locked ?? false, // ✅ tambahkan ini
    });

    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (item.locked) {
      Swal.fire(
        "Warning!",
        "Data sudah digunakan dan tidak bisa dihapus!",
        "warning"
      );
      return;
    }
    Swal.fire({
      title: "Hapus Data?",
      text: `Apakah Anda yakin ingin menghapus "${item.jenis_aset}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const docRef = doc(db, "jenisAssets", item.firebaseId);
          await deleteDoc(docRef);
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data berhasil dihapus!",
            timer: 3000,
            showConfirmButton: false,
          });
        } catch (err) {
          Swal.fire("Error!", err.message, "error");
        }
      }
    });
  };

  const handleKelompokChange = (id) => {
    const kelompok = kelompokOptions.find((k) => k.id === id);

    if (kelompok && !editMode) {
      const newId = generateIdJenisAset(kelompok.kode);
      setFormData({
        ...formData,
        kelompokId: id,
        kelompok: kelompok.uraian,
        kodeKelompok: kelompok.kode,
        id_jenis_aset: newId,
      });
    } else {
      setFormData({
        ...formData,
        kelompokId: id,
        kelompok: kelompok ? kelompok.uraian : "",
        kodeKelompok: kelompok ? kelompok.kode : "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.kelompok || !formData.uraian || !formData.satuan) {
      Swal.fire("Error!", "Semua field harus diisi!", "error");
      return;
    }

    try {
      if (editMode && currentItem) {
        const docRef = doc(db, "jenisAssets", currentItem.firebaseId);
        await updateDoc(docRef, formData);

        if (formData.jenis !== currentItem.jenis) {
          const assetRecordsRef = collection(db, "assetRecords");
          const assetRecordsSnap = await getDocs(assetRecordsRef);

          const batch = writeBatch(db);
          assetRecordsSnap.docs.forEach((recordDoc) => {
            if (recordDoc.data().jenis_aset === currentItem.jenis) {
              batch.update(recordDoc.ref, {
                jenis_aset: formData.jenis,
                uraian: formData.uraian || recordDoc.data().uraian,
              });
            }
          });
          await batch.commit();
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data berhasil diubah!",
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        await addDoc(collection(db, "jenisAssets"), formData);
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data berhasil ditambahkan!",
          timer: 3000,
          showConfirmButton: false,
        });
      }
      setShowModal(false);
    } catch (err) {
      Swal.fire("Error!", err.message, "error");
    }
  };

  const handleSeedData = async () => {
    const dummyData = [
      {
        id_jenis_aset: "1.001",
        kelompok: "Elektronik",
        jenis_aset: "Laptop",
        satuan: "Unit",
        status: "aktif",
      },
      {
        id_jenis_aset: "1.002",
        kelompok: "Elektronik",
        jenis_aset: "Printer",
        satuan: "Unit",
        status: "aktif",
      },
      {
        id_jenis_aset: "2.001",
        kelompok: "Furniture",
        jenis_aset: "Meja Kerja",
        satuan: "Unit",
        status: "tidak aktif",
      },
    ];
    try {
      for (const item of dummyData) {
        await addDoc(collection(db, "jenisAssets"), item);
      }
      Swal.fire(
        "Berhasil!",
        "3 data dummy berhasil dikirim ke Firebase!",
        "success"
      );
    } catch (err) {
      Swal.fire("Error!", err.message, "error");
    }
  };

  const filteredKelompokOptions = useMemo(() => {
    if (!formData.jenis) return [];

    return kelompokOptions.filter(
      (k) =>
        (k.jenis || "").toLowerCase().trim() ===
        formData.jenis.toLowerCase().trim()
    );
  }, [kelompokOptions, formData.jenis]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pembuatan Jenis Asset
                </h1>
                <p className="text-gray-600 mt-1">Kelola data jenis asset</p>
              </div>
              {/* FILTER */}
              <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-4">
                <div>
                  <label className="text-sm font-semibold">Pencatatan</label>
                  <select
                    value={filterPencatatan}
                    onChange={(e) => setFilterPencatatan(e.target.value)}
                    className="ml-2 px-3 py-2 border rounded"
                  >
                    <option value="keseluruhan">Keseluruhan</option>
                    <option value="BHP">BHP</option>
                    <option value="Aset">Aset</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Pembukuan</label>
                  <select
                    value={filterPembukuan}
                    onChange={(e) => setFilterPembukuan(e.target.value)}
                    className="ml-2 px-3 py-2 border rounded"
                  >
                    <option value="RT">RT</option>
                    <option value="PKK">PKK</option>
                    <option value="keseluruhan">Keseluruhan</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Data
                </button>
                {/* <button
                  onClick={handleSeedData}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seed Data
                </button> */}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Uraian Jenis
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Satuan
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Jenis
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Pencatatan
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.firebaseId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">{item.uraian}</td>
                    <td className="px-4 py-2">{item.satuan}</td>
                    <td className="px-4 py-2">{item.jenis}</td>
                    <td className="px-4 py-2">{item.pencatatan}</td>
                    <td className="px-4 py-2 flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-lg shadow-xl w-full max-w-md"
                >
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">
                      {editMode ? "Edit Data" : "Tambah Data"}
                    </h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Pencatatan */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Pencatatan *
                      </label>
                      <div className="flex gap-6">
                        <label>
                          <input
                            type="radio"
                            value="RT"
                            checked={formData.pencatatan === "RT"}
                            disabled={formData.locked === true}
                            onChange={(e) =>
                              !formData.locked &&
                              setFormData({
                                ...formData,
                                pencatatan: e.target.value,
                              })
                            }
                          />{" "}
                          RT
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="PKK"
                            checked={formData.pencatatan === "PKK"}
                            disabled={formData.locked === true}
                            onChange={(e) =>
                              !formData.locked &&
                              setFormData({
                                ...formData,
                                pencatatan: e.target.value,
                              })
                            }
                          />{" "}
                          PKK
                        </label>
                      </div>
                    </div>

                    {/* Jenis Aset */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Jenis Aset *
                      </label>
                      <div className="flex gap-6">
                        <label>
                          <input
                            type="radio"
                            value="BHP"
                            checked={formData.jenis === "BHP"}
                            disabled={formData.locked === true}
                            onChange={handleJenisChange}
                          />{" "}
                          BHP
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="ASET"
                            checked={formData.jenis === "ASET"}
                            disabled={formData.locked === true}
                            onChange={handleJenisChange}
                          />{" "}
                          ASET
                        </label>
                      </div>
                    </div>

                    {/* Kelompok */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Kelompok *
                      </label>
                      <select
                        // disabled={editMode && formData.locked}
                        value={formData.kelompokId || ""}
                        onChange={(e) => handleKelompokChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Pilih Kelompok</option>
                        {filteredKelompokOptions.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.uraian}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Uraian */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Uraian Jenis *
                      </label>
                      <input
                        className="w-full px-3 py-2 border rounded"
                        value={formData.uraian}
                        // disabled={editMode && formData.locked}
                        onChange={(e) =>
                          setFormData({ ...formData, uraian: e.target.value })
                        }
                      />
                    </div>

                    {/* Satuan */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Satuan *
                      </label>
                      <select
                        // disabled={editMode && formData.locked}
                        className="w-full px-3 py-2 border rounded"
                        value={formData.satuan}
                        onChange={(e) =>
                          setFormData({ ...formData, satuan: e.target.value })
                        }
                      >
                        <option value="">Pilih Satuan</option>
                        {satuanOptions.map((s) => (
                          <option key={s.id} value={s.nama}>
                            {s.nama}{" "}
                            {/* atau `${s.nama} (${s.keterangan})` bila ingin tampil lengkap */}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block font-semibold mb-1">
                        Status *
                      </label>
                      <div className="flex gap-6">
                        <label>
                          <input
                            type="radio"
                            value="aktif"
                            checked={formData.status === "aktif"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value,
                              })
                            }
                          />{" "}
                          Aktif
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="tidak aktif"
                            checked={formData.status === "tidak aktif"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value,
                              })
                            }
                          />{" "}
                          Tidak Aktif
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 border rounded py-2"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 text-white rounded py-2"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PembuatanJenisAssetPage;
