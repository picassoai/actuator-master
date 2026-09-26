# -*- coding: utf-8 -*-
"""Pull Steadywin specs out of the 选型表 workbooks into tools/steadywin-specs.json.

The workbooks live in the lab's Dropbox, not in this repository, so this runs
once and commits the result: the site build must not depend on a path that only
exists on one machine.

Layout is parameters-down-the-side, models-across-the-top. A few header cells
are numbers rather than model names — a data-entry slip in the source — and
those columns are skipped rather than guessed at. The row labels are bilingual,
so they are matched on the English half.

Worth noting for anyone tempted to shortcut this: GIM3505-8 measures Ø43, not
Ø35, and GIM6010-8 is Ø80, not Ø60. The number in the model code is the rotor
size, not the outside diameter of the finished part.
"""

import io
import json
import os
import re
import zipfile

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "internal", "sources", "steadywin")
HERE = os.path.dirname(os.path.abspath(__file__))

# row label (matched on the English fragment) -> field name
WANTED = [
    ("Rated voltage", "volts"),
    ("Rated torque", "torque"),
    ("Peak torque", "peak"),
    ("Rated Speed after reduce", "rpm"),
    ("Gear Rate", "ratio"),
    ("Reducer gear backlash", "backlash"),
    ("Motor weight with driver", "weight"),
    ("Size with Driver", "size"),
    ("Protection grade", "ip"),
]


def cells(z, sheet):
    shared = [re.sub(r"<[^>]+>", "", m) for m in re.findall(
        r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S)]
    sh = z.read(sheet).decode("utf-8")
    rows = {}
    for rm in re.finditer(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', sh, re.S):
        row = {}
        for cm in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>', rm.group(2), re.S):
            v = re.search(r"<v>(.*?)</v>", cm.group(3), re.S)
            if not v:
                continue
            val = v.group(1)
            if 't="s"' in cm.group(2):
                val = shared[int(val)]
            row[cm.group(1)] = val.strip()
        if row:
            rows[int(rm.group(1))] = row
    return rows


def num(v):
    if v is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return round(float(m.group(0)), 4) if m else None


def harvest(path, sheet="xl/worksheets/sheet1.xml"):
    z = zipfile.ZipFile(path)
    rows = cells(z, sheet)
    if not rows:
        return {}
    head = rows[min(rows)]
    # the label column tells us which row carries which parameter
    label_rows = {}
    for r, row in rows.items():
        a = row.get("A", "")
        for frag, field in WANTED:
            if frag.lower() in a.lower():
                label_rows[field] = r

    out = {}
    for col, name in head.items():
        if not re.match(r"^[A-Z]{2,}\d", name or ""):
            continue          # numeric or empty header: skipped, never guessed
        rec = {"model": name}
        for field, r in label_rows.items():
            raw = rows[r].get(col)
            if raw is None:
                continue
            if field == "size":
                m = re.match(r"[ØФ]?\s*([\d.]+)\s*\*\s*([\d.]+)", str(raw))
                if m:
                    rec["od"] = float(m.group(1))
                    rec["length"] = float(m.group(2))
            elif field in ("ip",):
                rec[field] = str(raw)
            elif field == "ratio":
                rec[field] = num(raw)
            else:
                rec[field] = num(raw)
        out[name] = rec
    return out


def main():
    specs = {}
    skipped = []
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".xlsx"):
            continue
        z = zipfile.ZipFile(os.path.join(SRC, f))
        sheets = [n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)]
        got = harvest(os.path.join(SRC, f), sorted(sheets)[0])
        for k, v in got.items():
            specs.setdefault(k, v)
        head = cells(z, sorted(sheets)[0])
        first = head[min(head)] if head else {}
        skipped += [c for c, n in first.items()
                    if c not in ("A", "B") and not re.match(r"^[A-Z]{2,}\d", n or "")]
        print("  %-52s %d models" % (f[:50], len(got)))

    io.open(os.path.join(HERE, "steadywin-specs.json"), "w", encoding="utf-8", newline="\n").write(
        json.dumps(specs, indent=1, sort_keys=True, ensure_ascii=False) + "\n")
    print("\n  total %d models with specs" % len(specs))
    print("  columns skipped for an unusable header: %d" % len(skipped))
    have = lambda k: sum(1 for v in specs.values() if v.get(k) is not None)
    for k in ("torque", "peak", "od", "weight", "ratio", "volts"):
        print("    %-8s %d" % (k, have(k)))


if __name__ == "__main__":
    main()
