"""
AetherFrame 3D — Authoritative Blender Final Sequence Renderer
(scripts/blender/render_final.py)

Renders the approved .blend timeline with shot-marker camera switching, Screen-Space
Cavity ridge/valley shading, Specular Studio lighting, and FXAA anti-aliasing for
crisp, stutter-free 30 FPS output.
"""

import os
import sys
import shutil
import bpy


def configure_vibrant_studio_shading(scene: bpy.types.Scene, is_software_gl: bool, quality_preset: str):
    if scene.world:
        scene.world.color = (0.032, 0.048, 0.125)

    for mat in bpy.data.materials:
        if mat.use_nodes and mat.node_tree:
            for n in mat.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    raw = list(n.inputs["Base Color"].default_value[:])
                    ecol = (
                        list(n.inputs["Emission"].default_value[:])
                        if "Emission" in n.inputs
                        else [0, 0, 0, 1]
                    )
                    if (ecol[0] + ecol[1] + ecol[2]) > 0.05:
                        col = [
                            min(1.0, pow(max(0.0, ecol[0]), 0.62) * 1.38),
                            min(1.0, pow(max(0.0, ecol[1]), 0.62) * 1.38),
                            min(1.0, pow(max(0.0, ecol[2]), 0.62) * 1.38),
                            1.0,
                        ]
                        mat.roughness = 0.15
                    else:
                        col = [
                            min(1.0, pow(max(0.0, raw[0]), 0.60) * 1.22),
                            min(1.0, pow(max(0.0, raw[1]), 0.60) * 1.22),
                            min(1.0, pow(max(0.0, raw[2]), 0.60) * 1.22),
                            1.0,
                        ]
                        mat.roughness = max(0.30, n.inputs["Roughness"].default_value * 0.78)

                    if "Leo_Skin" in mat.name:
                        col = [0.95, 0.72, 0.58, 1.0]
                    elif "Nemo_CoralBody" in mat.name:
                        col = [0.91, 0.42, 0.29, 1.0]
                    elif "Nemo_CoralWarmSide" in mat.name:
                        col = [0.96, 0.54, 0.39, 1.0]
                    elif "Nemo_CoralLimb" in mat.name:
                        col = [0.80, 0.34, 0.22, 1.0]
                    elif "Leo_CobaltHoodie" in mat.name:
                        col = [0.24, 0.39, 0.90, 1.0]
                    elif "WindowSill" in mat.name:
                        col = [0.18, 0.22, 0.34, 1.0]
                    elif "WindowFrame" in mat.name:
                        col = [0.09, 0.12, 0.20, 1.0]

                    mat.diffuse_color = col
                    mat.metallic = min(0.22, n.inputs["Metallic"].default_value)

    if is_software_gl:
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.render.resolution_percentage = 62 if quality_preset == "draft" else 75
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.color_type = "MATERIAL"
        shading.show_specular_highlight = True
        shading.show_cavity = True
        shading.cavity_type = "SCREEN"
        shading.curvature_ridge_factor = 0.88
        shading.curvature_valley_factor = 0.76
        shading.show_shadows = False
        scene.display.render_aa = "FXAA"
        try:
            scene.view_settings.view_transform = "Standard"
            scene.view_settings.look = "Medium High Contrast"
            scene.view_settings.exposure = 0.10
        except Exception:
            pass
    else:
        scene.render.resolution_percentage = 100


def render_full_sequence(
    frames_dir: str,
    start_frame: int = None,
    end_frame: int = None,
    quality_preset: str = "final",
):
    scene = bpy.context.scene
    os.makedirs(frames_dir, exist_ok=True)

    f_start = int(start_frame) if start_frame is not None else scene.frame_start
    f_end = int(end_frame) if end_frame is not None else scene.frame_end
    total_frames = max(1, scene.frame_end - scene.frame_start + 1)

    is_software_gl = os.environ.get("LIBGL_ALWAYS_SOFTWARE") == "1"
    configure_vibrant_studio_shading(scene, is_software_gl, quality_preset)

    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 94

    markers_sorted = sorted(scene.timeline_markers, key=lambda m: m.frame)

    # Render every 3rd frame on software GL (10 native 3D poses/sec), which two-pass FFmpeg tblend
    # smoothly interpolates (1.00A -> 0.75A+0.25B -> 0.25A+0.75B -> 1.00B) to 30 unique frames/sec with zero stutters
    step_size = 3 if (is_software_gl and quality_preset == "draft") else 1

    frame = f_start
    while frame <= f_end:
        scene.frame_set(frame)
        for marker in markers_sorted:
            if marker.frame <= frame and marker.camera:
                scene.camera = marker.camera

        seq_index = frame - scene.frame_start + 1
        out_file = os.path.join(frames_dir, f"frame_{seq_index:05d}.jpg")
        scene.render.filepath = out_file
        bpy.ops.render.render(write_still=True)

        for dup_offset in range(1, step_size):
            dup_frame = frame + dup_offset
            if dup_frame <= f_end:
                dup_seq = dup_frame - scene.frame_start + 1
                dup_file = os.path.join(frames_dir, f"frame_{dup_seq:05d}.jpg")
                shutil.copy2(out_file, dup_file)

        done_seq = min(total_frames, seq_index + step_size - 1)
        print(
            f"AETHERFRAME_PROGRESS frame={done_seq} total={total_frames} blender_frame={frame}",
            flush=True,
        )
        frame += step_size

    print("AETHERFRAME_RENDER_SEQUENCE_COMPLETE", flush=True)


if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError(
            "Usage: blender -b <project.blend> -P render_final.py -- <frames_dir> [start_frame] [end_frame] [preset]"
        )
    args = argv[argv.index("--") + 1 :]
    out_frames_dir = args[0]
    f_s = int(args[1]) if len(args) >= 2 else None
    f_e = int(args[2]) if len(args) >= 3 else None
    preset = args[3] if len(args) >= 4 else "final"
    render_full_sequence(out_frames_dir, f_s, f_e, preset)
