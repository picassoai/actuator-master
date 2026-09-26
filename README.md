# Omnii Robotics

A static multi-supplier actuator catalogue: MyActuator, CubeMars, SigGear and
Steadywin on one comparison table. No build step, no framework, no CDN — open
`index.html`, or serve the folder:

    python -m http.server 8000

## Self-contained

Everything the site needs is in this folder. The pages load no remote script,
stylesheet or font, and the catalogue generator reads no file outside the
project. Copy the folder anywhere and it still builds and runs.

## Layout

    index.html select.html product.html contact.html   the four pages
    assets/js/data.js      generated — do not hand-edit
    assets/js/app.js       all behaviour; routing is on <body data-page>
    assets/js/art.js       vector fallbacks for parts with no photograph
    assets/css/            site.css is shared, home.css is per-page
    assets/img/            product photographs, by supplier
    tools/                 the generator and its hand-verified spec sources
    internal/              cost and source documents — never deployed

## Rebuilding the catalogue

    python tools/build-catalogue.py

Reads `tools/*-specs.json` (specifications, transcribed and checked by hand)
and `internal/sources/` (prices and supplier documents), writes
`assets/js/data.js` and `internal/costs.json`. Requires Python 3 with Pillow;
the one-off extractors in `tools/extract-*.py` also need PyMuPDF.

A figure the supplier does not publish is left null and renders as an em dash.
It is never filled in with a plausible number: the reason to use a
multi-supplier table is that the rows can be trusted against each other.
