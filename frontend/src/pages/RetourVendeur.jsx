import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, ChevronLeft, ChevronRight,
         ChevronsLeft, ChevronsRight, AlertTriangle } from 'lucide-react'
import { retoursApi } from '../services/api'

// ─────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────
const MOTIF_LABEL = {
  client_absent:    'Client absent',
  injoignable:      'Injoignable',
  refus_client:     'Refus du client',
  adresse_invalide: 'Adresse invalide',
  autre:            'Autre',
}
const MOTIF_COLOR = {
  client_absent:    '#D97706',
  injoignable:      '#7C3AED',
  refus_client:     '#EF4444',
  adresse_invalide: '#6B7280',
  autre:            '#6B7280',
}
const STATUT_BADGE = {
  reprogramme:  { label: 'Reprogrammé',              cls: 'badge-success'  },
  annule_final: { label: 'Annulé définitivement',    cls: 'badge-error'    },
}

const PAGE_SIZE_OPTIONS = [5, 10, 20]

// ─────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const getPages = () => {
    const pages = [], delta = 2
    const left  = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages) }
    return pages
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {from}–{to} sur <strong>{total}</strong> retour{total > 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lignes :</span>
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[{ icon: ChevronsLeft, action: () => onPageChange(1), disabled: page === 1 },
          { icon: ChevronLeft,  action: () => onPageChange(page - 1), disabled: page === 1 }].map(({ icon: Icon, action, disabled }, i) => (
          <PBtn key={i} onClick={action} disabled={disabled}><Icon size={14} /></PBtn>
        ))}
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
            : <PBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PBtn>
        )}
        {[{ icon: ChevronRight, action: () => onPageChange(page + 1), disabled: page === totalPages },
          { icon: ChevronsRight, action: () => onPageChange(totalPages), disabled: page === totalPages }].map(({ icon: Icon, action, disabled }, i) => (
          <PBtn key={`r${i}`} onClick={action} disabled={disabled}><Icon size={14} /></PBtn>
        ))}
      </div>
    </div>
  )
}

function PBtn({ onClick, disabled, active, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 32, height: 32, borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 500,
      border: active ? 'none' : '1px solid var(--border)',
      background: active ? 'var(--accent, #1E4D7B)' : 'transparent',
      color: active ? '#fff' : disabled ? '#c4c4c4' : 'var(--text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', padding: '0 6px',
    }}>{children}</button>
  )
}

// ─────────────────────────────────────────
// MODAL DÉCISION VENDEUR
// ─────────────────────────────────────────
function DecisionModal({ retour, onClose, onSuccess }) {
  const [decision, setDecision] = useState('')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async () => {
    if (!decision) return
    setLoading(true); setError('')
    try {
      await retoursApi.decision(retour.id, { decision, notes_vendeur: notes })
      onSuccess(); onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la décision.')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Décision de retour</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
            {retour.commande_reference}
          </div>
          <div style={{ fontSize: 13 }}>{retour.commande_dest_nom} {retour.commande_dest_prenom}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {retour.commande_gouvernorat} · {retour.commande_montant} TND
          </div>
          <div style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} style={{ color: MOTIF_COLOR[retour.motif] }} />
            <span style={{ color: MOTIF_COLOR[retour.motif], fontWeight: 600 }}>
              {MOTIF_LABEL[retour.motif] || retour.motif}
            </span>
            {retour.commentaire && (
              <span style={{ color: 'var(--text-muted)' }}>— {retour.commentaire}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Que souhaitez-vous faire ?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
              borderRadius: 10, border: `2px solid ${decision === 'reprogrammer' ? '#16a34a' : 'var(--border)'}`,
              background: decision === 'reprogrammer' ? '#f0fdf4' : 'var(--bg3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <input type="radio" name="decision" value="reprogrammer"
                checked={decision === 'reprogrammer'} onChange={() => setDecision('reprogrammer')}
                style={{ marginTop: 2, accentColor: '#16a34a' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={15} /> Reprogrammer la livraison
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  La commande repassera en attente pour une nouvelle tentative de livraison.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
              borderRadius: 10, border: `2px solid ${decision === 'annuler' ? '#ef4444' : 'var(--border)'}`,
              background: decision === 'annuler' ? '#fef2f2' : 'var(--bg3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <input type="radio" name="decision" value="annuler"
                checked={decision === 'annuler'} onChange={() => setDecision('annuler')}
                style={{ marginTop: 2, accentColor: '#ef4444' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XCircle size={15} /> Annuler définitivement
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  La commande sera annulée. Le colis retourne à votre stock.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Notes (optionnel)</label>
          <textarea className="form-textarea" rows={2} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex : Nouvelle adresse, rappeler le client avant..." />
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={submit} disabled={loading || !decision}>
            {loading ? <span className="spinner" /> : 'Confirmer ma décision'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────
export default function RetoursVendeur() {
  const [retours, setRetours] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtreStatut ? { statut: filtreStatut } : {}
      const res = await retoursApi.list(params)
      setRetours(res.data)
      setPage(1)
    } catch {
      setRetours([])
    } finally {
      setLoading(false)
    }
  }, [filtreStatut])

  useEffect(() => { load() }, [load])

  // KPI
  const reprogramme = retours.filter(r => r.statut === 'reprogramme').length
  const annule     = retours.filter(r => r.statut === 'annule_final').length

  // Pagination
  const total      = retours.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated  = retours.slice((page - 1) * pageSize, page * pageSize)

  // Décision possible pour tous (plus de filtre en_cours/recu_depot)
  const canDecide  = (r) => !r.decision_vendeur

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Gestion des retours
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Suivez et traitez vos commandes retournées
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          Actualiser
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[ 
          { label: 'Reprogrammés', value: reprogramme, color: '#16a34a', icon: CheckCircle },
          { label: 'Annulés',      value: annule,      color: '#ef4444', icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtre statut */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[ 
          { value: '',            label: 'Tous' },
          { value: 'reprogramme', label: 'Reprogrammés' },
          { value: 'annule_final',label: 'Annulés' },
        ].map(({ value, label }) => (
          <button key={value}
            className={`btn btn-sm ${filtreStatut === value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setFiltreStatut(value); setPage(1) }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : retours.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun retour</h3>
              <p>Vos commandes retournées apparaîtront ici.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Destinataire</th>
                  <th>Gouvernorat</th>
                  <th>Montant</th>
                  <th>Motif</th>
                  <th>Commentaire livreur</th>
                  <th>Date retour</th>
                  <th>Statut</th>
                  <th>Décision</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const sb = STATUT_BADGE[r.statut] || { label: r.statut, cls: 'badge-warning' }
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'rgba(30,77,123,0.07)', padding: '3px 8px', borderRadius: 5 }}>
                          {r.commande_reference}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{r.commande_dest_nom} {r.commande_dest_prenom}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.commande_gouvernorat}</td>
                      <td style={{ fontWeight: 600 }}>{r.commande_montant} TND</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600,
                          color: MOTIF_COLOR[r.motif],
                          background: `${MOTIF_COLOR[r.motif]}14`,
                          padding: '3px 10px', borderRadius: 20,
                        }}>
                          <AlertTriangle size={11} />
                          {MOTIF_LABEL[r.motif] || r.motif}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                        {r.commentaire || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(r.date_retour).toLocaleDateString('fr-FR')}
                      </td>
                      <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {r.decision_vendeur ? (
                          <span style={{ color: r.decision_vendeur === 'reprogrammer' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                            {r.decision_vendeur === 'reprogrammer' ? '🔁 Reprogrammé' : '❌ Annulé'}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>En attente</span>
                        )}
                      </td>
                      <td>
                        {canDecide(r) && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={() => setSelected(r)}
                          >
                            Décider
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && retours.length > 0 && (
          <Pagination
            page={page} totalPages={totalPages} total={total}
            pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1) }}
          />
        )}
      </div>

      {selected && (
        <DecisionModal retour={selected} onClose={() => setSelected(null)} onSuccess={load} />
      )}
    </div>
  )
}