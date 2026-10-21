# Mean brightness of bands near the top of each screencast frame, to spot a blink in an open or a back.
# Usage: python3 -I scripts/frame-bands.py <trialDir>   (frames from scripts/cef-open-probe.mjs; needs Pillow)
# Columns: top bands y 0-8, 8-20, 20-40, 40-70 over x 25%-70%, then the corners y 0-24 (left x 0-25%, right x 70-100%).
# Band edges are for a 640 px wide frame and scale with the frame's own width.
import os
import sys
from PIL import Image, ImageStat

if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
    sys.exit('Usage: python3 -I scripts/frame-bands.py <trialDir>')
d = sys.argv[1]
TOP = [(0, 8), (8, 20), (20, 40), (40, 70)]
TOP_JUMP, CORNER_JUMP = 3, 1.5


def mean(im, box):
    return ImageStat.Stat(im.crop(box)).mean[0]


prev = None
jumps = []
print('    ms    y0-8  y8-20 y20-40 y40-70   left  right')
for name in sorted(f for f in os.listdir(d) if f.endswith('.jpg')):
    im = Image.open(os.path.join(d, name)).convert('L')
    w, _ = im.size
    k = w / 640
    top = [mean(im, (int(w * .25), round(y0 * k), int(w * .70), round(y1 * k))) for y0, y1 in TOP]
    corners = [mean(im, (0, 0, int(w * .25), round(24 * k))), mean(im, (int(w * .70), 0, w, round(24 * k)))]
    vals = top + corners
    print(name[:-4].rjust(6), ' '.join(f'{v:6.1f}' for v in vals))
    if prev is not None:
        # The first three top bands and the two corners; y 40-70 is the page itself and moves with it.
        moved = any(abs(top[j] - prev[j]) > TOP_JUMP for j in range(3)) or any(abs(corners[j] - prev[4 + j]) > CORNER_JUMP for j in range(2))
        if moved:
            jumps.append(f'{name[:-4].rjust(6)} ' + ' '.join(f'{p:5.1f}->{v:5.1f}' for p, v in zip(prev, vals) if abs(p - v) > 0))
    prev = vals
print('jumps:', 'none' if not jumps else '')
for line in jumps:
    print(' ', line)
