"""
AetherFrame 3D — Cinematography, Lens Selection, Depth of Field & Shot Camera Switching
(scripts/blender/configure_camera.py)

Configures physical Blender cameras (28mm-70mm lenses on a 36mm full-frame sensor),
aspect-ratio-aware framing (especially 9:16 vertical 1080x1920), Depth of Field,
rock-steady TRACK_TO Empty camera choreography (eliminating Euler interpolation drift),
and timeline marker camera binding so multi-shot sequences cut cleanly inside a single .blend.
"""

import math
import bpy
import mathutils


SHOT_LENS_DEFAULTS = {
    "establishing-wide": (32.0, 5.6),
    "dolly-in":          (38.0, 4.0),
    "dolly-out":         (35.0, 4.5),
    "tracking":          (40.0, 3.8),
    "orbit":             (36.0, 4.0),
    "crane-up":          (32.0, 4.8),
    "close-up":          (52.0, 2.8),
    "crash-zoom":        (48.0, 2.8),
    "shot-reverse-shot": (34.0, 4.5),
    "static":            (40.0, 4.0),
}


def _aim_camera_at_target(cam_obj: bpy.types.Object, target_vec: mathutils.Vector):
    direction = target_vec - cam_obj.location
    rot_quat = direction.to_track_quat("-Z", "Y")
    cam_obj.rotation_euler = rot_quat.to_euler("XYZ")


def configure_shot_cameras(
    scene: bpy.types.Scene,
    shots: list,
    aspect_ratio: str,
    character_rigs: dict,
):
    """
    Creates a dedicated physical Blender Camera per shot with a dedicated TRACK_TO Empty target,
    binds it to a timeline marker at shot['startFrame'], configures lens focal length,
    9:16 vertical framing adjustments, Depth of Field, and smooth Bezier camera movement.
    """
    scene.timeline_markers.clear()
    is_vertical = aspect_ratio == "9:16"
    is_square = aspect_ratio == "1:1"

    created_cameras = []

    for idx, shot in enumerate(shots):
        f_start = int(shot["startFrame"])
        f_end = int(shot["endFrame"])
        move_type = str(shot.get("cameraMovement", "establishing-wide"))
        speaker_name = str(shot.get("dialogueSpeaker", "")).lower()

        cam_data = bpy.data.cameras.new(name=f"ShotCam_{idx + 1:02d}_Data")
        cam_obj = bpy.data.objects.new(name=f"ShotCam_{idx + 1:02d}", object_data=cam_data)
        scene.collection.objects.link(cam_obj)

        # Create dedicated Look-At Target Empty so camera gaze is 100% locked with zero Euler wobble
        tgt_empty = bpy.data.objects.new(name=f"ShotCamTarget_{idx + 1:02d}", object_data=None)
        tgt_empty.empty_display_size = 0.15
        scene.collection.objects.link(tgt_empty)

        lens_mm, fstop = SHOT_LENS_DEFAULTS.get(move_type, (38.0, 4.0))
        cam_data.sensor_width = 36.0
        if is_vertical:
            cam_data.sensor_fit = "HORIZONTAL"
            cam_data.lens = lens_mm * 0.78
        elif is_square:
            cam_data.sensor_fit = "HORIZONTAL"
            cam_data.lens = lens_mm * 0.88
        else:
            cam_data.sensor_fit = "AUTO"
            cam_data.lens = lens_mm

        cam_data.clip_start = 0.1
        cam_data.clip_end = 250.0

        # Configure Depth of Field focused on target Empty
        cam_data.dof.use_dof = True
        cam_data.dof.aperture_fstop = fstop
        cam_data.dof.focus_object = tgt_empty

        # Determine start/end camera positions and look-at target in Blender world space
        # (Leo at X = -0.38, Nemo at X = +0.38, Y = 0.0, Z in [0.0, 1.42], facing -Y)
        speaker_x = 0.38 if "nemo" in speaker_name else -0.38
        dist_mult = 1.04 if is_vertical else 0.88

        if move_type == "establishing-wide":
            # Balanced @agentmorphy 2-shot framing both Leo (left) and Nemo (right) prominently on the window ledge
            pos_start = mathutils.Vector((0.0, -2.02 * dist_mult, 0.78))
            pos_end   = mathutils.Vector((0.0, -1.88 * dist_mult, 0.77))
            tgt_start = mathutils.Vector((0.0, 0.0, 0.72))
            tgt_end   = mathutils.Vector((0.0, 0.0, 0.73))
        elif move_type in ("close-up", "crash-zoom"):
            # Clean @agentmorphy Medium Close-Up favoring the active speaker while keeping the partner cleanly visible
            focus_x = 0.16 if "nemo" in speaker_name else -0.16
            focus_z = 0.66 if "nemo" in speaker_name else 0.76
            pos_start = mathutils.Vector((focus_x * 0.80, -1.82 * dist_mult, focus_z + 0.06))
            pos_end   = mathutils.Vector((focus_x * 0.90, -1.70 * dist_mult, focus_z + 0.05))
            tgt_start = mathutils.Vector((focus_x, 0.0, focus_z))
            tgt_end   = mathutils.Vector((focus_x, 0.0, focus_z))
        elif move_type in ("tracking", "shot-reverse-shot"):
            # Steady Two-Shot Payoff framing both characters prominently on the window ledge
            pos_start = mathutils.Vector((-0.03, -1.92 * dist_mult, 0.77))
            pos_end   = mathutils.Vector(( 0.03, -2.00 * dist_mult, 0.78))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.72))
            tgt_end   = mathutils.Vector(( 0.0, 0.0, 0.73))
        elif move_type == "orbit":
            pos_start = mathutils.Vector(( 0.24, -2.00 * dist_mult, 0.80))
            pos_end   = mathutils.Vector((-0.24, -1.96 * dist_mult, 0.80))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.73))
            tgt_end   = mathutils.Vector(( 0.0, 0.0, 0.73))
        elif move_type == "dolly-in":
            pos_start = mathutils.Vector((0.0, -2.05 * dist_mult, 0.79))
            pos_end   = mathutils.Vector((speaker_x * 0.35, -1.76 * dist_mult, 0.75))
            tgt_start = mathutils.Vector((0.0, 0.0, 0.73))
            tgt_end   = mathutils.Vector((speaker_x * 0.38, 0.0, 0.73))
        else:
            pos_start = mathutils.Vector((0.0, -1.98 * dist_mult, 0.78))
            pos_end   = mathutils.Vector((0.0, -1.88 * dist_mult, 0.78))
            tgt_start = mathutils.Vector((0.0, 0.0, 0.73))
            tgt_end   = mathutils.Vector((0.0, 0.0, 0.73))

        for frame_pt, pos_vec, tgt_vec in [
            (f_start, pos_start, tgt_start),
            (f_end - 1, pos_end, tgt_end),
        ]:
            cam_obj.location = pos_vec
            tgt_empty.location = tgt_vec
            _aim_camera_at_target(cam_obj, tgt_vec)
            cam_obj.keyframe_insert(data_path="location", frame=frame_pt)
            cam_obj.keyframe_insert(data_path="rotation_euler", frame=frame_pt)
            tgt_empty.keyframe_insert(data_path="location", frame=frame_pt)

            cam_data.dof.focus_distance = (pos_vec - tgt_vec).length
            cam_data.dof.keyframe_insert(data_path="focus_distance", frame=frame_pt)

        # Attach TRACK_TO constraint so camera stays locked on tgt_empty at every frame
        track_con = cam_obj.constraints.new(type="TRACK_TO")
        track_con.target = tgt_empty
        track_con.track_axis = "TRACK_NEGATIVE_Z"
        track_con.up_axis = "UP_Y"

        for obj in (cam_obj, tgt_empty):
            if obj.animation_data and obj.animation_data.action:
                for fc in obj.animation_data.action.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "BEZIER"
                        kp.handle_left_type = "AUTO_CLAMPED"
                        kp.handle_right_type = "AUTO_CLAMPED"
                    fc.update()

        # Bind camera to timeline marker at shot boundary
        marker = scene.timeline_markers.new(name=f"Shot_{idx + 1:02d}", frame=f_start)
        marker.camera = cam_obj
        if idx == 0:
            scene.camera = cam_obj

        created_cameras.append(cam_obj)

    return created_cameras
