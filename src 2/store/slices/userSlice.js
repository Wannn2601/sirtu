import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  users: [
    {
      id: 1,
      username: "superadmin",
      password: "admin123",
      nama: "Super Administrator",
      level: "superadmin",
      status: "aktif",
    },
    {
      id: 2,
      username: "pakrt",
      password: "pakrt123",
      nama: "Pak RT",
      level: "pak rt",
      status: "aktif",
    },
    {
      id: 3,
      username: "ketuapkk",
      password: "ketuapkk123",
      nama: "Ketua PKK",
      level: "ketua pkk",
      status: "aktif",
    },
    {
      id: 4,
      username: "bendahara",
      password: "bendahara123",
      nama: "Bendahara RT",
      level: "bendahara",
      status: "aktif",
    },
    {
      id: 5,
      username: "pengurus1",
      password: "pengurus123",
      nama: "Pengurus RT 1",
      level: "pengurus",
      status: "aktif",
    },
    {
      id: 6,
      username: "warga1",
      password: "warga123",
      nama: "Warga 1",
      level: "warga",
      status: "aktif",
    },
  ],
  ageCategories: [
    { id: 1, kategori: "Balita", dari: 0, sampai: 5 },
    { id: 2, kategori: "Anak-anak", dari: 6, sampai: 12 },
    { id: 3, kategori: "Remaja", dari: 13, sampai: 17 },
    { id: 4, kategori: "Dewasa", dari: 18, sampai: 59 },
    { id: 5, kategori: "Lansia", dari: 60, sampai: 100 },
  ],
}

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    addAgeCategory: (state, action) => {
      const newId = Math.max(...state.ageCategories.map((c) => c.id)) + 1
      state.ageCategories.push({ ...action.payload, id: newId })
    },
    updateAgeCategory: (state, action) => {
      const index = state.ageCategories.findIndex((c) => c.id === action.payload.id)
      if (index !== -1) {
        state.ageCategories[index] = action.payload
      }
    },
    deleteAgeCategory: (state, action) => {
      state.ageCategories = state.ageCategories.filter((c) => c.id !== action.payload)
    },
  },
})

export const { addAgeCategory, updateAgeCategory, deleteAgeCategory } = userSlice.actions
export default userSlice.reducer
