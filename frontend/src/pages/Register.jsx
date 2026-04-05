import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../services/api'

const GOUVERNORATS = ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan']
const SECTEURS = [['mode','Mode et Vêtements'],['electronique','Électronique'],['alimentaire','Alimentaire'],['beaute','Beauté et Cosmétiques'],['maison','Maison et Décoration'],['sport','Sport et Loisirs'],['autre','Autre']]
const FORMES = [['sarl','SARL'],['sa','SA'],['suarl','SUARL'],['autre','Autre']]

function VendeurForm({ onSuccess }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', phone: '',
    nom_boutique: '', secteur: 'mode', volume_mensuel: '',
    adresse_expedition: '', gouvernorat: 'Tunis', delegation: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const steps = [
    <>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" placeholder="Prénom" value={form.first_name} onChange={set('first_name')} required /></div>
        <div className="form-group"><label className="form-label">Nom</label><input className="form-input" placeholder="Nom" value={form.last_name} onChange={set('last_name')} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="vous@exemple.com" value={form.email} onChange={set('email')} required /></div>
      <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" placeholder="+216 XX XXX XXX" value={form.phone} onChange={set('phone')} /></div>
      <div className="form-group"><label className="form-label">Mot de passe</label><input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required /></div>
    </>,
    <>
      <div className="form-group"><label className="form-label">Nom de la boutique</label><input className="form-input" placeholder="Ma boutique" value={form.nom_boutique} onChange={set('nom_boutique')} required /></div>
      <div className="form-group"><label className="form-label">Secteur d'activité</label>
        <select className="form-select" value={form.secteur} onChange={set('secteur')}>
          {SECTEURS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Volume mensuel estimé (colis)</label><input className="form-input" type="number" placeholder="100" value={form.volume_mensuel} onChange={set('volume_mensuel')} /></div>
    </>,
    <>
      <div className="form-group"><label className="form-label">Adresse d'expédition</label><textarea className="form-textarea" placeholder="Adresse complète" value={form.adresse_expedition} onChange={set('adresse_expedition')} required /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Gouvernorat</label>
          <select className="form-select" value={form.gouvernorat} onChange={set('gouvernorat')}>
            {GOUVERNORATS.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Délégation</label><input className="form-input" placeholder="Délégation" value={form.delegation} onChange={set('delegation')} required /></div>
      </div>
    </>
  ]

  const next = (e) => { e.preventDefault(); setStep(s => s + 1) }
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.registerVendeur(form)
      onSuccess()
    } catch (err) {
      const d = err.response?.data
      setError(Object.values(d || {}).flat().join(' ') || 'Erreur lors de l\'inscription.')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={step < 2 ? next : submit}>
      <div className="steps">
        {[0,1,2].map(i => <div key={i} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`} />)}
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {steps[step]}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Retour</button>}
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
          {loading ? <span className="spinner" /> : step < 2 ? 'Suivant' : 'Créer mon compte'}
        </button>
      </div>
    </form>
  )
}

function EntrepriseForm({ onSuccess }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    // Compte
    email: '', password: '', first_name: '', last_name: '', phone: '',
    // Infos légales
    raison_sociale: '', forme_juridique: 'sarl', matricule_fiscal: '', annee_creation: '',
    // Siège
    adresse_siege: '', gouvernorat: 'Tunis',
    // ✅ FIX : champs manquants ajoutés
    responsable_nom: '', responsable_prenom: '', responsable_poste: '', responsable_tel: '',
    // Capacités
    nombre_livreurs: '', capacite_journaliere: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const steps = [
    // Étape 1 — Compte
    <>
      <p className="form-section-title" style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Informations du compte</p>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" placeholder="Prénom" value={form.first_name} onChange={set('first_name')} required /></div>
        <div className="form-group"><label className="form-label">Nom</label><input className="form-input" placeholder="Nom" value={form.last_name} onChange={set('last_name')} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="contact@entreprise.com" value={form.email} onChange={set('email')} required /></div>
      <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" placeholder="+216 XX XXX XXX" value={form.phone} onChange={set('phone')} /></div>
      <div className="form-group"><label className="form-label">Mot de passe</label><input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required /></div>
    </>,

    // Étape 2 — Infos légales + siège
    <>
      <p className="form-section-title" style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Informations légales</p>
      <div className="form-group"><label className="form-label">Raison sociale</label><input className="form-input" placeholder="Mon Entreprise SARL" value={form.raison_sociale} onChange={set('raison_sociale')} required /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Forme juridique</label>
          <select className="form-select" value={form.forme_juridique} onChange={set('forme_juridique')}>
            {FORMES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Matricule fiscal</label><input className="form-input" placeholder="1234567/A/B/C" value={form.matricule_fiscal} onChange={set('matricule_fiscal')} required /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Année de création</label><input className="form-input" type="number" placeholder="2020" value={form.annee_creation} onChange={set('annee_creation')} required /></div>
        <div className="form-group"><label className="form-label">Gouvernorat</label>
          <select className="form-select" value={form.gouvernorat} onChange={set('gouvernorat')}>
            {GOUVERNORATS.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      {/* ✅ FIX : adresse_siege manquante ajoutée */}
      <div className="form-group"><label className="form-label">Adresse du siège social</label><textarea className="form-textarea" placeholder="Adresse complète du siège" value={form.adresse_siege} onChange={set('adresse_siege')} required /></div>
    </>,

    // Étape 3 — Responsable + capacités
    <>
      <p className="form-section-title" style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Responsable du compte</p>
      {/* ✅ FIX : champs responsable manquants ajoutés */}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" placeholder="Prénom" value={form.responsable_prenom} onChange={set('responsable_prenom')} required /></div>
        <div className="form-group"><label className="form-label">Nom</label><input className="form-input" placeholder="Nom" value={form.responsable_nom} onChange={set('responsable_nom')} required /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Poste</label><input className="form-input" placeholder="Directeur, Gérant..." value={form.responsable_poste} onChange={set('responsable_poste')} required /></div>
        <div className="form-group"><label className="form-label">Tél. direct</label><input className="form-input" placeholder="+216 XX XXX XXX" value={form.responsable_tel} onChange={set('responsable_tel')} required /></div>
      </div>
      <p className="form-section-title" style={{ fontWeight: 600, margin: '16px 0 12px', color: 'var(--text-muted)' }}>Capacités</p>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nb. livreurs</label><input className="form-input" type="number" placeholder="0" value={form.nombre_livreurs} onChange={set('nombre_livreurs')} /></div>
        <div className="form-group"><label className="form-label">Capacité/jour (colis)</label><input className="form-input" type="number" placeholder="0" value={form.capacite_journaliere} onChange={set('capacite_journaliere')} /></div>
      </div>
    </>
  ]

  const next = (e) => { e.preventDefault(); setStep(s => s + 1) }
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.registerEntreprise(form)
      onSuccess()
    } catch (err) {
      const d = err.response?.data
      setError(Object.values(d || {}).flat().join(' ') || 'Erreur lors de l\'inscription.')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={step < 2 ? next : submit}>
      {/* Indicateur d'étapes */}
      <div className="steps">
        {[0,1,2].map(i => <div key={i} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`} />)}
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {steps[step]}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Retour</button>}
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
          {loading ? <span className="spinner" /> : step < 2 ? 'Suivant' : 'Envoyer la demande'}
        </button>
      </div>
    </form>
  )
}

export default function Register() {
  const [tab, setTab] = useState('vendeur')
  const [done, setDone] = useState(false)

  if (done) return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>Compte créé !</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          {tab === 'vendeur'
            ? 'Vérifiez votre email pour activer votre compte.'
            : 'Votre demande a été envoyée. L\'admin validera votre compte.'}
        </p>
        <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Se connecter</Link>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <h1>Logi<span>Sync</span></h1>
          <p>Créer un compte</p>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'vendeur' ? 'active' : ''}`} onClick={() => setTab('vendeur')}>Vendeur</button>
          <button className={`auth-tab ${tab === 'entreprise' ? 'active' : ''}`} onClick={() => setTab('entreprise')}>Entreprise</button>
        </div>
        {tab === 'vendeur'
          ? <VendeurForm onSuccess={() => setDone(true)} />
          : <EntrepriseForm onSuccess={() => setDone(true)} />
        }
        <div className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  )
}