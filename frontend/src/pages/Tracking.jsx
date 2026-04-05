import { useState } from 'react'
import { Search, MapPin, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const mockTracking = {
  'COL-001': {
    id: 'COL-001', dest: 'Karim Ben Ali', tel: '+216 22 123 456',
    from: 'Tunis', to: 'Sfax', entreprise: 'SpeedEx TN',
    status: 'livré',
    events: [
      { date: '04/03/2026 17:45', lieu: 'Sfax Centre', desc: 'Colis livré au destinataire', done: true },
      { date: '04/03/2026 14:20', lieu: 'Sfax — Dépôt local', desc: 'En cours de livraison', done: true },
      { date: '04/03/2026 09:00', lieu: 'Sfax — Centre de tri', desc: 'Colis arrivé au centre de tri', done: true },
      { date: '04/03/2026 06:30', lieu: 'Tunis — Départ', desc: 'Colis expédié vers Sfax', done: true },
      { date: '03/03/2026 18:00', lieu: 'Tunis — Dépôt', desc: 'Colis pris en charge', done: true },
    ]
  },
  'COL-002': {
    id: 'COL-002', dest: 'Sonia Trabelsi', tel: '+216 55 987 654',
    from: 'Tunis', to: 'Sousse', entreprise: 'RapidPost',
    status: 'en transit',
    events: [
      { date: '04/03/2026 11:30', lieu: 'Autoroute A1 — En route', desc: 'Colis en transit vers Sousse', done: true, active: true },
      { date: '04/03/2026 09:00', lieu: 'Tunis — Centre de tri', desc: 'Colis traité et expédié', done: true },
      { date: '03/03/2026 19:00', lieu: 'Tunis — Dépôt', desc: 'Colis pris en charge', done: true },
      { date: '-', lieu: 'Sousse — Livraison', desc: 'Livraison prévue aujourd\'hui', done: false },
    ]
  },
}

const statusIcon = {
  'livré': <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
  'en transit': <Truck size={16} style={{ color: 'var(--accent2)' }} />,
  'en attente': <Clock size={16} style={{ color: 'var(--warning)' }} />,
  'retardé': <AlertCircle size={16} style={{ color: 'var(--error)' }} />,
}
const statusBadge = { 'livré': 'badge-success', 'en transit': 'badge-info', 'en attente': 'badge-warning', 'retardé': 'badge-error' }

export default function Tracking() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const search = (e) => {
    e.preventDefault()
    const found = mockTracking[query.toUpperCase().trim()]
    if (found) { setResult(found); setNotFound(false) }
    else { setResult(null); setNotFound(true) }
  }

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h2>Suivi en temps réel</h2>
        <p>Entrez un identifiant de colis pour suivre sa progression</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={search} style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }}
              placeholder="COL-001"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">Suivre</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Essayez : COL-001 ou COL-002</p>
      </div>

      {notFound && (
        <div className="alert alert-error">Aucun colis trouvé avec cet identifiant. Vérifiez votre saisie.</div>
      )}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          {/* Info card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Info colis</h3>
                {statusIcon[result.status]}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>{result.id}</div>
              <span className={`badge ${statusBadge[result.status]}`} style={{ marginBottom: 16 }}>{result.status}</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Destinataire</span>
                  <span>{result.dest}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Téléphone</span>
                  <span>{result.tel}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Trajet</span>
                  <span>{result.from} → {result.to}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Entreprise</span>
                  <span>{result.entreprise}</span>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="card" style={{ background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, flexDirection: 'column', gap: 10, color: 'var(--text-muted)' }}>
              <MapPin size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13 }}>Carte GPS</span>
              <span style={{ fontSize: 11 }}>Intégration disponible</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Historique des événements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {result.events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  {/* Line */}
                  {i < result.events.length - 1 && (
                    <div style={{ position: 'absolute', left: 11, top: 28, bottom: -8, width: 2, background: ev.done ? 'var(--success)' : 'var(--border)', opacity: 0.4 }} />
                  )}
                  {/* Dot */}
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${ev.done ? 'var(--success)' : 'var(--border)'}`, background: ev.active ? 'var(--success)' : ev.done ? 'rgba(71,255,154,0.15)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, zIndex: 1 }}>
                    {ev.done && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: 24, flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{ev.desc}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.lieu}</span>
                      {ev.date !== '-' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.date}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && !notFound && (
        <div className="empty-state">
          <Package />
          <h3>Recherchez un colis</h3>
          <p>Entrez l'identifiant du colis pour voir son suivi détaillé.</p>
        </div>
      )}
    </div>
  )
}
