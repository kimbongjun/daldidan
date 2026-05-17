'use client';

// iOS hardware mute switch bypasses: playing an <audio> element promotes the
// audio session from "soloAmbient" (respects mute) to "playback" (ignores it).
// A single looping silent WAV is enough to hold that session open.
let _el: HTMLAudioElement | null = null;

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export function ensureAudioUnlocked(): void {
  if (typeof window === 'undefined' || _el) return;
  const el = document.createElement('audio');
  el.src = SILENT_WAV;
  el.loop = true;
  el.volume = 0.001;
  void el.play().catch(() => {});
  _el = el;
}
