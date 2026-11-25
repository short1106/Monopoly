// Kleine Helfer: Bestätigungen, Status-Polling, Entwurf speichern.
(function () {
  "use strict";

  // Bestätigung vor gefährlichen Aktionen
  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    var submitter = ev.submitter;
    var msg = (submitter && submitter.dataset.confirm) || form.dataset.confirm;
    if (msg && !window.confirm(msg)) {
      ev.preventDefault();
    }
  });

  // Polling, solange April schreibt oder korrigiert
  var waiting = document.querySelector("[data-poll]");
  if (waiting) {
    var url = waiting.dataset.poll;
    var start = waiting.dataset.status;
    var tries = 0;
    var poll = function () {
      tries += 1;
      fetch(url, { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && data.status !== start) {
            window.location.reload();
          } else if (tries < 200) {
            setTimeout(poll, tries < 10 ? 3000 : 6000);
          }
        })
        .catch(function () { if (tries < 200) setTimeout(poll, 8000); });
    };
    setTimeout(poll, 3000);
  }

  // Antworten zwischenspeichern, damit nichts verloren geht
  var examForm = document.querySelector("form[data-draft]");
  if (examForm) {
    var state = examForm.querySelector(".draft-state");
    var timer = null;
    var save = function () {
      var body = new FormData(examForm);
      fetch(examForm.dataset.draft, { method: "POST", body: body, credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : { saved: false }; })
        .then(function (d) { if (state) state.textContent = d.saved ? "entwurf gespeichert" : "entwurf nicht gespeichert"; })
        .catch(function () { if (state) state.textContent = "offline, entwurf nicht gespeichert"; });
    };
    examForm.addEventListener("input", function () {
      if (state) state.textContent = "…";
      clearTimeout(timer);
      timer = setTimeout(save, 1500);
    });
  }
})();
