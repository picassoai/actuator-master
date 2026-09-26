# Not part of the website

`costs.json` holds dealer cost per part. It must never be copied into
`assets/`, committed to a public repository, or served: it would show
every customer and every supplier exactly what the margin is.

Regenerate with `python tools/build-catalogue.py`.
