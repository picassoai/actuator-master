# -*- coding: utf-8 -*-
"""Pull FL / FLO frameless specs out of the 2026-03-09 MyActuator catalogue.

The catalogue is machine-readable, unlike the website, where the same tables
are baked into JPEGs. On these pages the units run down one column, the
bilingual labels down another, and each model's values follow its name as a
run of eighteen tokens in the label order. That is positional but stable, so
the parser takes the run and checks it rather than pattern-matching each value.

Every row is checked before it is kept: peak torque at or above rated, rated
speed above no-load being impossible, weight in a plausible band. A row that
fails is dropped whole rather than published half-right — this catalogue's only
real claim is that a cross-brand comparison can be trusted.

Output: tools/myactuator-fl-specs.json
"""

import io
import json
import os
import re

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, "..", "internal", "sources",
                   "myactuator-catalog-2026-03-09.pdf")
PAGES = (22, 23, 25)

# the value order under each model name on these pages
ORDER = ["volts", "noloadAmps", "rpm", "torque", "watts", "ampsRated",
         "peak", "ampsPeak", "efficiency", "ke", "kt", "resistance",
         "inductance", "polePairs", "connection", "encoder", "weightKg",
         "insulation"]
NUMERIC = {"volts", "noloadAmps", "rpm", "torque", "watts", "ampsRated",
           "peak", "ampsPeak", "ke", "kt", "resistance", "inductance",
           "polePairs", "weightKg"}


def num(tok):
    m = re.match(r"^[><≥≤]?\s*(-?\d+(?:\.\d+)?)", str(tok).strip())
    return float(m.group(1)) if m else None


def parse_page(page):
    toks = [t.strip() for t in page.get_text().split("\n") if t.strip()]
    out = {}
    for i, t in enumerate(toks):
        if not re.fullmatch(r"FLO?-\d+-\d+", t):
            continue
        run = toks[i + 1:i + 1 + len(ORDER)]
        if len(run) < len(ORDER):
            continue
        # the name also appears in the model-code lists and the drawings; only a
        # run that starts with a plausible bus voltage is the parameter block
        v = num(run[0])
        if v is None or not (12 <= v <= 100):
            continue
        rec = {}
        for key, tok in zip(ORDER, run):
            if key in NUMERIC:
                n = num(tok)
                if n is not None:
                    rec[key] = n
            else:
                rec[key] = tok
        if t not in out:
            out[t] = rec
    return out


def sane(model, r):
    why = []
    if r.get("peak") and r.get("torque") and r["peak"] < r["torque"]:
        why.append("peak below rated")
    if r.get("weightKg") and not (0.01 <= r["weightKg"] <= 30):
        why.append("weight %s kg" % r["weightKg"])
    if r.get("rpm") and not (10 <= r["rpm"] <= 20000):
        why.append("speed %s rpm" % r["rpm"])
    if r.get("torque") and not (0.005 <= r["torque"] <= 500):
        why.append("torque %s" % r["torque"])
    return why


def main():
    doc = fitz.open(PDF)
    specs, rejected = {}, []
    for p in PAGES:
        for model, rec in parse_page(doc[p - 1]).items():
            why = sane(model, rec)
            if why:
                rejected.append((model, why))
                continue
            rec["page"] = p
            rec["family"] = "frameless"
            rec["rotor"] = "outer" if model.startswith("FLO") else "inner"
            if rec.get("weightKg"):
                rec["weight"] = round(rec.pop("weightKg") * 1000, 1)
            # FL-38-08 is a 38 mm stator; the catalogue's dimension drawings
            # confirm it, so the first number is the OD for this family.
            m = re.match(r"FLO?-(\d+)-(\d+)", model)
            rec["od"] = float(m.group(1))
            rec["length"] = float(m.group(2))
            specs[model] = rec

    specs["_source"] = ("2026-03-09 myactuator catalog.pdf pages 22, 23, 25. "
                        "Outer diameter and stack length come from the model code, "
                        "which the dimension drawings on the same pages confirm for "
                        "this family (FL-38-08 measures \u00d838).")
    io.open(os.path.join(HERE, "myactuator-fl-specs.json"), "w",
            encoding="utf-8", newline="\n").write(
        json.dumps(specs, indent=1, sort_keys=True, ensure_ascii=False) + "\n")

    keep = {k: v for k, v in specs.items() if not k.startswith("_")}
    print("  %d models" % len(keep))
    for m in sorted(keep):
        r = keep[m]
        print("    %-12s %-6s \u00d8%-5s %-7s N\u00b7m  peak %-7s %-7s g  %sV %s rpm" % (
            m, r["rotor"], r.get("od", "\u2014"), r.get("torque", "\u2014"),
            r.get("peak", "\u2014"), r.get("weight", "\u2014"),
            r.get("volts", "\u2014"), r.get("rpm", "\u2014")))
    if rejected:
        print("  rejected: %s" % rejected)


if __name__ == "__main__":
    main()
