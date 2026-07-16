import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Phone, Eye, EyeOff } from 'lucide-react'

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-xl shadow-primary-500/30">
            <Phone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">RingOver</h1>
          <p className="mt-2 text-sm text-blue-300/80">CRM & Téléphonie d'entreprise</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Connexion</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="admin@ringover.com"
            />
          </div>

          <div className="mb-6">
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
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 duration-150"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-500">
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline duration-150">
              Mot de passe oublié ?
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors">
              S'inscrire
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
