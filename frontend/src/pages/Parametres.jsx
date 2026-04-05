import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'

const SECTEURS = [
  { value: 'mode',         label: 'Mode et Vêtements' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'alimentaire',  label: 'Alimentaire' },
  { value: 'beaute',       label: 'Beauté et Cosmétiques' },
  { value: 'maison',       label: 'Maison et Décoration' },
  { value: 'sport',        label: 'Sport et Loisirs' },
  { value: 'autre',        label: 'Autre' },
]

const ZONES_TUNISIE = [
  'Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte',
  'Béja','Jendouba','Kef','Siliana','Sousse','Monastir','Mahdia',
  'Sfax','Kairouan','Kasserine','Sidi Bouzid','Gabès','Médenine',
  'Tataouine','Gafsa','Tozeur','Kébili',
]

const MODES_LIVRAISON = ['Standard', 'Express', 'Jour J', 'Nuit', 'Point relais']

export default function Parametres() {
  const { user: authUser } = useAuth()

  // ── Infos personnelles ────────────────────────────────────
  const [formInfos, setFormInfos]       = useState({ first_name: '', last_name: '', phone: '' })
  const [loadingInfos, setLoadingInfos] = useState(false)
  const [msgInfos, setMsgInfos]         = useState({ type: '', text: '' })

  // ── Profil vendeur ────────────────────────────────────────
  const [formVendeur, setFormVendeur]       = useState({})
  const [loadingVendeur, setLoadingVendeur] = useState(false)
  const [msgVendeur, setMsgVendeur]         = useState({ type: '', text: '' })

  // ── Profil entreprise ─────────────────────────────────────
  const [formEntreprise, setFormEntreprise]       = useState({})
  const [loadingEntreprise, setLoadingEntreprise] = useState(false)
  const [msgEntreprise, setMsgEntreprise]         = useState({ type: '', text: '' })

  // ── Mot de passe ──────────────────────────────────────────
  const [formPassword, setFormPassword]       = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [msgPassword, setMsgPassword]         = useState({ type: '', text: '' })

  // ── Charger les données au montage ────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await authApi.me()
        setFormInfos({
          first_name: res.data.first_name || '',
          last_name:  res.data.last_name  || '',
          phone:      res.data.phone      || '',
        })
        if (res.data.role === 'vendeur') {
          const vRes = await authApi.getVendeurProfile()
          setFormVendeur(vRes.data)
        } else if (res.data.role === 'entreprise') {
          const eRes = await authApi.getEntrepriseProfile()
          setFormEntreprise(eRes.data)
        }
      } catch {
        setMsgInfos({ type: 'error', text: "Impossible de charger le profil." })
      }
    }
    load()
  }, [])

  // ── Handlers ──────────────────────────────────────────────
  const handleInfos = async (e) => {
    e.preventDefault()
    setLoadingInfos(true)
    setMsgInfos({ type: '', text: '' })
    try {
      await authApi.updateProfile(formInfos)
      setMsgInfos({ type: 'success', text: '✓ Infos personnelles mises à jour.' })
    } catch (err) {
      setMsgInfos({ type: 'error', text: err.response?.data?.detail || "Une erreur est survenue." })
    } finally { setLoadingInfos(false) }
  }

  const handleVendeur = async (e) => {
    e.preventDefault()
    setLoadingVendeur(true)
    setMsgVendeur({ type: '', text: '' })
    try {
      await authApi.updateVendeurProfile(formVendeur)
      setMsgVendeur({ type: 'success', text: '✓ Profil boutique mis à jour.' })
    } catch (err) {
      setMsgVendeur({ type: 'error', text: err.response?.data?.detail || "Une erreur est survenue." })
    } finally { setLoadingVendeur(false) }
  }

  const handleEntreprise = async (e) => {
    e.preventDefault()
    setLoadingEntreprise(true)
    setMsgEntreprise({ type: '', text: '' })
    try {
      await authApi.updateEntrepriseProfile(formEntreprise)
      setMsgEntreprise({ type: 'success', text: '✓ Profil entreprise mis à jour.' })
    } catch (err) {
      setMsgEntreprise({ type: 'error', text: err.response?.data?.detail || "Une erreur est survenue." })
    } finally { setLoadingEntreprise(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (formPassword.new_password !== formPassword.confirm_password) {
      setMsgPassword({ type: 'error', text: "Les mots de passe ne correspondent pas." })
      return
    }
    setLoadingPassword(true)
    setMsgPassword({ type: '', text: '' })
    try {
      await authApi.changePassword(formPassword)
      setMsgPassword({ type: 'success', text: '✓ Mot de passe changé avec succès.' })
      setFormPassword({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      const errors = err.response?.data
      if (errors?.old_password)      setMsgPassword({ type: 'error', text: errors.old_password[0] })
      else if (errors?.new_password) setMsgPassword({ type: 'error', text: errors.new_password[0] })
      else                           setMsgPassword({ type: 'error', text: "Une erreur est survenue." })
    } finally { setLoadingPassword(false) }
  }

  const toggleItem = (field, value) => {
    const list = formEntreprise[field] || []
    const updated = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    setFormEntreprise({ ...formEntreprise, [field]: updated })
  }

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h2>Paramètres</h2>
        <p>Gérez votre profil et vos préférences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Carte : Infos personnelles ── */}
        <div className="card">
          <h3 style={cardTitle}>Mon profil</h3>
          <form onSubmit={handleInfos}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input className="form-input" value={formInfos.first_name}
                  onChange={e => setFormInfos({ ...formInfos, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input className="form-input" value={formInfos.last_name}
                  onChange={e => setFormInfos({ ...formInfos, last_name: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={authUser?.email} disabled
                style={{ background: 'var(--bg3)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>L'email ne peut pas être modifié.</small>
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" placeholder="+216 XX XXX XXX"
                value={formInfos.phone}
                onChange={e => setFormInfos({ ...formInfos, phone: e.target.value })} />
            </div>
            {msgInfos.text && <div className={`alert alert-${msgInfos.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>{msgInfos.text}</div>}
            <button type="submit" className="btn btn-primary" disabled={loadingInfos}>
              {loadingInfos ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        </div>

        {/* ── Carte : Sécurité ── */}
        <div className="card">
          <h3 style={cardTitle}>Sécurité</h3>
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label className="form-label">Mot de passe actuel</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={formPassword.old_password}
                onChange={e => setFormPassword({ ...formPassword, old_password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={formPassword.new_password}
                onChange={e => setFormPassword({ ...formPassword, new_password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={formPassword.confirm_password}
                onChange={e => setFormPassword({ ...formPassword, confirm_password: e.target.value })} required />
            </div>
            {msgPassword.text && <div className={`alert alert-${msgPassword.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>{msgPassword.text}</div>}
            <button type="submit" className="btn btn-secondary" disabled={loadingPassword}>
              {loadingPassword ? "Modification..." : "Changer le mot de passe"}
            </button>
          </form>
        </div>

        {/* ── Carte : Profil boutique (Vendeur seulement) ── */}
        {authUser?.role === 'vendeur' && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={cardTitle}>Ma boutique</h3>
            <form onSubmit={handleVendeur}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom de la boutique</label>
                  <input className="form-input" value={formVendeur.nom_boutique || ''}
                    onChange={e => setFormVendeur({ ...formVendeur, nom_boutique: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Secteur d'activité</label>
                  <select className="form-input" value={formVendeur.secteur || ''}
                    onChange={e => setFormVendeur({ ...formVendeur, secteur: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {SECTEURS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gouvernorat</label>
                  <select className="form-input" value={formVendeur.gouvernorat || ''}
                    onChange={e => setFormVendeur({ ...formVendeur, gouvernorat: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {ZONES_TUNISIE.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Délégation</label>
                  <input className="form-input" value={formVendeur.delegation || ''}
                    onChange={e => setFormVendeur({ ...formVendeur, delegation: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse d'expédition</label>
                <textarea className="form-input" style={{ minHeight: 80 }} value={formVendeur.adresse_expedition || ''}
                  onChange={e => setFormVendeur({ ...formVendeur, adresse_expedition: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Volume mensuel (colis)</label>
                  <input type="number" min="0" className="form-input" value={formVendeur.volume_mensuel || 0}
                    onChange={e => setFormVendeur({ ...formVendeur, volume_mensuel: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Site web (optionnel)</label>
                  <input className="form-input" placeholder="https://..." value={formVendeur.site_web || ''}
                    onChange={e => setFormVendeur({ ...formVendeur, site_web: e.target.value })} />
                </div>
              </div>
              {msgVendeur.text && <div className={`alert alert-${msgVendeur.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>{msgVendeur.text}</div>}
              <button type="submit" className="btn btn-primary" disabled={loadingVendeur}>
                {loadingVendeur ? "Enregistrement..." : "Enregistrer la boutique"}
              </button>
            </form>
          </div>
        )}

        {/* ── Carte : Profil entreprise (Entreprise seulement) ── */}
        {authUser?.role === 'entreprise' && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={cardTitle}>Mon entreprise</h3>
            <form onSubmit={handleEntreprise}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Raison sociale</label>
                  <input className="form-input" value={formEntreprise.raison_sociale || ''}
                    onChange={e => setFormEntreprise({ ...formEntreprise, raison_sociale: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gouvernorat</label>
                  <select className="form-input" value={formEntreprise.gouvernorat || ''}
                    onChange={e => setFormEntreprise({ ...formEntreprise, gouvernorat: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {ZONES_TUNISIE.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Poste du responsable</label>
                  <input className="form-input" value={formEntreprise.responsable_poste || ''}
                    onChange={e => setFormEntreprise({ ...formEntreprise, responsable_poste: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone direct du responsable</label>
                  <input className="form-input" value={formEntreprise.responsable_tel || ''}
                    onChange={e => setFormEntreprise({ ...formEntreprise, responsable_tel: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse du siège</label>
                <textarea className="form-input" style={{ minHeight: 80 }} value={formEntreprise.adresse_siege || ''}
                  onChange={e => setFormEntreprise({ ...formEntreprise, adresse_siege: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre de livreurs</label>
                  <input type="number" min="0" className="form-input" value={formEntreprise.nombre_livreurs || 0}
                    onChange={e => setFormEntreprise({ ...formEntreprise, nombre_livreurs: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacité journalière (colis)</label>
                  <input type="number" min="0" className="form-input" value={formEntreprise.capacite_journaliere || 0}
                    onChange={e => setFormEntreprise({ ...formEntreprise, capacite_journaliere: parseInt(e.target.value) })} />
                </div>
              </div>

              {/* Zones de couverture */}
              <div className="form-group">
                <label className="form-label">Zones de couverture</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '12px', background: 'var(--bg3)', borderRadius: 8 }}>
                  {ZONES_TUNISIE.map(zone => (
                    <label key={zone} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={(formEntreprise.zones_couverture || []).includes(zone)}
                        onChange={() => toggleItem('zones_couverture', zone)} />
                      {zone}
                    </label>
                  ))}
                </div>
              </div>

              {/* Modes de livraison */}
              <div className="form-group">
                <label className="form-label">Modes de livraison</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px', background: 'var(--bg3)', borderRadius: 8 }}>
                  {MODES_LIVRAISON.map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={(formEntreprise.modes_livraison || []).includes(mode)}
                        onChange={() => toggleItem('modes_livraison', mode)} />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>

              {msgEntreprise.text && <div className={`alert alert-${msgEntreprise.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>{msgEntreprise.text}</div>}
              <button type="submit" className="btn btn-primary" disabled={loadingEntreprise}>
                {loadingEntreprise ? "Enregistrement..." : "Enregistrer l'entreprise"}
              </button>
            </form>
          </div>
        )}

        {/* ── Carte : Infos compte ── */}
        <div className="card">
          <h3 style={{ ...cardTitle, marginBottom: 4 }}>Compte</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Rôle : <strong style={{ color: 'var(--accent)' }}>{authUser?.role}</strong>
          </p>
          <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Email vérifié : {authUser?.is_email_verified ? '✓ Oui' : '✗ Non'}
          </div>
          <button className="btn btn-danger">Supprimer mon compte</button>
        </div>

      </div>
    </div>
  )
}

const cardTitle = {
  fontFamily: 'var(--font-display)',
  fontSize: 17,
  fontWeight: 700,
  marginBottom: 20,
}