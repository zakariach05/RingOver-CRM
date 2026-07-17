import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Phone, Mail, Building2, Calendar, PhoneOutgoing, PhoneIncoming, MessageSquare, Send } from 'lucide-react'
import api from '../utils/api'
import { Contact, ContactFormData } from '../types/contact'
import ContactForm from '../components/ContactForm'
import SmsComposer from '../components/sms/SmsComposer'
import { callsApi, Call } from '../api/calls.api'
import { useCall } from '../contexts/CallContext'
import { openWhatsApp } from '../utils/contactUtils'

interface TeamMember { id: string; name: string; role: string }

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setActiveCall } = useCall()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [calling, setCalling] = useState(false)
  const [callHistory, setCallHistory] = useState<Call[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [assigningOwner, setAssigningOwner] = useState(false)
  const [showSmsComposer, setShowSmsComposer] = useState(false)

  const fetchContact = async () => {
    try {
      const res = await api.get(`/contacts/${id}`)
      setContact(res.data)
    } catch (err) {
      console.error(err)
      navigate('/contacts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCallHistory = async () => {
    try {
      const res = await callsApi.list({ q: contact?.phone || '', pageSize: '10' })
      setCallHistory(res.data.calls.filter((c) => c.contactId === id))
    } catch {}
  }

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/team/members')
      setTeamMembers(res.data.members)
    } catch {}
  }

  useEffect(() => {
    fetchContact()
  }, [id])

  useEffect(() => {
    if (contact) {
      fetchCallHistory()
      fetchTeamMembers()
    }
  }, [contact?.id])

  const handleUpdateContact = async (data: ContactFormData) => {
    try {
      await api.put(`/contacts/${id}`, data)
      setIsEditOpen(false)
      fetchContact()
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la mise à jour")
    }
  }

  const handleAssignOwner = async (ownerId: string) => {
    setAssigningOwner(true)
    try {
      await api.patch(`/contacts/${id}/owner`, { ownerId: ownerId || null })
      fetchContact()
    } catch {
      alert("Erreur lors de l'assignation")
    } finally {
      setAssigningOwner(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleDelete = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ? Il sera conservé de manière anonymisée.")) {
      setIsDeleting(true)
      try {
        await api.delete(`/contacts/${id}`)
        navigate('/contacts')
      } catch (err: any) {
        if (err.response?.data?.error === 'CONTACT_HAS_OPEN_DEALS') {
          const dealNames = err.response.data.deals.map((d: any) => d.title).join(', ')
          alert(`Impossible de supprimer ce contact car il a des affaires ouvertes : ${dealNames}`)
        } else {
          alert("Erreur lors de la suppression")
        }
        setIsDeleting(false)
      }
    }
  }

  const handleCall = async () => {
    if (!contact) return
    setCalling(true)
    try {
      const res = await callsApi.initiate(contact.phone, contact.id)
      setActiveCall(res.data.call)
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert('Vous êtes déjà en appel. Raccrochez d\'abord.')
      } else {
        alert("Erreur lors de l'initiation de l'appel")
      }
    } finally {
      setCalling(false)
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

  if (!contact) return null

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/contacts" className="p-2 rounded-xl bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-200 duration-150 hover:shadow-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-primary-500/20 shrink-0">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{contact.name}</h1>
              {contact.company && (
                <div className="flex items-center text-gray-500 gap-1.5 mt-0.5 text-sm">
                  <Building2 className="w-4 h-4" /> {contact.company}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditOpen(true)} className="btn-secondary py-2">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Éditer</span>
          </button>
          <button onClick={handleDelete} disabled={isDeleting} className="p-2.5 text-danger-600 hover:bg-danger-50 rounded-xl duration-150">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Modifier {contact.name}</h2>
            </div>
            <div className="p-5 sm:p-6">
              <ContactForm
                initialData={contact}
                onSubmit={handleUpdateContact}
                onCancel={() => setIsEditOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-1">
          <div className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Coordonnées</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{contact.phone}</div>
                  <div className="text-xs text-gray-400">Mobile</div>
                </div>
              </div>

              {contact.email && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{contact.email}</div>
                    <div className="text-xs text-gray-400">Email pro</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Créé le {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Propriétaire :
                    <select
                      value={contact.ownerId || ''}
                      onChange={(e) => handleAssignOwner(e.target.value)}
                      disabled={assigningOwner}
                      className="ml-1 text-xs bg-transparent border-b border-gray-300 focus:border-primary-500 outline-none"
                    >
                      <option value="">Aucun</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {contact.tags && JSON.parse(contact.tags).length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Étiquettes</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(contact.tags).map((tag: string) => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {contact.notes && (
            <div className="card p-5 sm:p-6 bg-gray-50 border border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Notes internes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Bar */}
          <div className="card p-4 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-gray-200">
            <div className="flex justify-center gap-6 sm:justify-around">
              <button
                onClick={handleCall}
                disabled={calling}
                className="flex flex-col items-center gap-2 p-3 text-primary-700 hover:bg-white/60 rounded-xl duration-150 hover:shadow-sm disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <PhoneOutgoing className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{calling ? 'Appel...' : 'Appeler'}</span>
              </button>
              <button
                onClick={() => setShowSmsComposer(true)}
                className="flex flex-col items-center gap-2 p-3 text-gray-700 hover:bg-white/60 rounded-xl duration-150 hover:shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">SMS</span>
              </button>
              <button
                onClick={() => openWhatsApp(contact.phone)}
                className="flex flex-col items-center gap-2 p-3 text-green-700 hover:bg-white/60 rounded-xl duration-150 hover:shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Historique des interactions</h2>
            {callHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Aucun appel enregistré pour ce contact.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {callHistory.map((call) => (
                  <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      {call.direction === 'INBOUND'
                        ? <PhoneIncoming className="w-3.5 h-3.5 text-green-500" />
                        : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {call.direction === 'INBOUND' ? 'Entrant' : 'Sortant'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(call.startedAt).toLocaleDateString('fr-FR')} · {formatDuration(call.duration)}
                        {call.note ? ` · ${call.note}` : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      call.status === 'COMPLETED' || call.status === 'ANSWERED'
                        ? 'bg-green-100 text-green-700'
                        : call.status === 'MISSED' || call.status === 'NO_ANSWER'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {call.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSmsComposer && (
        <SmsComposer
          toNumber={contact.phone}
          contactName={contact.name}
          contactId={contact.id}
          onClose={() => setShowSmsComposer(false)}
        />
      )}
    </div>
  )
}
