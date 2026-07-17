import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Lock, Phone, Mail, Building2, User, Calendar, RotateCcw, ArrowRightLeft } from 'lucide-react'
import { Deal, dealsApi } from '../api/deals.api'
import { useAuth } from '../contexts/AuthContext'
import DealForm from '../components/deals/DealForm'
import { DealFormData } from '../api/deals.api'
import api from '../utils/api'

interface TeamMember { id: string; name: string; role: string }

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead', QUALIFIED: 'Qualifié', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}

const STAGE_COLORS: Record<string, string> = {
  LEAD: 'bg-gray-100 text-gray-700', QUALIFIED: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-amber-100 text-amber-700', NEGOTIATION: 'bg-purple-100 text-purple-700',
  WON: 'bg-green-100 text-green-700', LOST: 'bg-red-100 text-red-700',
}

export default function DealDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showReassign, setShowReassign] = useState(false)
  const [reassigning, setReassigning] = useState(false)

  const fetchDeal = async () => {
    try {
      const res = await dealsApi.get(id!)
      setDeal(res.data)
    } catch {
      navigate('/deals')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/team/members')
      setTeamMembers(res.data.members)
    } catch {}
  }

  const handleReassign = async (ownerId: string) => {
    setReassigning(true)
    try {
      await dealsApi.reassign(id!, ownerId)
      setShowReassign(false)
      fetchDeal()
    } catch {
      alert('Erreur lors de la réassignation')
    } finally {
      setReassigning(false)
    }
  }

  useEffect(() => { fetchDeal(); fetchTeamMembers() }, [id])

  const isLocked = deal && ['WON', 'LOST'].includes(deal.stage)
  const canReopen = isLocked && ['MANAGER', 'ADMIN'].includes(user?.role || '')

  const handleUpdate = async (data: DealFormData) => {
    setEditing(true)
    try {
      await dealsApi.update(id!, data)
      setIsEditOpen(false)
      fetchDeal()
    } catch {
      alert('Erreur lors de la mise à jour')
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette affaire ?')) return
    setDeleting(true)
    try {
      await dealsApi.delete(id!)
      navigate('/deals')
    } catch {
      alert('Erreur lors de la suppression')
      setDeleting(false)
    }
  }

  const handleReopen = async () => {
    try {
      await dealsApi.updateStage(id!, 'QUALIFIED')
      fetchDeal()
    } catch {
      alert('Erreur lors de la réouverture')
    }
  }

  if (loading) {
    return (
      <div className="page-container animate-pulse space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
        <div className="card p-6 h-64" />
      </div>
    )
  }

  if (!deal) return null

  return (
    <div className="page-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/deals" className="p-2 rounded-xl bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${STAGE_COLORS[deal.stage]}`}>
                {STAGE_LABELS[deal.stage]}
              </span>
              {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReopen && (
            <button onClick={handleReopen} className="btn-secondary py-2 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Réouvrir
            </button>
          )}
          <button onClick={() => setIsEditOpen(true)} className="btn-secondary py-2">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Modifier</span>
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-2.5 text-danger-600 hover:bg-danger-50 rounded-xl transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLocked && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Cette affaire est clôturée.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Détails</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                  <span className="text-sm font-bold">€</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.value)}
                  </div>
                  <div className="text-xs text-gray-400">Valeur</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">{deal.owner?.name}</div>
                    {['MANAGER', 'ADMIN'].includes(user?.role || '') && !isLocked && (
                      <button
                        onClick={() => setShowReassign(!showReassign)}
                        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Réassigner"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">Propriétaire</div>
                  {showReassign && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <select
                        value={deal.ownerId}
                        onChange={(e) => handleReassign(e.target.value)}
                        disabled={reassigning}
                        className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5"
                      >
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Créée le {new Date(deal.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  {deal.closedAt && (
                    <div className="text-xs text-gray-400">
                      Clôturée le {new Date(deal.closedAt).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {deal.contact && (
            <div className="card p-5 sm:p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Contact lié</h2>
              <div className="space-y-3">
                <Link
                  to={`/contacts/${deal.contact.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-primary-600 hover:underline">{deal.contact.name}</span>
                </Link>
                {deal.contact.phone && (
                  <div className="flex items-center gap-3 px-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{deal.contact.phone}</span>
                  </div>
                )}
                {deal.contact.email && (
                  <div className="flex items-center gap-3 px-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{deal.contact.email}</span>
                  </div>
                )}
                {deal.contact.company && (
                  <div className="flex items-center gap-3 px-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{deal.contact.company}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Historique</h2>
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">L'historique des activities s'affichera ici.</p>
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Modifier l'affaire</h2>
            </div>
            <div className="p-5 sm:p-6">
              <DealForm
                initialData={deal}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditOpen(false)}
                isLoading={editing}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
