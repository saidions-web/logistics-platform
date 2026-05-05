import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, Phone, MapPin, Plus, Pencil, Trash2,
  Copy, Check, Search, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { entrepriseApi } from '../../services/api'

const GOUVERNORATS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba',
  'Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine',
  'Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse',
  'Tataouine','Tozeur','Tunis','Zaghouan',
]

const ITEMS_PER_PAGE = 6

const STATUT_BADGE = {
  disponible: 'badge-success',
  en_tournee: 'badge-info',
  inactif:    'badge-error',
}
const STATUT_LABEL = {
  disponible: 'Disponible',
  en_tournee: 'En tournée',
  inactif:    'Inactif',
}

const FORM_INITIAL = {
  nom: '', prenom: '', telephone: '', cin: '',
  type_vehicule: '', immatriculation: '',
  gouvernorats_couverts: [],
}

// ── Modal identifiants ──────────────────────────────────────────────────────
function LoginInfoModal({ loginInfo, onClose }) {
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420, width: '95%' }}>
        <div className="modal-header">
          <h3>✅ Livreur créé avec succès</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Communiquez ces identifiants au livreur pour qu'il puisse se connecter à l'application mobile.
        </p>

        {[
          { label: 'Email / Identifiant', value: loginInfo.username, copied: copiedUser, setCopied: setCopiedUser },
          { label: 'Mot de passe temporaire', value: loginInfo.password, copied: copiedPass, setCopied: setCopiedPass },
        ].map(({ label, value, copied, setCopied }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{
                flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', fontSize: 14,
                color: 'var(--accent)', fontFamily: 'monospace',
              }}>
                {value}
              </code>
              <button
                onClick={() => copy(value, setCopied)}
                style={{
                  background: copied ? 'rgba(22,163,74,0.1)' : 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '10px 12px', cursor: 'pointer', color: copied ? '#16a34a' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        ))}

        <div className="alert alert-warning" style={{ marginTop: 12, marginBottom: 16 }}>
          ⚠️ Ces identifiants ne seront plus affichés. Notez-les avant de fermer.
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          J'ai noté les identifiants
        </button>
      </div>
    </div>
  )
}

// ── Modal ajout / édition ───────────────────────────────────────────────────
function LivreurModal({ livreur, onClose, onSuccess }) {
  const [form, setForm]       = useState(livreur ? {
    nom: livreur.nom || '',
    prenom: livreur.prenom || '',
    telephone: livreur.telephone || '',
    cin: livreur.cin || '',
    type_vehicule: livreur.type_vehicule || '',
    immatriculation: livreur.immatriculation || '',
    gouvernorats_couverts: livreur.gouvernorats_couverts || [],
  } : { ...FORM_INITIAL })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleGov = (g) => setForm(f => {
    const list = f.gouvernorats_couverts || []
    return {
      ...f,
      gouvernorats_couverts: list.includes(g) ? list.filter(v => v !== g) : [...list, g]
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (livreur) {
        await entrepriseApi.updateLivreur(livreur.id, form)
        onSuccess(null)
        onClose()
      } else {
        const res = await entrepriseApi.createLivreur(form)
        onSuccess(res.data.login_info || null)
        onClose()
      }
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{livreur ? 'Modifier le livreur' : 'Ajouter un livreur'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" value={form.prenom} onChange={set('prenom')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={form.nom} onChange={set('nom')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone *</label>
              <input className="form-input" placeholder="+216 XX XXX XXX" value={form.telephone} onChange={set('telephone')} required />
            </div>
            <div className="form-group">
              <label className="form-label">CIN *</label>
              <input className="form-input" placeholder="8 chiffres" value={form.cin} onChange={set('cin')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type de véhicule *</label>
              <input className="form-input" placeholder="Moto, Voiture, Camionnette..." value={form.type_vehicule} onChange={set('type_vehicule')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Immatriculation *</label>
              <input className="form-input" placeholder="123 TU 456" value={form.immatriculation} onChange={set('immatriculation')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gouvernorats couverts</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: 'var(--bg3)', padding: 12, borderRadius: 8 }}>
              {GOUVERNORATS.map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={(form.gouvernorats_couverts || []).includes(g)}
                    onChange={() => toggleGov(g)} />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : livreur ? 'Enregistrer' : 'Créer le livreur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function LivreursEntreprise() {
  const [livreurs, setLivreurs]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null) // { id, nom }
  const [deleting, setDeleting]     = useState(false)
  const [loginInfo, setLoginInfo]   = useState(null)

  // ── Chargement ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await entrepriseApi.livreurs()
      setLivreurs(res.data || [])
      setCurrentPage(1)
    } catch {
      setLivreurs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtrage + pagination ────────────────────────────────────────────────
  const filteredLivreurs = useMemo(() => {
    if (!searchTerm.trim()) return livreurs
    const term = searchTerm.toLowerCase().trim()
    return livreurs.filter(l =>
      `${l.prenom} ${l.nom}`.toLowerCase().includes(term) ||
      l.telephone?.includes(term) ||
      l.cin?.toLowerCase().includes(term)
    )
  }, [livreurs, searchTerm])

  const totalPages      = Math.max(1, Math.ceil(filteredLivreurs.length / ITEMS_PER_PAGE))
  const currentLivreurs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLivreurs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLivreurs, currentPage])

  // ── Suppression ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      // ✅ FIX : on attend un 200 (plus un 204 sans corps)
      // entrepriseApi.deleteLivreur() fait api.delete() → axios accepte 200 et 204
      await entrepriseApi.deleteLivreur(confirmDel.id)

      // ✅ Mise à jour locale immédiate — pas de refetch du livreur supprimé
      setLivreurs(prev => prev.filter(l => l.id !== confirmDel.id))
      setConfirmDel(null)

      // Ajuster la page si elle devient vide
      const remaining = filteredLivreurs.length - 1
      const newTotalPages = Math.max(1, Math.ceil(remaining / ITEMS_PER_PAGE))
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages)

    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la suppression du livreur.'
      alert(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handleSuccess = (info) => {
    load()
    if (info) setLoginInfo(info)
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Livreurs
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
            {loading ? 'Chargement...' : `${filteredLivreurs.length} livreur${filteredLivreurs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={14} /> Ajouter un livreur
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          className="form-input"
          style={{ paddingLeft: 40 }}
          placeholder="Rechercher par nom, prénom, téléphone ou CIN..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
        />
        {searchTerm && (
          <button onClick={() => { setSearchTerm(''); setCurrentPage(1) }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="empty-state"><p>Chargement des livreurs...</p></div>
      ) : filteredLivreurs.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Aucun livreur trouvé</h3>
          <p>{searchTerm ? 'Essayez de modifier votre recherche.' : 'Ajoutez votre premier livreur.'}</p>
          {!searchTerm && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={14} /> Ajouter un livreur
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {currentLivreurs.map(l => (
              <div key={l.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(30,77,123,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={20} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{l.prenom} {l.nom}</div>
                      <span className={`badge ${STATUT_BADGE[l.statut] || 'badge-warning'}`} style={{ fontSize: 11 }}>
                        {STATUT_LABEL[l.statut] || l.statut}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" title="Modifier"
                      onClick={() => { setEditing(l); setShowModal(true) }}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Supprimer"
                      style={{ color: '#ef4444' }}
                      onClick={() => setConfirmDel({ id: l.id, nom: `${l.prenom} ${l.nom}` })}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Infos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <Phone size={13} /> {l.telephone}
                  </div>
                  {l.cin && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      🪪 CIN : {l.cin}
                    </div>
                  )}
                  {l.type_vehicule && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      🚗 {l.type_vehicule}{l.immatriculation ? ` — ${l.immatriculation}` : ''}
                    </div>
                  )}
                </div>

                {/* Gouvernorats */}
                {l.gouvernorats_couverts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> Zones couvertes
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {l.gouvernorats_couverts.slice(0, 4).map(g => (
                        <span key={g} className="badge badge-default" style={{ fontSize: 11 }}>{g}</span>
                      ))}
                      {l.gouvernorats_couverts.length > 4 && (
                        <span className="badge badge-default" style={{ fontSize: 11 }}>+{l.gouvernorats_couverts.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tournées actives */}
                {l.nb_tournees_actives > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    🚚 {l.nb_tournees_actives} tournée{l.nb_tournees_actives > 1 ? 's' : ''} en cours
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => goToPage(page)} style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: currentPage === page ? 700 : 400,
                  background: currentPage === page ? 'var(--accent)' : 'var(--bg3)',
                  color: currentPage === page ? '#fff' : 'var(--text-muted)',
                  fontSize: 14,
                }}>
                  {page}
                </button>
              ))}

              <button className="btn btn-ghost btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showModal && (
        <LivreurModal
          livreur={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSuccess={handleSuccess}
        />
      )}

      {loginInfo && (
        <LoginInfoModal loginInfo={loginInfo} onClose={() => setLoginInfo(null)} />
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 400, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
                Supprimer ce livreur ?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
                <strong>{confirmDel.nom}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Son compte sera désactivé et il ne pourra plus se connecter à l'application mobile. Cette action est irréversible.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="spinner" /> : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}