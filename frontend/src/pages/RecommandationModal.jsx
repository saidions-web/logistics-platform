import { useState, useEffect } from 'react'
import { Star, Zap, Clock, TrendingUp, MapPin, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { recommandationApi } from '../services/api'

// ── Barre de score visuelle ──────────────────────────────
function ScoreBar({ value, color = '#1E4D7B' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 34, textAlign: 'right' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

// ── Carte prestataire ────────────────────────────────────
function CartePrestataire({ score, rang, selectionne, recommande, onChoisir }) {
  const isTop = rang === 0

  return (
    <div style={{
      border: selectionne ? '2px solid #1E4D7B' : isTop ? '2px solid #10b981' : '1px solid #e5e7eb',
      borderRadius: 12, padding: '16px 18px', marginBottom: 12,
      background: selectionne ? '#eff6ff' : isTop ? '#f0fdf4' : '#fff',
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
    }} onClick={() => onChoisir(score.entreprise_id)}>

      {/* Badges */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        {recommande && rang === 0 && (
          <span style={{ fontSize: 11, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
            ⭐ Recommandé
          </span>
        )}
        {selectionne && (
          <span style={{ fontSize: 11, background: '#1E4D7B', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
            ✓ Choisi
          </span>
        )}
      </div>

      {/* Nom + score global */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: isTop ? '#10b98122' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          🚚
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{score.nom}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {score.prix} TND · {score.delai_jours} jour{score.delai_jours > 1 ? 's' : ''} · {score.taux_reussite}% réussite
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', paddingRight: 70 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: isTop ? '#10b981' : '#1E4D7B' }}>
            {Math.round(score.score_total * 100)}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
        </div>
      </div>

      {/* Détail des scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={11} /> Coût (35%)
          </div>
          <ScoreBar value={score.score_cout} color="#1E4D7B" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} /> Taux réussite (30%)
          </div>
          <ScoreBar value={score.score_taux} color="#10b981" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> Délai (20%)
          </div>
          <ScoreBar value={score.score_delai} color="#8b5cf6" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> Zone (15%)
          </div>
          <ScoreBar value={score.score_zone} color="#f59e0b" />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Modal principale Recommandation (US-12, US-13, US-14)
// ════════════════════════════════════════════════════════
export default function RecommandationModal({ commande, onClose, onConfirme }) {
  const [reco, setReco]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [scoring, setScoring]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // Charger ou générer la recommandation
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        // Essayer de récupérer une reco existante
        const res = await recommandationApi.get(commande.id)
        setReco(res.data)
      } catch {
        // Pas encore de reco — on la génère automatiquement
        await lancerScoring()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const lancerScoring = async () => {
    setScoring(true)
    setError('')
    try {
      const res = await recommandationApi.scorer(commande.id)
      setReco(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Aucun prestataire disponible pour cette commande.'
      setError(msg)
    } finally {
      setScoring(false)
    }
  }

  // US-14 — Sélection manuelle
  const handleChoisir = async (entrepriseId) => {
    if (reco?.entreprise_choisie === entrepriseId) return
    setSaving(true)
    setError('')
    try {
      const res = await recommandationApi.choisir(commande.id, { entreprise_id: entrepriseId })
      setReco(res.data)
      setSuccess('Prestataire mis à jour.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la sélection.')
    } finally {
      setSaving(false)
    }
  }

  // Confirmer le choix et fermer
  const handleConfirmer = () => {
    if (onConfirme) onConfirme(reco)
    onClose()
  }

  const choisiId     = reco?.entreprise_choisie
  const recommandeId = reco?.entreprise_recommandee

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, width: '95%' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Recommandation prestataire</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {commande.reference} · {commande.dest_gouvernorat} · {commande.poids_total} kg
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>

          {/* Chargement */}
          {(loading || scoring) && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: 12 }}>
                {scoring ? '⚙️ Calcul du scoring en cours...' : 'Chargement...'}
              </div>
              <div style={{ fontSize: 12 }}>Coût · Délai · Taux de réussite · Zones</div>
            </div>
          )}

          {/* Erreur */}
          {error && !loading && !scoring && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fef2f2', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Succès */}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, color: '#16a34a', fontSize: 13, marginBottom: 12 }}>
              <CheckCircle size={15} /> {success}
            </div>
          )}

          {/* Résultats du scoring */}
          {reco && !loading && !scoring && (
            <>
              {/* Info sélection manuelle */}
              {reco.selection_manuelle && (
                <div style={{ padding: '8px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 14 }}>
                  ✋ Sélection manuelle active — vous avez remplacé la recommandation automatique.
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {reco.scores_details.length} prestataire{reco.scores_details.length > 1 ? 's' : ''} évalué{reco.scores_details.length > 1 ? 's' : ''} — cliquez sur un prestataire pour le sélectionner
              </div>

              {reco.scores_details.map((score, i) => (
                <CartePrestataire
                  key={score.entreprise_id}
                  score={score}
                  rang={i}
selectionne={Number(choisiId) === Number(score.entreprise_id)}
recommande={!reco.selection_manuelle && recommandeId === score.entreprise_id}                  onChoisir={handleChoisir}
                />
              ))}

              {/* Bouton recalculer */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 16 }}
                onClick={lancerScoring}
                disabled={scoring}>
                <RefreshCw size={13} /> Recalculer le scoring
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {reco && !loading && (
          <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleConfirmer}
              disabled={saving || !choisiId}>
              {saving ? 'Enregistrement...' : `Confirmer — ${reco.entreprise_choisie_nom || '...'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}