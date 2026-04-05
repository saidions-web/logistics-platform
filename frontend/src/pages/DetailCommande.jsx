import { useState, useEffect } from 'react'
import { X, Package, CheckCircle, Truck, Clock, XCircle, RotateCcw, Copy, Check, FileText, Tag } from 'lucide-react'
import { commandesApi } from '../services/api'

const STATUT_CONFIG = {
  en_attente:   { label: 'En attente',      icon: Clock,       color: '#D97706', bg: '#fef3c7' },
  prise_charge: { label: 'Prise en charge', icon: Package,     color: '#3b82f6', bg: '#eff6ff' },
  en_transit:   { label: 'En transit',      icon: Truck,       color: '#8b5cf6', bg: '#f5f3ff' },
  livree:       { label: 'Livrée',          icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
  retournee:    { label: 'Retournée',       icon: RotateCcw,   color: '#ef4444', bg: '#fef2f2' },
  annulee:      { label: 'Annulée',         icon: XCircle,     color: '#6b7280', bg: '#f9fafb' },
}

const TYPES_LIVRAISON = {
  standard:    'Standard',
  express:     'Express',
  jour_j:      'Jour J',
  nuit:        'Nuit',
  point_relai: 'Point relais',
}

// ── Copier référence ──
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} title="Copier la référence"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#16a34a' : '#9ca3af', padding: 4 }}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

// ════════════════════════════════════════════════════════
// Modal Détail commande (US-11)
// ════════════════════════════════════════════════════════
export function DetailCommandeModal({ commandeId, onClose }) {
  const [commande, setCommande] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await commandesApi.get(commandeId)
        setCommande(res.data)
      } catch {
        onClose()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [commandeId])

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 600, width: '95%', textAlign: 'center', padding: 40 }}>
        Chargement...
      </div>
    </div>
  )

  if (!commande) return null

  const cfg = STATUT_CONFIG[commande.statut] || STATUT_CONFIG.en_attente

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, width: '95%' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
              {commande.reference}
            </span>
            <CopyButton text={commande.reference} />
            <button
              onClick={() => genererBonLivraison(commande)}
              title="Télécharger le bon de livraison PDF"
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
              <FileText size={13} /> PDF
            </button>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>

          {/* Statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: cfg.bg, borderRadius: 10, marginBottom: 20 }}>
            <cfg.icon size={20} style={{ color: cfg.color }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                Créée le {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                {commande.reference_interne && ` · Réf: ${commande.reference_interne}`}
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <Section title="Destinataire">
            <Row label="Nom complet"   value={`${commande.dest_nom} ${commande.dest_prenom}`} />
            <Row label="Téléphone"     value={commande.dest_telephone} />
            <Row label="Adresse"       value={commande.dest_adresse} />
            <Row label="Gouvernorat"   value={commande.dest_gouvernorat} />
          </Section>

          {/* Livraison */}
          <Section title="Livraison">
            <Row label="Type"              value={TYPES_LIVRAISON[commande.type_livraison] || commande.type_livraison} />
            <Row label="Montant à collecter" value={`${commande.montant_a_collecter} TND`} bold />
            <Row label="Nombre de colis"   value={commande.nombre_colis} />
            <Row label="Poids total"       value={`${commande.poids_total} kg`} />
            {commande.notes && <Row label="Notes" value={commande.notes} />}
          </Section>

          {/* Colis */}
          {commande.colis?.length > 0 && (
            <Section title={`Colis (${commande.colis.length})`}>
              {commande.colis.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>#{i + 1} — {c.description}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.poids} kg</div>
                  </div>
                  {c.fragile && (
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      ⚠ Fragile
                    </span>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Historique des statuts */}
          <Section title="Historique">
            {commande.historique?.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun changement de statut enregistré.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Ligne verticale */}
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: '#e5e7eb', borderRadius: 2 }} />

                {commande.historique.map((h, i) => {
                  const hCfg = STATUT_CONFIG[h.nouveau_statut] || STATUT_CONFIG.en_attente
                  return (
                    <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                      {/* Point sur la timeline */}
                      <div style={{ position: 'absolute', left: -20, top: 3, width: 14, height: 14, borderRadius: '50%', background: hCfg.color, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + hCfg.color + '44' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: hCfg.color }}>{hCfg.label}</div>
                      {h.commentaire && (
                        <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{h.commentaire}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {new Date(h.date).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>
  )
}

// ── Composants helper ──
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: '#111', textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
    </div>
  )
}