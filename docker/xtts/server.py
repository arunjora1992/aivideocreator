"""Long-lived CPU inference server for Coqui XTTS-v2 voice cloning.

Loads the model once at startup (10-20s+ on CPU) and keeps it resident so
each /synthesize call only pays for inference, not model load.
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

state = {"ready": False, "tts": None, "error": None}


def load_model():
    try:
        from TTS.api import TTS

        state["tts"] = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2").to("cpu")
        state["ready"] = True
        print("xtts: model loaded, ready", flush=True)
    except Exception as e:  # noqa: BLE001
        state["error"] = str(e)
        print(f"xtts: model load failed: {e}", flush=True)


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
            return self._json(200, {"ready": state["ready"], "error": state["error"]})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/synthesize":
            return self._json(404, {"error": "not found"})
        if not state["ready"]:
            return self._json(503, {"ready": False, "error": state["error"]})
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            text = payload["text"]
            ref_audio_path = payload["refAudioPath"]
            out_wav = payload["outWav"]
            state["tts"].tts_to_file(
                text=text, speaker_wav=ref_audio_path, language="en", file_path=out_wav
            )
            self._json(200, {"ok": True})
        except Exception as e:  # noqa: BLE001
            self._json(500, {"error": str(e)})

    def log_message(self, fmt, *args):
        print("xtts: " + (fmt % args), flush=True)


if __name__ == "__main__":
    threading.Thread(target=load_model, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", 8091), Handler).serve_forever()
