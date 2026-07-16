export interface Contact {
  id: string
  name: string
  company: string | null
  phone: string
  email: string | null
  tags: string | null // Will be parsed as string array in components
  notes: string | null
  ownerId: string | null
  teamId: string
  owner?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export interface ContactFormData {
  name: string
  company: string
  phone: string
  email: string
  tags: string[]
  notes: string
  ownerId: string
}
