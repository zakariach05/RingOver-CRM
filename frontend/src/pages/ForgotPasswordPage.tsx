import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../utils/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetUrl, setResetUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setResetUrl(res.data.resetUrl || '')
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="RingOver" className="mx-auto w-48 rounded-2xl" />
            <p className="mt-3 text-sm text-white/80 font-medium">CRM & Téléphonie d'entreprise</p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email envoyé</h2>
            <p className="text-sm text-gray-500 mb-4">
              Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
            </p>

            {resetUrl && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
                <p className="text-xs font-bold text-amber-700 mb-2">Mode développement — Lien de réinitialisation :</p>
                <a
                  href={resetUrl}
                  className="block text-xs text-primary-600 break-all hover:underline font-mono bg-white rounded-lg p-2 border border-primary-100"
                >
                  {resetUrl}
                </a>
                <p className="text-[10px] text-amber-600 mt-2">
                  En production, ce lien sera envoyé par email et ne sera pas affiché ici.
                </p>
              </div>
            )}

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
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
              <Mail className="h-7 w-7 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Mot de passe oublié</h2>
            <p className="mt-2 text-sm text-gray-500">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="votre@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
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
