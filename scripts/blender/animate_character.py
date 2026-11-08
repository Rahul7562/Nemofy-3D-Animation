"""
AetherFrame 3D — Character Performance, Acting & Phoneme-to-Viseme Lip-Sync Engine
(scripts/blender/animate_character.py)

Authors keyframed Blender Actions with AUTO_CLAMPED Bezier F-curves for:
1. Phoneme-to-Viseme Lip-Sync (Preston Blair / ARKit visemes: SIL, MBP, FV, TH, L_NT, EE, IH, AA, OH, OU)
   with 2-frame visual lead and mandatory bilabial closure on M/B/P.
2. Mutual Character Acting & Reaction (Speaker vs. Listener gaze, 3/4 inward body angle, head turns, and nods).
3. Grounded, Non-Shaky Phrased Gesture Choreography (Anticipation -> Arc -> Moving Hold -> Follow-Through)
   with feet 100% planted on the window ledge (Z=0.0).
4. Natural Asymmetric 5-Frame Eye Blinks.
"""

import re
import math
import bpy


# Canonical Viseme Targets: (jaw_drop_z, jaw_scale_vertical, mouth_wide_scale_x, brow_lift_z)
VISEME_TARGETS = {
    "SIL":  ( 0.000, 0.55, 0.95, 0.000),
    "MBP":  ( 0.001, 0.45, 0.90, 0.002),  # Bilabial pressed closed (M, B, P)
    "FV":   (-0.004, 0.75, 1.00, 0.004),  # Labiodental slight open
    "TH":   (-0.006, 0.95, 1.04, 0.005),  # Dental slight open
    "L_NT": (-0.008, 1.15, 1.06, 0.006),  # Alveolar medium open
    "EE":   (-0.009, 1.25, 1.22, 0.008),  # Wide front vowel
    "IH":   (-0.012, 1.45, 1.12, 0.009),  # Relaxed mid vowel
    "AA":   (-0.018, 2.15, 1.14, 0.014),  # Wide open vowel (A, AH)
    "OH":   (-0.016, 1.95, 0.82, 0.012),  # Rounded open O
    "OU":   (-0.008, 1.10, 0.72, 0.007),  # Tight pursed U/W
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

    lead_in_frames = min(5, max(2, int(fps * 0.10)))
    tail_out_frames = min(14, max(6, int(fps * 0.35)))
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
            f = max(shot_start_frame + 1, min(shot_start_frame + shot_duration_frames - 3, f))
            energy = 1.15 if ("!" in w or "?" in w) else 1.0
            if lip_sync_envelope:
                env_idx = min(len(lip_sync_envelope) - 1, max(0, f - shot_start_frame))
                env_pt = lip_sync_envelope[env_idx]
                if isinstance(env_pt, dict):
                    energy *= 0.70 + 0.45 * float(env_pt.get("openness", 0.75))
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
    - Orients body 3/4 INWARD toward partner & camera:
      In Blender Z-up (character front at -Y):
      +Z rotation (+0.28 rad) turns Leo (at X = -0.38) inward toward +X (Nemo);
      -Z rotation (-0.28 rad) turns Nemo (at X = +0.38) inward toward -X (Leo).
    - Keeps root, hips, and legs 100% grounded so there is zero tipping, rocking, or foot sliding.
    - Authors clean, expressive chest/head/arm arcs and smooth phoneme-to-viseme mouth animation.
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
        stage_x = float(my_stage.get("x", 0.38 if is_nemo else -0.38))
        stage_y = float(my_stage.get("y", 0.0))
        partner_x = float(partner_pos_by_shot[shot_idx].get("x", -stage_x))

        # In Blender World Z-up (front facing -Y):
        # Rotating (0, -1, 0) around +Z by +theta gives (+sin(theta), -cos(theta), 0).
        # So when partner is to the right (dx_to_partner > 0, Leo looking at Nemo), base_yaw > 0 (+0.26 rad).
        # When partner is to the left (dx_to_partner < 0, Nemo looking at Leo), base_yaw < 0 (-0.26 rad).
        dx_to_partner = partner_x - stage_x
        turn_dir = 1.0 if dx_to_partner > 0 else -1.0
        base_yaw = 0.26 * turn_dir

        speaker_name = str(shot.get("dialogueSpeaker", "")).lower()
        is_speaking = ("nemo" in speaker_name and is_nemo) or ("leo" in speaker_name and not is_nemo)
        emotion = str(shot.get("emotion", "curious" if not is_nemo else "excited")).lower()

        arm_obj.location = (stage_x, stage_y, 0.0)
        arm_obj.rotation_euler = (0.0, 0.0, base_yaw)
        arm_obj.keyframe_insert(data_path="location", frame=f_start)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_start)
        arm_obj.keyframe_insert(data_path="location", frame=f_end - 1)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_end - 1)

        # Lock hips & legs firmly so character never rocks or tips over
        for f_lock in (f_start, f_end - 1):
            _keyframe_bone_loc(arm_obj, "hips", f_lock, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "hips", f_lock, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "spine", f_lock, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "chest", f_lock, 0.0, 0.0, 0.0)
            _keyframe_bone_rot(arm_obj, "neck", f_lock, 0.0, 0.0, 0.0)
            for side in ("L", "R"):
                _keyframe_bone_rot(arm_obj, f"thigh.{side}", f_lock, 0.0, 0.0, 0.0)
                _keyframe_bone_rot(arm_obj, f"shin.{side}", f_lock, 0.0, 0.0, 0.0)
                _keyframe_bone_rot(arm_obj, f"foot.{side}", f_lock, 0.0, 0.0, 0.0)

        f_ant = min(f_end - 2, f_start + 7)
        f_b1 = f_start + int(dur * 0.32)
        f_b2 = f_start + int(dur * 0.68)
        f_settle = max(f_start + 2, f_end - 5)

        if is_speaking:
            # --- SPEAKER PERFORMANCE: Grounded Lower Body, Smooth Head Gaze & Expressive Arm Arcs ---
            if not is_nemo:
                # Subtle chest breathing/twist for Leo (Nemo's cube body rotates purely from 'head' to prevent stacked wobble)
                for f_c, c_pitch, c_twist_y, c_tilt_z in [
                    (f_start, 0.01, 0.02 * turn_dir, 0.0),
                    (f_ant, 0.025, 0.0, -0.015 * turn_dir),
                    (f_b1, -0.02, 0.06 * turn_dir, 0.02 * turn_dir),
                    (f_b2, -0.01, 0.04 * turn_dir, -0.015 * turn_dir),
                    (f_settle, 0.01, 0.02 * turn_dir, 0.0),
                ]:
                    _keyframe_bone_rot(arm_obj, "chest", min(f_end - 1, f_c), c_pitch, c_twist_y, c_tilt_z)

            # Smooth, readable head phrasing (ry > 0 * turn_dir turns gaze toward partner)
            h_scale = 0.65 if is_nemo else 1.0
            for f_h, h_pitch, h_twist_y, h_tilt_z in [
                (f_start, 0.0, 0.08 * turn_dir * h_scale, 0.0),
                (f_ant, 0.035 * h_scale, 0.05 * turn_dir * h_scale, -0.025 * turn_dir * h_scale),
                (f_b1, -0.035 * h_scale, 0.14 * turn_dir * h_scale, 0.035 * turn_dir * h_scale),
                (f_b2, -0.015 * h_scale, 0.11 * turn_dir * h_scale, -0.030 * turn_dir * h_scale),
                (f_settle, 0.0, 0.08 * turn_dir * h_scale, 0.0),
            ]:
                _keyframe_bone_rot(arm_obj, "head", min(f_end - 1, f_h), h_pitch, h_twist_y, h_tilt_z)

            # Expressive Forward-Lifting Conversational Arm Gestures (rx < 0 lifts arm forward toward camera -Y)
            for f_base, ua_l, fa_l, h_l, ua_r, fa_r, h_r in [
                (f_start, (-0.16, 0.0, -0.05), (-0.42, 0.0, 0.06), (-0.04, 0.0, 0.0), (-0.16, 0.0, 0.05), (-0.42, 0.0, -0.06), (-0.04, 0.0, 0.0)),
                (f_ant, (-0.24, 0.0, -0.08), (-0.64, 0.0, 0.12), (-0.08, 0.0, 0.0), (-0.22, 0.0, 0.08), (-0.60, 0.0, -0.12), (-0.08, 0.0, 0.0)),
                (f_b1, (-0.52, 0.14, -0.16), (-0.88, 0.15, 0.14), (-0.12, 0.08, 0.0), (-0.28, -0.06, 0.10), (-0.55, -0.08, -0.10), (-0.06, -0.05, 0.0)),
                (f_b2, (-0.28, 0.08, -0.10), (-0.54, 0.08, 0.10), (-0.06, 0.04, 0.0), (-0.54, -0.15, 0.18), (-0.90, -0.15, -0.16), (-0.14, -0.10, 0.0)),
                (f_settle, (-0.16, 0.0, -0.05), (-0.42, 0.0, 0.06), (-0.04, 0.0, 0.0), (-0.16, 0.0, 0.05), (-0.42, 0.0, -0.06), (-0.04, 0.0, 0.0)),
            ]:
                fc_arm = min(f_end - 1, f_base)
                fc_fore = min(f_end - 1, f_base + 2)
                fc_hand = min(f_end - 1, f_base + 3)
                _keyframe_bone_rot(arm_obj, "upper_arm.L", fc_arm, *ua_l)
                _keyframe_bone_rot(arm_obj, "forearm.L", fc_fore, *fa_l)
                _keyframe_bone_rot(arm_obj, "hand.L", fc_hand, *h_l)
                _keyframe_bone_rot(arm_obj, "upper_arm.R", fc_arm, *ua_r)
                _keyframe_bone_rot(arm_obj, "forearm.R", fc_fore, *fa_r)
                _keyframe_bone_rot(arm_obj, "hand.R", fc_hand, *h_r)

            # Phrase-level eyebrow expression (smooth, non-jittery)
            brow_lift = 0.014 if ("excited" in emotion or "awe" in emotion or "Panic" in shot.get("title", "")) else 0.008
            brow_tilt = 0.05 if ("excited" in emotion or "awe" in emotion) else -0.03
            for f_br, b_mult in [(f_start, 0.4), (f_ant, 0.9), (f_b1, 1.0), (f_b2, 0.85), (f_settle, 0.3)]:
                _keyframe_bone_loc(arm_obj, "brow.L", min(f_end - 1, f_br), 0.0, brow_lift * b_mult, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", min(f_end - 1, f_br), 0.0, brow_lift * b_mult, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.L", min(f_end - 1, f_br), 0.0, 0.0, brow_tilt * b_mult)
                _keyframe_bone_rot(arm_obj, "brow.R", min(f_end - 1, f_br), 0.0, 0.0, -brow_tilt * b_mult)

        else:
            # --- LISTENER PERFORMANCE: Calm Attentive Gaze Toward Speaker & Subtle Agreement Nods ---
            if not is_nemo:
                _keyframe_bone_rot(arm_obj, "chest", f_start, 0.01, 0.04 * turn_dir, 0.0)
                _keyframe_bone_rot(arm_obj, "chest", f_b1 + 6, -0.01, 0.06 * turn_dir, 0.01 * turn_dir)
                _keyframe_bone_rot(arm_obj, "chest", f_settle, 0.01, 0.04 * turn_dir, 0.0)

            h_scale = 0.65 if is_nemo else 1.0
            f_turn = min(f_end - 2, f_start + 8)
            f_nod1 = min(f_end - 4, f_b1 + 8)
            f_nod2 = min(f_end - 3, f_b2 + 6)
            for f_h, hp, h_twist_y, h_tilt_z in [
                (f_start, 0.0, 0.08 * turn_dir * h_scale, 0.0),
                (f_turn, -0.01 * h_scale, 0.16 * turn_dir * h_scale, 0.02 * turn_dir * h_scale),
                (f_nod1, 0.055 * h_scale, 0.16 * turn_dir * h_scale, 0.025 * turn_dir * h_scale),
                (min(f_end - 2, f_nod1 + 7), -0.015 * h_scale, 0.15 * turn_dir * h_scale, 0.015 * turn_dir * h_scale),
                (f_nod2, 0.045 * h_scale, 0.15 * turn_dir * h_scale, -0.02 * turn_dir * h_scale),
                (f_settle, 0.0, 0.12 * turn_dir * h_scale, 0.01 * turn_dir * h_scale),
            ]:
                _keyframe_bone_rot(arm_obj, "head", f_h, hp, h_twist_y, h_tilt_z)

            # Calm attentive listening arms
            for f_a, ua_l, fa_l, ua_r, fa_r in [
                (f_start, (-0.12, 0.0, -0.04), (-0.34, 0.0, 0.06), (-0.14, 0.0, 0.04), (-0.38, 0.0, -0.06)),
                (f_b1 + 6, (-0.18, 0.0, -0.06), (-0.44, 0.0, 0.08), (-0.20, 0.0, 0.06), (-0.48, 0.0, -0.08)),
                (f_settle, (-0.12, 0.0, -0.04), (-0.34, 0.0, 0.06), (-0.14, 0.0, 0.04), (-0.38, 0.0, -0.06)),
            ]:
                _keyframe_bone_rot(arm_obj, "upper_arm.L", f_a, *ua_l)
                _keyframe_bone_rot(arm_obj, "forearm.L", f_a, *fa_l)
                _keyframe_bone_rot(arm_obj, "upper_arm.R", f_a, *ua_r)
                _keyframe_bone_rot(arm_obj, "forearm.R", f_a, *fa_r)

            for f_br, b_lift in [(f_start, 0.002), (f_b1 + 8, 0.010), (f_b2 + 6, 0.008), (f_settle, 0.002)]:
                _keyframe_bone_loc(arm_obj, "brow.L", min(f_end - 1, f_br), 0.0, b_lift, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", min(f_end - 1, f_br), 0.0, b_lift, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.L", min(f_end - 1, f_br), 0.0, 0.0, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.R", min(f_end - 1, f_br), 0.0, 0.0, 0.0)

        # --- PHONEME-TO-VISEME LIP-SYNC ---
        # Note: For vertical facial bones (roll=0), local +Y (ly) is World +Z (vertical up/down)!
        if is_speaking and shot.get("narrationText"):
            viseme_events = generate_dialogue_viseme_timeline(
                shot["narrationText"],
                f_start,
                dur,
                fps,
                shot.get("lipSyncEnvelope"),
            )
            for f_vis, vis_name, energy in viseme_events:
                jaw_z, jaw_sy, mouth_scale_x, _ = VISEME_TARGETS.get(vis_name, VISEME_TARGETS["SIL"])
                e = min(1.25, max(0.45, energy))
                open_sy = 0.55 + (jaw_sy - 0.55) * e
                _keyframe_bone_loc(arm_obj, "jaw", f_vis, 0.0, jaw_z * e, 0.0)
                _keyframe_bone_scale(arm_obj, "jaw", f_vis, mouth_scale_x, open_sy, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_lower", f_vis, 0.0, jaw_z * 0.6 * e, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_lower", f_vis, mouth_scale_x, 1.0, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_upper", f_vis, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_upper", f_vis, mouth_scale_x, 1.0, 1.0)
        else:
            for f_sil in (f_start, f_b1 + 8, f_b2 + 8, f_end - 1):
                _keyframe_bone_loc(arm_obj, "jaw", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "jaw", f_sil, 0.96, 0.48, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_lower", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_lower", f_sil, 0.96, 1.0, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_upper", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_upper", f_sil, 0.96, 1.0, 1.0)

        # --- NATURAL 5-FRAME ASYMMETRIC EYE BLINKS (local +Y = World +Z) ---
        blink_frames = [f_start + 11, f_start + int(dur * 0.58)]
        for bf in blink_frames:
            if bf + 5 >= f_end:
                continue
            for side in ("L", "R"):
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf, 0.0, 0.0, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 2, 0.0, -0.020, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 3, 0.0, -0.020, 0.0)
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf + 5, 0.0, 0.0, 0.0)

    _smooth_all_fcurves(arm_obj)
    return action
