/**
 * Small, soft interface sounds, made in the browser (no audio files to download).
 *  - "notify":  a two-note chime when a new notification arrives
 *  - "success": a light rising chime when something worked
 *  - "error":   a low, gentle two-note tone when something went wrong
 * Browsers only allow sound after the person has tapped or typed on the page, so the audio
 * starts on their first interaction. People can turn sounds off on their profile.
 */
export type SoundName = "notify" | "success" | "error";

const KEY = "eban-sounds";
let ctx: AudioContext | null = null;
let lastPlayed = 0;

export const soundsOn = () => {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
};
export const setSoundsOn = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
};

const audio = () => {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
};

// Unlock audio on the first tap or key press.
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = audio();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

const note = (c: AudioContext, freq: number, start: number, length: number, volume: number, type: OscillatorType = "sine") => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
};

export const playSound = (name: SoundName) => {
  if (!soundsOn()) return;
  const now = Date.now();
  if (now - lastPlayed < 250) return; // never stack sounds
  lastPlayed = now;
  try {
    const c = audio();
    if (!c || c.state !== "running") return;
    const t = c.currentTime + 0.01;
    if (name === "notify") {
      note(c, 784, t, 0.35, 0.12);          // G5
      note(c, 1175, t + 0.12, 0.5, 0.1);    // D6
      note(c, 1568, t + 0.12, 0.4, 0.025);  // soft shimmer
    } else if (name === "success") {
      note(c, 659, t, 0.22, 0.08);          // E5
      note(c, 880, t + 0.08, 0.3, 0.08);    // A5
    } else {
      note(c, 330, t, 0.22, 0.09, "triangle");        // E4
      note(c, 262, t + 0.14, 0.32, 0.09, "triangle"); // C4
    }
  } catch { /* sound is a nice-to-have */ }
};
