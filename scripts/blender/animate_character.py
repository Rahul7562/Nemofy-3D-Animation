"""
AetherFrame 3D — Character Performance, Acting & Phoneme-to-Viseme Lip-Sync Engine
(scripts/blender/animate_character.py)

Authors keyframed Blender Actions with AUTO_CLAMPED Bezier F-curves for:
1. Phoneme-to-Viseme Lip-Sync (Preston Blair / ARKit visemes: SIL, MBP, FV, TH, L_NT, EE, IH, AA, OH, OU)
   with 2-frame visual lead and mandatory bilabial closure on M/B/P.
2. Mutual Character Acting & Reaction (Speaker vs. Listener gaze, head orientation, nods, and brow reactions).
3. Phrased Gesture Choreography (Anticipation -> Arc -> Moving Hold -> Follow-Through) with staggered overlapping action.
4. Natural Asymmetric 5-Frame Eye Blinks.
"""

import re
import math
import bpy


# Canonical Viseme Targets: (jaw_drop_z, lip_lower_z, mouth_wide_scale_x, brow_lift_z)
VISEME_TARGETS = {
    "SIL":  ( 0.000,  0.000, 1.00, 0.000),
    "MBP":  ( 0.002,  0.004, 0.92, 0.003),  # Bilabial pressed closed (M, B, P)
    "FV":   (-0.008, -0.006, 1.02, 0.005),  # Lower lip tucked under upper teeth
    "TH":   (-0.014, -0.012, 1.05, 0.006),  # Dental slight open
    "L_NT": (-0.018, -0.015, 1.08, 0.007),  # Alveolar medium narrow
    "EE":   (-0.020, -0.016, 1.28, 0.010),  # Wide front vowel (corners pulled wide)
    "IH":   (-0.026, -0.022, 1.15, 0.010),  # Relaxed mid vowel
    "AA":   (-0.042, -0.036, 1.12, 0.016),  # Wide open jaw drop (A, AH)
    "OH":   (-0.036, -0.030, 0.78, 0.014),  # Rounded open O
    "OU":   (-0.018, -0.014, 0.68, 0.008),  # Tight pursed U/W
}


def word_to_viseme_sequence(word: str) -> list:
    """
    Decomposes an English/multilingual word into a sequence of canonical visemes
    based on grapheme-to-phoneme rules rather than simple amplitude.
    """
    clean = re.sub(r"[^a-zA-Z]", "", word).lower()
    if not clean:
        return ["SIL"]

    visemes = []
    i = 0
    n = len(clean)
    while i < n:
        two = clean[i : i + 2]
        ch = clean[i]

        if two in ("oo", "ou", "ow", "ew"):
            visemes.append("OU")
            i += 2
        elif two in ("ee", "ea", "ie", "ey"):
            visemes.append("EE")
            i += 2
        elif two in ("oa", "or", "aw", "au"):
            visemes.append("OH")
            i += 2
        elif two in ("ar", "ay", "ai", "ah"):
            visemes.append("AA")
            i += 2
        elif two == "th":
            visemes.append("TH")
            i += 2
        elif two == "ph":
            visemes.append("FV")
            i += 2
        elif ch in ("m", "b", "p"):
            visemes.append("MBP")
            i += 1
        elif ch in ("f", "v"):
            visemes.append("FV")
            i += 1
        elif ch in ("w", "u", "q"):
            visemes.append("OU")
            i += 1
        elif ch == "o":
            visemes.append("OH")
            i += 1
        elif ch == "a":
            visemes.append("AA")
            i += 1
        elif ch == "e":
            if i == n - 1 and len(visemes) > 0:
                i += 1
                continue
            visemes.append("IH")
            i += 1
        elif ch in ("i", "y"):
            visemes.append("EE")
            i += 1
        elif ch in ("l", "n", "t", "d", "s", "z", "r", "k", "g", "c", "j", "h"):
            visemes.append("L_NT")
            i += 1
        else:
            i += 1

    compact = []
    for v in visemes:
        if not compact or compact[-1] != v:
            compact.append(v)

    return compact[:4] if compact else ["IH"]


def generate_dialogue_viseme_timeline(
    narration_text: str,
    shot_start_frame: int,
    shot_duration_frames: int,
    fps: int,
    lip_sync_envelope: list = None,
) -> list:
    """
    Produces a list of (frame, viseme_name, energy_multiplier) tuples across a shot,
    incorporating 2-frame visual anticipation lead and optional WAV envelope modulation.
    """
    words = [w for w in narration_text.strip().split() if w]
    if not words:
        return [(shot_start_frame, "SIL", 0.0), (shot_start_frame + shot_duration_frames, "SIL", 0.0)]

    lead_in_frames = min(6, max(2, int(fps * 0.14)))
    tail_out_frames = min(8, max(3, int(fps * 0.20)))
    active_span = max(10, shot_duration_frames - lead_in_frames - tail_out_frames)

    weights = []
    for w in words:
        base_w = max(2.0, float(len(w)))
        if w.endswith((",", ";", ":")):
            base_w += 2.2
        elif w.endswith((".", "!", "?", "—")):
            base_w += 3.5
        weights.append(base_w)

    total_weight = sum(weights) or 1.0
    events = [(shot_start_frame, "SIL", 0.0)]

    cursor = float(shot_start_frame + lead_in_frames)
    for w, weight in zip(words, weights):
        word_frames = max(3.0, (weight / total_weight) * active_span)
        visemes = word_to_viseme_sequence(w)
        pause_ratio = 0.22 if w.endswith((".", "!", "?", ",")) else 0.08
        speak_frames = word_frames * (1.0 - pause_ratio)
        step = speak_frames / max(1, len(visemes))

        for idx, vis in enumerate(visemes):
            f = int(round(cursor + idx * step - 1.5))
            f = max(shot_start_frame + 1, min(shot_start_frame + shot_duration_frames - 2, f))
            energy = 1.20 if ("!" in w or "?" in w) else 1.0
            if lip_sync_envelope:
                env_idx = min(len(lip_sync_envelope) - 1, max(0, f - shot_start_frame))
                env_pt = lip_sync_envelope[env_idx]
                if isinstance(env_pt, dict):
                    energy *= 0.70 + 0.50 * float(env_pt.get("openness", 0.75))
            events.append((f, vis, energy))

        end_word_f = int(round(cursor + speak_frames))
        if w.endswith((".", "!", "?", ",")):
            events.append((end_word_f, "SIL", 0.0))

        cursor += word_frames

    events.append((shot_start_frame + shot_duration_frames - 2, "SIL", 0.0))
    return events


def _keyframe_bone_rot(arm_obj, bone_name: str, frame: int, rx: float, ry: float, rz: float):
    if bone_name not in arm_obj.pose.bones:
        return
    pb = arm_obj.pose.bones[bone_name]
    pb.rotation_euler = (rx, ry, rz)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def _keyframe_bone_loc(arm_obj, bone_name: str, frame: int, lx: float, ly: float, lz: float):
    if bone_name not in arm_obj.pose.bones:
        return
    pb = arm_obj.pose.bones[bone_name]
    pb.location = (lx, ly, lz)
    pb.keyframe_insert(data_path="location", frame=frame)


def _keyframe_bone_scale(arm_obj, bone_name: str, frame: int, sx: float, sy: float, sz: float):
    if bone_name not in arm_obj.pose.bones:
        return
    pb = arm_obj.pose.bones[bone_name]
    pb.scale = (sx, sy, sz)
    pb.keyframe_insert(data_path="scale", frame=frame)


def _smooth_all_fcurves(arm_obj):
    if not arm_obj.animation_data or not arm_obj.animation_data.action:
        return
    for fc in arm_obj.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = "AUTO_CLAMPED"
            kp.handle_right_type = "AUTO_CLAMPED"
        fc.update()


def author_character_timeline_performance(
    arm_obj: bpy.types.Object,
    char_id: str,
    partner_pos_by_shot: list,
    shots: list,
    fps: int,
):
    """
    Authors a complete, continuous, multi-shot skeletal & facial Action on arm_obj:
    - Places the character accurately on stage per shot with feet planted at Z=0.0.
    - Orients body 3/4 toward camera & partner (staging rule).
    - Authors phrase-driven arm/hand gestures, weight shifts, and contrapposto spine arcs when speaking.
    - Authors active listening head-turns, eye gaze, brow reactions, and agreement nods when listening.
    - Authors phoneme-to-viseme jaw & lip keyframes synchronized to dialogue.
    - Schedules natural 5-frame asymmetric eye blinks.
    """
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    action = bpy.data.actions.new(name=f"{arm_obj.name}_PerformanceAction")
    arm_obj.animation_data.action = action

    is_nemo = "nemo" in char_id.lower() or "nemo" in arm_obj.name.lower()

    for shot_idx, shot in enumerate(shots):
        f_start = int(shot["startFrame"])
        f_end = int(shot["endFrame"])
        dur = max(10, f_end - f_start)

        my_stage = shot.get("characterStaging", {}).get(char_id, {})
        stage_x = float(my_stage.get("x", 0.56 if is_nemo else -0.56))
        stage_y = float(my_stage.get("y", 0.0))
        partner_x = float(partner_pos_by_shot[shot_idx].get("x", -stage_x))

        # 3/4 Turn Angle: Leo (at X = -0.56) angles slightly right (-0.30 rad Z);
        # Nemo (at X = +0.56) angles slightly left (+0.30 rad Z) so they face each other & camera.
        dx_to_partner = partner_x - stage_x
        base_yaw = -0.28 if dx_to_partner > 0 else 0.28

        speaker_name = str(shot.get("dialogueSpeaker", "")).lower()
        is_speaking = ("nemo" in speaker_name and is_nemo) or ("leo" in speaker_name and not is_nemo)
        emotion = str(shot.get("emotion", "curious" if not is_nemo else "excited")).lower()

        arm_obj.location = (stage_x, stage_y, 0.0)
        arm_obj.rotation_euler = (0.0, 0.0, base_yaw)
        arm_obj.keyframe_insert(data_path="location", frame=f_start)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_start)
        arm_obj.keyframe_insert(data_path="location", frame=f_end - 1)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_end - 1)

        f_ant = min(f_end - 2, f_start + 5)
        f_b1 = f_start + int(dur * 0.30)
        f_b2 = f_start + int(dur * 0.66)
        f_settle = max(f_start + 2, f_end - 4)

        # In Blender Z-up bone space for vertical spine/head bones:
        # rx = pitch (nod), ry = Y-axis twist (head/chest turn left/right!), rz = side tilt
        # In Blender downward-pointing arm bones (upper_arm, forearm):
        # rx > 0 lifts the arm/forearm FORWARD toward -Y (camera)!
        # rz flares the arm outward/inward!
        turn_dir = -1.0 if dx_to_partner > 0 else 1.0

        if is_speaking:
            # --- SPEAKER PERFORMANCE: Weight Transfer, Spine Arc, Expressive Forward Gestures ---
            _keyframe_bone_loc(arm_obj, "hips", f_start, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_start, 0.0, 0.0, 0.0)

            _keyframe_bone_loc(arm_obj, "hips", f_ant, -0.015 * turn_dir, 0.01, -0.012)
            _keyframe_bone_rot(arm_obj, "hips", f_ant, 0.03, -0.04 * turn_dir, 0.03 * turn_dir)

            _keyframe_bone_loc(arm_obj, "hips", f_b1, 0.025 * turn_dir, -0.02, 0.008)
            _keyframe_bone_rot(arm_obj, "hips", f_b1, -0.02, 0.08 * turn_dir, -0.04 * turn_dir)

            _keyframe_bone_loc(arm_obj, "hips", f_b2, 0.018 * turn_dir, -0.015, 0.004)
            _keyframe_bone_rot(arm_obj, "hips", f_b2, 0.01, 0.05 * turn_dir, -0.02 * turn_dir)

            _keyframe_bone_loc(arm_obj, "hips", f_settle, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_settle, 0.0, 0.0, 0.0)

            # Staggered Spine & Chest (+2f and +4f overlap; ry is axial twist toward partner)
            for f_base, pitch, twist_y, tilt_z in [
                (f_start, 0.02, 0.0, 0.0),
                (f_ant + 2, 0.05, -0.05 * turn_dir, -0.03 * turn_dir),
                (f_b1 + 2, -0.04, 0.14 * turn_dir, 0.04 * turn_dir),
                (f_b2 + 2, -0.02, 0.09 * turn_dir, -0.03 * turn_dir),
                (f_settle, 0.01, 0.03 * turn_dir, 0.0),
            ]:
                fc_clamped = min(f_end - 1, f_base)
                _keyframe_bone_rot(arm_obj, "spine", fc_clamped, pitch * 0.5, twist_y * 0.5, tilt_z * 0.5)
                _keyframe_bone_rot(arm_obj, "chest", min(f_end - 1, fc_clamped + 2), pitch, twist_y, tilt_z)

            # Head & Neck (ry twists head to look at partner; rx nods; rz tilts head expressively)
            for f_base, h_pitch, h_twist_y, h_tilt_z in [
                (f_start, 0.0, 0.12 * turn_dir, 0.0),
                (f_ant + 3, 0.07, 0.08 * turn_dir, -0.05 * turn_dir),
                (f_b1 + 4, -0.06, 0.26 * turn_dir, 0.08 * turn_dir),
                (f_b2 + 4, -0.03, 0.18 * turn_dir, -0.07 * turn_dir),
                (f_settle, 0.01, 0.15 * turn_dir, 0.02 * turn_dir),
            ]:
                fc_clamped = min(f_end - 1, f_base)
                _keyframe_bone_rot(arm_obj, "neck", fc_clamped, h_pitch * 0.35, h_twist_y * 0.4, h_tilt_z * 0.35)
                _keyframe_bone_rot(arm_obj, "head", min(f_end - 1, fc_clamped + 2), h_pitch, h_twist_y, h_tilt_z)

            # Expressive Forward-Lifting Arm & Forearm Gestures (rx < 0 swings downward arm bone FORWARD toward camera -Y!)
            for f_base, ua_l, fa_l, h_l, ua_r, fa_r, h_r in [
                # Relaxed conversational ready pose (forearms bent slightly forward in front of torso)
                (f_start, (-0.16, 0.0, -0.06), (-0.42, 0.0, 0.08), (-0.05, 0.0, 0.0), (-0.16, 0.0, 0.06), (-0.42, 0.0, -0.08), (-0.05, 0.0, 0.0)),
                # Anticipation gather inward
                (f_ant + 2, (-0.26, 0.0, -0.10), (-0.72, 0.0, 0.15), (-0.10, 0.0, 0.0), (-0.24, 0.0, 0.10), (-0.68, 0.0, -0.15), (-0.10, 0.0, 0.0)),
                # Beat 1 Open Gesture Arc (Lead arm lifts forward & outward toward partner)
                (f_b1 + 3, (-0.58, 0.18, -0.20), (-0.96, 0.20, 0.18), (-0.16, 0.12, 0.0), (-0.32, -0.08, 0.12), (-0.60, -0.12, -0.12), (-0.08, -0.08, 0.0)),
                # Beat 2 Counter-Phrase Gesture (Opposite arm arcs up forward)
                (f_b2 + 3, (-0.32, 0.10, -0.12), (-0.58, 0.10, 0.12), (-0.08, 0.06, 0.0), (-0.62, -0.20, 0.22), (-1.00, -0.20, -0.20), (-0.18, -0.14, 0.0)),
                # Follow-through settle
                (f_settle, (-0.18, 0.0, -0.06), (-0.45, 0.0, 0.08), (-0.05, 0.0, 0.0), (-0.18, 0.0, 0.06), (-0.45, 0.0, -0.08), (-0.05, 0.0, 0.0)),
            ]:
                fc_arm = min(f_end - 1, f_base)
                fc_fore = min(f_end - 1, f_base + 2)
                fc_hand = min(f_end - 1, f_base + 4)
                _keyframe_bone_rot(arm_obj, "upper_arm.L", fc_arm, *ua_l)
                _keyframe_bone_rot(arm_obj, "forearm.L", fc_fore, *fa_l)
                _keyframe_bone_rot(arm_obj, "hand.L", fc_hand, *h_l)
                _keyframe_bone_rot(arm_obj, "upper_arm.R", fc_arm, *ua_r)
                _keyframe_bone_rot(arm_obj, "forearm.R", fc_fore, *fa_r)
                _keyframe_bone_rot(arm_obj, "hand.R", fc_hand, *h_r)

        else:
            # --- LISTENER PERFORMANCE: Active Head-Turn Gaze, Attentive Posture, Agreement Nods ---
            _keyframe_bone_loc(arm_obj, "hips", f_start, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_start, 0.0, -0.04 * turn_dir, 0.02 * turn_dir)
            _keyframe_bone_loc(arm_obj, "hips", f_b1 + 6, 0.012 * turn_dir, -0.005, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_b1 + 6, 0.0, -0.06 * turn_dir, 0.03 * turn_dir)
            _keyframe_bone_loc(arm_obj, "hips", f_settle, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_settle, 0.0, -0.04 * turn_dir, 0.02 * turn_dir)

            _keyframe_bone_rot(arm_obj, "spine", f_start, 0.01, 0.05 * turn_dir, 0.0)
            _keyframe_bone_rot(arm_obj, "chest", f_start, 0.02, 0.08 * turn_dir, 0.0)
            _keyframe_bone_rot(arm_obj, "spine", f_b1 + 5, -0.02, 0.08 * turn_dir, 0.02 * turn_dir)
            _keyframe_bone_rot(arm_obj, "chest", f_b1 + 7, -0.03, 0.11 * turn_dir, 0.02 * turn_dir)
            _keyframe_bone_rot(arm_obj, "spine", f_settle, 0.01, 0.06 * turn_dir, 0.0)
            _keyframe_bone_rot(arm_obj, "chest", f_settle, 0.01, 0.08 * turn_dir, 0.0)

            # Listener Head: turns toward speaker (h_twist_y) within 8 frames, then nods at f_b1+10 & f_b2+8
            f_turn = min(f_end - 2, f_start + 8)
            f_nod1 = min(f_end - 4, f_b1 + 10)
            f_nod2 = min(f_end - 3, f_b2 + 8)
            for f_h, hp, h_twist_y, h_tilt_z in [
                (f_start, 0.02, 0.10 * turn_dir, 0.0),
                (f_turn, -0.02, 0.28 * turn_dir, 0.04 * turn_dir),
                (f_nod1, 0.11, 0.28 * turn_dir, 0.05 * turn_dir),     # Reactive nod down
                (min(f_end - 2, f_nod1 + 7), -0.03, 0.27 * turn_dir, 0.03 * turn_dir),  # Nod up
                (f_nod2, 0.08, 0.25 * turn_dir, -0.04 * turn_dir),    # Second micro-nod
                (f_settle, -0.01, 0.22 * turn_dir, 0.02 * turn_dir),
            ]:
                _keyframe_bone_rot(arm_obj, "neck", f_h, hp * 0.35, h_twist_y * 0.4, h_tilt_z * 0.35)
                _keyframe_bone_rot(arm_obj, "head", f_h, hp, h_twist_y, h_tilt_z)

            # Listener Arms: attentive forward-bent elbow listening pose
            _keyframe_bone_rot(arm_obj, "upper_arm.L", f_start, -0.14, 0.0, -0.05)
            _keyframe_bone_rot(arm_obj, "forearm.L", f_start, -0.38, 0.0, 0.08)
            _keyframe_bone_rot(arm_obj, "upper_arm.R", f_start, -0.20, 0.0, 0.06)
            _keyframe_bone_rot(arm_obj, "forearm.R", f_start, -0.52, 0.0, -0.12)

            _keyframe_bone_rot(arm_obj, "upper_arm.L", f_b1 + 6, -0.22, 0.0, -0.08)
            _keyframe_bone_rot(arm_obj, "forearm.L", f_b1 + 8, -0.54, 0.0, 0.14)
            _keyframe_bone_rot(arm_obj, "upper_arm.R", f_b1 + 6, -0.28, 0.0, 0.10)
            _keyframe_bone_rot(arm_obj, "forearm.R", f_b1 + 8, -0.68, 0.0, -0.18)

            _keyframe_bone_rot(arm_obj, "upper_arm.L", f_settle, -0.14, 0.0, -0.05)
            _keyframe_bone_rot(arm_obj, "forearm.L", f_settle, -0.40, 0.0, 0.08)
            _keyframe_bone_rot(arm_obj, "upper_arm.R", f_settle, -0.20, 0.0, 0.06)
            _keyframe_bone_rot(arm_obj, "forearm.R", f_settle, -0.48, 0.0, -0.12)

        # --- PHONEME-TO-VISEME LIP-SYNC & EMOTIONAL BROW KEYFRAMING ---
        # Note: For vertical facial bones (roll=0), local +Y (ly) is World +Z (up/down)!
        if is_speaking and shot.get("narrationText"):
            viseme_events = generate_dialogue_viseme_timeline(
                shot["narrationText"],
                f_start,
                dur,
                fps,
                shot.get("lipSyncEnvelope"),
            )
            for f_vis, vis_name, energy in viseme_events:
                jaw_z, lip_low_z, mouth_scale_x, brow_z = VISEME_TARGETS.get(vis_name, VISEME_TARGETS["SIL"])
                e = min(1.35, max(0.35, energy))
                _keyframe_bone_loc(arm_obj, "jaw", f_vis, 0.0, jaw_z * e, 0.0)
                _keyframe_bone_loc(arm_obj, "lip_lower", f_vis, 0.0, lip_low_z * e, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_lower", f_vis, mouth_scale_x, 1.0, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_upper", f_vis, 0.0, abs(lip_low_z) * 0.30 * e, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_upper", f_vis, mouth_scale_x, 1.0, 1.0)

                brow_tilt = 0.06 if "excited" in emotion or "awe" in emotion else -0.03
                _keyframe_bone_loc(arm_obj, "brow.L", f_vis, 0.0, brow_z * e, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", f_vis, 0.0, brow_z * e, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.L", f_vis, 0.0, 0.0, brow_tilt)
                _keyframe_bone_rot(arm_obj, "brow.R", f_vis, 0.0, 0.0, -brow_tilt)
        else:
            for f_sil in (f_start, f_b1 + 8, f_b2 + 8, f_end - 1):
                _keyframe_bone_loc(arm_obj, "jaw", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_loc(arm_obj, "lip_lower", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_lower", f_sil, 1.05, 1.0, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_upper", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_upper", f_sil, 1.05, 1.0, 1.0)
                brow_react = 0.012 if f_sil in (f_b1 + 8, f_b2 + 8) else 0.003
                _keyframe_bone_loc(arm_obj, "brow.L", f_sil, 0.0, brow_react, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", f_sil, 0.0, brow_react, 0.0)

        # --- NATURAL 5-FRAME ASYMMETRIC EYE BLINKS (local +Y = World +Z) ---
        blink_frames = [f_start + 9, f_start + int(dur * 0.55)]
        for bf in blink_frames:
            if bf + 5 >= f_end:
                continue
            for side in ("L", "R"):
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf, 0.0, 0.0, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 2, 0.0, -0.018, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 3, 0.0, -0.018, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 5, 0.0, 0.0, 0.0)

    _smooth_all_fcurves(arm_obj)
    return action
