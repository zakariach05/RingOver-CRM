import { useState } from 'react'
import { X, Send, Save, MessageSquare, Loader2 } from 'lucide-react'
import api from '../../utils/api'

interface SmsComposerProps {
  toNumber: string
  contactName?: string
  contactId?: string
  onClose: () => void
  onSent?: () => void
}

export default function SmsComposer({ toNumber, contactName, contactId, onClose, onSent }: SmsComposerProps) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<'sent' | 'failed' | 'saved' | null>(null)

  const handleSend = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await api.post('/api/sms/send', {
        toNumber,
        body: body.trim(),
        contactId,
      })

      // Poll for status update
      const smsId = res.data.sms.id
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const statusRes = await api.get(`/api/sms/${smsId}`)
          if (statusRes.data.status === 'SENT' || statusRes.data.status === 'FAILED' || attempts > 10) {
            clearInterval(poll)
            setResult(statusRes.data.status === 'SENT' ? 'sent' : 'failed')
          }
        } catch {
          if (attempts > 10) {
            clearInterval(poll)
            setResult('sent')
          }
        }
      }, 300)

      setTimeout(() => {
        clearInterval(poll)
        if (!result) setResult('sent')
      }, 4000)

      onSent?.()
    } catch {
      setResult('failed')
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!body.trim()) return
    setSaving(true)
    try {
      await api.post('/api/sms/draft', {
        toNumber,
        body: body.trim(),
        contactId,
      })
      setResult('saved')
      onSent?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (result === 'sent') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
          <div className="p-6 text-center">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">SMS envoyé</h3>
            <p className="text-sm text-gray-500">
              Message envoyé à {contactName || toNumber}
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Envoyer un SMS</h2>
              <p className="text-xs text-gray-500">À {contactName || toNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-400">Destinataire : <span className="font-medium text-gray-600">{toNumber}</span></div>

          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Votre message..."
            maxLength={1600}
          />

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>{body.length}/1600</span>
            {result === 'failed' && <span className="text-red-500">Échec de l'envoi</span>}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={!body.trim() || saving}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            Brouillon
          </button>
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
