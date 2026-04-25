import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, Users, Settings,
  LogOut, MapPin, ClipboardList, Route, DollarSign, RotateCcw
} from 'lucide-react'
import NotificationBell from './NotificationBell'

// ── Menu Vendeur ───────────────────────────────────────────────────────────
const navVendeur = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord'    },
  { to: '/colis',      icon: Package,         label: 'Mes commandes'      },
  { to: '/livraisons', icon: RotateCcw,       label: 'Retours'            },
  { to: '/tracking',   icon: MapPin,          label: 'Suivi en temps réel'},
]

// ── Menu Entreprise ────────────────────────────────────────────────────────
const navEntreprise = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Tableau de bord'  },
  { to: '/entreprise/tarifs',    icon: DollarSign,      label: 'Tarifs'           },
  { to: '/entreprise/commandes', icon: ClipboardList,   label: 'Commandes reçues' },
  { to: '/entreprise/livreurs',  icon: Users,           label: 'Mes livreurs'     },
  { to: '/entreprise/tournees',  icon: Route,           label: 'Tournées'         },
  { to: '/entreprise/suivi',     icon: MapPin,          label: 'Suivi GPS'        },
]

const bottomNav = [
  { to: '/parametres', icon: Settings, label: 'Paramètres' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user
    ? `${user.nom?.[0] || user.first_name?.[0] || '?'}`.toUpperCase()
    : '?'

  const navItems = user?.role === 'entreprise' ? navEntreprise : navVendeur

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Logi<span>Sync</span></h1>
        <p>{user?.role === 'entreprise' ? 'Espace entreprise' : 'Gestion livraisons'}</p>
      </div>

      <nav className="nav-section">
        <div className="nav-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>

      

      <div className="sidebar-footer">
        <nav className="nav-section" style={{ marginTop: 'auto' }}>
        {bottomNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
        <div className="user-chip" onClick={handleLogout} title="Se déconnecter">
          <div className="user-avatar">{initials}</div>
          <div className="user-info" style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.nom || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email}
            </p>
            <span>{user?.role}</span>
          </div>
          <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  )
}