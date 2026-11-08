export type WorkflowStage =
  | "brief"
  | "storyboard"
  | "voicestudio"
  | "stage3d"
  | "timeline"
  | "export";

export type VisualStyle =
  | "low-poly"
  | "pixar"
  | "voxel"
  | "claymation"
  | "isometric"
  | "realistic"
  | "minimalist";

export type AspectRatioPreset = "16:9" | "9:16" | "1:1";

export type FpsPreset = 30 | 60;

export type PreviewQualityProfile = "draft" | "medium" | "high";

export type EnvironmentType =
  | "observatory-citadel"
  | "bioluminescent-forest"
  | "cyber-harbor"
  | "desert-monolith"
  | "floating-sanctuary"
  | "minimal-studio";

export type CameraMovementType =
  | "establishing-wide"
  | "dolly-in"
  | "dolly-out"
  | "orbit"
  | "tracking"
  | "crane-up"
  | "close-up"
  | "static";

export type LightingPreset =
  | "golden-hour"
  | "moonlit-cobalt"
  | "studio-three-point"
  | "sunset-dramatic"
  | "emerald-mist";

export type WeatherEffect =
  | "dust-motes"
  | "fireflies"
  | "starfield"
  | "rain"
  | "snow"
  | "none";

export type CharacterAction =
  | "idle"
  | "walk"
  | "run"
  | "talk"
  | "gesture"
  | "sit";

export type CharacterExpression =
  | "neutral"
  | "happy"
  | "determined"
  | "surprised"
  | "focused";

export type TransitionType =
  | "cut"
  | "crossfade"
  | "dip-to-black"
  | "whip-pan"
  | "iris-wipe";

export type BgmMood =
  | "orchestral-wonder"
  | "ambient-synth"
  | "cinematic-pulse"
  | "lofi-warmth";

export type CharacterArchetype =
  | "explorer"
  | "guardian-bot"
  | "avian-drone"
  | "scholar-humanoid";

export type OmniVoiceGender = "male" | "female";
export type OmniVoiceAge =
  | "child"
  | "teenager"
  | "young adult"
  | "middle-aged"
  | "elderly";
export type OmniVoicePitch =
  | "very low pitch"
  | "low pitch"
  | "moderate pitch"
  | "high pitch"
  | "very high pitch";
export type OmniVoiceStyle = "whisper" | "none";
export type OmniVoiceAccent =
  | "american accent"
  | "british accent"
  | "australian accent"
  | "canadian accent"
  | "indian accent"
  | "chinese accent"
  | "japanese accent"
  | "korean accent"
  | "portuguese accent"
  | "russian accent"
  | "none";

export interface VoiceProfileConfig {
  voiceId: string;
  name: string;
  engine: "omnivoice";
  gender: OmniVoiceGender;
  age: OmniVoiceAge;
  pitch: OmniVoicePitch;
  style: OmniVoiceStyle;
  accent: OmniVoiceAccent;
  language: string;
  speed: number;
  instruct: string;
  description: string;
  isCustomProfile?: boolean;
  consentConfirmed?: boolean;
}

export interface GlbValidationReport {
  valid: boolean;
  fileName: string;
  fileSizeBytes: number;
  meshCount: number;
  vertexCount: number;
  hasSkeletalRig: boolean;
  boneCount: number;
  animationClipNames: string[];
  hasFacialMorphTargets: boolean;
  warnings: string[];
}

export interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  archetype: CharacterArchetype;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  skinOrChassisColor: string;
  scale: number;
  roughness: number;
  metalness: number;
  glbUrl: string | null;
  glbFileName: string | null;
  glbValidation?: GlbValidationReport | null;
  voiceProfile?: VoiceProfileConfig;
}

export interface LipSyncEnvelopePoint {
  timeSec: number;
  mouthOpenness: number;
  mouthWidth: number;
  energy: number;
}

export interface LipSyncWordTiming {
  word: string;
  startSec: number;
  endSec: number;
  viseme?: string;
}

export interface SceneCharacterPlacement {
  characterId: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  rotationY: number;
  action: CharacterAction;
  expression: CharacterExpression;
  headLookAt: [number, number, number];
  speaking: boolean;
  dialogueLine: string;
  voiceId?: string;
  dialogueLanguage?: string;
  dialogueSpeed?: number;
  dialogueInstruct?: string;
}

export interface StoryboardScene {
  id: string;
  index: number;
  title: string;
  durationInSeconds: number;
  environment: EnvironmentType;
  visualStyleOverride: VisualStyle | null;
  cameraMovement: CameraMovementType;
  cameraStartPos: [number, number, number];
  cameraEndPos: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  depthOfField: number;
  lightingPreset: LightingPreset;
  lightIntensity: number;
  fogDensity: number;
  weatherEffect: WeatherEffect;
  characters: SceneCharacterPlacement[];
  narrationText: string;
  dialogueSpeaker: string;
  dialogueLanguage?: string;
  dialogueVoiceId?: string;
  dialogueInstruct?: string;
  dialogueSpeed?: number;
  dialogueAudioUrl?: string | null;
  dialogueAudioDurationSec?: number | null;
  dialogueAudioCacheKey?: string | null;
  dialogueLipSync?: LipSyncEnvelopePoint[] | null;
  dialogueWordTimings?: LipSyncWordTiming[] | null;
  soundEffects: string[];
  transitionToNext: TransitionType;
  transitionDurationFrames: number;
}

export interface ReferenceImageItem {
  id: string;
  name: string;
  dataUrl: string;
  notes: string;
}

export interface CreativeBrief {
  topic: string;
  title: string;
  storyConcept: string;
  targetDurationSeconds: number;
  aspectRatio: AspectRatioPreset;
  fps: FpsPreset;
  visualStyle: VisualStyle;
  narrationScript: string;
  bgmMood: BgmMood;
  characterDescriptions: string;
  referenceImages: ReferenceImageItem[];
}

export interface AudioTrackItem {
  id: string;
  label: string;
  type: "voiceover" | "bgm" | "sfx";
  startFrame: number;
  durationFrames: number;
  volume: number;
  muted: boolean;
  solo?: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}

export interface StudioProject {
  id: string;
  name: string;
  activeComposition: "CinematicStory" | "Scene";
  subtitlesEnabled: boolean;
  approvedStoryboard: boolean;
  previewQuality?: PreviewQualityProfile;
  brief: CreativeBrief;
  characters: CharacterConfig[];
  scenes: StoryboardScene[];
  audioTracks: AudioTrackItem[];
}

export interface ComputedSceneTiming {
  scene: StoryboardScene;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
}

export interface CameraTransformState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll: number;
}

export interface CharacterJointPose {
  worldPosition: [number, number, number];
  worldRotationY: number;
  hipBobY: number;
  torsoLeanX: number;
  torsoTwistY: number;
  headYawY: number;
  headPitchX: number;
  leftThighX: number;
  leftShinX: number;
  rightThighX: number;
  rightShinX: number;
  leftUpperArmX: number;
  leftUpperArmZ: number;
  leftForearmX: number;
  rightUpperArmX: number;
  rightUpperArmZ: number;
  rightForearmX: number;
  mouthOpenness: number;
  mouthWidth: number;
  eyeBlink: number;
  browRaise?: number;
}

export interface HardwareInspectionReport {
  platform: string;
  cpuModel: string;
  cpuCores: number;
  totalRamGb: number;
  availableRamGb: number;
  hasNvidiaGpu: boolean;
  gpuName: string | null;
  vramGb: number | null;
  diskFreeGb: number;
  recommendedTorchVariant: "cuda" | "cpu";
  persistentModelDir: string;
}

export interface VoiceStudioStatusResponse {
  connected: boolean;
  baseUrl: string;
  engine: "omnivoice";
  omniVoiceLoaded: boolean;
  availableVoices: VoiceProfileConfig[];
  supportedLanguages: string[];
  hardware: HardwareInspectionReport | null;
  errorMessage: string | null;
}

export interface OmniVoiceSpeechRequest {
  sceneId: string;
  text: string;
  voiceId: string;
  language: string;
  speed: number;
  instruct: string;
}

export interface OmniVoiceSpeechResponse {
  audioUrl: string;
  cacheKey: string;
  durationSeconds: number;
  sampleRate: number;
  lipSync: LipSyncEnvelopePoint[];
  wordTimings: LipSyncWordTiming[];
  cached: boolean;
  engine: "omnivoice";
  voiceId: string;
  language: string;
}

export interface MediaVerificationReport {
  valid: boolean;
  containerFormat: string;
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  frameCount: number;
  fileSizeBytes: number;
  hasAudioStream: boolean;
  contactSheetUrl?: string | null;
}

export interface RenderJobStatus {
  jobId: string;
  status:
    | "queued"
    | "rendering_frames"
    | "encoding_mp4"
    | "verifying"
    | "completed"
    | "failed"
    | "cancelled";
  progressPercent: number;
  framesCompleted: number;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  outputUrl: string | null;
  verification: MediaVerificationReport | null;
}
