import fs from "node:fs";
import path from "node:path";

export interface ProductionAssetCatalogEntry {
  id: string;
  name: string;
  category: "character-rig" | "motion-clip" | "environment-hdri" | "pbr-material";
  characterAssignment?: "nemo" | "leo" | "shared";
  sourceName: string;
  sourceUrl: string;
  license: string;
  attributionRequired: boolean;
  attributionText: string;
  redistributableInRepo: boolean;
  rigCompatibility: string;
  localPath: string | null;
  availableLocally: boolean;
  description: string;
}

const ASSETS_ROOT = path.resolve("./assets");

function checkLocalFile(relPath: string): { fullPath: string; exists: boolean } {
  const fullPath = path.join(ASSETS_ROOT, relPath);
  return { fullPath, exists: fs.existsSync(fullPath) };
}

export function getProductionAssetCatalogue(): ProductionAssetCatalogEntry[] {
  const snowCheck = checkLocalFile("characters/snow_v04.blend");
  const rainCheck = checkLocalFile("characters/rain_v03.blend");
  const secBotCheck = checkLocalFile("characters/security_bot_v01.blend");

  return [
    {
      id: "studio-leo-armature-v2",
      name: "Leo — Articulated 30-Bone College Student Rig (Leo_Rig)",
      category: "character-rig",
      characterAssignment: "leo",
      sourceName: "AetherFrame 3D / Blender bpy Rig Generator (Snow v4 Proportions)",
      sourceUrl: "https://studio.blender.org/characters/snow/v4/",
      license: "CC-BY 4.0 / MIT",
      attributionRequired: true,
      attributionText:
        "Character proportions inspired by Blender Studio 'Snow v4' (CC-BY 4.0 Blender Foundation), authored via AetherFrame bpy Armature pipeline.",
      redistributableInRepo: true,
      rigCompatibility:
        "Canonical 30-bone Armature (hips, spine, chest, neck, head, jaw, lip_upper, lip_lower, mouth_corner.L/R, eye.L/R, eyelid_upper.L/R, brow.L/R, limbs)",
      localPath: path.resolve("./scripts/blender/import_character.py"),
      availableLocally: true,
      description:
        "20-year-old college student with subsurface skin shader, sculpted chestnut hair, collegiate jacket, backpack straps, jeans, sneakers, and phoneme-viseme facial bones.",
    },
    {
      id: "studio-nemo-armature-v2",
      name: "Nemo — Articulated 30-Bone Digital AI Companion Rig (Nemo_Rig)",
      category: "character-rig",
      characterAssignment: "nemo",
      sourceName: "AetherFrame 3D / Blender bpy Rig Generator (Security Bot v1 Lineage)",
      sourceUrl: "https://studio.blender.org/characters/security-bot/v1/",
      license: "CC-BY 4.0 / MIT",
      attributionRequired: true,
      attributionText:
        "Robotic AI design inspired by Blender Studio 'Security Bot v1' (CC-BY 4.0 Blender Foundation), authored via AetherFrame bpy Armature pipeline.",
      redistributableInRepo: true,
      rigCompatibility:
        "Canonical 30-bone Armature with emissive ocular iris rings, brow plates, articulated viseme jaw/lips, and floating harmonic halo.",
      localPath: path.resolve("./scripts/blender/import_character.py"),
      availableLocally: true,
      description:
        "Sleek digital AI companion with teal/white harmonic chassis, gold collar & halo ring, glowing cyan visor eyes, expressive brow plates, and articulated viseme mouth.",
    },
    {
      id: "blender-studio-snow-v4",
      name: "Blender Studio — Snow (v4 CloudRig)",
      category: "character-rig",
      characterAssignment: "leo",
      sourceName: "Blender Studio Character Library",
      sourceUrl: "https://studio.blender.org/characters/snow/v4/",
      license: "CC-BY 4.0 (Blender Foundation)",
      attributionRequired: true,
      attributionText: "Snow Rig v4 by Blender Studio (CC-BY 4.0).",
      redistributableInRepo: true,
      rigCompatibility: "Blender CloudRig / Rigify Humanoid",
      localPath: snowCheck.exists ? snowCheck.fullPath : null,
      availableLocally: snowCheck.exists,
      description:
        "Official Blender Studio stylized young-adult humanoid rig with full facial CloudRig controls.",
    },
    {
      id: "blender-studio-rain-v3",
      name: "Blender Studio — Rain (v3 CloudRig)",
      category: "character-rig",
      characterAssignment: "shared",
      sourceName: "Blender Studio Character Library",
      sourceUrl: "https://studio.blender.org/characters/rain/v3/",
      license: "CC-BY 4.0 (Blender Foundation)",
      attributionRequired: true,
      attributionText: "Rain Rig v3 by Blender Studio (CC-BY 4.0).",
      redistributableInRepo: true,
      rigCompatibility: "Blender CloudRig / Rigify Humanoid",
      localPath: rainCheck.exists ? rainCheck.fullPath : null,
      availableLocally: rainCheck.exists,
      description:
        "Official Blender Studio stylized female humanoid rig with facial shape keys and CloudRig controls.",
    },
    {
      id: "blender-studio-security-bot-v1",
      name: "Blender Studio — Security Bot (v1)",
      category: "character-rig",
      characterAssignment: "nemo",
      sourceName: "Blender Studio Character Library",
      sourceUrl: "https://studio.blender.org/characters/security-bot/v1/",
      license: "CC-BY 4.0 (Blender Foundation)",
      attributionRequired: true,
      attributionText: "Security Bot v1 by Blender Studio (CC-BY 4.0).",
      redistributableInRepo: true,
      rigCompatibility: "Blender Mechanical Armature",
      localPath: secBotCheck.exists ? secBotCheck.fullPath : null,
      availableLocally: secBotCheck.exists,
      description:
        "Official Blender Studio robotic sentinel & companion asset with mechanical rigging and emissive visor shaders.",
    },
    {
      id: "mixamo-retarget-library",
      name: "Mixamo Humanoid Skeletal Motion Retargeter",
      category: "motion-clip",
      characterAssignment: "shared",
      sourceName: "Adobe Mixamo / AetherFrame Retargeter",
      sourceUrl: "https://www.mixamo.com/",
      license: "Adobe Mixamo Terms of Use (Rendered Output Permitted)",
      attributionRequired: false,
      attributionText: "Mixamo motion clips retargeted via scripts/blender/retarget_animation.py.",
      redistributableInRepo: false,
      rigCompatibility: "mixamorig:* -> Canonical 30-Bone Armature",
      localPath: path.resolve("./scripts/blender/retarget_animation.py"),
      availableLocally: true,
      description:
        "Maps external Mixamo FBX/GLB humanoid bone hierarchies onto Leo_Rig and Nemo_Rig with automatic Z=0.0 foot-ground locking.",
    },
    {
      id: "polyhaven-cc0-shaders",
      name: "Poly Haven CC0 HDRI & Procedural PBR Material Library",
      category: "pbr-material",
      characterAssignment: "shared",
      sourceName: "Poly Haven / Blender ShaderNode PBR",
      sourceUrl: "https://polyhaven.com/",
      license: "CC0 1.0 Universal (Public Domain)",
      attributionRequired: false,
      attributionText: "CC0 Public Domain PBR textures and procedural Voronoi/Noise ShaderNodes.",
      redistributableInRepo: true,
      rigCompatibility: "Blender Principled BSDF (Eevee & Cycles)",
      localPath: path.resolve("./scripts/blender/build_scene.py"),
      availableLocally: true,
      description:
        "Multi-node Principled BSDF materials with Voronoi/Noise micro-bump, subsurface skin scattering, brushed bronze/gold, and emissive crystals.",
    },
  ];
}

export interface AssetCatalogueSummaryItem {
  id: string;
  name: string;
  category: string;
  originUrl: string;
  license: string;
  attribution: string;
  rigType: string;
  boneCount: number;
  hasFacialRig: boolean;
  hasPhonemeVisemes: boolean;
}

export function getAssetCatalogueSummary(): AssetCatalogueSummaryItem[] {
  return getProductionAssetCatalogue().map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    originUrl: entry.sourceUrl,
    license: entry.license,
    attribution: entry.attributionText,
    rigType: entry.rigCompatibility,
    boneCount: entry.category === "character-rig" ? 31 : 0,
    hasFacialRig: entry.category === "character-rig",
    hasPhonemeVisemes: entry.category === "character-rig",
  }));
}

export function resolveCharacterAsset(characterId: string): AssetCatalogueSummaryItem {
  const idLower = (characterId || "").toLowerCase();
  const summary = getAssetCatalogueSummary();
  if (idLower.includes("leo")) {
    return summary.find((s) => s.id === "studio-leo-armature-v2") || summary[0];
  }
  return summary.find((s) => s.id === "studio-nemo-armature-v2") || summary[1];
}

