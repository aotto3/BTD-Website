/* Behind the Door: door splash, page transitions, dust in the light, sign-up. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Arrival: the veil (set by the inline head script) lifts ---------- */
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("arriving"); }); });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) root.classList.remove("leaving", "arriving");
  });

  /* ---------- Splash: the original door ---------- */
  var splash = document.getElementById("splash");
  var leaf = document.getElementById("sp-leaf");
  var skipLink = document.getElementById("sp-skip");
  function remember() { try { sessionStorage.setItem("btd-entered", "1"); } catch (e) {} }
  function entered() { root.classList.add("entered"); }

  if (splash && root.classList.contains("splash-on")) {
    if (/[?&]door\b/.test(location.search)) history.replaceState(null, "", location.pathname);
    var opened = false;
    var DOOR_MS = 2800, FLOOD_AT = 1500, FLOOD_MS = 2300, MAX_ANGLE = 88;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var easeInOut = function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; };

    var arrive = function () {
      root.classList.remove("splash-on");
      entered();
      splash.classList.add("is-done");
      // hand keyboard and screen-reader focus to the page, not the door that is fading away
      var main = document.getElementById("main");
      if (main && (!document.activeElement || splash.contains(document.activeElement) || document.activeElement === document.body)) main.focus({ preventScroll: true });
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 1700);
    };
    var openDoor = function () {
      if (opened) return;
      opened = true;
      remember();
      if (reduce) { arrive(); return; }
      var a0 = parseFloat(getComputedStyle(splash).getPropertyValue("--a")) || 0;   // start from the hover crack
      splash.classList.add("is-opening");
      var start = performance.now();
      (function frame(now) {
        var t = Math.max(0, now - start);
        var p = easeInOut(clamp(t / DOOR_MS));
        var a = a0 + (-MAX_ANGLE - a0) * p;
        var f = clamp((1 - Math.cos(a * Math.PI / 180)) * 1.08);   // light grows with the uncovered gap
        var q = clamp((t - FLOOD_AT) / FLOOD_MS); q = q * q * (3 - 2 * q);
        splash.style.setProperty("--a", a.toFixed(2));
        splash.style.setProperty("--f", f.toFixed(3));
        splash.style.setProperty("--q", q.toFixed(3));
        if (q > .6) entered();   // the page starts to settle in while the light still fills the screen
        if (t < FLOOD_AT + FLOOD_MS) requestAnimationFrame(frame); else arrive();
      })(start);
    };
    splash.addEventListener("click", function (e) { if (e.target !== skipLink) openDoor(); });
    leaf.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDoor(); } });
    skipLink.addEventListener("click", function (e) { e.preventDefault(); remember(); opened = true; arrive(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !opened) { remember(); opened = true; arrive(); } });
  } else {
    if (splash) splash.parentNode.removeChild(splash);
    requestAnimationFrame(entered);
  }

  /* "Open the door again": back to the home page with the splash */
  document.querySelectorAll("[data-replay]").forEach(function (el) {
    el.addEventListener("click", function () { try { sessionStorage.removeItem("btd-entered"); } catch (e) {} });
  });

  /* ---------- Page transitions: fade through warm light ---------- */
  function isInternal(a) {
    if (!a || a.target || a.hasAttribute("download")) return false;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto|tel):/.test(href)) return false;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash && !url.search) return false;
    return true;
  }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a");
    if (!isInternal(a)) return;
    if (reduce) return;
    e.preventDefault();
    var wait = 300;
    if (a.classList.contains("choice")) { a.classList.add("is-entering"); wait = 520; }   // the door swings first
    root.classList.add("leaving");
    setTimeout(function () { location.href = a.href; }, wait);
  });

  /* ---------- Dust drifting in the pillar of light ---------- */
  var cv = document.getElementById("dust");
  if (cv && !reduce) {
    var ctx = cv.getContext("2d"), motes = [], w = 0, h = 0, running = true;
    var size = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var beamX = function () { return w < 700 ? w - 20 : w * 0.8; };
    var spawn = function (initial) {
      var spread = Math.min(w * 0.35, 420);
      return { x: beamX() - Math.random() * spread * Math.random(), y: initial ? Math.random() * h : h * (0.6 + Math.random() * 0.3),
        r: Math.random() * 1.6 + 0.4, vx: (Math.random() - 0.5) * 0.12, vy: -(Math.random() * 0.18 + 0.04),
        max: Math.random() * 0.6 + 0.25, life: 0, span: 600 + Math.random() * 900, tw: Math.random() * Math.PI * 2 };
    };
    size();
    for (var i = 0; i < 70; i++) motes.push(spawn(true));
    window.addEventListener("resize", size);
    var tick = function () {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var bx = beamX();
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.life++; m.tw += 0.02; m.x += m.vx + Math.sin(m.tw) * 0.08; m.y += m.vy;
        var t = m.life / m.span;
        if (t >= 1 || m.y < -10) { motes[i] = spawn(false); continue; }
        var fade = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
        var near = Math.max(0, 1 - Math.abs(m.x - bx) / 480);
        var alpha = m.max * fade * (0.25 + near * 0.75);
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 232, 186," + alpha.toFixed(3) + ")";
        ctx.shadowColor = "rgba(246, 217, 160, .9)"; ctx.shadowBlur = 6;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { var was = running; running = en[0].isIntersecting; if (running && !was) requestAnimationFrame(tick); }).observe(cv);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Mailing list: each sign-up becomes a row in the "BTD Mailing List" Google Sheet ---------- */
  // The web-app URL from the Apps Script deploy (mailing-list/DEPLOY.md). It ends in /exec.
  var SIGNUP_URL = "https://script.google.com/macros/s/AKfycbx1v2h-DQnSrcwkpUxEQqMlltQVNmq6Ey_fn_9jBzUQi1oR-srQbesqcRpM5QpSu9bMWQ/exec";
  var SAY = {
    sending: "Opening…",
    thanks: "Thank you. We'll write when the next door opens.",
    stuck: "The door stuck. Try again in a moment.",
    invalid: "That address doesn't look quite right."
  };

/* email-check:start (keep identical in website/assets/site.js and mailing-list/Code.gs) */
  var EMAIL_FAKE_DOMAINS = ["example.com", "example.net", "example.org", "test.com", "fake.com", "fakeemail.com", "noemail.com", "nomail.com", "none.com", "asdf.com"];
  var EMAIL_FAKE_TLDS = ["test", "example", "invalid", "localhost", "local", "con", "cmo", "ocm", "vom", "xom", "cpm", "comm", "coom"];
  function normalizeEmail(value) { return String(value == null ? "" : value).trim().toLowerCase(); }
  // "" when the address is fine, otherwise a short reason. Expects normalizeEmail() output.
  function checkEmail(email) {
    if (!email) return "empty";
    if (email.length > 254) return "too-long";
    var at = email.indexOf("@");
    if (at < 1 || email.lastIndexOf("@") !== at) return "shape";
    var local = email.slice(0, at), domain = email.slice(at + 1), labels = domain.split(".");
    if (local.length > 64 || domain.length > 253) return "too-long";
    if (!/^[a-z0-9](?:[a-z0-9._+'-]*[a-z0-9_-])?$/.test(local) || local.indexOf("..") !== -1) return "shape";
    if (labels.length < 2) return "shape";
    for (var i = 0; i < labels.length; i++) if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(labels[i])) return "shape";
    var tld = labels[labels.length - 1], name = labels[labels.length - 2];
    if (!/^(?:[a-z]{2,24}|xn--[a-z0-9-]{1,59})$/.test(tld)) return "shape";
    if (EMAIL_FAKE_TLDS.indexOf(tld) !== -1 || EMAIL_FAKE_DOMAINS.indexOf(name + "." + tld) !== -1) return "fake";
    if (/^(.)\1{3,}$/.test(name) || /^(.)\1{3,}$/.test(local)) return "fake";   // aaaa@gmail.com, me@xxxx.com
    return "";
  }
/* email-check:end */

  // One POST, retried once if the network blinks. The script dedupes, so a retry never makes a second row.
  // A plain form-encoded body keeps this a "simple" cross-origin request: no preflight, which Apps Script can't answer.
  function sendSignup(fields, attempt) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 15000);
    var request;
    try {
      request = fetch(SIGNUP_URL, {
        method: "POST", body: new URLSearchParams(fields), credentials: "omit", cache: "no-store", redirect: "follow",
        signal: ctrl ? ctrl.signal : undefined
      });
    } catch (err) {
      request = Promise.reject(err);   // a browser too old for fetch: say the door stuck, never hang on "Opening…"
    }
    return request
      .then(function (r) { return r.ok ? r.json() : { ok: false, error: "server" }; })
      .catch(function () { return { ok: false, error: "network" }; })
      .then(function (res) {
        clearTimeout(timer);
        res = res && typeof res === "object" ? res : { ok: false, error: "server" };
        var retry = !res.ok && (res.error === "network" || res.error === "server") && !attempt;
        return retry ? new Promise(function (go) { setTimeout(go, 1200); }).then(function () { return sendSignup(fields, 1); }) : res;
      });
  }

  var recent = [];   // gentle cap per visit: a few tries a minute is plenty for a person
  document.querySelectorAll("[data-signup]").forEach(function (form) {
    var input = form.querySelector("input[type=email]"), msg = form.querySelector(".signup__msg"), btn = form.querySelector("button");
    var label = btn.textContent, busy = false;

    // Honeypot: off-screen and skipped by keyboards and screen readers. People leave it empty; form-filling bots don't.
    var trap = document.createElement("div");
    trap.className = "signup__hp";
    trap.setAttribute("aria-hidden", "true");
    trap.innerHTML = '<label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.insertBefore(trap, btn);
    var hp = trap.querySelector("input");

    function settle(text, done) {
      busy = false;
      form.removeAttribute("aria-busy");
      input.readOnly = false;
      btn.textContent = label;
      btn.style.minWidth = "";
      btn.disabled = !!done;
      msg.textContent = text;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy || btn.disabled) return;
      var email = normalizeEmail(input.value);
      if (hp.value) { settle(SAY.thanks, true); return; }   // a bot: thank it and send nothing
      if (checkEmail(email)) { msg.textContent = SAY.invalid; input.focus(); return; }
      var now = Date.now();
      recent = recent.filter(function (t) { return now - t < 60000; });
      if (recent.length >= 5 || !SIGNUP_URL) {
        if (!SIGNUP_URL && window.console) console.warn("Sign-up: SIGNUP_URL is not set in assets/site.js");
        settle(SAY.stuck, false);
        return;
      }
      recent.push(now);

      busy = true;
      form.setAttribute("aria-busy", "true");
      btn.style.minWidth = btn.getBoundingClientRect().width + "px";   // the shorter label doesn't jolt the layout
      btn.textContent = SAY.sending;
      btn.disabled = true;
      input.readOnly = true;
      msg.textContent = "";
      sendSignup({ email: email, source: form.getAttribute("data-source") || "", website: "" }).then(function (res) {
        if (res.ok) settle(SAY.thanks, true);
        else if (res.error === "invalid") { settle(SAY.invalid, false); input.focus(); }
        else settle(SAY.stuck, false);
      });
    });
  });

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
