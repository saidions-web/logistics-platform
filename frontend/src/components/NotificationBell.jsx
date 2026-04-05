import { useEffect, useState, useRef } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { notificationApi } from '../services/api'
export default function NotificationBell() {
  const [notifs, setNotifs]   = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef              = useRef(null)

  // ─── Chargement des notifications ───
  const load = async () => {
    try {
const res = await notificationApi.list()      
setNotifs(res.data.results || res.data)
    } catch (e) {
      console.error("Erreur notifications", e)
      setNotifs([])
    }
  }

  // ─── Polling toutes les 10 secondes ───
  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  // ─── Fermer le panneau si clic en dehors ───
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // ✅ Champ corrigé : is_read (correspond au modèle Django)
  const unread = notifs.filter(n => !n.is_read).length

  // ─── Marquer une notification comme lue ───
  const markRead = async (id) => {
    try {
await notificationApi.markRead(id)
      setNotifs(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (e) {
      console.error("Erreur markRead", e)
    }
  }

  // ─── Tout marquer comme lu ───
  const markAllRead = async () => {
    setLoading(true)
    try {
await notificationApi.markAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error("Erreur markAllRead", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>

      {/* ─── Bouton cloche ─── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          background: open ? 'var(--bg-hover, #f1f5f9)' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '7px 9px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={18} style={{ color: 'var(--text-muted)' }} />

        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -5,
            right: -5,
            background: '#EF4444',
            color: '#fff',
            borderRadius: '50%',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ─── Panneau déroulant ─── */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 42,
          width: 340,
          background: '#fff',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>

          {/* En-tête */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: '#EF4444',
                  color: '#fff',
                  borderRadius: 20,
                  fontSize: 11,
                  padding: '1px 7px',
                  fontWeight: 600,
                }}>
                  {unread}
                </span>
              )}
            </span>

            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  title="Tout marquer comme lu"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--accent, #1E4D7B)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 6px',
                    borderRadius: 6,
                  }}
                >
                  <CheckCheck size={14} /> Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--text-muted)',
                fontSize: 14,
              }}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border, #f1f5f9)',
                    background: n.is_read ? '#fff' : '#EFF6FF',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Indicateur non lu */}
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: n.is_read ? 'transparent' : '#3B82F6',
                    marginTop: 5,
                    flexShrink: 0,
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: n.is_read ? 500 : 700,
                      fontSize: 13,
                      color: '#1e293b',
                      marginBottom: 3,
                    }}>
                      {n.titre}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  )
}