import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Phone, Mail, Building2, Calendar, PhoneOutgoing, MessageSquare } from 'lucide-react'
import api from '../utils/api'
import { Contact, ContactFormData } from '../types/contact'
import ContactForm from '../components/ContactForm'

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  useEffect(() => {
    fetchContact()
  }, [id])

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

  const handleDelete = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ? Il sera conservé de manière anonymisée.")) {
      setIsDeleting(true)
      try {
        await api.delete(`/contacts/${id}`)
        navigate('/contacts')
      } catch (err) {
        console.error(err)
        alert("Erreur lors de la suppression")
        setIsDeleting(false)
      }
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
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Créé le {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-400">
                    Propriétaire : {contact.owner?.name || 'Aucun'}
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
              <button className="flex flex-col items-center gap-2 p-3 text-primary-700 hover:bg-white/60 rounded-xl duration-150 hover:shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <PhoneOutgoing className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Appeler</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-3 text-gray-700 hover:bg-white/60 rounded-xl duration-150 hover:shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">SMS</span>
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Historique des interactions</h2>
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                L'historique des appels et des offres s'affichera ici une fois les modules activés.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
