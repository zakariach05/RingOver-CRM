import { useState, FormEvent } from 'react'
import { Contact, ContactFormData } from '../types/contact'

interface ContactFormProps {
  initialData?: Contact | null
  onSubmit: (data: ContactFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function ContactForm({ initialData, onSubmit, onCancel, isLoading }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialData?.name || '',
    company: initialData?.company || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    tags: initialData?.tags ? JSON.parse(initialData.tags) : [],
    notes: initialData?.notes || '',
    ownerId: initialData?.ownerId || '',
  })

  const [tagInput, setTagInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const phone = formData.phone.replace(/[\s().-]/g, '')
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      setValidationError('Utilisez un numéro international, par exemple +33612345678.')
      return
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setValidationError('Saisissez une adresse e-mail valide.')
      return
    }

    setValidationError(null)
    await onSubmit({ ...formData, name: formData.name.trim(), phone, email: formData.email.trim() })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <div role="alert" className="p-3 bg-danger-50 text-danger-700 border border-danger-200 rounded-lg text-sm">
          {validationError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
          <input
            type="text"
            required
            className="input-field"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Société</label>
          <input
            type="text"
            className="input-field"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Entreprise SAS"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone *</label>
          <input
            type="tel"
            required
            className="input-field"
            value={formData.phone}
            onChange={(e) => {
              setValidationError(null)
              setFormData({ ...formData, phone: e.target.value })
            }}
            placeholder="+33 6 12 34 56 78"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            className="input-field"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jean.dupont@email.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Étiquettes (Tags)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="input-field flex-1"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Ajouter un tag et appuyer sur Entrée"
          />
          <button type="button" onClick={handleAddTag} className="btn-secondary px-4 py-2 shrink-0">Ajouter</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-primary-500 hover:text-primary-700 duration-150">
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
        <textarea
          className="input-field min-h-[100px] resize-y"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Informations supplémentaires..."
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary py-2" disabled={isLoading}>
          Annuler
        </button>
        <button type="submit" className="btn-primary py-2" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Créer le contact')}
        </button>
      </div>
    </form>
  )
}
