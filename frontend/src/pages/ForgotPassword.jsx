import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.forgotPassword({ email })
      setDone(true)
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Email envoyé !
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Si <strong>{email}</strong> est associé à un compte, vous recevrez
          un lien de réinitialisation dans quelques minutes.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Le lien expire dans <strong>1 heure</strong>. Vérifiez vos spams si vous ne le recevez pas.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
          Retour à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>Logi<span>Sync</span></h1>
          <p>Mot de passe oublié</p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              className="form-input"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Envoyer le lien'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  )
}