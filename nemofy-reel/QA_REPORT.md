# Production & Quality Assurance Report (`QA_REPORT.md`)

**Project:** `"40GB For an AND Gate"` — Nemofy StudentHub Instagram Reel  
**Promoted Platform:** `https://nemofy.tech/` (`StudentHub` — 100% Free, Zero-Install Browser Verilog Simulator & Waveforms, Python/C/C++/Java Code Runner, Binary/Hex Calculators, and Word/PPTX-to-PDF Converter)  
**Final Master Deliverable:** `/app/applet/nemofy-reel/final/nemofy_reel.mp4`  

---

## 1. Instagram Agent Skill Verification (Authentic CLI Scores)

### 1.1 Hook Ranking (`hookscore.py`)
Command executed: `python3 /tmp/repos/instagram-agent-skill/skills/ig-reel/hookscore.py nemofy-reel/hooks.txt`

| Rank | Candidate Hook | Score | Verdict | Sub-Scores |
| :--- | :--- | :--- | :--- | :--- |
| **#1 (Selected)** | `"Stop wasting three hours installing broken Verilog tools."` | **94.8** | **STRONG** | Length `100`, Specificity `100`, Stakes `100`, Frontload `100`, Address `90` |
| #2 | `"Stop waiting four hours for forty gigabyte compilers."` | **83.2** | **STRONG** | Weakest: Stakes (`70`) |
| #3 | `"Your laptop shouldn't crash over two Verilog gates."` | **80.8** | **STRONG** | Weakest: Stakes (`70`) |

### 1.2 Beat Pacing & Loop Structure (`beats.py`)
Command executed: `python3 /tmp/repos/instagram-agent-skill/skills/ig-reel/beats.py nemofy-reel/script.txt --target 37`
- **Word Count:** `103 words` across `13` rapid conversational beats.
- **Estimated Speaking Duration:** `37.5s` at 165 WPM (`36.97s` actual synthesized VoiceStudio + gap master timeline).
- **Max Beat Duration:** Every beat is `<= 4.0s` (`0 warnings` for static shots).
- **Hook Length:** Beat 01 is `2.90s` (`<= 3.0s` requirement met).
- **Loop Detection:** Verified seamless loop (`"Loops: the last beat repeats 'broken, stop, tools' from the hook. Second watches are free reach."`).

### 1.3 Script Humanization & AI-Tell Audit (`humanize.py` & `detect.py`)
Commands executed:
- `python3 /tmp/repos/instagram-agent-skill/skills/ig-human/humanize.py nemofy-reel/script.txt --report`
- `python3 /tmp/repos/instagram-agent-skill/skills/ig-human/detect.py nemofy-reel/script.txt`

| Metric | Score | Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Humanize Strip Audit** | `0 artefacts / 0 tells` | `CLEAN` | **PASS** |
| **Overall Script Human Score** | **75.8** | `>= 75.0` | **PASS** |
| **Burstiness** | `58.0` | `>= 55.0` | **PASS** |
| **Specificity** | `100.0` (13.4 markers/100w) | `>= 55.0` | **PASS** |
| **Slop Density** | `100.0` (0 stock terms) | `>= 55.0` | **PASS** |
| **Fingerprint** | `100.0` (0 em-dashes/curly quotes) | `>= 55.0` | **PASS** |
| **Voice** | `80.0` | `>= 55.0` | **PASS** |

### 1.4 Caption Linter & Humanization (`caption.py` & `detect.py`)
Commands executed:
- `python3 /tmp/repos/instagram-agent-skill/skills/ig-caption/caption.py nemofy-reel/caption.txt --keywords "verilog simulator,student coding,nemofy"`
- `python3 /tmp/repos/instagram-agent-skill/skills/ig-human/detect.py nemofy-reel/caption.txt`

| Check | Result | Verdict |
| :--- | :--- | :--- |
| **Caption Verdict** | `9/9 PASS, 0 WARN, 0 FAIL` | **READY** |
| **Length & First Line** | `527 / 2200 chars`; 69-char first line lands whole before truncation | **PASS** |
| **Concrete Hook & Search Terms** | `2` concrete markers in visible fold; `3/3` SEO keywords present | **PASS** |
| **Single Ask & Hashtags** | `1` ask (`Comment NEMOFY`); `3` niche tags below fold (`#VerilogSimulator #StudentCoding #Nemofy`) | **PASS** |
| **Caption Human Score** | **91.6** (Burstiness `86.3`, Specificity `100`, Slop `100`, Fingerprint `100`, Voice `89.4`) | **PASS** |

---

## 2. Blender 3D Scene & Character Consistency Verification

Command executed: `blender -b -P nemofy-reel/blender/scripts/build_reel.py -- nemofy-reel/beat_timings.json nemofy-reel/blender/project.blend nemofy-reel/blender/scene_inspection.json`

- **Character Reuse & Visual Consistency:**
  - **Leo (`Leo_Rig`):** Preserved existing `@agentmorphy`-style blocky chibi college developer (`#3B5BDB` cobalt hoodie with twin white vertical chest stripes, `#1E1B4B` 5-spike hair, wide peach face, articulated jaw/tongue/brows/eyelids, 31 bones, 96 Bezier F-curves, `minFootZ = 0.0m`).
  - **Nemo (`Nemo_Rig`):** Preserved existing coral-terracotta 3D cube AI companion (`#D96043` body with `#EA7B5F` warm bevel, vertical pixel eyes, articulated mouth cavity + tongue, stubby waving arms, 4 grounded legs, 31 bones, 90 Bezier F-curves, `minFootZ = -0.0014m`).
- **Props & Environment:**
  - **Overheating Laptop (`Env_OverheatLaptopRoot`):** Positioned beside Leo at `X = -0.72m` with thermal vibration during Beats 01–06 (`40GB` installer freeze), then vanishes cleanly as StudentHub opens.
  - **Nemofy StudentHub Holographic Console (`Env_NemofyHoloScreenRoot`):** Rises into unobstructed upper-center/right space (`X = 0.29m, Z = 1.06m`) at Beat 07 (`"Open Nemofy.tech. Tap StudentHub."`), displaying a 3D **Verilog AND gate schematic**, **8 animated HIGH/LOW emerald & cyan signal waveform bars**, and **4 workbench tool chips** (Verilog, Python/C++, Binary Math, Word-to-PDF). Saved as a reusable asset in `blender/assets/nemofy_holo_console.blend`.
- **Cinematography:**
  - `13` physical Blender cameras (`ShotCam_01`..`ShotCam_13`) locked via `TRACK_TO` empties (`allSubjectsInSafeFrustum = true`, `missingMaterialCount = 0`, `charactersNonIntersecting = true`).

---

## 3. VoiceStudio, Soundtrack & EBU R128 Audio Mastering Verification

- **VoiceStudio Engine:** Local VoiceStudio service (`http://127.0.0.1:3900`, `mode: "neural-vits-onnx"`) synthesized all 13 dialogue beats into `voices/leo/beat_*.wav` (`leo.onnx` / `en_US-ryan-medium.onnx`) and `voices/nemo/beat_*.wav` (`nemo.onnx` / `en_US-lessac-medium.onnx`).
- **Pronunciation & Sync:** Numbers and technical symbols (`"forty gigabytes"`, `"eleven fifty-nine"`, `"C plus plus"`, `"P D F"`, `"Nemofy dot tech"`) were expanded in the TTS prompt for natural articulation while displayed as crisp digits (`40GB`, `11:59`, `C++`, `PDF`, `Nemofy.tech`) in the burned-in captions and `final/nemofy_reel.srt`.
- **Original Score & Foley SFX:** Synthesized 112 BPM lo-fi groove (`audio/music/lofi_groove.wav`) with a comedic beat drop between Beat 10 and Beat 11, paired with 6 procedural SFX cues (`impact_thump.wav`, `fan_whir.wav`, `whoosh.wav`, `synth_pluck.wav`, `holo_chime.wav`, `rimshot.wav`).
- **Two-Pass Loudness Normalization (`ffmpeg loudnorm` + `ebur128`):**
  - **Target:** `-14.0 LUFS` integrated, `<= -1.2 dBTP` true peak.
  - **Measured on Final `nemofy_reel.mp4`:**
    - **Integrated Loudness (`I`):** `-14.0 LUFS`
    - **Loudness Range (`LRA`):** `1.4 LU`
    - **True Peak (`Peak`):** `-1.6 dBFS`

---

## 4. Final Video (`ffprobe`) & Visual Safe-Zone Inspection

- **File:** `/app/applet/nemofy-reel/final/nemofy_reel.mp4` (`16.46 MB`)
- **Resolution & Aspect Ratio:** `1080×1920` (`9:16` vertical)
- **Frame Rate & Frame Count:** `30/1 FPS` (`1,109` frames, `36.97 seconds`)
- **Video Codec:** `H.264 (High Profile, yuv420p, 3.36 Mbps, +faststart)`
- **Audio Codec:** `AAC LC (Stereo, 48,000 Hz, 193 kbps)`
- **Black Frame Detection (`blackdetect`):** `0` black frames.
- **Visual Safe-Zone Audit (Verified via `poster.jpg` & 12-tile `contact-sheet.jpg`):**
  - Top Hook/Feature Cards sit at `y = 255 px` (`>= 230 px` top safe margin).
  - Speaker Subtitles sit at `y = 1280..1415 px` (`<= 1440 px` bottom safe margin).
  - Horizontal margins (`MarginL = 55 px`, `MarginR = 245 px`) keep the right-hand `245 px` column (`>= 230 px`) completely clear of Instagram's Like/Comment/Share/Save icons.
