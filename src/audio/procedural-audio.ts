import { StudioProject } from "../utils/types";
import { computeSceneTimeline, seededRandom } from "../utils/animation-math";

/**
 * Generates a deterministic 16-bit PCM WAV buffer containing:
 * 1. Ambient background music harmonic progression matching the project's bgmMood
 * 2. Scene transition sound effects
 * 3. Spoken-cadence synthesized voice-over envelope synchronized to each scene's narrationText
 */
export function generateProjectWavBytes(
  project: StudioProject,
  sampleRate = 22050,
): Uint8Array {
  const { timings, totalFrames } = computeSceneTimeline(
    project.scenes,
    project.brief.fps,
  );
  const durationSec = Math.max(1, totalFrames / project.brief.fps);
  const numSamples = Math.floor(durationSec * sampleRate);

  const headerSize = 44;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

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
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const moodRootFreq: Record<string, number[]> = {
    "orchestral-wonder": [146.83, 220.0, 293.66, 369.99],
    "ambient-synth": [130.81, 196.0, 261.63, 311.13],
    "cinematic-pulse": [110, 164.81, 220, 277.18],
    "lofi-warmth": [196.0, 246.94, 293.66, 392.0],
  };

  const freqs =
    moodRootFreq[project.brief.bgmMood] ?? moodRootFreq["orchestral-wonder"];

  const bgmTrack = project.audioTracks.find((t) => t.type === "bgm");
  const voTrack = project.audioTracks.find((t) => t.type === "voiceover");
  const sfxTrack = project.audioTracks.find((t) => t.type === "sfx");

  const bgmGain = bgmTrack && !bgmTrack.muted ? bgmTrack.volume * 0.28 : 0;
  const voGain = voTrack && !voTrack.muted ? voTrack.volume * 0.35 : 0;
  const sfxGain = sfxTrack && !sfxTrack.muted ? sfxTrack.volume * 0.25 : 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentFrame = t * project.brief.fps;

    const chordIdx = Math.floor(t / 2.5) % freqs.length;
    const root = freqs[chordIdx];
    const fifth = root * 1.498;
    const octave = root * 2;

    const padEnvelope =
      Math.min(1, t / 0.4) * Math.min(1, (durationSec - t) / 0.5);
    const bgmSample =
      (Math.sin(2 * Math.PI * root * t) * 0.5 +
        Math.sin(2 * Math.PI * fifth * t) * 0.3 +
        Math.sin(2 * Math.PI * octave * t + Math.sin(t * 3) * 0.2) * 0.2) *
      padEnvelope *
      bgmGain;

    let activeTiming = timings[0];
    let activeIdx = 0;
    for (let idx = 0; idx < timings.length; idx++) {
      const interval = timings[idx];
      if (
        currentFrame >= interval.startFrame &&
        currentFrame < interval.endFrame
      ) {
        activeTiming = interval;
        activeIdx = idx;
        break;
      }
    }

    let sfxSample = 0;
    let voSample = 0;

    if (activeTiming) {
      const localSec =
        (currentFrame - activeTiming.startFrame) / project.brief.fps;
      if (localSec < 0.45 && sfxGain > 0) {
        const sweepFreq = 220 + (1 - localSec / 0.45) * 440;
        const noise = seededRandom(i % 9973) * 2 - 1;
        sfxSample =
          (Math.sin(2 * Math.PI * sweepFreq * localSec) * 0.7 + noise * 0.3) *
          (1 - localSec / 0.45) *
          sfxGain;
      }

      if (
        voGain > 0 &&
        activeTiming.scene.narrationText.trim().length > 0 &&
        localSec > 0.35 &&
        localSec < activeTiming.scene.durationInSeconds - 0.3
      ) {
        const syllableIndex = Math.floor(localSec * 6.5);
        const syllablePhase = (localSec * 6.5) % 1;
        const syllableActive =
          seededRandom(syllableIndex * 31 + activeIdx * 17) > 0.22;

        if (syllableActive) {
          const syllableEnv = Math.sin(syllablePhase * Math.PI);
          const pitchMod =
            165 +
            seededRandom(syllableIndex * 13 + activeIdx) * 45 +
            Math.sin(localSec * 12) * 8;
          const formant1 = Math.sin(2 * Math.PI * pitchMod * t);
          const formant2 = Math.sin(2 * Math.PI * pitchMod * 2.4 * t) * 0.45;
          voSample = (formant1 + formant2) * syllableEnv * voGain * 0.45;
        }
      }
    }

    const combined = Math.max(
      -0.98,
      Math.min(0.98, bgmSample + sfxSample + voSample),
    );
    const pcmValue = Math.floor(combined * 32767);
    view.setInt16(headerSize + i * 2, pcmValue, true);
  }

  return new Uint8Array(buffer);
}

export function generateProjectWavBase64(project: StudioProject): string {
  const bytes = generateProjectWavBytes(project);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function createProjectAudioBlobUrl(project: StudioProject): string {
  const bytes = generateProjectWavBytes(project);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
