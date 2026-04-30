import { Navigate } from "react-router-dom"
import { getStoredUser } from "../lib/auth"

interface Props {
  children: React.ReactNode
  allowedRoles?: ("admin" | "accountant" | "resident")[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const user = getStoredUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredUser()
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export function AccountantRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredUser()
  if (!user || user.role !== "accountant") {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
