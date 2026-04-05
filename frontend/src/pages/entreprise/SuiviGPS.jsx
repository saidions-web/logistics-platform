import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, RefreshCw, Users, Truck, Phone, Route } from 'lucide-react'
import { entrepriseApi } from '../../services/api'

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

// ── Carte livreur (panneau latéral) ─────────────────────────────────────────
function LivreurCard({ livreur, selected, onClick }) {
  const isRecent = livreur.derniere_maj &&
    (new Date() - new Date(livreur.derniere_maj)) < 5 * 60 * 1000 // 5 min

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'rgba(30,77,123,0.05)' : 'var(--bg3)',
        marginBottom: 8, transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{livreur.nom_complet}</div>
        <span className={`badge ${STATUT_BADGE[livreur.statut] || 'badge-warning'}`} style={{ fontSize: 10 }}>
          {STATUT_LABEL[livreur.statut] || livreur.statut}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {livreur.telephone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <Phone size={11} /> {livreur.telephone}
          </div>
        )}
        {livreur.vehicule && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <Truck size={11} /> {livreur.vehicule}
          </div>
        )}
        {livreur.tournee_reference && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}>
            <Route size={11} /> {livreur.tournee_reference}
            {livreur.nb_commandes_en_cours > 0 && ` · ${livreur.nb_commandes_en_cours} colis`}
          </div>
        )}
        {livreur.latitude && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isRecent ? '#16a34a' : '#9ca3af',
              flexShrink: 0,
            }} />
            <span style={{ color: isRecent ? '#16a34a' : 'var(--text-muted)' }}>
              {isRecent ? 'En ligne' : 'Hors ligne'}
            </span>
            {livreur.derniere_maj && (
              <span style={{ color: 'var(--text-muted)' }}>
                — {new Date(livreur.derniere_maj).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Placeholder carte (OpenStreetMap via iframe) ────────────────────────────
function MapView({ livreurs, selected }) {
  const livreur = selected ? livreurs.find(l => l.id === selected) : null

  // Construire URL OpenStreetMap centrée sur le livreur sélectionné
  // ou sur la Tunisie par défaut
  const getMapUrl = () => {
    if (livreur?.latitude && livreur?.longitude) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${livreur.longitude - 0.05},${livreur.latitude - 0.05},${livreur.longitude + 0.05},${livreur.latitude + 0.05}&layer=mapnik&marker=${livreur.latitude},${livreur.longitude}`
    }
    // Vue Tunisie par défaut
    return 'https://www.openstreetmap.org/export/embed.html?bbox=7.5,30.0,11.5,37.5&layer=mapnik'
  }

  return (
    <div style={{ position: 'relative', flex: 1, background: '#e8f0f8', borderRadius: 12, overflow: 'hidden', minHeight: 400 }}>
      <iframe
        title="carte-livreurs"
        src={getMapUrl()}
        style={{ width: '100%', height: '100%', border: 'none', minHeight: 400 }}
        loading="lazy"
      />

      {/* Overlay pins livreurs */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16,
        display: 'flex', gap: 8, flexWrap: 'wrap', pointerEvents: 'none',
      }}>
        {livreurs.filter(l => l.latitude).map(l => (
          <div key={l.id} style={{
            background: l.id === selected ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
            color: l.id === selected ? '#fff' : 'var(--navy-900)',
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <MapPin size={11} /> {l.nom_complet}
          </div>
        ))}
      </div>

      {livreurs.filter(l => l.latitude).length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)',
        }}>
          <MapPin size={40} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
            Aucun livreur avec position GPS active
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Les positions s'affichent automatiquement quand les livreurs utilisent l'app mobile
          </p>
        </div>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function SuiviGPS() {
  const [livreurs, setLivreurs]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await entrepriseApi.livreursPositions()
      setLivreurs(res.data)
      setLastUpdate(new Date())
    } catch {
      setLivreurs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Rafraîchissement automatique toutes les 30 secondes
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const enTournee   = livreurs.filter(l => l.statut === 'en_tournee')
  const disponibles = livreurs.filter(l => l.statut === 'disponible')
  const avecGPS     = livreurs.filter(l => l.latitude)

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Suivi GPS
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Positions en temps réel · Rafraîchissement automatique 30s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'En tournée',    value: enTournee.length,   color: '#3b82f6', icon: Truck  },
          { label: 'Disponibles',   value: disponibles.length, color: '#16a34a', icon: Users  },
          { label: 'Avec GPS actif',value: avecGPS.length,     color: '#8b5cf6', icon: MapPin },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Layout carte + panneau */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, flex: 1 }}>
        {/* Panneau livreurs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {livreurs.length} livreur{livreurs.length > 1 ? 's' : ''}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement...</p>
            ) : livreurs.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <Users size={24} />
                <p style={{ fontSize: 13 }}>Aucun livreur</p>
              </div>
            ) : (
              livreurs.map(l => (
                <LivreurCard
                  key={l.id}
                  livreur={l}
                  selected={selected === l.id}
                  onClick={() => setSelected(selected === l.id ? null : l.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Carte */}
        <MapView livreurs={livreurs} selected={selected} />
      </div>
    </div>
  )
}