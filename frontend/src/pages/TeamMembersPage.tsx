import { useState, useEffect, FormEvent } from 'react'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Shield, X, Mail, Users, ChevronDown, Crown, User, Trash2 } from 'lucide-react'

interface TeamMember {
  id: string; name: string; email: string; role: string; status: string; createdAt: string
}

interface Invitation {
  id: string; email: string; role: string; status: string; expiresAt: string; createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur', MANAGER: 'Manager', AGENT: 'Agent'
}
const ROLE_BADGES: Record<string, string> = {
  ADMIN: 'bg-danger-50 text-danger-600 ring-1 ring-danger-200',
  MANAGER: 'bg-warning-50 text-warning-600 ring-1 ring-warning-200',
  AGENT: 'bg-primary-50 text-primary-600 ring-1 ring-primary-200'
}

export default function TeamMembersPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMembersList, setShowMembersList] = useState(true)
  const [showInvitationsList, setShowInvitationsList] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('AGENT')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const canManageTeam = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const fetchMembers = async () => {
    try {
      const res = await api.get('/team/members')
      setMembers(res.data.members || [])
    } catch {}
  }

  const fetchInvitations = async () => {
    if (!canManageTeam) return
    try {
      const res = await api.get('/team/invitations')
      setInvitations(res.data.invitations || [])
    } catch {}
  }

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchMembers(), fetchInvitations()])
      setLoading(false)
    }
    loadAll()
  }, [])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setInviteError('')
    setInviteLoading(true)
    try {
      const res = await api.post('/team/invitations', { email: inviteEmail, role: inviteRole })
      const inv = res.data.invitation
      if (inv) {
        setInvitations(prev => [inv, ...prev])
      }
      setInviteEmail('')
      setInviteRole('AGENT')
      setShowInviteModal(false)
      const link = res.data.invitationLink
      if (link) {
        navigator.clipboard.writeText(link)
        alert(`Lien copié dans le presse-papier :\n\n${link}`)
      }
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/team/members/${userId}/role`, { role: newRole })
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m))
      setShowRoleDropdown(null)
    } catch {}
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'INACTIVE' ? 'désactiver' : 'réactiver'
    if (!window.confirm(`Voulez-vous ${label} ce compte ?`)) return
    try {
      await api.patch(`/team/members/${userId}/status`, { status: newStatus })
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, status: newStatus } : m))
    } catch {}
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!window.confirm("Supprimer cette invitation ?")) return
    try {
      await api.delete(`/team/invitations/${invitationId}`)
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch {}
  }

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-500" />
            Gestion d'équipe
          </h1>
          <p className="page-subtitle">{members.length} membre{members.length > 1 ? 's' : ''}</p>
        </div>
        {canManageTeam && (
          <button onClick={() => setShowInviteModal(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Inviter un membre
          </button>
        )}
      </div>

      {/* MEMBERS SECTION */}
      <div className="mb-8">
        <button
          onClick={() => setShowMembersList(!showMembersList)}
          className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-3.5 text-left shadow-sm ring-1 ring-gray-100 hover:ring-gray-200 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Users className="h-4 w-4 text-primary-600" />
            </div>
            <span className="font-semibold text-gray-900">Membres de l'équipe</span>
            <span className="badge bg-primary-50 text-primary-600">{members.length}</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showMembersList ? 'rotate-180' : ''}`} />
        </button>

        {showMembersList && (
          <div className="mt-3">
            <div className="hidden sm:block table-container">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Membre</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrit le</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    {canManageTeam && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((member) => (
                    <tr key={member.id} className="group hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-inner">
                            {member.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {canManageTeam && user?.id !== member.id ? (
                          <div className="relative">
                            <button
                              onClick={() => setShowRoleDropdown(showRoleDropdown === member.id ? null : member.id)}
                              className={`badge cursor-pointer hover:opacity-80 transition-opacity ${ROLE_BADGES[member.role]}`}
                            >
                              {ROLE_LABELS[member.role]}
                            </button>
                            {showRoleDropdown === member.id && (
                              <div className="absolute left-0 z-20 mt-1 w-44 rounded-xl bg-white py-1 shadow-xl ring-1 ring-gray-100 animate-fade-in">
                                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => handleRoleChange(member.id, key)}
                                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm duration-100 ${
                                      member.role === key
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    {key === 'ADMIN' && <Shield className="h-3.5 w-3.5" />}
                                    {key === 'MANAGER' && <Crown className="h-3.5 w-3.5" />}
                                    {key === 'AGENT' && <User className="h-3.5 w-3.5" />}
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`badge ${ROLE_BADGES[member.role]}`}>{ROLE_LABELS[member.role]}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(member.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          member.status === 'ACTIVE' ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-success-500' : 'bg-gray-400'}`} />
                          {member.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      {canManageTeam && (
                        <td className="px-5 py-3.5">
                          {user?.id !== member.id && (
                            <button
                              onClick={() => handleStatusToggle(member.id, member.status)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                              title={member.status === 'ACTIVE' ? "Désactiver" : "Réactiver"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-3">
              {members.map((member) => (
                <div key={member.id} className="mobile-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white shadow-inner">
                        {member.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    {canManageTeam && user?.id !== member.id && (
                      <button
                        onClick={() => handleStatusToggle(member.id, member.status)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600 duration-150"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`badge ${ROLE_BADGES[member.role]}`}>{ROLE_LABELS[member.role]}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      member.status === 'ACTIVE' ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-success-500' : 'bg-gray-400'}`} />
                      {member.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* INVITATIONS SECTION */}
      {canManageTeam && (
        <div>
          <button
            onClick={() => setShowInvitationsList(!showInvitationsList)}
            className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-3.5 text-left shadow-sm ring-1 ring-gray-100 hover:ring-gray-200 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50">
                <Mail className="h-4 w-4 text-warning-600" />
              </div>
              <span className="font-semibold text-gray-900">Invitations</span>
              <span className="badge bg-warning-50 text-warning-600">
                {invitations.filter(i => i.status === 'PENDING' && !isExpired(i.expiresAt)).length}
              </span>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showInvitationsList ? 'rotate-180' : ''}`} />
          </button>

          {showInvitationsList && (
            <div className="mt-3">
              {invitations.length === 0 ? (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                  <Mail className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">Aucune invitation</p>
                </div>
              ) : (
                <div className="hidden sm:block table-container">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expire le</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {invitations.map((invitation) => (
                        <tr key={invitation.id} className="group hover:bg-gray-50/50 transition-colors duration-150">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{invitation.email}</td>
                          <td className="px-5 py-3.5">
                            <span className={`badge ${ROLE_BADGES[invitation.role]}`}>{ROLE_LABELS[invitation.role]}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              invitation.status === 'ACCEPTED'
                                ? 'bg-success-50 text-success-600'
                                : isExpired(invitation.expiresAt)
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-warning-50 text-warning-600'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                invitation.status === 'ACCEPTED' ? 'bg-success-500' : isExpired(invitation.expiresAt) ? 'bg-gray-400' : 'bg-warning-500'
                              }`} />
                              {invitation.status === 'ACCEPTED' ? 'Acceptée' : isExpired(invitation.expiresAt) ? 'Expirée' : 'En attente'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-500">
                            {new Date(invitation.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-5 py-3.5">
                            {invitation.status !== 'ACCEPTED' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="sm:hidden space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="mobile-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        <span className="badge mt-1 {ROLE_BADGES[invitation.role]}">{ROLE_LABELS[invitation.role]}</span>
                      </div>
                      {invitation.status !== 'ACCEPTED' && (
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600 duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        invitation.status === 'ACCEPTED'
                          ? 'bg-success-50 text-success-600'
                          : isExpired(invitation.expiresAt)
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-warning-50 text-warning-600'
                      }`}>
                        {invitation.status === 'ACCEPTED' ? 'Acceptée' : isExpired(invitation.expiresAt) ? 'Expirée' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-slide-up">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Inviter un membre</h3>
              <button onClick={() => setShowInviteModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 duration-150">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && (
                <div className="rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-600">
                  {inviteError === 'USER_ALREADY_MEMBER' && 'Cet email est déjà membre de l\'équipe.'}
                  {inviteError === 'INVITATION_ALREADY_SENT' && 'Une invitation est déjà en cours pour cet email.'}
                  {inviteError === 'INVALID_ROLE' && 'Rôle invalide.'}
                  {inviteError === 'VALIDATION_ERROR' && 'Veuillez remplir tous les champs.'}
                  {!['USER_ALREADY_MEMBER', 'INVITATION_ALREADY_SENT', 'INVALID_ROLE', 'VALIDATION_ERROR'].includes(inviteError) && inviteError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email" required value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="membre@entreprise.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Rôle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field appearance-none cursor-pointer"
                >
                  <option value="AGENT">Agent</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <button type="submit" disabled={inviteLoading} className="btn-primary w-full">
                {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
