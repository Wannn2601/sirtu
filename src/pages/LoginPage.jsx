"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Shield, Upload } from "lucide-react";
import Swal from "sweetalert2";
import {
  useAppState,
  useAppDispatch,
  useAppContext,
} from "../contexts/AppContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const { user } = useAppState();
  const dispatch = useAppDispatch();
  const { loginWithFirebase, syncDummyDataToFirebase } = useAppContext();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await loginWithFirebase(
        formData.username,
        formData.password
      );

      // 🔹 Simpan user ke Context dan LocalStorage agar halaman lain bisa tahu siapa yang login
      dispatch({ type: "SET_USER", payload: userData });
      localStorage.setItem("app_user", JSON.stringify(userData));

      Swal.fire({
        icon: "success",
        title: "Login Berhasil!",
        text: `Selamat datang, ${userData.nama || userData.username}`,
        timer: 2000,
        showConfirmButton: false,
      });

      // 🔹 (Opsional) arahkan ke dashboard atau halaman utama
      window.location.href = "/dashboard";
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login Gagal!",
        text: error.message || "Username atau password salah",
      });
    }

    setLoading(false);
  };

  const handleSyncToFirebase = async () => {
    setSyncLoading(true);

    try {
      await syncDummyDataToFirebase();

      Swal.fire({
        icon: "success",
        title: "Sync Berhasil!",
        text: "Data users berhasil dikirim ke Firebase",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Sync Gagal!",
        text: error.message || "Terjadi kesalahan saat sync data ke Firebase",
      });
    }

    setSyncLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 overflow-hidden"
            >
              <img
                src={
                  localStorage.getItem("appLogo") ||
                  "/placeholder.svg?height=64&width=64&query=SIRTU logo"
                }
                alt="SIRTU Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full items-center justify-center hidden">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">SIRTU</h1>
            <p className="text-gray-600">Sistem Informasi RT Terpadu</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Masuk
                </>
              )}
            </motion.button>

            {/* Sync to Firebase Button */}
            {/* <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleSyncToFirebase}
              disabled={syncLoading || loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {syncLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Sync Data ke Firebase
                </>
              )}
            </motion.button> */}
          </form>

          {/* Demo Accounts */}
          {/* <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Superadmin: superadmin / admin123</div>
              <div>Pak RT: pakrt / pakrt123</div>
              <div>Ketua PKK: ketuapkk / ketuapkk123</div>
              <div>Bendahara: bendahara / bendahara123</div>
              <div>Pengurus: pengurus1 / pengurus123</div>
              <div>Warga: warga1 / warga123</div>
            </div>
          </div> */}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
