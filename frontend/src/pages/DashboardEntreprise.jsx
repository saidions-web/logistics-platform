import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Package, Truck, CheckCircle, Clock,
  Users, TrendingUp, ArrowUpRight, MoreHorizontal
} from 'lucide-react'
import { entrepriseApi } from '../services/api'
import NotificationBell from '../components/NotificationBell'
import { Link } from 'react-router-dom'

const STATUT_BADGE = {
  en_attente:   'badge-warning',
  prise_charge: 'badge-info',
  en_transit:   'badge-info',
  livree:       'badge-success',
  retournee:    'badge-error',
  annulee:      'badge-error',
}

const STATUT_LABEL = {
  en_attente:   'En attente',
  prise_charge: 'Prise en charge',
  en_transit:   'En transit',
  livree:       'Livrée',
  retournee:    'Retournée',
  annulee:      'Annulée',
}

export default function DashboardEntreprise() {
  const { user } = useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await entrepriseApi.dashboard()
        setData(res.data)
      } catch (e) {
        console.error("Erreur dashboard:", e)
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpi      = data?.kpi || {}
  const recentes = data?.commandes_recentes || []

  const stats = [
    {
      label: 'Commandes reçues',
      value: String(kpi.total ?? 0),
      change: `${kpi.en_attente ?? 0} en attente`,
      up: true, color: '#1E4D7B', icon: Package,
    },
    {
      label: 'En transit',
      value: String(kpi.en_transit ?? 0),
      change: `sur ${kpi.total ?? 0} commandes`,
      up: null, color: '#D97706', icon: Truck,
    },
    {
      label: 'Livrées',
      value: String(kpi.livrees ?? 0),
      change: `Taux : ${kpi.taux_reussite ?? 0}%`,
      up: true, color: '#16A34A', icon: CheckCircle,
    },
    {
      label: 'En attente affectation',
      value: String(kpi.en_attente ?? 0),
      change: 'Sans livreur assigné',
      up: null, color: '#6B7A99', icon: Clock,
    },
    {
      label: 'Livreurs actifs',
      value: String(kpi.livreurs_actifs ?? 0),
      change: 'Disponibles',
      up: null, color: '#7C3AED', icon: Users,
    },
    {
      label: 'Taux de réussite',
      value: `${kpi.taux_reussite ?? 0}%`,
      change: 'Commandes livrées',
      up: (kpi.taux_reussite ?? 0) >= 80,
      color: '#0891B2', icon: TrendingUp,
    },
  ]

  return (
    <div className="animate-fade-up">

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
        }}>
          <div>
            <p style={{
              fontSize: 12, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '1px',
              fontWeight: 600, marginBottom: 6
            }}>
              {today}
            </p>
            <h2 style={{ fontSize: 30, fontWeight: 700 }}>
              Bonjour, {user?.first_name || 'vous'} 👋
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Tableau de bord — Entreprise
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm">
              <TrendingUp size={14} /> Rapport
            </button>
            {/* ✅ NotificationBell déjà présent, champ is_read corrigé côté composant */}
            <NotificationBell />
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginTop: 24 }} />
      </div>

      {/* ─── KPI ─── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {stats.map(({ label, value, change, up, color, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginBottom: 14
            }}>
              <div>{label}</div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={17} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {loading ? '—' : value}
            </div>
            <div style={{ fontSize: 12, marginTop: 5 }}>
              {change}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Table commandes récentes ─── */}
      <div className="card" style={{ marginTop: 30 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 22
        }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Commandes récentes</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {loading
                ? 'Chargement...'
                : `${recentes.length} dernière${recentes.length > 1 ? 's' : ''} commande${recentes.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/entreprise/commandes" className="btn btn-ghost btn-sm">
  Voir tout <ArrowUpRight size={13} />
</Link>
            <button className="btn btn-ghost btn-sm" style={{ padding: '7px 9px' }}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Chargement des commandes...</p></div>
        ) : recentes.length === 0 ? (
          <div className="empty-state">
            <Package />
            <h3>Aucune commande</h3>
            <p>Les commandes assignées à votre entreprise apparaîtront ici.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Réf</th>
                <th>Client</th>
                <th>Ville</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map(c => (
                <tr key={c.id}>
                  <td>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 13,
                      color: 'var(--accent)', fontWeight: 600,
                      background: 'rgba(30,77,123,0.07)',
                      padding: '3px 8px', borderRadius: 5
                    }}>
                      {c.reference}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.dest_nom}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.dest_gouvernorat}</td>
                  <td style={{ fontWeight: 600 }}>{c.montant_a_collecter} TND</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[c.statut] || 'badge-warning'}`}>
                      {STATUT_LABEL[c.statut] || c.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}