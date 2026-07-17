let audioCtx: AudioContext | null = null
const PREF_KEY = 'ringover_call_sounds'

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, volume = 0.15, type: OscillatorType = 'sine') {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playSequence(notes: { freq: number; start: number; dur: number }[], volume?: number) {
  notes.forEach(({ freq, start, dur }) => {
    setTimeout(() => playTone(freq, dur, volume), start * 1000)
  })
}

export function playRinging() {
  playSequence([
    { freq: 440, start: 0, dur: 0.3 },
    { freq: 480, start: 0.35, dur: 0.3 },
    { freq: 440, start: 0.7, dur: 0.3 },
    { freq: 480, start: 1.05, dur: 0.3 },
  ])
}

export function playConnected() {
  playSequence([
    { freq: 523, start: 0, dur: 0.12 },
    { freq: 659, start: 0.1, dur: 0.12 },
    { freq: 784, start: 0.2, dur: 0.2 },
  ], 0.12)
}

export function playDisconnected() {
  playTone(350, 0.4, 0.1)
}

export function playMuteToggle(muted: boolean) {
  if (muted) {
    playSequence([
      { freq: 600, start: 0, dur: 0.08 },
      { freq: 400, start: 0.08, dur: 0.12 },
    ], 0.1)
  } else {
    playSequence([
      { freq: 400, start: 0, dur: 0.08 },
      { freq: 600, start: 0.08, dur: 0.12 },
    ], 0.1)
  }
}

export function playHangup() {
  playSequence([
    { freq: 480, start: 0, dur: 0.15 },
    { freq: 380, start: 0.1, dur: 0.15 },
    { freq: 280, start: 0.2, dur: 0.3 },
  ], 0.12)
}

export function playError() {
  playSequence([
    { freq: 200, start: 0, dur: 0.15 },
    { freq: 180, start: 0.15, dur: 0.15 },
    { freq: 200, start: 0.3, dur: 0.15 },
  ], 0.12)
}

export function playKeypadTone(key: string) {
  const tones: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  }
  const pair = tones[key]
  if (!pair) return
  const ctx = getCtx()
  pair.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  })
}

export function playNotification() {
  if (!soundsEnabled()) return
  playSequence([
    { freq: 880, start: 0, dur: 0.08 },
    { freq: 1100, start: 0.1, dur: 0.08 },
    { freq: 880, start: 0.2, dur: 0.15 },
  ], 0.08)
}

export function soundsEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY)
    return v === null ? true : v === 'true'
  } catch {
    return true
  }
}

export function setSoundsEnabled(enabled: boolean) {
  localStorage.setItem(PREF_KEY, String(enabled))
}
