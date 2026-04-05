import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'

// Auth
import Login          from './pages/Login'
import Register       from './pages/Register'
import VerifyEmail    from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import Suivi          from './pages/Suivi'

// Commun
import Dashboard  from './pages/Dashboard'
import Parametres from './pages/Parametres'

// Vendeur
import Colis         from './pages/Colis'
import RetourVendeur from './pages/RetourVendeur'
import Tracking      from './pages/Tracking'

// Entreprise
import CommandesEntreprise from './pages/entreprise/CommandesEntreprise'
import LivreursEntreprise  from './pages/entreprise/LivreursEntreprise'
import TourneesEntreprise  from './pages/entreprise/TourneesEntreprise'
import SuiviGPS            from './pages/entreprise/SuiviGPS'
import Tarifs              from './pages/entreprise/Tarifs'


// ─────────────────────────────
// 🔐 ROUTE PROTÉGÉE
// ─────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}


// ─────────────────────────────
// 🔒 ROUTE PAR ROLE
// ─────────────────────────────
function RoleRoute({ role, children }) {
  const { user } = useAuth()

  if (!user) return null
  if (user.role !== role) return <Navigate to="/dashboard" replace />

  return children
}


// ─────────────────────────────
// 📦 LAYOUT (SIDEBAR + PAGES)
// ─────────────────────────────
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Routes>

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Vendeur */}
          <Route path="/colis"
            element={<RoleRoute role="vendeur"><Colis /></RoleRoute>}
          />
          <Route path="/livraisons"
            element={<RoleRoute role="vendeur"><RetourVendeur /></RoleRoute>}
          />
          <Route path="/tracking"
            element={<RoleRoute role="vendeur"><Tracking /></RoleRoute>}
          />

          {/* Entreprise */}
          <Route path="/entreprise/tarifs"
            element={<RoleRoute role="entreprise"><Tarifs /></RoleRoute>}
          />
          <Route path="/entreprise/commandes"
            element={<RoleRoute role="entreprise"><CommandesEntreprise /></RoleRoute>}
          />
          <Route path="/entreprise/livreurs"
            element={<RoleRoute role="entreprise"><LivreursEntreprise /></RoleRoute>}
          />
          <Route path="/entreprise/tournees"
            element={<RoleRoute role="entreprise"><TourneesEntreprise /></RoleRoute>}
          />
          <Route path="/entreprise/suivi"
            element={<RoleRoute role="entreprise"><SuiviGPS /></RoleRoute>}
          />

          {/* Commun */}
          <Route path="/parametres" element={<Parametres />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </main>
    </div>
  )
}


// ─────────────────────────────
// 🌍 ROUTES PRINCIPALES
// ─────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    )
  }

  return (
    <Routes>

      {/* Auth */}
      <Route path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/suivi" element={<Suivi />} />

      {/* App */}
      <Route path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />

    </Routes>
  )
}


// ─────────────────────────────
// 🚀 APP ROOT
// ─────────────────────────────
export default function App() {
  return <AppRoutes />
}