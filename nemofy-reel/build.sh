#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

echo "=== [1/4] Checking VoiceStudio & Generating 13 Dialogue Beats ==="
if ! curl -sf http://127.0.0.1:3900/health >/dev/null 2>&1; then
  echo "ERROR: Local VoiceStudio daemon is not running on 127.0.0.1:3900" >&2
  exit 1
fi
python3 "$HERE/scripts/generate_voices.py"

echo "=== [2/4] Synthesizing Score + SFX & Mastering -14 LUFS Mix ==="
python3 "$HERE/scripts/mix_audio.py"

echo "=== [3/4] Building Blender Project & Rendering 1080x1920 30FPS Sequence ==="
python3 "$HERE/scripts/render_and_compose.py"

echo "=== [4/4] Done! Output ready at $HERE/final/nemofy_reel.mp4 ==="
ls -lh "$HERE/final/"
