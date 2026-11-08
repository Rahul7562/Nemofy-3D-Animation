#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AetherFrame 3D — VoiceStudio (k2-fsa/OmniVoice) Hardware-Aware Setup & Launcher
# ==============================================================================

VOICESTUDIO_PORT="${VOICESTUDIO_PORT:-3900}"
PERSISTENT_DIR="${OMNIVOICE_DATA_DIR:-$(pwd)/data/voicestudio}"
CACHE_DIR="${OMNIVOICE_CACHE_DIR:-$PERSISTENT_DIR/cache}"
HF_CACHE_DIR="${HF_HOME:-$PERSISTENT_DIR/hf_cache}"

mkdir -p "$PERSISTENT_DIR" "$CACHE_DIR" "$HF_CACHE_DIR"

echo "=== AetherFrame 3D: Inspecting System Hardware for k2-fsa/OmniVoice ==="
CPU_CORES=$(nproc 2>/dev/null || echo 4)
TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 8192)
DISK_FREE_GB=$(df -BG . 2>/dev/null | awk 'NR==2 {gsub("G","",$4); print $4}' || echo 50)

if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
  GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -n 1)
  TORCH_VARIANT="${OMNIVOICE_TORCH_VARIANT:-cuda}"
  echo "  • GPU Detected        : $GPU_INFO"
else
  TORCH_VARIANT="${OMNIVOICE_TORCH_VARIANT:-cpu}"
  echo "  • GPU Detected        : None (Using CPU Torch variant)"
fi

echo "  • CPU Cores           : $CPU_CORES"
echo "  • System Memory       : ${TOTAL_RAM_MB} MB"
echo "  • Free Disk Space     : ${DISK_FREE_GB} GB"
echo "  • Torch Variant       : $TORCH_VARIANT"
echo "  • Persistent Data Dir : $PERSISTENT_DIR"
echo "  • Model Cache Dir     : $CACHE_DIR"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "Starting VoiceStudio container via Docker Compose on http://localhost:${VOICESTUDIO_PORT}..."
  OMNIVOICE_TORCH_VARIANT="$TORCH_VARIANT" docker compose -f docker-compose.voicestudio.yml up -d
  echo "VoiceStudio started. Health check: curl http://localhost:${VOICESTUDIO_PORT}/health"
  exit 0
fi

VOICESTUDIO_REPO_DIR="$PERSISTENT_DIR/VoiceStudio-repo"
if [ ! -d "$VOICESTUDIO_REPO_DIR" ]; then
  echo "Cloning debpalash/VoiceStudio into $VOICESTUDIO_REPO_DIR..."
  git clone --depth 1 https://github.com/debpalash/VoiceStudio.git "$VOICESTUDIO_REPO_DIR"
fi

echo "Launching VoiceStudio backend on http://localhost:${VOICESTUDIO_PORT} with persistent OmniVoice cache..."
export OMNIVOICE_DATA_DIR="$PERSISTENT_DIR"
export OMNIVOICE_CACHE_DIR="$CACHE_DIR"
export HF_HOME="$HF_CACHE_DIR"
export OMNIVOICE_TORCH_VARIANT="$TORCH_VARIANT"

cd "$VOICESTUDIO_REPO_DIR"
if [ -f "scripts/start.sh" ]; then
  bash scripts/start.sh --port "$VOICESTUDIO_PORT"
else
  python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "$VOICESTUDIO_PORT"
fi
