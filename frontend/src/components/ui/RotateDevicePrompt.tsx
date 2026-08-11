import { Smartphone, RotateCcw } from 'lucide-react'

/**
 * RotateDevicePrompt — affichée UNIQUEMENT sur la page des affaires.
 * CSS dans index.css : bloque tout le contenu en mode portrait mobile.
 * @media screen and (orientation: portrait) and (max-width: 900px)
 */
export default function RotateDevicePrompt() {
  return (
    <div id="rotate-toast">
      <div id="rotate-toast-card">
        <div id="rotate-toast-bar" />

        {/* Icône téléphone animé */}
        <div id="rotate-toast-icon">
          <Smartphone />
        </div>

        {/* Badge urgent */}
        <div id="rotate-toast-badge">
          <div id="rotate-toast-dot" />
          Action requise
        </div>

        {/* Titre */}
        <div id="rotate-toast-title">Pivotez votre téléphone</div>

        {/* Description */}
        <div id="rotate-toast-body">
          Le pipeline des affaires s'affiche en mode <strong>paysage</strong> uniquement.
          Veuillez tourner votre appareil pour continuer.
        </div>

        {/* Hint */}
        <div id="rotate-toast-hint">
          <RotateCcw />
          Tournez en mode paysage
        </div>
      </div>
    </div>
  )
}
