import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TeamMembersPage from './pages/TeamMembersPage'
import DashboardPlaceholder from './pages/DashboardPlaceholder'
import ContactsListPage from './pages/ContactsListPage'
import ContactDetailPage from './pages/ContactDetailPage'

function DashboardRouter() {
  return (
    <Layout>
      <DashboardPlaceholder />
    </Layout>
  )
}

function TeamRouter() {
  return (
    <Layout>
      <TeamMembersPage />
    </Layout>
  )
}

function ContactsRouter({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      {children}
    </Layout>
  )
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamRouter /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><ContactsRouter><ContactsListPage /></ContactsRouter></ProtectedRoute>} />
      <Route path="/contacts/:id" element={<ProtectedRoute><ContactsRouter><ContactDetailPage /></ContactsRouter></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
