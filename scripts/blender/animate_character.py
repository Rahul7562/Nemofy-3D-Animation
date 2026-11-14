"""
AetherFrame 3D — High-Precision Character Performance, Free-Hand Choreography & Viseme Lip-Sync Engine
(scripts/blender/animate_character.py)

Authors dense, C2-smooth keyframed Blender Actions with AUTO_CLAMPED Bezier F-curves:
1. Phoneme-to-Viseme Lip-Sync (Preston Blair / ARKit visemes: SIL, MBP, FV, TH, L_NT, EE, IH, AA, OH, OU)
   tightly locked to the synthesized WAV RMS/ZCR lipSyncEnvelope (`mouthOpenness`, `mouthWidth`, `energy`).
2. Smooth, Stutter-Free Multi-Axis Free Hand Choreography for Leo:
   - Chin-Think / Playful Critique: Leo smoothly raises his right hand to stroke his chin while his left hand
     gestures freely toward Nemo with wrist/forearm follow-through.
   - Head-Scratch / Temple Touch: Leo smoothly arcs his left hand up to touch/scratch his head/temple while
     his right hand gestures freely in playful banter.
   - Facepalm / Forehead Disbelief: Leo brings his right hand to his forehead/brow in comedic disbelief while
     leaning back and shaking his head.
   - Playful Roast / Conversational Banter: Fluid transitions between chin-strokes, open-palm phrasing, and
     expressive pointing with zero stiff pose resets.
3. Energetic, Expressive Free Movements for Nemo:
   - Rhythmic bouncy hops, subtle cube squash-and-stretch, expressive 3D body tilts/leans/rolls, and wide,
     lively 3D dual-arm waves, pointing arcs, and celebratory flaps so Nemo is full of life on every frame.
"""

import re
import math
import bpy


# Canonical Viseme Targets: (jaw_drop_z, jaw_scale_vertical, mouth_wide_scale_x, brow_lift_z)
VISEME_TARGETS = {
    "SIL":  ( 0.000, 0.52, 0.95, 0.000),
    "MBP":  ( 0.001, 0.44, 0.90, 0.002),  # Bilabial pressed closed (M, B, P)
    "FV":   (-0.004, 0.78, 1.00, 0.004),  # Labiodental slight open
    "TH":   (-0.006, 0.98, 1.04, 0.005),  # Dental slight open
    "L_NT": (-0.009, 1.20, 1.06, 0.006),  # Alveolar medium open
    "EE":   (-0.010, 1.32, 1.24, 0.008),  # Wide front vowel
    "IH":   (-0.013, 1.52, 1.14, 0.009),  # Relaxed mid vowel
    "AA":   (-0.020, 2.25, 1.16, 0.014),  # Wide open vowel (A, AH)
    "OH":   (-0.018, 2.05, 0.82, 0.012),  # Rounded open O
    "OU":   (-0.009, 1.15, 0.72, 0.007),  # Tight pursed U/W
}


def _smoothstep(x: float) -> float:
    t = max(0.0, min(1.0, x))
    return t * t * (3.0 - 2.0 * t)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * max(0.0, min(1.0, t))


def word_to_viseme_sequence(word: str) -> list:
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


def _sample_envelope_energy(lip_sync_envelope: list, local_frame: int) -> float:
    if not lip_sync_envelope:
        return 0.65
    idx = min(len(lip_sync_envelope) - 1, max(0, int(local_frame)))
    pt = lip_sync_envelope[idx]
    if isinstance(pt, dict):
        openness = float(pt.get("mouthOpenness", pt.get("openness", 0.5)))
        energy = float(pt.get("energy", openness))
        return max(0.0, min(1.0, 0.6 * openness + 0.4 * energy))
    return 0.65


def generate_dialogue_viseme_timeline(
    narration_text: str,
    shot_start_frame: int,
    shot_duration_frames: int,
    fps: int,
    lip_sync_envelope: list = None,
) -> list:
    words = [w for w in narration_text.strip().split() if w]
    if not words:
        return [
            (shot_start_frame, "SIL", 0.0),
            (shot_start_frame + shot_duration_frames, "SIL", 0.0),
        ]

    lead_in_frames = min(4, max(2, int(fps * 0.08)))
    tail_out_frames = min(12, max(5, int(fps * 0.28)))
    active_span = max(10, shot_duration_frames - lead_in_frames - tail_out_frames)

    weights = []
    for w in words:
        base_w = max(2.0, float(len(w)))
        if w.endswith((",", ";", ":")):
            base_w += 2.0
        elif w.endswith((".", "!", "?", "—")):
            base_w += 3.2
        weights.append(base_w)

    total_weight = sum(weights) or 1.0
    events = [(shot_start_frame, "SIL", 0.0)]

    cursor = float(shot_start_frame + lead_in_frames)
    for w, weight in zip(words, weights):
        word_frames = max(3.0, (weight / total_weight) * active_span)
        visemes = word_to_viseme_sequence(w)
        pause_ratio = 0.20 if w.endswith((".", "!", "?", ",")) else 0.06
        speak_frames = word_frames * (1.0 - pause_ratio)
        step = speak_frames / max(1, len(visemes))

        for idx, vis in enumerate(visemes):
            f = int(round(cursor + idx * step - 1.0))
            f = max(
                shot_start_frame + 1,
                min(shot_start_frame + shot_duration_frames - 3, f),
            )
            energy = 1.18 if ("!" in w or "?" in w) else 1.0
            if lip_sync_envelope:
                env_val = _sample_envelope_energy(lip_sync_envelope, f - shot_start_frame)
                energy *= 0.65 + 0.55 * env_val
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
    Authors a dense, continuous, fluid multi-shot skeletal & facial Action on arm_obj:
    - Evaluates C2-continuous harmonic & phrased curves every 3 frames so there are zero
      robotic pauses, linear jerks, or stiff shot-boundary resets.
    - Gives Leo articulated free hands that smoothly reach his chin (chin-think / playful critique),
      his head/temple (head-scratch / comeback), his forehead (facepalm-react), and open-palm banter.
    - Gives Nemo high-energy, bouncy, squash-and-stretch 3D movement with expressive cube tilts/rolls
      and wide free dual-arm waves/pointing.
    """
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    action = bpy.data.actions.new(name=f"{arm_obj.name}_PerformanceAction")
    arm_obj.animation_data.action = action

    is_nemo = "nemo" in char_id.lower() or "nemo" in arm_obj.name.lower()
    safe_fps = max(1, int(fps))

    for shot_idx, shot in enumerate(shots):
        f_start = int(shot["startFrame"])
        f_end = int(shot["endFrame"])
        dur = max(10, f_end - f_start)

        my_stage = shot.get("characterStaging", {}).get(char_id, {})
        stage_x = float(my_stage.get("x", 0.36 if is_nemo else -0.36))
        stage_y = float(my_stage.get("y", 0.0))
        partner_x = float(partner_pos_by_shot[shot_idx].get("x", -stage_x))

        dx_to_partner = partner_x - stage_x
        turn_dir = 1.0 if dx_to_partner > 0 else -1.0
        base_yaw = 0.28 * turn_dir

        speaker_name = str(shot.get("dialogueSpeaker", "")).lower()
        is_speaking = ("nemo" in speaker_name and is_nemo) or (
            "leo" in speaker_name and not is_nemo
        )
        emotion = str(shot.get("emotion", "")).lower()
        speaker_action = str(shot.get("speakerAction", "talk")).lower()
        listener_action = str(shot.get("listenerAction", "idle")).lower()
        my_action = speaker_action if is_speaking else listener_action
        lip_env = shot.get("lipSyncEnvelope") or []

        # Keep feet grounded at Z=0.0 while allowing subtle dynamic stage drift
        arm_obj.location = (stage_x, stage_y, 0.0)
        arm_obj.rotation_euler = (0.0, 0.0, base_yaw)
        arm_obj.keyframe_insert(data_path="location", frame=f_start)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_start)
        arm_obj.keyframe_insert(data_path="location", frame=f_end - 1)
        arm_obj.keyframe_insert(data_path="rotation_euler", frame=f_end - 1)

        for f_lock in (f_start, f_end - 1):
            for side in ("L", "R"):
                _keyframe_bone_rot(arm_obj, f"shin.{side}", f_lock, 0.0, 0.0, 0.0)
                _keyframe_bone_rot(arm_obj, f"foot.{side}", f_lock, 0.0, 0.0, 0.0)

        # Dense 3-frame keyframe sampling across the shot for silky-smooth Bezier motion
        sample_frames = list(range(f_start, f_end, 3))
        if (f_end - 1) not in sample_frames:
            sample_frames.append(f_end - 1)

        for f in sample_frames:
            local_f = f - f_start
            t_sec = f / float(safe_fps)
            local_sec = local_f / float(safe_fps)
            shot_prog = local_f / float(max(1, dur - 1))
            # Smooth envelope at shot entry/exit so shots blend organically without snapping to 0
            phrase_env = _smoothstep(min(1.0, local_f / 8.0)) * _smoothstep(
                min(1.0, (dur - 1 - local_f) / 8.0)
            )
            speech_e = (
                _sample_envelope_energy(lip_env, local_f)
                if is_speaking
                else 0.25 * math.sin(local_sec * 2.4) ** 2
            )

            if is_nemo:
                # =====================================================================
                # NEMO: ENERGETIC, BOUNCY, EXPRESSIVE CUBE AI COMPANION CHOREOGRAPHY
                # =====================================================================
                bounce_freq = (
                    3.4
                    if (
                        is_speaking
                        or my_action in ("energetic-wave", "playful-roast", "celebrate")
                    )
                    else 2.6
                )
                cycle = t_sec * bounce_freq + shot_idx * 1.3
                hop_amp = (
                    0.052
                    if (
                        is_speaking
                        or my_action in ("energetic-wave", "playful-roast", "celebrate")
                    )
                    else 0.034
                )
                hop_z = abs(math.sin(cycle)) * hop_amp * (0.75 + 0.35 * speech_e)

                # Squash and stretch on Nemo's cube body synchronized with the hop!
                squash = 1.0 + math.cos(cycle * 2.0) * (0.048 if is_speaking else 0.032)
                inv_sq = 1.0 / math.sqrt(max(0.8, squash))

                # Note: For vertical bones (hips/head), local +Y is World +Z (vertical up)!
                _keyframe_bone_loc(
                    arm_obj,
                    "hips",
                    f,
                    math.sin(cycle * 0.5) * 0.018,
                    hop_z,
                    0.0,
                )
                _keyframe_bone_scale(arm_obj, "head", f, inv_sq, squash, inv_sq)

                # Expressive 3D cube tilts, leans, and yaw turns toward Leo
                cube_pitch = (
                    -0.05 * math.sin(cycle * 1.1)
                    + (0.045 * speech_e if is_speaking else 0.02)
                )
                cube_yaw = (
                    0.16 * turn_dir
                    + math.sin(cycle * 0.75) * 0.095
                    + (0.05 * math.cos(cycle * 1.4) if is_speaking else 0.0)
                )
                cube_roll = math.sin(cycle * 0.95) * (
                    0.135
                    if my_action in ("energetic-wave", "playful-roast", "celebrate")
                    else 0.095
                )

                _keyframe_bone_rot(
                    arm_obj,
                    "chest",
                    f,
                    cube_pitch * 0.45,
                    cube_yaw * 0.45,
                    cube_roll * 0.45,
                )
                _keyframe_bone_rot(
                    arm_obj, "head", f, cube_pitch, cube_yaw, cube_roll
                )

                # Free, energetic 2-segment side-arms for Nemo
                if my_action in ("celebrate", "energetic-wave") or "triumphant" in emotion:
                    ua_l = (
                        -1.35 + math.sin(cycle * 1.4) * 0.42,
                        0.18 * math.cos(cycle),
                        0.38 + math.sin(cycle * 1.2) * 0.25,
                    )
                    fa_l = (-0.55 + math.sin(cycle * 1.8) * 0.30, 0.0, 0.22)
                    ua_r = (
                        -1.35 + math.cos(cycle * 1.4) * 0.42,
                        -0.18 * math.sin(cycle),
                        -0.38 - math.cos(cycle * 1.2) * 0.25,
                    )
                    fa_r = (-0.55 + math.cos(cycle * 1.8) * 0.30, 0.0, -0.22)
                elif my_action == "playful-roast" or is_speaking:
                    # Sassy alternating waves & pointing toward Leo
                    ua_l = (
                        -0.98 + math.sin(cycle * 1.25) * (0.42 + 0.18 * speech_e),
                        0.20 * math.cos(cycle),
                        0.34 + math.sin(cycle) * 0.22,
                    )
                    fa_l = (-0.62 + math.sin(cycle * 1.6) * 0.28, 0.0, 0.20)
                    ua_r = (
                        -1.08 + math.cos(cycle * 1.15) * (0.44 + 0.18 * speech_e),
                        -0.20 * math.sin(cycle),
                        -0.36 - math.cos(cycle) * 0.22,
                    )
                    fa_r = (-0.66 + math.cos(cycle * 1.6) * 0.28, 0.0, -0.20)
                else:
                    # Lively, expressive active listening waves (never static!)
                    ua_l = (
                        -0.62 + math.sin(cycle * 1.1) * 0.30,
                        0.12 * math.cos(cycle * 0.8),
                        0.26 + math.sin(cycle * 0.9) * 0.16,
                    )
                    fa_l = (-0.48 + math.sin(cycle * 1.4) * 0.22, 0.0, 0.15)
                    ua_r = (
                        -0.62 - math.sin(cycle * 1.1) * 0.30,
                        -0.12 * math.cos(cycle * 0.8),
                        -0.26 - math.cos(cycle * 0.9) * 0.16,
                    )
                    fa_r = (-0.48 + math.cos(cycle * 1.4) * 0.22, 0.0, -0.15)

                _keyframe_bone_rot(arm_obj, "upper_arm.L", f, *ua_l)
                _keyframe_bone_rot(arm_obj, "forearm.L", f, *fa_l)
                _keyframe_bone_rot(
                    arm_obj, "hand.L", f, math.sin(cycle * 1.8) * 0.22, 0.0, 0.0
                )
                _keyframe_bone_rot(arm_obj, "upper_arm.R", f, *ua_r)
                _keyframe_bone_rot(arm_obj, "forearm.R", f, *fa_r)
                _keyframe_bone_rot(
                    arm_obj, "hand.R", f, math.cos(cycle * 1.8) * 0.22, 0.0, 0.0
                )

                # Playful leg kicks synchronized with Nemo's hop
                kick = math.sin(cycle) * 0.24
                _keyframe_bone_rot(arm_obj, "thigh.L", f, kick, 0.0, 0.0)
                _keyframe_bone_rot(arm_obj, "thigh.R", f, -kick, 0.0, 0.0)

                # Expressive eyebrows
                b_lift = 0.014 if is_speaking else 0.010 + 0.004 * math.sin(cycle)
                b_tilt = 0.05 * math.sin(cycle * 0.8)
                _keyframe_bone_loc(arm_obj, "brow.L", f, 0.0, b_lift, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", f, 0.0, b_lift, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.L", f, 0.0, 0.0, b_tilt)
                _keyframe_bone_rot(arm_obj, "brow.R", f, 0.0, 0.0, -b_tilt)

            else:
                # =====================================================================
                # LEO: SMOOTH, NATURAL MULTI-AXIS FREE-HAND & BODY CHOREOGRAPHY
                # =====================================================================
                cycle = t_sec * 2.15 + shot_idx * 0.9
                # Smooth breathing & contrapposto weight shift
                hip_sway_x = math.sin(cycle * 0.65) * 0.014
                hip_bob_z = math.sin(cycle * 1.1) * 0.012
                _keyframe_bone_loc(arm_obj, "hips", f, hip_sway_x, hip_bob_z, 0.0)
                _keyframe_bone_rot(
                    arm_obj,
                    "hips",
                    f,
                    0.0,
                    math.sin(cycle * 0.65) * 0.025,
                    math.cos(cycle * 0.65) * 0.018,
                )

                spine_pitch = 0.018 + math.sin(cycle * 0.75) * 0.022
                spine_yaw = 0.035 * turn_dir + math.sin(cycle * 0.6) * 0.04
                spine_roll = math.cos(cycle * 0.65) * 0.022
                _keyframe_bone_rot(
                    arm_obj,
                    "spine",
                    f,
                    spine_pitch * 0.5,
                    spine_yaw * 0.5,
                    spine_roll * 0.5,
                )
                _keyframe_bone_rot(
                    arm_obj, "chest", f, spine_pitch, spine_yaw, spine_roll
                )

                # Head & Neck natural tracking with thoughtful tilts
                head_pitch = (
                    -0.025 * math.sin(cycle * 1.2)
                    + (0.042 * speech_e * math.sin(t_sec * 5.0) if is_speaking else 0.025 * math.sin(cycle * 1.4))
                )
                head_yaw = 0.14 * turn_dir + math.sin(cycle * 0.8) * 0.055
                head_roll = math.sin(cycle * 0.7) * 0.055

                if my_action == "chin-think":
                    head_roll = -0.085 + math.sin(cycle * 0.65) * 0.035
                    head_pitch += 0.025
                elif my_action == "head-scratch":
                    head_roll = 0.095 + math.sin(cycle * 0.75) * 0.04
                elif my_action == "facepalm-react":
                    head_pitch = 0.065 + math.sin(cycle * 1.3) * 0.03
                    head_yaw = 0.08 * turn_dir + math.sin(cycle * 1.8) * 0.075
                    head_roll = -0.09 + math.cos(cycle * 1.1) * 0.04

                _keyframe_bone_rot(
                    arm_obj,
                    "neck",
                    f,
                    head_pitch * 0.35,
                    head_yaw * 0.35,
                    head_roll * 0.35,
                )
                _keyframe_bone_rot(
                    arm_obj, "head", f, head_pitch, head_yaw, head_roll
                )

                # --- LEO'S ARTICULATED FREE HANDS (Chin, Head/Temple, Forehead, and Expressive Banter) ---
                # Pose 1: Right hand at CHIN (stroking chin thoughtfully), Left hand gesturing freely
                chin_sh_r = (0.0, -0.06, -0.10)
                chin_ua_r = (
                    -1.22 + math.sin(cycle * 0.85) * 0.06,
                    -0.44 + math.cos(cycle * 0.85) * 0.05,
                    -0.28 + math.sin(cycle * 0.9) * 0.04,
                )
                chin_fa_r = (
                    -1.38 + math.sin(cycle * 1.9) * 0.08,
                    -0.22,
                    -0.38 + math.cos(cycle * 1.9) * 0.06,
                )
                chin_ha_r = (
                    0.26 + math.sin(cycle * 2.7) * 0.12,
                    0.0,
                    0.10 * math.cos(cycle * 2.7),
                )

                # Pose 2: Left hand at HEAD / TEMPLE (scratching head / mind-blown), Right hand gesturing freely
                head_sh_l = (0.0, 0.08, 0.14)
                head_ua_l = (
                    -1.72 + math.sin(cycle * 1.2) * 0.08,
                    0.38 + math.cos(cycle * 1.1) * 0.06,
                    0.24 + math.sin(cycle * 0.9) * 0.05,
                )
                head_fa_l = (
                    -1.36 + math.sin(cycle * 2.4) * 0.11,
                    0.18,
                    0.42 + math.cos(cycle * 2.4) * 0.07,
                )
                head_ha_l = (
                    0.28 + math.sin(cycle * 2.9) * 0.14,
                    0.0,
                    -0.10 * math.cos(cycle * 2.9),
                )

                # Pose 3: Right hand at FOREHEAD (facepalm disbelief)
                fp_sh_r = (0.0, -0.08, -0.12)
                fp_ua_r = (
                    -1.64 + math.sin(cycle * 0.95) * 0.07,
                    -0.38,
                    -0.26 + math.cos(cycle * 0.95) * 0.05,
                )
                fp_fa_r = (
                    -1.42 + math.sin(cycle * 1.5) * 0.08,
                    -0.20,
                    -0.42 + math.cos(cycle * 1.5) * 0.06,
                )
                fp_ha_r = (0.24, 0.0, 0.08)

                # Pose 4: Free Conversational / Banter Gestures for Left & Right Arms
                free_sh_l = (0.0, 0.0, 0.04 * math.sin(cycle))
                free_ua_l = (
                    -0.64 + math.sin(cycle * 1.05) * (0.26 + 0.18 * speech_e),
                    0.16 * math.cos(cycle * 0.85),
                    -0.18 - math.sin(cycle * 0.8) * 0.10,
                )
                free_fa_l = (
                    -0.84 + math.cos(cycle * 1.2) * (0.24 + 0.14 * speech_e),
                    0.12 * math.sin(cycle),
                    0.16,
                )
                free_ha_l = (
                    -0.16 + math.sin(cycle * 1.6) * 0.16,
                    0.08 * math.cos(cycle),
                    0.0,
                )

                free_sh_r = (0.0, 0.0, -0.04 * math.cos(cycle))
                free_ua_r = (
                    -0.72 + math.cos(cycle * 1.0) * (0.28 + 0.18 * speech_e),
                    -0.16 * math.sin(cycle * 0.85),
                    0.18 + math.cos(cycle * 0.8) * 0.10,
                )
                free_fa_r = (
                    -0.88 + math.sin(cycle * 1.15) * (0.24 + 0.14 * speech_e),
                    -0.12 * math.cos(cycle),
                    -0.16,
                )
                free_ha_r = (
                    -0.16 + math.cos(cycle * 1.6) * 0.16,
                    -0.08 * math.sin(cycle),
                    0.0,
                )

                if my_action == "chin-think":
                    # Right hand smoothly strokes chin for 75% of the shot, opening out naturally at phrasing peaks
                    w_chin = phrase_env * (0.78 + 0.22 * math.cos(shot_prog * math.pi * 1.2))
                    sh_r = tuple(_lerp(free_sh_r[i], chin_sh_r[i], w_chin) for i in range(3))
                    ua_r = tuple(_lerp(free_ua_r[i], chin_ua_r[i], w_chin) for i in range(3))
                    fa_r = tuple(_lerp(free_fa_r[i], chin_fa_r[i], w_chin) for i in range(3))
                    ha_r = tuple(_lerp(free_ha_r[i], chin_ha_r[i], w_chin) for i in range(3))
                    sh_l, ua_l, fa_l, ha_l = free_sh_l, free_ua_l, free_fa_l, free_ha_l

                elif my_action == "head-scratch":
                    # Left hand smoothly reaches up to scratch head/temple while right hand gestures freely
                    w_head = phrase_env * (0.80 + 0.20 * math.sin(shot_prog * math.pi * 1.1 + 0.4))
                    sh_l = tuple(_lerp(free_sh_l[i], head_sh_l[i], w_head) for i in range(3))
                    ua_l = tuple(_lerp(free_ua_l[i], head_ua_l[i], w_head) for i in range(3))
                    fa_l = tuple(_lerp(free_fa_l[i], head_fa_l[i], w_head) for i in range(3))
                    ha_l = tuple(_lerp(free_ha_l[i], head_ha_l[i], w_head) for i in range(3))
                    sh_r, ua_r, fa_r, ha_r = free_sh_r, free_ua_r, free_fa_r, free_ha_r

                elif my_action == "facepalm-react":
                    # Right hand arcs up to forehead in playful disbelief while left hand gestures out
                    w_fp = phrase_env * _smoothstep(min(1.0, (local_f + 4) / 14.0))
                    sh_r = tuple(_lerp(free_sh_r[i], fp_sh_r[i], w_fp) for i in range(3))
                    ua_r = tuple(_lerp(free_ua_r[i], fp_ua_r[i], w_fp) for i in range(3))
                    fa_r = tuple(_lerp(free_fa_r[i], fp_fa_r[i], w_fp) for i in range(3))
                    ha_r = tuple(_lerp(free_ha_r[i], fp_ha_r[i], w_fp) for i in range(3))
                    sh_l, ua_l, fa_l, ha_l = free_sh_l, free_ua_l, free_fa_l, free_ha_l

                elif my_action == "panic-react" or "panic" in emotion:
                    sh_l, sh_r = (0.0, 0.06, 0.10), (0.0, -0.06, -0.10)
                    ua_l = (-1.42 + math.sin(cycle * 1.3) * 0.14, 0.28, 0.22)
                    fa_l = (-1.18 + math.cos(cycle * 1.6) * 0.12, 0.16, 0.34)
                    ha_l = (0.20, 0.0, 0.0)
                    ua_r = (-1.42 + math.cos(cycle * 1.3) * 0.14, -0.28, -0.22)
                    fa_r = (-1.18 + math.sin(cycle * 1.6) * 0.12, -0.16, -0.34)
                    ha_r = (0.20, 0.0, 0.0)

                elif my_action == "celebrate" or "triumphant" in emotion:
                    sh_l, sh_r = (0.0, 0.05, 0.12), (0.0, -0.05, -0.12)
                    ua_l = (-1.45 + math.sin(cycle * 1.3) * 0.22, 0.22, -0.24)
                    fa_l = (-0.75 + math.sin(cycle * 1.6) * 0.18, 0.14, 0.18)
                    ha_l = (-0.15, 0.0, 0.0)
                    ua_r = (-1.45 - math.sin(cycle * 1.3) * 0.22, -0.22, 0.24)
                    fa_r = (-0.75 + math.cos(cycle * 1.6) * 0.18, -0.14, -0.18)
                    ha_r = (-0.15, 0.0, 0.0)

                else:
                    # Playful roast / talk / gesture / idle: smoothly blend in chin-touch during thoughtful beats
                    w_chin = phrase_env * (0.45 + 0.45 * math.sin(cycle * 0.55))
                    sh_r = tuple(_lerp(free_sh_r[i], chin_sh_r[i], w_chin) for i in range(3))
                    ua_r = tuple(_lerp(free_ua_r[i], chin_ua_r[i], w_chin) for i in range(3))
                    fa_r = tuple(_lerp(free_fa_r[i], chin_fa_r[i], w_chin) for i in range(3))
                    ha_r = tuple(_lerp(free_ha_r[i], chin_ha_r[i], w_chin) for i in range(3))
                    sh_l, ua_l, fa_l, ha_l = free_sh_l, free_ua_l, free_fa_l, free_ha_l

                _keyframe_bone_rot(arm_obj, "shoulder.L", f, *sh_l)
                _keyframe_bone_rot(arm_obj, "upper_arm.L", f, *ua_l)
                _keyframe_bone_rot(arm_obj, "forearm.L", f, *fa_l)
                _keyframe_bone_rot(arm_obj, "hand.L", f, *ha_l)

                _keyframe_bone_rot(arm_obj, "shoulder.R", f, *sh_r)
                _keyframe_bone_rot(arm_obj, "upper_arm.R", f, *ua_r)
                _keyframe_bone_rot(arm_obj, "forearm.R", f, *fa_r)
                _keyframe_bone_rot(arm_obj, "hand.R", f, *ha_r)

                # Expressive eyebrows for Leo
                b_lift = (
                    0.016
                    if my_action in ("facepalm-react", "panic-react", "head-scratch")
                    else (0.012 + 0.004 * speech_e)
                )
                b_tilt = (
                    -0.08
                    if my_action == "facepalm-react"
                    else 0.04 * math.sin(cycle * 0.85)
                )
                _keyframe_bone_loc(arm_obj, "brow.L", f, 0.0, b_lift, 0.0)
                _keyframe_bone_loc(arm_obj, "brow.R", f, 0.0, b_lift, 0.0)
                _keyframe_bone_rot(arm_obj, "brow.L", f, 0.0, 0.0, b_tilt)
                _keyframe_bone_rot(arm_obj, "brow.R", f, 0.0, 0.0, -b_tilt)

        # --- PHONEME-TO-VISEME LIP-SYNC ---
        if is_speaking and shot.get("narrationText"):
            viseme_events = generate_dialogue_viseme_timeline(
                shot["narrationText"],
                f_start,
                dur,
                safe_fps,
                lip_env,
            )
            for f_vis, vis_name, energy in viseme_events:
                jaw_z, jaw_sy, mouth_scale_x, _ = VISEME_TARGETS.get(
                    vis_name, VISEME_TARGETS["SIL"]
                )
                e = min(1.30, max(0.45, energy))
                open_sy = 0.52 + (jaw_sy - 0.52) * e
                _keyframe_bone_loc(arm_obj, "jaw", f_vis, 0.0, jaw_z * e, 0.0)
                _keyframe_bone_scale(
                    arm_obj, "jaw", f_vis, mouth_scale_x, open_sy, 1.0
                )
                _keyframe_bone_loc(
                    arm_obj, "lip_lower", f_vis, 0.0, jaw_z * 0.6 * e, 0.0
                )
                _keyframe_bone_scale(
                    arm_obj, "lip_lower", f_vis, mouth_scale_x, 1.0, 1.0
                )
                _keyframe_bone_loc(arm_obj, "lip_upper", f_vis, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(
                    arm_obj, "lip_upper", f_vis, mouth_scale_x, 1.0, 1.0
                )
        else:
            # Listener expressive smile / closed mouth
            for f_sil in range(f_start, f_end, 12):
                _keyframe_bone_loc(arm_obj, "jaw", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "jaw", f_sil, 1.02, 0.48, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_lower", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_lower", f_sil, 1.02, 1.0, 1.0)
                _keyframe_bone_loc(arm_obj, "lip_upper", f_sil, 0.0, 0.0, 0.0)
                _keyframe_bone_scale(arm_obj, "lip_upper", f_sil, 1.02, 1.0, 1.0)

        # --- NATURAL 5-FRAME ASYMMETRIC EYE BLINKS ---
        blink_frames = [
            f_start + 12,
            f_start + int(dur * 0.48),
            f_start + int(dur * 0.82),
        ]
        for bf in blink_frames:
            if bf + 5 >= f_end:
                continue
            for side in ("L", "R"):
                _keyframe_bone_loc(arm_obj, f"eyelid_upper.{side}", bf, 0.0, 0.0, 0.0)
                _keyframe_bone_loc(
                    arm_obj, f"eyelid_upper.{side}", bf + 2, 0.0, -0.020, 0.0
                )
                _keyframe_bone_loc(
                    arm_obj, f"eyelid_upper.{side}", bf + 3, 0.0, -0.020, 0.0
                )
                _keyframe_bone_loc(
                    arm_obj, f"eyelid_upper.{side}", bf + 5, 0.0, 0.0, 0.0
                )

    _smooth_all_fcurves(arm_obj)
    return action
