import React, { useEffect, useState } from "react";
import {
  Mic,
  RefreshCw,
  Volume2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  HardDrive,
  Globe,
  Sliders,
  Plus,
  Loader2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  OmniVoiceAccent,
  OmniVoiceAge,
  OmniVoiceGender,
  OmniVoicePitch,
  OmniVoiceSpeechResponse,
  OmniVoiceStyle,
  StoryboardScene,
  StudioProject,
  VoiceProfileConfig,
  VoiceStudioStatusResponse,
} from "../utils/types";
import {
  BUILT_IN_VOICE_PROFILES,
  OMNIVOICE_INSTRUCT_PRESETS,
  OMNIVOICE_SUPPORTED_LANGUAGES,
} from "../assets/preset-library";
import { sanitizeOmniVoiceInstruct } from "../utils/animation-math";

interface VoiceStudioPanelProps {
  project: StudioProject;
  onUpdateScene: (scene: StoryboardScene) => void;
  onAssignCharacterVoice: (
    characterId: string,
    profile: VoiceProfileConfig,
  ) => void;
}

export const VoiceStudioPanel: React.FC<VoiceStudioPanelProps> = ({
  project,
  onUpdateScene,
  onAssignCharacterVoice,
}) => {
  const [status, setStatus] = useState<VoiceStudioStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [synthesizingSceneId, setSynthesizingSceneId] = useState<string | null>(
    null,
  );
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);
  const [sceneErrors, setSceneErrors] = useState<Record<string, string>>({});
  const [generationHistory, setGenerationHistory] = useState<
    Array<{
      id: string;
      sceneTitle: string;
      voiceId: string;
      language: string;
      audioUrl: string;
      durationSeconds: number;
      cached: boolean;
      timestamp: string;
    }>
  >([]);

  // Custom profile form state
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileId, setNewProfileId] = useState("");
  const [newGender, setNewGender] = useState<OmniVoiceGender>("female");
  const [newAge, setNewAge] = useState<OmniVoiceAge>("young adult");
  const [newPitch, setNewPitch] = useState<OmniVoicePitch>("moderate pitch");
  const [newStyle, setNewStyle] = useState<OmniVoiceStyle>("none");
  const [newAccent, setNewAccent] =
    useState<OmniVoiceAccent>("american accent");
  const [newLanguage, setNewLanguage] = useState<string>("en");
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/voicestudio/status");
      const data = (await res.json()) as VoiceStudioStatusResponse;
      setStatus(data);
    } catch (err) {
      setStatus({
        connected: false,
        baseUrl: "http://localhost:3900",
        engine: "omnivoice",
        omniVoiceLoaded: false,
        availableVoices: BUILT_IN_VOICE_PROFILES,
        supportedLanguages: OMNIVOICE_SUPPORTED_LANGUAGES.map((l) => l.code),
        hardware: null,
        errorMessage:
          err instanceof Error
            ? err.message
            : "Could not reach backend VoiceStudio adapter.",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const availableVoices = status?.availableVoices?.length
    ? status.availableVoices
    : BUILT_IN_VOICE_PROFILES;

  const handleSynthesizeScene = async (scene: StoryboardScene) => {
    setSynthesizingSceneId(scene.id);
    setSceneErrors((prev) => ({ ...prev, [scene.id]: "" }));

    const voiceId = scene.dialogueVoiceId || "nemo";
    const profile =
      availableVoices.find((v) => v.voiceId === voiceId) ??
      BUILT_IN_VOICE_PROFILES[0];
    const language = scene.dialogueLanguage || profile.language || "en";
    const speed = scene.dialogueSpeed || profile.speed || 1.0;
    const instruct = sanitizeOmniVoiceInstruct(
      scene.dialogueInstruct || profile.instruct,
    );

    try {
      const res = await fetch("/api/voicestudio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: scene.id,
          text: scene.narrationText,
          voiceId,
          language,
          speed,
          instruct,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const speech = data as OmniVoiceSpeechResponse;
      onUpdateScene({
        ...scene,
        dialogueVoiceId: voiceId,
        dialogueLanguage: language,
        dialogueSpeed: speed,
        dialogueInstruct: instruct,
        dialogueAudioUrl: speech.audioUrl,
        dialogueAudioDurationSec: speech.durationSeconds,
        dialogueAudioCacheKey: speech.cacheKey,
        dialogueLipSync: speech.lipSync,
        dialogueWordTimings: speech.wordTimings,
      });

      setGenerationHistory((prev) => [
        {
          id: `${scene.id}-${Date.now()}`,
          sceneTitle: scene.title,
          voiceId,
          language,
          audioUrl: speech.audioUrl,
          durationSeconds: speech.durationSeconds,
          cached: speech.cached,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setSceneErrors((prev) => ({
        ...prev,
        [scene.id]:
          err instanceof Error
            ? err.message
            : "OmniVoice speech generation failed.",
      }));
    } finally {
      setSynthesizingSceneId(null);
    }
  };

  const handleUploadSceneDialogue = async (
    scene: StoryboardScene,
    file: File,
  ) => {
    setUploadingSceneId(scene.id);
    setSceneErrors((prev) => ({ ...prev, [scene.id]: "" }));

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read audio file."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/voicestudio/upload-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: scene.id,
          text: scene.narrationText,
          voiceId: scene.dialogueVoiceId || "nemo",
          language: scene.dialogueLanguage || "en",
          audioBase64: dataUrl,
          fileName: file.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const speech = data as OmniVoiceSpeechResponse;
      onUpdateScene({
        ...scene,
        dialogueAudioUrl: speech.audioUrl,
        dialogueAudioDurationSec: speech.durationSeconds,
        dialogueAudioCacheKey: speech.cacheKey,
        dialogueLipSync: speech.lipSync,
        dialogueWordTimings: speech.wordTimings,
      });

      setGenerationHistory((prev) => [
        {
          id: `${scene.id}-${Date.now()}`,
          sceneTitle: scene.title,
          voiceId: `${scene.dialogueVoiceId || "custom"} (Uploaded WAV)`,
          language: scene.dialogueLanguage || "en",
          audioUrl: speech.audioUrl,
          durationSeconds: speech.durationSeconds,
          cached: false,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setSceneErrors((prev) => ({
        ...prev,
        [scene.id]:
          err instanceof Error ? err.message : "Failed to upload dialogue file.",
      }));
    } finally {
      setUploadingSceneId(null);
    }
  };

  const handleCreateCustomProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!newProfileName.trim() || !newProfileId.trim()) {
      setProfileError("Please enter both a Profile Name and Voice ID.");
      return;
    }
    if (!consentConfirmed) {
      setProfileError(
        "You must confirm speaker authorization & consent before registering a custom voice profile.",
      );
      return;
    }

    try {
      const res = await fetch("/api/voicestudio/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: newProfileId.trim(),
          name: newProfileName.trim(),
          gender: newGender,
          age: newAge,
          pitch: newPitch,
          style: newStyle,
          accent: newAccent,
          language: newLanguage,
          speed: 1.0,
          description: `Custom OmniVoice profile (${newGender}, ${newAge}, ${newPitch})`,
          consentConfirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      setProfileSuccess(
        `Registered OmniVoice profile "${newProfileName.trim()}" (${newProfileId.trim()}).`,
      );
      setNewProfileName("");
      setNewProfileId("");
      setConsentConfirmed(false);
      fetchStatus();
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to create profile",
      );
    }
  };

  return (
    <div className="flex-1 bg-[#090D16] overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Service Connection Banner */}
        <div className="bg-[#0E131F] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                STAGE C // VOICESTUDIO & K2-FSA/OMNIVOICE MULTILINGUAL SPEECH ENGINE
              </span>
              <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-400" />
                <span>
                  VoiceStudio Integration — k2-fsa/OmniVoice Character Dialogue
                  & Lip-Sync
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure Nemo & Leo character voice profiles, select from 600+
                supported OmniVoice languages, synthesize or upload character
                dialogue WAVs, and extract 30Hz jaw/viseme lip-sync envelopes.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono ${
                  status?.connected
                    ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-950/60 border-amber-500/50 text-amber-300"
                }`}
              >
                {status?.connected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      VOICESTUDIO ONLINE ({status.baseUrl}) • MODEL: OMNIVOICE
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      VOICESTUDIO OFFLINE ({status?.baseUrl || "localhost:3900"})
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`}
                />
                <span>Check Engine</span>
              </button>
            </div>
          </div>

          {/* Hardware Diagnostics & Persistent Storage Bar */}
          {status?.hardware && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Host Compute
                  </div>
                  <div className="font-semibold text-slate-200 truncate">
                    {status.hardware.cpuCores} Cores •{" "}
                    {status.hardware.availableRamGb}GB /{" "}
                    {status.hardware.totalRamGb}GB RAM
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Accelerator & Torch Variant
                  </div>
                  <div className="font-semibold text-cyan-300 font-mono">
                    {status.hardware.hasNvidiaGpu
                      ? `${status.hardware.gpuName} (CUDA)`
                      : `CPU Mode (OMNIVOICE_TORCH_VARIANT=cpu)`}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Persistent Model Cache
                  </div>
                  <div className="font-mono text-[11px] text-slate-200 truncate">
                    {status.hardware.persistentModelDir} (
                    {status.hardware.diskFreeGb}GB free)
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    OmniVoice Coverage
                  </div>
                  <div className="font-semibold text-slate-200">
                    600+ Languages • 24kHz WAV
                  </div>
                </div>
              </div>
            </div>
          )}

          {!status?.connected && status?.errorMessage && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">{status.errorMessage}</div>
                <div className="font-mono text-[11px] text-slate-300">
                  Launch command:{" "}
                  <code className="text-cyan-300">
                    ./scripts/start-voicestudio.sh
                  </code>{" "}
                  or{" "}
                  <code className="text-cyan-300">
                    docker compose -f docker-compose.voicestudio.yml up -d
                  </code>{" "}
                  (mounts persistent{" "}
                  <code className="text-amber-300">omnivoice-data</code>{" "}
                  volume so k2-fsa/OmniVoice weights download only once). You
                  can also upload real WAV/MP3 dialogue files directly below for
                  immediate 30Hz waveform lip-sync and FFmpeg mixing.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Built-In & Custom Voice Profiles (Nemo, Leo, Aria, Kaelen) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0E131F] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  OmniVoice Character Profiles (Nemo, Leo & Cast)
                </h2>
                <p className="text-xs text-slate-400">
                  Assign deterministic OmniVoice voice-design profiles to your
                  3D characters.
                </p>
              </div>
              <span className="font-mono text-xs text-indigo-400">
                {availableVoices.length} Profiles Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableVoices.map((profile) => {
                const assignedChars = project.characters.filter(
                  (c) => c.voiceProfile?.voiceId === profile.voiceId,
                );
                return (
                  <div
                    key={profile.voiceId}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white">
                          {profile.name}
                        </span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 font-mono text-[10px] text-indigo-300">
                          id: {profile.voiceId}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase">
                        {profile.engine}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {profile.description}
                    </p>

                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-amber-300">
                      instruct: &quot;{profile.instruct}&quot;
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        Assigned to:{" "}
                        <strong className="text-slate-200">
                          {assignedChars.length > 0
                            ? assignedChars.map((c) => c.name).join(", ")
                            : "Unassigned"}
                        </strong>
                      </span>

                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignCharacterVoice(e.target.value, profile);
                          }
                        }}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                      >
                        <option value="">Assign to 3D Rig...</option>
                        {project.characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Voice Profile Creator with Consent Check */}
          <form
            onSubmit={handleCreateCustomProfile}
            className="bg-[#0E131F] border border-slate-800 rounded-lg p-5 space-y-3.5"
          >
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Register OmniVoice Profile</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Create a reusable voice profile using validated OmniVoice
                attribute tokens.
              </p>
            </div>

            {profileError && (
              <div className="p-2.5 rounded bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="p-2.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200">
                {profileSuccess}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => {
                    setNewProfileName(e.target.value);
                    if (!newProfileId) {
                      setNewProfileId(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-"),
                      );
                    }
                  }}
                  placeholder="e.g. Mira"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Voice ID *</label>
                <input
                  type="text"
                  value={newProfileId}
                  onChange={(e) => setNewProfileId(e.target.value)}
                  placeholder="e.g. mira-voice"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Gender Tag</label>
                <select
                  value={newGender}
                  onChange={(e) =>
                    setNewGender(e.target.value as OmniVoiceGender)
                  }
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="female">female</option>
                  <option value="male">male</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Age Tag</label>
                <select
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value as OmniVoiceAge)}
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="child">child</option>
                  <option value="teenager">teenager</option>
                  <option value="young adult">young adult</option>
                  <option value="middle-aged">middle-aged</option>
                  <option value="elderly">elderly</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Pitch Tag</label>
                <select
                  value={newPitch}
                  onChange={(e) =>
                    setNewPitch(e.target.value as OmniVoicePitch)
                  }
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="very low pitch">very low pitch</option>
                  <option value="low pitch">low pitch</option>
                  <option value="moderate pitch">moderate pitch</option>
                  <option value="high pitch">high pitch</option>
                  <option value="very high pitch">very high pitch</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Accent Tag</label>
                <select
                  value={newAccent}
                  onChange={(e) =>
                    setNewAccent(e.target.value as OmniVoiceAccent)
                  }
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="american accent">american accent</option>
                  <option value="british accent">british accent</option>
                  <option value="australian accent">australian accent</option>
                  <option value="canadian accent">canadian accent</option>
                  <option value="indian accent">indian accent</option>
                  <option value="chinese accent">chinese accent</option>
                  <option value="japanese accent">japanese accent</option>
                  <option value="korean accent">korean accent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Style Token</label>
                <select
                  value={newStyle}
                  onChange={(e) =>
                    setNewStyle(e.target.value as OmniVoiceStyle)
                  }
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  <option value="none">Normal Conversational</option>
                  <option value="whisper">whisper</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Default Language
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {OMNIVOICE_SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong className="text-amber-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Speaker Consent & Safety:
                </strong>{" "}
                I confirm that this voice profile uses synthetic voice design or
                authorized speaker audio with explicit consent.
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save OmniVoice Profile
            </button>
          </form>
        </div>

        {/* Scene-by-Scene Multilingual Dialogue Synthesis & Lip-Sync Studio */}
        <div className="bg-[#0E131F] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>
                  Scene Dialogue Synthesis, Multilingual Controls & 30Hz
                  Lip-Sync Envelopes
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Each scene caches its generated WAV by{" "}
                <code className="text-cyan-400">
                  (text, voiceId, language, speed, instruct)
                </code>{" "}
                so camera and lighting edits never invalidate synthesized speech.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {project.scenes.map((scene, idx) => {
              const voiceId = scene.dialogueVoiceId || "nemo";
              const language = scene.dialogueLanguage || "en";
              const speed = scene.dialogueSpeed ?? 1.0;
              const instruct =
                scene.dialogueInstruct ||
                "female, young adult, moderate pitch, american accent";
              const isBusy = synthesizingSceneId === scene.id;
              const isUploading = uploadingSceneId === scene.id;
              const errMsg = sceneErrors[scene.id];

              return (
                <div
                  key={scene.id}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 font-mono text-xs text-indigo-300 font-semibold">
                        SCENE 0{idx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-100">
                        {scene.title}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        ({scene.durationInSeconds}s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {scene.dialogueAudioUrl ? (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 font-mono text-[11px] text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          WAV Linked (
                          {scene.dialogueAudioDurationSec?.toFixed(2) ??
                            scene.durationInSeconds}
                          s • {scene.dialogueLipSync?.length ?? 0} Lip-Sync
                          Frames)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-400">
                          Word-Cadence Fallback Active (Synthesize or Upload WAV)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Voice, Language, Speed, Instruct Preset */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Character Voice Profile
                      </label>
                      <select
                        value={voiceId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          const found = availableVoices.find(
                            (v) => v.voiceId === nextId,
                          );
                          onUpdateScene({
                            ...scene,
                            dialogueVoiceId: nextId,
                            dialogueSpeaker:
                              found?.name || scene.dialogueSpeaker,
                            dialogueInstruct:
                              found?.instruct || scene.dialogueInstruct,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.voiceId} value={v.voiceId}>
                            {v.name} ({v.voiceId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">
                        Language (OmniVoice 600+)
                      </label>
                      <select
                        value={language}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            dialogueLanguage: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      >
                        {OMNIVOICE_SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 flex justify-between mb-1">
                        <span>Speech Speed</span>
                        <span className="font-mono text-cyan-400">
                          {speed.toFixed(2)}x
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0.7}
                        max={1.4}
                        step={0.05}
                        value={speed}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            dialogueSpeed: Number(e.target.value),
                          })
                        }
                        className="w-full accent-indigo-500 mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">
                        OmniVoice Instruct Preset
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const preset = OMNIVOICE_INSTRUCT_PRESETS.find(
                            (p) => p.id === e.target.value,
                          );
                          if (preset) {
                            onUpdateScene({
                              ...scene,
                              dialogueInstruct: preset.instruct,
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      >
                        <option value="">Apply Voice Design Tags...</option>
                        {OMNIVOICE_INSTRUCT_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Instruct String & Dialogue Text */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Validated OmniVoice <code className="text-amber-300">instruct</code>{" "}
                        Tags
                      </label>
                      <input
                        type="text"
                        value={instruct}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            dialogueInstruct: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-slate-400 block mb-1">
                        Spoken Character Dialogue Line
                      </label>
                      <input
                        type="text"
                        value={scene.narrationText}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            narrationText: e.target.value,
                            characters: scene.characters.map((c) =>
                              c.speaking
                                ? { ...c, dialogueLine: e.target.value }
                                : c,
                            ),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Synthesis & Upload Controls + Audio Player */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSynthesizeScene(scene)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Synthesizing via OmniVoice...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Synthesize with OmniVoice</span>
                          </>
                        )}
                      </button>

                      <label className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {isUploading
                            ? "Processing Audio..."
                            : "Upload WAV / MP3 Dialogue"}
                        </span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadSceneDialogue(scene, file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {scene.dialogueAudioUrl && (
                      <div className="flex items-center gap-3">
                        <audio
                          src={scene.dialogueAudioUrl}
                          controls
                          className="h-8 w-60"
                        />
                      </div>
                    )}
                  </div>

                  {errMsg && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      {errMsg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Generation History Log */}
        {generationHistory.length > 0 && (
          <div className="bg-[#0E131F] border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Recent Dialogue Synthesis & Lip-Sync History
            </h3>
            <div className="space-y-2">
              {generationHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">
                      {item.timestamp}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {item.sceneTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-cyan-400">
                      voice: {item.voiceId} ({item.language})
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {item.durationSeconds.toFixed(2)}s{" "}
                      {item.cached ? "(Cached)" : "(Fresh)"}
                    </span>
                  </div>
                  <audio src={item.audioUrl} controls className="h-7 w-52" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
