# -*- coding: utf-8 -*-
"""Pull SigGear specs and product shots out of the 2026-03-19 product catalogue.

The catalogue is a design document, not a database: on each spec page the
Chinese label, the English label and the value are three separate text runs
scattered around the page, so reading it in document order gives nonsense.
Instead each label is located by position and paired with the nearest value to
its right or below, which is how a person reads it.

Nothing is published unless it survives a sanity check — peak torque at least
the rated figure, outer diameter between 20 and 300 mm, weight between 20 g and
20 kg. A catalogue whose whole claim is a trustworthy cross-brand table cannot
afford a mis-paired number, and a blank is honest where a guess is not.

Output: tools/siggear-specs.json, and page renders in assets/img/siggear/.
"""

import io
import json
import os
import re

import fitz

PDF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "internal", "sources", "siggear-catalogue-2026-03-19.pdf")
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
IMGDIR = os.path.join(SITE, "assets", "img", "siggear")

FIRST, LAST = 24, 56          # 1-based page numbers of the product section

# label -> (field, how to read the value)
FIELDS = [
    ("外径尺寸", "od", r"(\d+(?:\.\d+)?)\s*mm"),
    ("产品厚度", "length", r"(\d+(?:\.\d+)?)\s*mm"),
    ("减速比", "ratio", r"(\d+(?:\.\d+)?)"),
    ("额定电压", "volts", r"(\d+(?:\.\d+)?)\s*V"),
    ("额定扭矩", "torque", r"(\d+(?:\.\d+)?)\s*N"),
    ("峰值扭矩", "peak", r"(\d+(?:\.\d+)?)\s*N"),
    ("重量", "weight", r"(\d+(?:\.\d+)?)"),
    ("背隙", "backlash", r"([＜<]?\s*\d+(?:\.\d+)?\s*°)"),
    ("防水等级", "ip", r"(IP\d+)"),
    ("空载转速", "noload", r"(\d+(?:\.\d+)?)"),
    ("额定功率", "watts", r"(\d+(?:\.\d+)?)\s*W"),
]

SANE = {
    "od": (20, 300), "length": (10, 300), "ratio": (1, 200), "volts": (6, 100),
    "torque": (0.05, 500), "peak": (0.1, 1500), "weight": (20, 20000),
    "noload": (1, 20000), "watts": (1, 3000),
}


def words(page):
    """(x0, y0, x1, y1, text) for every word, in reading order."""
    return [w for w in page.get_text("words")]


def value_near(ws, anchor, pattern):
    """The first match to the right of, or below, the label — the two places a
    spec sheet ever puts it."""
    ax0, ay0, ax1, ay1 = anchor[:4]
    cands = []
    for w in ws:
        x0, y0, x1, y1, t = w[0], w[1], w[2], w[3], w[4]
        same_line = abs(y0 - ay0) < 6 and x0 > ax1 - 2
        below = 0 < (y0 - ay1) < 90 and abs(x0 - ax0) < 120
        if not (same_line or below):
            continue
        m = re.search(pattern, t)
        if m:
            dist = (x0 - ax1 if same_line else (y0 - ay1) * 3 + abs(x0 - ax0))
            cands.append((dist, m.group(1)))
    cands.sort()
    return cands[0][1] if cands else None


def num(v):
    if v is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group(0)) if m else None


def read_page(page):
    ws = words(page)
    text = page.get_text()
    rec = {}

    name = re.search(r"((?:SG|CPM)-[0-9]+[0-9A-Za-z\-]*)", text)
    if name:
        rec["model"] = name.group(1).rstrip("-")
    rec["family"] = ("cycloidal" if "摆线" in text
                     else "planetary" if "行星" in text else None)

    for label, field, pattern in FIELDS:
        hit = [w for w in ws if label in w[4]]
        if not hit:
            continue
        raw = value_near(ws, hit[0], pattern)
        if raw is None:
            continue
        if field in ("backlash", "ip"):
            rec[field] = raw.strip()
            continue
        v = num(raw)
        lo, hi = SANE.get(field, (None, None))
        if v is None or (lo is not None and not (lo <= v <= hi)):
            continue
        rec[field] = v

    # a peak below the rated figure means the pairing went wrong, not that the
    # motor is odd — drop both rather than publish a contradiction
    if rec.get("peak") and rec.get("torque") and rec["peak"] < rec["torque"]:
        rec.pop("peak"), rec.pop("torque")
    return rec


def main():
    doc = fitz.open(PDF)
    if not os.path.isdir(IMGDIR):
        os.makedirs(IMGDIR)

    out, unnamed = {}, []
    for i in range(FIRST - 1, min(LAST, doc.page_count)):
        page = doc[i]
        rec = read_page(page)
        if not rec.get("family"):
            continue
        model = rec.pop("model", None)
        if not model:
            unnamed.append(i + 1)
            continue
        if model in out:                       # the second page is the dyno chart
            out[model].update({k: v for k, v in rec.items() if k not in out[model]})
            continue
        rec["page"] = i + 1
        out[model] = rec

        pid = "sg-" + re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")
        pix = page.get_pixmap(dpi=110)
        pix.save(os.path.join(IMGDIR, pid + "-1.png"))
        rec["img"] = "assets/img/siggear/%s-1.png" % pid

    io.open(os.path.join(HERE, "siggear-specs.json"), "w", encoding="utf-8",
            newline="\n").write(json.dumps(out, indent=1, sort_keys=True,
                                           ensure_ascii=False) + "\n")

    print("  %d models with a readable model number" % len(out))
    for m in sorted(out):
        r = out[m]
        print("    %-16s %-10s OD %-7s %-8s %-9s %-8s" % (
            m, r.get("family", "-"),
            r.get("od", "—"),
            ("%s N·m" % r["torque"]) if r.get("torque") else "—",
            ("peak %s" % r["peak"]) if r.get("peak") else "—",
            ("%s g" % r["weight"]) if r.get("weight") else "—"))
    print("  pages whose model number is not in the text layer: %s" % (unnamed or "none"))
    for f in ("od", "torque", "peak", "weight", "ratio", "volts"):
        print("    %-8s %d" % (f, sum(1 for r in out.values() if r.get(f) is not None)))


if __name__ == "__main__":
    main()
