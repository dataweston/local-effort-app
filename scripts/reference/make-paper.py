"""Cut a tileable paper ground out of the reference sheets themselves.

Two earlier passes failed usefully. Scoring by luminance stddev produced anemone
wallpaper (on a covered sheet the least-busy window still holds stems), so this
scores by EDGE ENERGY plus a chroma penalty instead. Then trimming a 1000px
proxy flattened the grain to nothing, so once the window is chosen we go back to
IIIF and refetch THAT REGION at native resolution -- which is the whole point of
having an Image API: the fibre is in the source at 6000px and nowhere else.
"""
import os, sys, json, urllib.request
from PIL import Image, ImageFilter
import numpy as np

SP = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
TILE, STEP, PROXY_W = 256, 12, 1000
SOURCES = ["jaTqd", "XVgSo", "GMEXG", "SfbIN", "XcYvw"]

meta = {i["micrioId"]: i for i in json.load(open(os.path.join(SP, "art-set-palette.json"), encoding="utf-8"))}


def score(mid):
    im = Image.open(os.path.join(SP, "img", mid + ".jpg")).convert("RGB")
    edge = np.asarray(im.convert("L").filter(ImageFilter.FIND_EDGES), dtype=float)
    rgb = np.asarray(im, dtype=float)
    chroma = rgb.max(2) - rgb.min(2)
    h, w = edge.shape
    # Stay just off the sheet's own edge -- an earlier run picked x=2 and tiled
    # the paper's left border into a seam. Keep this small: a 10% inset walks
    # the window off the empty margin and back onto the drawing, which is the
    # opposite failure. The border itself is trimmed at the crop below.
    mx, my = 40, 40
    best = None
    for y in range(my, h - TILE - my, STEP):
        for x in range(mx, w - TILE - mx, STEP):
            e = edge[y + 2:y + TILE - 2, x + 2:x + TILE - 2]
            c = chroma[y:y + TILE, x:x + TILE]
            cost = e.mean() + 0.9 * c.mean() + 0.4 * np.percentile(c, 98)
            if best is None or cost < best[0]:
                best = (cost, x, y)
    return best + (im.size, mid)


cost, px, py, proxy_size, mid = min((score(m) for m in SOURCES), key=lambda t: t[0])
scale = meta[mid]["w"] / proxy_size[0]
rx, ry, rw = int(px * scale), int(py * scale), int(TILE * scale)
url = f"https://iiif.micr.io/{mid}/{rx},{ry},{rw},{rw}/512,/0/default.jpg"
print(f"source {mid} ({meta[mid]['objectNumber']})  proxy patch ({px},{py})  cost {cost:.2f}")
print(f"native region {rx},{ry},{rw},{rw} of {meta[mid]['w']}x{meta[mid]['h']}\n{url}")

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 research"})
raw = os.path.join(SP, "paper-native.jpg")
with urllib.request.urlopen(req, timeout=120) as r, open(raw, "wb") as f:
    f.write(r.read())

patch = Image.open(raw).convert("RGB")
# trim the outer 12% before tiling: whatever sheet edge or plate mark survived
# the search lives at the rim, and mirror-tiling would repeat it as a seam
m = int(patch.size[0] * 0.12)
patch = patch.crop((m, m, patch.size[0] - m, patch.size[1] - m))
T = patch.size[0]
big = Image.new("RGB", (T * 2, T * 2))
big.paste(patch, (0, 0))
big.paste(patch.transpose(Image.FLIP_LEFT_RIGHT), (T, 0))
big.paste(patch.transpose(Image.FLIP_TOP_BOTTOM), (0, T))
big.paste(patch.transpose(Image.ROTATE_180), (T, T))
big = big.resize((512, 512), Image.LANCZOS)

a = np.asarray(big, dtype=float)
# Centre near WHITE, not mid-grey. The first version sat at 128 and was then
# multiplied over the linen field, which is a 50% darken: the cream rendered as
# taupe. At ~244 a multiply only darkens by a few percent, which is what paper
# grain actually is. Contrast is scaled about the mean first so recentering
# does not clip.
a -= a.mean(axis=(0, 1))
a *= 1.9                            # restore fibre amplitude (target stddev ~5)
a += 244
# Raise the floor. The sheet's real foxing spots survive as pixels down at ~28,
# and once tiled at 512px they punch hard enough that the eye finds the repeat.
# Clipping the outliers keeps the fibre and loses the polka dots.
a = np.clip(a, 226, 255)
tile = Image.fromarray(a.astype("uint8"))
tile.save(OUT, "WEBP", quality=88, method=6)
print(f"\nwrote {OUT}  {os.path.getsize(OUT)/1024:.1f} KB  512px  "
      f"grain stddev {np.asarray(tile, dtype=float).std():.1f} (want ~3-9)")
