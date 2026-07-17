import api from '../utils/api'

export interface Deal {
  id: string
  title: string
  value: number
  stage: string
  contactId: string
  ownerId: string
  teamId: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
  contact?: { id: string; name: string; phone: string; email?: string; company?: string }
  owner?: { id: string; name: string; email?: string }
}

export interface DealListResponse {
  deals: Deal[]
  total: number
  page: number
  pageSize: number
}

export interface DealFormData {
  title: string
  value: number
  stage?: string
  contactId?: string
}

export const dealsApi = {
  list: (params?: Record<string, string>) =>
    api.get<DealListResponse>('/deals', { params }),

  get: (id: string) =>
    api.get<Deal>(`/deals/${id}`),

  create: (data: DealFormData) =>
    api.post<{ deal: Deal }>('/deals', data),

  update: (id: string, data: Partial<DealFormData>) =>
    api.put<Deal>(`/deals/${id}`, data),

  updateStage: (id: string, stage: string) =>
    api.patch<Deal>(`/deals/${id}/stage`, { stage }),

  delete: (id: string) =>
    api.delete(`/deals/${id}`),

  reassign: (id: string, ownerId: string) =>
    api.patch<Deal>(`/deals/${id}/owner`, { ownerId }),
}
