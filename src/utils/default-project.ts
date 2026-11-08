import { StudioProject, StoryboardScene, CreativeBrief } from "./types";
import { seededRandom } from "./animation-math";

export const DEFAULT_STUDIO_PROJECT: StudioProject = {
  id: "chronicles-sunlit-observatory",
  name: "Chronicles of the Sunlit Observatory",
  activeComposition: "CinematicStory",
  subtitlesEnabled: true,
  approvedStoryboard: true,
  brief: {
    topic: "Sci-Fi Fantasy Discovery at a Celestial Mountain Observatory",
    title: "Chronicles of the Sunlit Observatory",
    storyConcept:
      "Aria, an astrolabe explorer, and Kaelen, an ancient brass guardian automaton, ascend the Sunlit Observatory Citadel to awaken the dormant Celestial Armillary before the eclipse.",
    targetDurationSeconds: 16,
    aspectRatio: "16:9",
    fps: 30,
    visualStyle: "low-poly",
    narrationScript:
      "Above the cloud sea, Aria reaches the Sunlit Observatory. Beside her, Kaelen calibrates the ancient brass rings. Together they channel the prism beam, awakening the gateway across the stars.",
    bgmMood: "orchestral-wonder",
    characterDescriptions:
      "Aria: nimble explorer with cobalt cloak, brass astrolabe pack, and warm expressive eyes. Kaelen: towering articulated bronze automaton with glowing cyan ocular lens. Lumen: hovering reconnaissance owl-drone.",
    referenceImages: [],
  },
  characters: [
    {
      id: "char-aria",
      name: "Aria Vance",
      role: "Lead Astrolabe Explorer",
      archetype: "explorer",
      primaryColor: "#2563eb",
      secondaryColor: "#f59e0b",
      accentColor: "#38bdf8",
      skinOrChassisColor: "#f3c6a5",
      scale: 1.0,
      roughness: 0.55,
      metalness: 0.2,
      glbUrl: null,
      glbFileName: null,
      description:
        "Articulated low-poly explorer with expedition satchel, brass visor, and cape trim.",
    },
    {
      id: "char-kaelen",
      name: "Kaelen-IX",
      role: "Citadel Brass Automaton",
      archetype: "guardian-bot",
      primaryColor: "#d97706",
      secondaryColor: "#334155",
      accentColor: "#22d3ee",
      skinOrChassisColor: "#94a3b8",
      scale: 1.18,
      roughness: 0.3,
      metalness: 0.82,
      glbUrl: null,
      glbFileName: null,
      description:
        "Heavy clockwork sentinel with layered shoulder pauldrons, glowing core, and articulated jaw.",
    },
    {
      id: "char-lumen",
      name: "Lumen Wing",
      role: "Celestial Recon Drone",
      archetype: "avian-drone",
      primaryColor: "#0ea5e9",
      secondaryColor: "#e2e8f0",
      accentColor: "#fde047",
      skinOrChassisColor: "#cbd5e1",
      scale: 0.78,
      roughness: 0.25,
      metalness: 0.75,
      glbUrl: null,
      glbFileName: null,
      description:
        "Autonomous mechanical owl-drone with twin thruster wings and optical sensor array.",
    },
  ],
  scenes: [
    {
      id: "scene-1",
      index: 0,
      title: "Arrival at the Citadel Courtyard",
      durationInSeconds: 4,
      environment: "observatory-citadel",
      visualStyleOverride: null,
      cameraMovement: "establishing-wide",
      cameraStartPos: [-6.5, 4.2, 9.5],
      cameraEndPos: [-2.8, 3.0, 7.2],
      cameraTarget: [0, 1.4, 0],
      cameraFov: 45,
      depthOfField: 0.25,
      lightingPreset: "golden-hour",
      lightIntensity: 1.35,
      fogDensity: 0.018,
      weatherEffect: "dust-motes",
      characters: [
        {
          characterId: "char-aria",
          startPosition: [-2.6, 0, 2.8],
          endPosition: [-0.9, 0, 0.8],
          rotationY: 0.65,
          action: "walk",
          expression: "determined",
          headLookAt: [0, 2.2, -1.5],
          speaking: true,
          dialogueLine:
            "After three hundred cycles, the Sunlit Observatory finally stands before us.",
        },
        {
          characterId: "char-kaelen",
          startPosition: [1.8, 0, 1.2],
          endPosition: [1.3, 0, 0.5],
          rotationY: -0.5,
          action: "idle",
          expression: "focused",
          headLookAt: [-0.9, 1.5, 0.8],
          speaking: false,
          dialogueLine: "",
        },
        {
          characterId: "char-lumen",
          startPosition: [-1.8, 1.6, 1.5],
          endPosition: [0.2, 1.9, -0.4],
          rotationY: 0.3,
          action: "walk",
          expression: "happy",
          headLookAt: [0, 1.8, -2],
          speaking: false,
          dialogueLine: "",
        },
      ],
      narrationText:
        "After three hundred cycles, the Sunlit Observatory finally stands before us.",
      dialogueSpeaker: "Aria Vance",
      soundEffects: ["Wind Ambience", "Stone Footsteps", "Clockwork Chime"],
      transitionToNext: "crossfade",
      transitionDurationFrames: 12,
    },
    {
      id: "scene-2",
      index: 1,
      title: "The Whispering Bioluminescent Grove",
      durationInSeconds: 4,
      environment: "bioluminescent-forest",
      visualStyleOverride: null,
      cameraMovement: "tracking",
      cameraStartPos: [4.2, 2.3, 5.8],
      cameraEndPos: [-1.5, 2.1, 4.9],
      cameraTarget: [0, 1.3, 0],
      cameraFov: 40,
      depthOfField: 0.4,
      lightingPreset: "emerald-mist",
      lightIntensity: 1.2,
      fogDensity: 0.024,
      weatherEffect: "fireflies",
      characters: [
        {
          characterId: "char-aria",
          startPosition: [-1.2, 0, 0.5],
          endPosition: [-0.4, 0, 0.2],
          rotationY: 0.45,
          action: "talk",
          expression: "surprised",
          headLookAt: [1.1, 1.6, 0.2],
          speaking: false,
          dialogueLine: "",
        },
        {
          characterId: "char-kaelen",
          startPosition: [1.1, 0, 0.2],
          endPosition: [0.9, 0, 0.2],
          rotationY: -0.6,
          action: "gesture",
          expression: "focused",
          headLookAt: [-0.4, 1.4, 0.2],
          speaking: true,
          dialogueLine:
            "The crystalline roots carry harmonic energy directly into the central astrolabe.",
        },
      ],
      narrationText:
        "The crystalline roots carry harmonic energy directly into the central astrolabe.",
      dialogueSpeaker: "Kaelen-IX",
      soundEffects: ["Forest Resonance", "Servo Gesture", "Crystal Hum"],
      transitionToNext: "dip-to-black",
      transitionDurationFrames: 12,
    },
    {
      id: "scene-3",
      index: 2,
      title: "Calibration at the Meridian Monolith",
      durationInSeconds: 4,
      environment: "desert-monolith",
      visualStyleOverride: null,
      cameraMovement: "close-up",
      cameraStartPos: [0.4, 1.8, 3.2],
      cameraEndPos: [-0.6, 1.9, 2.7],
      cameraTarget: [-0.2, 1.45, 0],
      cameraFov: 32,
      depthOfField: 0.65,
      lightingPreset: "sunset-dramatic",
      lightIntensity: 1.45,
      fogDensity: 0.02,
      weatherEffect: "dust-motes",
      characters: [
        {
          characterId: "char-aria",
          startPosition: [-0.2, 0, 0.3],
          endPosition: [-0.2, 0, 0.3],
          rotationY: 0.15,
          action: "talk",
          expression: "determined",
          headLookAt: [0.2, 1.6, 2.5],
          speaking: true,
          dialogueLine:
            "Lock the azimuth rings now! The solar meridian is aligning with the zenith.",
        },
        {
          characterId: "char-kaelen",
          startPosition: [1.4, 0, -0.6],
          endPosition: [1.2, 0, -0.3],
          rotationY: -0.45,
          action: "walk",
          expression: "determined",
          headLookAt: [-0.2, 1.5, 0.3],
          speaking: false,
          dialogueLine: "",
        },
      ],
      narrationText:
        "Lock the azimuth rings now! The solar meridian is aligning with the zenith.",
      dialogueSpeaker: "Aria Vance",
      soundEffects: ["Brass Gear Lock", "Solar Pulse", "Desert Gale"],
      transitionToNext: "crossfade",
      transitionDurationFrames: 12,
    },
    {
      id: "scene-4",
      index: 3,
      title: "Awakening the Sky Sanctuary",
      durationInSeconds: 4,
      environment: "floating-sanctuary",
      visualStyleOverride: null,
      cameraMovement: "orbit",
      cameraStartPos: [0, 3.2, 7.8],
      cameraEndPos: [5.4, 4.4, 6.2],
      cameraTarget: [0, 1.6, 0],
      cameraFov: 44,
      depthOfField: 0.3,
      lightingPreset: "moonlit-cobalt",
      lightIntensity: 1.5,
      fogDensity: 0.015,
      weatherEffect: "starfield",
      characters: [
        {
          characterId: "char-aria",
          startPosition: [-1.1, 0, 0.6],
          endPosition: [-0.8, 0, 0.4],
          rotationY: 0.25,
          action: "gesture",
          expression: "happy",
          headLookAt: [0, 2.8, -1.0],
          speaking: true,
          dialogueLine:
            "The starlight bridge is open. Our voyage across the upper realms begins tonight!",
        },
        {
          characterId: "char-kaelen",
          startPosition: [1.1, 0, 0.6],
          endPosition: [0.9, 0, 0.4],
          rotationY: -0.25,
          action: "gesture",
          expression: "happy",
          headLookAt: [0, 2.8, -1.0],
          speaking: false,
          dialogueLine: "",
        },
        {
          characterId: "char-lumen",
          startPosition: [0, 1.8, 1.2],
          endPosition: [0, 2.5, -0.5],
          rotationY: 0,
          action: "run",
          expression: "happy",
          headLookAt: [0, 3.0, -2.0],
          speaking: false,
          dialogueLine: "",
        },
      ],
      narrationText:
        "The starlight bridge is open. Our voyage across the upper realms begins tonight!",
      dialogueSpeaker: "Aria Vance",
      soundEffects: ["Celestial Chord", "Portal Ignition", "Harmonic Echo"],
      transitionToNext: "dip-to-black",
      transitionDurationFrames: 15,
    },
  ],
  audioTracks: [
    {
      id: "track-vo",
      label: "Synchronized Dialogue & Lip-Sync Voiceover",
      type: "voiceover",
      startFrame: 0,
      durationFrames: 480,
      volume: 0.9,
      muted: false,
    },
    {
      id: "track-bgm",
      label: "Orchestral Wonder Procedural Score",
      type: "bgm",
      startFrame: 0,
      durationFrames: 480,
      volume: 0.55,
      muted: false,
    },
    {
      id: "track-sfx",
      label: "Environmental & Foley SFX Bus",
      type: "sfx",
      startFrame: 0,
      durationFrames: 480,
      volume: 0.75,
      muted: false,
    },
  ],
};

export function buildDeterministicStoryboardFromBrief(
  brief: CreativeBrief,
  existingCharacters: StudioProject["characters"],
): StoryboardScene[] {
  const sentences = brief.narrationScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sceneCount = Math.max(3, Math.min(6, sentences.length || 4));
  const perSceneSec = Math.max(
    3,
    Math.round(brief.targetDurationSeconds / sceneCount),
  );

  const environments: StoryboardScene["environment"][] = [
    "observatory-citadel",
    "bioluminescent-forest",
    "cyber-harbor",
    "desert-monolith",
    "floating-sanctuary",
    "minimal-studio",
  ];
  const movements: StoryboardScene["cameraMovement"][] = [
    "establishing-wide",
    "tracking",
    "close-up",
    "orbit",
    "dolly-in",
    "crane-up",
  ];
  const lightings: StoryboardScene["lightingPreset"][] = [
    "golden-hour",
    "emerald-mist",
    "sunset-dramatic",
    "moonlit-cobalt",
    "studio-three-point",
  ];
  const transitions: StoryboardScene["transitionToNext"][] = [
    "crossfade",
    "dip-to-black",
    "whip-pan",
    "iris-wipe",
  ];

  const leadChar = existingCharacters[0]?.id ?? "char-aria";
  const secondChar = existingCharacters[1]?.id ?? "char-kaelen";

  const generated: StoryboardScene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const seed = `${brief.title}-${brief.topic}-${i}`;
    const r1 = seededRandom(seed + "-1");
    const r2 = seededRandom(seed + "-2");
    const env = environments[i % environments.length];
    const camMove = movements[i % movements.length];
    const light = lightings[i % lightings.length];
    const trans = transitions[i % transitions.length];
    const line =
      sentences[i] ??
      `Scene ${i + 1}: ${brief.title} unfolds in ${env.replace("-", " ")}.`;

    generated.push({
      id: `scene-gen-${i + 1}`,
      index: i,
      title: `Act ${i + 1}: ${line.split(" ").slice(0, 5).join(" ").replace(/[.,!?]/g, "")}`,
      durationInSeconds: perSceneSec,
      environment: env,
      visualStyleOverride: null,
      cameraMovement: camMove,
      cameraStartPos: [
        Number(((r1 - 0.5) * 9).toFixed(2)),
        Number((2.2 + r2 * 2.4).toFixed(2)),
        Number((5.5 + r1 * 3.5).toFixed(2)),
      ],
      cameraEndPos: [
        Number(((r2 - 0.5) * 6).toFixed(2)),
        Number((1.8 + r1 * 1.8).toFixed(2)),
        Number((4.2 + r2 * 2.5).toFixed(2)),
      ],
      cameraTarget: [0, 1.35, 0],
      cameraFov: camMove === "close-up" ? 32 : 44,
      depthOfField: camMove === "close-up" ? 0.6 : 0.3,
      lightingPreset: light,
      lightIntensity: 1.35,
      fogDensity: 0.018,
      weatherEffect:
        env === "bioluminescent-forest"
          ? "fireflies"
          : env === "cyber-harbor"
            ? "rain"
            : "dust-motes",
      characters: [
        {
          characterId: leadChar,
          startPosition: [-1.4 + i * 0.2, 0, 1.2],
          endPosition: [-0.5, 0, 0.3],
          rotationY: 0.35,
          action: i % 2 === 0 ? "walk" : "talk",
          expression: i === sceneCount - 1 ? "happy" : "determined",
          headLookAt: [0.8, 1.4, 0.3],
          speaking: i % 2 === 0,
          dialogueLine: line,
        },
        {
          characterId: secondChar,
          startPosition: [1.3, 0, 0.5],
          endPosition: [0.9, 0, 0.2],
          rotationY: -0.45,
          action: i % 2 === 1 ? "gesture" : "idle",
          expression: "focused",
          headLookAt: [-0.5, 1.4, 0.3],
          speaking: i % 2 === 1,
          dialogueLine: line,
        },
      ],
      narrationText: line,
      dialogueSpeaker:
        i % 2 === 0
          ? (existingCharacters[0]?.name ?? "Aria Vance")
          : (existingCharacters[1]?.name ?? "Kaelen-IX"),
      soundEffects: ["Atmosphere Bed", "Footsteps", "Cinematic Accent"],
      transitionToNext: trans,
      transitionDurationFrames: 12,
    });
  }

  return generated;
}
