"""Derive one accent per nav destination from a nominated work.

The accent a picture "offers" is the dominant colour among its MOST saturated
pixels -- the poppy, the apple skin, the bird -- not the earth-tone mass that
dominates any k-means over the whole canvas. So: take the top saturation
percentile, cluster that, report the largest group.
"""
import os, colorsys, sys
from PIL import Image
import numpy as np

SP = os.path.dirname(os.path.abspath(__file__))

PICKS = [
    ("weekly-meals",  "OHDPD", "Coorte, Still Life with Asparagus"),
    ("small-events",  "GMEXG", "Henstenburgh, Flowers in a Glass Vase"),
    ("local-pizza",   "jaTqd", "de Boodt, Appel (Malus domestica)"),
    ("for-business",  "XVgSo", "van Gogh, Farm in Provence"),
    ("shop",          "aXnzA", "Avercamp, Winter Landscape"),
    ("about",         "BaFQb", "Hondecoeter, The Floating Feather"),
]

hexof = lambda c: "#{:02X}{:02X}{:02X}".format(*[int(round(x)) for x in c])


def kmeans(px, k, iters=20):
    rng = np.random.default_rng(7)
    cen = px[rng.choice(len(px), min(k, len(px)), replace=False)].astype(float)
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - cen[None]) ** 2).sum(2), 1)
        for i in range(len(cen)):
            if (lab == i).any():
                cen[i] = px[lab == i].mean(0)
    lab = np.argmin(((px[:, None, :] - cen[None]) ** 2).sum(2), 1)
    return cen, np.bincount(lab, minlength=len(cen)) / len(px)


def analyse(mid, pct=97):
    im = Image.open(os.path.join(SP, "img", mid + ".jpg")).convert("RGB")
    im.thumbnail((340, 340))
    px = np.asarray(im).reshape(-1, 3).astype(float)
    hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in px])
    s, v = hsv[:, 1], hsv[:, 2]

    thresh = np.percentile(s, pct)
    hot = px[(s >= thresh) & (v > 0.18)]
    cen, share = kmeans(hot, 3)
    accent = cen[share.argmax()]
    coverage = 100 * len(hot) / len(px)

    ground = px[s < 0.18]
    ground = np.median(ground, 0) if len(ground) > 50 else np.median(px, 0)
    void = np.median(px[v <= np.percentile(v, 6)], 0)
    return accent, coverage, ground, void, float(s[s >= thresh].mean())


print(f"{'destination':<14} {'ACCENT':<9} {'cover':>6} {'sat':>5}  "
      f"{'GROUND':<9} {'VOID':<9}  from")
for slug, mid, work in PICKS:
    a, cov, g, vd, ms = analyse(mid)
    print(f"{slug:<14} {hexof(a):<9} {cov:>5.1f}% {ms:>5.2f}  "
          f"{hexof(g):<9} {hexof(vd):<9}  {work}")
