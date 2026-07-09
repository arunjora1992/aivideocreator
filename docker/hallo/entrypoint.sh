#!/usr/bin/env bash
# Lazily fetch Hallo's pretrained weights (~10GB+) into the mounted
# hallo_models volume on first run, so the image itself stays small and the
# download survives rebuilds — same reasoning as the xtts service's model
# volume.
set -e
cd /app/hallo

if [ ! -d pretrained_models ] || [ -z "$(ls -A pretrained_models 2>/dev/null)" ]; then
  echo "hallo: downloading pretrained models (first run, ~10GB+, this will take a while)..."
  git lfs install
  git clone https://huggingface.co/fudan-generative-ai/hallo pretrained_models
else
  echo "hallo: pretrained_models already present, skipping download"
fi

exec python3 server.py
