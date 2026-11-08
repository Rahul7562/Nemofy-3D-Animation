---
name: animation-director
description: Directing narrative 3D animated films, emotional beats, staging, screen direction, blocking, anticipation, follow-through, overlapping action, and shot continuity.
---

# Animation Director Skill (`skills/animation-director/SKILL.md`)

This skill governs narrative direction, staging, character performance, and shot-by-shot translation from script to 3D animation inside **AetherFrame 3D** and its **Blender (`bpy`)** production pipeline.

---

## 1. Narrative Structure & Emotional Beats

Every animated short film or sequence must be structured around clear emotional progression rather than isolated visual effects:

1. **Hook & Establishing Context (Act I — Setup)**:
   - Orient the audience spatially before moving into tight coverage.
   - Establish who the characters are (**Nemo**, the expressive digital AI companion, and **Leo**, the 20-year-old college student), where they are, and what draws their attention.
2. **Interaction & Rising Discovery (Act II — Turn)**:
   - Every line of dialogue or action must trigger a **reaction** from the scene partner.
   - When Leo speaks or gestures toward an artifact, Nemo must orient her head/eyes toward Leo or the shared focal object, listening actively before responding.
3. **Resolution & Visual Payoff (Act III — Climax / Button)**:
   - Conclude with a decisive emotional beat, shared realization, or environmental transformation that lands visually even with the sound muted.

---

## 2. Staging & Screen Direction (The 180-Degree Rule)

- **Maintain the Line of Action**: When blocking two characters (e.g., Leo on screen-left at `X = -0.85`, Nemo on screen-right at `X = +0.85`), keep all cameras on the same side of the axis connecting them (`Z > 0`) so screen direction stays consistent across cuts.
- **Clear Silhouettes**: Pose characters at 3/4 angles (`15°–35°` toward camera and toward each other) rather than flat profile (`90°`) or dead-front (`0°`). A 3/4 staging reads both depth and facial expression simultaneously.
- **Foreground / Midground / Background Separation**:
  - Place subtle framing elements in the foreground, characters in the well-lit midground, and architectural landmarks or atmospheric depth in the background.

---

## 3. Character Blocking & Mutual Reaction Rules

Never leave a non-speaking character frozen or cycling an oblivious loop while another character speaks:

| Narrative Moment | Speaking Character Action | Listening Character Action |
| :--- | :--- | :--- |
| **Speaker initiates dialogue** | Anticipation breath (chest rises 2–3 frames before first phoneme), weight shift onto front foot, gesture hand arcs outward. | Head turns toward speaker within 6–10 frames; eye-track constraint locks onto speaker's head/eyes; subtle micro-nods. |
| **Emotional emphasis / question** | Brow raise or furrow on stressed syllable; torso leans forward `4°–8°`; head tilt on key word. | Eyebrows react (`+0.3` surprise or `-0.2` curiosity); posture shifts in response. |
| **Turn-taking transition** | Gesture settles with soft follow-through (`6–12` frames after final word); gaze remains on partner. | Anticipation inhale and slight head lift `4–6` frames before reply begins. |

---

## 4. Core Principles of Animation in `bpy`

1. **Anticipation**:
   - Every major movement must be preceded by a small opposite motion (e.g., a slight downward crouch before rising, or drawing the hand inward before pointing).
2. **Arcs**:
   - All limb, head, and spine rotations must travel along curved Bezier trajectories (`AUTO_CLAMPED` F-curve handles in Blender) rather than linear mechanical interpolations.
3. **Timing & Spacing**:
   - Use ease-in / ease-out spacing for natural weight. Fast snappy accents (`4–6` frames) for energetic realization; slower settling (`14–20` frames) for contemplation.
4. **Overlapping Action & Follow-Through**:
   - Offset keyframes sequentially up the kinematic chain:
     - **Pelvis / Root** leads at Frame `T`
     - **Spine / Chest** follows at Frame `T + 2`
     - **Neck / Head** follows at Frame `T + 4`
     - **Upper Arm → Forearm → Hand** staggered by `2–3` frames each.
5. **Secondary Motion**:
   - Breathing expansion on the chest bone, micro weight-shifts on the hips, eye blinks every `70–130` frames (and during major head turns), and subtle antenna/holo-ring motion on Nemo.

---

## 5. Director's Pre-Render Checklist

- [ ] Does every shot have a single, unmistakable focal point?
- [ ] Do Nemo and Leo maintain genuine eye contact (`Track To` / head orientation) when conversing?
- [ ] Are F-curves interpolated with smooth Bezier handles (`AUTO_CLAMPED`) and staggered for overlapping action?
- [ ] Does the listener visibly react while the speaker talks?
- [ ] Is screen direction (left/right placement) preserved across shot cuts?
