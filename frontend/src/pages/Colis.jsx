import { useState, useEffect } from 'react'
import { Plus, Search, Package, Pencil, X, Eye, Download, Star,
         ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { commandesApi } from '../services/api'
import { DetailCommandeModal } from './DetailCommande'
import RecommandationModal from './RecommandationModal'

const GOUVERNORATS = [
  'Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte',
  'Béja','Jendouba','Kef','Siliana','Sousse','Monastir','Mahdia',
  'Sfax','Kairouan','Kasserine','Sidi Bouzid','Gabès','Médenine',
  'Tataouine','Gafsa','Tozeur','Kébili',
]

const TYPES_LIVRAISON = [
  { value: 'standard',    label: 'Standard'     },
  { value: 'express',     label: 'Express'      },
  { value: 'jour_j',      label: 'Jour J'       },
  { value: 'nuit',        label: 'Nuit'         },
  { value: 'point_relai', label: 'Point relais' },
]

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

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const newColis = () => ({ description: '', poids: '', fragile: false })

// ════════════════════════════════════════════════════════
// Composant Pagination (inchangé)
// ════════════════════════════════════════════════════════
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const getPages = () => {
    const pages = []
    const delta = 2
    const left  = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages) }
    return pages
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderTop: '1px solid var(--border)',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {from}–{to} sur <strong>{total}</strong> commande{total > 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lignes :</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{
              fontSize: 12, padding: '3px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PageBtn onClick={() => onPageChange(1)}           disabled={page === 1}><ChevronsLeft  size={14} /></PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)}    disabled={page === 1}><ChevronLeft   size={14} /></PageBtn>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
          ) : (
            <PageBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PageBtn>
          )
        )}
        <PageBtn onClick={() => onPageChange(page + 1)}    disabled={page === totalPages}><ChevronRight  size={14} /></PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)}  disabled={page === totalPages}><ChevronsRight size={14} /></PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, borderRadius: 7, fontSize: 13,
        fontWeight: active ? 700 : 500,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent, #1E4D7B)' : 'transparent',
        color: active ? '#fff' : disabled ? '#c4c4c4' : 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', padding: '0 6px',
      }}
    >
      {children}
    </button>
  )
}

// ════════════════════════════════════════════════════════
// Formulaire commande (partagé Créer / Modifier)
// ════════════════════════════════════════════════════════
function CommandeForm({ form, setForm, error, loading, onSubmit, onClose, isEdit }) {
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setColis = (i, k, v) => setForm(f => {
    const updated = [...f.colis]
    updated[i] = { ...updated[i], [k]: v }
    return { ...f, colis: updated }
  })
  const addColis    = () => setForm(f => ({ ...f, colis: [...f.colis, newColis()] }))
  const removeColis = (i) => setForm(f => ({ ...f, colis: f.colis.filter((_, idx) => idx !== i) }))

  return (
    <form onSubmit={onSubmit} style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>

      <div style={st.section}>Destinataire</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nom</label>
          <input className="form-input" placeholder="Nom" required
            value={form.dest_nom} onChange={e => setField('dest_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Prénom</label>
          <input className="form-input" placeholder="Prénom" required
            value={form.dest_prenom} onChange={e => setField('dest_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Téléphone</label>
          <input className="form-input" placeholder="+216 XX XXX XXX" required
            value={form.dest_telephone} onChange={e => setField('dest_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Gouvernorat</label>
          <select className="form-select" value={form.dest_gouvernorat}
            onChange={e => setField('dest_gouvernorat', e.target.value)}>
            {GOUVERNORATS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Adresse complète</label>
        <input className="form-input" placeholder="Rue, numéro, ville..." required
          value={form.dest_adresse} onChange={e => setField('dest_adresse', e.target.value)} />
      </div>

      <div style={st.section}>Livraison</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type de livraison</label>
          <select className="form-select" value={form.type_livraison}
            onChange={e => setField('type_livraison', e.target.value)}>
            {TYPES_LIVRAISON.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Montant à collecter (TND)</label>
          <input className="form-input" type="number" min="0" step="0.001" placeholder="0.000" required
            value={form.montant_a_collecter} onChange={e => setField('montant_a_collecter', e.target.value)} />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Notes / instructions</label>
        <textarea className="form-textarea" placeholder="Instructions spéciales..."
          value={form.notes} onChange={e => setField('notes', e.target.value)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...st.section }}>
        <span>Colis ({form.colis.length})</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addColis}>
          <Plus size={13} /> Ajouter un colis
        </button>
      </div>

      {form.colis.map((c, i) => (
        <div key={i} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Colis #{i + 1}</span>
            {form.colis.length > 1 && (
              <button type="button" onClick={() => removeColis(i)}
                style={{ background: 'none', border: 'none', color: 'var(--danger,#ef4444)', cursor: 'pointer', fontSize: 13 }}>
                Supprimer
              </button>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Ex: Vêtements, Électronique..." required
                value={c.description} onChange={e => setColis(i, 'description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Poids (kg)</label>
              <input className="form-input" type="number" min="0.001" step="0.001" placeholder="1.000" required
                value={c.poids} onChange={e => setColis(i, 'poids', e.target.value)} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={c.fragile}
              onChange={e => setColis(i, 'fragile', e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
            <span className="form-label" style={{ margin: 0 }}>Colis fragile ⚠️</span>
          </label>
        </div>
      ))}

      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
          {loading
            ? (isEdit ? 'Enregistrement...' : 'Création...')
            : (isEdit ? 'Enregistrer les modifications' : 'Créer la commande')
          }
        </button>
      </div>
    </form>
  )
}

// ════════════════════════════════════════════════════════
// Modal Créer
// ════════════════════════════════════════════════════════
function AddCommandeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    dest_nom: '', dest_prenom: '', dest_telephone: '',
    dest_adresse: '', dest_gouvernorat: 'Tunis',
    type_livraison: 'standard', montant_a_collecter: '',
    notes: '', colis: [newColis()],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Dans AddCommandeModal — handleSubmit simplifié
const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    // ✅ Création simple sans recommandation_id
    // Le scoring se fait après via le bouton ⭐
    await commandesApi.create({
      ...form,
      montant_a_collecter: parseFloat(form.montant_a_collecter),
      colis: form.colis.map(c => ({
        ...c,
        poids: parseFloat(c.poids),
      })),
    })

    onCreated()
    onClose()
  } catch (err) {
    const data = err.response?.data || {}
    setError(
      data.detail ||
      Object.values(data).flat().join(' • ') ||
      'Une erreur est survenue.'
    )
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nouvelle commande</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <CommandeForm 
          form={form} 
          setForm={setForm} 
          error={error} 
          loading={loading}
          onSubmit={handleSubmit} 
          onClose={onClose} 
          isEdit={false} 
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Modal Modifier
// ════════════════════════════════════════════════════════
function EditCommandeModal({ commande, onClose, onUpdated }) {
  const [form, setForm] = useState({
    dest_nom:            commande.dest_nom,
    dest_prenom:         commande.dest_prenom,
    dest_telephone:      commande.dest_telephone,
    dest_adresse:        commande.dest_adresse,
    dest_gouvernorat:    commande.dest_gouvernorat,
    type_livraison:      commande.type_livraison,
    montant_a_collecter: commande.montant_a_collecter,
    notes:               commande.notes || '',
    colis: commande.colis?.length
      ? commande.colis.map(c => ({ 
          description: c.description, 
          poids: String(c.poids), 
          fragile: c.fragile 
        }))
      : [newColis()],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await commandesApi.update(commande.id, {
        ...form,
        montant_a_collecter: parseFloat(form.montant_a_collecter),
        colis: form.colis.map(c => ({ 
          ...c, 
          poids: parseFloat(c.poids) 
        })),
      })

      // ✅ Message de succès depuis le backend
      const successMsg = response.data.message || "La commande a été modifiée avec succès !"
      alert(successMsg)
      // toast.success(successMsg)

      onUpdated()
      onClose()
    } catch (err) {
      const data = err.response?.data || {}
      const msg = data.detail || 
                  data.non_field_errors?.[0] ||
                  (typeof data === 'object' ? Object.values(data).flat().join(' • ') : 
                  'Une erreur est survenue lors de la modification.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier — <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{commande.reference}</span></h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          ⚠️ La modification n'est possible que si la commande est encore <strong>En attente</strong>.
        </div>
        <CommandeForm 
          form={form} 
          setForm={setForm} 
          error={error} 
          loading={loading}
          onSubmit={handleSubmit} 
          onClose={onClose} 
          isEdit={true} 
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Modal Annuler
// ════════════════════════════════════════════════════════
function CancelModal({ commande, onClose, onCancelled }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleCancel = async () => {
    setLoading(true)
    try {
      const response = await commandesApi.cancel(commande.id)
      
      const successMsg = response.data.message || "La commande a été annulée avec succès."
      alert(successMsg)
      // toast.success(successMsg)

      onCancelled()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'annuler cette commande.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Annuler la commande</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 0 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            Vous êtes sur le point d'annuler la commande :
          </p>
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
              {commande.reference}
            </div>
            <div style={{ fontSize: 13 }}>{commande.dest_nom} {commande.dest_prenom}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {commande.dest_gouvernorat} — {commande.montant_a_collecter} TND
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--danger,#ef4444)', fontWeight: 500 }}>
            ⚠️ Cette action est irréversible. La commande passera au statut <strong>Annulée</strong>.
          </p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Retour</button>
          <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleCancel} disabled={loading}>
            {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Page principale — Colis
// ════════════════════════════════════════════════════════
export default function Colis() {
  const [commandes, setCommandes]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')

  // Modals
  const [showAdd, setShowAdd]       = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [detailId, setDetailId]     = useState(null)
  const [recoTarget, setRecoTarget] = useState(null)

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchCommandes = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatut !== 'tous') params.statut = filterStatut
      const res = await commandesApi.list(params)
      setCommandes(res.data)
      setPage(1)
    } catch {
      setCommandes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCommandes() }, [filterStatut])

  const filtered = commandes.filter(c => {
    const q = search.toLowerCase()
    return (
      c.reference.toLowerCase().includes(q) ||
      c.dest_nom.toLowerCase().includes(q) ||
      c.dest_prenom.toLowerCase().includes(q) ||
      c.dest_gouvernorat.toLowerCase().includes(q)
    )
  })

  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSearchChange = (val) => { setSearch(val); setPage(1) }
  const handlePageSizeChange = (s) => { setPageSize(s); setPage(1) }

  const canEdit   = (c) => c.statut === 'en_attente'
  const canCancel = (c) => c.statut === 'en_attente'

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const data = filtered.map(c => ({
      'Référence':          c.reference,
      'Nom':                c.dest_nom,
      'Prénom':             c.dest_prenom,
      'Téléphone':          c.dest_telephone,
      'Adresse':            c.dest_adresse || '',
      'Gouvernorat':        c.dest_gouvernorat,
      'Type de livraison':  TYPES_LIVRAISON.find(t => t.value === c.type_livraison)?.label || c.type_livraison,
      'Montant (TND)':      parseFloat(c.montant_a_collecter),
      'Nb colis':           c.nombre_colis,
      'Poids total (kg)':   parseFloat(c.poids_total),
      'Statut':             STATUT_LABEL[c.statut] || c.statut,
      'Notes':              c.notes || '',
      'Date création':      new Date(c.created_at).toLocaleDateString('fr-FR'),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes')
    XLSX.writeFile(wb, `commandes_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="animate-fade-up">

      {/* Modals */}
      {showAdd      && <AddCommandeModal onClose={() => setShowAdd(false)} onCreated={fetchCommandes} />}
      {editTarget   && <EditCommandeModal commande={editTarget} onClose={() => setEditTarget(null)} onUpdated={fetchCommandes} />}
      {cancelTarget && <CancelModal commande={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={fetchCommandes} />}
      {detailId     && <DetailCommandeModal commandeId={detailId} onClose={() => setDetailId(null)} />}
      {recoTarget   && <RecommandationModal commande={recoTarget} onClose={() => setRecoTarget(null)} onConfirme={fetchCommandes} />}

      {/* Header */}
      <div className="page-header">
        <h2>Mes commandes</h2>
        <p>{commandes.length} commande{commandes.length !== 1 ? 's' : ''} au total</p>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }}
            placeholder="Référence, nom, gouvernorat..."
            value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }}
          value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={exportExcel} disabled={filtered.length === 0}>
          <Download size={15} /> Exporter Excel
        </button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Nouvelle commande
        </button>
      </div>

      {/* Tableau + Pagination */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Package />
              <h3>Aucune commande trouvée</h3>
              <p>Modifiez votre recherche ou créez une nouvelle commande.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Destinataire</th>
                  <th>Téléphone</th>
                  <th>Gouvernorat</th>
                  <th>Colis</th>
                  <th>Poids</th>
                  <th>Montant</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'rgba(30,77,123,0.07)', padding: '3px 8px', borderRadius: 5 }}>
                        {c.reference}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.dest_nom} {c.dest_prenom}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.dest_adresse}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.dest_telephone}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.dest_gouvernorat}</td>
                    <td style={{ textAlign: 'center' }}>{c.nombre_colis}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.poids_total} kg</td>
                    <td style={{ fontWeight: 600 }}>{c.montant_a_collecter} TND</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {TYPES_LIVRAISON.find(t => t.value === c.type_livraison)?.label || c.type_livraison}
                    </td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[c.statut] || 'badge-warning'}`}>
                        {STATUT_LABEL[c.statut] || c.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button title="Recommandation prestataire" onClick={() => setRecoTarget(c)}
                          disabled={c.statut !== 'en_attente'}
                          style={{ background: 'none', border: 'none', cursor: c.statut === 'en_attente' ? 'pointer' : 'not-allowed', color: c.statut === 'en_attente' ? '#f59e0b' : 'var(--text-muted)', padding: 4 }}>
                          <Star size={15} />
                        </button>
                        <button title="Voir le détail" onClick={() => setDetailId(c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                          <Eye size={15} />
                        </button>
                        <button title="Modifier" onClick={() => setEditTarget(c)} disabled={!canEdit(c)}
                          style={{ background: 'none', border: 'none', cursor: canEdit(c) ? 'pointer' : 'not-allowed', color: canEdit(c) ? 'var(--accent)' : 'var(--text-muted)', padding: 4 }}>
                          <Pencil size={15} />
                        </button>
                        <button title="Annuler la commande" onClick={() => setCancelTarget(c)} disabled={!canCancel(c)}
                          style={{ background: 'none', border: 'none', cursor: canCancel(c) ? 'pointer' : 'not-allowed', color: canCancel(c) ? 'var(--danger,#ef4444)' : 'var(--text-muted)', padding: 4 }}>
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  )
}

const st = {
  section: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    display: 'block',
  }
}