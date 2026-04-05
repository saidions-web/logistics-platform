import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'

export default function ResetPassword() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  // Token absent de l'URL
  if (!token) return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Lien invalide
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <Link to="/forgot-password" className="btn btn-primary" style={{ justifyContent: 'center' }}>
          Demander un nouveau lien
        </Link>
      </div>
    </div>
  )

  // Succès
  if (done) return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Mot de passe mis à jour !
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
          Se connecter
        </Link>
      </div>
    </div>
  )

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      const d = err.response?.data
      // Affiche l'erreur du backend (token expiré, mot de passe trop faible...)
      const msg = Object.values(d || {}).flat().join(' ')
      setError(msg || 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>Logi<span>Sync</span></h1>
          <p>Nouveau mot de passe</p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16,
                }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              className="form-input"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {confirm && password !== confirm && (
              <p style={{ color: 'var(--color-error, #e53e3e)', fontSize: 12, marginTop: 4 }}>
                Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading || (confirm && password !== confirm)}
          >
            {loading ? <span className="spinner" /> : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  )
}