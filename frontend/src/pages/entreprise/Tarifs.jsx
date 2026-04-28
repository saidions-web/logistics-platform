import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Plus, Trash2, DollarSign, CheckCircle,
         XCircle, AlertCircle, Info, X, MapPin, Weight,
         Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { tarifsApi } from '../../services/api'
// ─────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360,
    }}>
      {toasts.map(t => {
        const cfg = {
          success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: CheckCircle },
          error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: XCircle },
          info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: Info },
          warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: AlertCircle },
        }[t.type] || { bg: '#f9fafb', border: '#d1d5db', color: '#374151', icon: Info }
        const Icon = cfg.icon
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 10, color: cfg.color,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            animation: 'slideInRight 0.25s ease',
            fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          }}>
            <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: cfg.color, opacity: 0.6, padding: 0, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
  }, [])
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, toast: add, removeToast: remove }
}

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const GOUVERNORATS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba',
  'Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine',
  'Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse',
  'Tataouine','Tozeur','Tunis','Zaghouan',
]

const FORM_INITIAL = { gouvernorat: '', poids_min: '', poids_max: '', prix: '', delai_jours: '' }

// ─────────────────────────────────────────
// CONFIRM DELETE MODAL
// ─────────────────────────────────────────
function ConfirmDeleteModal({ tarif, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: '#fef2f2', margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={22} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
            Supprimer ce tarif ?
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            Gouvernorat : <strong>{tarif.gouvernorat}</strong>
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {tarif.poids_min}–{tarif.poids_max} kg · <strong>{tarif.prix} TND</strong>
          </p>
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>
            Cette action est irréversible.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// TARIF CARD (list item)
// ─────────────────────────────────────────
function TarifCard({ tarif, onDelete }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
      gap: 0,
      alignItems: 'center',
      padding: '13px 18px',
      borderBottom: '1px solid var(--border-light)',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Gouvernorat */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'rgba(30,77,123,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <MapPin size={13} style={{ color: 'var(--accent)' }} />
        </div>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{tarif.gouvernorat}</span>
      </div>

      {/* Poids */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Weight size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {tarif.poids_min} – {tarif.poids_max} kg
        </span>
      </div>

      {/* Prix */}
      <div>
        <span style={{
          fontSize: 15, fontWeight: 700, color: 'var(--navy-800)',
          fontFamily: 'var(--font-display)',
        }}>
          {tarif.prix}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>TND</span>
      </div>

      {/* Délai */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {tarif.delai_jours} j
        </span>
      </div>

      {/* Action */}
      <button
        onClick={() => onDelete(tarif)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '5px',
          borderRadius: 6, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function Tarifs() {
  const { toasts, toast, removeToast } = useToast()
  const [tarifs, setTarifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [form, setForm] = useState(FORM_INITIAL)
  const [formErrors, setFormErrors] = useState({})
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterGov, setFilterGov] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const load = async () => {
    setLoading(true)
    try {
    const res = await tarifsApi.list()
      setTarifs(res.data)
    } catch {
      toast('Impossible de charger les tarifs.', 'error')
      setTarifs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const validate = () => {
    const errors = {}
    if (!form.gouvernorat) errors.gouvernorat = 'Requis'
    if (!form.poids_min || isNaN(form.poids_min) || parseFloat(form.poids_min) <= 0)
      errors.poids_min = 'Doit être > 0'
    if (!form.poids_max || isNaN(form.poids_max) || parseFloat(form.poids_max) <= 0)
      errors.poids_max = 'Doit être > 0'
    if (form.poids_min && form.poids_max && parseFloat(form.poids_min) >= parseFloat(form.poids_max))
      errors.poids_max = 'Doit être > poids min'
    if (!form.prix || isNaN(form.prix) || parseFloat(form.prix) < 0)
      errors.prix = 'Doit être ≥ 0'
    return errors
  }

  const handleAdd = async () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setAdding(true)
    try {
      const payload = {
        gouvernorat: form.gouvernorat,
        poids_min: parseFloat(form.poids_min),
        poids_max: parseFloat(form.poids_max),
        prix: parseFloat(form.prix),
        delai_jours: form.delai_jours ? parseInt(form.delai_jours) : 3,
      }
      await tarifsApi.create(payload)
      toast('Tarif ajouté avec succès.', 'success')
      setForm(FORM_INITIAL)
      setShowTable(true)
      load()
    } catch (err) {
      const errors = err.response?.data || {}
      const msg = typeof errors === 'object'
        ? Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
        : 'Erreur lors de l\'ajout.'
      toast(msg, 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await tarifsApi.delete(deleteTarget.id)
      toast('Tarif supprimé.', 'success')
      setDeleteTarget(null)
      load()
    } catch {
      toast('Erreur lors de la suppression.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = filterGov
    ? tarifs.filter(t => t.gouvernorat === filterGov)
    : tarifs

  const InputField = ({ label, name, type = 'number', placeholder, icon: Icon }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon size={12} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
        )}
        <input
          className="form-input"
          type={type}
          step={type === 'number' ? '0.001' : undefined}
          min="0"
          placeholder={placeholder}
          value={form[name]}
          onChange={set(name)}
          style={{
            paddingLeft: Icon ? 28 : undefined, fontSize: 13,
            border: formErrors[name] ? '1.5px solid #ef4444' : undefined,
          }}
        />
      </div>
      {formErrors[name] && (
        <span style={{ fontSize: 11, color: '#ef4444' }}>{formErrors[name]}</span>
      )}
    </div>
  )

  return (
    <div className="animate-fade-up">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Grille tarifaire
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {loading ? 'Chargement...' : `${tarifs.length} tarif${tarifs.length > 1 ? 's' : ''} configuré${tarifs.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ADD FORM — Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(30,77,123,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Ajouter un tarif</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Définissez un tarif par gouvernorat et tranche de poids
            </div>
          </div>
        </div>

        {/* Form grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'start' }}>

          {/* Gouvernorat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Gouvernorat *
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={12} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <select
                className="form-select"
                value={form.gouvernorat}
                onChange={set('gouvernorat')}
                style={{
                  paddingLeft: 28, fontSize: 13,
                  border: formErrors.gouvernorat ? '1.5px solid #ef4444' : undefined,
                }}
              >
                <option value="">Choisir...</option>
                {GOUVERNORATS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {formErrors.gouvernorat && (
              <span style={{ fontSize: 11, color: '#ef4444' }}>{formErrors.gouvernorat}</span>
            )}
          </div>

          <InputField label="Poids min (kg) *" name="poids_min" placeholder="0.5" icon={Weight} />
          <InputField label="Poids max (kg) *" name="poids_max" placeholder="5.0" icon={Weight} />
          <InputField label="Prix (TND) *" name="prix" placeholder="8.000" icon={DollarSign} />
          <InputField label="Délai (jours)" name="delai_jours" placeholder="3" icon={Clock} />

          {/* Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'transparent', userSelect: 'none' }}>_</label>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={adding}
              style={{ justifyContent: 'center', height: 42 }}
            >
              {adding ? <span className="spinner" /> : <><Plus size={14} /> Ajouter</>}
            </button>
          </div>
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 14, padding: '9px 12px',
          background: 'rgba(30,77,123,0.04)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <Info size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Le délai par défaut est de 3 jours si non renseigné.
          Les prix sont affichés en TND (dinars tunisiens).
        </div>
      </div>

      {/* TABLE TOGGLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table header with toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: showTable ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
        }} onClick={() => setShowTable(s => !s)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Mes tarifs
            </span>
            {tarifs.length > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
              }}>
                {tarifs.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showTable && tarifs.length > 0 && (
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                value={filterGov}
                onChange={e => { e.stopPropagation(); setFilterGov(e.target.value) }}
                onClick={e => e.stopPropagation()}
              >
                <option value="">Tous gouvernorats</option>
                {[...new Set(tarifs.map(t => t.gouvernorat))].sort().map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
            {showTable ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
                       : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>

        {showTable && (
          loading ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : tarifs.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 20px' }}>
              <DollarSign size={36} style={{ opacity: 0.2 }} />
              <h3>Aucun tarif configuré</h3>
              <p>Ajoutez vos premiers tarifs via le formulaire ci-dessus.</p>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                gap: 0, padding: '8px 18px',
                background: 'var(--bg3)',
                borderBottom: '1px solid var(--border)',
              }}>
                {['Gouvernorat', 'Poids', 'Prix', 'Délai', ''].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    ...(i === 4 ? { width: 30 } : {}),
                  }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Aucun tarif pour ce gouvernorat.
                  </p>
                </div>
              ) : (
                filtered.map(t => (
                  <TarifCard key={t.id} tarif={t} onDelete={setDeleteTarget} />
                ))
              )}

              {/* Summary footer */}
              {tarifs.length > 0 && (
                <div style={{
                  padding: '10px 18px', background: 'var(--bg3)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)',
                }}>
                  <span>
                    {[...new Set(tarifs.map(t => t.gouvernorat))].length} gouvernorat{tarifs.length > 1 ? 's' : ''} couverts
                  </span>
                  <span>·</span>
                  <span>
                    Prix min : <strong>{Math.min(...tarifs.map(t => t.prix))} TND</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Prix max : <strong>{Math.max(...tarifs.map(t => t.prix))} TND</strong>
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Confirm delete modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          tarif={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          loading={deleting}
        />
      )}
    </div>
  )
}