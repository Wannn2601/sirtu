import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  sidebarOpen: true,
  currentPage: "dashboard",
  notifications: [
    {
      id: 1,
      title: "Permohonan Surat Baru",
      message: "Warga mengajukan permohonan surat keterangan",
      type: "info",
      read: false,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      title: "Surat Disetujui",
      message: "Permohonan surat telah disetujui",
      type: "success",
      read: false,
      timestamp: new Date().toISOString(),
    },
  ],
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find((n) => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    addNotification: (state, action) => {
      const newId = Math.max(...state.notifications.map((n) => n.id)) + 1
      state.notifications.unshift({
        ...action.payload,
        id: newId,
        read: false,
        timestamp: new Date().toISOString(),
      })
    },
  },
})

export const { toggleSidebar, setCurrentPage, markNotificationAsRead, addNotification } = uiSlice.actions
export default uiSlice.reducer
