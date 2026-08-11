function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0') && digits.length >= 10) return '33' + digits.slice(1)
  return digits
}

export function openWhatsApp(phone: string) {
  window.open(`https://wa.me/${normalizePhone(phone)}`, '_blank')
}
