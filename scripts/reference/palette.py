"""Download the set at working res and extract palettes with real coverage ratios."""
import json, os, sys, colorsys, urllib.request
from PIL import Image
import numpy as np

SP = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(SP, "img")
os.makedirs(IMG, exist_ok=True)
items = json.load(open(os.path.join(SP, "art-set.json"), encoding="utf-8"))


def fetch(mid, path, width=1000):
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return
    url = f"https://iiif.micr.io/{mid}/full/{width},/0/default.jpg"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 research"})
    with urllib.request.urlopen(req, timeout=90) as r, open(path, "wb") as f:
        f.write(r.read())


def hexof(rgb):
    return "#{:02X}{:02X}{:02X}".format(*[int(c) for c in rgb])


def analyse(path, k=6):
    im = Image.open(path).convert("RGB")
    im.thumbnail((300, 300))
    q = im.quantize(colors=k, method=Image.MEDIANCUT)
    pal = np.array(q.getpalette()[: k * 3]).reshape(-1, 3)
    counts = np.bincount(np.array(q).ravel(), minlength=k).astype(float)
    counts /= counts.sum()
    order = np.argsort(-counts)
    swatches = [(hexof(pal[i]), round(counts[i] * 100, 1)) for i in order]

    a = np.asarray(im).reshape(-1, 3) / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in a[:: max(1, len(a) // 4000)]])
    return {
        "swatches": swatches,
        "mean_sat": round(float(hsv[:, 1].mean()), 3),
        "mean_val": round(float(hsv[:, 2].mean()), 3),
        # how much of the canvas is dark/ground vs light: drives field/figure ratio
        "dark_pct": round(float((hsv[:, 2] < 0.32).mean()) * 100, 1),
        "light_pct": round(float((hsv[:, 2] > 0.78).mean()) * 100, 1),
        "chroma_pct": round(float((hsv[:, 1] > 0.45).mean()) * 100, 1),
    }


out = []
for it in items:
    p = os.path.join(IMG, f"{it['micrioId']}.jpg")
    try:
        fetch(it["micrioId"], p)
        r = analyse(p)
    except Exception as e:
        print("ERR", it["objectNumber"], e, file=sys.stderr)
        continue
    it.update(r)
    out.append(it)
    sw = "  ".join(f"{h} {pc:>4}%" for h, pc in r["swatches"][:5])
    print(f"{it['objectNumber']:<20} {sw}")
    print(f"{'':<20} sat {r['mean_sat']:.2f}  val {r['mean_val']:.2f}  "
          f"dark {r['dark_pct']:>4}%  light {r['light_pct']:>4}%  chromatic {r['chroma_pct']:>4}%   {it['title'][:38]}")

json.dump(out, open(os.path.join(SP, "art-set-palette.json"), "w", encoding="utf-8"), indent=1)
print(f"\n{len(out)} analysed -> art-set-palette.json")
