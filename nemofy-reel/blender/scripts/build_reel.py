#!/usr/bin/env python3
"""
Builds the authoritative Nemofy StudentHub Instagram Reel Blender scene (.blend):
- Reuses existing Leo_Rig and Nemo_Rig without redesigning either character
- Builds the midnight window-ledge studio environment + custom animated
  Nemofy StudentHub Holographic Verilog Waveform Console + overheating laptop prop
- Drives 13 beats of lip-sync, expressive free-hand gestures, and energetic cube acting
  directly from nemofy-reel/beat_timings.json
- Configures 13 vertical 9:16 shot cameras locked with TRACK_TO empties
- Saves blender/project.blend and runs inspect_scene validation
"""

import json
import math
import os
import sys
import bpy
import mathutils

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CORE_BLENDER_DIR = os.path.join(REPO_ROOT, "scripts", "blender")
if CORE_BLENDER_DIR not in sys.path:
    sys.path.insert(0, CORE_BLENDER_DIR)

from import_character import create_pbr_material, import_or_build_character
from animate_character import author_character_timeline_performance
from configure_camera import configure_shot_cameras
from configure_lighting import configure_scene_lighting_and_lookdev
from build_scene import clear_default_blender_scene, build_detailed_environment, select_best_render_engine
from inspect_scene import inspect_current_blender_scene


def smooth_object_fcurves(obj: bpy.types.Object):
    if not obj or not obj.animation_data or not obj.animation_data.action:
        return
    for fc in obj.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = "AUTO_CLAMPED"
            kp.handle_right_type = "AUTO_CLAMPED"
        fc.update()


def add_overheating_laptop_prop(scene: bpy.types.Scene, beat7_frame: int):
    """Adds Leo's overheating laptop cleanly on the left window ledge for Beats 1-6, sliding/shrinking down at Beat 7."""
    body_mat = create_pbr_material("Env_LaptopAlum", "#334155", roughness=0.35, metallic=0.65)
    screen_warn_mat = create_pbr_material(
        "Env_LaptopFreezeRed", "#EF4444", roughness=0.18, emission_hex="#F97316", emission_strength=4.2
    )

    laptop_root = bpy.data.objects.new(name="Env_OverheatLaptopRoot", object_data=None)
    laptop_root.empty_display_size = 0.06
    laptop_root.location = (-0.72, -0.22, 0.0)
    laptop_root.rotation_euler = (0.0, 0.0, -0.45)
    scene.collection.objects.link(laptop_root)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.014))
    base = bpy.context.active_object
    base.name = "Env_OverheatLaptopBase"
    base.scale = (0.24, 0.16, 0.016)
    base.data.materials.append(body_mat)
    base.parent = laptop_root

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.078, 0.092))
    lid = bpy.context.active_object
    lid.name = "Env_OverheatLaptopLid"
    lid.scale = (0.24, 0.012, 0.15)
    lid.rotation_euler = (-0.25, 0.0, 0.0)
    lid.data.materials.append(body_mat)
    lid.parent = laptop_root

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.070, 0.092))
    scr = bpy.context.active_object
    scr.name = "Env_OverheatLaptopScreen"
    scr.scale = (0.20, 0.008, 0.11)
    scr.rotation_euler = (-0.25, 0.0, 0.0)
    scr.data.materials.append(screen_warn_mat)
    scr.parent = laptop_root

    # Thermal jitter while laptop fan roars during Beats 1-6, then cleanly vanishes at Beat 7 reveal
    for f in range(1, max(2, beat7_frame - 6), 6):
        laptop_root.location = (-0.72 + 0.003 * math.sin(f * 1.7), -0.22, 0.002 * abs(math.cos(f * 2.1)))
        laptop_root.scale = (1.0, 1.0, 1.0)
        laptop_root.keyframe_insert(data_path="location", frame=f)
        laptop_root.keyframe_insert(data_path="scale", frame=f)
    laptop_root.location = (-0.72, -0.22, -0.05)
    laptop_root.scale = (0.001, 0.001, 0.001)
    laptop_root.keyframe_insert(data_path="location", frame=beat7_frame + 10)
    laptop_root.keyframe_insert(data_path="scale", frame=beat7_frame + 10)
    smooth_object_fcurves(laptop_root)


def add_nemofy_studenthub_holo_console(
    scene: bpy.types.Scene,
    beat7_frame: int,
    beat9_frame: int,
    beat10_frame: int,
    total_frames: int,
    assets_dir: str,
):
    """
    Constructs the centerpiece Nemofy StudentHub Holographic Console floating in open
    unobstructed space above Nemo & beside Leo (X=0.29, Y=0.06, Z=1.06), showcasing
    Verilog logic gates, live HIGH/LOW signal waveforms, and multi-tool workbench tabs
    starting on Beat 7 ("Open Nemofy.tech. Tap StudentHub.").
    """
    os.makedirs(assets_dir, exist_ok=True)
    panel_mat = create_pbr_material(
        "Nemofy_HoloGlass", "#0B132B", roughness=0.14, metallic=0.25, emission_hex="#1E293B", emission_strength=1.5
    )
    bezel_mat = create_pbr_material(
        "Nemofy_HoloBezel", "#6366F1", roughness=0.20, metallic=0.55, emission_hex="#818CF8", emission_strength=3.2
    )
    wave_emerald_mat = create_pbr_material(
        "Nemofy_WaveEmerald", "#10B981", roughness=0.14, metallic=0.15, emission_hex="#34D399", emission_strength=5.2
    )
    wave_cyan_mat = create_pbr_material(
        "Nemofy_WaveCyan", "#06B6D4", roughness=0.14, metallic=0.15, emission_hex="#38BDF8", emission_strength=4.8
    )
    tab_amber_mat = create_pbr_material(
        "Nemofy_TabAmber", "#F59E0B", roughness=0.18, metallic=0.20, emission_hex="#FBBF24", emission_strength=4.2
    )

    root = bpy.data.objects.new(name="Env_NemofyHoloScreenRoot", object_data=None)
    root.empty_display_size = 0.08
    root.rotation_euler = (0.04, 0.0, -0.14)
    scene.collection.objects.link(root)

    # Animate console rising cleanly from Nemo's side into open upper-right hero space at Beat 7
    rise_start = max(1, beat7_frame - 6)
    rise_done = beat7_frame + 10
    for f, loc_val, s_val in [
        (1, (0.34, 0.14, 0.62), 0.01),
        (rise_start, (0.34, 0.14, 0.62), 0.01),
        (rise_done, (0.29, 0.06, 1.06), 1.0),
        (total_frames - 14, (0.29, 0.06, 1.06), 1.0),
        (total_frames, (0.34, 0.14, 0.64), 0.02),  # Loop cleanly back toward Beat 1!
    ]:
        root.location = loc_val
        root.scale = (s_val, s_val, s_val)
        root.keyframe_insert(data_path="location", frame=f)
        root.keyframe_insert(data_path="scale", frame=f)

    # Gentle floating hover between rise_done and loop-down
    for f in range(rise_done + 12, max(rise_done + 13, total_frames - 18), 18):
        hover = 0.014 * math.sin((f - rise_done) * 0.14)
        root.location = (0.29, 0.06, 1.06 + hover)
        root.keyframe_insert(data_path="location", frame=f)
    smooth_object_fcurves(root)

    def link_child(obj: bpy.types.Object):
        obj.parent = root

    # Main holographic card + glowing indigo bezel
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    screen = bpy.context.active_object
    screen.name = "Env_NemofyHoloPanel"
    screen.scale = (0.54, 0.016, 0.34)
    screen.data.materials.append(panel_mat)
    link_child(screen)

    for b_name, loc, scl in [
        ("Env_HoloBezelTop", (0.0, -0.004, 0.175), (0.56, 0.022, 0.016)),
        ("Env_HoloBezelBot", (0.0, -0.004, -0.175), (0.56, 0.022, 0.016)),
        ("Env_HoloBezelL", (-0.275, -0.004, 0.0), (0.016, 0.022, 0.355)),
        ("Env_HoloBezelR", (0.275, -0.004, 0.0), (0.016, 0.022, 0.355)),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
        bz = bpy.context.active_object
        bz.name = b_name
        bz.scale = scl
        bz.data.materials.append(bezel_mat)
        link_child(bz)

    # 3D Verilog Logic Gate Schematic Node + Trace Buses (upper half of Holo Screen)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.13, -0.015, 0.088))
    gate_and = bpy.context.active_object
    gate_and.name = "Env_VerilogGate_AND"
    gate_and.scale = (0.082, 0.014, 0.060)
    gate_and.data.materials.append(wave_cyan_mat)
    link_child(gate_and)

    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.030, depth=0.014, location=(-0.085, -0.015, 0.088))
    gate_cap = bpy.context.active_object
    gate_cap.name = "Env_VerilogGate_ANDCap"
    gate_cap.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    gate_cap.data.materials.append(wave_cyan_mat)
    link_child(gate_cap)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.085, -0.015, 0.088))
    gate_out = bpy.context.active_object
    gate_out.name = "Env_VerilogTrace_Bus"
    gate_out.scale = (0.22, 0.010, 0.014)
    gate_out.data.materials.append(wave_emerald_mat)
    link_child(gate_out)

    # 8 Live Animated Verilog HIGH/LOW Signal Waveform Bars (step cleanly across Beats 7-13!)
    for idx in range(8):
        bx = -0.195 + idx * 0.056
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, -0.016, -0.025))
        bar = bpy.context.active_object
        bar.name = f"Env_VerilogWaveBar_{idx + 1}"
        bar.data.materials.append(wave_emerald_mat if idx % 2 == 0 else wave_cyan_mat)
        link_child(bar)

        for f in range(beat7_frame, max(beat7_frame + 1, total_frames), 8):
            active_mult = 1.45 if f >= beat9_frame else 0.95
            phase = ((f // 8) + idx) % 4
            hz = (0.095 if phase in (0, 2) else 0.035) * active_mult
            bar.scale = (0.036, 0.014, min(0.130, hz))
            bar.location = (bx, -0.016, -0.050 + min(0.130, hz) * 0.42)
            bar.keyframe_insert(data_path="scale", frame=f)
            bar.keyframe_insert(data_path="location", frame=f)
        smooth_object_fcurves(bar)

    # Bottom StudentHub Multi-Tool Indicator Chips (Verilog | Python/C++ | Math | PDF)
    chip_x = [-0.168, -0.056, 0.056, 0.168]
    for c_idx, cx in enumerate(chip_x):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, -0.015, -0.125))
        chip = bpy.context.active_object
        chip.name = f"Env_StudentHubToolChip_{c_idx + 1}"
        chip.scale = (0.080, 0.012, 0.032)
        chip.data.materials.append(tab_amber_mat if c_idx == 0 else wave_cyan_mat)
        link_child(chip)

        chip.keyframe_insert(data_path="scale", frame=max(1, beat10_frame - 4))
        chip.scale = (0.092, 0.016, 0.040)
        chip.keyframe_insert(data_path="scale", frame=beat10_frame + 6 + c_idx * 8)
        chip.scale = (0.080, 0.012, 0.032)
        chip.keyframe_insert(data_path="scale", frame=min(total_frames, beat10_frame + 48))
        smooth_object_fcurves(chip)

    # Save reusable Holo Console asset library for blender/assets/
    holo_objs = [o for o in bpy.data.objects if "Holo" in o.name or "Verilog" in o.name or "StudentHub" in o.name]
    if holo_objs:
        bpy.data.libraries.write(os.path.join(assets_dir, "nemofy_holo_console.blend"), set(holo_objs))


def build_reel_scene(timings_json: str, output_blend: str, inspection_json: str):
    with open(timings_json, "r", encoding="utf-8") as f:
        timings = json.load(f)

    scene = clear_default_blender_scene()
    fps = int(timings["fps"])
    width = int(timings["width"])
    height = int(timings["height"])
    total_frames = int(timings["totalFrames"])
    beats = timings["beats"]

    scene.render.fps = fps
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.frame_start = 1
    scene.frame_end = total_frames
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 94

    select_best_render_engine(scene, "EEVEE")

    # 1. Core midnight rooftop window studio
    build_detailed_environment(scene, "agent-command-desk", total_frames)

    beat7_frame = next((b["startFrame"] for b in beats if b["id"] == 7), 450)
    beat9_frame = next((b["startFrame"] for b in beats if b["id"] == 9), 580)
    beat10_frame = next((b["startFrame"] for b in beats if b["id"] == 10), 700)

    # 2. Overheating laptop prop (Beats 1-6) + Nemofy StudentHub Verilog Holo Console (Beats 7-13)
    add_overheating_laptop_prop(scene, beat7_frame)
    assets_dir = os.path.join(os.path.dirname(os.path.abspath(output_blend)), "assets")
    add_nemofy_studenthub_holo_console(scene, beat7_frame, beat9_frame, beat10_frame, total_frames, assets_dir)

    # 3. Preserve existing Leo_Rig and Nemo_Rig character designs cleanly
    leo_rig = import_or_build_character({
        "id": "char-leo",
        "name": "Leo",
        "archetype": "scholar-humanoid",
        "primaryColor": "#3B5BDB",
    })
    nemo_rig = import_or_build_character({
        "id": "char-nemo",
        "name": "Nemo",
        "archetype": "robot-companion",
        "primaryColor": "#D96043",
    })

    # Convert beat_timings.json entries to shot manifests expected by animate_character + configure_camera
    shots = []
    for b in beats:
        shots.append({
            "id": f"beat-{b['id']:02d}",
            "startFrame": b["startFrame"],
            "endFrame": b["endFrame"],
            "durationSeconds": b["durationSeconds"],
            "cameraMovement": b["camera"],
            "dialogueSpeaker": b["speaker"],
            "speakerAction": b["speakerAction"],
            "listenerAction": b["listenerAction"],
            "emotion": b["emotion"],
            "narrationText": b["ttsText"],
            "lipSyncEnvelope": b["lipSyncEnvelope"],
            "characterStaging": {
                "char-leo": {"x": -0.45, "y": 0.0},
                "char-nemo": {"x": 0.45, "y": 0.0},
            },
        })

    author_character_timeline_performance(
        leo_rig,
        "char-leo",
        [s["characterStaging"]["char-nemo"] for s in shots],
        shots,
        fps,
    )
    author_character_timeline_performance(
        nemo_rig,
        "char-nemo",
        [s["characterStaging"]["char-leo"] for s in shots],
        shots,
        fps,
    )

    # Keep Nemo's lively hop & squash-stretch snugly connected to his 4 stubby legs
    if nemo_rig.animation_data and nemo_rig.animation_data.action:
        for fc in nemo_rig.animation_data.action.fcurves:
            if fc.data_path == 'pose.bones["hips"].location' and fc.array_index == 1:
                for kp in fc.keyframe_points:
                    kp.co.y *= 0.42
                    kp.handle_left.y *= 0.42
                    kp.handle_right.y *= 0.42
                fc.update()

    # 4. Configure 13 shot cameras locked via TRACK_TO empties
    rigs_by_id = {"char-leo": leo_rig, "char-nemo": nemo_rig}
    configure_shot_cameras(scene, shots, "9:16", rigs_by_id)

    # 5. Three-point cinematic lighting & Filmic lookdev
    configure_scene_lighting_and_lookdev(scene, "golden-hour", 1.25, "final")

    # 6. Save .blend project + run automated inspection
    os.makedirs(os.path.dirname(os.path.abspath(output_blend)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(output_blend))

    report = inspect_current_blender_scene()
    report["savedBlendPath"] = os.path.abspath(output_blend)
    with open(inspection_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("NEMOFY_REEL_SCENE_VALID =", report["valid"])
    print("NEMOFY_REEL_BLEND_SAVED =", output_blend)
    if not report["valid"]:
        raise RuntimeError(f"Scene inspection failed: {json.dumps(report, indent=2)}")


if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Usage: blender -b -P build_reel.py -- <beat_timings.json> <output.blend> <inspection.json>")
    args = argv[argv.index("--") + 1 :]
    build_reel_scene(args[0], args[1], args[2])
