# -*- coding: utf-8 -*-
"""Build assets/js/data.js from the three supplier sources we actually hold.

Sources, and how far each can be trusted:

  CubeMars    internal/sources/cubemars-catalogue.js — full specs, prices
              confirmed against store.cubemars.com. Complete.
  MyActuator  the 2024-06 dealer price sheet. Prices and tiers are exact;
              specs are not in that file, so torque, diameter and ratio are
              read out of the model code (RMD-X8-P9-20 = Ф80 class, 9:1, 20 N·m)
              and nothing else is claimed.
  Steadywin   their public Shopify feed. Prices exact; the product bodies are
              FAQ text, not spec tables, so only what the model code encodes
              (GIM3510-64 = Ф35, 64:1) is recorded.

Where a figure is not known it is left null. The site renders a blank and the
compare view refuses to rank on that field. Inventing a plausible number would
make the comparison table worse than not having one, because the whole reason
to visit a multi-supplier catalogue is to trust the cross-brand row.

Dealer cost NEVER enters data.js — that file is served to browsers. Costs go to
internal/costs.json, which is not part of the deployed site.
"""

import io
import json
import os
import re

from PIL import Image
import zipfile

NL = chr(10)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Every input lives inside the project. Nothing here reaches outside it —
# not to another site's folder, not to 代理/, not to a lab drive.
SOURCES = os.path.join(HERE, "internal", "sources")
CUBEMARS_SRC = os.path.join(SOURCES, "cubemars-catalogue.js")
MA_XLSX = os.path.join(SOURCES, "myactuator-price-2024-06-10.xlsx")
SW_FEED = os.environ.get("SW_FEED") or os.path.join(HERE, "tools", "steadywin-feed.json")


def write(rel, text):
    path = os.path.join(HERE, rel)
    d = os.path.dirname(path)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)


IMGDIR = os.path.join(HERE, "assets", "img", "products")
HAVE = set(os.listdir(IMGDIR)) if os.path.isdir(IMGDIR) else set()
SW_SPECS = {}
# The DD/OT sheet is a second source; the selection-table file wins where both
# carry a model, because that is the one Steadywin publishes for ordering.
for _f in ("steadywin-dd-specs.json", "steadywin-specs.json"):
    _p = os.path.join(HERE, "tools", _f)
    if os.path.exists(_p):
        SW_SPECS.update(json.load(io.open(_p, encoding="utf-8")))

SWDIR = os.path.join(HERE, "assets", "img", "steadywin")
# up to three shots per part, named <id>-1..3
def _is_marketing(path):
    """Steadywin illustrate some listings with a blue spec card, not a photo."""
    try:
        im = Image.open(path).convert("RGB").resize((64, 64))
    except Exception:
        return False
    px = list(im.convert("RGB").tobytes())
    trip = zip(px[0::3], px[1::3], px[2::3])
    blue = sum(1 for r, g, b in trip if b > 150 and b - r > 25 and b - g > 10)
    return blue > (len(px) / 3) * 0.15


SWHAVE = {}
if os.path.isdir(SWDIR):
    for f in sorted(os.listdir(SWDIR)):
        m = re.match(r"(sw-.+)-([123])\.[a-z]+$", f)
        if m:
            SWHAVE.setdefault(m.group(1), []).append("assets/img/steadywin/" + f)
    for k, v in list(SWHAVE.items()):
        photos = [p for p in v
                  if not _is_marketing(os.path.join(HERE, p))]
        # a real photograph leads; if there is none, show nothing and let the
        # drawing take over rather than putting an advert on the card
        SWHAVE[k] = photos or None
        if SWHAVE[k] is None:
            del SWHAVE[k]


def gallery(cm_id):
    for cand in (cm_id, re.sub(r"-(with-hall|with-driver|standard|lite|no-driver)$", "", cm_id)):
        shots = ["assets/img/products/%s-%d.jpg" % (cand, n)
                 for n in (1, 2, 3) if ("%s-%d.jpg" % (cand, n)) in HAVE]
        if shots:
            return shots
    return []


def photo(cm_id):
    """CubeMars photos are named after the part. Variants share the base part's
    shot, so a `-with-hall` or `-standard` suffix falls back to its parent."""
    for cand in (cm_id, re.sub(r"-(with-hall|with-driver|standard|lite|no-driver)$", "", cm_id)):
        for n in (1, 2, 3):
            f = "%s-%d.jpg" % (cand, n)
            if f in HAVE:
                return "assets/img/products/" + f
    return None


def jsnum(v):
    if v is None:
        return "null"
    return ("%g" % v)


# ---------------------------------------------------------------- CubeMars

CM_TYPE = {"AK": "qdd", "AKE": "qdd", "AKA": "qdd", "AKH": "qdd",
           "RI": "frameless", "RO": "frameless", "GL": "gimbal"}
CM_HOLLOW = {"AKH"}
CM_ROTOR = {"RI": "inner", "RO": "outer"}


SUSPECT = []

# Figures taken from the CubeMars catalogue where the Shopify data is absent or
# carries a unit slip. Keyed on the product id without the "cm-" prefix.
CM_FIXES = {}
_f = os.path.join(HERE, "tools", "cubemars-fixes.json")
if os.path.exists(_f):
    CM_FIXES = {k: v for k, v in json.load(io.open(_f, encoding="utf-8")).items()
                if not k.startswith("_")}


def cubemars():
    src = io.open(CUBEMARS_SRC, encoding="utf-8").read()
    out = []
    for blk in re.findall(r'(\{ id: "[a-z0-9\-]+".*?)(?=\n  \{ id: |\n\];)', src, re.S):
        name = re.search(r'name: "([^"]+)"', blk).group(1)
        series = re.search(r'series: "([^"]+)"', blk)
        series = series.group(1) if series else ""
        coll = re.search(r'collection: "([^"]+)"', blk).group(1)
        if coll == "accessories":
            continue
        fam = series.split()[0] if series else ""
        t = CM_TYPE.get(fam)
        if not t:
            continue

        def spec(key):
            m = re.search(r'"%s": "([^"]*)"' % re.escape(key), blk)
            if not m:
                return None
            n = re.match(r"\s*(-?[\d.]+)", m.group(1))
            return float(n.group(1)) if n else None

        vg = re.search(r'variantGroup: "([^"]+)"', blk)
        va = re.search(r'variantAxis: "([^"]+)"', blk)
        vl = re.search(r'variantLabel: "([^"]+)"', blk)
        density = spec("Maximum Torque Density (N·m/kg)") or spec("Maximum Torque Weight Ratio (N·m/kg)")
        w, pk = spec("Weight (g)"), spec("Peak Torque (N·m)")
        suspect = (density and w and pk and pk > density * (w / 1000.0) * 3)
        if suspect:
            SUSPECT.append((name, pk, round(density * w / 1000.0, 3)))
        fix = CM_FIXES.get(re.search(r'id: "([^"]+)"', blk).group(1), {})
        out.append({
            "id": "cm-" + re.search(r'id: "([^"]+)"', blk).group(1),
            "name": name, "supplier": "cubemars", "type": t,
            "price": float(re.search(r"price: ([\d.]+)", blk).group(1)),
            "art": re.search(r'art: "([^"]+)"', blk).group(1),
            "img": photo(re.search(r'id: "([^"]+)"', blk).group(1)),
            "gallery": gallery(re.search(r'id: "([^"]+)"', blk).group(1)),
            "torque": fix.get("torque", None if suspect else spec("Rated Torque (N·m)")),
            "peak": fix.get("peak", None if suspect else pk),
            "od": fix.get("od", spec("OD (mm)")),
            "weight": fix.get("weight", spec("Weight (g)")),
            "ratio": spec("Reduction Ratio") or 1,
            "hollow": fam in CM_HOLLOW,
            "rotor": CM_ROTOR.get(fam),
            "group": vg.group(1) if vg else None,
            "axis": va.group(1) if va else None,
            "label": vl.group(1) if vl else None,
            "ratedAt": ("%g V" % fix["volts"]) if fix.get("volts")
                       else "unverified" if suspect
                       else ("%g V" % spec("Rated Voltage (V)") if spec("Rated Voltage (V)") else "unstated"),
        })
    return out


# ---------------------------------------------------------------- MyActuator

def myactuator():
    z = zipfile.ZipFile(MA_XLSX)
    shared = [re.sub(r"<[^>]+>", "", m) for m in re.findall(
        r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S)]

    def sheet(n):
        sh = z.read("xl/worksheets/sheet%d.xml" % n).decode("utf-8")
        rows = {}
        for rm in re.finditer(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', sh, re.S):
            cells = {}
            for cm in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>', rm.group(2), re.S):
                v = re.search(r"<v>(.*?)</v>", cm.group(3), re.S)
                if not v:
                    continue
                val = v.group(1)
                if 't="s"' in cm.group(2):
                    val = shared[int(val)]
                cells[cm.group(1)] = val.strip()
            if cells:
                rows[int(rm.group(1))] = cells
        return rows

    def num(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None

    # X4 -> Ф40 class, X6 -> Ф60 and so on. This is the family convention, not a
    # measured figure, so it is recorded as the class and not as an OD.
    out = []
    for n in (1, 2, 3):
        for r, c in sorted(sheet(n).items()):
            retail, a, ex = num(c.get("J")), num(c.get("H")), num(c.get("G"))
            if None in (retail, a, ex):
                continue
            short = c.get("F", "")
            full = c.get("E", "")
            label = c.get("D", "")
            if not re.match(r"^[A-Z]", label or ""):
                label = ""
            name = label or full or short
            tq = re.match(r"X\d+-(\d+)", short or "")
            ratio = re.search(r"-P(\d+)-", full or "")
            pid = "ma-" + re.sub(r"[^a-z0-9]+", "-", (short or name).lower()).strip("-")
            if pid in MA_SUPERSEDED:
                continue
            out.append({
                "id": pid,
                "name": "MyActuator " + (name or short), "supplier": "myactuator",
                "type": "qdd", "price": retail, "art": "actuator",
                "img": None,
                "torque": None,
                "peak": float(tq.group(1)) if tq else None,
                "od": None, "weight": None,
                "hollow": False, "rotor": None,
                "ratio": float(ratio.group(1)) if ratio else None,
                "ratedAt": "from part code, unverified",
                "group": None, "axis": None, "label": None,
                "cost": {"exclusive": ex, "classA": a, "classB": num(c.get("I"))},
            })
    return out


MA_SPECS = {}
_q = os.path.join(HERE, "tools", "myactuator-specs.json")
if os.path.exists(_q):
    MA_SPECS = {k: v for k, v in json.load(io.open(_q, encoding="utf-8")).items()
                if not k.startswith("_")}


# The 2024 price sheet's RMD-X line is the V2/V3 generation; MyActuator now
# publishes V4/V4.1. Where the catalogue and the price sheet disagree the
# catalogue wins, so the current models are listed and the superseded ones are
# not — a buyer comparing us with myactuator.com should see the same parts.
MA_SUPERSEDED = {"ma-x4-3", "ma-x6-7", "ma-x6-8", "ma-x8-20", "ma-x6-40",
                 "ma-x10-40", "ma-x8-60", "ma-x10-100", "ma-x4-24",
                 "ma-x8-90", "ma-x12-150", "ma-x15-200", "ma-x15-300",
                 "ma-x15-400"}

# 2026-09 Distributor Price List. MSRP is what the site charges; the
# distributor column is what we pay and never leaves internal/costs.json.
# The discount is 35% off MSRP on everything except the largest harmonics,
# where it is 40%.
MA_PRICE = {
    "RMD-X4-10-L": (299.0, 194.35), "RMD-X4-36-L": (329.0, 213.85),
    "RMD-X5-50": (429.0, 278.85),   "RMD-X6-50": (449.0, 291.85),
    "RMD-X8-150": (725.0, 471.25),  "RMD-X10-200": (899.0, 584.35),
    "RH-14": (799.0, 519.35),   "RH-14-B": (849.0, 551.85),
    "RH-17": (899.0, 584.35),   "RH-17-B": (945.0, 614.25),
    "RH-20": (959.0, 623.35),   "RH-20-B": (999.0, 649.35),
    "RH-25": (1250.0, 812.50),  "RH-25-B": (1550.0, 930.0),
    "RH-32": (1550.0, 930.0),   "RH-32-B": (1850.0, 1110.0),
    "RH-40": (1850.0, 1110.0),
}

MA_CATALOGUE_ONLY = (
    [("RH-%s" % n, "harmonic", True, None)
     for n in ("14", "17", "20", "25", "32", "40")] +
    # the brake option, folded onto the same card as the plain model
    [("RH-%s-B" % n, "harmonic", True, None)
     for n in ("14", "17", "20", "25", "32")] +
    # V4.1: the three MyActuator publishes, then the three that are priced but
    # have no page yet
    [("RMD-%s" % n, "qdd", False, None)
     for n in ("X4-36-L", "X8-150", "X10-200",
               "X4-10-L", "X5-50", "X6-50")] +
    [("CEM-%s" % n, "cycloidal", False, None) for n in ("25", "45")] +
    [("RMD-%s" % n, "qdd", False, None)
     for n in ("X2-7", "X4-36", "X6-60", "X8-120", "X10-40", "X12-320")] +
    [("FL-%s" % n, "frameless", False, "inner")
     for n in ("38-08", "38-12", "50-08", "50-15",
               "70-10", "70-16", "85-13", "85-23")] +
    [("FLO-%s" % n, "frameless", False, "outer")
     for n in ("40-15", "50-15", "70-15", "90-15")] +
    # The two direct-drive lines. H is the one their CFO calls "H series" and
    # names as a seller; it is hollow through the axis, so it also lands in the
    # hollow-shaft view. L is the lightweight line.
    [("RMD-H-%s" % n, "directdrive", True, "outer")
     for n in ("50-15", "70-15", "90-15")] +
    [("RMD-L-%s" % n, "directdrive", False, "outer")
     for n in ("4005", "4010", "4015", "5005", "5010", "5015",
               "7015", "7025", "9015", "9025")]
)


def myactuator_catalogue():
    out = []
    for code, t, hollow, rotor in MA_CATALOGUE_ONLY:
        sp = MA_SPECS.get(code, {})
        if not sp and code.endswith("-B"):
            # The brake version is the same drivetrain with a brake on
            # the back, so torque, diameter and ratio carry over. Weight
            # does not: a brake adds mass MyActuator do not publish.
            base = dict(MA_SPECS.get(code[:-2], {}))
            base.pop("weight", None)
            sp = base
        pid = "ma-" + code.lower()
        shot = "assets/img/myactuator/%s-1.png" % pid
        have = os.path.exists(os.path.join(HERE, shot))
        if not have and code.endswith("-B"):
            # the brake version is the same motor; show the same photograph
            shot = "assets/img/myactuator/ma-%s-1.png" % code[:-2].lower()
            have = os.path.exists(os.path.join(HERE, shot))
        out.append({
            "id": pid,
            # MyActuator writes these as H-50-15 and L-9025 under the
            # RMD-H / RMD-L headings, so show the short form.
            "name": "MyActuator " + (code[4:] if code[:5] in ("RMD-H", "RMD-L")
                                     else code),
            "supplier": "myactuator",
            "type": sp.get("type", t),
            "price": MA_PRICE.get(code, (None, None))[0],
            "cost": ({"dealer": MA_PRICE[code][1]} if code in MA_PRICE else None),
            "art": "hollow" if t == "harmonic" else "frameless",
            "img": shot if have else None,
            "gallery": [shot] if have else None,
            "torque": sp.get("torque"), "peak": sp.get("peak"),
            "od": sp.get("od"), "weight": sp.get("weight"),
            "hollow": sp.get("hollow", hollow), "rotor": sp.get("rotor", rotor),
            "ratio": sp.get("ratio"),
            "ratedAt": ("%g V" % sp["volts"]) if sp.get("volts") else "not published",
            "group": (code[:-2].lower() if code.endswith("-B")
                      else (code.lower() if code + "-B" in MA_PRICE else None)),
            "axis": ("Brake" if code.endswith("-B") or code + "-B" in MA_PRICE
                     else None),
            "label": ("With brake" if code.endswith("-B")
                      else ("No brake" if code + "-B" in MA_PRICE else None)),
        })
    for p in out:
        if p.get("cost") is None:
            p.pop("cost", None)
    return out


# ---------------------------------------------------------------- SigGear

# Single-unit list price, 2026 SigGear Price List. The sheet also carries a
# 50-99 and a 100+ tier; those are volume prices, not our cost, and they are
# kept in internal/costs.json until we decide whether to publish a break.
SG_LIST = {
    "SG-6010C": 129.0, "SG-6010HB": 120.0, "SG-6010D": 199.0, "SG-8021": 179.0,
    "CPM-100-25": 699.0, "CPM-80-25": 519.0, "CPM-78-39": 299.0,
}


def siggear():
    """Transcribed from the 2026-03 catalogue — see tools/siggear-specs.json.

    Prices come from the 2026 SigGear Price List, which is list price rather
    than what we pay; a part not on that sheet stays quote-only."""
    p = os.path.join(HERE, "tools", "siggear-specs.json")
    if not os.path.exists(p):
        return []
    specs = json.load(io.open(p, encoding="utf-8"))
    out = []
    for model, r in sorted(specs.items()):
        if model.startswith("_"):
            continue
        pid = "sg-" + re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")
        shot = "assets/img/siggear/%s-1.png" % pid
        have = os.path.exists(os.path.join(HERE, shot))
        out.append({
            "id": pid, "name": "SigGear " + model, "supplier": "siggear",
            "type": "cycloidal" if r["family"] == "cycloidal" else "qdd",
            "price": SG_LIST.get(model), "art": "actuator",
            "img": shot if have else None,
            "gallery": [shot] if have else None,
            "torque": r.get("torque"), "peak": r.get("peak"),
            "od": r.get("od"), "weight": r.get("weight"),
            "ratio": r.get("ratio"), "hollow": False, "rotor": None,
            "ratedAt": ("%g V" % r["volts"]) if r.get("volts") else "unstated",
            "group": None, "axis": None, "label": None,
        })
    return out


# ---------------------------------------------------------------- Steadywin

SW_TYPE = {"GIM": "qdd", "WGG": "qdd", "OT": "directdrive",
           "GB": "gimbal", "PM": "gimbal", "DD": "directdrive", "WK": "frameless"}
SW_HOLLOW = {"OT"}
SW_ART = {"qdd": "actuator", "harmonic": "hollow", "gimbal": "gimbal",
          "directdrive": "frameless", "frameless": "frameless"}


def steadywin():
    if not SW_FEED or not os.path.exists(SW_FEED):
        return []
    out = []
    for p in json.load(io.open(SW_FEED, encoding="utf-8"))["products"]:
        title = p["title"].strip()
        # Five digits, not four: OT10025, DD11025 and GIM10015 are real codes
        # and a four-digit capture published them a digit short.
        m = re.search(r"\b([A-Z]{2,3})(\d{4,5})(?:-([\d.]+))?", title)
        if not m or m.group(1) not in SW_TYPE:
            continue
        # Not the cheapest variant: on several of these listings the low end of
        # the range is a cable or a price-difference option, which would have
        # put a $500 actuator on the page at $10. Prefer the variant whose name
        # carries the model code, then Shopify's default (the first).
        code0 = m.group(0)
        named = [v for v in p["variants"] if code0.lower() in v["title"].lower()]
        v = (named or p["variants"])[0]
        price = float(v["price"])
        if price <= 0:
            continue
        # WK and GB are bare frameless and small gimbal motors at $7-$95.
        # Someone buying a bare motor buys it from China directly; they will not
        # pay our margin for the convenience. The joint modules are the product.
        # The floor is the other half of the same argument: below $50 the
        # freight costs more than the part, so nobody completes the order.
        if m.group(1) in ("WK", "GB") or price < 50:
            continue
        t = SW_TYPE[m.group(1)]
        code = m.group(0)
        sp = SW_SPECS.get(code, {})
        # GIM3510-64: Ф35, stack 10 mm, 64:1. The first two digits are the
        # diameter in mm across every family they publish.
        out.append({
            "id": "sw-" + re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-"),
            "name": "Steadywin " + code, "supplier": "steadywin", "type": t,
            "price": price, "art": SW_ART[t],
            "img": (SWHAVE.get("sw-" + re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")) or [None])[0],
            "gallery": SWHAVE.get("sw-" + re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")),
            "torque": sp.get("torque"), "peak": sp.get("peak"),
            "od": sp.get("od"), "weight": sp.get("weight"),
            "hollow": bool(sp.get("hollow")) or m.group(1) in SW_HOLLOW,
            "rotor": None,
            "ratio": sp.get("ratio") or (float(m.group(3)) if m.group(3) else 1),
            "ratedAt": ("%g V" % sp["volts"]) if sp.get("volts") else "from part code, unverified",
            "group": None, "axis": None, "label": None,
        })
    seen, uniq = set(), []
    for p in out:
        if p["id"] in seen:
            continue
        seen.add(p["id"])
        uniq.append(p)
    return uniq


# ---------------------------------------------------------------- emit


def main():
    cm = cubemars()
    products = cm + myactuator() + myactuator_catalogue() + siggear() + steadywin()
    order = {"myactuator": 0, "cubemars": 1, "siggear": 2, "steadywin": 3}
    products.sort(key=lambda p: (order[p["supplier"]], p["type"], p["od"] or 0,
                                 p["price"] if p["price"] is not None else 1e9))

    costs = {}
    for p in products:
        if "cost" in p:
            costs[p["id"]] = p.pop("cost")
    for p in cm:
        # CubeMars is a flat 35% off list, confirmed across all 136 sheet rows.
        if p["price"]:
            costs.setdefault(p["id"], {"dealer": round(p["price"] * 0.65, 2)})

    lines = []
    for p in products:
        tpl = ('  { id: "%s", name: "%s", supplier: "%s", type: "%s", price: %s,' + NL +
               '    art: "%s", img: %s, gallery: %s, hollow: %s, rotor: %s,' + NL +
               '    group: %s, axis: %s, label: %s,' + NL +
               '    spec: { torque: %s, peak: %s, od: %s, weight: %s, ratio: %s, ratedAt: "%s" } }')
        lines.append(tpl % (
            p["id"], p["name"].replace('"', "'"), p["supplier"], p["type"],
            jsnum(p["price"]),
            p["art"], ('"%s"' % p["img"]) if p.get("img") else "null",
            ("[" + ", ".join('"%s"' % g for g in p["gallery"]) + "]") if p.get("gallery") else "null",
            "true" if p.get("hollow") else "false",
            ('"%s"' % p["rotor"]) if p.get("rotor") else "null",
            ('"%s"' % p["group"]) if p.get("group") else "null",
            ('"%s"' % p["axis"]) if p.get("axis") else "null",
            ('"%s"' % p["label"]) if p.get("label") else "null",
            jsnum(p["torque"]), jsnum(p["peak"]), jsnum(p["od"]),
            jsnum(p["weight"]), jsnum(p["ratio"]), p["ratedAt"]))

    header = io.open(os.path.join(HERE, "tools", "data-header.js"), encoding="utf-8").read()
    write("assets/js/data.js",
          header + "\nwindow.PRODUCTS = [\n" + ",\n".join(lines) + "\n];\n")

    write("internal/costs.json", json.dumps(costs, indent=2, sort_keys=True) + "\n")
    write("internal/README.md",
          "# Not part of the website\n\n"
          "`costs.json` holds dealer cost per part. It must never be copied into\n"
          "`assets/`, committed to a public repository, or served: it would show\n"
          "every customer and every supplier exactly what the margin is.\n\n"
          "Regenerate with `python tools/build-catalogue.py`.\n")

    by_sup = {}
    by_type = {}
    for p in products:
        by_sup[p["supplier"]] = by_sup.get(p["supplier"], 0) + 1
        by_type[p["type"]] = by_type.get(p["type"], 0) + 1
    print("products   %d" % len(products))
    print("suppliers  %s" % ", ".join("%s %d" % kv for kv in sorted(by_sup.items())))
    print("types      %s" % ", ".join("%s %d" % kv for kv in sorted(by_type.items())))
    known = sum(1 for p in products if p["torque"] is not None)
    print("rated torque known for %d of %d" % (known, len(products)))
    print("od known for          %d of %d" % (sum(1 for p in products if p["od"]), len(products)))
    if SUSPECT:
        print("dropped as internally inconsistent (supplier's own numbers disagree):")
        for n, pk, want in SUSPECT:
            print("   %-24s peak %s N·m vs %s N·m implied by its torque density" % (n, pk, want))
    print("steadywin specs matched %d of %d"
          % (sum(1 for p in products if p["supplier"] == "steadywin" and p["torque"] is not None),
             sum(1 for p in products if p["supplier"] == "steadywin")))
    gs = set(p["group"] for p in products if p.get("group"))
    print("variant groups %d, folding %d entries into %d cards"
          % (len(gs), sum(1 for p in products if p.get("group")), len(gs)))
    print("hollow     %d products" % sum(1 for p in products if p.get("hollow")))
    print("quote-only %d products (no price published to us yet)"
          % sum(1 for p in products if p["price"] is None))
    print("photos     %d of %d products" % (sum(1 for p in products if p.get("img")), len(products)))
    print("costs      %d entries -> internal/costs.json (not deployed)" % len(costs))


if __name__ == "__main__":
    main()
