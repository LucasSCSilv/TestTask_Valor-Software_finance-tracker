import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Income from './pages/Income'
import Budget from './pages/Budget'
import Categories from './pages/Categories'
import Layout from './components/Layout'

// Reports is loaded remotely from finance-tracker-reports via Module Federation.
// Zephyr resolves the URL automatically at runtime.
const RemoteReports = lazy(() => import('finance_tracker_reports/Reports'))

function ReportsWrapper() {
  const { user } = useAuth()
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RemoteReports userId={user?.id} />
    </Suspense>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function Private({ children }) {
  return <PrivateRoute><Layout>{children}</Layout></PrivateRoute>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/transactions" element={<Private><Transactions /></Private>} />
      <Route path="/income" element={<Private><Income /></Private>} />
      <Route path="/reports" element={<Private><ReportsWrapper /></Private>} />
      <Route path="/budget" element={<Private><Budget /></Private>} />
      <Route path="/categories" element={<Private><Categories /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}