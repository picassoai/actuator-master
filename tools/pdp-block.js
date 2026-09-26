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
                          : art(p.art, p.name)) + "</div>" +
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
            '<a class="btn" href="select.html?t=' + esc(p.type) + '" style="margin-left:10px">' +
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

    Array.prototype.forEach.call(document.querySelectorAll("[data-shot]"), function (b) {
      b.addEventListener("click", function () {
        $("[data-main]").innerHTML = '<img src="' + esc(b.getAttribute("data-shot")) +
          '" alt="' + esc(p.name) + '">';
        Array.prototype.forEach.call(document.querySelectorAll(".pdp2-thumb"), function (o) {
          o.classList.toggle("on", o === b);
        });
      });
    });
  }

