import { useState, useEffect } from 'react'
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
  'Tataouine','Gafsa','Tozeur','Kébili'
]

const MODES_LIVRAISON = ['Standard','Express','Jour J','Nuit','Point relais']

export default function Profile() {
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('infos')

  const [formInfos, setFormInfos]             = useState({ first_name: '', last_name: '', phone: '' })
  const [loadingInfos, setLoadingInfos]       = useState(false)
  const [msgInfos, setMsgInfos]               = useState({ type: '', text: '' })

  const [formVendeur, setFormVendeur]         = useState({})
  const [loadingVendeur, setLoadingVendeur]   = useState(false)
  const [msgVendeur, setMsgVendeur]           = useState({ type: '', text: '' })

  const [formEntreprise, setFormEntreprise]       = useState({})
  const [loadingEntreprise, setLoadingEntreprise] = useState(false)
  const [msgEntreprise, setMsgEntreprise]         = useState({ type: '', text: '' })

  const [formPassword, setFormPassword]       = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [msgPassword, setMsgPassword]         = useState({ type: '', text: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authApi.me()
        setUser(res.data)
        setFormInfos({ first_name: res.data.first_name || '', last_name: res.data.last_name || '', phone: res.data.phone || '' })
        if (res.data.role === 'vendeur') {
          const vRes = await authApi.getVendeurProfile()
          setFormVendeur(vRes.data)
        } else if (res.data.role === 'entreprise') {
          const eRes = await authApi.getEntrepriseProfile()
          setFormEntreprise(eRes.data)
        }
      } catch {
        setMsgInfos({ type: 'error', text: "Impossible de charger le profil." })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleInfos = async (e) => {
    e.preventDefault()
    setLoadingInfos(true)
    setMsgInfos({ type: '', text: '' })
    try {
      await authApi.updateProfile(formInfos)
      setUser(prev => ({ ...prev, ...formInfos }))
      setMsgInfos({ type: 'success', text: '✅ Infos personnelles mises à jour.' })
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
      setMsgVendeur({ type: 'success', text: '✅ Profil boutique mis à jour.' })
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
      setMsgEntreprise({ type: 'success', text: '✅ Profil entreprise mis à jour.' })
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
      setMsgPassword({ type: 'success', text: '✅ Mot de passe changé avec succès.' })
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

  if (loading) return <div style={st.loading}>Chargement du profil...</div>

  const tabs = [
    { key: 'infos',      label: '👤 Infos personnelles' },
    ...(user?.role === 'vendeur'    ? [{ key: 'boutique',    label: '🏪 Ma boutique' }]    : []),
    ...(user?.role === 'entreprise' ? [{ key: 'entreprise',  label: '🏢 Mon entreprise' }]  : []),
    { key: 'password',   label: '🔒 Mot de passe' },
  ]

  return (
    <div style={st.container}>

      {/* En-tête */}
      <div style={st.header}>
        <div style={st.avatar}>
          {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 style={st.name}>{user?.first_name} {user?.last_name}</h2>
          <span style={st.roleBadge}>{user?.role}</span>
        </div>
      </div>

      {/* Onglets */}
      <div style={st.tabs}>
        {tabs.map(tab => (
          <button key={tab.key}
            style={{ ...st.tab, ...(activeTab === tab.key ? st.tabActive : {}) }}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Infos personnelles ─── */}
      {activeTab === 'infos' && (
        <form onSubmit={handleInfos} style={st.form}>
          <Field label="Email">
            <input style={{ ...st.input, background: '#f5f5f5', color: '#999' }} value={user?.email} disabled />
            <small style={{ color: '#999' }}>L'email ne peut pas être modifié.</small>
          </Field>
          <div style={st.row}>
            <Field label="Prénom">
              <input style={st.input} value={formInfos.first_name}
                onChange={e => setFormInfos({ ...formInfos, first_name: e.target.value })} />
            </Field>
            <Field label="Nom">
              <input style={st.input} value={formInfos.last_name}
                onChange={e => setFormInfos({ ...formInfos, last_name: e.target.value })} />
            </Field>
          </div>
          <Field label="Téléphone">
            <input style={st.input} value={formInfos.phone} placeholder="+216 XX XXX XXX"
              onChange={e => setFormInfos({ ...formInfos, phone: e.target.value })} />
          </Field>
          <Msg data={msgInfos} />
          <button type="submit" style={st.btn} disabled={loadingInfos}>
            {loadingInfos ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}

      {/* ─── Profil boutique (Vendeur) ─── */}
      {activeTab === 'boutique' && (
        <form onSubmit={handleVendeur} style={st.form}>
          <Field label="Nom de la boutique">
            <input style={st.input} value={formVendeur.nom_boutique || ''}
              onChange={e => setFormVendeur({ ...formVendeur, nom_boutique: e.target.value })} />
          </Field>
          <Field label="Secteur d'activité">
            <select style={st.input} value={formVendeur.secteur || ''}
              onChange={e => setFormVendeur({ ...formVendeur, secteur: e.target.value })}>
              <option value="">-- Choisir --</option>
              {SECTEURS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <div style={st.row}>
            <Field label="Gouvernorat">
              <select style={st.input} value={formVendeur.gouvernorat || ''}
                onChange={e => setFormVendeur({ ...formVendeur, gouvernorat: e.target.value })}>
                <option value="">-- Choisir --</option>
                {ZONES_TUNISIE.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Délégation">
              <input style={st.input} value={formVendeur.delegation || ''}
                onChange={e => setFormVendeur({ ...formVendeur, delegation: e.target.value })} />
            </Field>
          </div>
          <Field label="Adresse d'expédition">
            <textarea style={{ ...st.input, minHeight: 80 }} value={formVendeur.adresse_expedition || ''}
              onChange={e => setFormVendeur({ ...formVendeur, adresse_expedition: e.target.value })} />
          </Field>
          <div style={st.row}>
            <Field label="Volume mensuel (colis)">
              <input type="number" min="0" style={st.input} value={formVendeur.volume_mensuel || 0}
                onChange={e => setFormVendeur({ ...formVendeur, volume_mensuel: parseInt(e.target.value) })} />
            </Field>
            <Field label="Site web (optionnel)">
              <input style={st.input} value={formVendeur.site_web || ''} placeholder="https://..."
                onChange={e => setFormVendeur({ ...formVendeur, site_web: e.target.value })} />
            </Field>
          </div>
          <Msg data={msgVendeur} />
          <button type="submit" style={st.btn} disabled={loadingVendeur}>
            {loadingVendeur ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}

      {/* ─── Profil entreprise ─── */}
      {activeTab === 'entreprise' && (
        <form onSubmit={handleEntreprise} style={st.form}>
          <Field label="Raison sociale">
            <input style={st.input} value={formEntreprise.raison_sociale || ''}
              onChange={e => setFormEntreprise({ ...formEntreprise, raison_sociale: e.target.value })} />
          </Field>
          <div style={st.row}>
            <Field label="Gouvernorat">
              <select style={st.input} value={formEntreprise.gouvernorat || ''}
                onChange={e => setFormEntreprise({ ...formEntreprise, gouvernorat: e.target.value })}>
                <option value="">-- Choisir --</option>
                {ZONES_TUNISIE.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Poste du responsable">
              <input style={st.input} value={formEntreprise.responsable_poste || ''}
                onChange={e => setFormEntreprise({ ...formEntreprise, responsable_poste: e.target.value })} />
            </Field>
          </div>
          <Field label="Téléphone direct du responsable">
            <input style={st.input} value={formEntreprise.responsable_tel || ''}
              onChange={e => setFormEntreprise({ ...formEntreprise, responsable_tel: e.target.value })} />
          </Field>
          <Field label="Adresse du siège">
            <textarea style={{ ...st.input, minHeight: 80 }} value={formEntreprise.adresse_siege || ''}
              onChange={e => setFormEntreprise({ ...formEntreprise, adresse_siege: e.target.value })} />
          </Field>
          <div style={st.row}>
            <Field label="Nombre de livreurs">
              <input type="number" min="0" style={st.input} value={formEntreprise.nombre_livreurs || 0}
                onChange={e => setFormEntreprise({ ...formEntreprise, nombre_livreurs: parseInt(e.target.value) })} />
            </Field>
            <Field label="Capacité journalière (colis)">
              <input type="number" min="0" style={st.input} value={formEntreprise.capacite_journaliere || 0}
                onChange={e => setFormEntreprise({ ...formEntreprise, capacite_journaliere: parseInt(e.target.value) })} />
            </Field>
          </div>
          <Field label="Zones de couverture">
            <div style={st.checkGrid}>
              {ZONES_TUNISIE.map(zone => (
                <label key={zone} style={st.checkLabel}>
                  <input type="checkbox"
                    checked={(formEntreprise.zones_couverture || []).includes(zone)}
                    onChange={() => toggleItem('zones_couverture', zone)} />
                  {zone}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Modes de livraison">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {MODES_LIVRAISON.map(mode => (
                <label key={mode} style={st.checkLabel}>
                  <input type="checkbox"
                    checked={(formEntreprise.modes_livraison || []).includes(mode)}
                    onChange={() => toggleItem('modes_livraison', mode)} />
                  {mode}
                </label>
              ))}
            </div>
          </Field>
          <Msg data={msgEntreprise} />
          <button type="submit" style={st.btn} disabled={loadingEntreprise}>
            {loadingEntreprise ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}

      {/* ─── Mot de passe ─── */}
      {activeTab === 'password' && (
        <form onSubmit={handlePassword} style={st.form}>
          <Field label="Mot de passe actuel">
            <input type="password" style={st.input} value={formPassword.old_password} required
              onChange={e => setFormPassword({ ...formPassword, old_password: e.target.value })} />
          </Field>
          <Field label="Nouveau mot de passe">
            <input type="password" style={st.input} value={formPassword.new_password} required
              onChange={e => setFormPassword({ ...formPassword, new_password: e.target.value })} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <input type="password" style={st.input} value={formPassword.confirm_password} required
              onChange={e => setFormPassword({ ...formPassword, confirm_password: e.target.value })} />
          </Field>
          <Msg data={msgPassword} />
          <button type="submit" style={st.btn} disabled={loadingPassword}>
            {loadingPassword ? "Modification..." : "Changer le mot de passe"}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{label}</label>
      {children}
    </div>
  )
}

function Msg({ data }) {
  if (!data?.text) return null
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, fontSize: 14,
      background: data.type === 'success' ? '#f0fdf4' : '#fef2f2',
      color:      data.type === 'success' ? '#16a34a' : '#dc2626',
    }}>
      {data.text}
    </div>
  )
}

const st = {
  container:  { maxWidth: 660, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  loading:    { textAlign: 'center', padding: 40, color: '#666' },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: 20, background: '#f9f9f9', borderRadius: 12 },
  avatar:     { width: 56, height: 56, borderRadius: '50%', background: 'var(--accent, #4F46E5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 },
  name:       { margin: 0, fontSize: 18, fontWeight: 700 },
  roleBadge:  { fontSize: 12, background: '#e0e7ff', color: '#4F46E5', padding: '2px 10px', borderRadius: 20, textTransform: 'capitalize' },
  tabs:       { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #eee', flexWrap: 'wrap' },
  tab:        { padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#666', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive:  { color: 'var(--accent, #4F46E5)', borderBottomColor: 'var(--accent, #4F46E5)', fontWeight: 600 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  row:        { display: 'flex', gap: 16 },
  input:      { padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn:        { padding: 12, background: 'var(--accent, #4F46E5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  checkGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' },
}