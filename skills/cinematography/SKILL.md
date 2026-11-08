---
name: cinematography
description: Professional film composition, lens selection, depth of field, shot-reverse-shot, eyeline matching, over-the-shoulder framing, and motivated camera choreography in Blender.
---

# Cinematography Skill (`skills/cinematography/SKILL.md`)

This skill defines professional camera work, lens selection, composition, depth of field, and editorial continuity in `scripts/blender/configure_camera.py`.

---

## 1. Shot Grammar & Lens Selection

Every shot in a storyboard must specify a deliberate cinematic shot type and physical camera focal length (`camera.data.lens` in millimeters on a `36mm` full-frame sensor):

| Shot Type | Recommended Focal Length | Framing & Narrative Purpose |
| :--- | :--- | :--- |
| **Establishing / Wide (`establishing-wide`)** | `24mm – 32mm` | Establishes architecture, scale, lighting mood, and spatial relationship between Nemo and Leo. |
| **Two-Shot / Medium (`medium-two-shot`)** | `35mm – 50mm` | Frames both characters from waist/knees up (`9:16` vertical or `16:9` widescreen), capturing body language and interaction. |
| **Over-the-Shoulder (`over-the-shoulder`)** | `50mm – 65mm` | Places the listener's shoulder/head softly out-of-focus in the foreground edge while focusing on the speaker's face and upper body. |
| **Close-Up (`close-up`)** | `65mm – 85mm` | Isolates facial expression, eye contact, brow micro-movements, and phoneme-accurate lip-sync. Shallow depth of field (`f/2.0 – f/2.8`). |
| **Tracking / Dolly (`dolly-in`, `tracking`)** | `35mm – 50mm` | Smoothly pushes in during an emotional realization or tracks laterally to reveal foreground/background parallax. |
| **Orbit / Hero Reveal (`orbit`)** | `35mm – 45mm` | Gently arcs around the characters (`15°–35°` over the shot) during a climactic moment to heighten dimensionality. |

---

## 2. Aspect-Ratio-Aware Framing (`9:16` Vertical vs `16:9` Landscape)

- **Vertical `9:16` (`1080 × 1920`)**:
  - In Blender, set `camera.data.sensor_fit = 'HORIZONTAL'` (or adjust focal length / camera distance by `1.45×`) so two-shots and close-ups never crop characters at the left/right edges of the narrow vertical frame.
  - Stage two-shots with slight depth stagger (one character slightly closer to camera on the left third, the partner slightly deeper on the right third) so both fit comfortably inside the `9:16` frame while showcasing the vertical architecture above them.
- **Rule of Thirds & Headroom**:
  - Place character eyes near the upper horizontal third line (`~60%–66%` from bottom of frame).
  - Leave clean headroom above the characters and reserve the bottom `12%–15%` of the frame as a safe zone for optional subtitles.

---

## 3. Depth of Field & Focus Pulling

- Enable `camera.data.dof.use_dof = True`.
- Bind `camera.data.dof.focus_object` directly to the active speaking character's head/eye empty (or animate `focus_distance` for a rack focus between Leo and Nemo).
- Aperture (`aperture_fstop`):
  - Wide establishing shots: `f/5.6 – f/8.0` (deep focus so environment reads clearly).
  - Medium two-shots: `f/3.5 – f/4.0` (gentle background separation).
  - Close-ups / OTS: `f/2.0 – f/2.8` (creamy background bokeh isolating facial performance).

---

## 4. Continuity, Eyeline Matching & Motivated Movement

1. **180-Degree Axis**: Keep Leo on screen-left and Nemo on screen-right across all shots in a scene unless a continuous camera move visibly crosses the line.
2. **Eyeline Match**: When cutting from a close-up of Leo (looking screen-right at `+18°`) to a close-up of Nemo, Nemo must look screen-left at `-18°` at the matching vertical eye height.
3. **Motivated Camera Motion**:
   - Begin and end camera moves with smooth Bezier ease-in/ease-out handles (`AUTO_CLAMPED`) so the camera feels operated by a skilled dolly grip, never robotic or erratic.

---

## 5. Cinematography Quality Checklist

- [ ] Are both characters completely inside the frame in `9:16` vertical, `16:9` landscape, and `1:1` square aspect ratios without edge clipping?
- [ ] Does every shot use an appropriate physical focal length (`28mm–85mm`) and aperture (`f/2.0–f/8.0`)?
- [ ] Is `dof.focus_object` or `focus_distance` locked onto the active subject's eyes?
- [ ] Do eyelines match across cuts between Leo and Nemo?
