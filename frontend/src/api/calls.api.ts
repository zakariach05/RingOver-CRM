import api from '../utils/api'

export interface Call {
  id: string
  fromNumber: string
  toNumber: string
  direction: string
  status: string
  duration: number | null
  agentId: string
  contactId: string | null
  note: string | null
  recordingUrl: string | null
  startedAt: string
  endedAt: string | null
  teamId: string
  contact?: { id: string; name: string; phone: string; email?: string } | null
  agent?: { id: string; name: string }
}

export interface CallListResponse {
  calls: Call[]
  total: number
  page: number
  pageSize: number
}

export const callsApi = {
  initiate: (toNumber: string, contactId?: string) =>
    api.post<{ call: Call }>('/api/calls/initiate', { toNumber, contactId }),

  list: (params?: Record<string, string>) =>
    api.get<CallListResponse>('/api/calls', { params }),

  get: (id: string) =>
    api.get<Call>(`/api/calls/${id}`),

  hangup: (id: string) =>
    api.patch<Call>(`/api/calls/${id}/hangup`),

  update: (id: string, data: { note?: string; contactId?: string }) =>
    api.patch<Call>(`/api/calls/${id}`, data),
}
