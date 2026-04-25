import { useState, useEffect, useCallback } from 'react'
import { Package, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
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
  prise_charge: ['en_transit',   'retournee'],
  en_transit:   ['livree',       'retournee'],
}

const TYPES_LIVRAISON = {
  standard: 'Standard', 
  express: 'Express',
  jour_j: 'Jour J', 
  nuit: 'Nuit', 
  point_relai: 'Point relais',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ── Pagination ─────────────────────────────────────────────────────────────
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
          {from}–{to} sur <strong>{total}</strong> commandes
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lignes :</span>
          <select 
            value={pageSize} 
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onPageChange(1)} disabled={page === 1} style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent' }}>
          <ChevronsLeft size={14} />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent' }}>
          <ChevronLeft size={14} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: 32, height: 32, borderRadius: 7,
                fontWeight: p === page ? 700 : 500,
                background: p === page ? 'var(--accent)' : 'transparent',
                color: p === page ? '#fff' : 'var(--text)',
                border: p === page ? 'none' : '1px solid var(--border)'
              }}
            >
              {p}
            </button>
          )
        )}

        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent' }}>
          <ChevronRight size={14} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent' }}>
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Modal Détails Commande ─────────────────────────────────────────────────
function CommandeDetailModal({ commande, onClose }) {
  if (!commande) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Détails de la commande <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{commande.reference}</span></h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 24, maxHeight: '78vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            
            {/* Destinataire */}
            <div>
              <h4 style={{ marginBottom: 12, color: '#1e40af' }}>Destinataire</h4>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{commande.dest_nom} {commande.dest_prenom}</p>
                <p style={{ color: '#64748b' }}>{commande.dest_telephone}</p>
                <p style={{ marginTop: 8 }}>{commande.dest_adresse}</p>
                <p style={{ fontWeight: 500 }}>{commande.dest_gouvernorat}</p>
              </div>
            </div>

            {/* Boutique du Vendeur */}
            <div>
              <h4 style={{ marginBottom: 12, color: '#1e40af' }}>Boutique du Vendeur</h4>
              {commande.boutique && Object.keys(commande.boutique).length > 0 ? (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 600 }}>{commande.boutique.nom_boutique}</p>
                  <p style={{ color: '#64748b' }}>{commande.vendeur_nom_complet || 'Vendeur inconnu'}</p>
                  <p style={{ marginTop: 4 }}>{commande.boutique.secteur}</p>
                  <p style={{ color: '#64748b' }}>{commande.boutique.gouvernorat}</p>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b' }}>
                  Informations boutique non disponibles
                </div>
              )}
            </div>
          </div>

          {/* Colis */}
          <div style={{ marginTop: 28 }}>
            <h4 style={{ marginBottom: 12, color: '#1e40af' }}>Colis ({commande.nombre_colis || 0})</h4>
            <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {commande.colis && commande.colis.length > 0 ? (
                commande.colis.map((colis, i) => (
                  <div key={i} style={{ padding: '14px 18px', borderBottom: i < commande.colis.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{colis.description}</strong>
                      {colis.fragile && <span style={{ marginLeft: 10, color: '#ef4444' }}> ● Fragile</span>}
                    </div>
                    <div style={{ fontWeight: 600 }}>{colis.poids} kg</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Aucun colis enregistré</div>
              )}
            </div>
          </div>

          {/* Montants */}
          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: '#fefce8', padding: 18, borderRadius: 12 }}>
              <p style={{ color: '#854d0e', fontSize: 13 }}>Montant à collecter</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#854d0e' }}>{commande.montant_a_collecter} TND</p>
            </div>
            <div style={{ flex: 1, background: '#f0fdf4', padding: 18, borderRadius: 12 }}>
              <p style={{ color: '#166534', fontSize: 13 }}>Prix de livraison</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{commande.prix_livraison || 0} TND</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function CommandesEntreprise() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [selected, setSelected] = useState(null)
  const [retourTarget, setRetourTarget] = useState(null)
  const [detailCommande, setDetailCommande] = useState(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)   // 15 lignes par page pour plus de visibilité

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtreStatut) params.statut = filtreStatut
      if (search) params.search = search
      const res = await entrepriseApi.commandes(params)
      setCommandes(res.data || [])
      setPage(1)
    } catch (err) {
      console.error(err)
      setCommandes([])
    } finally {
      setLoading(false)
    }
  }, [filtreStatut, search])

  useEffect(() => { load() }, [load])

  const total = commandes.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated = commandes.slice((page - 1) * pageSize, page * pageSize)

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setPage(1)
  }

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
          Commandes reçues
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Toutes les commandes affectées à votre entreprise
        </p>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Rechercher par référence, nom, téléphone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 180 }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tableau complet sans scroll horizontal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : commandes.length === 0 ? (
            <div className="empty-state">
              <Package />
              <h3>Aucune commande</h3>
              <p>Les commandes affectées à votre entreprise apparaîtront ici.</p>
            </div>
          ) : (
            <table style={{ width: '100%', tableLayout: 'fixed' }}>   {/* tableLayout: 'fixed' pour forcer les largeurs */}
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Référence</th>
                  <th style={{ width: '10%' }}>Client</th>
                  <th style={{ width: '15%' }}>Adresse</th>
                  <th style={{ width: '14%' }}>Gouvernorat</th>
                  <th style={{ width: '10%' }}>Montant</th>
                  <th style={{ width: '10%' }}>Date</th>
                  <th style={{ width: '15%' }}>Statut</th>
                  <th style={{ width: '30%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => setDetailCommande(c)}
                    style={{ cursor: 'pointer' }}
                    className="hover-row"
                  >
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'rgba(30,77,123,0.07)', padding: '3px 8px', borderRadius: 5 }}>
                        {c.reference}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.dest_nom} {c.dest_prenom}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.dest_adresse}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.dest_gouvernorat}</td>
                    <td style={{ fontWeight: 600 }}>{c.montant_a_collecter} TND</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[c.statut] || 'badge-warning'}`}>
                        {STATUT_LABEL[c.statut] || c.statut}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      {TRANSITIONS[c.statut]?.length > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(c)}>Statut</button>
                      )}

                      {['prise_charge', 'en_transit'].includes(c.statut) && (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: '#ef4444' }} 
                          onClick={() => setRetourTarget(c)}
                        >
                          Retour
                        </button>
                      )}

                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: '#d97706' }} 
                        onClick={(e) => { e.stopPropagation(); genererEtiquetteEntreprise(c); }}
                      >
                        Étiquette
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && commandes.length > 0 && (
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

      {/* Modals */}
      {selected && <StatutModal commande={selected} onClose={() => setSelected(null)} onSuccess={load} />}
      {retourTarget && <RetourModal commande={retourTarget} onClose={() => setRetourTarget(null)} onSuccess={load} />}
      {detailCommande && <CommandeDetailModal commande={detailCommande} onClose={() => setDetailCommande(null)} />}
    </div>
  )
}