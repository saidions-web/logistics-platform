import { useState } from 'react'
import { Search, Package, CheckCircle, Truck, Clock, XCircle, RotateCcw, AlertCircle } from 'lucide-react'
import { commandesApi } from '../services/api'

const STATUT_CONFIG = {
  en_attente:   { label: 'En attente',       icon: Clock,       color: '#D97706', bg: '#fef3c7' },
  prise_charge: { label: 'Prise en charge',  icon: Package,     color: '#3b82f6', bg: '#eff6ff' },
  en_transit:   { label: 'En transit',       icon: Truck,       color: '#8b5cf6', bg: '#f5f3ff' },
  livree:       { label: 'Livrée',           icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
  retournee:    { label: 'Retournée',        icon: RotateCcw,   color: '#ef4444', bg: '#fef2f2' },
  annulee:      { label: 'Annulée',          icon: XCircle,     color: '#6b7280', bg: '#f9fafb' },
}

const ETAPES = ['en_attente', 'prise_charge', 'en_transit', 'livree']

export default function Suivi() {
  const [reference, setReference] = useState('')
  const [commande, setCommande]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!reference.trim()) return
    setLoading(true)
    setError('')
    setCommande(null)
    try {
      const res = await commandesApi.suivi(reference.trim().toUpperCase())
      setCommande(res.data)
    } catch {
      setError('Aucune commande trouvée avec cette référence.')
    } finally {
      setLoading(false)
    }
  }

  const cfg = commande ? (STATUT_CONFIG[commande.statut] || STATUT_CONFIG.en_attente) : null
  const etapeIndex = commande ? ETAPES.indexOf(commande.statut) : -1

  return (
    <div style={st.page}>

      {/* ── En-tête ── */}
      <div style={st.header}>
        <div style={st.logo}>📦</div>
        <h1 style={st.title}>Suivi de commande</h1>
        <p style={st.subtitle}>Entrez votre référence pour suivre votre livraison</p>
      </div>

      {/* ── Formulaire recherche ── */}
      <div style={st.card}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              style={st.input}
              placeholder="Ex : CMD-A1B2C3D4"
              value={reference}
              onChange={e => setReference(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" style={st.btn} disabled={loading}>
            {loading ? 'Recherche...' : 'Suivre'}
          </button>
        </form>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 14 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {/* ── Résultat ── */}
      {commande && cfg && (
        <div style={st.card}>

          {/* Statut principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '16px 20px', background: cfg.bg, borderRadius: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: cfg.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <cfg.icon size={26} style={{ color: cfg.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Référence</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#111', marginBottom: 4 }}>
                {commande.reference}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
            </div>
          </div>

          {/* Barre de progression (seulement pour statuts normaux) */}
          {!['annulee', 'retournee'].includes(commande.statut) && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 8 }}>
                {/* Ligne de fond */}
                <div style={{ position: 'absolute', top: 14, left: '6%', right: '6%', height: 3, background: '#e5e7eb', borderRadius: 2 }} />
                {/* Ligne remplie */}
                <div style={{
                  position: 'absolute', top: 14, left: '6%', height: 3,
                  background: '#1E4D7B', borderRadius: 2,
                  width: etapeIndex >= 0 ? `${(etapeIndex / (ETAPES.length - 1)) * 88}%` : '0%',
                  transition: 'width 0.5s ease',
                }} />
                {ETAPES.map((etape, i) => {
                  const c = STATUT_CONFIG[etape]
                  const done    = i <= etapeIndex
                  const current = i === etapeIndex
                  return (
                    <div key={etape} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: done ? '#1E4D7B' : '#e5e7eb',
                        border: current ? '3px solid #1E4D7B' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: current ? '0 0 0 4px #dbeafe' : 'none',
                      }}>
                        {done && <CheckCircle size={14} style={{ color: '#fff' }} />}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 6, color: done ? '#1E4D7B' : '#9ca3af', fontWeight: done ? 600 : 400, textAlign: 'center' }}>
                        {c.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Infos livraison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <InfoBlock label="Gouvernorat" value={commande.dest_gouvernorat} />
            <InfoBlock label="Type de livraison" value={commande.type_livraison?.replace('_', ' ')} />
          </div>

          {/* Historique */}
          {commande.historique?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                Historique
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commande.historique.map((h, i) => {
                  const hCfg = STATUT_CONFIG[h.statut] || STATUT_CONFIG.en_attente
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: hCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <hCfg.icon size={14} style={{ color: hCfg.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: hCfg.color }}>{hCfg.label}</div>
                        {h.commentaire && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{h.commentaire}</div>}
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {new Date(h.date).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {commande.historique?.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
              Aucun historique disponible pour le moment.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, value }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111', textTransform: 'capitalize' }}>{value || '—'}</div>
    </div>
  )
}

const st = {
  page:     { maxWidth: 600, margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  header:   { textAlign: 'center', marginBottom: 32 },
  logo:     { fontSize: 48, marginBottom: 12 },
  title:    { fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 8px' },
  subtitle: { fontSize: 14, color: '#6b7280', margin: 0 },
  card:     { background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 },
  input:    { width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btn:      { padding: '10px 24px', background: '#1E4D7B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}