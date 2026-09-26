/* Omnii Robotics — home page.
 *
 * Deliberately small. This is a layout prototype: it renders the header, the
 * footer and the home sections, and the picker actually filters so the idea can
 * be judged rather than imagined. Cart, checkout and the static-page generator
 * are still to come.
 */
(function () {
  "use strict";

  var S = window.SITE, TYPES = window.TYPES, APPS = window.APPLICATIONS,
      SUPPLIERS = window.SUPPLIERS, PRODUCTS = window.PRODUCTS,
      HEROES = window.HEROES || {},
      VIEWS = window.VIEWS || [];
  /* What the nav and the home grid browse by: the five technologies plus the
     hollow-shaft view. A hollow part is listed under both, which is correct —
     it is both. */
  var BROWSE = (function () {
    var all = VIEWS.concat(TYPES);
    var order = window.BROWSE_ORDER || [];
    return all.slice().sort(function (x, y) {
      var i = order.indexOf(x.id), j = order.indexOf(y.id);
      return (i < 0 ? 99 : i) - (j < 0 ? 99 : j);
    });
  })();

  function variants(p) {
    if (!p.group) return [p];
    return PRODUCTS.filter(function (x) { return x.group === p.group; })
      .slice().sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
  }
  function isLead(p) { return !p.group || variants(p)[0].id === p.id; }
  function fold(list) { return list.filter(isLead); }

  function selects(entry) {
    return entry.match || function (p) { return p.type === entry.id; };
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* A part we carry but have no price for yet is not free, and it is not
     hidden either — a buyer searching for RH-25 should still find us. */
  function money(n) {
    if (n === null || n === undefined) return "Request a quote";
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function badges(p) {
    var b = [];
    if (p.hollow) b.push("Hollow shaft");
    if (p.rotor) b.push(p.rotor === "outer" ? "Outer rotor" : "Inner rotor");
    return b.length ? '<div class="attrs">' + b.map(function (x) {
      return '<span class="attr">' + esc(x) + "</span>";
    }).join("") + "</div>" : "";
  }
  /* ART exposes render(type, size, opts), not a dictionary — indexing it
     returned undefined, so every vector fallback on the site was blank. */
  function art(kind, alt) {
    return window.ART ? window.ART.render(kind, 1, { alt: alt || "" }) : "";
  }
  /* MyActuator supplies no photography, so those cards keep the vector art.
     Mixing a drawing in beside photographs is better than a stock photo of the
     wrong motor. */
  function shot(p, alt) {
    return p.img
      ? '<img src="' + esc(p.img) + '" alt="' + esc(alt || p.name) + '" loading="lazy">'
      : art(p.art, p.name);
  }
  function exemplar(entry) {
    var pick = selects(entry);
    var withPhoto = PRODUCTS.filter(function (p) { return pick(p) && p.img; });
    return withPhoto.sort(function (a, b) { return (b.price || 0) - (a.price || 0); })[0];
  }
  function dash(v, unit, pre) {
    return (v === null || v === undefined) ? "—" : (pre || "") + v + (unit || "");
  }
  function type(id) { return TYPES.filter(function (t) { return t.id === id; })[0]; }
  function real(p) { return !p.placeholder; }
  function countOf(entry) { return fold(PRODUCTS.filter(selects(entry))).length; }

  /* One place to POST a form, so a second form later does not grow a second
     copy of the error handling. */
  function postForm(body) {
    if (!S.formEndpoint) {
      return Promise.reject(new Error("The form is not connected yet."));
    }
    return fetch(S.formEndpoint, {
      method: "POST", body: body, headers: { Accept: "application/json" }
    }).then(function (r) {
      if (r.ok) return true;
      return r.json().catch(function () { return {}; }).then(function (d) {
        throw new Error((d.errors || []).map(function (x) { return x.message; }).join(", ") ||
          "The form service returned " + r.status + ".");
      });
    });
  }

  /* ---------- header / footer ------------------------------------------ */

  function renderChrome() {
    $("#site-header").innerHTML =
      '<div class="announce"><div class="wrap">' +
        S.announce.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") +
      "</div></div>" +
      '<header class="site-header"><div class="wrap header-bar">' +
        '<a class="brand" href="index.html"><strong>' + esc(S.brand) + "</strong></a>" +
        '<nav class="nav">' +
          BROWSE.map(function (t) {
            return '<a class="nav-link" href="select.html?t=' + esc(t.id) + '">' + esc(t.name) + "</a>";
          }).join("") +
        "</nav>" +
        '<div class="header-tools"><a class="btn btn-sm" href="select.html">Find by spec</a></div>' +
      "</div></header>";

    $("#site-footer").innerHTML =
      '<footer class="site-footer"><div class="wrap footer-grid">' +
        '<div class="footer-about"><strong>' + esc(S.brand) + "</strong>" +
          "<p class=\"muted\">Robotic actuators from several suppliers, specified and supported in the US.</p></div>" +
        /* A list, not a run of inline anchors: without the list the names ran
           into each other as "Planetary / QDDHarmonicHollow shaft". */
        "<div><h4>By type</h4><ul>" +
          BROWSE.map(function (t) {
            return '<li><a href="select.html?t=' + esc(t.id) + '">' + esc(t.name) + "</a></li>";
          }).join("") + "</ul></div>" +
        "<div><h4>By application</h4><ul>" +
          APPS.slice(0, 4).map(function (a) {
            return '<li><a href="select.html?a=' + esc(a.id) + '">' + esc(a.name) + "</a></li>";
          }).join("") + "</ul></div>" +
        "<div><h4>Ask</h4><ul>" +
          '<li><a href="contact.html">Tell us what the joint has to do</a></li>' +
          '<li><a href="select.html">Every model on one table</a></li>' +
          '<li><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></li>" +
        "</ul></div>" +
      "</div>" +
      '<div class="wrap footer-legal"><span>&copy; ' + S.year + " " + esc(S.brand) +
        " &middot; layout prototype, not a live store</span></div></footer>";
  }

  /* ---------- 2. by type ------------------------------------------------ */

  function renderTypes() {
    $("[data-types]").innerHTML = BROWSE.map(function (t) {
      var n = countOf(t);
      var ex = exemplar(t);
      return '<a class="type-card" href="select.html?t=' + esc(t.id) + '">' +
        '<div class="type-art' + (ex ? " has-photo" : "") + '">' +
          (ex ? shot(ex, t.name) : art(t.art, t.name)) + "</div>" +
        '<div class="type-body">' +
          "<h3>" + esc(t.name) + "</h3>" +
          '<div class="type-tease">' + esc(t.tease) + "</div>" +
          "<p>" + esc(t.when) + "</p>" +
          '<div class="type-count">' +
            (n ? n + (n === 1 ? " model" : " models") : "sourcing") + "</div>" +
        "</div></a>";
    }).join("");
  }

  /* ---------- 3. comparison demo ---------------------------------------- */

  /* Three real rows, so the "one table" claim is visible rather than asserted.
     The condition column is the point: it is what stops the table from being a
     misleading ranking of numbers measured differently. */
  function renderCompareDemo() {
    /* One row from each supplier, so the claim is demonstrated rather than made. */
    var ids = ["cm-ak80-9-v3-0-kv100", "ma-x8-20", "sw-gim8115-9"];
    var rows = ids.map(function (id) {
      return PRODUCTS.filter(function (p) { return p.id === id; })[0];
    }).filter(Boolean);
    var fields = [
      ["Rated torque", function (p) { return dash(p.spec.torque, " N·m"); }],
      ["Peak torque",  function (p) { return dash(p.spec.peak, " N·m"); }],
      ["Outer dia.",   function (p) { return dash(p.spec.od, " mm", "Ф"); }],
      ["Weight",       function (p) { return dash(p.spec.weight, " g"); }],
      ["Ratio",        function (p) { return dash(p.spec.ratio, ":1"); }],
      ["Rated at",     function (p) { return p.spec.ratedAt; }]
    ];
    $("[data-compare-demo]").innerHTML =
      '<table class="demo-table"><thead><tr><th></th>' +
        rows.map(function (p) {
          return '<th><div class="demo-shot">' + shot(p) + "</div>" + esc(p.name) +
            '<span class="demo-sup">' + esc(SUPPLIERS[p.supplier].name) + "</span></th>";
        }).join("") + "</tr></thead><tbody>" +
      fields.map(function (f) {
        var vals = rows.map(f[1]);
        var differs = vals.some(function (v) { return v !== vals[0]; });
        return '<tr class="' + (differs ? "differs" : "") + '"><th>' + esc(f[0]) + "</th>" +
          vals.map(function (v) { return "<td>" + esc(v) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }

  /* ---------- 4. by application ----------------------------------------- */

  function renderApps() {
    $("[data-apps]").innerHTML = APPS.map(function (a) {
      var ex = PRODUCTS.filter(function (p) { return p.id === a.shot; })[0];
      return '<a class="app-card" href="select.html?a=' + esc(a.id) + '">' +
        '<div class="thumb">' +
          (ex ? shot(ex, a.name) : art(a.art, a.name)) + "</div>" +
        "<h3>" + esc(a.name) + "</h3><p>" + esc(a.blurb) + "</p>" +
        (a.joints ? '<div class="joint-hint">' + a.joints.length + " joints covered</div>" : "") +
        "</a>";
    }).join("");
  }

  /* ---------- 5. why here ----------------------------------------------- */

  function renderWhy() {
    var items = [
      ["Not tied to one supplier",
       "We carry several lines, so the recommendation can be the right part rather than the only part we sell."],
      ["Specifications on one basis",
       "Every rated figure carries the voltage and thermal condition behind it, so a comparison is a comparison."],
      ["An engineer before you buy",
       "Send the torque, the envelope and the duty cycle. You get a shortlist and the reasoning, not a catalogue."]
    ];
    $("[data-why]").innerHTML = items.map(function (i) {
      return '<div class="why-item"><h3>' + esc(i[0]) + "</h3><p>" + esc(i[1]) + "</p></div>";
    }).join("");
  }

  /* ---------- 1. the picker --------------------------------------------- */

  function inRange(v, spec) {
    if (!spec) return true;
    var a = spec.split(",");
    return v >= Number(a[0]) && v < Number(a[1]);
  }

  function renderPicker() {
    var sel = $("#p-type");
    sel.innerHTML = '<option value="">Any</option>' + BROWSE.map(function (t) {
      return '<option value="' + esc(t.id) + '">' + esc(t.name) + "</option>";
    }).join("");

    $("[data-picker]").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = $("#p-torque").value, od = $("#p-od").value, ty = sel.value;
      /* Placeholder rows have no trustworthy numbers, so they cannot answer a
         question about torque. Excluded rather than shown with zeros. */
      var pick = ty ? selects(BROWSE.filter(function (b) { return b.id === ty; })[0]) : null;
      var hits = fold(PRODUCTS.filter(function (p) {
        return (!pick || pick(p)) &&
               inRange(p.spec.torque, t) && inRange(p.spec.od, od);
      })).sort(function (a, b) { return a.spec.torque - b.spec.torque; });

      $("[data-picker-note]").textContent = hits.length
        ? hits.length + (hits.length === 1 ? " model fits" : " models fit") +
          ", from " + new Set(hits.map(function (p) { return p.supplier; })).size + " supplier(s)."
        : "Nothing in the catalogue fits that yet — tell us and we will source it.";

      $("[data-picker-results]").innerHTML = !hits.length ? "" :
        '<div class="hit-grid">' + hits.map(function (p) {
          return '<a class="hit" href="product.html?id=' + esc(p.id) + '">' +
            '<div class="hit-art">' + shot(p) + "</div>" +
            '<div class="hit-name">' + esc(p.name) + "</div>" +
            '<div class="hit-sup">' + esc(SUPPLIERS[p.supplier].name) + "</div>" +
            '<div class="hit-torque">' + p.spec.torque + " N·m</div>" +
            '<div class="hit-dims">Ф' + p.spec.od + " · " + p.spec.weight +
              " g · " + p.spec.ratio + ":1</div>" + badges(p) +
            '<div class="hit-price">' + (variants(p).length > 1 ? "From " : "") +
              money(p.price) + "</div>" +
          "</a>";
        }).join("") + "</div>";
    });
  }

  /* ---------- page: find by spec ---------------------------------------- */

  var COLS = [
    ["name",   "Model",       function (p) { return p.name; }],
    ["sup",    "Supplier",    function (p) { return SUPPLIERS[p.supplier].name; }],
    ["type",   "Type",        function (p) { return type(p.type).name; }],
    ["torque", "Rated N·m",   function (p) { return p.spec.torque; }],
    ["peak",   "Peak N·m",    function (p) { return p.spec.peak; }],
    ["od",     "OD mm",       function (p) { return p.spec.od; }],
    ["weight", "Weight g",    function (p) { return p.spec.weight; }],
    ["ratio",  "Ratio",       function (p) { return p.spec.ratio; }],
    ["hollow", "Hollow",      function (p) { return p.hollow ? "yes" : null; }],
    ["rated",  "Rated at",    function (p) { return p.spec.ratedAt; }],
    ["price",  "Price",       function (p) { return p.price; }]
  ];

  /* The order data.js emits products in — myactuator, cubemars, siggear,
     steadywin — is a commercial ordering, so brand cards follow it rather than
     the alphabet. */
  function supRank(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].supplier === id) return i;
    }
    return 1e9;
  }

  function pageSelect() {
    var picked = { type: "all", supplier: null }, sortKey = "torque", sortDir = 1;

    function entryOf() {
      return BROWSE.filter(function (b) { return b.id === picked.type; })[0];
    }
    function inType() {
      var e = entryOf();
      var pick = e ? selects(e) : null;
      return fold(PRODUCTS.filter(function (p) { return !pick || pick(p); }));
    }
    var view = function () {
      return inType().filter(function (p) {
        return !picked.supplier || p.supplier === picked.supplier;
      }).slice().sort(function (a, b) {
        var col = COLS.filter(function (c) { return c[0] === sortKey; })[0];
        var x = col[2](a), y = col[2](b);
        /* A missing figure sorts last in both directions. It is not a small
           number, it is an absent one, and burying it under the zeros would
           read as "this motor makes no torque". */
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        if (typeof x === "number") return (x - y) * sortDir;
        return String(x).localeCompare(String(y)) * sortDir;
      });
    };

    /* ---- the brand step -------------------------------------------------
       A visitor who has chosen a technology usually knows the two or three
       names that make it, so showing who before showing which is fewer
       decisions, not more. The escape hatch under the lede matters as much as
       the grid: comparing across suppliers is what this catalogue is for. */
    function brands() {
      var by = {};
      inType().forEach(function (p) { (by[p.supplier] = by[p.supplier] || []).push(p); });
      return Object.keys(by).sort(function (a, b) { return supRank(a) - supRank(b); })
        .map(function (id) { return { id: id, list: by[id] }; });
    }

    function span(list, get, unit, pre) {
      var v = list.map(get).filter(function (x) { return x !== null && x !== undefined; });
      if (!v.length) return null;
      var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
      return (pre || "") + (lo === hi ? lo : lo + " – " + hi) + (unit || "");
    }

    function drawBrands() {
      var e = entryOf();
      $("[data-brands]").innerHTML = brands().map(function (g) {
        /* A named face-on shot if there is one for this maker and technology,
           otherwise the dearest part with a photograph — that one still reads
           as a product at card size rather than as a component. */
        var ex = PRODUCTS.filter(function (p) {
          return p.id === HEROES[g.id + ":" + picked.type];
        })[0] || g.list.filter(function (p) { return p.img; })
          .sort(function (a, b) { return (b.price || 0) - (a.price || 0); })[0] || g.list[0];
        var priced = g.list.filter(function (p) { return p.price !== null && p.price !== undefined; });
        var from = priced.length
          ? Math.min.apply(null, priced.map(function (p) { return p.price; })) : null;
        var torque = span(g.list, function (p) { return p.spec.torque; }, " N·m");
        var od = span(g.list, function (p) { return p.spec.od; }, " mm", "Ф");
        return '<a class="brand-card" href="select.html?t=' + esc(picked.type) +
            "&s=" + esc(g.id) + '">' +
          '<div class="brand-art">' +
            shot(ex, SUPPLIERS[g.id].name + " " + e.name) + "</div>" +
          '<div class="brand-body"><h3>' + esc(SUPPLIERS[g.id].name) + "</h3>" +
            '<div class="brand-count">' + g.list.length +
              (g.list.length === 1 ? " model" : " models") + "</div>" +
            '<dl class="brand-span">' +
              (torque ? "<dt>Rated</dt><dd>" + esc(torque) + "</dd>" : "") +
              (od ? "<dt>Diameter</dt><dd>" + esc(od) + "</dd>" : "") +
            "</dl>" +
            '<div class="brand-from">' +
              (from === null ? "Quote only" : "From " + money(from)) + "</div>" +
          "</div></a>";
      }).join("");
    }

    function draw() {
      var rows = view();
      $("[data-count]").textContent = rows.length + " models";
      var known = rows.filter(function (p) { return p.spec.torque !== null; }).length;
      $("[data-known]").textContent = "rated torque published for " + known;

      $("[data-table]").innerHTML =
        "<thead><tr>" + COLS.map(function (c) {
          return '<th data-sort="' + c[0] + '" class="' +
            (c[0] === sortKey ? "sorted" : "") + '">' + esc(c[1]) +
            (c[0] === sortKey ? (sortDir > 0 ? " ↑" : " ↓") : "") + "</th>";
        }).join("") + "</tr></thead><tbody>" +
        rows.map(function (p) {
          return '<tr><td class="model"><span class="row-shot">' + shot(p) + "</span>" +
            '<a href="product.html?id=' + esc(p.id) + '">' + esc(p.name) + "</a></td>" +
            COLS.slice(1).map(function (c) {
              var v = c[2](p);
              /* A missing price is not a missing figure — it is an invitation. */
              if (c[0] === "price") {
                var vs = variants(p);
                return '<td class="quote">' +
                  esc((vs.length > 1 ? "From " : "") + money(v)) + "</td>";
              }
              if (v === null || v === undefined) {
                return '<td class="gap" title="not published by the supplier">—</td>';
              }
              if (c[0] === "rated") {
                var soft = /unverified|unstated/.test(v);
                return '<td class="' + (soft ? "soft" : "") + '">' + esc(v) + "</td>";
              }
              return "<td>" + esc(v) + "</td>";
            }).join("") + "</tr>";
        }).join("") + "</tbody>";

      Array.prototype.forEach.call(document.querySelectorAll("[data-sort]"), function (th) {
        th.addEventListener("click", function () {
          var k = th.getAttribute("data-sort");
          if (k === sortKey) { sortDir = -sortDir; } else { sortKey = k; sortDir = 1; }
          draw();
        });
      });
    }

    /* Brand grid when a technology is chosen and a maker is not; the table in
       every other case, including "all types", where a brand grid would be
       four cards standing in front of the whole catalogue. */
    function render(forceTable) {
      var e = entryOf();
      var byBrand = !!(e && !picked.supplier && !forceTable);
      $("[data-brands]").hidden = !byBrand;
      $("[data-tablewrap]").hidden = byBrand;
      $("[data-head]").textContent = !e ? "Every model, every supplier, one table"
        : picked.supplier ? SUPPLIERS[picked.supplier].name + " · " + e.name
        : e.name;
      $("[data-lede]").innerHTML = !e
        ? "Sort on any column. A blank is a figure we do not have from the supplier " +
          "— we would rather show the gap than fill it in."
        : byBrand
          ? esc(e.when || e.tease || "") + " Pick a maker below, or " +
            '<a href="select.html?t=' + esc(e.id) + '&s=all">put all ' + inType().length +
            " on one table</a>."
          : '<a href="select.html?t=' + esc(e.id) + '">All makers of ' +
            esc(e.name.toLowerCase()) + "</a> &middot; " +
            '<a href="select.html">the whole catalogue</a>';
      if (byBrand) { drawBrands(); } else { draw(); }
    }

    $("[data-filters]").innerHTML =
      '<div class="filter-row"><span class="filter-label">Type</span><div class="chips">' +
      [{ id: "all", name: "All" }].concat(BROWSE).map(function (t) {
        return '<button class="chip" type="button" data-t="' + esc(t.id) + '" aria-pressed="' +
          (t.id === "all") + '">' + esc(t.name) + "</button>";
      }).join("") + "</div></div>";

    Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (b) {
      b.addEventListener("click", function () {
        picked.type = b.getAttribute("data-t");
        picked.supplier = null;
        Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (o) {
          o.setAttribute("aria-pressed", o.getAttribute("data-t") === picked.type);
        });
        render();
      });
    });

    var q = new URLSearchParams(location.search);
    var pre = q.get("t"), sup = q.get("s"), app = q.get("a");
    /* An application is a filter of its own, cutting across the technologies,
       so it replaces the type step rather than nesting inside it. */
    var picked_app = APPS.filter(function (x) { return x.id === app; })[0];
    if (picked_app) {
      $("[data-brands]").hidden = true;
      $("[data-tablewrap]").hidden = false;
      $("[data-head]").textContent = picked_app.name;
      $("[data-lede]").innerHTML = esc(picked_app.why || picked_app.blurb) +
        ' <a href="select.html">See the whole catalogue</a>.';
      var pick = picked_app.match || function () { return true; };
      view = function () {
        return fold(PRODUCTS.filter(pick)).slice().sort(function (x, y) {
          var col = COLS.filter(function (c) { return c[0] === sortKey; })[0];
          var i = col[2](x), j = col[2](y);
          if (i === null || i === undefined) return 1;
          if (j === null || j === undefined) return -1;
          if (typeof i === "number") return (i - j) * sortDir;
          return String(i).localeCompare(String(j)) * sortDir;
        });
      };
      Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (o) {
        o.setAttribute("aria-pressed", "false");
      });
      draw();
      return;
    }
    if (pre && BROWSE.some(function (t) { return t.id === pre; })) {
      picked.type = pre;
      Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (o) {
        o.setAttribute("aria-pressed", o.getAttribute("data-t") === pre);
      });
      if (sup && SUPPLIERS[sup]) { picked.supplier = sup; }
    }
    /* s=all is how the escape hatch asks for every maker on one table. */
    render(sup === "all");
  }

  /* ---------- page: one product ----------------------------------------- */

  function pageProduct() {
    var id = new URLSearchParams(location.search).get("id");
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    var host = $("[data-pdp]");
    if (!p) {
      host.innerHTML = '<div class="empty-state"><h2>No such part</h2>' +
        "<p>It may have been renamed. The full table is the surest way to find it.</p>" +
        '<a class="btn btn-accent" href="select.html">Find by spec</a></div>';
      return;
    }
    document.title = p.name + " \u2014 " + S.brand;

    var shots = (p.gallery && p.gallery.length) ? p.gallery : (p.img ? [p.img] : []);
    var t = type(p.type);

    /* The four figures a joint is chosen on. A blank is drawn as a blank: the
       supplier has not published it, and a dash says so where a zero would lie. */
    var tiles = [
      ["Rated torque", p.spec.torque, "N\u00b7m"],
      ["Peak torque", p.spec.peak, "N\u00b7m"],
      ["Outer diameter", p.spec.od, "mm"],
      ["Weight", p.spec.weight, "g"]
    ];

    var rows = [
      ["Supplier", SUPPLIERS[p.supplier].name],
      ["Type", t ? t.name : p.type],
      ["Gear ratio", p.spec.ratio ? p.spec.ratio + ":1" : null],
      ["Rated torque", p.spec.torque ? p.spec.torque + " N\u00b7m" : null],
      ["Peak torque", p.spec.peak ? p.spec.peak + " N\u00b7m" : null],
      ["Outer diameter", p.spec.od ? "\u0424" + p.spec.od + " mm" : null],
      ["Weight", p.spec.weight ? p.spec.weight + " g" : null],
      ["Hollow output shaft", p.hollow ? "Yes" : null],
      ["Rotor", p.rotor ? (p.rotor === "outer" ? "Outer" : "Inner") : null],
      ["Rated at", p.spec.ratedAt]
    ];

    host.innerHTML =
      '<div class="crumbs"><a href="index.html">Store</a><span>/</span>' +
        '<a href="select.html?t=' + esc(p.type) + '">' + esc(t ? t.name : p.type) +
        "</a><span>/</span>" + esc(p.name) + "</div>" +
      '<div class="pdp2">' +
        '<div class="pdp2-media">' +
          '<div class="pdp2-main" data-main>' +
            (shots.length ? '<img src="' + esc(shots[0]) + '" alt="' + esc(p.name) + '">'
                          : art(p.art, p.name)) +
            (shots.length > 1
              ? '<button class="pdp2-arrow prev" type="button" data-step="-1" ' +
                  'aria-label="Previous photograph">\u2039</button>' +
                '<button class="pdp2-arrow next" type="button" data-step="1" ' +
                  'aria-label="Next photograph">\u203a</button>' +
                '<div class="pdp2-dots" data-dots>' + shots.map(function (_, i) {
                  return '<i' + (i ? "" : ' class="on"') + "></i>";
                }).join("") + "</div>"
              : "") + "</div>" +
          (shots.length > 1
            ? '<div class="pdp2-thumbs">' + shots.map(function (src, i) {
                return '<button class="pdp2-thumb' + (i ? "" : " on") + '" type="button" ' +
                  'data-shot="' + esc(src) + '" aria-label="View ' + (i + 1) + '">' +
                  '<img src="' + esc(src) + '" alt=""></button>';
              }).join("") + "</div>"
            : "") +
        "</div>" +
        '<div class="pdp2-body">' +
          '<div class="pdp2-sup">' + esc(SUPPLIERS[p.supplier].name) + "</div>" +
          "<h1>" + esc(p.name) + "</h1>" +
          badges(p) +
          (function () {
            /* Links, not state: a shared URL then points at the version the
               sender was actually looking at. */
            var vs = variants(p);
            if (vs.length < 2) return "";
            return '<div class="variant-pick"><span>' + esc(p.axis || "Version") + "</span>" +
              vs.map(function (v) {
                return '<a class="vpick' + (v.id === p.id ? " on" : "") +
                  '" href="product.html?id=' + esc(v.id) + '">' + esc(v.label) +
                  "<b>" + esc(money(v.price)) + "</b></a>";
              }).join("") + "</div>";
          })() +
          '<div class="pdp2-price">' + esc(money(p.price)) + "</div>" +
          (p.price === null
            ? '<p class="muted">We carry this line but have no published price for this ' +
              "variant yet. Tell us the quantity and we will come back with one.</p>"
            : "") +
          '<div class="spec-tiles">' + tiles.map(function (x) {
            return '<div class="spec-tile"><b>' +
              ((x[1] === null || x[1] === undefined)
                 ? "\u2014"
                 : esc(x[1]) + "<span>" + x[2] + "</span>") +
              "</b>" + esc(x[0]) + "</div>";
          }).join("") + "</div>" +
          '<p style="margin-top:26px">' +
            '<a class="btn btn-accent" href="contact.html?p=' + esc(p.id) + '">Ask an engineer</a>' +
            /* straight to the table, not the maker chooser — the promise on
               this button is a comparison, not another menu */
            '<a class="btn" href="select.html?t=' + esc(p.type) + '&s=all" style="margin-left:10px">' +
              "Compare with similar</a></p>" +
        "</div>" +
      "</div>" +
      '<section class="section"><h2 class="pdp2-h2">Full specification</h2>' +
        '<table class="spec-table2"><tbody>' + rows.map(function (r) {
          if (r[1] === null || r[1] === undefined) return "";
          var soft = r[0] === "Rated at" && /unverified|unstated|not published/.test(r[1]);
          return "<tr><th>" + esc(r[0]) + '</th><td class="' + (soft ? "soft" : "") + '">' +
            esc(r[1]) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<p class="muted" style="font-size:13px;max-width:640px;margin-top:16px">' +
          "Rated torque depends on the bus voltage and the thermal limit it was measured at. " +
          "The last row is that condition. Where it says the figure is unverified or not " +
          "published, treat it as a starting point and ask before you commit.</p>" +
      "</section>";

    /* One index, three ways to move it: the arrows, the arrow keys and a
       horizontal swipe. The thumbnails set it directly. */
    var at = 0;
    function show(i) {
      if (!shots.length) return;
      at = (i + shots.length) % shots.length;
      var img = $("[data-main] img");
      if (img) { img.src = shots[at]; img.alt = p.name; }
      Array.prototype.forEach.call(document.querySelectorAll(".pdp2-thumb"), function (o, k) {
        o.classList.toggle("on", k === at);
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-dots] i"), function (o, k) {
        o.classList.toggle("on", k === at);
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-shot]"), function (b, i) {
      b.addEventListener("click", function () { show(i); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-step]"), function (b) {
      b.addEventListener("click", function () {
        show(at + Number(b.getAttribute("data-step")));
      });
    });
    if (shots.length > 1) {
      document.addEventListener("keydown", function (e) {
        /* not while someone is typing in the ask form */
        if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) return;
        if (e.key === "ArrowLeft") { show(at - 1); }
        if (e.key === "ArrowRight") { show(at + 1); }
      });
      var main = $("[data-main]"), x0 = null;
      main.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; },
                            { passive: true });
      main.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { show(at + (dx < 0 ? 1 : -1)); }
        x0 = null;
      }, { passive: true });
    }
  }

  /* ---------- page: ask an engineer ------------------------------------- */

  function pageAsk() {
    var id = new URLSearchParams(location.search).get("p");
    var p = id ? PRODUCTS.filter(function (x) { return x.id === id; })[0] : null;

    if (p) {
      var box = $("[data-asked]");
      box.hidden = false;
      box.innerHTML = '<div class="asked-shot">' + shot(p) + "</div>" +
        "<div><span>Asking about</span><b>" + esc(p.name) + "</b>" +
        '<em>' + esc(SUPPLIERS[p.supplier].name) + " \u00b7 " +
        esc((type(p.type) || {}).name || p.type) + "</em></div>" +
        '<a class="link-btn" href="contact.html">Not this one</a>';
    }

    $("[data-ask]").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var note = $("[data-ask-note]");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var body = new FormData(form);
      if (p) {
        body.append("part", p.name + " (" + SUPPLIERS[p.supplier].name + ", " + p.id + ")");
      }
      body.append("_subject", "Engineering enquiry" + (p ? " \u2014 " + p.name : ""));

      var btn = $("button[type=submit]", form);
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending\u2026";

      postForm(body).then(function () {
        form.innerHTML = '<div class="empty-state"><h2>Sent</h2>' +
          "<p>An engineer has it. You will hear back within one business day, at " +
          esc(body.get("email")) + ".</p>" +
          '<a class="btn" href="select.html">Back to the table</a></div>';
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = label;
        /* The form is not wired to a service yet; say so rather than pretending
           the message went somewhere. */
        note.innerHTML = "<strong>" + esc(err.message) + "</strong> " +
          "Email us directly at <a href=\"mailto:" + esc(S.email) + "\">" +
          esc(S.email) + "</a> and we will pick it up from there.";
      });
    });
  }

  /* ---------- boot ------------------------------------------------------ */

  renderChrome();
  var page = document.body.getAttribute("data-page");
  if (page === "select") {
    pageSelect();
  } else if (page === "product") {
    pageProduct();
  } else if (page === "contact") {
    pageAsk();
  } else {
    renderPicker();
    renderTypes();
    renderCompareDemo();
    renderApps();
    renderWhy();
  }
})();
