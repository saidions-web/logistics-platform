import { useState, useEffect } from 'react'
import { Bell, Mail, Phone, BellOff, CheckCircle, XCircle,
         Send, RefreshCw, AlertTriangle } from 'lucide-react'
import api from '../services/api'

const notifApi = {
  getConfig:  ()     => api.get('/notifications-client/config/'),
  saveConfig: (data) => api.post('/notifications-client/config/', data),
  getJournal: ()     => api.get('/notifications-client/'),
  tester:     (commande_id) => api.post('/notifications-client/tester/', { commande_id }),
}

const CANAL_OPTIONS = [
  { value: 'email', label: 'Email uniquement',  icon: Mail,    color: '#1E4D7B' },
  { value: 'sms',   label: 'SMS uniquement',    icon: Phone,   color: '#16a34a' },
  { value: 'both',  label: 'Email + SMS',       icon: Bell,    color: '#7C3AED' },
]

const STATUT_CONFIG = {
  envoye:  { label: 'Envoyé',  icon: CheckCircle, color: '#16a34a', badge: 'badge-success' },
  echoue:  { label: 'Échoué', icon: XCircle,     color: '#ef4444', badge: 'badge-error'   },
  simule:  { label: 'Simulé',  icon: AlertTriangle,color: '#d97706', badge: 'badge-warning' },
}

const CANAL_BADGE = {
  email: { label: 'Email', color: '#1E4D7B' },
  sms:   { label: 'SMS',   color: '#16a34a' },
  both:  { label: 'E+SMS', color: '#7C3AED' },
}

export default function NotificationsConfig() {
  // Config
  const [canal, setCanal]               = useState('both')
  const [modeleEmail, setModeleEmail]   = useState('')
  const [modeleSms, setModeleSms]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveOk, setSaveOk]             = useState(false)

  // Journal
  const [journal, setJournal]           = useState([])
  const [loadingJ, setLoadingJ]         = useState(true)

  // Test
  const [testId, setTestId]             = useState('')
  const [testing, setTesting]           = useState(false)
  const [testResult, setTestResult]     = useState(null)

  // Charger config
  useEffect(() => {
    notifApi.getConfig().then(r => {
      setCanal(r.data.canal || 'both')
      setModeleEmail(r.data.modele_email || '')
      setModeleSms(r.data.modele_sms || '')
    }).catch(() => {})
  }, [])

  // Charger journal
  const loadJournal = async () => {
    setLoadingJ(true)
    try {
      const r = await notifApi.getJournal()
      setJournal(r.data)
    } catch { setJournal([]) }
    finally { setLoadingJ(false) }
  }

  useEffect(() => { loadJournal() }, [])

  // Sauvegarder config
  const handleSave = async () => {
    setSaving(true); setSaveOk(false)
    try {
      await notifApi.saveConfig({ canal, modele_email: modeleEmail, modele_sms: modeleSms })
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch { } finally { setSaving(false) }
  }

  // Test manuel
  const handleTest = async () => {
    if (!testId) return
    setTesting(true); setTestResult(null)
    try {
      const r = await notifApi.tester(parseInt(testId))
      setTestResult({ ok: true, msg: 'Notification envoyée ✅' })
      loadJournal()
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.detail || 'Erreur envoi.' })
    } finally { setTesting(false) }
  }

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy-900)' }}>
          Notifications client final
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Configurez comment vos clients sont informés de l'avancement de leurs livraisons
        </p>
      </div>

      {/* ── US-33 : Config canal ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
          Canal de notification
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {CANAL_OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <div
              key={value}
              onClick={() => setCanal(value)}
              style={{
                padding: '16px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${canal === value ? color : 'var(--border)'}`,
                background: canal === value ? `${color}08` : 'var(--bg3)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: canal === value ? 700 : 500, color: canal === value ? color : 'var(--text)' }}>
                {label}
              </div>
              {canal === value && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              )}
            </div>
          ))}
        </div>

        {/* Modèle email */}
        {(canal === 'email' || canal === 'both') && (
          <div className="form-group">
            <label className="form-label">
              Modèle email personnalisé
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                Variables : {'{reference}'}, {'{lien_suivi}'}
              </span>
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              value={modeleEmail}
              onChange={e => setModeleEmail(e.target.value)}
              placeholder="Laissez vide pour utiliser le modèle par défaut.&#10;&#10;Ex : Bonjour, votre commande {reference} est en livraison. Suivez-la ici : {lien_suivi}"
            />
          </div>
        )}

        {/* Modèle SMS */}
        {(canal === 'sms' || canal === 'both') && (
          <div className="form-group">
            <label className="form-label">
              Modèle SMS personnalisé
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                Max 160 caractères · Variables : {'{reference}'}, {'{lien_suivi}'}
              </span>
            </label>
            <textarea
              className="form-textarea"
              rows={2}
              maxLength={160}
              value={modeleSms}
              onChange={e => setModeleSms(e.target.value)}
              placeholder="Ex : LogiSync : Commande {reference} en livraison. Suivi : {lien_suivi}"
            />
            <div style={{ fontSize: 11, color: modeleSms.length > 140 ? '#ef4444' : 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
              {modeleSms.length}/160 caractères
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Enregistrer la configuration'}
          </button>
          {saveOk && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle size={15} /> Sauvegardé
            </div>
          )}
        </div>
      </div>

      {/* ── Test manuel ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Tester l'envoi
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Envoyez une notification de test pour vérifier votre configuration.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input
            className="form-input"
            style={{ width: 200 }}
            placeholder="ID de commande"
            value={testId}
            onChange={e => setTestId(e.target.value)}
            type="number"
          />
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !testId}>
            <Send size={14} /> {testing ? 'Envoi...' : 'Envoyer test'}
          </button>
        </div>
        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 12 }}>
            {testResult.msg}
          </div>
        )}
      </div>

      {/* ── US-34 : Journal des notifications ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
            Journal des notifications envoyées
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={loadJournal} disabled={loadingJ}>
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>

        <div className="table-wrapper">
          {loadingJ ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : journal.length === 0 ? (
            <div className="empty-state">
              <BellOff />
              <h3>Aucune notification envoyée</h3>
              <p>Les notifications apparaîtront ici dès qu'une commande passera en livraison.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Canal</th>
                  <th>Destinataire</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Erreur</th>
                </tr>
              </thead>
              <tbody>
                {journal.map(n => {
                  const sc = STATUT_CONFIG[n.statut] || STATUT_CONFIG.echoue
                  const cc = CANAL_BADGE[n.canal]
                  const Icon = sc.icon
                  return (
                    <tr key={n.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'rgba(30,77,123,0.07)', padding: '2px 7px', borderRadius: 5 }}>
                          {n.commande_reference}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: cc?.color, background: `${cc?.color}14`, padding: '2px 8px', borderRadius: 12 }}>
                          {cc?.label || n.canal}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.destinataire}</td>
                      <td>
                        <span className={`badge ${sc.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon size={11} /> {sc.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(n.envoye_le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 12, color: '#ef4444', maxWidth: 200 }}>
                        {n.erreur || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}