# Standalone CPU voice-cloning service (Coqui XTTS-v2), separate from the
# main Node image so PyTorch/CUDA-adjacent deps never touch it.
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    TTS_HOME=/models \
    COQUI_TOS_AGREED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# CPU-only torch/torchaudio/torchcodec first (explicit index) so pip never
# pulls CUDA wheels. torchcodec is required for audio IO on torch>=2.9.
RUN pip install --no-cache-dir torch torchaudio torchcodec --index-url https://download.pytorch.org/whl/cpu
# coqui-tts pulls in transformers>=4.57 with no upper bound, which resolves to
# a 5.x release that dropped an internal function coqui-tts's XTTS still
# imports (transformers.pytorch_utils.isin_mps_friendly) — pin below 5.
RUN pip install --no-cache-dir coqui-tts "transformers<5"

WORKDIR /app
COPY server.py .

EXPOSE 8091
CMD ["python3", "server.py"]
