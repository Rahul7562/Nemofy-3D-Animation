#!/usr/bin/env python3
"""
Generate all 13 dialogue beats for the Nemofy StudentHub Instagram Reel via
the local VoiceStudio HTTP service (Piper neural ONNX models: leo.onnx & nemo.onnx),
trim excessive padding, measure exact durations, extract 30-FPS lip-sync envelopes,
and write the authoritative beat_timings.json + SRT/ASS safe-zone subtitles.
"""

import json
import math
import os
import struct
import subprocess
import urllib.request
import wave

VOICESTUDIO_URL = os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900")
REEL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30

# 13 calibrated beats matching /nemofy-reel/script.txt
# Spoken strings expand numbers/abbreviations cleanly for natural TTS pronunciation
# while display text retains crisp digits/symbols for Instagram-safe captions.
BEATS = [
    {
        "id": 1,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "urgent panicked college student, energetic fast delivery",
        "speed": 1.12,
        "gapAfter": 0.14,
        "camera": "crash-zoom",
        "speakerAction": "facepalm-react",
        "listenerAction": "playful-roast",
        "emotion": "panic-urgency",
        "card": "3 HOURS WASTED INSTALLING",
        "ttsText": "Stop wasting three hours installing broken Verilog tools.",
        "subtitle": "Stop wasting 3 hours installing broken Verilog tools.",
    },
    {
        "id": 2,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "confused exasperated young male student, natural conversational",
        "speed": 1.08,
        "gapAfter": 0.14,
        "camera": "establishing-wide",
        "speakerAction": "panic-react",
        "listenerAction": "idle",
        "emotion": "frustrated",
        "card": "",
        "ttsText": "Wait a second. Why does my laptop sound like a jet?",
        "subtitle": "Wait a second. Why does my laptop sound like a jet?",
    },
    {
        "id": 3,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "playful witty teasing female AI companion, sassy roast",
        "speed": 1.08,
        "gapAfter": 0.14,
        "camera": "close-up",
        "speakerAction": "playful-roast",
        "listenerAction": "chin-think",
        "emotion": "playful-sarcasm",
        "card": "",
        "ttsText": "Leo, you downloaded forty gigabytes for an AND gate.",
        "subtitle": "Leo, you downloaded 40GB for an AND gate.",
    },
    {
        "id": 4,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "sheepish defensive young male student, conversational comeback",
        "speed": 1.05,
        "gapAfter": 0.14,
        "camera": "close-up",
        "speakerAction": "head-scratch",
        "listenerAction": "idle",
        "emotion": "sheepish",
        "card": "",
        "ttsText": "My T A insisted.",
        "subtitle": "My TA insisted.",
    },
    {
        "id": 5,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "amused sharp teasing female AI companion, banter",
        "speed": 1.08,
        "gapAfter": 0.12,
        "camera": "dolly-in",
        "speakerAction": "playful-roast",
        "listenerAction": "panic-react",
        "emotion": "teasing-urgency",
        "card": "",
        "ttsText": "Wait. That forty gigabyte installer freezes before eleven fifty-nine?",
        "subtitle": "Wait. That 40GB installer freezes before 11:59?",
    },
    {
        "id": 6,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "urgent pleading college student, natural panicked",
        "speed": 1.10,
        "gapAfter": 0.16,
        "camera": "close-up",
        "speakerAction": "chin-think",
        "listenerAction": "playful-roast",
        "emotion": "desperate",
        "card": "",
        "ttsText": "I'm totally cooked. What else works?",
        "subtitle": "I'm totally cooked. What else works?",
    },
    {
        "id": 7,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "confident crisp witty female AI companion, energetic reveal",
        "speed": 1.08,
        "gapAfter": 0.14,
        "camera": "dolly-in",
        "speakerAction": "energetic-wave",
        "listenerAction": "chin-think",
        "emotion": "confident-reveal",
        "card": "NEMOFY.TECH  ->  STUDENTHUB",
        "ttsText": "Open Nemofy dot tech. Tap StudentHub.",
        "subtitle": "Open Nemofy.tech. Tap StudentHub.",
    },
    {
        "id": 8,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "surprised curious young male student, conversational",
        "speed": 1.08,
        "gapAfter": 0.14,
        "camera": "close-up",
        "speakerAction": "head-scratch",
        "listenerAction": "idle",
        "emotion": "curious-relief",
        "card": "",
        "ttsText": "Wait, no setup? Zero install.",
        "subtitle": "Wait, no setup? Zero install.",
    },
    {
        "id": 9,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "bright energetic confident female AI companion, triumphant",
        "speed": 1.10,
        "gapAfter": 0.12,
        "camera": "dolly-in",
        "speakerAction": "energetic-wave",
        "listenerAction": "celebrate",
        "emotion": "triumphant",
        "card": "LIVE VERILOG IN CHROME",
        "ttsText": "It's one hundred percent free inside Chrome, with live Verilog waveforms and Python.",
        "subtitle": "100% free in Chrome — live Verilog waveforms & Python.",
    },
    {
        "id": 10,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "fast energetic enthusiastic female AI companion",
        "speed": 1.12,
        "gapAfter": 0.28,  # crisp comedic drop right before Leo's disbelief payoff!
        "camera": "orbit",
        "speakerAction": "celebrate",
        "listenerAction": "chin-think",
        "emotion": "energetic",
        "card": "",
        "ttsText": "It runs C plus plus, Java, binary math, and Word to P D F too.",
        "subtitle": "Runs C++, Java, binary math, and Word to PDF too.",
    },
    {
        "id": 11,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "amazed comedic disbelief young male student",
        "speed": 1.08,
        "gapAfter": 0.14,
        "camera": "close-up",
        "speakerAction": "facepalm-react",
        "listenerAction": "playful-roast",
        "emotion": "amazed",
        "card": "",
        "ttsText": "You fixed my three hour panic in twelve seconds?",
        "subtitle": "You fixed my 3-hour panic in 12 seconds?",
    },
    {
        "id": 12,
        "speaker": "nemo",
        "voice": "nemo",
        "instruct": "sassy witty playful female AI companion, tease",
        "speed": 1.08,
        "gapAfter": 0.16,
        "camera": "close-up",
        "speakerAction": "playful-roast",
        "listenerAction": "head-scratch",
        "emotion": "witty-jab",
        "card": "",
        "ttsText": "Twelve for Verilog. Two hours to forgive yourself.",
        "subtitle": "12 for Verilog. 2 hours to forgive yourself.",
    },
    {
        "id": 13,
        "speaker": "leo",
        "voice": "leo",
        "instruct": "warm confident relatable male student, natural CTA",
        "speed": 1.08,
        "gapAfter": 0.35,  # clean loop breath into Frame 1
        "camera": "establishing-wide",
        "speakerAction": "celebrate",
        "listenerAction": "energetic-wave",
        "emotion": "loop-cta",
        "card": "SAVE THIS  //  NEMOFY.TECH",
        "ttsText": "Save this tonight. Stop wasting time on broken tools.",
        "subtitle": "Save this tonight. Stop wasting time on broken tools.",
    },
]


def synthesize_voicestudio(text: str, voice: str, instruct: str, speed: float, raw_out: str) -> None:
    payload = json.dumps({
        "input": text,
        "voice": voice,
        "language": "en",
        "speed": speed,
        "instruct": instruct,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{VOICESTUDIO_URL}/v1/audio/speech",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(raw_out, "wb") as f:
        f.write(data)


def trim_and_normalize_beat_wav(raw_wav: str, clean_wav: str, max_speech_sec: float = 3.75) -> float:
    # Trim leading/trailing dead air aggressively (-44 dB) with tiny fades so dialogue flows crisply
    tmp_trim = raw_wav + ".trim.wav"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", raw_wav,
            "-af",
            "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB,"
            "areverse,silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB,areverse,"
            "afade=t=in:st=0:d=0.012,aresample=48000",
            "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le",
            tmp_trim,
        ],
        check=True,
    )
    dur = float(
        subprocess.check_output(
            [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", tmp_trim,
            ],
            text=True,
        ).strip()
    )
    if dur > max_speech_sec:
        tempo = min(1.22, max(1.0, dur / max_speech_sec))
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", tmp_trim,
                "-af", f"atempo={tempo:.4f},aresample=48000",
                "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le",
                clean_wav,
            ],
            check=True,
        )
        dur = float(
            subprocess.check_output(
                [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", clean_wav,
                ],
                text=True,
            ).strip()
        )
    else:
        os.replace(tmp_trim, clean_wav)
    return dur


def extract_lipsync_envelope(wav_path: str, duration_sec: float, fps: int = FPS) -> list:
    with wave.open(wav_path, "rb") as wf:
        sr = wf.getframerate()
        nframes = wf.getnframes()
        raw = wf.readframes(nframes)
        samples = struct.unpack(f"<{nframes}h", raw)

    num_video_frames = max(1, int(round(duration_sec * fps)))
    samples_per_frame = max(1, int(sr / fps))
    env = []
    for f_idx in range(num_video_frames):
        s0 = f_idx * samples_per_frame
        s1 = min(len(samples), s0 + samples_per_frame)
        if s0 >= len(samples):
            env.append({"mouthOpenness": 0.0, "energy": 0.0})
            continue
        chunk = samples[s0:s1]
        rms = math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))) / 32768.0
        openness = min(1.0, max(0.0, rms * 5.2))
        env.append({"mouthOpenness": round(openness, 3), "energy": round(min(1.0, rms * 4.5), 3)})
    return env


def fmt_srt_time(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms_rem = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms_rem:03d}"


def fmt_ass_time(t: float) -> str:
    cs = int(round(max(0.0, t) * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs_rem = divmod(rem, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs_rem:02d}"


def build_subtitles(timeline_beats: list, total_dur: float):
    srt_lines = []
    for i, b in enumerate(timeline_beats, 1):
        speaker_tag = "LEO" if b["speaker"] == "leo" else "NEMO"
        srt_lines.append(
            f"{i}\n{fmt_srt_time(b['startSec'])} --> {fmt_srt_time(b['speechEndSec'])}\n"
            f"[{speaker_tag}] {b['subtitle']}\n"
        )
    srt_content = "\n".join(srt_lines)
    for dest in (
        os.path.join(REEL_DIR, "subtitles", "nemofy_reel.srt"),
        os.path.join(REEL_DIR, "final", "nemofy_reel.srt"),
    ):
        with open(dest, "w", encoding="utf-8") as f:
            f.write(srt_content)

    # ASS Styled Subtitles strictly inside Instagram Safe Zone on 1080x1920:
    # Top >= 230, Bottom <= 1440, Right edge clear >= 230px (MarginR=245, MarginL=55 -> x in [55..835])!
    ass_header = """[Script Info]
Title: Nemofy StudentHub Reel
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HookCard,DejaVu Sans,44,&H00FFFFFF,&H00FFFFFF,&H0012100E,&HB80F172A,-1,0,0,0,100,100,1.2,0,3,18,0,8,55,245,255,1
Style: LeoLine,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H001A120A,&HC2101A38,-1,0,0,0,100,100,0.4,0,3,16,0,2,55,245,505,1
Style: NemoLine,DejaVu Sans,46,&H00A8FAFF,&H00FFFFFF,&H00120E18,&HC2381912,-1,0,0,0,100,100,0.4,0,3,16,0,2,55,245,505,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for b in timeline_beats:
        style = "LeoLine" if b["speaker"] == "leo" else "NemoLine"
        prefix = "{\\c&HFFCA7A&}LEO{\\c&HFFFFFF&}: " if b["speaker"] == "leo" else "{\\c&H6EE7B7&}NEMO{\\c&HA8FAFF&}: "
        txt = b["subtitle"].replace("\n", "\\N")
        events.append(
            f"Dialogue: 0,{fmt_ass_time(b['startSec'])},{fmt_ass_time(b['speechEndSec'])},{style},,0,0,0,,{prefix}{txt}"
        )
        if b.get("card"):
            # Show Hook/Feature Card cleanly at top safe zone (y ~ 260 via Alignment=8 + MarginV=255)
            card_end = min(total_dur, b["endSec"] + (0.45 if b["id"] in (1, 7, 9, 13) else 0.0))
            events.append(
                f"Dialogue: 1,{fmt_ass_time(b['startSec'])},{fmt_ass_time(card_end)},HookCard,,0,0,0,,{{\\fad(90,120)}}{b['card']}"
            )

    ass_path = os.path.join(REEL_DIR, "subtitles", "nemofy_reel.ass")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_header + "\n".join(events) + "\n")


def main():
    tmp_dir = os.path.join(REEL_DIR, "voices", "_raw")
    os.makedirs(tmp_dir, exist_ok=True)

    cursor_sec = 0.0
    cursor_frame = 1
    timeline_beats = []
    concat_parts = []

    print("[VoiceStudio] Synthesizing 13 beats using distinct Piper neural ONNX voices (leo.onnx & nemo.onnx)...")
    for b in BEATS:
        bid = b["id"]
        spk = b["speaker"]
        raw_wav = os.path.join(tmp_dir, f"beat_{bid:02d}_{spk}_raw.wav")
        clean_wav = os.path.join(REEL_DIR, "voices", spk, f"beat_{bid:02d}_{spk}.wav")

        synthesize_voicestudio(b["ttsText"], b["voice"], b["instruct"], b["speed"], raw_wav)
        cap_sec = 2.75 if bid == 1 else 3.70
        speech_dur = trim_and_normalize_beat_wav(raw_wav, clean_wav, max_speech_sec=cap_sec)
        gap = b["gapAfter"]

        # Create exact-duration padded WAV for frame-locked dialogue assembly
        total_beat_dur = speech_dur + gap
        dur_frames = max(18, int(round(total_beat_dur * FPS)))
        snapped_beat_dur = dur_frames / float(FPS)

        padded_wav = os.path.join(tmp_dir, f"beat_{bid:02d}_{spk}_padded.wav")
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", clean_wav,
                "-af", f"apad=whole_dur={snapped_beat_dur:.4f}",
                "-t", f"{snapped_beat_dur:.4f}",
                "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le",
                padded_wav,
            ],
            check=True,
        )
        concat_parts.append(padded_wav)

        lip_env = extract_lipsync_envelope(padded_wav, snapped_beat_dur, FPS)
        start_f = cursor_frame
        end_f = cursor_frame + dur_frames  # exclusive

        entry = {
            **b,
            "wavPath": clean_wav,
            "paddedWavPath": padded_wav,
            "startSec": round(cursor_sec, 4),
            "speechEndSec": round(cursor_sec + speech_dur, 4),
            "endSec": round(cursor_sec + snapped_beat_dur, 4),
            "speechDuration": round(speech_dur, 4),
            "durationSeconds": round(snapped_beat_dur, 4),
            "startFrame": start_f,
            "endFrame": end_f,
            "lipSyncEnvelope": lip_env,
        }
        timeline_beats.append(entry)
        print(
            f"  Beat {bid:02d} ({spk.upper():4s}): {speech_dur:.2f}s speech + {snapped_beat_dur-speech_dur:.2f}s gap "
            f"= {snapped_beat_dur:.2f}s | frames [{start_f}..{end_f - 1}] | \"{b['subtitle']}\""
        )
        cursor_sec += snapped_beat_dur
        cursor_frame = end_f

    total_frames = cursor_frame - 1
    total_dur = total_frames / float(FPS)
    print(f"[VoiceStudio] Total timeline: {total_dur:.2f}s ({total_frames} frames @ {FPS} FPS)")

    if not (30.0 <= total_dur <= 40.0):
        raise RuntimeError(f"Timeline duration {total_dur:.2f}s outside required 30-40s range!")

    # Concatenate full dialogue track & apply subtle voice compression + EQ polish
    list_txt = os.path.join(tmp_dir, "concat.txt")
    with open(list_txt, "w", encoding="utf-8") as f:
        for p in concat_parts:
            f.write(f"file '{p}'\n")

    dialogue_raw = os.path.join(tmp_dir, "dialogue_concat.wav")
    dialogue_full = os.path.join(REEL_DIR, "voices", "mixed", "dialogue_full.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list_txt, "-c", "copy", dialogue_raw],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", dialogue_raw,
            "-af", "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=80:makeup=3dB,alimiter=limit=0.92",
            "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le",
            dialogue_full,
        ],
        check=True,
    )

    build_subtitles(timeline_beats, total_dur)

    timings_out = {
        "fps": FPS,
        "width": 1080,
        "height": 1920,
        "totalFrames": total_frames,
        "totalDuration": round(total_dur, 4),
        "dialogueWav": dialogue_full,
        "beats": timeline_beats,
    }
    timings_path = os.path.join(REEL_DIR, "beat_timings.json")
    with open(timings_path, "w", encoding="utf-8") as f:
        json.dump(timings_out, f, indent=2)
    print(f"[VoiceStudio] Wrote {timings_path} and subtitles/*.srt/*.ass successfully.")


if __name__ == "__main__":
    main()
