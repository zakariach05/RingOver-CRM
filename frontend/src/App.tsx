import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { CallProvider } from './contexts/CallContext'
import { useAppBootstrap } from './hooks/useAppBootstrap'
import SplashScreen from './components/splash/SplashScreen'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TeamMembersPage from './pages/TeamMembersPage'
import DashboardPlaceholder from './pages/DashboardPlaceholder'
import ContactsListPage from './pages/ContactsListPage'
import ContactDetailPage from './pages/ContactDetailPage'
import DealsKanbanPage from './pages/DealsKanbanPage'
import DealDetailPage from './pages/DealDetailPage'
import DialerPage from './pages/DialerPage'
import CallHistoryPage from './pages/CallHistoryPage'
import MessagesPage from './pages/MessagesPage'

export default function App() {
  const { token } = useAuth()
  const { ready, error } = useAppBootstrap()

  return (
    <CallProvider>
      <SplashScreen visible={ready} error={error} />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={token ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPlaceholder /></Layout></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><Layout><TeamMembersPage /></Layout></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Layout><ContactsListPage /></Layout></ProtectedRoute>} />
        <Route path="/contacts/:id" element={<ProtectedRoute><Layout><ContactDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><Layout><DealsKanbanPage /></Layout></ProtectedRoute>} />
        <Route path="/deals/:id" element={<ProtectedRoute><Layout><DealDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/dialer" element={<ProtectedRoute><Layout><DialerPage /></Layout></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><Layout><CallHistoryPage /></Layout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Layout><MessagesPage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </CallProvider>
  )
}
