# GPU-only talking-head avatar service (Hallo — diffusion-based, audio-driven
# portrait animation: github.com/fudan-generative-vision/hallo). Realistic
# results, but genuinely needs CUDA — some ops have no CPU fallback. Build
# and run this on a GPU host; there is no CPU path for this image.
#
# NOT built/tested against a live GPU in this repo's dev environment — build
# and smoke-test it on your target GPU host before wiring it into
# docker-compose.gpu.yml's active stack.
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Ubuntu 22.04 ships python3.10 by default — matches Hallo's documented
# requirement (no need for a separate python install).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv ffmpeg git git-lfs curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN git clone --depth 1 https://github.com/fudan-generative-vision/hallo.git hallo

WORKDIR /app/hallo
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir .

# Pretrained weights (~10GB+) are lazily fetched at container start into a
# mounted volume (see entrypoint.sh) rather than baked in here — same
# reasoning as the xtts service: keeps this image buildable without a
# multi-GB layer, and the download persists across rebuilds.
COPY entrypoint.sh /app/entrypoint.sh
COPY server.py /app/hallo/server.py
RUN chmod +x /app/entrypoint.sh

EXPOSE 8093
ENTRYPOINT ["/app/entrypoint.sh"]
