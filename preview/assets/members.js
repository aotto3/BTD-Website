/* Membership pages: the amount box, monthly/yearly, notices, full tiers, welcome page. Joining is a plain
   HTML form, so it still works if this script fails to load. */
(function () {
  var api = document.body.getAttribute("data-membership-api") || "";
  var configured = /^https?:\/\//.test(api);
  var notice = document.getElementById("mnotice");
  function say(msg, cls) { if (!notice) return; notice.textContent = msg; notice.className = "mnotice" + (cls ? " " + cls : ""); notice.hidden = false; }
  var q = new URLSearchParams(location.search);

  /* ---------- The amount box ---------- */
  var form = document.getElementById("join-form");
  var input = document.getElementById("amount");
  var tierLine = document.getElementById("join-tier");
  var go = form && form.querySelector(".join__go");
  var cards = [].slice.call(document.querySelectorAll(".tier[data-from]"));
  var full = {};          // tier id -> true when its places are taken
  var state = "open";     // open | closed | sponsor
  function money(n) { return "$" + n.toLocaleString("en-US"); }
  function period() { var y = document.getElementById("period-year"); return y && y.checked ? "year" : "month"; }
  function dollars() {
    var v = String(input.value || "").trim().replace(/^\$/, "").replace(/,/g, "");
    return /^\d{1,7}$/.test(v) ? Number(v) : NaN;
  }
  function update() {
    if (!form) return;
    var d = dollars(), yearly = period() === "year";
    var tier = null, below = null;
    cards.forEach(function (c) { if (d >= Number(c.getAttribute("data-from"))) { below = tier; tier = c; } });
    cards.forEach(function (c) { c.classList.toggle("is-chosen", c === tier); });
    if (!(d >= 1) || d > 999999 || d !== Math.floor(d)) {
      tierLine.textContent = "Whole dollars, $1 or more.";
      tierLine.className = "join__tier is-warn";
      if (state === "open") { go.disabled = true; go.textContent = "Join"; }
      return;
    }
    var name = tier && tier.querySelector(".tier__name").textContent;
    var bill = yearly ? " Billed " + money(d * 10) + " a year." : "";
    if (!tier) tierLine.textContent = "Thank you. Every dollar goes into the shows; tier benefits start at $5." + bill;
    else if (full[tier.getAttribute("data-tier")]) tierLine.textContent = name + " is full right now: you join its waitlist, with " + (below ? below.querySelector(".tier__name").textContent : "Supporter") + " benefits until a place opens." + bill;
    else tierLine.textContent = "That opens " + name + "." + bill;
    tierLine.className = "join__tier";
    if (state === "open") { go.disabled = false; go.textContent = "Join for " + money(d) + " a month"; }
  }
  if (form) {
    input.addEventListener("input", update);
    form.querySelectorAll('input[name="interval"]').forEach(function (r) { r.addEventListener("change", function () { try { sessionStorage.setItem("btd-period", period()); } catch (e) {} update(); }); });
    try { if (sessionStorage.getItem("btd-period") === "year") document.getElementById("period-year").checked = true; } catch (e) {}
    if (/^\d{1,7}$/.test(q.get("amount") || "")) input.value = q.get("amount");
    // the cards' buttons fill in their starting amount and bring you back to the box
    document.querySelectorAll(".tier__pick").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        input.value = b.getAttribute("data-amount");
        update();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(function () { input.focus({ preventScroll: true }); input.select(); }, 350);
      });
    });
    form.addEventListener("submit", function (e) {
      if (state === "sponsor") { e.preventDefault(); location.href = form.getAttribute("action"); return; }
      if (!(dollars() >= 1)) { e.preventDefault(); input.focus(); return; }
      setTimeout(function () { go.disabled = true; go.textContent = "Opening checkout…"; }, 0);
    });
    // Fiscal-sponsor mode: the build points the form at the sponsor's own donation page.
    if (form.method.toLowerCase() === "get") { state = "sponsor"; go.textContent = "Continue to our sponsor"; }
    update();
  }

  /* Messages the API sends people back with */
  if (q.has("canceled")) say("No charge was made. The door is still here when you want it.");
  else if (q.has("closed")) say("Membership opens soon. Leave your email on our home page and we will tell you when.");
  else if (q.has("error")) say("Something went wrong starting checkout. Check the amount (whole dollars, $1 or more) and try again, or write to customerservice@behindthedoorimmersive.com.");

  /* Is joining open? Which capped tiers are full? */
  function closeAll(msg) {
    state = "closed";
    go.disabled = true; go.textContent = "Opening soon";
    if (msg && notice && notice.hidden) say(msg);
  }
  if (form && state === "open") {
    if (!configured) closeAll("Membership opens soon.");
    else fetch(api + "/api/status", { credentials: "omit" }).then(function (r) { return r.json(); }).then(function (s) {
      if (!s.open) return closeAll("Membership opens soon.");
      if (s.test_mode && notice && notice.hidden) say("Test mode: use card 4242 4242 4242 4242. No real charges.", "mnotice--test");
      (s.full || []).forEach(function (id) {
        full[id] = true;
        var t = document.querySelector('.tier[data-tier="' + id + '"]');
        if (!t) return;
        t.classList.add("is-full");
        var flag = t.querySelector(".tier__flag");
        if (flag) flag.textContent = "Full: waitlist";
      });
      update();
    }).catch(function () { /* leave the form alone: the API answers with a message if it is down */ });
  }

  /* Welcome page */
  var welcome = document.querySelector("[data-welcome]");
  if (welcome) {
    var sid = q.get("session_id") || "";
    document.querySelectorAll('input[name="session_id"]').forEach(function (i) { i.value = sid; });
    if (configured && sid) {
      fetch(api + "/api/session?session_id=" + encodeURIComponent(sid), { credentials: "omit" }).then(function (r) { return r.json(); }).then(function (s) {
        var el = document.querySelector("[data-choice]");
        if (s.ok && s.tier && el) {
          el.textContent = s.monthly_dollars ? "You give $" + s.monthly_dollars.toLocaleString("en-US") + " a month: " : "You are a member: ";
          var b = document.createElement("b"); b.setAttribute("data-tier-name", ""); b.textContent = s.tier.name; el.appendChild(b); el.appendChild(document.createTextNode("."));
        }
        if (!s.ok) document.querySelectorAll("[data-portal-now]").forEach(function (f) { f.hidden = true; });
      }).catch(function () {});
    }
    if (!sid) document.querySelectorAll("[data-portal-now]").forEach(function (f) { f.hidden = true; });
    if (history.replaceState) history.replaceState(null, "", location.pathname); // keep the session id out of shared links
  }

  /* Manage page: back from the portal */
  if (document.querySelector("[data-manage]") && q.has("back")) say("Your changes are saved. Stripe emails you a receipt for anything that changed your bill.");
})();
