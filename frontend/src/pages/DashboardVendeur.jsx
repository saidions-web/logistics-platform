import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Package, Truck, CheckCircle, Clock,
  TrendingUp, ArrowUpRight, MoreHorizontal
} from 'lucide-react'
import { commandesApi } from '../services/api'
import NotificationBell from '../components/NotificationBell' // ✅ ajouté

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

export default function DashboardVendeur() {
  const { user } = useAuth()
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading]     = useState(true)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await commandesApi.list()
        setCommandes(res.data)
      } catch {
        setCommandes([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Stats calculées depuis les vraies données ──
  const total          = commandes.length
  const enTransit      = commandes.filter(c => c.statut === 'en_transit' || c.statut === 'prise_charge').length
  const livrees        = commandes.filter(c => c.statut === 'livree').length
  const enAttente      = commandes.filter(c => c.statut === 'en_attente').length
  const tauxLivraison  = total > 0 ? Math.round((livrees / total) * 100) : 0

  const stats = [
    { label: 'Total commandes', value: String(total),     change: `${enAttente} en attente`,       up: true,  color: '#1E4D7B', icon: Package     },
    { label: 'En transit',      value: String(enTransit), change: `sur ${total} commandes`,         up: null,  color: '#D97706', icon: Truck       },
    { label: 'Livrées',         value: String(livrees),   change: `Taux : ${tauxLivraison}%`,       up: true,  color: '#16A34A', icon: CheckCircle },
    { label: 'En attente',      value: String(enAttente), change: 'En attente de prise en charge',  up: null,  color: '#6B7A99', icon: Clock       },
  ]

  const recentes = commandes.slice(0, 5)

  return (
    <div className="animate-fade-up">

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{
              fontSize: 12, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '1px',
              fontWeight: 600, marginBottom: 6
            }}>
              {today}
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 30,
              fontWeight: 700, color: 'var(--navy-900)', letterSpacing: '-0.3px'
            }}>
              Bonjour, {user?.first_name || user?.nom || 'vous'} 👋
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 5 }}>
              Voici un aperçu de votre activité logistique
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            
            <a href="/colis" className="btn btn-primary btn-sm">
              <Package size={14} /> Nouvelle commande
            </a>
            {/* ✅ Cloche notifications ajoutée */}
            <NotificationBell />
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginTop: 24 }} />
      </div>

      {/* ─── Stats ─── */}
      <div className="stats-grid">
        {stats.map(({ label, value, change, up, color, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 14
            }}>
              <div className="stat-label">{label}</div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}14`, border: `1px solid ${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={17} style={{ color }} />
              </div>
            </div>
            <div className="stat-value" style={{ color }}>
              {loading ? '—' : value}
            </div>
            <div
              className={`stat-change ${up === true ? 'up' : up === false ? 'down' : ''}`}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {up !== null && (
                <ArrowUpRight size={12} style={{ transform: up ? 'none' : 'rotate(90deg)' }} />
              )}
              {change}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tableau commandes récentes ─── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 22
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 18,
              fontWeight: 700, color: 'var(--navy-900)'
            }}>
              Commandes récentes
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {loading
                ? 'Chargement...'
                : `${recentes.length} dernière${recentes.length > 1 ? 's' : ''} commande${recentes.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="/colis" className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Voir tout <ArrowUpRight size={13} />
            </a>
            <button className="btn btn-ghost btn-sm" style={{ padding: '7px 9px' }}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state"><p>Chargement des commandes...</p></div>
          ) : recentes.length === 0 ? (
            <div className="empty-state">
              <Package />
              <h3>Aucune commande</h3>
              <p>Créez votre première commande depuis la page Colis.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Destinataire</th>
                  <th>Gouvernorat</th>
                  <th>Colis</th>
                  <th>Montant</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
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
                    <td style={{ fontWeight: 500 }}>{c.dest_nom} {c.dest_prenom}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.dest_gouvernorat}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{c.nombre_colis}</td>
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

    </div>
  )
}