import { useState } from 'react'
import { PhoneIncoming, PhoneOutgoing, Clock, X, MessageSquare, Send } from 'lucide-react'
import { Call, callsApi } from '../../api/calls.api'
import api from '../../utils/api'
import SmsComposer from '../sms/SmsComposer'

interface PostCallModalProps {
  call: Call
  onClose: () => void
}

export default function PostCallModal({ call, onClose }: PostCallModalProps) {
  const [note, setNote] = useState(call.note || '')
  const [saving, setSaving] = useState(false)
  const [showQuickContact] = useState(!call.contactId)
  const [contactName, setContactName] = useState('')
  const [creatingContact, setCreatingContact] = useState(false)
  const [showSmsComposer, setShowSmsComposer] = useState(false)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSaveNote = async () => {
    if (!note.trim()) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await callsApi.update(call.id, { note: note.trim() })
      onClose()
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleCreateContact = async () => {
    if (!contactName.trim()) return
    setCreatingContact(true)
    try {
      const res = await api.post('/contacts', {
        name: contactName.trim(),
        phone: call.toNumber,
      })
      await callsApi.update(call.id, { contactId: res.data.contact.id })
      onClose()
    } catch {
      alert('Erreur lors de la création du contact')
    } finally {
      setCreatingContact(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Fin d'appel</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              {call.direction === 'INBOUND'
                ? <PhoneIncoming className="w-5 h-5 text-primary-600" />
                : <PhoneOutgoing className="w-5 h-5 text-primary-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {call.contact?.name || call.toNumber}
              </p>
              <p className="text-xs text-gray-500">
                {call.direction === 'INBOUND' ? 'Entrant' : 'Sortant'} · {call.status}
                {call.agent?.name ? ` · Agent : ${call.agent.name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {formatDuration(call.duration)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSmsComposer(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </button>
            <button
              onClick={() => {
                const num = call.direction === 'INBOUND' ? call.fromNumber : call.toNumber
                const digits = num.replace(/\D/g, '')
                window.open(`https://wa.me/${digits}`, '_blank')
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
            >
              <Send className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          {showSmsComposer && (
            <SmsComposer
              toNumber={call.direction === 'INBOUND' ? call.fromNumber : call.toNumber}
              contactName={call.contact?.name}
              contactId={call.contactId || undefined}
              onClose={() => setShowSmsComposer(false)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note sur cet appel..."
            />
          </div>

          {showQuickContact && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">Numéro inconnu</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 text-sm"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nom du contact"
                />
                <button
                  onClick={handleCreateContact}
                  disabled={!contactName.trim() || creatingContact}
                  className="btn-primary px-3 py-1.5 text-sm whitespace-nowrap"
                >
                  {creatingContact ? 'Création...' : 'Créer contact'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2">
            Fermer
          </button>
          <button onClick={handleSaveNote} disabled={saving} className="btn-primary py-2">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
