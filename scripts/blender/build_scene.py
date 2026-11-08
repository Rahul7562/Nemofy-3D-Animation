"""
AetherFrame 3D — Authoritative Blender Scene & Environment Builder
(scripts/blender/build_scene.py)

Builds a complete, multi-shot cinematic Blender (.blend) project from a validated
AetherFrame JSON manifest:
- Constructs detailed architectural environments with ShaderNode PBR materials
  (Voronoi/Noise weathered stone, brushed gold/bronze astrolabe rings, glowing
  crystal pillars, bioluminescent foliage, and background mountain/sky horizons).
- Imports or builds articulated Nemo_Rig (AI companion) and Leo_Rig (college student).
- Authors full-timeline skeletal acting, mutual listener reactions, and phoneme-to-viseme
  lip-sync keyframes across all shots.
- Configures physical shot cameras (28mm-70mm lenses, 9:16 / 16:9 / 1:1 framing, DOF)
  bound to timeline markers.
- Configures three-point cinematic lighting, catchlights, and Filmic lookdev.
- Saves the generated .blend file and runs automated scene inspection.
"""

import os
import sys
import json
import math
import bpy
import mathutils

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from import_character import create_pbr_material, import_or_build_character
from animate_character import author_character_timeline_performance
from configure_camera import configure_shot_cameras
from configure_lighting import configure_scene_lighting_and_lookdev
from inspect_scene import inspect_current_blender_scene


def clear_default_blender_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    if not scene.world:
        scene.world = bpy.data.worlds.new("AetherFrame_World")
    return scene


def build_detailed_environment(scene: bpy.types.Scene, env_type: str, total_frames: int):
    """
    Constructs a detailed multi-layered 3D environment in Blender with foreground,
    midground, and background architectural dressing and ShaderNode PBR materials.
    Ground contact surface is precisely at Z = 0.0m.
    """
    stone_mat = create_pbr_material(
        "Env_StoneCourtyard", "#1E293B", roughness=0.58, metallic=0.08, bump_scale=0.14, noise_scale=22.0
    )
    dark_trim_mat = create_pbr_material(
        "Env_DarkSlate", "#0F172A", roughness=0.42, metallic=0.22, bump_scale=0.08, noise_scale=35.0
    )
    gold_mat = create_pbr_material(
        "Env_BrushedGold", "#F59E0B", roughness=0.22, metallic=0.88, emission_hex="#F59E0B", emission_strength=0.35
    )
    cyan_crystal_mat = create_pbr_material(
        "Env_CrystalGlow", "#38BDF8", roughness=0.12, metallic=0.10, emission_hex="#38BDF8", emission_strength=5.0
    )
    emerald_crystal_mat = create_pbr_material(
        "Env_EmeraldGlow", "#34D399", roughness=0.14, metallic=0.10, emission_hex="#10B981", emission_strength=4.5
    )
    foliage_mat = create_pbr_material(
        "Env_CanopyFoliage", "#065F46", roughness=0.62, subsurface=0.18, bump_scale=0.12, noise_scale=30.0
    )

    # 1. Main Ground Courtyard Plaza (Top surface flush at Z = 0.0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=16.0, depth=0.20, location=(0, 0, -0.10))
    ground = bpy.context.active_object
    ground.name = "Env_CourtyardFloor"
    ground.data.materials.append(stone_mat)

    # Concentric Inlaid Bronze & Harmonic Rings on Floor
    for idx, (maj_r, min_r, mat) in enumerate([
        (1.65, 0.022, gold_mat),
        (2.85, 0.030, cyan_crystal_mat if env_type != "bioluminescent-forest" else emerald_crystal_mat),
        (4.60, 0.035, gold_mat),
    ]):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=maj_r, minor_radius=min_r, major_segments=64, minor_segments=16, location=(0, 0, 0.005)
        )
        ring = bpy.context.active_object
        ring.name = f"Env_FloorInlayRing_{idx + 1}"
        ring.data.materials.append(mat)

    # 2. Midground Central Astrolabe & Harmonic Pedestal (Behind Nemo & Leo at Y = +2.35m)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.85, depth=0.36, location=(0, 2.35, 0.18))
    pedestal = bpy.context.active_object
    pedestal.name = "Env_CentralPedestal"
    bev = pedestal.modifiers.new(name="Bevel", type="BEVEL")
    bev.width = 0.04
    bev.segments = 3
    pedestal.data.materials.append(dark_trim_mat)

    # Animated Multi-Axis Celestial Astrolabe Rings + Floating Harmonic Core
    ring_configs = [
        ("Env_AstrolabeOuterRing", 1.15, 0.032, gold_mat, (0.0, 0.0, 1.35)),
        ("Env_AstrolabeMidRing",   0.86, 0.026, cyan_crystal_mat, (0.45, 1.20, -0.85)),
        ("Env_AstrolabeInnerRing", 0.58, 0.022, gold_mat, (-0.95, 0.35, 1.65)),
    ]
    for r_name, maj_r, min_r, r_mat, rot_end in ring_configs:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=maj_r, minor_radius=min_r, major_segments=64, minor_segments=16, location=(0, 2.35, 1.65)
        )
        r_obj = bpy.context.active_object
        r_obj.name = r_name
        r_obj.rotation_euler = (math.pi / 2, 0.0, 0.0)
        r_obj.data.materials.append(r_mat)
        r_obj.keyframe_insert(data_path="rotation_euler", frame=1)
        r_obj.rotation_euler = (math.pi / 2 + rot_end[0], rot_end[1], rot_end[2])
        r_obj.keyframe_insert(data_path="rotation_euler", frame=total_frames)

    # Floating Crystalline Octahedron Core inside Astrolabe
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.28, location=(0, 2.35, 1.65))
    core = bpy.context.active_object
    core.name = "Env_HarmonicCoreCrystal"
    core.data.materials.append(cyan_crystal_mat if env_type != "bioluminescent-forest" else emerald_crystal_mat)
    core.keyframe_insert(data_path="location", frame=1)
    core.keyframe_insert(data_path="rotation_euler", frame=1)
    core.location = (0, 2.35, 1.78)
    core.rotation_euler = (0.4, 0.6, 2.4)
    core.keyframe_insert(data_path="location", frame=total_frames // 2)
    core.keyframe_insert(data_path="rotation_euler", frame=total_frames // 2)
    core.location = (0, 2.35, 1.65)
    core.rotation_euler = (0.8, 1.2, 4.8)
    core.keyframe_insert(data_path="location", frame=total_frames)
    core.keyframe_insert(data_path="rotation_euler", frame=total_frames)

    # Motivated Point Light inside the Astrolabe Crystal Core
    core_light_data = bpy.data.lights.new(name="Env_AstrolabeCoreLight", type="POINT")
    core_light_data.energy = 180.0
    core_light_data.color = (0.22, 0.74, 0.98)
    core_light_obj = bpy.data.objects.new(name="Env_AstrolabeCoreLight", object_data=core_light_data)
    scene.collection.objects.link(core_light_obj)
    core_light_obj.location = (0, 2.15, 1.65)

    # 3. Semicircular Colonnade of Architectural Pillars & Glowing Braziers
    pillar_angles = [-1.15, -0.72, -0.35, 0.35, 0.72, 1.15]
    for idx, ang in enumerate(pillar_angles):
        dist = 4.25
        px = math.sin(ang) * dist
        py = math.cos(ang) * dist + 0.8
        # Pillar Base
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, 0.18))
        p_base = bpy.context.active_object
        p_base.name = f"Env_PillarBase_{idx + 1}"
        p_base.scale = (0.48, 0.48, 0.36)
        p_base.data.materials.append(dark_trim_mat)

        # Fluted Column Shaft
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.18, depth=2.6, location=(px, py, 1.66))
        p_shaft = bpy.context.active_object
        p_shaft.name = f"Env_PillarShaft_{idx + 1}"
        p_shaft.data.materials.append(stone_mat)

        # Gold Capital & Floating Crystal Lantern
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.24, depth=0.14, location=(px, py, 3.02))
        p_cap = bpy.context.active_object
        p_cap.name = f"Env_PillarCap_{idx + 1}"
        p_cap.data.materials.append(gold_mat)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.12, location=(px, py, 3.26))
        lantern = bpy.context.active_object
        lantern.name = f"Env_PillarCrystal_{idx + 1}"
        lantern.data.materials.append(emerald_crystal_mat if idx % 2 == 1 else cyan_crystal_mat)

    # 4. Monumental Background Sanctuary Arch & Harmonic Crystal Spires
    bpy.ops.mesh.primitive_torus_add(
        major_radius=3.6, minor_radius=0.16, major_segments=64, minor_segments=16, location=(0, 5.2, 1.6)
    )
    arch = bpy.context.active_object
    arch.name = "Env_SanctuaryPortalArch"
    arch.rotation_euler = (math.pi / 2, 0, 0)
    arch.data.materials.append(gold_mat)

    for side_idx, sx in enumerate([-2.45, 2.45]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.38, depth=2.3, location=(sx, 3.6, 1.15))
        spire = bpy.context.active_object
        spire.name = f"Env_HarmonicSpire_{side_idx + 1}"
        spire.data.materials.append(dark_trim_mat)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.22, location=(sx, 3.6, 2.55))
        spire_gem = bpy.context.active_object
        spire_gem.name = f"Env_SpireCrystal_{side_idx + 1}"
        spire_gem.data.materials.append(cyan_crystal_mat if side_idx == 0 else emerald_crystal_mat)

        bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.025, location=(sx, 3.6, 2.55), rotation=(0.35, 0.2, 0))
        spire_ring = bpy.context.active_object
        spire_ring.name = f"Env_SpireRing_{side_idx + 1}"
        spire_ring.data.materials.append(gold_mat)

    # 5. Distant Horizon Mountain Peaks & Floating Star Motes
    for m_idx in range(9):
        ang = -1.35 + (m_idx / 8.0) * 2.70
        dist = 13.5 + (m_idx % 3) * 1.8
        mx = math.sin(ang) * dist
        my = math.cos(ang) * dist + 2.0
        mh = 4.2 + (m_idx % 4) * 1.4
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=2.6, radius2=0.08, depth=mh, location=(mx, my, mh * 0.45))
        peak = bpy.context.active_object
        peak.name = f"Env_HorizonPeak_{m_idx + 1}"
        peak.data.materials.append(dark_trim_mat)

    # Animated Floating Harmonic Motes in Midground
    for p_idx in range(14):
        angle = (p_idx / 14.0) * math.pi * 2.0
        rad = 1.4 + (p_idx % 4) * 0.55
        mx = math.sin(angle) * rad
        my = math.cos(angle) * rad + 0.6
        mz = 0.65 + (p_idx % 5) * 0.42
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.028, location=(mx, my, mz))
        mote = bpy.context.active_object
        mote.name = f"Env_FloatingMote_{p_idx + 1}"
        mote.data.materials.append(gold_mat if p_idx % 2 == 0 else cyan_crystal_mat)
        mote.keyframe_insert(data_path="location", frame=1)
        mote.location = (mx + 0.12 * math.cos(p_idx), my, mz + 0.22)
        mote.keyframe_insert(data_path="location", frame=total_frames)


def select_best_render_engine(scene: bpy.types.Scene, requested_engine: str = "EEVEE"):
    """
    Selects the best supported Blender render engine on the current host.
    Prefers BLENDER_EEVEE / BLENDER_EEVEE_NEXT, or CYCLES when requested.
    """
    req = (requested_engine or "EEVEE").upper()
    if "CYCLES" in req:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 32
        scene.cycles.use_denoising = False
        return "CYCLES"

    # Try BLENDER_EEVEE_NEXT (Blender 4.2+) then BLENDER_EEVEE (Blender 3.x / 4.0)
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        try:
            scene.render.engine = candidate
            return candidate
        except Exception:
            continue
    return scene.render.engine


def build_project_from_manifest(manifest_path: str, output_blend_path: str, inspection_json_path: str = None):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    scene = clear_default_blender_scene()

    fps = int(manifest.get("fps", 30))
    width = int(manifest.get("width", 1080))
    height = int(manifest.get("height", 1920))
    total_frames = int(manifest.get("totalFrames", 300))
    aspect_ratio = str(manifest.get("aspectRatio", "9:16"))
    render_preset = str(manifest.get("renderPreset", "final"))
    render_engine_pref = str(manifest.get("renderEngine", "EEVEE"))

    scene.render.fps = fps
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.frame_start = 1
    scene.frame_end = total_frames
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"

    select_best_render_engine(scene, render_engine_pref)

    shots = manifest.get("shots", [])
    primary_env = shots[0].get("environment", "observatory-citadel") if shots else "observatory-citadel"
    primary_lighting = shots[0].get("lightingPreset", "golden-hour") if shots else "golden-hour"

    # 1. Build Detailed Environment & Set Dressing
    build_detailed_environment(scene, primary_env, total_frames)

    # 2. Import or Build Articulated Characters (Leo & Nemo)
    characters_cfg = manifest.get("characters", [])
    if not characters_cfg:
        characters_cfg = [
            {"id": "char-leo", "name": "Leo", "archetype": "scholar-humanoid", "primaryColor": "#2563EB", "secondaryColor": "#F59E0B"},
            {"id": "char-nemo", "name": "Nemo", "archetype": "robot-companion", "primaryColor": "#06B6D4", "secondaryColor": "#F59E0B"},
        ]

    # Ensure both Leo and Nemo are present for the production cast
    rigs_by_id = {}
    for c_cfg in characters_cfg[:2]:
        rig_obj = import_or_build_character(c_cfg)
        rigs_by_id[c_cfg["id"]] = rig_obj

    if len(rigs_by_id) < 2:
        if not any("leo" in k for k in rigs_by_id):
            rigs_by_id["char-leo"] = import_or_build_character({"id": "char-leo", "name": "Leo"})
        if not any("nemo" in k for k in rigs_by_id):
            rigs_by_id["char-nemo"] = import_or_build_character({"id": "char-nemo", "name": "Nemo"})

    # Normalize shot frame intervals (1-indexed for Blender)
    normalized_shots = []
    cursor_f = 1
    for s_idx, raw_shot in enumerate(shots):
        dur_f = max(15, int(round(float(raw_shot.get("durationSeconds", 3.33)) * fps)))
        if s_idx == len(shots) - 1:
            end_f = total_frames + 1
        else:
            end_f = min(total_frames + 1, cursor_f + dur_f)

        normalized_shots.append({
            **raw_shot,
            "startFrame": cursor_f,
            "endFrame": end_f,
            "characterStaging": {
                "char-leo":  {"x": -0.58, "y": 0.0},
                "char-nemo": {"x":  0.58, "y": 0.0},
            },
        })
        cursor_f = end_f

    # 3. Author Layered Character Acting, Mutual Reaction & Viseme Lip-Sync
    rig_ids = list(rigs_by_id.keys())
    for idx, cid in enumerate(rig_ids):
        partner_id = rig_ids[1 - idx] if len(rig_ids) > 1 else cid
        partner_positions = [
            s["characterStaging"].get(partner_id, {"x": 0.58 if "leo" in cid else -0.58, "y": 0.0})
            for s in normalized_shots
        ]
        author_character_timeline_performance(
            rigs_by_id[cid],
            cid,
            partner_positions,
            normalized_shots,
            fps,
        )

    # 4. Configure Physical Shot Cameras, Lenses, 9:16 Framing & DOF
    configure_shot_cameras(scene, normalized_shots, aspect_ratio, rigs_by_id)

    # 5. Configure Three-Point Cinematic Lighting, Catchlights & Filmic Lookdev
    configure_scene_lighting_and_lookdev(scene, primary_lighting, 1.25, render_preset)

    # 6. Save .blend Project File
    os.makedirs(os.path.dirname(os.path.abspath(output_blend_path)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(output_blend_path))

    # 7. Run Automated Scene Quality Inspection
    report = inspect_current_blender_scene()
    report["savedBlendPath"] = os.path.abspath(output_blend_path)
    if inspection_json_path:
        with open(inspection_json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

    print("AETHERFRAME_BUILD_SUCCESS")
    print("AETHERFRAME_INSPECTION_JSON_START")
    print(json.dumps(report))
    print("AETHERFRAME_INSPECTION_JSON_END")


if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Usage: blender -b -P build_scene.py -- <manifest.json> <output.blend> [inspection.json]")
    args = argv[argv.index("--") + 1 :]
    manifest_file = args[0]
    blend_file = args[1]
    inspect_file = args[2] if len(args) >= 3 else None
    build_project_from_manifest(manifest_file, blend_file, inspect_file)
