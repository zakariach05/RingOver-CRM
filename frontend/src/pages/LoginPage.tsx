import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.error
      if (msg === 'ACCOUNT_DISABLED') {
        setError('Votre compte a été désactivé. Contactez un administrateur.')
      } else {
        setError('Email ou mot de passe incorrect')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #083d2f 100%)',
        }}
      >
        {/* Decorative glow blobs */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,191,143,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,120,255,0.14) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          {/* Logo */}
          <div
            className="mb-8 flex items-center justify-center rounded-2xl px-6 py-4"
            style={{ background: 'rgba(255,255,255,0.96)' }}
          >
            <img src="/logo.png" alt="RingOver" className="h-10 w-auto" />
          </div>

          {/* Badge */}
          <p
            className="mb-6 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: '#00bf8f' }}
          >
            Plateforme Unifiée
          </p>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Un seul outil pour{' '}
            <span style={{ color: '#00bf8f' }}>appeler, vendre</span>{' '}
            et suivre vos clients.
          </h1>

          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Dialer cloud, CRM léger, SMS et analytique — connectés en un
            espace de travail conçu pour les équipes commerciales et support.
          </p>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-6 left-0 right-0 flex justify-between px-10 text-xs"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <span>© 2026 · Espace entreprise</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex lg:hidden items-center justify-center">
          <img src="/logo.png" alt="RingOver" className="h-10 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Bon retour parmi nous</h2>
            <p className="mt-2 text-sm text-gray-500">
              Connectez-vous pour accéder à votre espace de travail.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="prenom.nom@entreprise.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          {/* Forgot password — centré sous le bouton */}
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-150"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Demander un accès — en bas */}
          <p className="mt-10 text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
            >
              Demander un accès
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
