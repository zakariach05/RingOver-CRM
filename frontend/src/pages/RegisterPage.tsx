import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token')

  function extractToken(raw: string): string {
    try {
      if (raw.includes('token=')) {
        const url = new URL(raw)
        return url.searchParams.get('token') || raw
      }
    } catch {}
    return raw.trim()
  }

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [invitationRole, setInvitationRole] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(!!urlToken)
  const [invitationError, setInvitationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const rawToken = urlToken || manualToken
  const token = rawToken ? extractToken(rawToken) : null

  useEffect(() => {
    if (!urlToken) return
    setInvitationLoading(true)
    api.get(`/team/invitations/${urlToken}`)
      .then((res) => {
        if (res.data.expired) {
          setInvitationError("Cette invitation a expiré. Demandez une nouvelle invitation à l'administrateur.")
        } else {
          setEmail(res.data.email)
          setInvitationRole(res.data.role)
        }
      })
      .catch(() => {
        setInvitationError('Invitation invalide ou introuvable.')
      })
      .finally(() => setInvitationLoading(false))
  }, [urlToken])

  const handleManualTokenBlur = async () => {
    if (!manualToken || manualToken === urlToken) return
    const extracted = extractToken(manualToken)
    setError('')
    setInvitationLoading(true)
    try {
      const res = await api.get(`/team/invitations/${extracted}`)
      if (res.data.expired) {
        setInvitationError("Cette invitation a expiré.")
        setInvitationRole(null)
      } else {
        setEmail(res.data.email)
        setInvitationRole(res.data.role)
        setInvitationError('')
      }
    } catch {
      setInvitationError('Code d\'invitation invalide.')
      setInvitationRole(null)
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins 1 majuscule')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Le mot de passe doit contenir au moins 1 chiffre')
      return
    }

    setLoading(true)
    try {
      await register({ email, name, password, invitationToken: token ?? undefined })
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.error
      if (msg === 'EMAIL_ALREADY_USED') {
        setError("Cet email est déjà utilisé")
      } else if (msg === 'INVITATION_REQUIRED') {
        setError("Un code d'invitation est requis. Demandez un lien d'invitation à votre administrateur.")
      } else if (msg === 'INVALID_INVITATION') {
        setError("Code d'invitation invalide ou expiré. Vérifiez le lien reçu par email.")
      } else if (msg === 'INVITATION_EMAIL_MISMATCH') {
        setError("Cet email ne correspond pas à l'invitation. Vérifiez l'adresse email.")
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (invitationLoading && urlToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sidebar-900 via-primary-900 to-sidebar-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
      </div>
    )
  }

  if (invitationError && urlToken) {
    return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Invitation invalide</h2>
          <p className="mb-6 text-gray-500">{invitationError}</p>
          <Link to="/login" className="btn-primary">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="RingOver" className="mx-auto w-36 rounded-2xl" />
          <p className="mt-3 text-sm text-white/80 font-medium">CRM & Téléphonie d'entreprise</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Créer un compte</h2>

          {invitationRole && (
            <div className="mb-4 rounded-lg bg-primary-50 border border-primary-200 p-3 text-sm text-primary-700">
              Invitation en tant que <strong className="font-semibold">{invitationRole}</strong>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          {!urlToken && (
            <div className="mb-4">
              <label htmlFor="token" className="mb-1.5 block text-sm font-medium text-gray-700">
                Code d'invitation
              </label>
              <input
                id="token"
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onBlur={handleManualTokenBlur}
                className="input-field"
                placeholder="Collez votre code d'invitation ici"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Demandez un lien d'invitation à votre administrateur
              </p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!token && !!invitationRole}
              className="input-field"
              placeholder="vous@exemple.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">Nom</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Votre nom"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-11"
                placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
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
              placeholder="Retapez le mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
