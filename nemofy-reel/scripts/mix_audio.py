#!/usr/bin/env python3
"""
Procedural soundtrack, SFX synthesis, dialogue-ducked mixing, and two-pass
EBU R128 loudnorm (-14 LUFS, <= -1.2 dBTP) mastering for the Nemofy StudentHub Reel.
Pure Python standard library + FFmpeg (no heavy external audio packs required).
"""

import json
import math
import os
import random
import re
import struct
import subprocess
import wave

REEL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def write_stereo_wav(path: str, left: list, right: list):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    n = min(len(left), len(right))
    peak = 1e-6
    for i in range(n):
        peak = max(peak, abs(left[i]), abs(right[i]))
    norm = min(1.0, 0.94 / peak)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray(n * 4)
        for i in range(n):
            lv = max(-32767, min(32767, int(left[i] * norm * 32767)))
            rv = max(-32767, min(32767, int(right[i] * norm * 32767)))
            struct.pack_into("<hh", frames, i * 4, lv, rv)
        wf.writeframes(bytes(frames))


def add_mono_event(buf_l: list, buf_r: list, samples: list, at_sec: float, gain: float = 1.0, pan: float = 0.0):
    start_idx = max(0, int(round(at_sec * SR)))
    g_l = gain * math.cos((pan + 1.0) * math.pi * 0.25)
    g_r = gain * math.sin((pan + 1.0) * math.pi * 0.25)
    limit = min(len(buf_l), start_idx + len(samples))
    for i in range(start_idx, limit):
        s = samples[i - start_idx]
        buf_l[i] += s * g_l
        buf_r[i] += s * g_r


def synth_impact_thump(dur: float = 0.36) -> list:
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        freq = 48.0 + 135.0 * math.exp(-t * 28.0)
        phase += 2.0 * math.pi * freq / SR
        env = math.exp(-t * 9.5) * min(1.0, t / 0.005)
        out.append((math.sin(phase) + 0.35 * math.sin(2.0 * phase)) * env)
    return out


def synth_whoosh(dur: float = 0.28) -> list:
    rng = random.Random(42)
    n = int(SR * dur)
    out = []
    lp = 0.0
    hp_prev = 0.0
    for i in range(n):
        t = i / SR
        noise = rng.uniform(-1.0, 1.0)
        alpha = 0.08 + 0.25 * math.sin(math.pi * t / dur)
        lp = lp + alpha * (noise - lp)
        bp = lp - 0.85 * hp_prev
        hp_prev = lp
        env = math.sin(math.pi * t / dur) ** 1.4
        out.append(bp * env * 2.2)
    return out


def synth_pluck(freq: float, dur: float = 0.38) -> list:
    delay_len = max(8, int(SR / max(60.0, freq)))
    rng = random.Random(int(freq * 10))
    ring = [rng.uniform(-1.0, 1.0) for _ in range(delay_len)]
    n = int(SR * dur)
    out = [0.0] * n
    idx = 0
    for i in range(n):
        nxt = (idx + 1) % delay_len
        val = 0.496 * (ring[idx] + ring[nxt])
        ring[idx] = val
        idx = nxt
        env = math.exp(- (i / SR) * 5.2)
        out[i] = val * env
    return out


def synth_holo_chime(dur: float = 0.72) -> list:
    n = int(SR * dur)
    freqs = [523.25, 659.25, 783.99, 1046.50]  # C5 E5 G5 C6 crystalline chord
    out = [0.0] * n
    for c_idx, f in enumerate(freqs):
        delay_t = c_idx * 0.045
        for i in range(n):
            t = (i / SR) - delay_t
            if t < 0:
                continue
            env = math.exp(-t * 4.8) * min(1.0, t / 0.008)
            out[i] += (0.65 * math.sin(2.0 * math.pi * f * t) + 0.25 * math.sin(4.0 * math.pi * f * t)) * env / len(freqs)
    return out


def synth_rimshot(dur: float = 0.24) -> list:
    rng = random.Random(99)
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        tone = math.sin(2.0 * math.pi * 420.0 * t) * math.exp(-t * 38.0)
        snap = rng.uniform(-1.0, 1.0) * math.exp(-t * 28.0)
        out.append(0.55 * tone + 0.65 * snap)
    return out


def synth_fan_whir(dur: float) -> list:
    rng = random.Random(77)
    n = int(SR * dur)
    out = []
    lp = 0.0
    for i in range(n):
        t = i / SR
        wobble = 1.0 + 0.08 * math.sin(2.0 * math.pi * 2.2 * t)
        hum = 0.35 * math.sin(2.0 * math.pi * 195.0 * t) + 0.18 * math.sin(2.0 * math.pi * 390.0 * t)
        lp = lp + 0.055 * (rng.uniform(-1.0, 1.0) - lp)
        fade = min(1.0, t / 0.15) * min(1.0, max(0.0, (dur - t) / 0.18))
        out.append((hum + lp * 1.4) * wobble * fade * 0.55)
    return out


def midi_to_hz(m: int) -> float:
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def generate_lofi_score(total_dur: float, drop_start: float, drop_end: float) -> tuple:
    bpm = 112.0
    beat_dur = 60.0 / bpm
    n = int(round(total_dur * SR))
    l_buf = [0.0] * n
    r_buf = [0.0] * n

    # Warm chord progression (MIDI >= 48 so low-end never muddies small speakers)
    chords = [
        ([53, 56, 60, 63, 67], 41),  # Fm9
        ([58, 62, 65, 68, 72], 46),  # Bb13
        ([55, 58, 62, 67, 70], 43),  # EbMaj9/G
        ([55, 58, 61, 64, 69], 43),  # C7alt feel
    ]

    rng = random.Random(2026)
    num_bars = int(math.ceil(total_dur / (4.0 * beat_dur)))
    for bar in range(num_bars):
        chord_notes, bass_midi = chords[bar % len(chords)]
        bar_t = bar * 4.0 * beat_dur

        # Chord pad stab on beat 1 & 3 (skip during comedic Beat 10->11 pause!)
        for beat_offset in (0.0, 2.0):
            ev_t = bar_t + beat_offset * beat_dur
            if ev_t >= total_dur or (drop_start <= ev_t <= drop_end):
                continue
            c_dur = beat_dur * 1.85
            cn = int(SR * c_dur)
            for idx, m in enumerate(chord_notes):
                f = midi_to_hz(m)
                pan = -0.35 + 0.7 * (idx / max(1, len(chord_notes) - 1))
                g_l = 0.08 * math.cos((pan + 1.0) * math.pi * 0.25)
                g_r = 0.08 * math.sin((pan + 1.0) * math.pi * 0.25)
                start_i = int(round(ev_t * SR))
                for k in range(min(cn, n - start_i)):
                    t = k / SR
                    env = min(1.0, t / 0.015) * math.exp(-t * 2.3)
                    sig = 0.75 * math.sin(2.0 * math.pi * f * t) + 0.22 * math.sin(4.0 * math.pi * f * t)
                    l_buf[start_i + k] += sig * env * g_l
                    r_buf[start_i + k] += sig * env * g_r

        # Groovy bass with 2nd & 3rd harmonics for crisp mobile speaker presence
        for sub_b in (0.0, 1.5, 2.5, 3.5):
            ev_t = bar_t + sub_b * beat_dur
            if ev_t >= total_dur or (drop_start <= ev_t <= drop_end):
                continue
            f = midi_to_hz(bass_midi + (12 if sub_b == 3.5 else 0))
            bn = int(SR * beat_dur * 0.48)
            start_i = int(round(ev_t * SR))
            for k in range(min(bn, n - start_i)):
                t = k / SR
                env = min(1.0, t / 0.008) * math.exp(-t * 5.5)
                sig = 0.58 * math.sin(2.0 * math.pi * f * t) + 0.30 * math.sin(4.0 * math.pi * f * t) + 0.14 * math.sin(6.0 * math.pi * f * t)
                l_buf[start_i + k] += sig * env * 0.19
                r_buf[start_i + k] += sig * env * 0.19

        # Crisp kick (beats 0, 2.5) + soft snare (beats 1, 3) + 8th-note shaker hats
        for step in range(8):
            ev_t = bar_t + step * 0.5 * beat_dur
            if ev_t >= total_dur or (drop_start <= ev_t <= drop_end):
                continue
            start_i = int(round(ev_t * SR))
            # Soft closed hi-hat
            for k in range(min(int(SR * 0.045), n - start_i)):
                t = k / SR
                hat = rng.uniform(-1.0, 1.0) * math.exp(-t * 75.0)
                l_buf[start_i + k] += hat * 0.045
                r_buf[start_i + k] += hat * 0.040
            if step in (0, 5):  # Warm lo-fi kick
                ph = 0.0
                for k in range(min(int(SR * 0.18), n - start_i)):
                    t = k / SR
                    kf = 52.0 + 95.0 * math.exp(-t * 36.0)
                    ph += 2.0 * math.pi * kf / SR
                    kv = math.sin(ph) * math.exp(-t * 14.0) * 0.24
                    l_buf[start_i + k] += kv
                    r_buf[start_i + k] += kv
            if step in (2, 6):  # Brushed snare
                for k in range(min(int(SR * 0.12), n - start_i)):
                    t = k / SR
                    sv = (0.45 * math.sin(2.0 * math.pi * 195.0 * t) + 0.7 * rng.uniform(-1.0, 1.0)) * math.exp(-t * 24.0) * 0.14
                    l_buf[start_i + k] += sv
                    r_buf[start_i + k] += sv

    return l_buf, r_buf


def read_stereo_wav(path: str) -> tuple:
    with wave.open(path, "rb") as wf:
        ch = wf.getnchannels()
        nf = wf.getnframes()
        raw = wf.readframes(nf)
        samples = struct.unpack(f"<{nf * ch}h", raw)
    if ch == 1:
        floats = [s / 32768.0 for s in samples]
        return floats, list(floats)
    l_ch = [samples[i * 2] / 32768.0 for i in range(nf)]
    r_ch = [samples[i * 2 + 1] / 32768.0 for i in range(nf)]
    return l_ch, r_ch


def measure_lufs(audio_path: str) -> dict:
    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-nostats", "-i", audio_path,
            "-af", "loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    txt = proc.stdout + "\n" + proc.stderr
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", txt, re.S)
    if not m:
        raise RuntimeError(f"Could not parse loudnorm JSON from ffmpeg:\n{txt[-600:]}")
    return json.loads(m.group(0))


def main():
    timings_path = os.path.join(REEL_DIR, "beat_timings.json")
    with open(timings_path, "r", encoding="utf-8") as f:
        timings = json.load(f)

    total_dur = float(timings["totalDuration"])
    beats = timings["beats"]
    dialogue_wav = timings["dialogueWav"]

    # 1. Save individual SFX assets in audio/sfx/
    sfx_dir = os.path.join(REEL_DIR, "audio", "sfx")
    music_dir = os.path.join(REEL_DIR, "audio", "music")
    os.makedirs(sfx_dir, exist_ok=True)
    os.makedirs(music_dir, exist_ok=True)

    thump = synth_impact_thump()
    whoosh = synth_whoosh()
    pluck_hi = synth_pluck(587.33)  # D5
    pluck_lo = synth_pluck(440.00)  # A4
    chime = synth_holo_chime()
    rimshot = synth_rimshot()
    beat7_start = next((b["startSec"] for b in beats if b["id"] == 7), 15.0)
    beat9_start = next((b["startSec"] for b in beats if b["id"] == 9), 19.0)
    beat10_end = next((b["speechEndSec"] for b in beats if b["id"] == 10), 26.5)
    beat11_start = next((b["startSec"] for b in beats if b["id"] == 11), 27.0)
    beat12_start = next((b["startSec"] for b in beats if b["id"] == 12), 29.5)
    fan = synth_fan_whir(beat7_start + 0.15)

    for name, s in [
        ("impact_thump.wav", thump),
        ("whoosh.wav", whoosh),
        ("synth_pluck.wav", pluck_hi),
        ("holo_chime.wav", chime),
        ("rimshot.wav", rimshot),
        ("fan_whir.wav", fan),
    ]:
        write_stereo_wav(os.path.join(sfx_dir, name), s, s)

    # 2. Generate original procedural lo-fi score synced with the comedic Beat 10->11 drop
    mus_l, mus_r = generate_lofi_score(total_dur, beat10_end - 0.05, beat11_start - 0.04)
    write_stereo_wav(os.path.join(music_dir, "lofi_groove.wav"), mus_l, mus_r)

    # 3. Assemble SFX bed
    n_samples = int(round(total_dur * SR))
    sfx_l = [0.0] * n_samples
    sfx_r = [0.0] * n_samples
    add_mono_event(sfx_l, sfx_r, thump, 0.00, gain=0.46, pan=0.0)
    add_mono_event(sfx_l, sfx_r, fan, 0.05, gain=0.14, pan=-0.25)
    add_mono_event(sfx_l, sfx_r, whoosh, max(0.0, beats[1]["startSec"] - 0.06), gain=0.22, pan=-0.1)
    add_mono_event(sfx_l, sfx_r, pluck_hi, beats[2]["startSec"], gain=0.28, pan=0.25)
    add_mono_event(sfx_l, sfx_r, pluck_lo, beats[4]["startSec"], gain=0.26, pan=0.25)
    add_mono_event(sfx_l, sfx_r, whoosh, max(0.0, beat7_start - 0.10), gain=0.34, pan=0.0)
    add_mono_event(sfx_l, sfx_r, chime, beat7_start, gain=0.38, pan=0.12)
    add_mono_event(sfx_l, sfx_r, chime, beat9_start, gain=0.30, pan=0.0)
    add_mono_event(sfx_l, sfx_r, rimshot, beat12_start, gain=0.36, pan=0.22)
    add_mono_event(sfx_l, sfx_r, whoosh, max(0.0, total_dur - 0.30), gain=0.24, pan=0.0)

    # 4. Duck music cleanly -12dB relative to foreground dialogue
    dlg_l, dlg_r = read_stereo_wav(dialogue_wav)
    mix_l = [0.0] * n_samples
    mix_r = [0.0] * n_samples
    music_scale = 0.24
    sfx_scale = 0.38
    dlg_scale = 0.92
    for i in range(n_samples):
        dl = dlg_l[i] if i < len(dlg_l) else 0.0
        dr = dlg_r[i] if i < len(dlg_r) else 0.0
        ml = mus_l[i] if i < len(mus_l) else 0.0
        mr = mus_r[i] if i < len(mus_r) else 0.0
        # Extra dynamic duck when voice waveform is active
        speech_mag = abs(dl) + abs(dr)
        duck = 0.68 if speech_mag > 0.04 else 1.0
        mix_l[i] = dl * dlg_scale + ml * music_scale * duck + sfx_l[i] * sfx_scale
        mix_r[i] = dr * dlg_scale + mr * music_scale * duck + sfx_r[i] * sfx_scale

    premaster = os.path.join(REEL_DIR, "voices", "mixed", "premaster_mix.wav")
    master = os.path.join(REEL_DIR, "voices", "mixed", "master_mix.wav")
    write_stereo_wav(premaster, mix_l, mix_r)

    # 5. Two-pass EBU R128 loudnorm (-14 LUFS, -1.2 dBTP, LRA 11) + 192kHz true-peak limiter
    stats = measure_lufs(premaster)
    ln_filter = (
        f"loudnorm=I=-14:TP=-1.2:LRA=11:"
        f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
        f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
        f"offset={stats['target_offset']}:linear=true,"
        f"aresample=192000,alimiter=limit=0.8318:attack=10:release=200:level=disabled,"
        f"aresample=48000"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", premaster,
            "-af", ln_filter,
            "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le",
            "-t", f"{total_dur:.4f}",
            master,
        ],
        check=True,
    )
    final_stats = measure_lufs(master)
    print(
        f"[AudioMaster] Mastered {master} -> Integrated={final_stats['input_i']} LUFS, "
        f"TruePeak={final_stats['input_tp']} dBTP, LRA={final_stats['input_lra']} LU"
    )


if __name__ == "__main__":
    main()
