import { useState, useEffect, FormEvent } from 'react'
import { Deal, DealFormData } from '../../api/deals.api'
import api from '../../utils/api'

const STAGE_OPTIONS = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUALIFIED', label: 'Qualifié' },
  { value: 'PROPOSAL', label: 'Proposition' },
  { value: 'NEGOTIATION', label: 'Négociation' },
  { value: 'WON', label: 'Gagné' },
  { value: 'LOST', label: 'Perdu' },
]

interface DealFormProps {
  initialData?: Deal | null
  onSubmit: (data: DealFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface ContactSuggestion {
  id: string
  name: string
  phone: string
  company?: string
}

export default function DealForm({ initialData, onSubmit, onCancel, isLoading }: DealFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [value, setValue] = useState(initialData?.value?.toString() || '')
  const [stage, setStage] = useState(initialData?.stage || 'LEAD')
  const [contactSearch, setContactSearch] = useState(initialData?.contact?.name || '')
  const [contactId, setContactId] = useState(initialData?.contactId || '')
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = initialData && ['WON', 'LOST'].includes(initialData.stage)

  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  }, [searchTimeout])

  const handleSearchContacts = (query: string) => {
    setContactSearch(query)
    setContactId('')
    if (searchTimeout) clearTimeout(searchTimeout)

    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/contacts', { params: { q: query, pageSize: '5' } })
        setSuggestions(res.data.contacts)
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
    setSearchTimeout(timeout)
  }

  const handleSelectContact = (c: ContactSuggestion) => {
    setContactSearch(c.name)
    setContactId(c.id)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = 'Titre requis'
    if (!value || parseFloat(value) <= 0) newErrors.value = 'La valeur doit être positive'
    if (!contactId && !initialData) newErrors.contact = 'Le contact est obligatoire'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    const payload: DealFormData = {
      title: title.trim(),
      value: parseFloat(value),
      stage: initialData ? undefined : stage,
    }
    if (contactId) {
      payload.contactId = contactId
    }
    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="p-3 bg-danger-50 text-danger-700 border border-danger-200 rounded-lg text-sm">
          {errors.general}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact</label>
        <div className="relative">
          <input
            type="text"
            className="input-field"
            value={contactSearch}
            onChange={(e) => handleSearchContacts(e.target.value)}
            placeholder="Rechercher un contact..."
            disabled={!!initialData}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}{c.company ? ` · ${c.company}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">Associez un contact à cette affaire</p>
        {errors.contact && <p className="text-xs text-danger-600 mt-1">{errors.contact}</p>}
        {contactId && (
          <p className="text-xs text-green-600 mt-1">Contact sélectionné ✓</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input
          type="text"
          className="input-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom de l'affaire"
        />
        {errors.title && <p className="text-xs text-danger-600 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Valeur (€) *</label>
        <input
          type="number"
          className="input-field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          min="0.01"
          step="0.01"
          disabled={!!isLocked}
        />
        {errors.value && <p className="text-xs text-danger-600 mt-1">{errors.value}</p>}
      </div>

      {!initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Étape</label>
          <select
            className="input-field"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {isLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Cette affaire est clôturée. Les champs valeur et étape sont en lecture seule.
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary py-2" disabled={isLoading}>
          Annuler
        </button>
        <button type="submit" className="btn-primary py-2" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Créer l\'affaire')}
        </button>
      </div>
    </form>
  )
}
