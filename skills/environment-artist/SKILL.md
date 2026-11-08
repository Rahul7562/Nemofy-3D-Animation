---
name: environment-artist
description: Constructing rich, multi-layered 3D environments with architectural detail, procedural ShaderNode PBR materials, set dressing, props, volumetrics, and Poly Haven CC0 integration.
---

# Environment Artist Skill (`skills/environment-artist/SKILL.md`)

This skill governs environment construction, architectural detail, set dressing, shader node materials, and atmospheric depth in `scripts/blender/build_scene.py`.

---

## 1. Anti-Primitive Mandate

Do not construct environments out of a few flat untextured cylinders or boxes. Every Blender environment must include:

1. **Layered Spatial Depth**:
   - **Foreground Elements**: Framing columns, glowing lanterns, foliage silhouettes, or stone balustrades near the camera edges.
   - **Midground Stage**: Detailed multi-tiered plaza floor with inlaid geometric trim, carved steps, glowing harmonic conduits, pedestals, and interactive props near Nemo and Leo.
   - **Background Architecture & Horizon**: Multi-ringed celestial astrolabe mechanisms, arched colonnades, bioluminescent canopy arches, distant mountain ridges, and starry/nebula world sky domes.
2. **Rich ShaderNode Materials (Procedural PBR & Poly Haven CC0)**:
   - Use Blender `ShaderNodeTexNoise`, `ShaderNodeTexVoronoi`, `ShaderNodeValToRGB`, and `ShaderNodeBump` wired into `ShaderNodeBsdfPrincipled` to create weathered stone, brushed bronze/gold, glowing crystal veins, wet pavement reflections, and organic bark/foliage micro-relief.
   - Support loading external **Poly Haven CC0** HDRIs (`.exr`/`.hdr`) and PBR texture maps (`albedo`, `roughness`, `normal`) whenever present in `assets/environments/`.

---

## 2. Environment Catalogue

| Environment ID | Architectural & Set-Dressing Elements | Material & Shader Highlights |
| :--- | :--- | :--- |
| **`observatory-citadel`** | Concentric stone courtyard with bronze zodiac inlays, 8 fluted colonnade pillars with glowing crystal braziers, multi-axis rotating brass & cyan celestial astrolabe, carved stairway, and distant mountain silhouettes. | Weathered slate Voronoi/Noise bump normal map, anisotropic brushed gold/bronze (`Metallic = 0.88`, `Roughness = 0.24`), emissive cyan crystal core. |
| **`bioluminescent-forest`** | Mossy terraced forest floor, twisted ancient canopy trees with Subdivision/Displaced trunks, glowing crystal root clusters, stepping stones, and floating spore motes. | Subsurface emerald foliage, emissive turquoise crystal veins (`Emission Strength = 4.5`), damp moss roughness variation. |
| **`floating-sanctuary`** | Marble & lapis lazuli sky sanctuary plaza, monumental starlight portal arch with inner energy ribbon, levitating monolith shards, and cloud-sea horizon. | Polished marble with subtle noise veining, gold filigree trim, volumetric portal emission. |
| **`cyber-harbor`** | Rain-slicked neon dockside walkway, holographic signage pylons, cargo containers, and reflective water plane. | High-specular wet asphalt (`Roughness = 0.12` with noise puddles), neon magenta/cyan emissive panels. |
| **`desert-monolith`** | Sculpted sandstone canyon floor, ancient carved obelisks, hovering solar-glass monolith, and warm atmospheric dust. | Layered wave/noise sandstone strata bump map, obsidian mirror monolith (`Roughness = 0.08`). |
| **`minimal-studio`** | Infinite curved cyclorama cove with subtle grid rim inlays and pedestal accents. | Satin studio cyclorama shader with soft contact shadow catcher. |

---

## 3. Environment Quality Checklist

- [ ] Does the environment feature distinct foreground, midground, and background layers?
- [ ] Do all surfaces use multi-node Principled BSDF materials (roughness variation, bump/normal relief, metallic/emission accents) rather than flat solid colors?
- [ ] Is the ground plane accurately leveled at `Z = 0.0` in the character performance zone so feet make clean contact?
- [ ] Do animated environmental elements (astrolabe rings, floating crystals, drifting motes) move smoothly across all frames?
