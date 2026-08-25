"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { firestoreService } from "../../services/firebase";
import { useAuth } from "../../hooks/use-auth";

const ClientManagementPage = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nama_client: "",
    id_client: "",
    masa_berlaku: "",
    kontak: "",
    status: "aktif",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await firestoreService.getAll("clients");
      setClients(data || []);
    } catch (error) {
      console.error("[v0] Error loading clients:", error);
      Swal.fire("Error", "Gagal memuat data client", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      nama_client: "",
      id_client: "",
      masa_berlaku: "",
      kontak: "",
      status: "aktif",
    });
    setShowForm(true);
  };

  const handleEditClick = (client) => {
    setEditingId(client.id);
    setFormData({
      nama_client: client.nama_client,
      id_client: client.id_client,
      masa_berlaku: client.masa_berlaku,
      kontak: client.kontak,
      status: client.status || "aktif",
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (clientId, clientName) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus client "${clientName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await firestoreService.delete("clients", clientId);
        Swal.fire("Berhasil!", "Client telah dihapus.", "success");
        await loadClients();
      } catch (error) {
        console.error("[v0] Error deleting client:", error);
        Swal.fire("Error", "Gagal menghapus client", "error");
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.nama_client ||
      !formData.id_client ||
      !formData.masa_berlaku
    ) {
      Swal.fire("Validasi", "Semua field harus diisi", "warning");
      return;
    }

    try {
      if (editingId) {
        // Update existing client
        await firestoreService.update("clients", editingId, {
          ...formData,
          updatedAt: new Date(),
        });
        Swal.fire("Berhasil!", "Client berhasil diperbarui.", "success");
      } else {
        // Add new client
        await firestoreService.add("clients", {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        Swal.fire("Berhasil!", "Client baru berhasil ditambahkan.", "success");
      }

      setShowForm(false);
      await loadClients();
    } catch (error) {
      console.error("[v0] Error saving client:", error);
      Swal.fire("Error", "Gagal menyimpan client", "error");
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.nama_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.id_client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data client...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Client</h1>
          <p className="text-gray-600">Kelola data client dan masa berlaku</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Client
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? "Edit Client" : "Tambah Client Baru"}
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Client
                </label>
                <input
                  type="text"
                  name="nama_client"
                  value={formData.nama_client}
                  onChange={handleFormChange}
                  placeholder="Masukkan nama client"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Client
                </label>
                <input
                  type="text"
                  name="id_client"
                  value={formData.id_client}
                  onChange={handleFormChange}
                  placeholder="Masukkan ID client"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Masa Berlaku
                </label>
                <input
                  type="date"
                  name="masa_berlaku"
                  value={formData.masa_berlaku}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kontak
                </label>
                <input
                  type="text"
                  name="kontak"
                  value={formData.kontak}
                  onChange={handleFormChange}
                  placeholder="Masukkan nomor/email kontak"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Non-Aktif</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Client
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nama atau ID client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Masa Berlaku
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClients.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Tidak ada data client
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                      {client.nama_client}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {client.id_client}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(client.masa_berlaku).toLocaleDateString(
                        "id-ID"
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {client.kontak}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          client.status === "aktif"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {client.status === "aktif" ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEditClick(client)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteClick(client.id, client.nama_client)
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientManagementPage;
