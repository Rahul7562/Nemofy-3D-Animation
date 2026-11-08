# AetherFrame 3D — Cinematic 3D Animation & Deterministic Video Production Studio

**AetherFrame 3D** is an AI-assisted programmatic 3D animation and deterministic video-production studio built with **React 19**, **TypeScript**, **Three.js**, **React Three Fiber**, **Drei**, **Remotion 4**, **FFmpeg**, and **VoiceStudio (`k2-fsa/OmniVoice`)**.

---

## 1. Architecture Overview

AetherFrame 3D unifies interactive 3D viewport preview and production MP4 video rendering under a single deterministic scene and animation architecture:

1. **Unified 3D Scene Graph (`CinematicStoryComposition.tsx` & `SharedScene3DBuilder.ts`)**
   - Uses identical mathematical functions (`computeSceneTimeline`, `computeCameraTransformAtFrame`, `computeCharacterPoseAtFrame`, `computeLipSyncAtFrame`, `computeTransitionState`) and shared 3D geometry/material builders across both the interactive `@remotion/three` `ThreeCanvas` preview and the deterministic offscreen WebGL frame exporter.
   - Supports **6 3D Environments**:
     - `observatory-citadel` (Rotating brass armillary rings, crystal core, perimeter mountain peaks)
     - `bioluminescent-forest` (Tiered glowing flora, stepping stones, pulsing crystal clusters)
     - `cyber-harbor` (Reflective water plane, hover-barge, neon signage pylons)
     - `desert-monolith` (Sandstone dais, obsidian obelisk, rotating solar glyph ring)
     - `floating-sanctuary` (Suspended sky island, portal arch, celestial starfield)
     - `minimal-studio` (Infinite cyclorama stage with studio rim ring)
   - Supports **7 Visual Styles**: `low-poly`, `pixar`, `voxel`, `claymation`, `isometric`, `realistic`, and `minimalist`.
   - Supports **Multi-Part Procedural 3D Characters & Custom `.GLB` / `.GLTF` Rigs**:
     - Includes built-in character cast: **Nemo** (Lead Celestial Scholar), **Leo** (Academy Field Student), **Aria Vance** (Astrolabe Explorer), **Kaelen-IX** (Citadel Brass Automaton), and **Lumen Wing** (Recon Drone).
     - Uploads and validates `.glb` / `.gltf` files (`inspectAndValidateGLTF`), reporting mesh count, vertex count, bone count, embedded animation clips, and facial morph targets.

2. **VoiceStudio & `k2-fsa/OmniVoice` Multilingual Speech Integration (`src/server/voicestudio-adapter.ts`)**
   - Integrates with [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) (`http://localhost:3900`) using `model: "omnivoice"`.
   - Inspects host hardware (CPU cores, RAM, NVIDIA GPU/VRAM, disk space) and configures persistent model storage (`OMNIVOICE_DATA_DIR`, `OMNIVOICE_CACHE_DIR`, `HF_HOME`) so OmniVoice weights download only once.
   - Provides built-in **Nemo** (`female, young adult, moderate pitch, american accent`) and **Leo** (`male, young adult, moderate pitch, american accent`) voice profiles, custom voice profile creation with mandatory speaker consent verification, and 600+ language support.
   - Caches synthesized scene WAVs on disk by `computeDialogueAudioCacheKey({ text, voiceId, language, speed, instruct })` so camera and lighting edits never trigger redundant speech synthesis.
   - Extracts real 30Hz RMS amplitude + zero-crossing jaw/viseme lip-sync envelopes (`extractLipSyncFromWavBytes`) from generated or uploaded WAV/MP3 files to drive character mouth, jaw, brow, head, and gesture animations.

3. **Production Video Rendering & `ffprobe` Verification (`src/server/render-pipeline.ts`)**
   - Renders the **entire approved storyboard** without duration truncation (`300 frames` for 10s @ 30 FPS, `480 frames` for 16s @ 30 FPS, etc.).
   - Renders at native **1080×1920** (9:16 vertical), **1920×1080** (16:9 landscape), or **1080×1080** (1:1 square) at **30 FPS** or **60 FPS**.
   - Streams rendered frames in chunks (`/api/render/jobs/:jobId/chunk`) directly to disk, mixes dialogue WAVs with background score and SFX tracks, encodes H.264 (`libx264`, `yuv420p`) + AAC (`192k`) via FFmpeg, generates a 4-frame visual contact sheet, and verifies container, codecs, resolution, frame count, and audio stream via `ffprobe`.

---

## 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
PORT=3000
GEMINI_API_KEY=
VOICESTUDIO_API_URL=http://localhost:3900
OMNIVOICE_API_KEY=
OMNIVOICE_DATA_DIR=./data/voicestudio
OMNIVOICE_CACHE_DIR=./data/voicestudio/cache
OMNIVOICE_TORCH_VARIANT=cpu
```

---

## 3. Starting VoiceStudio with `k2-fsa/OmniVoice`

### Option A: Automated Hardware-Aware Script
```bash
chmod +x scripts/start-voicestudio.sh
./scripts/start-voicestudio.sh
```

### Option B: Docker Compose with Persistent Model Volume
```bash
docker compose -f docker-compose.voicestudio.yml up -d
curl http://localhost:3900/health
```

The `aetherframe-omnivoice-data` volume persists `/data/omnivoice` across container restarts so `k2-fsa/OmniVoice` model weights are downloaded only once.

---

## 4. Running AetherFrame 3D Studio

```bash
# Install dependencies
npm install

# Start full-stack Express + Vite studio server on port 3000
npm run dev
```

### Generating Storyboards, Dialogue & Exporting MP4
1. **Creative Brief**: Enter project title, concept, aspect ratio (`16:9`, `9:16`, or `1:1`), FPS (`30` or `60`), and visual style, then click **Generate AI 3D Storyboard & Scenes**.
2. **Storyboard**: Customize environments, camera movements, lighting presets, transitions, and scene durations.
3. **Voice Studio**: Inspect VoiceStudio (`k2-fsa/OmniVoice`) connection status, assign **Nemo** or **Leo** voice profiles, select dialogue language, and click **Synthesize with OmniVoice** or **Upload WAV / MP3 Dialogue** to extract real 30Hz lip-sync envelopes.
4. **3D Stage & Timeline**: Scrub the deterministic timeline, adjust camera FOV/coordinates, reorder scenes, or adjust track gain/solo/mute.
5. **Export MP4**: Click **Render MP4 Video** -> **Start Full Production MP4 Render** to render all storyboard frames at native 1080p resolution, inspect the `ffprobe` verification report and 4-panel contact sheet, and download the `.mp4`.

---

## 5. Testing & CLI Rendering

```bash
# Run deterministic unit & render verification tests
npx tsx --test src/utils/animation-math.test.ts

# Typecheck & Lint
npm run lint

# Build production bundle
npm run build

# Render via Remotion CLI
npx remotion render src/index.ts CinematicStory out/cinematic-story.mp4 --gl=angle
```
