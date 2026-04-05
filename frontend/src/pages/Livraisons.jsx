import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Ban, AlertTriangle, Search,
         RefreshCw, TrendingDown } from 'lucide-react'
import { commandesApi } from '../services/api'

const TYPES_LIVRAISON = {
  standard:    'Standard',
  express:     'Express',
  jour_j:      'Jour J',
  nuit:        'Nuit',
  point_relai: 'Point relais',
}

const STATUT_CONFIG = {
  retournee: { label: 'Retournée', icon: RotateCcw, color: '#ef4444', bg: '#fef2f2', badge: 'badge-error' },
  annulee:   { label: 'Annulée',   icon: Ban,       color: '#6b7280', bg: '#f9fafb', badge: 'badge-error' },
}

// ── Carte incident ─────────────────────────────────────────────────────────────
function IncidentCard({ commande }) {
  const cfg  = STATUT_CONFIG[commande.statut]
  if (!cfg) return null
  const Icon = cfg.icon

  const dernierHistorique = commande.historique?.[commande.historique.length - 1]
  const age = Math.floor((new Date() - new Date(commande.created_at)) / (1000 * 60 * 60 * 24))

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color: cfg.color }} />
          </div>
          <div>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'rgba(30,77,123,0.07)', padding: '2px 8px', borderRadius: 5 }}>
              {commande.reference}
            </span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {new Date(commande.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <span className={`badge ${cfg.badge}`} style={{ fontSize: 11 }}>{cfg.label}</span>
      </div>

      {/* Destinataire + montant */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{commande.dest_nom} {commande.dest_prenom}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {commande.dest_gouvernorat} · {TYPES_LIVRAISON[commande.type_livraison] || commande.type_livraison}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 15 }}>
            {commande.montant_a_collecter} TND
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>non collecté</div>
        </div>
      </div>

      {/* Raison (dernier commentaire historique) */}
      {dernierHistorique?.commentaire && (
        <div style={{ padding: '8px 12px', background: cfg.bg, borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: cfg.color, marginBottom: 2 }}>Motif</div>
          <div style={{ color: 'var(--text)' }}>{dernierHistorique.commentaire}</div>
        </div>
      )}

      {/* Stats rapides */}
      <div style={{ display: 'flex', gap: 0, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        {[
          { label: 'colis',   value: commande.nombre_colis },
          { label: 'kg',      value: `${commande.poids_total}` },
          { label: `j depuis création`, value: `${age}` },
        ].map(({ label, value }, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{value}</div>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function Livraisons() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtre, setFiltre]       = useState('tous')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        commandesApi.list({ statut: 'retournee' }),
        commandesApi.list({ statut: 'annulee'   }),
      ])
      setCommandes([...(r1.data || []), ...(r2.data || [])])
    } catch {
      setCommandes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const retournees   = commandes.filter(c => c.statut === 'retournee')
  const annulees     = commandes.filter(c => c.statut === 'annulee')
  const montantPerdu = retournees.reduce((s, c) => s + parseFloat(c.montant_a_collecter || 0), 0)

  const filtered = commandes
    .filter(c => filtre === 'tous' || c.statut === filtre)
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.reference?.toLowerCase().includes(q) ||
        c.dest_nom?.toLowerCase().includes(q) ||
        c.dest_gouvernorat?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
          Retours &amp; Incidents
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Commandes retournées et annulées — montants non collectés
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Retournées',         value: retournees.length,             color: '#ef4444', bg: '#fef2f2', icon: RotateCcw },
          { label: 'Annulées',           value: annulees.length,               color: '#6b7280', bg: '#f9fafb', icon: Ban       },
          { label: 'Montant non collecté', value: `${montantPerdu.toFixed(3)} TND`, color: '#d97706', bg: '#fff7ed', icon: TrendingDown },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: label.includes('Montant') ? 18 : 26, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                {loading ? '—' : value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Référence, destinataire, gouvernorat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'tous',      label: `Tous (${commandes.length})`   },
            { key: 'retournee', label: `Retournées (${retournees.length})` },
            { key: 'annulee',   label: `Annulées (${annulees.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-sm ${filtre === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFiltre(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="empty-state"><p>Chargement...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle style={{ color: commandes.length === 0 ? '#16a34a' : 'var(--text-muted)' }} />
          <h3 style={{ color: commandes.length === 0 ? '#16a34a' : undefined }}>
            {commandes.length === 0 ? 'Aucun incident 🎉' : 'Aucun résultat'}
          </h3>
          <p>
            {commandes.length === 0
              ? 'Vous n\'avez aucune commande retournée ou annulée.'
              : 'Modifiez votre recherche ou filtre.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(c => <IncidentCard key={c.id} commande={c} />)}
        </div>
      )}

    </div>
  )
}