import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  isAuthenticated: false,
  user: null,
  userLevel: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.userLevel = action.payload.userLevel
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.userLevel = null
    },
  },
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer
