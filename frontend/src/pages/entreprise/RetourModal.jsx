import { useState } from 'react'
import { retoursApi } from '../../services/api'

export default function RetourModal({ commande, onClose, onSuccess }) {
  const MOTIFS = [
    { value: 'client_absent',    label: 'Client absent' },
    { value: 'injoignable',      label: 'Injoignable' },
    { value: 'refus_client',     label: 'Refus du client' },
    { value: 'adresse_invalide', label: 'Adresse invalide' },
    { value: 'autre',            label: 'Autre' },
  ]

  const [motif, setMotif] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!motif) {
      setError('Veuillez choisir un motif.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await retoursApi.declarer({
        commande_id: commande.id,
        motif,
        commentaire,
      })

      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Erreur lors de la déclaration du retour.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 450, width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Déclarer un retour</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Commande <strong style={{ fontFamily: 'monospace' }}>
            {commande.reference}
          </strong>
        </p>

        {/* Motif */}
        <div className="form-group">
          <label className="form-label">Motif du retour *</label>
          <select
            className="form-select"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          >
            <option value="">-- Choisir un motif --</option>
            {MOTIFS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Commentaire */}
        <div className="form-group">
          <label className="form-label">
            Commentaire (optionnel)
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : Client absent, téléphone éteint..."
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>

          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={submit}
            disabled={loading || !motif}
          >
            {loading ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}