/**
 * Moteur sonore d'interaction instantané, doux et normalisé pour UpCoin (Web Audio API).
 * 
 * Toutes les sonorités sont normalisées à un niveau doux et feutré (micro-feedbacks discrets)
 * avec des tampons audio pré-synthétisés en mémoire (AudioBuffer) pour 0ms de latence.
 */

const SOUND_PREFERENCE_KEY = "upcoin-sound-enabled";
const PREFERENCE_CHANGE_EVENT = "upcoin-preference-change";
const SAMPLE_RATE = 44100;
const MASTER_VOLUME = 0.35; // Volume général doux et confortable

type SoundName =
  | "tap"
  | "pop"
  | "toggleOn"
  | "toggleOff"
  | "stepUp"
  | "stepDown"
  | "modalOpen"
  | "modalClose"
  | "success"
  | "failure"
  | "error";

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
const audioBuffers = new Map<SoundName, AudioBuffer>();
const wavDataUris = new Map<SoundName, string>();
let pendingAutoplaySound: SoundName | null = null;
let lastPlayTimes = new Map<string, number>();

// --- NORMALISATION AUTOMATIQUE DU VOLUME DES SIGNAUX ---

function normalizeSamples(samples: Float32Array, targetPeak = 0.08): Float32Array {
  let maxPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0) {
    const scale = targetPeak / maxPeak;
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= scale;
    }
  }
  return samples;
}

// --- GÉNÉRATEURS DE SIGNAUX ACOUSTIQUES FEUTRÉS ---

function generateSamples(type: SoundName): Float32Array {
  let length = 0;
  let targetPeak = 0.075;
  let generator: (t: number) => number;

  switch (type) {
    case "tap": {
      // Tap feutré très doux (0.038s)
      length = Math.floor(SAMPLE_RATE * 0.038);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.038;
        const freq = 340 - progress * 190;
        const env = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.009);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "pop": {
      // Bulle acoustique discrète (0.045s)
      length = Math.floor(SAMPLE_RATE * 0.045);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.045;
        const freq = 460 - progress * 210;
        const env = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "toggleOn": {
      // Interrupteur montant feutré (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      targetPeak = 0.075;
      generator = (t) => {
        let sample = 0;
        if (t < 0.045) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 440 * t) * env1 * 0.8;
        }
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 660 * t2) * env2;
        }
        return sample;
      };
      break;
    }
    case "toggleOff": {
      // Interrupteur descendant feutré (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      targetPeak = 0.075;
      generator = (t) => {
        let sample = 0;
        if (t < 0.045) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 580 * t) * env1 * 0.8;
        }
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 390 * t2) * env2;
        }
        return sample;
      };
      break;
    }
    case "stepUp": {
      // Étape suivante douce (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 420 + progress * 170;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "stepDown": {
      // Étape précédente douce (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 530 - progress * 150;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "modalOpen": {
      // Ouverture aérienne très douce (0.07s)
      length = Math.floor(SAMPLE_RATE * 0.07);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.07;
        const freq = 280 + progress * 190;
        const env = Math.sin(Math.min(1, t / 0.005) * Math.PI * 0.5) * Math.exp(-t / 0.022);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "modalClose": {
      // Fermeture aérienne très douce (0.06s)
      length = Math.floor(SAMPLE_RATE * 0.06);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.06;
        const freq = 410 - progress * 170;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.018);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "success": {
      // Carillon de succès harmonique équilibré (0.55s) : C5 -> E5 -> G5 -> C6
      length = Math.floor(SAMPLE_RATE * 0.55);
      targetPeak = 0.085;
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 523.25, start: 0.00, decay: 0.14, gain: 0.75 },
          { freq: 659.25, start: 0.06, decay: 0.16, gain: 0.85 },
          { freq: 783.99, start: 0.12, decay: 0.18, gain: 0.95 },
          { freq: 1046.5, start: 0.18, decay: 0.24, gain: 1.05 },
        ];
        for (const note of notes) {
          if (t >= note.start) {
            const dt = t - note.start;
            const env = Math.sin(Math.min(1, dt / 0.006) * Math.PI * 0.5) * Math.exp(-dt / note.decay);
            const tone = Math.sin(2 * Math.PI * note.freq * dt) + 0.15 * Math.sin(4 * Math.PI * note.freq * dt);
            sample += tone * env * note.gain;
          }
        }
        return sample;
      };
      break;
    }
    case "failure": {
      // Mélodie d'échec / annulation feutrée et apaisante (0.50s) : A4 -> F4 -> D4
      length = Math.floor(SAMPLE_RATE * 0.50);
      targetPeak = 0.08;
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 440.00, start: 0.00, decay: 0.12, gain: 0.8 },
          { freq: 349.23, start: 0.11, decay: 0.14, gain: 0.9 },
          { freq: 293.66, start: 0.22, decay: 0.22, gain: 1.0 },
        ];
        for (const note of notes) {
          if (t >= note.start) {
            const dt = t - note.start;
            const env = Math.sin(Math.min(1, dt / 0.006) * Math.PI * 0.5) * Math.exp(-dt / note.decay);
            const tone = Math.sin(2 * Math.PI * note.freq * dt);
            sample += tone * env * note.gain;
          }
        }
        return sample;
      };
      break;
    }
    case "error": {
      // Avertissement discret feutré (0.12s)
      length = Math.floor(SAMPLE_RATE * 0.12);
      targetPeak = 0.07;
      generator = (t) => {
        let sample = 0;
        if (t < 0.06) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.015);
          sample += Math.sin(2 * Math.PI * 280 * t) * env1 * 0.8;
        }
        if (t >= 0.045) {
          const t2 = t - 0.045;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.02);
          sample += Math.sin(2 * Math.PI * 230 * t2) * env2;
        }
        return sample;
      };
      break;
    }
  }

  const rawSamples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    rawSamples[i] = generator(t);
  }
  return normalizeSamples(rawSamples, targetPeak);
}

// Convertit des échantillons PCM Float32 en Data URI WAV standard
function samplesToWavDataUri(samples: Float32Array): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // En-tête RIFF
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass({ latencyHint: "interactive" });
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.setValueAtTime(MASTER_VOLUME, audioCtx.currentTime);
      masterGainNode.connect(audioCtx.destination);
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function getAudioBuffer(name: SoundName): AudioBuffer | null {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return null;

  let buf = audioBuffers.get(name);
  if (!buf) {
    const samples = generateSamples(name);
    buf = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buf.getChannelData(0).set(samples);
    audioBuffers.set(name, buf);
  }
  return buf;
}

function getWavDataUri(name: SoundName): string {
  let uri = wavDataUris.get(name);
  if (!uri) {
    const samples = generateSamples(name);
    uri = samplesToWavDataUri(samples);
    wavDataUris.set(name, uri);
  }
  return uri;
}

// Pré-synthèse immédiate à l'initialisation du module pour éliminer TOUTE latence
if (typeof window !== "undefined") {
  const preloadSounds = () => {
    const soundList: SoundName[] = [
      "tap",
      "pop",
      "toggleOn",
      "toggleOff",
      "stepUp",
      "stepDown",
      "modalOpen",
      "modalClose",
      "success",
      "failure",
      "error",
    ];
    for (const s of soundList) {
      getWavDataUri(s);
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preloadSounds);
  } else {
    window.setTimeout(preloadSounds, 10);
  }

  // Déverrouillage automatique et déchargement des sons en attente (autoplay)
  const unlockAndFlush = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => {
        if (pendingAutoplaySound) {
          const toPlay = pendingAutoplaySound;
          pendingAutoplaySound = null;
          playSound(toPlay);
        }
      }).catch(() => {});
    } else if (pendingAutoplaySound) {
      const toPlay = pendingAutoplaySound;
      pendingAutoplaySound = null;
      playSound(toPlay);
    }
  };

  const flushEvents = [
    "pointermove",
    "mousemove",
    "mouseenter",
    "pointerdown",
    "touchstart",
    "touchmove",
    "mousedown",
    "keydown",
    "scroll",
    "wheel",
    "focus",
    "visibilitychange",
  ];

  for (const eventName of flushEvents) {
    window.addEventListener(eventName, unlockAndFlush, { capture: true, passive: true });
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
  if (saved === null) return true;
  return saved === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
  if (enabled) {
    playSound("toggleOn");
  }
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

// --- MICRO-VIBRATIONS HAPTIQUES SYNCHRONISÉES (ANDROID & iOS) ---

const HAPTIC_PATTERNS: Record<SoundName, number | number[]> = {
  tap: 12,
  pop: 16,
  toggleOn: [10, 25, 14],
  toggleOff: [14, 25, 10],
  stepUp: [12, 18, 16],
  stepDown: [16, 18, 12],
  modalOpen: 18,
  modalClose: 14,
  success: [20, 40, 22, 40, 25, 40, 35],
  failure: [25, 85, 30, 80, 40],
  error: [22, 40, 35],
};

function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Impulsion haptique physique sub-basse pour iPhone (52Hz -> 32Hz)
 * Fait vibrer physiquement le châssis et le moteur acoustique de l'iPhone dans la main.
 */
function playIosHapticSubPulse(ctx: AudioContext, strength = 0.45): void {
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(52, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.028);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(strength, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Fallback silencieux
  }
}

function triggerHaptic(name: SoundName): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  // 1. Android, Chrome, Opera, etc. (Web Vibration API standard)
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      const pattern = HAPTIC_PATTERNS[name];
      if (pattern !== undefined) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignorer
    }
  }

  // 2. Apple iOS (iPhone / iPad) où Apple bloque navigator.vibrate
  if (isIosDevice()) {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "running") {
      const strength = name === "success" || name === "failure" ? 0.6 : 0.45;
      playIosHapticSubPulse(ctx, strength);
    }
  }
}

/**
 * Joue un son instantanément avec volume doux et micro-vibrations synchronisées
 */
function playSound(name: SoundName, minIntervalMs = 15): void {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  const now = performance.now();
  const lastTime = lastPlayTimes.get(name) ?? 0;
  if (now - lastTime < minIntervalMs) return;
  lastPlayTimes.set(name, now);

  // Déclenchement de la micro-vibration haptique synchronisée
  triggerHaptic(name);

  const ctx = getOrCreateAudioContext();

  if (ctx && ctx.state === "running") {
    try {
      const buffer = getAudioBuffer(name);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        if (masterGainNode) {
          source.connect(masterGainNode);
        } else {
          source.connect(ctx.destination);
        }
        source.start(0);
        return;
      }
    } catch {
      // Fallback direct
    }
  }

  // Fallback direct HTML5 Audio avec volume atténué et doux
  try {
    const audio = new Audio(getWavDataUri(name));
    audio.volume = MASTER_VOLUME;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        if (name === "success" || name === "failure") {
          pendingAutoplaySound = name;
        }
      });
    }
  } catch {
    if (name === "success" || name === "failure") {
      pendingAutoplaySound = name;
    }
  }
}

// --- FONCTIONS EXPORTÉES POUR L'APPLICATION ---

export function playTap(): void {
  playSound("tap", 20);
}

export function playPop(pitchMultiplier = 1): void {
  playSound("pop", 20);
}

export function playToggle(active = true): void {
  playSound(active ? "toggleOn" : "toggleOff", 30);
}

export function playStep(forward = true): void {
  playSound(forward ? "stepUp" : "stepDown", 30);
}

export function playModalOpen(): void {
  playSound("modalOpen", 40);
}

export function playModalClose(): void {
  playSound("modalClose", 40);
}

export function playSuccess(): void {
  playSound("success", 200);
}

export function playFailure(): void {
  playSound("failure", 200);
}

export function playError(): void {
  playSound("error", 50);
}

export function getSoundWavDataUri(name: SoundName): string {
  return getWavDataUri(name);
}
