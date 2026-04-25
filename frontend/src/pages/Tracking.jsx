import { useState } from 'react'
import { Search, Package, Loader, CheckCircle, Truck, Clock, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

const statusIcon = {
  'livree': <CheckCircle size={18} style={{ color: 'var(--success)' }} />,
  'en_transit': <Truck size={18} style={{ color: 'var(--accent2)' }} />,
  'prise_charge': <Truck size={18} style={{ color: 'var(--accent2)' }} />,
  'en_attente': <Clock size={18} style={{ color: 'var(--warning)' }} />,
  'retournee': <AlertCircle size={18} style={{ color: 'var(--error)' }} />,
  'annulee': <AlertCircle size={18} style={{ color: 'var(--error)' }} />,
}

const statusBadge = {
  'livree': 'badge-success',
  'en_transit': 'badge-info',
  'prise_charge': 'badge-info',
  'en_attente': 'badge-warning',
  'retournee': 'badge-error',
  'annulee': 'badge-error',
}

export default function Tracking() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setNotFound(false)
    setError('')
    setResult(null)

    try {
      const res = await axios.get(`${API_BASE_URL}/commandes/suivi/${query.trim().toUpperCase()}/`)
      
      const cmd = res.data

      const transformed = {
        id: cmd.reference,
        dest: `${cmd.dest_nom || ''} ${cmd.dest_prenom || ''}`.trim() || 'Non renseigné',
        tel: cmd.dest_telephone || 'Non renseigné',
        to: cmd.dest_gouvernorat,
        entreprise: cmd.entreprise?.raison_sociale || 'Non assignée',
        status: cmd.statut_label || cmd.statut,
        events: cmd.historique.map((h) => ({
          date: new Date(h.date).toLocaleString('fr-TN'),
          lieu: h.commentaire || cmd.dest_gouvernorat,
          desc: h.statut_label || h.commentaire || `Changement de statut : ${h.nouveau_statut}`,
          done: true
        })).reverse() // Le plus récent en premier
      }

      setResult(transformed)

    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true)
      } else {
        setError("Erreur lors de la récupération du suivi. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h2>Suivi en temps réel</h2>
        <p>Entrez la référence de la commande pour suivre sa progression</p>
      </div>

      {/* Barre de recherche */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={search} style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={15} 
              style={{ 
                position: 'absolute', 
                left: 12, 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              className="form-input"
              style={{ paddingLeft: 36, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }}
              placeholder="CMD-E386F26B"
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !query.trim()}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : 'Suivre'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          Exemple : CMD-E386F26B
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      
      {notFound && (
        <div className="alert alert-error">
          Aucune commande trouvée avec la référence <strong>{query}</strong>
        </div>
      )}

      {/* Résultat du suivi */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          
          {/* Informations du colis */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Informations du colis</h3>
              {statusIcon[result.status?.toLowerCase()] || <Package size={18} />}
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
              {result.id}
            </div>

            <span className={`badge ${statusBadge[result.status?.toLowerCase()] || 'badge-info'}`} style={{ marginBottom: 20 }}>
              {result.status}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>Destinataire</span>
                <span style={{ fontWeight: 500 }}>{result.dest}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>Téléphone</span>
                <span>{result.tel}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>Destination</span>
                <span>{result.to}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>Entreprise</span>
                <span>{result.entreprise}</span>
              </div>
            </div>
          </div>

          {/* Historique des événements */}
          <div className="card">
            <h3 style={{ marginBottom: 24 }}>Historique des événements</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {result.events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: 'var(--success)', 
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ width: 10, height: 10, background: 'white', borderRadius: '50%' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{ev.desc}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                      {ev.lieu} • {ev.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* État vide */}
      {!result && !notFound && !error && (
        <div className="empty-state">
          <Package size={48} strokeWidth={1.5} />
          <h3>Suivi de commande</h3>
          <p>Entrez la référence de la commande pour voir son historique complet.</p>
        </div>
      )}
    </div>
  )
}