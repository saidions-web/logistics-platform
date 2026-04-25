import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Phone, MapPin, Plus, Pencil, Trash2, Copy, Check, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420, width: '95%' }}>
        <div className="modal-header">
          <h3>✅ Livreur créé avec succès</h3>
        </div>
        {/* ... reste du modal identique ... */}
        {/* (je garde ton modal tel quel pour ne pas allonger) */}
      </div>
    </div>
  )
}

// ── Modal ajout/édition (inchangé) ─────────────────────────────────────
function LivreurModal({ livreur, onClose, onSuccess }) {
  // ... ton code du modal reste exactement le même ...
  // (je ne le recopie pas ici pour la clarté)
}

// ── Page principale avec recherche + pagination ─────────────────────────────
export default function LivreursEntreprise() {
  const [livreurs, setLivreurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loginInfo, setLoginInfo] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await entrepriseApi.livreurs()
      setLivreurs(res.data || [])
      setCurrentPage(1) // Reset à la page 1 quand on recharge
    } catch (err) {
      console.error(err)
      setLivreurs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filtrage
  const filteredLivreurs = useMemo(() => {
    if (!searchTerm.trim()) return livreurs

    const term = searchTerm.toLowerCase().trim()
    return livreurs.filter(l =>
      `${l.prenom} ${l.nom}`.toLowerCase().includes(term) ||
      l.telephone?.includes(term) ||
      l.cin?.includes(term)
    )
  }, [livreurs, searchTerm])

  // Pagination
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
    } catch (err) {
      alert("Erreur lors de la suppression")
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
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, téléphone ou CIN..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)   // Reset à la première page quand on recherche
          }}
          style={{
            width: '100%',
            padding: '12px 14px 12px 46px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            fontSize: 15,
          }}
        />
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
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
          <p>Essayez de modifier votre recherche.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {currentLivreurs.map(l => (
              <div key={l.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* === Ton code de carte (inchangé) === */}
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
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(l); setShowModal(true) }}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => setConfirmDel(l.id)}>
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
                      🚗 {l.type_vehicule} {l.immatriculation && `— ${l.immatriculation}`}
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

          {/* ====================== PAGINATION ====================== */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      background: currentPage === page ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: currentPage === page ? '#fff' : 'var(--text-muted)',
                      fontWeight: currentPage === page ? 600 : 400,
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                className="btn btn-ghost" 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showModal && <LivreurModal livreur={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSuccess={handleSuccess} />}
      {loginInfo && <LoginInfoModal loginInfo={loginInfo} onClose={() => setLoginInfo(null)} />}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3>Supprimer ce livreur ?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}