import { useState, useEffect, useCallback } from 'react'
import { Package, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Tag } from 'lucide-react'
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
  standard: 'Standard', express: 'Express',
  jour_j: 'Jour J', nuit: 'Nuit', point_relai: 'Point relais',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ── Composant Pagination ────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Générer les numéros de pages visibles (max 5)
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
      {/* Info + taille de page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {from}–{to} sur <strong>{total}</strong> commandes
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
            {PAGE_SIZE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Boutons navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PageBtn onClick={() => onPageChange(1)}        disabled={page === 1}><ChevronsLeft size={14} /></PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft  size={14} /></PageBtn>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
          ) : (
            <PageBtn
              key={p}
              onClick={() => onPageChange(p)}
              active={p === page}
            >
              {p}
            </PageBtn>
          )
        )}

        <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><ChevronRight  size={14} /></PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)} disabled={page === totalPages}><ChevronsRight size={14} /></PageBtn>
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
        minWidth: 32, height: 32, borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 500,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent, #1E4D7B)' : 'transparent',
        color: active ? '#fff' : disabled ? '#c4c4c4' : 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        padding: '0 6px',
      }}
    >
      {children}
    </button>
  )
}

// ── Modal changement de statut ──────────────────────────────────────────────
function StatutModal({ commande, onClose, onSuccess }) {
  const [statut, setStatut]           = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const transitions = TRANSITIONS[commande.statut] || []

  const submit = async () => {
    if (!statut) return
    setLoading(true); setError('')
    try {
      await entrepriseApi.changerStatut(commande.id, { statut, commentaire })
      onSuccess(); onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du changement de statut.')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Changer le statut</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 0 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Commande <strong style={{ fontFamily: 'monospace' }}>{commande.reference}</strong> — actuellement{' '}
            <span className={`badge ${STATUT_BADGE[commande.statut]}`}>{STATUT_LABEL[commande.statut]}</span>
          </p>
          {transitions.length === 0 ? (
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280' }}>
              Aucune transition possible depuis ce statut.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nouveau statut</label>
                <select className="form-select" value={statut} onChange={e => setStatut(e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {transitions.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire (optionnel)</label>
                <textarea className="form-textarea" rows={3} value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Ex : Livré au gardien..." />
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={loading || !statut}>
                  {loading ? <span className="spinner" /> : 'Confirmer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function CommandesEntreprise() {
  const [commandes, setCommandes]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [selected, setSelected]       = useState(null)
  const [retourTarget, setRetourTarget] = useState(null)

  // ── Pagination ──
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtreStatut) params.statut = filtreStatut
      if (search)       params.search = search
      const res = await entrepriseApi.commandes(params)
      setCommandes(res.data)
      setPage(1) // reset page quand filtre change
    } catch {
      setCommandes([])
    } finally {
      setLoading(false)
    }
  }, [filtreStatut, search])

  useEffect(() => { load() }, [load])

  // ── Pagination côté client ──
  const total      = commandes.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated  = commandes.slice((page - 1) * pageSize, page * pageSize)

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
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
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

      {/* Tableau */}
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
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Destinataire</th>
                  <th>Adresse</th>
                  <th>Gouvernorat</th>
                  <th>Colis</th>
                  <th>Montant</th>
                  <th>Type</th>
                  <th>Date</th>
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
                    <td style={{ fontWeight: 500 }}>{c.dest_nom} {c.dest_prenom}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.dest_adresse}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.dest_gouvernorat}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{c.nombre_colis}</td>
                    <td style={{ fontWeight: 600 }}>{c.montant_a_collecter} TND</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{TYPES_LIVRAISON[c.type_livraison] || c.type_livraison}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[c.statut] || 'badge-warning'}`}>
                        {STATUT_LABEL[c.statut] || c.statut}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>

                      {/* 🔁 Changer statut */}
                      {TRANSITIONS[c.statut]?.length > 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelected(c)}
                        >
                          Statut
                        </button>
                      )}

                      {/* ⚠️ Déclarer retour */}
                      {['prise_charge', 'en_transit'].includes(c.statut) && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => setRetourTarget(c)}
                        >
                          Retour
                        </button>
                      )}

                      {/* 🏷️ Étiquette d'expédition */}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#d97706' }}
                        onClick={() => genererEtiquetteEntreprise(c)}
                        title="Générer et imprimer l'étiquette d'expédition"
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

        {/* ── Pagination ── */}
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

      {selected && (
        <StatutModal commande={selected} onClose={() => setSelected(null)} onSuccess={load} />
      )}

      {retourTarget && (
        <RetourModal commande={retourTarget} onClose={() => setRetourTarget(null)} onSuccess={load} />
      )}
    </div>
  )
}

// ── Générer étiquette d'expédition pour l'entreprise ──
function genererEtiquetteEntreprise(commande) {
  try {
    console.log("Commande complète :", commande)
  console.log("Prix livraison :", commande.prix_livraison)
    const dateActuelle = new Date()
    const prixLivraison = parseFloat(commande.prix_livraison) || 0
    const montantArticle = parseFloat(commande.montant_a_collecter) || 0
    const total = montantArticle + prixLivraison
    
    const html = `
              <!DOCTYPE html>
              <html>
              <head>
              <meta charset="UTF-8">
              <title>Étiquette ${commande.reference}</title>

              <style>
                body {
                  font-family: Arial, sans-serif;
                  background: #fff;
                }

                .etiquette {
                  width: 10cm;
                  height: 15cm;
                  border: 2px solid #000;
                  padding: 10px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }

                /* HEADER */
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #000;
                  padding-bottom: 5px;
                }

                .logo {
                  font-weight: bold;
                  font-size: 12px;
                }

                .type {
                  font-size: 11px;
                  font-weight: bold;
                  color: ${commande.type_livraison === 'express' ? 'red' : 'black'};
                }

                /* REFERENCE */
                .reference {
                  text-align: center;
                  font-size: 20px;
                  font-weight: bold;
                  border: 2px solid #000;
                  padding: 6px;
                  margin: 8px 0;
                }

                /* DESTINATAIRE */
                .bloc {
                  margin: 6px 0;
                }

                .title {
                  font-size: 10px;
                  font-weight: bold;
                  border-bottom: 1px solid #000;
                  margin-bottom: 2px;
                }

                .nom {
                  font-size: 13px;
                  font-weight: bold;
                }

                .tel {
                  font-size: 12px;
                }

                .adresse {
                  font-size: 11px;
                }

                /* GOUVERNORAT */
                .zone {
                  text-align: center;
                  font-size: 14px;
                  font-weight: bold;
                  border: 2px dashed #000;
                  padding: 4px;
                  margin: 6px 0;
                }

                /* INFOS COLIS */
                .infos {
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                }

                /* PRIX */
                .prix {
                  border-top: 2px solid #000;
                  margin-top: 6px;
                  padding-top: 6px;
                  font-size: 12px;
                }

                .row {
                  display: flex;
                  justify-content: space-between;
                }

                .total {
                  margin-top: 4px;
                  padding: 4px;
                  background: black;
                  color: white;
                  font-weight: bold;
                }

                /* BARCODE */
                .barcode {
                  text-align: center;
                  font-family: monospace;
                  font-size: 16px;
                  letter-spacing: 2px;
                  border-top: 1px dashed #000;
                  padding-top: 6px;
                }

                /* FOOTER */
                .footer {
                  font-size: 9px;
                  text-align: center;
                  color: #666;
                }

              </style>
              </head>

              <body>

              <div class="etiquette">

                <!-- HEADER -->
                <div class="header">
                  <div class="logo">🚚 DELIVERY</div>
                  <div class="type">${commande.type_livraison.toUpperCase()}</div>
                </div>

                <!-- REFERENCE -->
                <div class="reference">${commande.reference}</div>

                <!-- ZONE -->
                <div class="zone">${commande.dest_gouvernorat}</div>

                <!-- DESTINATAIRE -->
                <div class="bloc">
                  <div class="title">DESTINATAIRE</div>
                  <div class="nom">${commande.dest_nom} ${commande.dest_prenom}</div>
                  <div class="tel">${commande.dest_telephone}</div>
                  <div class="adresse">${commande.dest_adresse}</div>
                </div>

                <!-- INFOS -->
                <div class="infos">
                  <div>Colis: <b>${commande.nombre_colis}</b></div>
                  <div>Poids: <b>${commande.poids_total} kg</b></div>
                </div>

                <!-- PRIX -->
                <div class="prix">
                  <div class="row">
                    <span>Article</span>
                    <span>${montantArticle.toFixed(3)} TND</span>
                  </div>
                  <div class="row">
                    <span>Livraison</span>
                    <span>${prixLivraison.toFixed(3)} TND</span>
                  </div>

                  <div class="total row">
                    <span>TOTAL</span>
                    <span>${total.toFixed(3)} TND</span>
                  </div>
                </div>

                <!-- BARCODE -->
                <div class="barcode">*${commande.reference}*</div>

                <!-- FOOTER -->
                <div class="footer">
                  ${dateActuelle.toLocaleDateString('fr-FR')}
                </div>

              </div>

              </body>
              </html>

    `

    // Ouvrir dans une nouvelle fenêtre et imprimer
    const win = window.open('', '_blank', 'width=800,height=600')
    win.document.write(html)
    win.document.close()
    win.focus()
    
    // Attendre que la page se charge puis lancer l'impression
    setTimeout(() => {
      win.print()
    }, 250)
  } catch (err) {
    console.error('Erreur:', err)
    alert("Erreur lors de la génération de l'étiquette d'expédition")
  }
}