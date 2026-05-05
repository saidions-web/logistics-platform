import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify';
import { Package, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, MapPin, Phone, Box, TrendingUp, Calendar, Tag } from 'lucide-react'
import { entrepriseApi } from '../../services/api'
import RetourModal from './RetourModal'

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

const TRANSITIONS = {
  en_attente:   ['prise_charge', 'annulee'],
  prise_charge: ['en_transit', 'retournee'],
  en_transit:   ['livree', 'retournee'],
}

const STATUT_COLORS = {
  en_attente:   { bg: '#fffbeb', color: '#b45309', dot: '#d97706' },
  prise_charge: { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  en_transit:   { bg: '#f5f3ff', color: '#6d28d9', dot: '#8b5cf6' },
  livree:       { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  retournee:    { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  annulee:      { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ── Pagination compacte ───────────────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const getPages = () => {
    const pages = [], delta = 1
    const left = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages) }
    return pages
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', borderTop: '1px solid var(--border)',
      flexWrap: 'wrap', gap: 10, background: 'var(--bg3)',
      borderRadius: '0 0 12px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{from}–{to}</strong> sur {total}
        </span>
        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {[
          { icon: ChevronsLeft, action: () => onPageChange(1), disabled: page === 1 },
          { icon: ChevronLeft, action: () => onPageChange(page - 1), disabled: page === 1 },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <PBtn key={i} onClick={action} disabled={disabled}><Icon size={13} /></PBtn>
        ))}
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 12 }}>…</span>
            : <PBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PBtn>
        )}
        {[
          { icon: ChevronRight, action: () => onPageChange(page + 1), disabled: page === totalPages },
          { icon: ChevronsRight, action: () => onPageChange(totalPages), disabled: page === totalPages },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <PBtn key={`r${i}`} onClick={action} disabled={disabled}><Icon size={13} /></PBtn>
        ))}
      </div>
    </div>
  )
}

function PBtn({ onClick, disabled, active, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 30, height: 30, borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 500,
      border: active ? 'none' : '1px solid var(--border)',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : disabled ? '#d1d5db' : 'var(--text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
    }}>{children}</button>
  )
}

// ── Modal détail commande amélioré ────────────────────────────────────────
function CommandeDetailModal({ commande, onClose }) {
  if (!commande) return null
  const sc = STATUT_COLORS[commande.statut] || STATUT_COLORS.en_attente

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)',
        borderRadius: 20,
        width: '95%',
        maxWidth: 680,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(11,22,40,0.18)',
        animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        border: '1px solid var(--border)',
      }}>

        {/* ── Header avec statut ── */}
        <div style={{
          background: sc.bg,
          borderBottom: `1px solid ${sc.dot}30`,
          borderRadius: '20px 20px 0 0',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Status dot animé */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${sc.dot}20`,
                border: `2px solid ${sc.dot}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: sc.dot }} />
              </div>
              {commande.statut === 'en_transit' && (
                <div style={{
                  position: 'absolute', inset: -4,
                  borderRadius: 18, border: `2px solid ${sc.dot}30`,
                  animation: 'pulse 2s infinite',
                }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {STATUT_LABEL[commande.statut] || commande.statut}
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: 'var(--navy-900)', letterSpacing: 1 }}>
                {commande.reference}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Créée le {new Date(commande.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${sc.dot}30`,
            background: `${sc.dot}10`, color: sc.color,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 600, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Montants en haut — info principale */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e4d7b, #2563a8)',
              borderRadius: 14, padding: '18px 20px', color: '#fff',
            }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Montant à collecter
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                {parseFloat(commande.montant_a_collecter).toFixed(3)}
                <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7, marginLeft: 4 }}>TND</span>
              </div>
            </div>
            <div style={{
              background: 'var(--bg3)', borderRadius: 14, padding: '18px 20px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Prix livraison
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', letterSpacing: -0.5 }}>
                {parseFloat(commande.prix_livraison || 0).toFixed(3)}
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>TND</span>
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <Section icon={<Phone size={15} />} title="Destinataire">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <InfoRow label="Nom complet" value={`${commande.dest_nom} ${commande.dest_prenom}`} bold />
              <InfoRow label="Téléphone" value={commande.dest_telephone} />
              <InfoRow label="Gouvernorat" value={commande.dest_gouvernorat} />
              <InfoRow label="Type livraison" value={commande.type_livraison?.replace('_', ' ')} />
            </div>
            {commande.dest_adresse && (
              <div style={{
                marginTop: 10, padding: '10px 14px', background: 'var(--bg3)',
                borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                  {commande.dest_adresse}
                </span>
              </div>
            )}
          </Section>

          {/* Boutique vendeur */}
          {commande.boutique && (
            <Section icon={<Tag size={15} />} title="Boutique expéditrice">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <InfoRow label="Boutique" value={commande.boutique.nom_boutique} bold />
                <InfoRow label="Vendeur" value={commande.vendeur_nom_complet} />
                <InfoRow label="Secteur" value={commande.boutique.secteur} />
                <InfoRow label="Gouvernorat" value={commande.boutique.gouvernorat} />
              </div>
            </Section>
          )}

          {/* Colis */}
          {commande.colis?.length > 0 && (
            <Section icon={<Box size={15} />} title={`Colis · ${commande.colis.length}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {commande.colis.map((c, i) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--accent)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.description}</div>
                        {c.fragile && (
                          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>⚠ Fragile</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                      {c.poids} kg
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
          background: 'var(--bg3)', borderRadius: '0 0 20px 20px',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: 'var(--text)', textTransform: 'capitalize' }}>
        {value || '—'}
      </div>
    </div>
  )
}

// ── Génération étiquette ───────────────────────────────────────────────────
function genererEtiquetteEntreprise(commande) {
  try {
    const dateActuelle = new Date()
    const prixLivraison = parseFloat(commande.prix_livraison) || 0
    const montantArticle = parseFloat(commande.montant_a_collecter) || 0
    const total = montantArticle + prixLivraison

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Étiquette ${commande.reference}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #fff; }
      .etiquette { width: 10cm; height: 15cm; border: 2px solid #000; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 5px; }
      .logo { font-weight: bold; font-size: 12px; }
      .type { font-size: 11px; font-weight: bold; color: ${commande.type_livraison === 'express' ? 'red' : 'black'}; }
      .reference { text-align: center; font-size: 20px; font-weight: bold; border: 2px solid #000; padding: 6px; margin: 8px 0; }
      .bloc { margin: 6px 0; }
      .title { font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px; }
      .nom { font-size: 13px; font-weight: bold; }
      .tel { font-size: 12px; }
      .adresse { font-size: 11px; }
      .zone { text-align: center; font-size: 14px; font-weight: bold; border: 2px dashed #000; padding: 4px; margin: 6px 0; }
      .infos { display: flex; justify-content: space-between; font-size: 11px; }
      .prix { border-top: 2px solid #000; margin-top: 6px; padding-top: 6px; font-size: 12px; }
      .row { display: flex; justify-content: space-between; }
      .total { margin-top: 4px; padding: 4px; background: black; color: white; font-weight: bold; }
      .barcode { text-align: center; font-family: monospace; font-size: 16px; letter-spacing: 2px; border-top: 1px dashed #000; padding-top: 6px; }
      .footer { font-size: 9px; text-align: center; color: #666; }
    </style></head><body>
    <div class="etiquette">
      <div class="header"><div class="logo">🚚 DELIVERY</div><div class="type">${commande.type_livraison?.toUpperCase()}</div></div>
      <div class="reference">${commande.reference}</div>
      <div class="zone">${commande.dest_gouvernorat}</div>
      <div class="bloc">
        <div class="title">DESTINATAIRE</div>
        <div class="nom">${commande.dest_nom} ${commande.dest_prenom}</div>
        <div class="tel">${commande.dest_telephone}</div>
        <div class="adresse">${commande.dest_adresse}</div>
      </div>
      <div class="infos"><div>Colis: <b>${commande.nombre_colis}</b></div><div>Poids: <b>${commande.poids_total} kg</b></div></div>
      <div class="prix">
        <div class="row"><span>Article</span><span>${montantArticle.toFixed(3)} TND</span></div>
        <div class="row"><span>Livraison</span><span>${prixLivraison.toFixed(3)} TND</span></div>
        <div class="total row"><span>TOTAL</span><span>${total.toFixed(3)} TND</span></div>
      </div>
      <div class="barcode">*${commande.reference}*</div>
      <div class="footer">${dateActuelle.toLocaleDateString('fr-FR')}</div>
    </div></body></html>`

    const win = window.open('', '_blank', 'width=800,height=600')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  } catch (err) {
    toast.error("Erreur lors de la génération de l'étiquette")
  }
}

// ── StatutModal ───────────────────────────────────────────────────────────
function StatutModal({ commande, onClose, onSuccess }) {
  const [statut, setStatut] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading] = useState(false)

  const options = TRANSITIONS[commande.statut] || []

  const submit = async () => {
    if (!statut) return
    setLoading(true)
    try {
      await entrepriseApi.changerStatut(commande.id, { statut, commentaire })
      toast.success(`Statut mis à jour : ${STATUT_LABEL[statut]}`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du changement de statut')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Changer le statut</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
          {commande.reference}
        </div>
        <div className="form-group">
          <label className="form-label">Nouveau statut</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map(opt => {
              const sc = STATUT_COLORS[opt] || {}
              return (
                <label key={opt} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 10, border: `2px solid ${statut === opt ? sc.dot : 'var(--border)'}`,
                  background: statut === opt ? `${sc.dot}10` : 'var(--bg3)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="radio" name="statut" value={opt}
                    checked={statut === opt} onChange={() => setStatut(opt)}
                    style={{ accentColor: sc.dot }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: statut === opt ? sc.color : 'var(--text)' }}>
                    {STATUT_LABEL[opt]}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Commentaire (optionnel)</label>
          <textarea className="form-textarea" rows={2} value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Note interne..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={submit} disabled={loading || !statut}>
            {loading ? <span className="spinner" /> : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function CommandesEntreprise() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [selected, setSelected] = useState(null)
  const [retourTarget, setRetourTarget] = useState(null)
  const [detailCommande, setDetailCommande] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtreStatut) params.statut = filtreStatut
      if (search) params.search = search
      const res = await entrepriseApi.commandes(params)
      setCommandes(res.data || [])
      setPage(1)
    } catch {
      toast.error('Impossible de charger les commandes')
      setCommandes([])
    } finally { setLoading(false) }
  }, [filtreStatut, search])

  useEffect(() => { load() }, [load])

  const total = commandes.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated = commandes.slice((page - 1) * pageSize, page * pageSize)

  // Colonnes fixes, contenu tronqué — pas de scroll horizontal
  const colWidths = {
    ref:      '14%',
    client:   '16%',
    gouv:     '10%',
    montant:  '10%',
    colis:    '8%',
    date:     '10%',
    statut:   '14%',
    actions:  '18%',
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Commandes reçues
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {loading ? '…' : `${total} commande${total > 1 ? 's' : ''} affectées à votre entreprise`}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          Actualiser
        </button>
      </div>

      {/* Filtres — pill buttons + search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36, height: 40 }}
            placeholder="Référence, nom, téléphone..." value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            }}><X size={14} /></button>
          )}
        </div>

        {/* Filtre statut en pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ value: '', label: 'Tous' }, ...Object.entries(STATUT_LABEL).map(([k, v]) => ({ value: k, label: v }))].map(({ value, label }) => (
            <button key={value}
              onClick={() => { setFiltreStatut(value); setPage(1) }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: filtreStatut === value ? 'none' : '1px solid var(--border)',
                background: filtreStatut === value ? 'var(--navy-800)' : 'transparent',
                color: filtreStatut === value ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau — largeurs fixes, pas de scroll horizontal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state"><p>Chargement...</p></div>
        ) : commandes.length === 0 ? (
          <div className="empty-state">
            <Package />
            <h3>Aucune commande</h3>
            <p>Les commandes affectées apparaîtront ici.</p>
          </div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: colWidths.ref }}>Référence</th>
                <th style={{ width: colWidths.client }}>Client</th>
                <th style={{ width: colWidths.gouv }}>Zone</th>
                <th style={{ width: colWidths.montant, textAlign: 'right' }}>Montant</th>
                <th style={{ width: colWidths.colis, textAlign: 'center' }}>Colis</th>
                <th style={{ width: colWidths.date }}>Date</th>
                <th style={{ width: colWidths.statut }}>Statut</th>
                <th style={{ width: colWidths.actions }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => {
                const sc = STATUT_COLORS[c.statut] || {}
                return (
                  <tr key={c.id} onClick={() => setDetailCommande(c)}
                    style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)',
                        fontWeight: 700, background: 'rgba(30,77,123,0.07)',
                        padding: '3px 8px', borderRadius: 5,
                        display: 'inline-block', maxWidth: '100%',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.reference}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                        {c.dest_nom} {c.dest_prenom}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.dest_telephone}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.dest_gouvernorat}
                    </td>
                    <td style={{ fontWeight: 700, textAlign: 'right', fontSize: 13 }}>
                      {parseFloat(c.montant_a_collecter).toFixed(0)} TND
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 13 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--bg3)', fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                      }}>{c.nombre_colis}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: sc.bg, color: sc.color,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                        {STATUT_LABEL[c.statut] || c.statut}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {TRANSITIONS[c.statut]?.length > 0 && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => setSelected(c)}>
                            Statut
                          </button>
                        )}
                      
                        <button className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '4px 10px', color: '#d97706' }}
                          onClick={() => genererEtiquetteEntreprise(c)}>
                          Étiq.
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && commandes.length > 0 && (
          <Pagination
            page={page} totalPages={totalPages} total={total}
            pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1) }}
          />
        )}
      </div>

      {/* Modals */}
      {selected && <StatutModal commande={selected} onClose={() => setSelected(null)} onSuccess={load} />}
      {retourTarget && <RetourModal commande={retourTarget} onClose={() => setRetourTarget(null)} onSuccess={load} />}
      {detailCommande && <CommandeDetailModal commande={detailCommande} onClose={() => setDetailCommande(null)} />}
    </div>
  )
}
