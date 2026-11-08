"""
AetherFrame 3D — Cinematography, Lens Selection, Depth of Field & Shot Camera Switching
(scripts/blender/configure_camera.py)

Configures physical Blender cameras (28mm-85mm lenses on a 36mm full-frame sensor),
aspect-ratio-aware framing (especially 9:16 vertical 1080x1920), Depth of Field,
smooth Bezier camera choreography (Establishing Wide, OTS, Close-Up, Dolly, Tracking, Orbit),
and timeline marker camera binding so multi-shot sequences cut cleanly inside a single .blend.
"""

import math
import bpy
import mathutils


SHOT_LENS_DEFAULTS = {
    "establishing-wide": (28.0, 5.6),
    "dolly-in":          (40.0, 4.0),
    "dolly-out":         (35.0, 4.5),
    "tracking":          (45.0, 3.5),
    "orbit":             (38.0, 4.0),
    "crane-up":          (32.0, 4.8),
    "close-up":          (70.0, 2.4),
    "crash-zoom":        (52.0, 2.8),
    "shot-reverse-shot": (48.0, 3.2),
    "static":            (50.0, 4.0),
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
    Creates a dedicated physical Blender Camera per shot, binds it to a timeline marker
    at shot['startFrame'], configures lens focal length, 9:16 vertical framing adjustments,
    Depth of Field, and smooth Bezier camera movement across the shot.
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

        lens_mm, fstop = SHOT_LENS_DEFAULTS.get(move_type, (40.0, 4.0))
        cam_data.sensor_width = 36.0
        # For 9:16 vertical (1080x1920), fit sensor horizontally and slightly widen lens
        # so both Nemo & Leo fit comfortably inside the vertical frame without edge clipping.
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

        # Configure Depth of Field
        cam_data.dof.use_dof = True
        cam_data.dof.aperture_fstop = fstop

        # Determine start/end camera positions and look-at target in Blender world space
        # (Leo at X = -0.42, Nemo at X = +0.42, Y = 0.0, Z in [0.0, 1.42], facing -Y)
        speaker_x = 0.42 if "nemo" in speaker_name else -0.42
        dist_mult = 1.05 if is_vertical else 0.88

        if move_type == "establishing-wide":
            pos_start = mathutils.Vector((-0.08, -2.55 * dist_mult, 0.96))
            pos_end   = mathutils.Vector(( 0.06, -2.30 * dist_mult, 0.94))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.88))
            tgt_end   = mathutils.Vector(( 0.0, 0.0, 0.90))
        elif move_type in ("close-up", "crash-zoom"):
            # Tight @agentmorphy 3/4 Close-Up on active speaker while keeping partner's shoulder in frame
            pos_start = mathutils.Vector((speaker_x * 0.42, -2.15 * dist_mult, 0.96))
            pos_end   = mathutils.Vector((speaker_x * 0.55, -1.78 * dist_mult, 0.94))
            tgt_start = mathutils.Vector((speaker_x * 0.45, 0.0, 0.88))
            tgt_end   = mathutils.Vector((speaker_x * 0.58, 0.0, 0.90))
        elif move_type in ("tracking", "shot-reverse-shot"):
            pos_start = mathutils.Vector((-0.38, -2.20 * dist_mult, 0.95))
            pos_end   = mathutils.Vector(( 0.38, -2.15 * dist_mult, 0.95))
            tgt_start = mathutils.Vector((-0.14, 0.0, 0.88))
            tgt_end   = mathutils.Vector(( 0.14, 0.0, 0.90))
        elif move_type == "orbit":
            pos_start = mathutils.Vector(( 0.45, -2.35 * dist_mult, 0.98))
            pos_end   = mathutils.Vector((-0.42, -2.25 * dist_mult, 0.98))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.88))
            tgt_end   = mathutils.Vector(( 0.0, 0.0, 0.90))
        elif move_type == "dolly-in":
            pos_start = mathutils.Vector(( 0.0, -2.50 * dist_mult, 0.96))
            pos_end   = mathutils.Vector((speaker_x * 0.40, -1.95 * dist_mult, 0.94))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.88))
            tgt_end   = mathutils.Vector((speaker_x * 0.45, 0.0, 0.90))
        else:
            pos_start = mathutils.Vector(( 0.0, -2.35 * dist_mult, 0.95))
            pos_end   = mathutils.Vector(( 0.10, -2.20 * dist_mult, 0.95))
            tgt_start = mathutils.Vector(( 0.0, 0.0, 0.88))
            tgt_end   = mathutils.Vector(( 0.0, 0.0, 0.90))

        # Keyframe start, midpoint, and end of shot camera motion
        f_mid = (f_start + f_end) // 2
        pos_mid = pos_start.lerp(pos_end, 0.5)
        tgt_mid = tgt_start.lerp(tgt_end, 0.5)

        for frame_pt, pos_vec, tgt_vec in [
            (f_start, pos_start, tgt_start),
            (f_mid, pos_mid, tgt_mid),
            (f_end - 1, pos_end, tgt_end),
        ]:
            cam_obj.location = pos_vec
            _aim_camera_at_target(cam_obj, tgt_vec)
            cam_obj.keyframe_insert(data_path="location", frame=frame_pt)
            cam_obj.keyframe_insert(data_path="rotation_euler", frame=frame_pt)

            cam_data.dof.focus_distance = (pos_vec - tgt_vec).length
            cam_data.dof.keyframe_insert(data_path="focus_distance", frame=frame_pt)

        if cam_obj.animation_data and cam_obj.animation_data.action:
            for fc in cam_obj.animation_data.action.fcurves:
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
