"use client"

import { useAppState } from "../contexts/AppContext"
import { Navigate } from "react-router-dom"

const ProtectedRoute = ({ children, requiredPermission, requiredLevel, fallbackPath = "/dashboard" }) => {
  const { state } = useAppState()
  const { auth } = state
  const { userLevel, userPermissions, isAuthenticated } = auth

  // If not authenticated, redirect to login (handled by App.jsx)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // If no specific permission required, allow access
  if (!requiredPermission && !requiredLevel) {
    return children
  }

  // Check level-based access
  if (requiredLevel) {
    const levelHierarchy = {
      superadmin: 7,
      "pak rt": 6,
      sekretaris: 5,
      bendahara: 4,
      "ketua pkk": 3,
      pengurus: 2,
      warga: 1,
    }

    const userLevelValue = levelHierarchy[userLevel] || 0
    const requiredLevelValue = levelHierarchy[requiredLevel] || 0

    if (userLevelValue < requiredLevelValue) {
      return <Navigate to={fallbackPath} replace />
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    const hasPermission = userPermissions[requiredPermission] === true

    if (!hasPermission) {
      return <Navigate to={fallbackPath} replace />
    }
  }

  return children
}

export default ProtectedRoute
