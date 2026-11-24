(function () {
  var body = document.body;
  var splash = document.getElementById("splash");
  var leaf = document.getElementById("sp-leaf");
  var skip = document.getElementById("sp-skip");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Show the door once per browser session. A link straight to a section skips it.
  var seen = false;
  try { seen = sessionStorage.getItem("btd-entered") === "1"; } catch (e) {}
  var deepLink = location.hash && location.hash.length > 1;

  function remember() { try { sessionStorage.setItem("btd-entered", "1"); } catch (e) {} }

  function finish() {
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    body.classList.remove("splash-on");
  }

  function arrive() {
    body.classList.remove("splash-on");
    body.classList.add("arriving");
    splash.classList.add("is-done");
    setTimeout(finish, 1700);
  }

  var opened = false;
  var DOOR_MS = 2800;     // door swings open
  var FLOOD_AT = 1500;    // light starts to take over the screen
  var FLOOD_MS = 2300;
  var MAX_ANGLE = 88;     // degrees, toward the viewer

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeInOut(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }

  function openDoor() {
    if (opened) return;
    opened = true;
    remember();
    if (reduced) { arrive(); return; }
    // start from wherever the hover left the door
    var cs = getComputedStyle(splash);
    var a0 = parseFloat(cs.getPropertyValue("--a")) || 0;
    splash.classList.add("is-opening");
    var start = performance.now();
    function frame(now) {
      var t = now - start;
      var p = easeInOut(clamp(t / DOOR_MS));
      var a = a0 + (-MAX_ANGLE - a0) * p;
      // light through the opening grows with the gap the swinging door uncovers
      var f = clamp((1 - Math.cos(a * Math.PI / 180)) * 1.08);
      var q = clamp((t - FLOOD_AT) / FLOOD_MS);
      q = q * q * (3 - 2 * q);
      splash.style.setProperty("--a", a.toFixed(2));
      splash.style.setProperty("--f", f.toFixed(3));
      splash.style.setProperty("--q", q.toFixed(3));
      if (t < FLOOD_AT + FLOOD_MS) requestAnimationFrame(frame);
      else arrive();
    }
    requestAnimationFrame(frame);
  }

  if (splash && !seen && !deepLink) {
    splash.hidden = false;
    body.classList.add("splash-on");
    splash.addEventListener("click", function (e) {
      if (e.target === skip) return;
      openDoor();
    });
    leaf.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDoor(); }
    });
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      remember();
      opened = true;
      arrive();
    });
  } else {
    finish();
  }

  // Mailing list: not connected to a service yet.
  document.querySelectorAll("[data-signup]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".signup-note");
      if (note) note.textContent = "Thank you. Our mailing list opens soon, so we haven't saved this yet.";
    });
  });

  var replay = document.getElementById("replay-door");
  if (replay) replay.addEventListener("click", function (e) {
    e.preventDefault();
    try { sessionStorage.removeItem("btd-entered"); } catch (err) {}
    if (location.hash) history.replaceState(null, "", location.pathname);
    location.reload();
  });

  var y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();
