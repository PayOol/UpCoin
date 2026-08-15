/**
 * Moteur sonore d'interaction instantané et doux pour UpCoin (Web Audio API).
 * 
 * Utilise des tampons audio pré-synthétisés en mémoire (AudioBuffer)
 * pour garantir 0ms de latence, zéro saccade et 100% de fiabilité.
 */

const SOUND_PREFERENCE_KEY = "upcoin-sound-enabled";
const PREFERENCE_CHANGE_EVENT = "upcoin-preference-change";
const SAMPLE_RATE = 44100;

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
const audioBuffers = new Map<SoundName, AudioBuffer>();
const wavDataUris = new Map<SoundName, string>();
let pendingAutoplaySound: SoundName | null = null;
let lastPlayTimes = new Map<string, number>();

// --- GÉNÉRATEURS DE SIGNAUX ACOUSTIQUES (FLUIDES ET FEUTRÉS) ---

function generateSamples(type: SoundName): Float32Array {
  let length = 0;
  let generator: (t: number) => number;

  switch (type) {
    case "tap": {
      // Tap feutré doux (0.038s)
      length = Math.floor(SAMPLE_RATE * 0.038);
      generator = (t) => {
        const progress = t / 0.038;
        const freq = 360 - progress * 200;
        const env = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.009);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.22;
      };
      break;
    }
    case "pop": {
      // Bulle acoustique (0.045s)
      length = Math.floor(SAMPLE_RATE * 0.045);
      generator = (t) => {
        const progress = t / 0.045;
        const freq = 480 - progress * 220;
        const env = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.24;
      };
      break;
    }
    case "toggleOn": {
      // Interrupteur montant doux (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      generator = (t) => {
        let sample = 0;
        // Note 1 (A4: 440Hz, t: 0..0.04s)
        if (t < 0.045) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 440 * t) * env1 * 0.16;
        }
        // Note 2 (E5: 660Hz, t: 0.035..0.09s)
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 660 * t2) * env2 * 0.20;
        }
        return sample;
      };
      break;
    }
    case "toggleOff": {
      // Interrupteur descendant doux (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      generator = (t) => {
        let sample = 0;
        if (t < 0.045) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 580 * t) * env1 * 0.16;
        }
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 390 * t2) * env2 * 0.18;
        }
        return sample;
      };
      break;
    }
    case "stepUp": {
      // Étape suivante (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 420 + progress * 180;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.20;
      };
      break;
    }
    case "stepDown": {
      // Étape précédente (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 540 - progress * 160;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.18;
      };
      break;
    }
    case "modalOpen": {
      // Ouverture aérienne (0.07s)
      length = Math.floor(SAMPLE_RATE * 0.07);
      generator = (t) => {
        const progress = t / 0.07;
        const freq = 280 + progress * 200;
        const env = Math.sin(Math.min(1, t / 0.005) * Math.PI * 0.5) * Math.exp(-t / 0.022);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.18;
      };
      break;
    }
    case "modalClose": {
      // Fermeture aérienne (0.06s)
      length = Math.floor(SAMPLE_RATE * 0.06);
      generator = (t) => {
        const progress = t / 0.06;
        const freq = 420 - progress * 180;
        const env = Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) * Math.exp(-t / 0.018);
        return Math.sin(2 * Math.PI * freq * t) * env * 0.17;
      };
      break;
    }
    case "success": {
      // Carillon de succès harmonique (0.55s) : C5 -> E5 -> G5 -> C6
      length = Math.floor(SAMPLE_RATE * 0.55);
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 523.25, start: 0.00, decay: 0.14, gain: 0.18 },
          { freq: 659.25, start: 0.06, decay: 0.16, gain: 0.20 },
          { freq: 783.99, start: 0.12, decay: 0.18, gain: 0.22 },
          { freq: 1046.5, start: 0.18, decay: 0.24, gain: 0.26 },
        ];
        for (const note of notes) {
          if (t >= note.start) {
            const dt = t - note.start;
            const env = Math.sin(Math.min(1, dt / 0.006) * Math.PI * 0.5) * Math.exp(-dt / note.decay);
            // Légère composante harmonique douce (octave adoucie)
            const tone = Math.sin(2 * Math.PI * note.freq * dt) + 0.2 * Math.sin(4 * Math.PI * note.freq * dt);
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
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 440.00, start: 0.00, decay: 0.12, gain: 0.17 },
          { freq: 349.23, start: 0.11, decay: 0.14, gain: 0.19 },
          { freq: 293.66, start: 0.22, decay: 0.22, gain: 0.22 },
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
      generator = (t) => {
        let sample = 0;
        if (t < 0.06) {
          const env1 = Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) * Math.exp(-t / 0.015);
          sample += Math.sin(2 * Math.PI * 280 * t) * env1 * 0.18;
        }
        if (t >= 0.045) {
          const t2 = t - 0.045;
          const env2 = Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) * Math.exp(-t2 / 0.02);
          sample += Math.sin(2 * Math.PI * 230 * t2) * env2 * 0.20;
        }
        return sample;
      };
      break;
    }
  }

  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = generator(t);
  }
  return samples;
}

// Convertit des échantillons PCM Float32 en Data URI WAV standard pour fallback instantané
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

  // Pré-chargement des sons en arrière-plan
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

/**
 * Joue un son instantanément (0ms de latence via AudioBuffer ou fallback HTML5 Audio)
 */
function playSound(name: SoundName, minIntervalMs = 15): void {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  const now = performance.now();
  const lastTime = lastPlayTimes.get(name) ?? 0;
  if (now - lastTime < minIntervalMs) return;
  lastPlayTimes.set(name, now);

  const ctx = getOrCreateAudioContext();

  if (ctx && ctx.state === "running") {
    try {
      const buffer = getAudioBuffer(name);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        return;
      }
    } catch {
      // Fallback direct
    }
  }

  // Fallback direct HTML5 Audio pour un déclenchement garanti
  try {
    const audio = new Audio(getWavDataUri(name));
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Enregistre pour lecture dès la première interaction
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

/**
 * Déclenché au chargement de la page de succès ou validation de paiement
 */
export function playSuccess(): void {
  playSound("success", 200);
}

/**
 * Déclenché au chargement de la page d'échec ou annulation de paiement
 */
export function playFailure(): void {
  playSound("failure", 200);
}

export function playError(): void {
  playSound("error", 50);
}

export function getSoundWavDataUri(name: SoundName): string {
  return getWavDataUri(name);
}

