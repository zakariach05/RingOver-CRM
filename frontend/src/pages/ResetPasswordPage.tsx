import { useState, FormEvent } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../utils/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reset, setReset] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setReset(true)
    } catch (err: any) {
      const msg = err.response?.data?.error
      if (msg === 'INVALID_OR_EXPIRED_TOKEN') {
        setError('Ce lien est invalide ou expiré. Demandez un nouveau lien.')
      } else {
        setError('Une erreur est survenue. Réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="RingOver" className="mx-auto w-48 rounded-2xl" />
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-2xl text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
            <p className="text-sm text-gray-500 mb-6">
              Ce lien de réinitialisation est invalide. Veuillez demander un nouveau lien.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (reset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="RingOver" className="mx-auto w-48 rounded-2xl" />
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Mot de passe réinitialisé</h2>
            <p className="text-sm text-gray-500 mb-6">
              Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="RingOver" className="mx-auto w-48 rounded-2xl" />
          <p className="mt-3 text-sm text-white/80 font-medium">CRM & Téléphonie d'entreprise</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
              <Lock className="h-7 w-7 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Nouveau mot de passe</h2>
            <p className="mt-2 text-sm text-gray-500">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Nouveau mot de passe
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
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">8 caractères minimum, 1 majuscule, 1 chiffre</p>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
