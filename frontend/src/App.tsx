import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import { ProtectedRoute, AdminRoute, AccountantRoute } from "./lib/ProtectedRoute"
import DashboardLayout from "./layouts/DashboardLayout"
import ResidentLayout from "./layouts/ResidentLayout"
import AccountantLayout from "./layouts/AccountantLayout"
import LoginPage from "./pages/LoginPage"
import { Toaster } from "sonner"

// Admin Pages
import DashboardPage from "./pages/DashboardPage"
import ApartmentsPage from "./pages/ApartmentsPage"
import ResidentsPage from "./pages/ResidentsPage"
import VehiclesPage from "./pages/VehiclesPage"
import TicketsPage from "./pages/TicketsPage"
import NotificationsPage from "./pages/NotificationsPage"
import AuditLogsPage from "./pages/AuditLogsPage"

// Accountant Pages
import AccountantDashboardPage from "./pages/accountant/AccountantDashboardPage"
import FeeRatesPage from "./pages/accountant/FeeRatesPage"
import InvoicesPage from "./pages/accountant/InvoicesPage"

// Resident Pages
import FeedPage from "./pages/resident/FeedPage"
import ResidentTicketsPage from "./pages/resident/ResidentTicketsPage"
import ProfilePage from "./pages/resident/ProfilePage"
import FeesPage from "./pages/resident/FeesPage"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Route */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="apartments" element={<ApartmentsPage />} />
          <Route path="residents" element={<ResidentsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>

        {/* Resident Route */}
        <Route
          path="/resident"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="tickets" element={<ResidentTicketsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="fees" element={<FeesPage />} />
        </Route>

        {/* Accountant Route */}
        <Route
          path="/accountant"
          element={
            <AccountantRoute>
              <AccountantLayout />
            </AccountantRoute>
          }
        >
          <Route index element={<AccountantDashboardPage />} />
          <Route path="fee-rates" element={<FeeRatesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
        </Route>

        {/* Default -> Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </Router>
  )
}

export default App
