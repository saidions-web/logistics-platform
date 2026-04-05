import { useState, useEffect, useCallback } from 'react'
import { Users, Phone, MapPin, Plus, Pencil, Trash2, Copy, Check } from 'lucide-react'
import { entrepriseApi } from '../../services/api'

const GOUVERNORATS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba',
  'Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine',
  'Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse',
  'Tataouine','Tozeur','Tunis','Zaghouan',
]

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

// ── Modal identifiants livreur (affichée après création) ───────────────────
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
        </div>

        <div style={{ padding: '8px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            Communiquez ces identifiants au livreur. Le mot de passe n'est affiché qu'une seule fois.
          </p>

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              Nom d'utilisateur
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 600, color: 'var(--navy-900, #1e293b)' }}>
                {loginInfo.username}
              </span>
              <button
                onClick={() => copy(loginInfo.username, setCopiedUser)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedUser ? '#22c55e' : 'var(--text-muted)' }}
              >
                {copiedUser ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              Mot de passe
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fefce8',
              border: '1px solid #fde047',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#854d0e' }}>
                {loginInfo.password}
              </span>
              <button
                onClick={() => copy(loginInfo.password, setCopiedPass)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedPass ? '#22c55e' : '#854d0e' }}
              >
                {copiedPass ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: '#991b1b', marginBottom: 20,
          }}>
            ⚠️ Ce mot de passe ne sera plus visible après fermeture de cette fenêtre.
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onClose}
        >
          J'ai noté les identifiants
        </button>
      </div>
    </div>
  )
}

// ── Formulaire ajout/édition livreur ───────────────────────────────────────
function LivreurModal({ livreur, onClose, onSuccess }) {
  const [form, setForm]     = useState(livreur ? {
    nom: livreur.nom, prenom: livreur.prenom, telephone: livreur.telephone,
    cin: livreur.cin || '', type_vehicule: livreur.type_vehicule || '',
    immatriculation: livreur.immatriculation || '',
    gouvernorats_couverts: livreur.gouvernorats_couverts || [],
  } : FORM_INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleGouv = g => {
    setForm(f => ({
      ...f,
      gouvernorats_couverts: f.gouvernorats_couverts.includes(g)
        ? f.gouvernorats_couverts.filter(x => x !== g)
        : [...f.gouvernorats_couverts, g],
    }))
  }

  const submit = async () => {
    setLoading(true); setError('')
    try {
      if (livreur) {
        await entrepriseApi.updateLivreur(livreur.id, form)
        onSuccess()
        onClose()
      } else {
        const res = await entrepriseApi.createLivreur(form)
        // Afficher les identifiants si présents dans la réponse
        if (res.data?.login_info) {
          onSuccess(res.data.login_info)
        } else {
          onSuccess()
        }
        onClose()
      }
    } catch (err) {
      const d = err.response?.data
      setError(Object.values(d || {}).flat().join(' ') || 'Erreur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{livreur ? 'Modifier le livreur' : 'Ajouter un livreur'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" placeholder="Prénom" value={form.prenom} onChange={set('prenom')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" placeholder="Nom" value={form.nom} onChange={set('nom')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone *</label>
              <input className="form-input" placeholder="+216 XX XXX XXX" value={form.telephone} onChange={set('telephone')} />
            </div>
            <div className="form-group">
              <label className="form-label">CIN</label>
              <input className="form-input" placeholder="12345678" value={form.cin} onChange={set('cin')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type de véhicule</label>
              <input className="form-input" placeholder="Moto, Camionnette..." value={form.type_vehicule} onChange={set('type_vehicule')} />
            </div>
            <div className="form-group">
              <label className="form-label">Immatriculation</label>
              <input className="form-input" placeholder="123 TU 4567" value={form.immatriculation} onChange={set('immatriculation')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gouvernorats couverts</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {GOUVERNORATS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGouv(g)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: form.gouvernorats_couverts.includes(g) ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: form.gouvernorats_couverts.includes(g) ? 'rgba(30,77,123,0.08)' : 'transparent',
                    color: form.gouvernorats_couverts.includes(g) ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: form.gouvernorats_couverts.includes(g) ? 600 : 400,
                  }}
                >
                  {form.gouvernorats_couverts.includes(g) ? '✓ ' : ''}{g}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={submit}
            disabled={loading || !form.nom || !form.prenom || !form.telephone}
          >
            {loading ? <span className="spinner" /> : livreur ? 'Enregistrer' : 'Ajouter le livreur'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function LivreursEntreprise() {
  const [livreurs, setLivreurs]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [loginInfo, setLoginInfo]     = useState(null)  // ← identifiants à afficher

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await entrepriseApi.livreurs()
      setLivreurs(res.data)
    } catch {
      setLivreurs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await entrepriseApi.deleteLivreur(confirmDel)
      setConfirmDel(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  // Appelé par LivreurModal après succès
  const handleSuccess = (info) => {
    load()
    if (info) setLoginInfo(info)  // ← afficher la modal identifiants
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Livreurs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {loading ? '...' : `${livreurs.length} livreur${livreurs.length > 1 ? 's' : ''} dans votre équipe`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={14} /> Ajouter un livreur
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Chargement...</p></div>
      ) : livreurs.length === 0 ? (
        <div className="empty-state">
          <Users />
          <h3>Aucun livreur</h3>
          <p>Ajoutez votre premier livreur pour commencer.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Ajouter un livreur
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {livreurs.map(l => (
            <div key={l.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header */}
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
                    style={{ padding: '5px 7px' }}
                    onClick={() => { setEditing(l); setShowModal(true) }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '5px 7px', color: '#ef4444' }}
                    onClick={() => setConfirmDel(l.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Infos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Phone size={13} /> {l.telephone}
                </div>
                {l.type_vehicule && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    🚗 {l.type_vehicule} {l.immatriculation && `— ${l.immatriculation}`}
                  </div>
                )}
              </div>

              {/* Zones */}
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
                <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  🚚 {l.nb_tournees_actives} tournée{l.nb_tournees_actives > 1 ? 's' : ''} en cours
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout/édition */}
      {showModal && (
        <LivreurModal
          livreur={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modal identifiants — affichée après création */}
      {loginInfo && (
        <LoginInfoModal
          loginInfo={loginInfo}
          onClose={() => setLoginInfo(null)}
        />
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 380, width: '95%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ marginBottom: 8 }}>Supprimer ce livreur ?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              Cette action est irréversible. Les tournées associées seront conservées.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDel(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#ef4444', border: 'none' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="spinner" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}