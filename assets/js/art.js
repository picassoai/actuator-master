/* Inline SVG product illustrations.
   Stand-ins for real product photography: swap ART.render() for an <img>
   pointing at your own photos and nothing else needs to change. */

window.ART = (function () {
  var uid = 0;

  var C = {
    hi: "#f2f5f7",
    lite: "#dfe4e9",
    mid: "#c3cbd3",
    dark: "#939ea9",
    edge: "#6b7684",
    deep: "#454e57",
    black: "#242a31",
    copper: "#b5793f",
    accent: "#1d64d8"
  };

  function grad(id, a, b, angle) {
    var rad = (angle || 55) * Math.PI / 180;
    return '<linearGradient id="' + id + '" x1="' + (0.5 - Math.cos(rad) / 2).toFixed(3) +
      '" y1="' + (0.5 - Math.sin(rad) / 2).toFixed(3) +
      '" x2="' + (0.5 + Math.cos(rad) / 2).toFixed(3) +
      '" y2="' + (0.5 + Math.sin(rad) / 2).toFixed(3) + '">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }

  /* Points evenly spaced on a circle. */
  function ring(cx, cy, r, n, offset) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2 + (offset || 0);
      out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return out;
  }

  function holes(cx, cy, r, n, hr, fill) {
    return ring(cx, cy, r, n, -Math.PI / 2).map(function (p) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + hr +
        '" fill="' + (fill || C.deep) + '"/>';
    }).join("");
  }

  /* Slotted core: teeth pointing inward (stator) or outward. */
  function teeth(cx, cy, rOut, rIn, n, fill) {
    var out = [], w = (Math.PI * 2 / n) * 0.32;
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var p = [
        [cx + Math.cos(t - w) * rOut, cy + Math.sin(t - w) * rOut],
        [cx + Math.cos(t + w) * rOut, cy + Math.sin(t + w) * rOut],
        [cx + Math.cos(t + w * 1.7) * rIn, cy + Math.sin(t + w * 1.7) * rIn],
        [cx + Math.cos(t - w * 1.7) * rIn, cy + Math.sin(t - w * 1.7) * rIn]
      ];
      out.push('<path d="M' + p.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L") +
        'Z" fill="' + fill + '"/>');
    }
    return out.join("");
  }

  /* ---- variants --------------------------------------------------- */

  function actuator(R, u, bore) {
    var s = "";
    s += '<defs>' + grad("g" + u, C.hi, C.mid, 60) + grad("h" + u, C.mid, C.dark, 240) + '</defs>';
    // rear body peeking out behind the front face
    s += '<rect x="' + (100 - R * 0.78) + '" y="' + (80 - R * 0.78) + '" width="' + (R * 1.56) +
      '" height="' + (R * 1.56) + '" rx="' + (R * 0.22) + '" fill="' + C.edge + '" opacity=".35"/>';
    s += '<circle cx="100" cy="80" r="' + R + '" fill="url(#h' + u + ')"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.95) + '" fill="url(#g' + u + ')"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.95) + '" fill="none" stroke="' + C.dark + '" stroke-width="1"/>';
    s += holes(100, 80, R * 0.82, 8, Math.max(2, R * 0.045));
    s += '<circle cx="100" cy="80" r="' + (R * 0.66) + '" fill="' + C.lite + '" stroke="' + C.dark + '" stroke-width="1"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.52) + '" fill="url(#h' + u + ')" stroke="' + C.edge + '" stroke-width="1"/>';
    s += holes(100, 80, R * 0.36, 6, Math.max(1.8, R * 0.04), C.black);
    if (bore) {
      s += '<circle cx="100" cy="80" r="' + (R * 0.17) + '" fill="' + C.black + '"/>';
      s += '<circle cx="100" cy="80" r="' + (R * 0.17) + '" fill="none" stroke="' + C.accent + '" stroke-width="1.4"/>';
    } else {
      s += '<circle cx="100" cy="80" r="' + (R * 0.18) + '" fill="' + C.mid + '" stroke="' + C.edge + '" stroke-width="1"/>';
      s += '<circle cx="100" cy="80" r="' + (R * 0.07) + '" fill="' + C.deep + '"/>';
    }
    // encoder index mark + CAN connector
    s += '<path d="M' + (100 + R * 0.7) + ' 80 A ' + (R * 0.7) + ' ' + (R * 0.7) + ' 0 0 1 ' +
      (100 + R * 0.49) + ' ' + (80 + R * 0.49) + '" fill="none" stroke="' + C.accent + '" stroke-width="2.4"/>';
    s += '<rect x="' + (100 - R * 0.2) + '" y="' + (80 + R * 0.92) + '" width="' + (R * 0.4) +
      '" height="' + (R * 0.2) + '" rx="2" fill="' + C.black + '"/>';
    return s;
  }

  function gimbal(R, u) {
    var s = '<defs>' + grad("g" + u, C.hi, C.mid, 60) + '</defs>';
    s += '<ellipse cx="100" cy="' + (80 + R * 0.14) + '" rx="' + R + '" ry="' + (R * 0.96) + '" fill="' + C.edge + '" opacity=".4"/>';
    s += '<circle cx="100" cy="80" r="' + R + '" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.88) + '" fill="' + C.lite + '"/>';
    s += teeth(100, 80, R * 0.86, R * 0.52, 22, C.mid);
    s += '<circle cx="100" cy="80" r="' + (R * 0.55) + '" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += holes(100, 80, R * 0.4, 4, Math.max(2, R * 0.05));
    s += '<circle cx="100" cy="80" r="' + (R * 0.2) + '" fill="' + C.black + '"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.2) + '" fill="none" stroke="' + C.accent + '" stroke-width="1.4"/>';
    s += '<path d="M' + (100 - R) + ' 80 h' + (R * 0.12) + ' M' + (100 + R * 0.88) + ' 80 h' + (R * 0.12) +
      '" stroke="' + C.deep + '" stroke-width="2"/>';
    return s;
  }

  function frameless(R, u) {
    var s = '<defs>' + grad("g" + u, C.hi, C.mid, 60) + '</defs>';
    // rotor ring (left, larger) and stator (right, overlapping)
    s += '<circle cx="' + (100 - R * 0.34) + '" cy="80" r="' + R + '" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += '<circle cx="' + (100 - R * 0.34) + '" cy="80" r="' + (R * 0.8) + '" fill="' + C.deep + '"/>';
    ring(100 - R * 0.34, 80, R * 0.68, 14, 0).forEach(function (p) {
      s += '<rect x="' + (p[0] - R * 0.09) + '" y="' + (p[1] - R * 0.09) + '" width="' + (R * 0.18) +
        '" height="' + (R * 0.18) + '" rx="1.5" fill="' + C.black + '"/>';
    });
    s += '<circle cx="' + (100 - R * 0.34) + '" cy="80" r="' + (R * 0.5) + '" fill="#fff" opacity=".06"/>';
    s += '<g transform="translate(' + (R * 0.62) + ',0)">';
    s += '<circle cx="100" cy="80" r="' + (R * 0.74) + '" fill="' + C.lite + '" stroke="' + C.dark + '" stroke-width="1"/>';
    s += teeth(100, 80, R * 0.72, R * 0.4, 12, C.copper);
    s += '<circle cx="100" cy="80" r="' + (R * 0.36) + '" fill="url(#g' + u + ')" stroke="' + C.edge + '" stroke-width="1"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.14) + '" fill="' + C.black + '"/>';
    s += '</g>';
    return s;
  }

  function stator(R, u) {
    var s = '<defs>' + grad("g" + u, C.hi, C.mid, 60) + '</defs>';
    for (var i = 3; i >= 1; i--) {
      s += '<circle cx="' + (100 + i * 2.2) + '" cy="' + (80 + i * 2.2) + '" r="' + R + '" fill="' + C.dark + '" opacity=".5"/>';
    }
    s += '<circle cx="100" cy="80" r="' + R + '" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.94) + '" fill="' + C.lite + '"/>';
    s += teeth(100, 80, R * 0.92, R * 0.44, 18, C.mid);
    s += '<circle cx="100" cy="80" r="' + (R * 0.4) + '" fill="#fff"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.4) + '" fill="none" stroke="' + C.edge + '" stroke-width="1"/>';
    s += holes(100, 80, R * 0.68, 4, Math.max(2, R * 0.05), C.deep);
    s += '<path d="M' + (100 + R * 0.66) + ' ' + (80 + R * 0.5) + ' q ' + (R * 0.4) + ' ' + (R * 0.3) + ' ' +
      (R * 0.1) + ' ' + (R * 0.62) + '" fill="none" stroke="' + C.copper + '" stroke-width="3"/>';
    return s;
  }

  function prop(R, u) {
    var s = '<defs>' + grad("g" + u, C.hi, C.mid, 60) + '</defs>';
    s += '<g stroke="' + C.dark + '" stroke-width="1">';
    s += '<path d="M100 80 C ' + (100 - R * 2.1) + ' ' + (80 - R * 0.5) + ' ' + (100 - R * 2.2) + ' ' + (80 + R * 0.16) +
      ' 100 ' + (80 + R * 0.14) + ' Z" fill="' + C.edge + '"/>';
    s += '<path d="M100 80 C ' + (100 + R * 2.1) + ' ' + (80 + R * 0.5) + ' ' + (100 + R * 2.2) + ' ' + (80 - R * 0.16) +
      ' 100 ' + (80 - R * 0.14) + ' Z" fill="' + C.deep + '"/>';
    s += '</g>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.72) + '" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += teeth(100, 80, R * 0.7, R * 0.46, 12, C.mid);
    s += '<circle cx="100" cy="80" r="' + (R * 0.42) + '" fill="' + C.lite + '" stroke="' + C.edge + '" stroke-width="1"/>';
    s += holes(100, 80, R * 0.28, 4, Math.max(1.8, R * 0.045));
    s += '<circle cx="100" cy="80" r="' + (R * 0.1) + '" fill="' + C.black + '"/>';
    s += '<circle cx="100" cy="80" r="' + (R * 0.72) + '" fill="none" stroke="' + C.accent + '" stroke-width="1.6" opacity=".8"/>';
    return s;
  }

  function accessory(R, u) {
    var w = R * 1.5, h = R * 0.92;
    var s = '<defs>' + grad("g" + u, C.hi, C.lite, 70) + '</defs>';
    s += '<rect x="' + (100 - w / 2 + 4) + '" y="' + (80 - h / 2 + 5) + '" width="' + w + '" height="' + h +
      '" rx="5" fill="' + C.dark + '" opacity=".45"/>';
    s += '<rect x="' + (100 - w / 2) + '" y="' + (80 - h / 2) + '" width="' + w + '" height="' + h +
      '" rx="5" fill="url(#g' + u + ')" stroke="' + C.dark + '" stroke-width="1"/>';
    s += '<rect x="' + (100 - w / 2 + 8) + '" y="' + (80 - h / 2 + 8) + '" width="' + (w - 16) + '" height="' + (h * 0.34) +
      '" rx="2" fill="' + C.black + '" opacity=".85"/>';
    for (var i = 0; i < 4; i++) {
      s += '<rect x="' + (100 - w / 2 + 12 + i * 11) + '" y="' + (80 + h * 0.06) + '" width="7" height="7" rx="1" fill="' + C.edge + '"/>';
    }
    s += '<rect x="' + (100 + w / 2 - 3) + '" y="' + (80 - 7) + '" width="10" height="14" rx="2" fill="' + C.deep + '"/>';
    s += '<path d="M' + (100 + w / 2 + 7) + ' 80 q 22 0 20 26" fill="none" stroke="' + C.black + '" stroke-width="3.4"/>';
    s += '<circle cx="' + (100 - w / 2 + 14) + '" cy="' + (80 + h / 2 - 9) + '" r="2.6" fill="' + C.accent + '"/>';
    return s;
  }

  function lamination(R, u) {
    var s = '<defs>' + grad("g" + u, C.hi, C.mid, 60) + '</defs>';
    for (var i = 6; i >= 0; i--) {
      var dx = i * 3.4, dy = i * -2.4, o = i === 0 ? 1 : 0.55 - i * 0.05;
      s += '<g transform="translate(' + dx + ',' + dy + ')" opacity="' + o.toFixed(2) + '">';
      s += '<circle cx="100" cy="88" r="' + (R * 0.78) + '" fill="' + (i === 0 ? "url(#g" + u + ")" : C.lite) +
        '" stroke="' + C.dark + '" stroke-width="1"/>';
      s += teeth(100, 88, R * 0.76, R * 0.4, 18, i === 0 ? C.mid : C.mid);
      s += '<circle cx="100" cy="88" r="' + (R * 0.34) + '" fill="#fff"/>';
      s += '<circle cx="100" cy="88" r="' + (R * 0.34) + '" fill="none" stroke="' + C.edge + '" stroke-width="1"/>';
      s += '</g>';
    }
    s += '<path d="M' + (100 + R * 0.9) + ' ' + (88 - R * 0.5) + ' l 16 -11" stroke="' + C.accent +
      '" stroke-width="1.4" fill="none"/>';
    return s;
  }

  var VARIANTS = {
    actuator: function (R, u) { return actuator(R, u, false); },
    hollow: function (R, u) { return actuator(R, u, true); },
    gimbal: gimbal,
    frameless: frameless,
    stator: stator,
    prop: prop,
    accessory: accessory,
    lamination: lamination
  };

  /* render(type, size, opts) -> SVG string.
     size ~0.6–1.15 scales the part; alt supplies an accessible label. */
  function render(type, size, opts) {
    opts = opts || {};
    var fn = VARIANTS[type] || VARIANTS.actuator;
    var R = Math.max(26, Math.min(70, 62 * (size || 1)));
    var u = "a" + (++uid);
    var label = opts.alt ? '<title>' + esc(opts.alt) + '</title>' : "";
    return '<svg viewBox="0 0 200 160" role="img" aria-label="' + esc(opts.alt || type + " illustration") + '" ' +
      'style="width:100%;height:auto">' + label + fn(R, u) + '</svg>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  return { render: render };
})();
