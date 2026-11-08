# AetherFrame 3D — Authoritative Blender (`bpy`) + VoiceStudio (`k2-fsa/OmniVoice`) Animation Production Studio

**AetherFrame 3D** is a programmatic 3D animation and cinematic video-production system powered by:

1. **Blender (`bpy`) Authoritative 3D Engine & Render Worker** (`src/blender/*` & `scripts/blender/*.py`):
   - Builds complete `.blend` scenes with 31-bone articulated humanoid armatures (`Leo_Rig` & `Nemo_Rig`) or imports external `.blend`/`.glb` character rigs (Blender Studio Rain v3, Snow v4, Security Bot v1, Mixamo).
   - Authors skeletal animation with `AUTO_CLAMPED` Bezier F-curves, overlapping spine/chest/head follow-through, weight shift, phoneme-to-viseme jaw/lip keyframing (`SIL`, `MBP`, `FV`, `TH`, `L_NT`, `EE`, `IH`, `AA`, `OH`, `OU`), eye saccades, 5-frame natural blinks, and mutual character acting (active speaker vs. nodding/reacting listener).
   - Configures physical multi-camera lens choreography (`28mm–70mm`, `sensor_fit = "HORIZONTAL"`, Depth of Field `focus_distance`), 3-point Area lighting + frontal eye catchlights, World sky gradient shader, and Filmic Medium High Contrast colour management.
   - Runs automated scene inspection (`scripts/blender/inspect_scene.py`) verifying bone counts, F-curve counts, ground contact (`minFootZ ≈ 0.0`), non-intersection, and safe camera frustum NDC bounds before rendering.
2. **VoiceStudio (`k2-fsa/OmniVoice`) Speech Synthesis & Lip-Sync** (`src/server/voicestudio-adapter.ts` & `src/server/local-voicestudio-daemon.ts`):
   - Synthesizes expressive character dialogue via the OpenAI-compatible `/v1/audio/speech` contract (`model: "omnivoice"`), normalizes audio to 24 kHz 16-bit PCM WAV, and extracts 30 Hz RMS amplitude envelopes + word boundary timings.
3. **FFmpeg + `ffprobe` Post-Production Pipeline** (`src/blender/render-job-manager.ts`):
   - Mixes character dialogue, harmonic ambient score pads, and transition chimes, burns in shot-timed subtitles, encodes H.264 (`yuv420p`) + AAC `.mp4` with `+faststart`, extracts a 4-panel visual contact sheet, and validates output streams with `ffprobe`.

---

## 1. Local & Remote Blender Installation & Configuration

### Windows (via `winget`)

```powershell
winget install -e --id BlenderFoundation.Blender
winget install -e --id Gyan.FFmpeg
```

### Ubuntu / Debian Linux (via `apt`)

```bash
sudo apt-get update && sudo apt-get install -y --no-install-recommends \
  blender xvfb libgl1-mesa-dri xauth ffmpeg flite espeak-ng
```

### Environment Variables (`.env`)

```env
# Path to local Blender binary (defaults to "blender" on system PATH)
BLENDER_EXECUTABLE=blender

# Optional remote Blender worker URL for distributed cloud deployments
BLENDER_REMOTE_WORKER_URL=

# VoiceStudio (k2-fsa/OmniVoice) endpoint
VOICESTUDIO_API_URL=http://localhost:3900
```

---

## 2. Project-Local Animation Skills (`skills/*/SKILL.md`)

- `skills/animation-director/SKILL.md` — Narrative structure, staging, 180-degree rule, anticipation, follow-through, and mutual character acting.
- `skills/character-artist/SKILL.md` — Appeal, silhouette readability, facial topology, Rigify/Armature bone hierarchies, and PBR shaders.
- `skills/character-animation/SKILL.md` — Idle breathing, walk/run cycles, gesture arcs, phoneme-to-viseme lip-sync, eye darts, and blinks.
- `skills/cinematography/SKILL.md` — Focal lengths (`24mm–85mm`), vertical `9:16` framing, OTS dialogue coverage, dolly/orbit camera rigs, and DOF.
- `skills/environment-artist/SKILL.md` — Foreground/midground/background depth planes, architectural props, sky gradients, and scale validation.
- `skills/lighting-lookdev/SKILL.md` — 3-point Key/Fill/Rim lighting, eye catchlights, atmospheric haze, and Filmic tone mapping.
- `skills/audio-performance/SKILL.md` — VoiceStudio (`k2-fsa/OmniVoice`) synthesis, phoneme viseme lead timing, and dialogue-foregrounded mixing.
- `skills/render-quality/SKILL.md` — `inspect_scene.py` pre-render checks, contact-sheet auditing, and `ffprobe` MP4 stream verification.

---

## 3. Character & Environment Asset Catalogue

| Asset ID | Name | Origin | License | Attribution |
| :--- | :--- | :--- | :--- | :--- |
| `blender-studio-rain` | Rain v3 Rig | `https://studio.blender.org/characters/rain/v3/` | `CC-BY-4.0` | Blender Studio / Cloud (CC-BY 4.0) — Rain Character Rig |
| `blender-studio-snow` | Snow v4 Rig | `https://studio.blender.org/characters/snow/v4/` | `CC-BY-4.0` | Blender Studio (CC-BY 4.0) — Snow Character Rig |
| `blender-studio-security-bot` | Security Bot v1 | `https://studio.blender.org/characters/security-bot/v1/` | `CC-BY-4.0` | Blender Studio (CC-BY 4.0) — Security Bot Rig |
| `mixamo-ybot-humanoid` | Mixamo Standard Rig | `https://www.mixamo.com/` | `Royalty-Free` | Adobe Mixamo Standard Skeletal Rig & Motion Clips |
| `polyhaven-courtyard-props` | Poly Haven Props & HDRI | `https://polyhaven.com/` | `CC0-1.0` | Poly Haven (CC0 Public Domain) |
| `char-leo` | Leo (`Leo_Rig`, 31 bones) | `scripts/blender/import_character.py` | `CC-BY-4.0` | AetherFrame 3D Studio — Leo Character Rig |
| `char-nemo` | Nemo (`Nemo_Rig`, 31 bones) | `scripts/blender/import_character.py` | `CC-BY-4.0` | AetherFrame 3D Studio — Nemo Digital Companion Rig |

---

## 4. Running & Rendering the Reference Film ("Nemo and Leo — A Cinematic Encounter")

```bash
# 1. Run unit tests (timeline math, VoiceStudio lip-sync, Blender serializer, diagnostics):
npx tsx --test src/utils/animation-math.test.ts

# 2. Build & render the 10-second (1080x1920 @ 30 FPS, 300 frames) reference film via Blender:
npx tsx scripts/render-reference-encounter.ts

# 3. Start the full-stack AetherFrame 3D studio server on http://localhost:3000:
npm run dev
```
