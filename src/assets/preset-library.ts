import {
  CameraMovementType,
  CharacterAction,
  EnvironmentType,
  LightingPreset,
  TransitionType,
  VisualStyle,
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
