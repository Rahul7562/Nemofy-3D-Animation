---
name: lighting-lookdev
description: Cinematic three-point lighting, motivated practical lights, colour contrast, shadows, volumetric atmosphere, and filmic colour management in Blender.
---

# Lighting & Look Development Skill (`skills/lighting-lookdev/SKILL.md`)

This skill defines cinematic lighting, shadow quality, atmospheric depth, and colour management in `scripts/blender/configure_lighting.py`.

---

## 1. Cinematic Three-Point + Motivated Practical Lighting

Every shot must be lit to sculpt character faces, separate silhouettes from the background, and reinforce emotional tone:

1. **Key Light (`AREA` or `SUN`)**:
   - Positioned `30°–45°` off the camera axis and `35°–45°` above eye level (Rembrandt / loop lighting angle).
   - Warm or mood-specific colour temperature (e.g., Golden Hour `#FFD28E` or Moonlit `#8AB4F8`) with soft area size (`size = 2.0m–3.5m`) for flattering facial falloff and crisp contact shadows.
2. **Fill Light (`AREA`)**:
   - Placed on the opposite side of the camera axis at `25%–40%` of the Key Light's intensity (`key_to_fill_ratio ≈ 3:1`).
   - Cooler complementary hue (`#60A5FA` or `#38BDF8`) to keep shadow areas rich and readable without flattening form.
3. **Rim / Back Light (`SPOT` or `AREA`)**:
   - Positioned behind and above Nemo and Leo, aimed at their shoulders and hair/head contours.
   - High-contrast accent colour (`#38BDF8` cyan or `#F59E0B` amber) to carve a crisp rim highlight that separates characters from dark architectural backgrounds.
4. **Character Eye / Face Catchlight (`POINT` or `AREA`)**:
   - Subtle low-energy frontal light near camera lens axis that creates living specular catchlights in Leo's eyes and Nemo's ocular visor.
5. **Motivated Practical Lights**:
   - Point/Area lights co-located with emissive props in the scene (e.g., the glowing astrolabe core, crystal braziers, or portal arch) so emissive objects genuinely illuminate nearby characters and floor surfaces.

---

## 2. World Shader, Sky Gradient & Atmospheric Mist

- Construct a multi-node `World` shader using `ShaderNodeTexSky` / `ShaderNodeGradientTexture` + `ShaderNodeValToRGB` + `ShaderNodeBackground` so the sky dome exhibits a rich zenith-to-horizon colour gradient.
- Enable **Ambient Occlusion** (`eevee.use_gtao = True`, `gtao_distance = 0.8`), **Bloom** (`eevee.use_bloom = True`, `bloom_intensity = 0.04`), and **Screen Space Reflections** (`eevee.use_ssr = True`).
- Use subtle distance fog / mist pass (`world.mist_settings`) to separate distant mountains and architecture from the midground characters.

---

## 3. Filmic Colour Management & Exposure

- Set `scene.view_settings.view_transform = 'Filmic'` (or `'AgX'` on Blender 4.x) to prevent harsh highlight clipping on bright emissive cores and skin tones.
- Set `scene.view_settings.look = 'Medium High Contrast'` for cinematic punch.
- Tune `scene.view_settings.exposure` (`0.0` to `+0.35`) and `gamma` (`1.0`) so character faces read clearly at `60–75 IRE`.

---

## 4. Lighting & Lookdev Quality Checklist

- [ ] Do both characters have clear key, fill, and rim separation on their faces and shoulders?
- [ ] Are there visible specular catchlights in Leo's eyes and Nemo's visor?
- [ ] Are ground contact shadows visible beneath the characters' feet?
- [ ] Is Filmic / AgX colour management enabled with Medium High Contrast?
