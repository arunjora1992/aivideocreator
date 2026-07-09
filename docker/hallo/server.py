"""HTTP wrapper around Hallo's scripts/inference.py — one subprocess per
request, same convention as docker/wav2lip/server.py. GPU-only: some of
Hallo's ops have no CPU fallback, there is no degraded CPU mode.
"""
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HALLO_DIR = "/app/hallo"
MODELS_DIR = os.path.join(HALLO_DIR, "pretrained_models")

state = {"ready": os.path.isdir(MODELS_DIR) and bool(os.listdir(MODELS_DIR))}


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
            return self._json(503, {"ready": False, "error": "pretrained_models missing"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            face = payload["facePath"]
            audio = payload["audioPath"]
            out = payload["outVideo"]
            os.makedirs(os.path.dirname(out), exist_ok=True)
            proc = subprocess.run(
                [
                    "python3", "scripts/inference.py",
                    "--source_image", face,
                    "--driving_audio", audio,
                    "--output", out,
                ],
                cwd=HALLO_DIR,
                capture_output=True,
                text=True,
                timeout=3600,
            )
            if proc.returncode != 0:
                return self._json(500, {"error": (proc.stderr or proc.stdout)[-2000:]})
            self._json(200, {"ok": True})
        except Exception as e:  # noqa: BLE001
            self._json(500, {"error": str(e)})

    def log_message(self, fmt, *args):
        print("hallo: " + (fmt % args), flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8093), Handler).serve_forever()
