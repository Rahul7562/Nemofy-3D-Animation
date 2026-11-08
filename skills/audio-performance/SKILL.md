---
name: audio-performance
description: VoiceStudio / k2-fsa OmniVoice dialogue synthesis, phoneme-to-viseme lip-sync generation, emotional facial synchronization, and multi-track FFmpeg audio mastering.
---

# Audio & Performance Skill (`skills/audio-performance/SKILL.md`)

This skill governs character voice identity, **VoiceStudio (`k2-fsa/OmniVoice`)** speech synthesis, **phoneme-to-viseme facial animation**, and multi-track audio mixing.

---

## 1. Character Voice Identities

| Character | Profile ID | OmniVoice `instruct` Attribute String | Vocal Character |
| :--- | :--- | :--- | :--- |
| **Nemo** (`char-nemo`) | `nemo` | `"female, young adult, moderate pitch, american accent"` | Clear, expressive, articulate digital AI companion voice. |
| **Leo** (`char-leo`) | `leo` | `"male, young adult, moderate pitch, american accent"` | Warm, curious, conversational 20-year-old college student voice. |

---

## 2. Phoneme-to-Viseme Lip-Sync Pipeline (Beyond Raw Amplitude)

Do **not** rely solely on raw waveform amplitude to open and close a character's mouth. **AetherFrame 3D** translates spoken dialogue text + audio timing into **Preston Blair / ARKit canonical viseme sequences** (`SIL`, `AA`, `EE`, `IH`, `OH`, `OU`, `FV`, `MBP`, `TH`, `L_NT`):

### 2.1 Grapheme-to-Phoneme / Viseme Mapping
Each word in a scene's dialogue is decomposed into phonetic syllables and mapped to specific anatomical mouth/jaw/lip controls in Blender:

| Viseme Class | Phonemes / Graphemes | Jaw Open (`jaw_open`) | Mouth Width (`mouth_wide`) | Lip Pucker (`mouth_pucker`) | Upper/Lower Lip Contact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SIL`** (Silence / Pause) | Pause, punctuation | `0.00` | `0.00` | `0.00` | Closed (`1.0`) |
| **`MBP`** (Bilabial Closure) | `m`, `b`, `p` | `0.02` | `-0.10` | `0.15` | Pressed closed (`1.0`) — critical visual anchor! |
| **`FV`** (Labiodental) | `f`, `v`, `ph` | `0.12` | `0.05` | `0.00` | Lower lip tucked under upper teeth |
| **`TH`** (Dental) | `th` | `0.22` | `0.10` | `0.00` | Slight open jaw |
| **`L_NT`** (Alveolar) | `l`, `n`, `t`, `d`, `s`, `z` | `0.25` | `0.20` | `0.00` | Medium narrow aperture |
| **`EE`** (Wide Front Vowel) | `ee`, `ea`, `y`, `i` | `0.32` | `0.65` | `-0.25` | Corners pulled wide |
| **`IH`** (Mid Front Vowel) | `e`, `eh`, `ae` | `0.48` | `0.40` | `0.00` | Relaxed open mouth |
| **`AA`** (Open Vowel) | `a`, `ah`, `ar`, `ay` | `0.82` | `0.25` | `0.00` | Maximum vertical jaw drop |
| **`OH`** (Rounded Open Vowel) | `o`, `oa`, `or`, `aw` | `0.68` | `-0.35` | `0.65` | Rounded O-shape mouth |
| **`OU`** (Tight Rounded Vowel) | `oo`, `u`, `w`, `qu` | `0.30` | `-0.55` | `0.85` | Tight pursed lips |

### 2.2 Coarticulation & Anticipation
- **Bilabial Lock (`MBP`)**: Ensure `M`, `B`, and `P` consonants force the lips completely shut (`jaw_open = 0.02`) for `2–3` frames even inside fast words.
- **2-Frame Visual Lead**: Human speech perception expects lip shapes to form `1–2` frames *before* the acoustic vowel peak hits. Keyframe viseme onset `1.5` frames ahead of acoustic syllable center.
- **Syllable-Modulated Energy**: Combine the phoneme viseme target with the 30Hz acoustic RMS envelope extracted from the generated/uploaded WAV file so silent pauses stay closed while stressed vowels open wider.

---

## 3. Synchronized Emotional Brow & Head Performance

- Pair each dialogue line with an emotional expression curve (`curious`, `excited`, `warm-smile`, `awestruck`, `focused`) that raises/tilts the eyebrows (`brow.L`, `brow.R`) and cheeks on emphasized words.

---

## 4. Audio Mixing & Loudness Checklist

- [ ] Does every spoken line have a distinct speaker (`Nemo` or `Leo`) and matching voice profile?
- [ ] Are viseme keyframes (`SIL`, `MBP`, `FV`, `AA`, `OH`, `EE`, `OU`) baked onto the speaking character's jaw and mouth controls in Blender?
- [ ] Does the non-speaking character's mouth remain closed (`SIL` / subtle smile) while listening?
- [ ] Is the dialogue track mixed clearly above the background score (`dialogue: 95%`, `score: 35%–45%`, `sfx: 55%`) and encoded as AAC in the final MP4?
