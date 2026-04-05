import { useAuth } from '../context/AuthContext'
import DashboardVendeur from './DashboardVendeur'
import DashboardEntreprise from './DashboardEntreprise'

export default function Dashboard() {
  const auth = useAuth()

  // 🔒 sécurité anti crash
  if (!auth) return null

  const { user } = auth

  if (!user) return null

  if (user.role === 'entreprise') return <DashboardEntreprise />
  return <DashboardVendeur />
}