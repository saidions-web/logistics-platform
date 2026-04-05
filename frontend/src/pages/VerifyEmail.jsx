import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../services/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('Token manquant dans le lien.')
      return
    }

    // Appeler Django pour vérifier le token
    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success')
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Lien invalide ou expiré.'
        setStatus('error')
        setMessage(msg)
      })
  }, [])

  // ── Chargement ──────────────────────
  if (status === 'loading') return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Vérification en cours...</p>
      </div>
    </div>
  )

  // ── Succès ──────────────────────────
  if (status === 'success') return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Email vérifié !
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          Votre compte est activé. Vous pouvez maintenant vous connecter.
        </p>
        <Link
          to="/login"
          className="btn btn-primary"
          style={{ justifyContent: 'center' }}
        >
          Se connecter
        </Link>
      </div>
    </div>
  )

  // ── Erreur ──────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Lien invalide
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          {message}
        </p>
        <Link
          to="/login"
          className="btn btn-secondary"
          style={{ justifyContent: 'center' }}
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}