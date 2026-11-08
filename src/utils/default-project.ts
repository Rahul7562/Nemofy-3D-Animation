import { StudioProject, StoryboardScene, CreativeBrief } from "./types";
import { seededRandom } from "./animation-math";
import { BUILT_IN_VOICE_PROFILES } from "../assets/preset-library";

export const DEFAULT_STUDIO_PROJECT: StudioProject = {
  id: "chronicles-sunlit-observatory",
  name: "Chronicles of the Sunlit Observatory",
  activeComposition: "CinematicStory",
  subtitlesEnabled: true,
  approvedStoryboard: true,
  previewQuality: "high",
  brief: {
    topic: "Sci-Fi Fantasy Discovery at a Celestial Mountain Observatory",
    title: "Chronicles of the Sunlit Observatory",
    storyConcept:
      "Nemo, an astrolabe scholar, and Leo, an academy field researcher, join Aria and Kaelen at the Sunlit Observatory Citadel to awaken the dormant Celestial Armillary before the eclipse.",
    targetDurationSeconds: 16,
    aspectRatio: "16:9",
    fps: 30,
    visualStyle: "low-poly",
    narrationScript:
      "Above the cloud sea, Nemo and Aria reach the Sunlit Observatory. In the glowing grove, Leo and Kaelen calibrate the ancient brass rings. At the solar monolith, they lock the meridian beam. Finally, the sky sanctuary bridge awakens across the stars.",
    bgmMood: "orchestral-wonder",
    characterDescriptions:
      "Nemo: expressive scholar with teal expedition coat and astrolabe. Leo: curious student researcher with amber scarf and field journal. Aria: nimble explorer with cobalt cloak. Kaelen: towering articulated bronze automaton.",
    referenceImages: [],
  },
  characters: [
    {
      id: "char-nemo",
      name: "Nemo",
      role: "Lead Celestial Scholar",
      archetype: "scholar-humanoid",
      primaryColor: "#0d9488",
      secondaryColor: "#f59e0b",
      accentColor: "#2dd4bf",
      skinOrChassisColor: "#f4cbb2",
      scale: 1.0,
      roughness: 0.48,
      metalness: 0.18,
      glbUrl: null,
      glbFileName: null,
      voiceProfile: BUILT_IN_VOICE_PROFILES[0],
      description:
        "Expressive female-presenting celestial scholar with teal academy coat, brass astrolabe, and articulated facial rig.",
    },
    {
      id: "char-leo",
      name: "Leo",
      role: "Academy Field Student",
      archetype: "scholar-humanoid",
      primaryColor: "#4f46e5",
      secondaryColor: "#eab308",
      accentColor: "#38bdf8",
      skinOrChassisColor: "#ecc1a1",
      scale: 1.04,
      roughness: 0.52,
      metalness: 0.15,
      glbUrl: null,
      glbFileName: null,
      voiceProfile: BUILT_IN_VOICE_PROFILES[1],
      description:
        "Conversational student-like researcher with indigo field jacket, telemetry satchel, and expressive eyes.",
    },
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
      voiceProfile: BUILT_IN_VOICE_PROFILES[2],
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
      voiceProfile: BUILT_IN_VOICE_PROFILES[3],
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
          characterId: "char-nemo",
          startPosition: [-2.4, 0, 2.4],
          endPosition: [-0.9, 0, 0.8],
          rotationY: 0.55,
          action: "walk",
          expression: "determined",
          headLookAt: [0.9, 1.6, 0.5],
          speaking: true,
          dialogueLine:
            "Leo, look ahead! After three hundred cycles, the Sunlit Observatory finally stands before us.",
          voiceId: "nemo",
          dialogueLanguage: "en",
          dialogueSpeed: 1.0,
          dialogueInstruct: "female, young adult, moderate pitch, american accent",
        },
        {
          characterId: "char-leo",
          startPosition: [1.6, 0, 1.3],
          endPosition: [1.1, 0, 0.6],
          rotationY: -0.5,
          action: "idle",
          expression: "focused",
          headLookAt: [-0.9, 1.5, 0.8],
          speaking: false,
          dialogueLine: "",
          voiceId: "leo",
          dialogueLanguage: "en",
          dialogueSpeed: 1.0,
          dialogueInstruct: "male, young adult, moderate pitch, american accent",
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
        "Leo, look ahead! After three hundred cycles, the Sunlit Observatory finally stands before us.",
      dialogueSpeaker: "Nemo",
      dialogueLanguage: "en",
      dialogueVoiceId: "nemo",
      dialogueInstruct: "female, young adult, moderate pitch, american accent",
      dialogueSpeed: 1.0,
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
          characterId: "char-nemo",
          startPosition: [-1.2, 0, 0.5],
          endPosition: [-0.5, 0, 0.2],
          rotationY: 0.45,
          action: "idle",
          expression: "surprised",
          headLookAt: [1.0, 1.5, 0.2],
          speaking: false,
          dialogueLine: "",
          voiceId: "nemo",
        },
        {
          characterId: "char-leo",
          startPosition: [1.1, 0, 0.2],
          endPosition: [0.85, 0, 0.2],
          rotationY: -0.6,
          action: "gesture",
          expression: "focused",
          headLookAt: [-0.5, 1.4, 0.2],
          speaking: true,
          dialogueLine:
            "The crystalline roots carry harmonic energy directly into the central astrolabe.",
          voiceId: "leo",
          dialogueLanguage: "en",
          dialogueSpeed: 1.0,
          dialogueInstruct: "male, young adult, moderate pitch, american accent",
        },
      ],
      narrationText:
        "The crystalline roots carry harmonic energy directly into the central astrolabe.",
      dialogueSpeaker: "Leo",
      dialogueLanguage: "en",
      dialogueVoiceId: "leo",
      dialogueInstruct: "male, young adult, moderate pitch, american accent",
      dialogueSpeed: 1.0,
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
          characterId: "char-nemo",
          startPosition: [-0.2, 0, 0.3],
          endPosition: [-0.2, 0, 0.3],
          rotationY: 0.15,
          action: "talk",
          expression: "determined",
          headLookAt: [0.2, 1.6, 2.5],
          speaking: true,
          dialogueLine:
            "Lock the azimuth rings now! The solar meridian is aligning with the zenith.",
          voiceId: "nemo",
          dialogueLanguage: "en",
          dialogueSpeed: 1.0,
          dialogueInstruct: "female, young adult, moderate pitch, american accent",
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
          voiceId: "kaelen",
        },
      ],
      narrationText:
        "Lock the azimuth rings now! The solar meridian is aligning with the zenith.",
      dialogueSpeaker: "Nemo",
      dialogueLanguage: "en",
      dialogueVoiceId: "nemo",
      dialogueInstruct: "female, young adult, moderate pitch, american accent",
      dialogueSpeed: 1.0,
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
          characterId: "char-nemo",
          startPosition: [-1.1, 0, 0.6],
          endPosition: [-0.8, 0, 0.4],
          rotationY: 0.25,
          action: "gesture",
          expression: "happy",
          headLookAt: [0, 2.8, -1.0],
          speaking: false,
          dialogueLine: "",
          voiceId: "nemo",
        },
        {
          characterId: "char-leo",
          startPosition: [1.1, 0, 0.6],
          endPosition: [0.9, 0, 0.4],
          rotationY: -0.25,
          action: "gesture",
          expression: "happy",
          headLookAt: [0, 2.8, -1.0],
          speaking: true,
          dialogueLine:
            "The starlight bridge is open. Our voyage across the upper realms begins tonight!",
          voiceId: "leo",
          dialogueLanguage: "en",
          dialogueSpeed: 1.0,
          dialogueInstruct: "male, young adult, moderate pitch, american accent",
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
      dialogueSpeaker: "Leo",
      dialogueLanguage: "en",
      dialogueVoiceId: "leo",
      dialogueInstruct: "male, young adult, moderate pitch, american accent",
      dialogueSpeed: 1.0,
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
      volume: 0.95,
      muted: false,
      solo: false,
      fadeInFrames: 5,
      fadeOutFrames: 8,
    },
    {
      id: "track-bgm",
      label: "Orchestral Wonder Procedural Score",
      type: "bgm",
      startFrame: 0,
      durationFrames: 480,
      volume: 0.45,
      muted: false,
      solo: false,
      fadeInFrames: 15,
      fadeOutFrames: 25,
    },
    {
      id: "track-sfx",
      label: "Environmental & Foley SFX Bus",
      type: "sfx",
      startFrame: 0,
      durationFrames: 480,
      volume: 0.65,
      muted: false,
      solo: false,
      fadeInFrames: 5,
      fadeOutFrames: 10,
    },
  ],
};

/**
 * 10-second vertical (9:16, 1080x1920 @ 30 FPS = 300 frames) demonstration project
 * featuring Nemo & Leo across 3 environments, 3 camera movements, and 2 transitions.
 */
export const VERTICAL_SHOWCASE_PROJECT: StudioProject = {
  ...DEFAULT_STUDIO_PROJECT,
  id: "nemo-leo-vertical-showcase",
  name: "Nemo & Leo: Celestial Convergence (10s Vertical)",
  brief: {
    ...DEFAULT_STUDIO_PROJECT.brief,
    title: "Nemo & Leo: Celestial Convergence",
    targetDurationSeconds: 10,
    aspectRatio: "9:16",
    fps: 30,
    visualStyle: "pixar",
    narrationScript:
      "Nemo calibrates the observatory lens as golden dust motes swirl. In the bioluminescent grove, Leo traces the harmonic pulse through the roots. Above the floating sanctuary, they ignite the starlight portal together.",
  },
  scenes: [
    {
      ...DEFAULT_STUDIO_PROJECT.scenes[0],
      id: "v-scene-1",
      index: 0,
      title: "Act I: The Observatory Lens",
      durationInSeconds: 3.5,
      environment: "observatory-citadel",
      cameraMovement: "establishing-wide",
      transitionToNext: "crossfade",
      transitionDurationFrames: 10,
    },
    {
      ...DEFAULT_STUDIO_PROJECT.scenes[1],
      id: "v-scene-2",
      index: 1,
      title: "Act II: Harmonic Roots",
      durationInSeconds: 3.5,
      environment: "bioluminescent-forest",
      cameraMovement: "tracking",
      transitionToNext: "dip-to-black",
      transitionDurationFrames: 10,
    },
    {
      ...DEFAULT_STUDIO_PROJECT.scenes[3],
      id: "v-scene-3",
      index: 2,
      title: "Act III: Starlight Portal",
      durationInSeconds: 3.0,
      environment: "floating-sanctuary",
      cameraMovement: "orbit",
      transitionToNext: "dip-to-black",
      transitionDurationFrames: 12,
    },
  ],
  audioTracks: [
    {
      id: "track-vo",
      label: "Synchronized Dialogue & Lip-Sync Voiceover",
      type: "voiceover",
      startFrame: 0,
      durationFrames: 300,
      volume: 0.95,
      muted: false,
      solo: false,
      fadeInFrames: 4,
      fadeOutFrames: 6,
    },
    {
      id: "track-bgm",
      label: "Orchestral Wonder Procedural Score",
      type: "bgm",
      startFrame: 0,
      durationFrames: 300,
      volume: 0.45,
      muted: false,
      solo: false,
      fadeInFrames: 12,
      fadeOutFrames: 20,
    },
    {
      id: "track-sfx",
      label: "Environmental & Foley SFX Bus",
      type: "sfx",
      startFrame: 0,
      durationFrames: 300,
      volume: 0.65,
      muted: false,
      solo: false,
      fadeInFrames: 4,
      fadeOutFrames: 8,
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
    2.5,
     Number((brief.targetDurationSeconds / sceneCount).toFixed(1)),
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

  const leadChar = existingCharacters[0] ?? DEFAULT_STUDIO_PROJECT.characters[0];
  const secondChar =
    existingCharacters[1] ?? DEFAULT_STUDIO_PROJECT.characters[1];

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

    const activeSpeaker = i % 2 === 0 ? leadChar : secondChar;
    const voiceId = activeSpeaker.voiceProfile?.voiceId ?? (i % 2 === 0 ? "nemo" : "leo");
    const instruct =
      activeSpeaker.voiceProfile?.instruct ??
      (i % 2 === 0
        ? "female, young adult, moderate pitch, american accent"
        : "male, young adult, moderate pitch, american accent");

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
          characterId: leadChar.id,
          startPosition: [-1.4 + i * 0.2, 0, 1.2],
          endPosition: [-0.5, 0, 0.3],
          rotationY: 0.35,
          action: i % 2 === 0 ? "walk" : "talk",
          expression: i === sceneCount - 1 ? "happy" : "determined",
          headLookAt: [0.8, 1.4, 0.3],
          speaking: i % 2 === 0,
          dialogueLine: i % 2 === 0 ? line : "",
          voiceId: leadChar.voiceProfile?.voiceId ?? "nemo",
          dialogueLanguage: leadChar.voiceProfile?.language ?? "en",
          dialogueSpeed: 1.0,
          dialogueInstruct:
            leadChar.voiceProfile?.instruct ??
            "female, young adult, moderate pitch, american accent",
        },
        {
          characterId: secondChar.id,
          startPosition: [1.3, 0, 0.5],
          endPosition: [0.9, 0, 0.2],
          rotationY: -0.45,
          action: i % 2 === 1 ? "gesture" : "idle",
          expression: "focused",
          headLookAt: [-0.5, 1.4, 0.3],
          speaking: i % 2 === 1,
          dialogueLine: i % 2 === 1 ? line : "",
          voiceId: secondChar.voiceProfile?.voiceId ?? "leo",
          dialogueLanguage: secondChar.voiceProfile?.language ?? "en",
          dialogueSpeed: 1.0,
          dialogueInstruct:
            secondChar.voiceProfile?.instruct ??
            "male, young adult, moderate pitch, american accent",
        },
      ],
      narrationText: line,
      dialogueSpeaker: activeSpeaker.name,
      dialogueLanguage: activeSpeaker.voiceProfile?.language ?? "en",
      dialogueVoiceId: voiceId,
      dialogueInstruct: instruct,
      dialogueSpeed: 1.0,
      soundEffects: ["Atmosphere Bed", "Footsteps", "Cinematic Accent"],
      transitionToNext: trans,
      transitionDurationFrames: 12,
    });
  }

  return generated;
}
