# Standalone CPU lip-sync service (Wav2Lip): given a presenter photo + a
# scene's narration audio, produces a talking-head video clip. Own
# container/image, same reasoning as docker/xtts — heavy Python/torch deps
# never touch the main Node image.
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg git curl ca-certificates libsm6 libxext6 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only torch/torchvision first (explicit index) so pip never pulls CUDA wheels.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir "numpy<2" opencv-python-headless librosa==0.9.2 numba tqdm

WORKDIR /app
RUN git clone --depth 1 https://github.com/Rudrabha/Wav2Lip.git wav2lip

# Pretrained weights: the original authors gate these behind a request form,
# so this pulls a widely-used community re-host on Hugging Face instead.
RUN mkdir -p wav2lip/checkpoints wav2lip/face_detection/detection/sfd \
    && curl -fsSL -o wav2lip/checkpoints/wav2lip_gan.pth \
         "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth" \
    && curl -fsSL -o wav2lip/face_detection/detection/sfd/s3fd.pth \
         "https://huggingface.co/camenduru/Wav2Lip/resolve/main/face_detection/detection/sfd/s3fd.pth"

COPY server.py /app/server.py

EXPOSE 8092
CMD ["python3", "server.py"]
