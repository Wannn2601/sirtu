import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import Dashboard from "./components/Dashboard"
import { AppProvider, useAppContext } from "./contexts/AppContext"

function AppContent() {
  const { state } = useAppContext()
  const { auth } = state

  console.log("[v0] AppContent - auth state:", auth)
  console.log("[v0] AppContent - isAuthenticated:", auth?.isAuthenticated)

  if (!auth?.isAuthenticated) {
    console.log("[v0] AppContent - Showing LoginPage")
    return <LoginPage />
  }

  console.log("[v0] AppContent - Showing Dashboard")
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  )
}

function App() {
  return (
    <div className="overflow-x-hidden max-w-screen">
      <Router>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </Router>
    </div>
  )
}

export default App
