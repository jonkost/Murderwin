#!/usr/bin/env python3
"""The pets' natural voices (12 Nov 2026, Jon: "I need better voices. not robotic at all.").

One run makes many lines. It reads a list of jobs and writes one sound file a job, with the
voice model that is already on this Mac (Kokoro, through the mlx-audio package). It is called by
scripts/pet-voices.mjs; nobody needs to run it by hand.

    python3 scripts/pet-voices-kokoro.py jobs.json

jobs.json: [{ "id": "boo-abc", "voice": "af_bella", "speed": 1.0, "pitch": 1.0, "text": "...", "out": "/tmp/x.wav" }, ...]

speed is the pace the line comes out at (1 is the voice's own). pitch makes the voice younger and
smaller (above 1) or bigger and deeper (below 1): the line is said slower or faster by that much and
the file is marked to play back that much faster or slower, so the pace comes out as asked and the
sound itself is never stretched or squeezed by a filter. 1.2 is about a child; 0.9 a bigger man.

It plays nothing: it only writes files. It downloads nothing: if the model is not on this Mac it
says NO-MODEL and stops, and no pet gets a voice. It prints counts only, never a line's words.
"""
import json
import os
import sys
import wave

os.environ.setdefault("HF_HUB_OFFLINE", "1")  # never download: the model is on this Mac, or this stops
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

MODEL = "mlx-community/Kokoro-82M-bf16"


def main(path):
    with open(path, encoding="utf8") as f:
        jobs = json.load(f)
    try:
        import numpy as np
        from mlx_audio.tts.utils import load_model

        model = load_model(MODEL)
        model.repo_id = MODEL  # the voices are in this same folder on this Mac (the package would look elsewhere)
    except Exception as e:  # the package or the model is not on this Mac
        print(f"NO-MODEL {type(e).__name__}", flush=True)
        return 3
    done = failed = 0
    for job in jobs:
        try:
            voice = job["voice"]
            lang = "b" if voice.startswith("b") else "a"  # a British voice reads with British sounds
            pitch = min(1.5, max(0.7, float(job.get("pitch") or 1.0)))
            speed = float(job.get("speed") or 1.0) / pitch
            parts = [
                np.array(r.audio, dtype=np.float32).reshape(-1)
                for r in model.generate(text=job["text"], voice=voice, speed=speed, lang_code=lang)
            ]
            audio = np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)
            if audio.size < 2400 or not np.isfinite(audio).all():
                raise ValueError("nothing was said")
            pcm = (np.clip(audio, -1.0, 1.0) * 32767.0).astype("<i2")
            with wave.open(job["out"], "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(int(round(model.sample_rate * pitch)))
                w.writeframes(pcm.tobytes())
            done += 1
        except Exception:
            failed += 1
        if (done + failed) % 50 == 0:
            print(f"PROGRESS {done + failed} of {len(jobs)}", flush=True)
    print(f"DONE {done} made, {failed} failed", flush=True)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: pet-voices-kokoro.py jobs.json")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
