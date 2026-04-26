// frontend/src/pages/entreprise/LivreursEntreprise.jsx
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

// ── Modal identifiants livreur ─────────────────────────────────────
function LoginInfoModal({ loginInfo, onClose }) {
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✅ Livreur créé avec succès</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Transmettez ces identifiants au livreur pour qu'il puisse se connecter à l'application mobile.
        </p>

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Email (identifiant)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 13, background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                {loginInfo.username}
              </code>
              <button
                onClick={() => copy(loginInfo.username, setCopiedUser)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedUser ? '#16a34a' : 'var(--text-muted)' }}
              >
                {copiedUser ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Mot de passe</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 13, background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                {loginInfo.password}
              </code>
              <button
                onClick={() => copy(loginInfo.password, setCopiedPass)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedPass ? '#16a34a' : 'var(--text-muted)' }}
              >
                {copiedPass ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 13 }}>
          ⚠️ Ces identifiants ne seront plus affichés. Notez-les avant de fermer.
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          J'ai noté les identifiants
        </button>
      </div>
    </div>
  )
}

// ── Modal ajout / édition ──────────────────────────────────────────
function LivreurModal({ livreur, onClose, onSuccess }) {
  const isEdit = Boolean(livreur)

  const [form, setForm] = useState(
    isEdit
      ? {
          nom:                  livreur.nom || '',
          prenom:               livreur.prenom || '',
          telephone:            livreur.telephone || '',
          cin:                  livreur.cin || '',
          type_vehicule:        livreur.type_vehicule || '',
          immatriculation:      livreur.immatriculation || '',
          gouvernorats_couverts: livreur.gouvernorats_couverts || [],
        }
      : { ...FORM_INITIAL }
  )

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleGouv = (gov) => {
    setForm(f => ({
      ...f,
      gouvernorats_couverts: f.gouvernorats_couverts.includes(gov)
        ? f.gouvernorats_couverts.filter(g => g !== gov)
        : [...f.gouvernorats_couverts, gov],
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        // ✅ PATCH — modification livreur
        await entrepriseApi.updateLivreur(livreur.id, form)
        onSuccess(null) // null = pas de login_info à afficher
      } else {
        // POST — création livreur
        const res = await entrepriseApi.createLivreur(form)
        onSuccess(res.data.login_info || null)
      }
      onClose()
    } catch (err) {
      const data = err.response?.data || {}
      const msg = typeof data === 'object'
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        : 'Une erreur est survenue.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Modifier le livreur' : 'Ajouter un livreur'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" value={form.prenom} onChange={set('prenom')} placeholder="Prénom" />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={form.nom} onChange={set('nom')} placeholder="Nom" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone *</label>
              <input className="form-input" value={form.telephone} onChange={set('telephone')} placeholder="+216 XX XXX XXX" />
            </div>
            <div className="form-group">
              <label className="form-label">CIN *</label>
              <input className="form-input" value={form.cin} onChange={set('cin')} placeholder="12345678" maxLength={8} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type de véhicule *</label>
              <input className="form-input" value={form.type_vehicule} onChange={set('type_vehicule')} placeholder="Moto, Voiture, Camionnette..." />
            </div>
            <div className="form-group">
              <label className="form-label">Immatriculation *</label>
              <input className="form-input" value={form.immatriculation} onChange={set('immatriculation')} placeholder="123 TU 456" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Zones de couverture</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 12, background: 'var(--bg3)', borderRadius: 8 }}>
              {GOUVERNORATS.map(gov => (
                <label key={gov} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.gouvernorats_couverts.includes(gov)}
                    onChange={() => toggleGouv(gov)}
                  />
                  {gov}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <span className="spinner" />
              : isEdit ? 'Enregistrer les modifications' : 'Créer le livreur'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────
export default function LivreursEntreprise() {
  const [livreurs, setLivreurs]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [loginInfo, setLoginInfo]   = useState(null)

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

  const filteredLivreurs = useMemo(() => {
    if (!searchTerm.trim()) return livreurs
    const term = searchTerm.toLowerCase().trim()
    return livreurs.filter(l =>
      `${l.prenom} ${l.nom}`.toLowerCase().includes(term) ||
      l.telephone?.includes(term) ||
      l.cin?.includes(term)
    )
  }, [livreurs, searchTerm])

  const totalPages = Math.ceil(filteredLivreurs.length / ITEMS_PER_PAGE)
  const currentLivreurs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLivreurs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLivreurs, currentPage])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await entrepriseApi.deleteLivreur(confirmDel)
      setConfirmDel(null)
      load()
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  // ✅ CORRECTION : handleSuccess reçoit login_info (création) ou null (modification)
  const handleSuccess = (info) => {
    load()
    if (info) setLoginInfo(info)
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>Livreurs</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {loading ? 'Chargement...' : `${filteredLivreurs.length} livreur${filteredLivreurs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={14} /> Ajouter un livreur
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, téléphone ou CIN..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          style={{ width: '100%', padding: '12px 14px 12px 46px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 15 }}
        />
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setCurrentPage(1) }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state"><p>Chargement des livreurs...</p></div>
      ) : filteredLivreurs.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Aucun livreur trouvé</h3>
          <p>Essayez de modifier votre recherche ou ajoutez un nouveau livreur.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {currentLivreurs.map(l => (
              <div key={l.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditing(l); setShowModal(true) }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => setConfirmDel(l.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <Phone size={13} /> {l.telephone}
                  </div>
                  {l.type_vehicule && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      🚗 {l.type_vehicule}{l.immatriculation ? ` — ${l.immatriculation}` : ''}
                    </div>
                  )}
                </div>

                {l.gouvernorats_couverts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
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

                {l.nb_tournees_actives > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    🚚 {l.nb_tournees_actives} tournée{l.nb_tournees_actives > 1 ? 's' : ''} en cours
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
              <button className="btn btn-ghost" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: currentPage === page ? 'var(--accent)' : 'var(--bg3)',
                      color: currentPage === page ? '#fff' : 'var(--text-muted)',
                      fontWeight: currentPage === page ? 600 : 400,
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
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
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3>Supprimer ce livreur ?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>Annuler</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#ef4444' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}