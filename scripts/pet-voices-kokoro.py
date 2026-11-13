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

accent (optional) gives a voice an accent the model has no voice for. "aussie" and "aussie-light": every
word is read the British way (no r after a vowel), its vowels are moved the way an Australian moves them
(day towards "die", my towards "moy"), and the model is handed those sounds for the word.

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

# The model's signs for the long vowels: A as in "day", I as in "my", Y as in "boy", W as in "now".
# The maker remembers only an accent's NAME beside each file it made. So never change a table in place: give
# the changed table a new name (and add the name to ACCENTS in scripts/pet-voices.mjs), or the files made
# under the old table are kept as if nothing had changed. Jon chose "aussie-light" by ear on 12 Nov 2026.
ACCENTS = {
    "aussie": [("A", "I"), ("I", "Y"), ("ɑː", "aː")],  # the broad shift, in sounds the model knows well
    "aussie-light": [("A", "æɪ"), ("I", "ɑɪ"), ("W", "æʊ"), ("ɑː", "aː")],  # the same shift, half way
}


def shift(sounds, rules):
    """Move a word's vowels: each rule once, left to right, never a moved vowel moved again."""
    out, i = "", 0
    while i < len(sounds):
        for a, b in rules:
            if sounds.startswith(a, i):
                out += b
                i += len(a)
                break
        else:
            out += sounds[i]
            i += 1
    return out


def accented(text, rules, g2p):
    """The line with each changed word followed by its new sounds, in the form the model's reader takes: [word](/sounds/)."""
    _, tokens = g2p(text)
    out = ""
    for k in tokens:
        sounds = k.phonemes
        if sounds and any(c.isalnum() for c in k.text):
            new = shift(sounds, rules)
            if new.endswith("ə") and len(new) > 2:
                new = new[:-1] + "ɐ"  # the open "-er" at the end of a word
            # a word that touches a bracket would break the [word](/sounds/) form and be read out as letters:
            # such a word keeps its plain British sounds
            plain = new == sounds or any(c in "[]()" for c in k.text + new)
            out += k.text if plain else f"[{k.text}](/{new}/)"
        else:
            out += k.text
        out += k.whitespace or ""
    return out


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
            text = job["text"]
            rules = ACCENTS.get(job.get("accent") or "")
            if rules:
                lang = "b"  # the accent is built on the British reading, whatever the voice
                text = accented(text, rules, model._get_pipeline("b").g2p)
            pitch = min(1.5, max(0.7, float(job.get("pitch") or 1.0)))
            speed = float(job.get("speed") or 1.0) / pitch
            parts = [
                np.array(r.audio, dtype=np.float32).reshape(-1)
                for r in model.generate(text=text, voice=voice, speed=speed, lang_code=lang)
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
