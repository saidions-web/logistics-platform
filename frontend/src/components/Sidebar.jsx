import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, Users, Settings,
  LogOut, MapPin, ClipboardList, Route, DollarSign, RotateCcw,
  Menu, X
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import { BarChart2 } from 'lucide-react'

const navVendeur = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord'    },
  { to: '/colis',      icon: Package,         label: 'Mes commandes'      },
  { to: '/livraisons', icon: RotateCcw,       label: 'Retours'            },
  { to: '/tracking',   icon: MapPin,          label: 'Suivi en temps réel'},
]

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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [])

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const initials = user
    ? `${user.nom?.[0] || user.first_name?.[0] || '?'}`.toUpperCase()
    : '?'

  const navItems = user?.role === 'entreprise' ? navEntreprise : navVendeur

  const sidebarContent = (
    <>
      <div className="sidebar-logo">
        <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <img
      src="/logoo.png"
      alt="Logo"
      style={{
        width: 56,
        height: 56,
        objectFit: 'contain',
      }}
    />

    <h1
      style={{
        margin: 0,
        fontSize: 30,
        fontWeight: 700,
        color: '#fff',
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.5px',
      }}
    >
      Logi<span style={{ color: '#C9A84C' }}>Sync</span>
    </h1>
  </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="mobile-only"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <p ><center>{user?.role === 'entreprise' ? 'Espace entreprise' : 'Gestion livraisons'}</center></p>
      </div>

      <nav className="nav-section">
        <div className="nav-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
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
              onClick={() => setMobileOpen(false)}
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
    </>
  )

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <span className="mobile-topbar-logo">Logi<span>Sync</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell />
        </div>
      </div>

      {/* ── Overlay (mobile) ── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        {sidebarContent}
      </aside>
    </>
  )
}