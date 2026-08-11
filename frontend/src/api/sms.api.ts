import api from '../utils/api'

export interface SmsConversation {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  contactCompany?: string
  lastMessage?: string
  lastAt?: string
  unreadCount: number
}

export interface SmsMessage {
  id: string
  conversationId: string
  direction: 'INBOUND' | 'OUTBOUND'
  body: string
  status: string
  ringoverSmsId?: string
  sentAt: string
}

export interface CrmContact {
  id: string
  name: string
  phone: string
  company?: string
}

export const smsApi = {
  // Nombre de SMS non lus (pour le badge sidebar)
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/api/sms/unread-count')
    return res.data.count ?? 0
  },

  // Liste des conversations
  getConversations: async (q?: string): Promise<SmsConversation[]> => {
    const res = await api.get('/api/sms/conversations', { params: q ? { q } : {} })
    return res.data.conversations ?? []
  },

  // Messages d'une conversation
  getMessages: async (conversationId: string): Promise<SmsMessage[]> => {
    const res = await api.get(`/api/sms/conversations/${conversationId}/messages`)
    return res.data.messages ?? []
  },

  // Envoyer un SMS
  sendSms: async (conversationId: string, body: string): Promise<SmsMessage> => {
    const res = await api.post('/api/sms/send', { conversationId, body })
    return res.data.message
  },

  // Marquer une conversation comme lue
  markAsRead: async (conversationId: string): Promise<void> => {
    await api.patch(`/api/sms/conversations/${conversationId}/read`)
  },

  // Démarrer une nouvelle conversation à partir d'un contact CRM
  startConversation: async (contactId: string): Promise<SmsConversation> => {
    const res = await api.post('/api/sms/conversations', { contactId })
    return res.data.conversation
  },

  // Contacts CRM disponibles pour démarrer une conversation
  getContactsForNewConv: async (q?: string): Promise<CrmContact[]> => {
    const res = await api.get('/api/sms/contacts-without-conversation', { params: q ? { q } : {} })
    return res.data.contacts ?? []
  },
}
