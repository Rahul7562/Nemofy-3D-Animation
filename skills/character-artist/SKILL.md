---
name: character-artist
description: Importing, inspecting, rigging, customizing, and validating production 3D character assets (Blender Studio Rain, Snow, Security Bot, Mixamo, and articulated studio rigs).
---

# Character Artist Skill (`skills/character-artist/SKILL.md`)

This skill defines how **AetherFrame 3D** manages, inspects, customizes, and validates rigged 3D characters inside Blender (`bpy`) and the studio asset catalogue.

---

## 1. Character Identity Cast

### 1.1 Nemo (`char-nemo`) — Digital AI Companion
- **Visual Design**: Sleek, expressive stylized cyber-harmonic AI companion with an articulated head, glowing cyan/emerald ocular visor & iris rings, expressive brow plates, articulated jaw/mouth viseme aperture, floating harmonic halo ring, and multi-jointed humanoid limbs.
- **Asset Lineage**:
  - Primary external reference base: **Blender Studio Security Bot v1** (CC-BY 4.0) / **Rain v3** stylized proportions, or the studio's multi-bone articulated `bpy` Armature rig (`Nemo_Rig`) when external `.blend` library files are not yet downloaded locally.
- **Palette**: Teal/Cyan harmonic chassis (`#06B6D4`), warm gold accents (`#F59E0B`), deep slate joints (`#0F172A`), emissive cyan ocular & mouth viseme shaders (`#38BDF8`).

### 1.2 Leo (`char-leo`) — 20-Year-Old College Student
- **Visual Design**: Expressive stylized 20-year-old college student with warm human skin tones (`#F1C27D`), tousled dark chestnut hair, varsity/hoodie collegiate jacket (`#3B82F6` with `#F8FAFC` trim), backpack straps, articulated eyes with pupils and eyelids, eyebrows, and jaw/lip-sync rig.
- **Asset Lineage**:
  - Primary external reference base: **Blender Studio Snow v4** (CC-BY 4.0, Blender Foundation) or Mixamo-compatible humanoid `.glb`/`.fbx` rig, backed by the studio's fully skinned multi-bone `bpy` humanoid armature (`Leo_Rig`) with facial shape keys / pose bones.

---

## 2. Approved External Character Sources & Licensing Rules

Always record origin, license, attribution, and rig type in `src/blender/asset-manager.ts`:

| Asset Source | URL | License | Usage & Redistribution Rules |
| :--- | :--- | :--- | :--- |
| **Blender Studio — Snow v4** | `https://studio.blender.org/characters/snow/v4/` | **CC-BY 4.0** (Blender Foundation) | Must credit Blender Studio. Supports Rigify / CloudRig facial & body controls. |
| **Blender Studio — Rain v3** | `https://studio.blender.org/characters/rain/v3/` | **CC-BY 4.0** (Blender Foundation) | Must credit Blender Studio. CloudRig armature + facial shape keys. |
| **Blender Studio — Security Bot v1** | `https://studio.blender.org/characters/security-bot/v1/` | **CC-BY 4.0** (Blender Foundation) | Must credit Blender Studio. Robotic mechanical armature & emissive visor shaders. |
| **Mixamo Characters & Clips** | `https://www.mixamo.com/` | Adobe Mixamo Terms | Free for use in rendered productions; raw character meshes should not be redistributed as standalone stock libraries. |

---

## 3. Mandatory Rig Inspection & Validation (`scripts/blender/import_character.py`)

Before any character asset is used in a shot, `import_character.py` must inspect and validate:

1. **Armature & Bone Hierarchy**:
   - Verify presence of root/pelvis (`root`, `pelvis` / `hips`), spine chain (`spine`, `chest`, `neck`, `head`), facial bones (`jaw`, `eye.L`, `eye.R`, `brow.L`, `brow.R`, `eyelid_upper.L`, `eyelid_upper.R`), and limb chains (`upper_arm.L/R`, `forearm.L/R`, `hand.L/R`, `thigh.L/R`, `shin.L/R`, `foot.L/R`).
2. **Facial Controls & Shape Keys**:
   - Inspect mesh `shape_keys.key_blocks` or facial pose bones for visemes (`viseme_aa`, `viseme_oh`, `viseme_ee`, `viseme_fv`, `viseme_mbp` / `jaw_open`, `mouth_wide`, `mouth_pucker`, `blink_L`, `blink_R`, `brow_up`, `brow_down`, `smile`).
3. **Scale, Proportions & Ground Contact**:
   - Normalize character height in Blender scene units (meters):
     - **Leo**: `~1.76m` tall, soles of feet flush at `Z = 0.00m`.
     - **Nemo**: `~1.62m` tall, soles of feet flush at `Z = 0.00m`.
4. **Material & Shader Integrity**:
   - Ensure Principled BSDF shaders use proper subsurface scattering weight (`Subsurface Weight` for Leo's skin), metallic/roughness tuning for Nemo's chassis, and Emission shaders for Nemo's visor and core.

---

## 4. Character Artist Quality Checklist

- [ ] Are both **Nemo** (AI companion) and **Leo** (20-year-old student) visually distinct, recognizable, and consistent across all shots?
- [ ] Does every character have a true Blender `ARMATURE` object with named bones for spine, head, eyes, jaw, brows, arms, hands, legs, and feet?
- [ ] Are feet planted at `Z = 0.0` without floating or ground penetration?
- [ ] Are facial controls (jaw, mouth width, eyelids, eyebrows, eye targets) responsive to keyframing?
