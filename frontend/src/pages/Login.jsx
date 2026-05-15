import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, ArrowRight, BarChart2, Users, Clock } from 'lucide-react'

const STATS = [
  { icon: BarChart2, val: '98%',    lbl: 'Taux de livraison' },
  { icon: Users,     val: '2 400+', lbl: 'Vendeurs actifs'   },
  { icon: Clock,     val: '15 min', lbl: 'Mise en route'     },
]

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      if (data?.non_field_errors) setError(data.non_field_errors[0])
      else if (data?.detail)      setError(data.detail)
      else                        setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      {/* ── Left panel — branding ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '60px 72px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Top — logo + tagline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <img
              src="/logoo.png"
              alt="Logo"
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 50, fontWeight: 700, color: '#fff',
            }}>
              Logi<span style={{ color: '#C9A84C' }}>Sync</span>
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 42, fontWeight: 700,
            color: '#FFFFFF', lineHeight: 1.2,
            marginBottom: 18, letterSpacing: '-0.5px',
          }}>
            Coordination logistique{' '}
            <span style={{ color: '#C9A84C' }}>centralisée.</span>
          </h2>
          <p
  style={{
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    lineHeight: 1.8,
    maxWidth: 420,
  }}
>
  Gérez vos expéditions, suivez vos livraisons et coordonnez vos prestataires en temps réel.

  <br /><br/>

  Une solution pensée pour simplifier vos opérations, améliorer
  votre productivité et offrir une visibilité complète sur votre
  activité logistique.
</p>

        {/* Bottom — stats avec icônes */}
<div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 24,
    marginTop: 40,
  }}
>
  {STATS.map(({ icon: Icon, val, lbl }) => (
    <div
      key={lbl}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 180,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          flexShrink: 0,
          background: 'rgba(201,168,76,0.12)',
          border: '0.5px solid rgba(201,168,76,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={17} color="#C9A84C" />
      </div>

      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {val}
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.35)',
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {lbl}
        </div>
      </div>
    </div>
  ))}
</div></div>
</div>
      {/* ── Right panel — form (inchangé) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 60px',
        position: 'relative', zIndex: 1,
        minWidth: 480,
      }}>
        <div className="auth-box" style={{ margin: 0 }}>
          <div className="auth-logo">
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Accès espace personnel
            </p>
            <h1 style={{ fontSize: 26, marginBottom: 4 }}>
              Bon retour
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Connectez-vous à votre compte LogiSync
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 22 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)', pointerEvents: 'none',
                }} />
                <input
                  className="form-input"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Mot de passe</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)', pointerEvents: 'none',
                }} />
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '13px 22px', fontSize: 15 }}
              disabled={loading}
            >
              {loading
                ? <span className="spinner" />
                : <><span>Se connecter</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          <div className="auth-divider" style={{ marginTop: 24 }}>ou</div>

          <div className="auth-footer" style={{ marginTop: 0 }}>
            Pas encore de compte ?{' '}
            <Link to="/register">Créer un compte</Link>
          </div>
        </div>
      </div>

    </div>
  )
}