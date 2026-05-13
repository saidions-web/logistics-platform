import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, RefreshCw, Users, Truck, Phone, Route, Navigation } from 'lucide-react'
import { entrepriseApi } from '../../services/api'

const REFRESH_INTERVAL_MS = 10_000            //intervalle de rafraîchissement des données
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000   //temps maximum pour considérer un livreur "en ligne"

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

//Vérifie si la dernière position GPS est récente (moins de 3 minutes) pour considérer le livreur "en ligne"
function isOnline(livreur) {
  if (!livreur.latitude || !livreur.longitude) return false
  if (!livreur.derniere_maj) return false
  const lastSeen = new Date(livreur.derniere_maj)
  if (isNaN(lastSeen.getTime())) return false        // ✅ Date invalide = offline
  return (Date.now() - lastSeen.getTime()) < ONLINE_THRESHOLD_MS
}
// Formate une date ISO en heure locale "HH:mm"
function formatTime(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Formate une date ISO en âge relatif (ex: "il y a 5 min")
function formatAge(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60)  return `il y a ${diffSec}s`
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`
  return `il y a ${Math.floor(diffSec / 3600)}h`
}

// ── Composant carte (iframe OpenStreetMap) ─────────────────────────────────
function MapView({ livreurs, selected }) {
  const livreur = selected ? livreurs.find(l => l.id === selected) : null
  const livreursAvecGPS = livreurs.filter(l => l.latitude && l.longitude)
// Génère l'URL de l'iframe OpenStreetMap en fonction des positions GPS disponibles
  const getMapSrc = () => {
    if (livreur?.latitude && livreur?.longitude) {
      const lat = parseFloat(livreur.latitude)
      const lng = parseFloat(livreur.longitude)
      const delta = 0.025
      return (
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}` +
        `&layer=mapnik&marker=${lat},${lng}`
      )
    }

    if (livreursAvecGPS.length > 0) {
      const lats = livreursAvecGPS.map(l => parseFloat(l.latitude))
      const lngs = livreursAvecGPS.map(l => parseFloat(l.longitude))
      const minLat = Math.min(...lats) - 0.1
      const maxLat = Math.max(...lats) + 0.1
      const minLng = Math.min(...lngs) - 0.1
      const maxLng = Math.max(...lngs) + 0.1
      return (
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik`
      )
    }

    return 'https://www.openstreetmap.org/export/embed.html?bbox=7.5,30.0,11.5,37.5&layer=mapnik'
  }
// Ouvre la position du livreur sélectionné dans OpenStreetMap dans un nouvel onglet
  const openInOSM = (l) => {
    window.open(
      `https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=16/${l.latitude}/${l.longitude}`,
      '_blank'
    )
  }
// Affiche la carte avec les positions GPS des livreurs, 
// ainsi qu'une liste des livreurs actifs en bas de la carte.
//  Permet de cliquer sur un livreur pour centrer la carte sur sa position
//  et ouvrir dans OSM.
  return (
    <div style={{ position: 'relative', flex: 1, background: '#e8f0f8', borderRadius: 12, overflow: 'hidden', minHeight: 420 }}>
      <iframe
        key={selected || 'all'}
        title="carte-livreurs"
        src={getMapSrc()}
        style={{ width: '100%', height: '100%', border: 'none', minHeight: 420 }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {livreursAvecGPS.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'none',
        }}>
          {livreursAvecGPS.map(l => {
            const online = isOnline(l)
            return (
              <div
                key={l.id}
                style={{
                  background: l.id === selected ? 'var(--accent)' : 'rgba(255,255,255,0.93)',
                  color: l.id === selected ? '#fff' : 'var(--navy-900)',
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  border: `1.5px solid ${online ? '#10b981' : '#f59e0b'}`,
                  pointerEvents: 'auto',
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: online ? '#10b981' : '#f59e0b',
                  animation: online ? 'pulse 2s infinite' : 'none',
                }} />
                <MapPin size={10} />
                {l.nom_complet}
                {/* ✅ Affichage de l'âge de la position */}
                {l.derniere_maj && (
                  <span style={{ opacity: 0.6, fontSize: 10 }}>
                    {formatAge(l.derniere_maj)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {livreursAvecGPS.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.78)',
        }}>
          <MapPin size={42} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 14 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Aucune position GPS active
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', maxWidth: 260 }}>
            Les positions s'affichent automatiquement quand les livreurs utilisent l'application mobile et ont une tournée démarrée.
          </p>
        </div>
      )}

      {livreur?.latitude && (
        <button
          onClick={() => openInOSM(livreur)}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(255,255,255,0.93)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          }}
        >
          <Navigation size={12} /> Ouvrir dans OSM
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

// ── Carte de chaque livreur dans la liste latérale ───────────────────────────
function LivreurCard({ livreur, selected, onClick }) {
  const online = isOnline(livreur)
  const hasGPS = Boolean(livreur.latitude && livreur.longitude)
// Affiche une carte de résumé pour chaque livreur dans la liste, 
// avec son statut, téléphone, véhicule, tournée en cours, et 
// un indicateur de statut GPS (actif/inactif/aucun)

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'rgba(30,77,123,0.05)' : 'var(--bg3)',
        marginBottom: 8, transition: 'all 0.18s',
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
            <Route size={11} />
            {livreur.tournee_reference}
            {livreur.nb_commandes_en_cours > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                · {livreur.nb_commandes_en_cours} restante{livreur.nb_commandes_en_cours > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* ✅ Indicateur GPS avec âge de la position */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 2 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: hasGPS ? (online ? '#16a34a' : '#f59e0b') : '#d1d5db',
            animation: online ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            color: hasGPS ? (online ? '#16a34a' : '#d97706') : 'var(--text-muted)',
            fontWeight: hasGPS ? 600 : 400,
          }}>
            {!hasGPS
              ? 'Aucune position GPS'
              : online
                ? `GPS actif · ${formatAge(livreur.derniere_maj) || ''}`
                : 'GPS inactif'
            }
          </span>
        </div>
        {hasGPS && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {parseFloat(livreur.latitude).toFixed(5)}, {parseFloat(livreur.longitude).toFixed(5)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
// Affiche le suivi GPS des livreurs avec une carte et une liste latérale.
export default function SuiviGPS() {
  const [livreurs, setLivreurs]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [lastUpdate, setLastUpdate]     = useState(null)
  const [filtreStatut, setFiltreStatut] = useState('')
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await entrepriseApi.livreursPositions()
      setLivreurs(res.data)
      setLastUpdate(new Date())
    } catch {
      // Conserver les données précédentes en cas d'erreur
    } finally {
      setLoading(false)
    }
  }, [])
// Charge les données à l'ouverture de la page et met en place un intervalle de rafraîchissement
  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const enTournee   = livreurs.filter(l => l.statut === 'en_tournee')
  const disponibles = livreurs.filter(l => l.statut === 'disponible')
  const avecGPS     = livreurs.filter(l => l.latitude && l.longitude)
  const enLigne     = livreurs.filter(l => isOnline(l))
// Applique le filtre de statut sélectionné sur la liste des livreurs
  const livreursFiltres = filtreStatut
    ? livreurs.filter(l => l.statut === filtreStatut)
    : livreurs
// Affiche la page de suivi GPS avec un header, des KPI, des filtres, une liste de livreurs, et une carte
  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-900)' }}>
            Suivi GPS
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Positions en temps réel · Rafraîchissement {REFRESH_INTERVAL_MS / 1000}s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mis à jour {formatTime(lastUpdate.toISOString())}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw
              size={13}
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'En tournée',     value: enTournee.length,   color: '#3b82f6', icon: Truck      },
          { label: 'Disponibles',    value: disponibles.length, color: '#16a34a', icon: Users      },
          { label: 'GPS enregistré', value: avecGPS.length,     color: '#8b5cf6', icon: MapPin     },
          { label: 'GPS en ligne',   value: enLigne.length,     color: '#10b981', icon: Navigation },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { value: '',           label: `Tous (${livreurs.length})` },
          { value: 'en_tournee', label: `En tournée (${enTournee.length})` },
          { value: 'disponible', label: `Disponibles (${disponibles.length})` },
        ].map(({ value, label }) => (
          <button
            key={value}
            className={`btn btn-sm ${filtreStatut === value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltreStatut(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Layout principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Panneau livreurs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
          }}>
            {livreursFiltres.length} livreur{livreursFiltres.length > 1 ? 's' : ''}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>
                Chargement...
              </p>
            ) : livreursFiltres.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <Users size={24} />
                <p style={{ fontSize: 13 }}>Aucun livreur</p>
              </div>
            ) : (
              livreursFiltres.map(l => (
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
        <MapView livreurs={livreursFiltres} selected={selected} />
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}