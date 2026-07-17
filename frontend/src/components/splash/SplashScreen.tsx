import { useState, useEffect } from 'react'

interface SplashScreenProps {
  visible: boolean
  error?: boolean
}

export default function SplashScreen({ visible, error }: SplashScreenProps) {
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (visible && !fadeOut) {
      setFadeOut(true)
    }
  }, [visible, fadeOut])

  useEffect(() => {
    if (fadeOut) {
      const timeout = setTimeout(() => setShow(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [fadeOut])

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <img
            src="/logo - Head.png"
            alt="RingOver"
            className="w-20 h-20 rounded-2xl object-cover shadow-2xl shadow-primary-500/30"
          />
          <div className="absolute -inset-1 rounded-2xl bg-primary-500/20 blur-lg animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">RingOver CRM</h1>
          <p className="text-sm text-gray-400 mt-1">Téléphonie d'entreprise</p>
        </div>

        {error ? (
          <p className="text-sm text-red-400 animate-pulse">Redirection vers la connexion...</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-1 w-24 rounded-full bg-gray-700 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
