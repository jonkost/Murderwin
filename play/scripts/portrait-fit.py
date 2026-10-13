#!/usr/bin/env python3
"""Measure where the drawing sits inside each portrait, so the character
card can size every figure the same whatever the empty space around it.

Run after adding or changing a portrait:
    python3 play/scripts/portrait-fit.py
Writes play/src/lib/portrait-fit.json: for each character, the drawn box as
fractions of the image (top, bottom, left, right)."""
import json, os, sys
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', 'public', 'portraits')
out = os.path.join(here, '..', 'src', 'lib', 'portrait-fit.json')
fit = {}
for name in sorted(os.listdir(src)):
    stem, ext = os.path.splitext(name)
    if ext.lower() not in ('.png', '.jpg', '.jpeg'):
        continue
    im = Image.open(os.path.join(src, name)).convert('RGBA')
    w, h = im.size
    box = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if not box:
        continue
    l, t, r, b = box
    fit[stem] = {'top': round(t / h, 4), 'bottom': round(b / h, 4), 'left': round(l / w, 4), 'right': round(r / w, 4)}
    print(f'{stem:14s} drawn {(b-t)/h:.0%} tall, {(r-l)/w:.0%} wide')
with open(out, 'w') as f:
    json.dump(fit, f, indent=1, sort_keys=True)
    f.write('\n')
print(f'{len(fit)} portraits measured')
