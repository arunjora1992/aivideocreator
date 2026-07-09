"""HTTP wrapper around Wav2Lip's inference.py — one subprocess per request.

No persistent model kept resident (unlike the xtts service): Wav2Lip's
inference script is a whole CLI program (argparse, face detection, batching)
rather than an importable function, so shelling out per call is the robust
choice. The checkpoint-load cost (a few seconds) is small next to the
face-detection + inference time each call already takes on CPU.
"""
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

WAV2LIP_DIR = "/app/wav2lip"
CHECKPOINT = os.path.join(WAV2LIP_DIR, "checkpoints", "wav2lip_gan.pth")

state = {"ready": os.path.exists(CHECKPOINT)}


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {"ready": state["ready"]})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/synthesize":
            return self._json(404, {"error": "not found"})
        if not state["ready"]:
            return self._json(503, {"ready": False, "error": "checkpoint missing"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            face = payload["facePath"]
            audio = payload["audioPath"]
            out = payload["outVideo"]
            os.makedirs(os.path.dirname(out), exist_ok=True)
            proc = subprocess.run(
                [
                    "python3", "inference.py",
                    "--checkpoint_path", CHECKPOINT,
                    "--face", face,
                    "--audio", audio,
                    "--outfile", out,
                ],
                cwd=WAV2LIP_DIR,
                capture_output=True,
                text=True,
                timeout=1800,
            )
            if proc.returncode != 0:
                return self._json(500, {"error": (proc.stderr or proc.stdout)[-2000:]})
            self._json(200, {"ok": True})
        except Exception as e:  # noqa: BLE001
            self._json(500, {"error": str(e)})

    def log_message(self, fmt, *args):
        print("wav2lip: " + (fmt % args), flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8092), Handler).serve_forever()
