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

