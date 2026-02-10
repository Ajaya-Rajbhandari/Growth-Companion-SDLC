/**
 * Break notification sounds: options and playback.
 * Selection is stored in localStorage (companion-notification-sound).
 */

const STORAGE_KEY = "companion-notification-sound"

export const SOUND_OPTIONS = [
  { id: "default", label: "Default beep" },
  { id: "bell", label: "Bell" },
  { id: "chime", label: "Chime" },
  { id: "gentle", label: "Gentle" },
  { id: "digital", label: "Digital" },
] as const

export type NotificationSoundId = (typeof SOUND_OPTIONS)[number]["id"]

const DEFAULT_WAV =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRY/l9TejGQfCEWd2NuJYyEISZzX2opkIglKm9fbjGQhCEqc19qLZCEISZvX24xkIQhKnNfai2QhCEqb19uMZCEISZzX2otkIQhKm9fbjGQhCEmc19qLZCEISpvX24xkIQhJnNfai2QhCEqb19uMZCEISZzX2otkIQhKm9fbjGQhCEmc"

let defaultAudio: HTMLAudioElement | null = null
let defaultAlarmInterval: ReturnType<typeof setInterval> | null = null
let webAudioInterval: ReturnType<typeof setInterval> | null = null
let audioContext: AudioContext | null = null
let previewAudio: HTMLAudioElement | null = null
let previewContext: AudioContext | null = null
let previewTimeout: ReturnType<typeof setTimeout> | null = null

function getDefaultAudio(): HTMLAudioElement {
  if (!defaultAudio) {
    defaultAudio = new Audio()
    defaultAudio.src = DEFAULT_WAV
  }
  return defaultAudio
}

function resetDefaultAudio(): void {
  const audio = getDefaultAudio()
  audio.pause()
  audio.currentTime = 0
  audio.loop = false
  audio.src = DEFAULT_WAV
}

function clearPreview(): void {
  if (previewTimeout) {
    clearTimeout(previewTimeout)
    previewTimeout = null
  }
  if (previewAudio) {
    previewAudio.pause()
    previewAudio.src = ""
    previewAudio = null
  }
  if (previewContext && previewContext.state !== "closed") {
    previewContext.close().catch(() => {})
    previewContext = null
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  gain = 0.3,
  startTime = 0,
): void {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g)
  g.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = "sine"
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(gain, startTime + 0.02)
  g.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

function playBell(ctx: AudioContext, at: number): void {
  playTone(ctx, 880, 0.15, 0.25, at)
  playTone(ctx, 660, 0.2, 0.2, at + 0.18)
}

function playChime(ctx: AudioContext, at: number): void {
  playTone(ctx, 523, 0.12, 0.22, at)
  playTone(ctx, 659, 0.12, 0.2, at + 0.14)
  playTone(ctx, 784, 0.2, 0.18, at + 0.28)
}

function playGentle(ctx: AudioContext, at: number): void {
  playTone(ctx, 440, 0.4, 0.15, at)
}

function playDigital(ctx: AudioContext, at: number): void {
  playTone(ctx, 1200, 0.08, 0.2, at)
  playTone(ctx, 1000, 0.08, 0.18, at + 0.1)
  playTone(ctx, 800, 0.1, 0.15, at + 0.2)
}

function playWebAudioPattern(ctx: AudioContext, soundId: Exclude<NotificationSoundId, "default">): void {
  if (ctx.state === "suspended") {
    ctx.resume().then(() => playWebAudioPattern(ctx, soundId)).catch(() => {})
    return
  }
  if (soundId === "bell") {
    playBell(ctx, 0)
  } else if (soundId === "chime") {
    playChime(ctx, 0)
  } else if (soundId === "gentle") {
    playGentle(ctx, 0)
  } else if (soundId === "digital") {
    playDigital(ctx, 0)
  }
}

export function getStoredSoundId(): NotificationSoundId {
  if (typeof window === "undefined") return "default"
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && SOUND_OPTIONS.some((o) => o.id === v)) return v as NotificationSoundId
  } catch {}
  return "default"
}

export function setStoredSoundId(id: NotificationSoundId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {}
}

export function playNotificationSound(soundId: NotificationSoundId, loop: boolean): void {
  stopNotificationSound()

  if (!loop) {
    clearPreview()
    if (soundId === "default") {
      previewAudio = new Audio(DEFAULT_WAV)
      previewAudio.play().catch(() => {})
      previewTimeout = setTimeout(() => clearPreview(), 800)
      return
    }
    if (typeof window === "undefined") return
    previewContext = new AudioContext()
    const ctx = previewContext
    playWebAudioPattern(ctx, soundId)
    previewTimeout = setTimeout(() => clearPreview(), 900)
    return
  }

  if (soundId === "default") {
    const playNewDefault = () => {
      const a = new Audio(DEFAULT_WAV)
      a.play().catch(() => {})
    }
    playNewDefault()
    defaultAlarmInterval = setInterval(playNewDefault, 900)
    return
  }

  if (typeof window === "undefined") return
  const playOnce = () => {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext()
    }
    const ctx = audioContext
    playWebAudioPattern(ctx, soundId)
  }
  playOnce()
  const intervalMs = soundId === "gentle" ? 2200 : 1600
  webAudioInterval = setInterval(playOnce, intervalMs)
}

export function stopNotificationSound(): void {
  if (defaultAlarmInterval) {
    clearInterval(defaultAlarmInterval)
    defaultAlarmInterval = null
  }
  if (webAudioInterval) {
    clearInterval(webAudioInterval)
    webAudioInterval = null
  }
  resetDefaultAudio()
  clearPreview()
}

/** Call on first user gesture so later playback is not blocked by browser autoplay policy. */
export function unlockNotificationAudio(): void {
  resetDefaultAudio()
  const audio = getDefaultAudio()
  audio.play().then(() => { resetDefaultAudio() }).catch(() => {})
}
