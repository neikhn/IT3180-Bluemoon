import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ResidentLayout from './layouts/ResidentLayout';
import LoginPage from './pages/LoginPage';

// Admin Pages
import DashboardPage from './pages/DashboardPage';
import ApartmentsPage from './pages/ApartmentsPage';
import ResidentsPage from './pages/ResidentsPage';
import VehiclesPage from './pages/VehiclesPage';
import TicketsPage from './pages/TicketsPage';
import NotificationsPage from './pages/NotificationsPage';

// Resident Pages
import FeedPage from './pages/resident/FeedPage';
import ResidentTicketsPage from './pages/resident/ResidentTicketsPage';
import ProfilePage from './pages/resident/ProfilePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Router */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="apartments" element={<ApartmentsPage />} />
          <Route path="residents" element={<ResidentsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Resident Router */}
        <Route path="/resident" element={<ResidentLayout />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="tickets" element={<ResidentTicketsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Default -> Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
