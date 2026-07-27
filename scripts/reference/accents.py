"""Separate ground from subject: what is the field, and what is the glow?"""
import json, os, colorsys
from PIL import Image
import numpy as np

SP = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(SP, "art-set-palette.json"), encoding="utf-8"))

PAPER = [i for i in items if i["light_pct"] > 60]
PANEL = [i for i in items if i["light_pct"] <= 60]


def hexof(c):
    return "#{:02X}{:02X}{:02X}".format(*[int(round(x)) for x in c])


def split(it):
    im = Image.open(os.path.join(SP, "img", it["micrioId"] + ".jpg")).convert("RGB")
    im.thumbnail((260, 260))
    a = np.asarray(im).reshape(-1, 3) / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in a])
    sat, val = hsv[:, 1], hsv[:, 2]
    # ground = the modal low-saturation mass; accent = saturated minority
    ground = a[(sat < 0.18)]
    accent = a[(sat > 0.42) & (val > 0.18)]
    return (
        hexof(np.median(ground, 0) * 255) if len(ground) > 40 else None,
        hexof(np.median(accent, 0) * 255) if len(accent) > 40 else None,
        round(100 * len(accent) / len(a), 1),
    )


for name, group in (("PAPER (ground = sheet)", PAPER), ("PANEL (ground = void)", PANEL)):
    print(f"\n=== {name} — {len(group)} works ===")
    grounds, accents, cov = [], [], []
    for it in group:
        g, ac, pct = split(it)
        print(f"  ground {g or '   —   '}   accent {ac or '   —   '}  {pct:>5}% of canvas   {it['title'][:40]}")
        if g: grounds.append(tuple(int(g[i:i + 2], 16) for i in (1, 3, 5)))
        if ac: accents.append(tuple(int(ac[i:i + 2], 16) for i in (1, 3, 5)))
        cov.append(pct)
    print(f"  --> median ground {hexof(np.median(grounds, 0))} | "
          f"median accent {hexof(np.median(accents, 0))} | "
          f"accent covers {np.median(cov):.1f}% (median)")
