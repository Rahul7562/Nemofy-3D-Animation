import {
  CameraMovementType,
  CharacterAction,
  EnvironmentType,
  LightingPreset,
  TransitionType,
  VisualStyle,
  VoiceProfileConfig,
  WeatherEffect,
} from "../utils/types";

export const VISUAL_STYLE_PRESETS: Array<{
  id: VisualStyle;
  label: string;
  description: string;
}> = [
  {
    id: "low-poly",
    label: "Cinematic Low-Poly 3D",
    description: "Faceted geometric forms with crisp studio rim lighting",
  },
  {
    id: "pixar",
    label: "Stylized Animated Film",
    description: "Smooth subsurface-inspired shading with warm cinematic bounce",
  },
  {
    id: "voxel",
    label: "Voxel 3D World",
    description: "Cubic architectural blocks and stepped volumetric lighting",
  },
  {
    id: "claymation",
    label: "Stop-Motion Claymation",
    description: "Tactile matte sculpted surfaces with soft studio diffusers",
  },
  {
    id: "isometric",
    label: "Isometric Diorama 3D",
    description: "Architectural miniature precision with clean shadow casting",
  },
  {
    id: "realistic",
    label: "Physically Based 3D",
    description: "Metallic/roughness PBR reflections and atmospheric fog",
  },
  {
    id: "minimalist",
    label: "Minimalist Geometric",
    description: "Pure editorial primitives with high-contrast directional light",
  },
];

export const ENVIRONMENT_PRESETS: Array<{
  id: EnvironmentType;
  label: string;
  accent: string;
}> = [
  {
    id: "observatory-citadel",
    label: "Sunlit Observatory Citadel",
    accent: "#6366F1",
  },
  {
    id: "bioluminescent-forest",
    label: "Bioluminescent Forest Grove",
    accent: "#10B981",
  },
  {
    id: "cyber-harbor",
    label: "Neon Cyber Harbor",
    accent: "#06B6D4",
  },
  {
    id: "desert-monolith",
    label: "Solar Desert Monolith",
    accent: "#F59E0B",
  },
  {
    id: "floating-sanctuary",
    label: "Floating Sky Sanctuary",
    accent: "#38BDF8",
  },
  {
    id: "minimal-studio",
    label: "Infinite Cyclorama Stage",
    accent: "#A855F7",
  },
];

export const CAMERA_MOVEMENT_PRESETS: Array<{
  id: CameraMovementType;
  label: string;
  shotType: string;
}> = [
  { id: "establishing-wide", label: "Establishing Wide", shotType: "WIDE" },
  { id: "dolly-in", label: "Slow Dolly In", shotType: "MEDIUM" },
  { id: "dolly-out", label: "Pull Back Reveal", shotType: "WIDE" },
  { id: "orbit", label: "Cinematic Orbit", shotType: "HERO" },
  { id: "tracking", label: "Lateral Tracking", shotType: "TRACK" },
  { id: "crane-up", label: "High Crane Ascent", shotType: "CRANE" },
  { id: "close-up", label: "Dramatic Close-Up", shotType: "CLOSE" },
  { id: "static", label: "Locked Tripod", shotType: "STATIC" },
];

export const LIGHTING_PRESETS: Array<{
  id: LightingPreset;
  label: string;
}> = [
  { id: "golden-hour", label: "Golden Hour Sun" },
  { id: "moonlit-cobalt", label: "Moonlit Cobalt Mystery" },
  { id: "studio-three-point", label: "Studio 3-Point Key/Rim" },
  { id: "sunset-dramatic", label: "Dramatic Crimson Sunset" },
  { id: "emerald-mist", label: "Bioluminescent Emerald Mist" },
];

export const WEATHER_PRESETS: Array<{
  id: WeatherEffect;
  label: string;
}> = [
  { id: "dust-motes", label: "Floating Golden Motes" },
  { id: "fireflies", label: "Bioluminescent Fireflies" },
  { id: "starfield", label: "Celestial Starfield" },
  { id: "rain", label: "Cinematic Rain" },
  { id: "snow", label: "Drifting Snow" },
  { id: "none", label: "Clear Atmosphere" },
];

export const CHARACTER_ACTIONS: Array<{
  id: CharacterAction;
  label: string;
}> = [
  { id: "idle", label: "Breathing Idle" },
  { id: "walk", label: "Forward Walk Cycle" },
  { id: "run", label: "Dynamic Run Cycle" },
  { id: "talk", label: "Expressive Dialogue" },
  { id: "gesture", label: "Heroic Gesture" },
  { id: "sit", label: "Seated Pose" },
];

export const TRANSITION_PRESETS: Array<{
  id: TransitionType;
  label: string;
}> = [
  { id: "crossfade", label: "Smooth Crossfade" },
  { id: "dip-to-black", label: "Dip to Obsidian" },
  { id: "whip-pan", label: "Kinetic Whip Pan" },
  { id: "iris-wipe", label: "Aperture Iris" },
  { id: "cut", label: "Direct Cut" },
];

export const OMNIVOICE_SUPPORTED_LANGUAGES: Array<{
  code: string;
  label: string;
  region: string;
}> = [
  { code: "auto", label: "Auto-Detect (600+ Languages)", region: "Global" },
  { code: "en", label: "English (en)", region: "Global" },
  { code: "zh", label: "Mandarin Chinese (zh)", region: "East Asia" },
  { code: "yue", label: "Cantonese (yue)", region: "East Asia" },
  { code: "ja", label: "Japanese (ja)", region: "East Asia" },
  { code: "ko", label: "Korean (ko)", region: "East Asia" },
  { code: "hi", label: "Hindi (hi)", region: "South Asia" },
  { code: "bn", label: "Bengali (bn)", region: "South Asia" },
  { code: "ta", label: "Tamil (ta)", region: "South Asia" },
  { code: "te", label: "Telugu (te)", region: "South Asia" },
  { code: "mr", label: "Marathi (mr)", region: "South Asia" },
  { code: "ur", label: "Urdu (ur)", region: "South Asia" },
  { code: "es", label: "Spanish (es)", region: "Europe / Americas" },
  { code: "fr", label: "French (fr)", region: "Europe / Global" },
  { code: "de", label: "German (de)", region: "Europe" },
  { code: "pt", label: "Portuguese (pt)", region: "Europe / Americas" },
  { code: "it", label: "Italian (it)", region: "Europe" },
  { code: "ru", label: "Russian (ru)", region: "Eurasia" },
  { code: "ar", label: "Arabic (ar)", region: "MENA" },
  { code: "tr", label: "Turkish (tr)", region: "Eurasia" },
  { code: "id", label: "Indonesian (id)", region: "Southeast Asia" },
  { code: "vi", label: "Vietnamese (vi)", region: "Southeast Asia" },
];

export const OMNIVOICE_INSTRUCT_PRESETS: Array<{
  id: string;
  label: string;
  instruct: string;
  description: string;
}> = [
  {
    id: "nemo-conversational",
    label: "Nemo — Warm Conversational Female",
    instruct: "female, young adult, moderate pitch, american accent",
    description: "Clear, expressive female-presenting young adult voice",
  },
  {
    id: "leo-student",
    label: "Leo — Curious Student Male",
    instruct: "male, young adult, moderate pitch, american accent",
    description: "Natural, articulate student-like male-presenting voice",
  },
  {
    id: "aria-explorer",
    label: "Aria — Heroic Lead Explorer",
    instruct: "female, young adult, high pitch, british accent",
    description: "Bright, energetic expedition leader voice design",
  },
  {
    id: "kaelen-sentinel",
    label: "Kaelen — Deep Guardian Resonance",
    instruct: "male, middle-aged, very low pitch, british accent",
    description: "Resonant, authoritative baritone voice design",
  },
  {
    id: "elder-narrator",
    label: "Chronicle Narrator — Wise Elder",
    instruct: "male, elderly, low pitch, british accent",
    description: "Measured cinematic storyteller timbre",
  },
  {
    id: "whisper-mystic",
    label: "Mystic Whisper — Soft Ethereal",
    instruct: "female, young adult, moderate pitch, whisper",
    description: "Hushed atmospheric whisper using OmniVoice style token",
  },
];

export const BUILT_IN_VOICE_PROFILES: VoiceProfileConfig[] = [
  {
    voiceId: "nemo",
    name: "Nemo",
    engine: "omnivoice",
    gender: "female",
    age: "young adult",
    pitch: "moderate pitch",
    style: "none",
    accent: "american accent",
    language: "auto",
    speed: 1.0,
    instruct: "female, young adult, moderate pitch, american accent",
    description:
      "Clear, natural, expressive female-presenting conversational voice profile for Nemo.",
    isCustomProfile: false,
  },
  {
    voiceId: "leo",
    name: "Leo",
    engine: "omnivoice",
    gender: "male",
    age: "young adult",
    pitch: "moderate pitch",
    style: "none",
    accent: "american accent",
    language: "auto",
    speed: 1.0,
    instruct: "male, young adult, moderate pitch, american accent",
    description:
      "Clear, natural, conversational student-like male-presenting voice profile for Leo.",
    isCustomProfile: false,
  },
  {
    voiceId: "aria",
    name: "Aria Vance",
    engine: "omnivoice",
    gender: "female",
    age: "young adult",
    pitch: "high pitch",
    style: "none",
    accent: "british accent",
    language: "en",
    speed: 1.0,
    instruct: "female, young adult, high pitch, british accent",
    description: "Astrolabe Explorer bright expedition voice design.",
    isCustomProfile: false,
  },
  {
    voiceId: "kaelen",
    name: "Kaelen-IX",
    engine: "omnivoice",
    gender: "male",
    age: "middle-aged",
    pitch: "very low pitch",
    style: "none",
    accent: "british accent",
    language: "en",
    speed: 0.96,
    instruct: "male, middle-aged, very low pitch, british accent",
    description: "Deep brass guardian sentinel voice design.",
    isCustomProfile: false,
  },
];
