import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import ContactForm from '../components/ContactForm'
import { Search, Plus, Phone, MoreVertical, Edit, Trash2, ContactIcon, Filter, X } from 'lucide-react'
import { Contact } from '../types/contact'

interface Pagination { page: number; pageSize: number; total: number }

export default function ContactsListPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, total: 0 })
  const [ownerFilter, setOwnerFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchContacts = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), pageSize: '10' })
      if (searchQuery && searchQuery.length >= 2) params.append('q', searchQuery)
      if (ownerFilter) params.append('ownerId', ownerFilter)
      if (tagFilter) params.append('tags', tagFilter)
      const res = await api.get(`/contacts?${params}`)
      setContacts(res.data.contacts)
      setPagination({ page: res.data.page, pageSize: res.data.pageSize, total: res.data.total })
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchContacts() }, [searchQuery, ownerFilter, tagFilter])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce contact ?')) return
    try { await api.delete(`/contacts/${id}`); fetchContacts(pagination.page) } catch {}
  }

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
            <ContactIcon className="h-6 w-6 text-primary-400" />
            Contacts
          </h1>
          <p className="page-subtitle">{pagination.total} contact{pagination.total > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nouveau contact
        </button>
      </div>

      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text" placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 bg-white border-gray-200"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showFilters || ownerFilter || tagFilter
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {(ownerFilter || tagFilter) && (
            <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center">
              {(ownerFilter ? 1 : 0) + (tagFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Filtrer par propriétaire (ID)"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="input-field flex-1 !text-xs bg-white"
          />
          <input
            type="text"
            placeholder="Filtrer par tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="input-field flex-1 !text-xs bg-white"
          />
          {(ownerFilter || tagFilter) && (
            <button
              onClick={() => { setOwnerFilter(''); setTagFilter('') }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" /> Effacer
            </button>
          )}
        </div>
      )}

      {contacts.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
            <ContactIcon className="h-7 w-7 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Aucun contact</h3>
          <p className="mt-2 text-sm text-gray-500">Commencez par ajouter votre premier contact.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Ajouter un contact
          </button>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="hidden sm:block table-container">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="group hover:bg-gray-50/50 cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-inner">
                        {contact.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{contact.company || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{contact.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(contact.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${contact.id}`) }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(contact.id) }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="sm:hidden space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="mobile-card" onClick={() => navigate(`/contacts/${contact.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white shadow-inner">
                    {contact.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{contact.name}</p>
                    {contact.company && <p className="text-xs text-gray-500">{contact.company}</p>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMobileMenu(showMobileMenu === contact.id ? null : contact.id) }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 duration-150"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              {contact.phone && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="h-3 w-3" /> {contact.phone}
                </div>
              )}
              {showMobileMenu === contact.id && (
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 animate-fade-in">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${contact.id}`) }}
                    className="flex-1 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-100 duration-150 flex items-center justify-center gap-1.5">
                    <Edit className="h-3.5 w-3.5" /> Modifier
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(contact.id) }}
                    className="flex-1 rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-600 hover:bg-danger-100 duration-150 flex items-center justify-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination.total > pagination.pageSize && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">
            {pagination.total} contacts • Page {pagination.page}/{Math.ceil(pagination.total / pagination.pageSize)}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchContacts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary !px-3 !py-1.5 !text-xs disabled:opacity-30"
            >
              Précédent
            </button>
            <button
              onClick={() => fetchContacts(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="btn-secondary !px-3 !py-1.5 !text-xs disabled:opacity-30"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Nouveau contact</h2>
            </div>
            <div className="p-5 sm:p-6">
              <ContactForm
                onSubmit={async (data) => {
                  const res = await api.post('/contacts', data)
                  setShowCreateModal(false)
                  fetchContacts(1)
                  return res.data
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
