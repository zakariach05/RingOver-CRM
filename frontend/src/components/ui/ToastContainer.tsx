import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast, ToastType } from '../../contexts/ToastContext'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-gray-900 text-white rounded-lg shadow-2xl border-l-4 ${BORDER_COLORS[toast.type]} px-4 py-3 flex items-start gap-3 animate-slide-up`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
