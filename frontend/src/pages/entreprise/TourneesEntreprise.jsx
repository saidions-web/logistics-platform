import { useState, useEffect, useCallback } from 'react'
import { Route, Plus, ChevronDown, ChevronUp, Play, CheckCircle,
         Trash2, ArrowUpDown, Zap, Package } from 'lucide-react'
import { entrepriseApi } from '../../services/api'

const STATUT_BADGE = {
  planifiee: 'badge-warning',
  en_cours:  'badge-info',
  terminee:  'badge-success',
  annulee:   'badge-error',
}
const STATUT_LABEL = {
  planifiee: 'Planifiée',
  en_cours:  'En cours',
  terminee:  'Terminée',
  annulee:   'Annulée',
}

// ── Modal création tournée ──────────────────────────────────────────────────
function TourneeModal({ livreurs, onClose, onSuccess }) {
  const [form, setForm] = useState({
    livreur: '', date_prevue: new Date().toISOString().split('T')[0],
    heure_depart: '', zone_gouvernorat: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.livreur || !form.date_prevue || !form.zone_gouvernorat) {
      setError('Livreur, date et zone sont requis.')
      return
    }
    setLoading(true); setError('')
    try {
      await entrepriseApi.createTournee({
        ...form,
        livreur: parseInt(form.livreur),
      })
      onSuccess(); onClose()
    } catch (err) {
      const d = err.response?.data
      setError(Object.values(d || {}).flat().join(' ') || 'Erreur.')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nouvelle tournée</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Livreur *</label>
          <select className="form-select" value={form.livreur} onChange={set('livreur')}>
            <option value="">-- Choisir un livreur --</option>
            {livreurs.map(l => (
              <option key={l.id} value={l.id}>{l.nom_complet || `${l.prenom} ${l.nom}`}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className="form-input" type="date" value={form.date_prevue} onChange={set('date_prevue')} />
          </div>
          <div className="form-group">
            <label className="form-label">Heure de départ</label>
            <input className="form-input" type="time" value={form.heure_depart} onChange={set('heure_depart')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Zone principale *</label>
          <input className="form-input" placeholder="Ex : Tunis, Sfax..." value={form.zone_gouvernorat} onChange={set('zone_gouvernorat')} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={form.notes} onChange={set('notes')} />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Créer la tournée'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte tournée avec détail drag-and-drop ordre ──────────────────────────
function TourneeCard({ tournee, onRefresh }) {
  const [open, setOpen]         = useState(false)
  const [etapes, setEtapes]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [dragIdx, setDragIdx]   = useState(null)

  const loadEtapes = async () => {
    if (!open) return
    setLoading(true)
    try {
      const res = await entrepriseApi.getTourneeEtapes(tournee.id)
      setEtapes(res.data)
    } catch { setEtapes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadEtapes() }, [open])

  const handleOptimiser = async () => {
  setOptimizing(true)
  try {
    const res = await entrepriseApi.optimiserTournee(tournee.id)

    // 🔥 mise à jour DIRECTE sans reload
    setEtapes(res.data.etapes)

  } catch (err) {
    console.error(err)
  } finally {
    setOptimizing(false)
  }
}

  const handleStatut = async (statut) => {
    try {
      await entrepriseApi.updateTournee(tournee.id, { statut })
      onRefresh()
    } catch { }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette tournée ?')) return
    try {
      await entrepriseApi.deleteTournee(tournee.id)
      onRefresh()
    } catch { }
  }

  // Drag & Drop pour réordonnement (US-20)
  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver  = (e) => e.preventDefault()
  const handleDrop = async (targetIdx) => {
  if (dragIdx === null || dragIdx === targetIdx) return

  const newEtapes = [...etapes]
  const [moved] = newEtapes.splice(dragIdx, 1)
  newEtapes.splice(targetIdx, 0, moved)

  // 🔥 recalcul ordre visuel immédiat
  const updated = newEtapes.map((e, i) => ({
    ...e,
    ordre: i + 1
  }))

  setEtapes(updated)
  setDragIdx(null)

  try {
    await entrepriseApi.reordonnerTournee(
      tournee.id,
      updated.map(e => e.id)
    )
  } catch {
    loadEtapes()
  }
}
  return (
    <div className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: open ? 'rgba(30,77,123,0.04)' : 'transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(30,77,123,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Route size={17} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--accent)' }}>
              {tournee.reference}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {tournee.livreur_nom} · {tournee.zone_gouvernorat} · {new Date(tournee.date_prevue).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tournee.nb_commandes} commande{tournee.nb_commandes > 1 ? 's' : ''}
          </span>
          <span className={`badge ${STATUT_BADGE[tournee.statut]}`}>{STATUT_LABEL[tournee.statut]}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Détail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {tournee.statut === 'planifiee' && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleOptimiser} disabled={optimizing}>
                  <Zap size={13} /> {optimizing ? 'Optimisation...' : 'Optimiser l\'ordre'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleStatut('en_cours')}>
                  <Play size={13} /> Démarrer
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={handleDelete}>
                  <Trash2 size={13} /> Supprimer
                </button>
              </>
            )}
            {tournee.statut === 'en_cours' && (
              <button className="btn btn-primary btn-sm" onClick={() => handleStatut('terminee')}>
                <CheckCircle size={13} /> Terminer
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {tournee.statut === 'planifiee' ? '↕ Glissez-déposez pour réordonner' : ''}
            </span>
          </div>

          {/* Liste étapes */}
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement...</p>
          ) : etapes.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <Package size={24} />
              <p style={{ fontSize: 13 }}>Aucune commande dans cette tournée</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {etapes.map((etape, idx) => (
                <div
                  key={etape.id}
                  draggable={tournee.statut === 'planifiee'}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    cursor: tournee.statut === 'planifiee' ? 'grab' : 'default',
                    transition: 'opacity 0.2s',
                    opacity: dragIdx === idx ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {etape.ordre}
                  </div>
                  {tournee.statut === 'planifiee' && <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent)' }}>
                      {etape.commande_reference}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {etape.commande_dest_nom} {etape.commande_dest_prenom} · {etape.commande_gouvernorat}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {etape.commande_telephone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function TourneesEntreprise() {
  const [tournees, setTournees]     = useState([])
  const [livreurs, setLivreurs]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [autoLoading, setAutoLoading]   = useState(false)
  const [autoResult, setAutoResult]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtreStatut ? { statut: filtreStatut } : {}
      const [rTournees, rLivreurs] = await Promise.all([
        entrepriseApi.tournees(params),
        entrepriseApi.livreurs(),
      ])
      setTournees(rTournees.data)
      setLivreurs(rLivreurs.data)
    } catch { setTournees([]) }
    finally { setLoading(false) }
  }, [filtreStatut])

  useEffect(() => { load() }, [load])

  const handleAffectationAuto = async () => {
    setAutoLoading(true); setAutoResult(null)
    try {
      const res = await entrepriseApi.affectationAuto()
      setAutoResult(res.data)
      load()
    } catch (err) {
      setAutoResult({ error: err.response?.data?.detail || 'Erreur.' })
    } finally { setAutoLoading(false) }
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Tournées
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Planifiez et gérez les tournées de livraison
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleAffectationAuto} disabled={autoLoading}>
            <Zap size={14} /> {autoLoading ? 'Affectation...' : 'Affectation auto'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nouvelle tournée
          </button>
        </div>
      </div>

      {/* Résultat affectation auto */}
      {autoResult && (
        <div className={`alert ${autoResult.error ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
          {autoResult.error
            ? autoResult.error
            : `✅ ${autoResult.affectees} commande(s) affectée(s) automatiquement · ${autoResult.non_affectees} sans livreur disponible`
          }
        </div>
      )}

      {/* Filtre statut */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'planifiee', 'en_cours', 'terminee', 'annulee'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filtreStatut === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltreStatut(s)}
          >
            {s === '' ? 'Toutes' : STATUT_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Liste tournées */}
      {loading ? (
        <div className="empty-state"><p>Chargement...</p></div>
      ) : tournees.length === 0 ? (
        <div className="empty-state">
          <Route />
          <h3>Aucune tournée</h3>
          <p>Créez votre première tournée ou lancez l'affectation automatique.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nouvelle tournée
          </button>
        </div>
      ) : (
        tournees.map(t => (
          <TourneeCard key={t.id} tournee={t} onRefresh={load} />
        ))
      )}

      {showModal && (
        <TourneeModal
          livreurs={livreurs.filter(l => l.statut === 'disponible' || !l.statut)}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  )
}