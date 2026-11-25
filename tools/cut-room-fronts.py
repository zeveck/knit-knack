#!/usr/bin/env python3
"""Cut the room's front layers from a room picture.

usage: python3 tools/cut-room-fronts.py game/assets/bg/room-land.json [...]

Reads each JSON's `fronts` (polygons as fractions of the picture), cuts each
polygon out of the picture with a 2 px feathered alpha (everything outside is
transparent), crops it to the polygon's bbox (+3 px) and writes
bg/<file>. Writes the crop's `offset` [x, y] and `size` [w, h] (fractions of
the picture) back into the JSON. Draw each front at offset/size over the
backdrop and it lines up to the pixel.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

FEATHER = 2   # px, gaussian radius on the mask edge
PAD = 3

def cut(json_path):
    base = os.path.dirname(json_path)
    spec = json.load(open(json_path))
    pic = Image.open(os.path.join(base, spec['image'])).convert('RGBA')
    W, H = pic.size
    for fid, f in spec['fronts'].items():
        mask = Image.new('L', (W * 4, H * 4), 0)   # 4x supersampled polygon
        for poly in f['polygons']:
            ImageDraw.Draw(mask).polygon([(x * W * 4, y * H * 4) for x, y in poly], fill=255)
        mask = mask.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(FEATHER / 2))
        x0, y0, x1, y1 = mask.getbbox()
        x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
        x1, y1 = min(W, x1 + PAD), min(H, y1 + PAD)
        out = pic.copy()
        out.putalpha(mask)
        out = out.crop((x0, y0, x1, y1))
        out.save(os.path.join(base, f['file']), optimize=True)
        f['offset'] = [round(x0 / W, 5), round(y0 / H, 5)]
        f['size'] = [round((x1 - x0) / W, 5), round((y1 - y0) / H, 5)]
        print(f"{f['file']}: {x1-x0}x{y1-y0} at ({x0},{y0})")
    json.dump(spec, open(json_path, 'w'), indent=1)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        cut(p)
