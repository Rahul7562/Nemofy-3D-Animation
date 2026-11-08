---
name: character-animation
description: Skeletal animation, Blender Actions and NLA layering, IK/FK foot contact, weight transfer, gesture arcs, eye tracking, blinking, and facial performance.
---

# Character Animation Skill (`skills/character-animation/SKILL.md`)

This skill governs skeletal animation, Blender Action/NLA authoring, motion retargeting, body mechanics, and facial performance in `scripts/blender/animate_character.py` and `scripts/blender/retarget_animation.py`.

---

## 1. Strict Prohibition on Primitive Sine-Wave Joint Oscillation

- **Do NOT** drive primary character performances using naive periodic sine-wave joint loops.
- All character animation in Blender must be authored as **keyframed Blender Actions (`bpy.data.actions`)** layered via **NLA Tracks (`anim_data.nla_tracks`)** or retargeted skeletal motion clips with Bezier F-curve interpolation (`handle_left_type = 'AUTO_CLAMPED'`, `handle_right_type = 'AUTO_CLAMPED'`).
- Subtle procedural micro-noise is permitted **only** as a low-amplitude secondary layer (e.g., breathing chest expansion or camera handheld micro-drift).

---

## 2. Layered NLA Animation Architecture in Blender

Every character performance is composed of 4 distinct keyframed layers combined onto the character's Armature Action/NLA stack:

1. **Layer 1 — Base Posture & Locomotion / Weight Transfer (`hips`, `thigh.L/R`, `shin.L/R`, `foot.L/R`, `spine`, `chest`)**:
   - Grounded foot placement (`Z = 0.0` on contact frames).
   - Weight transfer across the pelvis (`hips` lateral shift `X` and slight roll `Y` when shifting weight from left foot to right foot).
   - Counter-balanced chest rotation opposing the pelvis (`contrapposto`).
2. **Layer 2 — Narrative Acting & Phrase-Driven Gestures (`shoulder.L/R`, `upper_arm.L/R`, `forearm.L/R`, `hand.L/R`)**:
   - Authored multi-pose gesture phrases synchronized to dialogue clauses:
     - **Anticipation Pose** (`4–6` frames before speech phrase starts)
     - **Lead Accent Pose** (hand arcs up and outward on primary stressed word)
     - **Hold / Moving Hold** (slight drift while sustaining gesture so the character never freezes)
     - **Follow-Through & Rest** (soft return to relaxed neutral pose after phrase ends).
3. **Layer 3 — Head Orientation, Eye Gaze & Mutual Reaction (`neck`, `head`, `eye_target`, `eyelid_upper.L/R`)**:
   - **Speaker**: Looks at listener `80%` of the time, briefly glancing toward shared environmental subject when referencing it, then returning gaze to listener.
   - **Listener**: Turns head (`neck` + `head`) toward speaker, nods subtly after key statements, and shifts weight attentively.
   - **Natural Blinks**: Asymmetric 5-frame blinks (`Open → Closed in 2f → Hold 1f → Open in 2f`) scheduled at natural head turns and every `75–115` frames.
4. **Layer 4 — Phoneme-to-Viseme Lip-Sync & Emotional Expressions (`jaw`, `mouth_corner.L/R`, `lip_upper`, `lip_lower`, `brow.L/R`)**:
   - Keyframed viseme shapes (`SIL`, `AA`, `EE`, `IH`, `OH`, `OU`, `FV`, `MBP`, `TH`, `L_NT`) generated from word/phoneme alignment (`skills/audio-performance/SKILL.md`), blended with emotional brow/cheek poses (`curious`, `excited`, `warm-smile`, `thoughtful`, `awestruck`).

---

## 3. Motion Retargeting (`scripts/blender/retarget_animation.py`)

When importing external `.fbx`, `.bvh`, or `.glb` skeletal clips (such as Mixamo humanoid clips or Blender Studio action libraries):
1. Map source bone names (`mixamorig:Hips`, `mixamorig:Spine2`, `mixamorig:Head`, etc.) to target rig canonical bones (`hips`, `chest`, `head`, `upper_arm.L`, `forearm.L`, etc.).
2. Preserve root foot-ground height (`Z = 0.0`) so retargeted clips never float or sink through the floor.
3. Bake retargeted motion to a clean `bpy.types.Action` and push to the NLA track with configurable blend-in / blend-out frames.

---

## 4. Character Animation Checklist

- [ ] Are feet locked to the floor during standing and weight-shift poses without sliding?
- [ ] Are arm and hand gestures phrased with anticipation, arc, moving hold, and follow-through?
- [ ] Do the head and eyes track the scene partner during conversation?
- [ ] Are eyelids blinking naturally (`4–5` frame duration) on head turns and emotional beats?
- [ ] Are all keyframes interpolated with smooth Bezier handles rather than harsh linear steps?
