---
name: render-quality
description: Automated scene inspection, render defect detection, visual critique of contact sheets and frames, and ffprobe stream verification.
---

# Render Quality & Self-Critique Skill (`skills/render-quality/SKILL.md`)

This skill defines the mandatory automated and visual quality-assurance loop executed via `scripts/blender/inspect_scene.py`, `ffprobe`, and visual frame inspection before any render is accepted.

---

## 1. Automated Pre-Render & Post-Build Scene Inspection (`inspect_scene.py`)

Before or immediately after building a `.blend` project, `inspect_scene.py` inspects the Blender scene graph and outputs a structured JSON quality report verifying:

1. **Character Rig & Deformation Integrity**:
   - Both `Nemo_Rig` and `Leo_Rig` exist as `ARMATURE` objects with non-empty mesh children and active `ARMATURE` modifiers or bone parenting.
   - All required bones (`hips`, `spine`, `chest`, `neck`, `head`, `jaw`, `upper_arm.L/R`, `forearm.L/R`, `hand.L/R`, `thigh.L/R`, `shin.L/R`, `foot.L/R`, `brow.L/R`, `eyelid_upper.L/R`) exist and have keyframed F-curves in `animation_data.action`.
2. **Ground Contact & Non-Intersection Check**:
   - World-space bounding-box minimum `Z` of character feet is within `[-0.03m, +0.05m]` of the ground plane (`Z = 0.0m`)—no floating characters or sunken legs.
   - Euclidean distance between Nemo and Leo root positions is `>= 0.65m` so character meshes never interpenetrate.
3. **Camera Framing & Frustum Check**:
   - Project Nemo's head and Leo's head into Normalized Device Coordinates (`bpy_extras.object_utils.world_to_camera_view`) at the start, middle, and end frames of each shot.
   - Confirm the intended subject(s) lie inside the safe viewing frustum (`x ∈ [0.08, 0.92]`, `y ∈ [0.15, 0.90]`, `z > 0.5m`).
4. **Lighting & Material Completeness**:
   - Confirm at least 3 active lights (`KEY`, `FILL`, `RIM`) exist with non-zero energy.
   - Confirm zero meshes have missing/empty material slots.

---

## 2. Post-Render Visual Inspection Protocol

After rendering frames and encoding the final MP4, inspect:
1. **Opening Frame (`frame_00001.png`)**: Verify establishing composition, lighting contrast, and ground contact.
2. **Character Close-Up / Medium Shot (`frame_00120.png`)**: Verify facial expression, eye alignment, brow pose, and active viseme mouth shape during speech.
3. **Interaction Shot (`frame_00210.png`)**: Verify listener head-turn reaction, gesture arc, and camera framing.
4. **Transition Boundaries & Final Frame (`frame_00300.png`)**: Verify smooth scene transitions and clean ending pose.
5. **4-Panel Contact Sheet (`contact-*.jpg`)**: View the generated contact sheet image directly to confirm visual quality across the full timeline.

---

## 3. Mandatory `ffprobe` Stream Validation

Every production MP4 must pass all 8 stream checks:
- Container exists and file size `> 100 KB`.
- Video codec is `h264` (`yuv420p`).
- Exact output resolution matches requested preset (`1080×1920`, `1920×1080`, or `1080×1080`).
- Frame rate matches requested FPS (`24`, `30`, or `60`).
- Total frame count matches `duration × fps` (`300` frames for 10s @ 30 FPS).
- Duration matches requested duration (`10.0s`).
- Audio stream (`aac`) is present and matches video duration.
- Full stream decodes cleanly with zero `ffprobe` / `ffmpeg` errors.
