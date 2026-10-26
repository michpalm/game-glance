"""Compare paired CEF card captures (Clean or normal). Requires Pillow; writes pixel-metrics.json beside metrics.json."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

folder = Path(sys.argv[1])
rows = json.loads((folder / 'metrics.json').read_text())
results = []
for row in rows:
    name = row['name']
    page = Image.open(folder / (name + '-page.png')).convert('RGB')
    bridge = Image.open(folder / (name + '-bridge.png')).convert('RGB')
    if page.size != bridge.size:
        raise ValueError('Capture dimensions changed: ' + name)
    sx, sy = page.width / row['viewport'][0], page.height / row['viewport'][1]
    regions = row['panels'] if row.get('cardErrors') else [row['panel']]
    for card, region in enumerate(regions):
        x, y, w, h = region
        bounds = (round(x*sx)+2, round(y*sy)+2, round((x+w)*sx)-2, round((y+h)*sy)-2)
        a, b = page.crop(bounds), bridge.crop(bounds)
        diff = ImageChops.difference(a, b)
        def ink(im):
            r, g, blue = im.split()
            return ImageChops.darker(ImageChops.darker(r, g), blue).point(lambda p: 255 if p > 180 else 0)
        ia, ib = ink(a), ink(b)
        mask = ImageChops.lighter(ia, ib)
        ink_error = sum(ImageStat.Stat(diff, mask=mask).mean) / 3
        pixel_error = sum(ImageStat.Stat(diff).mean) / 3
        result = {'name': name + (f'-card{card + 1}' if len(regions) > 1 else ''), 'panelMeanRGBError': pixel_error, 'brightTextMeanRGBError': ink_error,
                  'pageInkBounds': ia.getbbox(), 'bridgeInkBounds': ib.getbbox(),
                  'ok': ink_error < 5 and row['ok']}
        results.append(result)
        print(result['name'], 'PASS' if result['ok'] else 'REVIEW', round(pixel_error, 4), round(ink_error, 4))
(folder / 'pixel-metrics.json').write_text(json.dumps(results, indent=2) + '\n')
if any(not r['ok'] for r in results):
    sys.exit(1)
