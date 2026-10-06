/* Toybox shared grown-up layer: play timer, sound setting, Big toggle.
 *
 * One timer and one sound setting for the whole Toybox (same origin, same localStorage):
 *   toybox-timer-v1  the play timer (wall-clock endAt, so it counts across apps and reloads)
 *   toybox-sound-v1  "1" or "0" (sound is OFF by default)
 *   toybox-big-<app> "1" or "0" (Big mode is remembered per app)
 * A change made in one open page reaches the others through the `storage` event.
 *
 * HOW AN APP ADOPTS IT
 * 1. In <head>, before the app's own <style> and <script>:
 *      <link rel="stylesheet" href="../common/toybox.css">
 *      <script src="../common/toybox.js"></script>
 *    (toybox.css has the tokens, .btn, .bigtoggle, .tbadge, sheet, toast, ending banner and
 *    rest screen. The app's own CSS comes after it and may override anything.)
 * 2. In the page: a grown-up button, optionally an <svg class="tbadge" viewBox="0 0 60 60" hidden>
 *    for the time-left badge, and a <button class="btn bigtoggle"> (or let the module make one).
 *    Do NOT add the sheet, toast, farewell or rest markup: the module builds them.
 * 3. At the end of the app's script, once its scene is ready, call Toybox.init({...}):
 *      Toybox.init({
 *        app: "fish-tank",                        // folder name; used for the Big key
 *        grownButton: el,                         // opens the sheet; label shows "⏱" while a timer is on
 *        grownLabel: ["Grown-ups", "⏱ Grown-ups"],// optional [idle, timer on]
 *        badge: svgEl,                            // optional: module draws the time-left badge into it
 *        timerIntro: "When time is up, ...",      // line at the top of the timer setup
 *        goodbyeOption: "End with a Goodnight button to press",
 *        farewellText: "Time to say goodnight",   // ending banner text
 *        goodbyeLabel: "Goodnight, fish",         // the optional button in the banner
 *        farewellDone: "Night night, fish!",      // banner text after it is pressed
 *        restLine: "The fish are resting.",
 *        restLine2: "They will be right here next time.",
 *        restArt: function () { return '<svg class="rest-art" viewBox="..">..</svg>'; },
 *        soundNote: "Soft bubble sounds. Hold for 2 seconds.",
 *        sections: [el],                          // extra sheet sections (e.g. tilt); moved in, unhidden
 *        big: { button: el } or { into: el },     // wire an existing .bigtoggle, or create one in `into`
 *        legacy: { timer: "fishtank-timer-v1", sound: "fishtank-prefs-v1", big: "fishtank-big-v1" },
 *        // Hooks (all optional):
 *        onEnding: function (done, info) {},  // time is up: wind the app's motion down, call done() once
 *                                       // settled; info.goodbye is true when the Goodbye button will show
 *        endingMaxMs: 15000,            // optional: longest wait for done() (a long goodbye animation)
 *        onGoodbye: function () {},     // the goodbye button was pressed: a little farewell animation
 *        onRest: function () {},        // the rest screen is up (pause the loop if you like)
 *        onWake: function () {},        // back to idle after ending/rest (stop or unlock): wake things up
 *        onBig: function (on) {},       // Big mode changed (also called once at init)
 *        onSound: function (on) {},     // sound setting changed (also from another page)
 *        onOpen: function () {},        // the grown-up sheet opened (refresh the app's own sections)
 *        onTimer: function (info) {}    // badge-style updates: {phase, remainingMs, fraction, minutes, showMinutes}
 *      });
 * 4. Ask the module instead of keeping your own state:
 *      Toybox.timer.locked()   true while ending or resting: ignore play input then
 *      Toybox.timer.phase()    "idle" | "running" | "ending" | "resting"
 *      Toybox.sound.on()       is sound on?
 *      Toybox.sound.ready()    the AudioContext if sound is on and running, else null (use it to play)
 *      Toybox.sound.unlock()   create/resume the AudioContext; call inside a user gesture. The module
 *                              already does this on every pointerdown/click/keydown while sound is on.
 *      Toybox.setBig(on), Toybox.isBig(), Toybox.makeHold(btn, ms, onDone, onPress), Toybox.toast(msg)
 *      Toybox.fresh()          true when the page was just opened from the home screen: start the
 *                              play fresh (keep collections and grown-up settings). Works before init.
 * Rest timing: after time is up the module waits 6 s (or until the goodbye button was pressed and
 * 3.5 s passed) AND for done() (endingMaxMs, 15 s by default, at most), then 1.2 s more, then shows the rest screen.
 * body gets class "ending" while winding down, "resting" on the rest screen, "big" in Big mode.
 */
(function () {
  "use strict";

  var TKEY = "toybox-timer-v1";
  var SKEY = "toybox-sound-v1";
  var MINUTE_CHOICES = [5, 10, 15, 20, 30];
  var HOLD_MS = 2000;
  var UNLOCK_MS = 4000;
  var OUT = "#1D2340";
  var TAU = Math.PI * 2;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function now() { return Date.now(); }
  function $(id) { return document.getElementById(id); }

  var opts = {};
  var inited = false;
  function hook(name) {
    var fn = opts[name];
    if (typeof fn !== "function") return;
    try { fn.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { setTimeout(function () { throw e; }); }
  }

  // ---------- Timer state ----------
  // Phases: idle -> running -> ending (app winds down, optional goodbye button) -> resting (locked) -> idle.
  function freshTimer() {
    return { minutes: 15, next: "", showMinutes: true, warnings: true, goodbye: true,
      phase: "idle", endAt: 0, total: 0, warned5: false, warned1: false };
  }
  function parseTimer(raw) {
    var t = freshTimer();
    try {
      var o = JSON.parse(raw || "null");
      if (o && typeof o === "object") {
        if (MINUTE_CHOICES.indexOf(o.minutes) !== -1) t.minutes = o.minutes;
        if (typeof o.next === "string") t.next = o.next.slice(0, 40);
        ["showMinutes", "warnings", "goodbye", "warned5", "warned1"].forEach(function (k) {
          if (typeof o[k] === "boolean") t[k] = o[k];
        });
        if (["idle", "running", "ending", "resting"].indexOf(o.phase) !== -1) t.phase = o.phase;
        if (typeof o.endAt === "number") t.endAt = o.endAt;
        if (typeof o.total === "number" && o.total > 0) t.total = o.total;
      }
    } catch (e) { /* bad data: defaults */ }
    return t;
  }
  var timer = parseTimer(get(TKEY));
  function saveTimer() { put(TKEY, JSON.stringify(timer)); }
  function remainingMs() { return Math.max(0, timer.endAt - now()); }
  function minutesText(ms) {
    var m = Math.ceil(ms / 60000);
    return m === 1 ? "1 minute" : m + " minutes";
  }

  // ---------- Sound ----------
  var soundOn = get(SKEY) === "1";
  var actx = null;
  var soundListeners = [];
  // Create (once) and resume the shared AudioContext. Call inside a user gesture (iOS needs that).
  function audioContext() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { actx = null; return null; }
    }
    try { if (actx.state === "suspended") actx.resume(); } catch (e) { /* ignore */ }
    return actx;
  }
  function unlockSound() { return soundOn ? audioContext() : null; }
  function setSound(on, fromStorage) {
    on = !!on;
    if (on === soundOn && !fromStorage) return;
    soundOn = on;
    if (!fromStorage) put(SKEY, on ? "1" : "0");
    updateSoundUI();
    soundListeners.forEach(function (fn) { try { fn(on); } catch (e) { /* ignore */ } });
    hook("onSound", on);
  }

  // ---------- Big ----------
  var ICON_EXPAND = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
  var ICON_SHRINK = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';
  var bigBtn = null;
  function bigKey() { return "toybox-big-" + (opts.app || "app"); }
  function setBig(on, remember) {
    on = !!on;
    document.body.classList.toggle("big", on);
    if (bigBtn) {
      bigBtn.setAttribute("aria-pressed", String(on));
      bigBtn.setAttribute("aria-label", on ? "Show the controls" : "Full screen: hide the controls");
      bigBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (on ? ICON_SHRINK : ICON_EXPAND) + "</svg><span>" + (on ? "Back" : "Big") + "</span>";
    }
    if (remember !== false) put(bigKey(), on ? "1" : "0");
    if (opts.big && typeof opts.big.onChange === "function") { try { opts.big.onChange(on); } catch (e) { /* ignore */ } }
    hook("onBig", on);
  }
  function isBig() { return document.body.classList.contains("big"); }

  // ---------- Press-and-hold buttons (a quick tap does nothing) ----------
  // A finished hold often closes the sheet or rest screen while the finger is still down; the
  // release would then click whatever is underneath. Swallow that one click.
  var swallowArmed = false, swallowUntil = 0, swallowWired = false;
  function swallowNextClick() {
    swallowArmed = true;
    setTimeout(function () { swallowArmed = false; }, 10000);
    if (swallowWired) return;
    swallowWired = true;
    document.addEventListener("pointerup", function () {
      if (swallowArmed) { swallowArmed = false; swallowUntil = now() + 400; }
    }, true);
    document.addEventListener("click", function (e) {
      if (now() < swallowUntil) { swallowUntil = 0; e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  // btn needs <span class="fill"></span><span class="label">..</span> inside and class "hold".
  function makeHold(btn, ms, onDone, onPress) {
    var fill = btn.querySelector(".fill"), id = null;
    function reset() { if (fill) { fill.style.transition = "none"; fill.style.width = "0"; } }
    function start(e) {
      if (e.type === "keydown") {
        if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
        e.preventDefault();
      }
      if (onPress) onPress();
      if (id) return;
      if (fill) { fill.style.transition = "width " + ms + "ms linear"; fill.style.width = "100%"; }
      id = setTimeout(function () { id = null; reset(); swallowNextClick(); onDone(); }, ms);
    }
    function cancel() { if (id) { clearTimeout(id); id = null; } reset(); }
    btn.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { btn.addEventListener(ev, cancel); });
    btn.addEventListener("keydown", start);
    btn.addEventListener("keyup", cancel);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  // ---------- DOM (built by init) ----------
  function holdBtn(id, label, labelId) {
    return '<button class="btn hold" id="' + id + '"><span class="fill"></span><span class="label"' +
      (labelId ? ' id="' + labelId + '"' : "") + ">" + esc(label) + "</span></button>";
  }
  function build() {
    var wrap = document.createElement("div");
    wrap.className = "tb-layer";
    wrap.innerHTML =
      '<div class="toast" id="tb-toast" role="status" aria-live="polite" hidden></div>' +
      '<div class="farewell" id="tb-farewell" hidden><p id="tb-farewellText"></p>' +
        '<button class="btn goodbye" id="tb-goodbye"></button></div>' +
      '<div class="modal" id="tb-modal" hidden>' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="tb-title">' +
          '<h2 id="tb-title">' + esc(opts.sheetTitle || "Grown-ups") + "</h2>" +
          '<section id="tb-timer"><h3>Play timer</h3>' +
            '<div id="tb-setup">' +
              '<p class="sub">' + esc(opts.timerIntro || "When time is up, everything slows down and rests, and the controls lock.") + "</p>" +
              '<h3>How long</h3><div class="row" id="tb-minutes"></div>' +
              '<h3>Next activity <span class="opt">(optional)</span></h3>' +
              '<input id="tb-next" class="textin" type="text" maxlength="40" placeholder="dinner, bath, park…" autocomplete="off" aria-label="Next activity">' +
              '<label class="check"><input type="checkbox" id="tb-optMinutes"> Show minutes left on the screen</label>' +
              '<label class="check"><input type="checkbox" id="tb-optWarnings"> Show “5 more minutes” and “1 more minute”</label>' +
              '<label class="check"><input type="checkbox" id="tb-optGoodbye"> ' + esc(opts.goodbyeOption || "End with a Goodbye button to press") + "</label>" +
              '<div class="sheet-actions"><button class="btn primary" id="tb-start">Start timer</button></div>' +
            "</div>" +
            '<div id="tb-running" hidden>' +
              '<p class="time-left" id="tb-left"></p>' +
              '<p class="sub">Hold a button for 2 seconds.</p>' +
              '<div class="sheet-actions">' + holdBtn("tb-holdAdd", "Add 5 minutes") + holdBtn("tb-holdStop", "Stop timer") + "</div>" +
            "</div>" +
          "</section>" +
          '<section id="tb-sound"><h3>Sound</h3>' +
            '<p class="status" id="tb-soundStatus">Sound is off.</p>' +
            '<div class="sheet-actions" style="margin-top:0">' + holdBtn("tb-holdSound", "Hold to turn sound on", "tb-soundLabel") + "</div>" +
            '<p class="sub" style="margin-top:8px">' + esc(opts.soundNote || "Soft sounds. Hold for 2 seconds.") + "</p>" +
          "</section>" +
          '<div class="sheet-actions" id="tb-closeRow"><button class="btn" id="tb-close">Close</button></div>' +
        "</div>" +
      "</div>" +
      '<div class="rest" id="tb-rest" hidden role="dialog" aria-modal="true" aria-labelledby="tb-restTitle">' +
        '<div class="rest-card">' +
          '<div id="tb-restArt"></div>' +
          '<h2 id="tb-restTitle">All done!</h2>' +
          '<p class="rest-line" id="tb-restLine"></p>' +
          '<p class="rest-line" id="tb-restLine2"></p>' +
          '<div class="rest-next" id="tb-restNext" hidden>Next: <strong id="tb-restNextText"></strong></div>' +
        "</div>" +
        '<button class="lock hold" id="tb-unlock" aria-label="Unlock (grown-ups: press and hold)"><span class="fill"></span><span class="label">🔒</span></button>' +
      "</div>";
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    $("tb-restLine").textContent = opts.restLine || "Everything is resting.";
    $("tb-restLine2").textContent = opts.restLine2 || "It will be right here next time.";

    MINUTE_CHOICES.forEach(function (m) {
      var b = document.createElement("button");
      b.className = "btn";
      b.setAttribute("data-tb-minutes", String(m));
      b.textContent = m + " min";
      b.addEventListener("click", function () { timer.minutes = m; saveTimer(); updateTimerUI(); });
      $("tb-minutes").appendChild(b);
    });
    (opts.sections || []).forEach(function (el) {
      if (!el) return;
      el.hidden = false;
      $("tb-closeRow").parentNode.insertBefore(el, $("tb-closeRow"));
    });

    $("tb-next").addEventListener("input", function () { timer.next = this.value.slice(0, 40); saveTimer(); });
    $("tb-optMinutes").addEventListener("change", function () { timer.showMinutes = this.checked; saveTimer(); redraw(true); });
    $("tb-optWarnings").addEventListener("change", function () { timer.warnings = this.checked; saveTimer(); });
    $("tb-optGoodbye").addEventListener("change", function () { timer.goodbye = this.checked; saveTimer(); });
    $("tb-start").addEventListener("click", startTimer);
    $("tb-close").addEventListener("click", closeSheet);
    $("tb-goodbye").addEventListener("click", goodbye);
    $("tb-modal").addEventListener("click", function (e) { if (e.target === this) closeSheet(); });
    makeHold($("tb-holdAdd"), HOLD_MS, addFive);
    makeHold($("tb-holdStop"), HOLD_MS, stopTimer);
    makeHold($("tb-unlock"), UNLOCK_MS, unlock);
    // Pressing the sound button is a user gesture, so the audio engine can be started then.
    makeHold($("tb-holdSound"), HOLD_MS, function () { setSound(!soundOn); }, audioContext);

    if (opts.grownButton) opts.grownButton.addEventListener("click", openSheet);

    var big = opts.big;
    if (big) {
      bigBtn = big.button || null;
      if (!bigBtn && big.into) {
        bigBtn = document.createElement("button");
        big.into.appendChild(bigBtn);
      }
      if (bigBtn) {
        bigBtn.classList.add("btn", "bigtoggle");
        bigBtn.addEventListener("click", function () { setBig(!isBig()); });
      }
    }
  }

  // ---------- Sheet ----------
  function sheetOpen() { return !!$("tb-modal") && !$("tb-modal").hidden; }
  function openSheet() { updateTimerUI(); updateSoundUI(); hook("onOpen"); $("tb-modal").hidden = false; }
  function closeSheet() { if ($("tb-modal")) $("tb-modal").hidden = true; }

  function updateTimerUI() {
    if (!inited) return;
    var on = timer.phase !== "idle";
    if (opts.grownButton) {
      var labels = opts.grownLabel || ["Grown-ups", "⏱ Grown-ups"];
      opts.grownButton.textContent = on ? labels[1] : labels[0];
    }
    $("tb-setup").hidden = on;
    $("tb-running").hidden = !on;
    if (on) {
      $("tb-left").textContent = timer.phase === "running" ? minutesText(remainingMs()) + " left" : "Time is up";
      $("tb-holdAdd").hidden = timer.phase !== "running";
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-tb-minutes]"), function (b) {
      b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-tb-minutes")) === timer.minutes));
    });
    if (document.activeElement !== $("tb-next")) $("tb-next").value = timer.next;
    $("tb-optMinutes").checked = timer.showMinutes;
    $("tb-optWarnings").checked = timer.warnings;
    $("tb-optGoodbye").checked = timer.goodbye;
  }
  function updateSoundUI() {
    if (!inited) return;
    $("tb-soundStatus").textContent = soundOn ? "Sound is on." : "Sound is off.";
    $("tb-soundLabel").textContent = soundOn ? "Hold to turn sound off" : "Hold to turn sound on";
  }

  // ---------- Badge: the colored arc is the time left, shrinking back toward the top ----------
  var lastKey = "";
  function redraw(force) {
    if (!inited) return;
    if (force) lastKey = "";
    var active = timer.phase === "running" || timer.phase === "ending";
    var rem = timer.phase === "running" ? remainingMs() : 0;
    var f = active && timer.total > 0 ? rem / timer.total : 0;
    var mins = Math.ceil(rem / 60000);
    var key = active ? Math.round(f * 500) + "|" + mins + "|" + timer.showMinutes + "|" + timer.phase : "off";
    if (key === lastKey) return;
    lastKey = key;
    hook("onTimer", { phase: timer.phase, remainingMs: rem, fraction: f, minutes: mins, showMinutes: timer.showMinutes });
    var g = opts.badge;
    if (!g) return;
    if (!active) { g.innerHTML = ""; g.setAttribute("hidden", ""); return; }
    g.removeAttribute("hidden");
    var R = 24, col = f > 0.5 ? "#2E9E5B" : (f > 0.2 ? "#FFC93C" : "#F77F00");
    var sv = '<circle cx="30" cy="30" r="27" fill="#FFFFFF" stroke="' + OUT + '" stroke-width="3"/>' +
      '<circle cx="30" cy="30" r="' + R + '" fill="none" stroke="rgba(29,35,64,0.14)" stroke-width="5"/>';
    if (f >= 0.9995) {
      sv += '<circle cx="30" cy="30" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="5"/>';
    } else if (f > 0.002) {
      var a = f * TAU;
      sv += '<path d="M 30 ' + (30 - R) + " A " + R + " " + R + " 0 " + (a > Math.PI ? 1 : 0) + " 1 " +
        (30 + R * Math.sin(a)).toFixed(2) + " " + (30 - R * Math.cos(a)).toFixed(2) +
        '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>';
    }
    if (timer.showMinutes && timer.phase === "running") {
      sv += '<text x="30" y="31" text-anchor="middle" dominant-baseline="central" font-size="' + (mins > 9 ? 19 : 23) +
        '" font-weight="800" font-family="Baloo 2, Trebuchet MS, sans-serif" fill="' + OUT + '">' + mins + "</text>";
    } else {
      sv += '<path d="M 22 24 Q 30 32 38 24 M 26 36 Q 30 39 34 36" fill="none" stroke="' + OUT + '" stroke-width="3" stroke-linecap="round"/>';
    }
    g.innerHTML = sv;
  }

  // ---------- Toast ----------
  var toastTimer = null;
  function toast(msg) {
    var el = $("tb-toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.hidden = true; }, 450);
    }, 7000);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    var el = $("tb-toast");
    if (el) { el.classList.remove("show"); el.hidden = true; }
  }

  // ---------- Timer actions ----------
  function startTimer() {
    timer.total = timer.minutes * 60000;
    timer.endAt = now() + timer.total;
    timer.phase = "running";
    // Skip a warning the timer is already shorter than (a 5-minute timer gets no "5 more minutes").
    timer.warned5 = timer.total <= 5 * 60000;
    timer.warned1 = timer.total <= 60000;
    saveTimer();
    redraw(true);
    updateTimerUI();
    closeSheet();
  }
  function addFive() {
    if (timer.phase !== "running") return;
    timer.endAt += 5 * 60000;
    timer.total += 5 * 60000;
    var rem = remainingMs();
    if (rem > 5 * 60000) timer.warned5 = false;
    if (rem > 60000) timer.warned1 = false;
    saveTimer();
    redraw(true);
    updateTimerUI();
  }

  // Ending bookkeeping for THIS page (not persisted).
  var windingHere = false, endingStartedAt = 0, farewellAt = 0, settled = false, restScheduled = false, restTimeout = null;

  function beginEnding() {
    if (windingHere) return;
    windingHere = true;
    hideToast();
    if (timer.phase !== "ending") { timer.phase = "ending"; saveTimer(); }
    endingStartedAt = now();
    farewellAt = 0;
    settled = false;
    restScheduled = false;
    document.body.classList.add("ending");
    $("tb-farewellText").textContent = opts.farewellText || "Time to say goodbye";
    $("tb-goodbye").textContent = opts.goodbyeLabel || "Goodbye!";
    $("tb-goodbye").hidden = !timer.goodbye;
    $("tb-farewell").hidden = false;
    redraw(true);
    updateTimerUI();
    if (typeof opts.onEnding === "function") hook("onEnding", function () { settled = true; }, { goodbye: !!timer.goodbye });
    else settled = true;
  }
  function goodbye() {
    if (timer.phase !== "ending" || farewellAt) return;
    farewellAt = now();
    $("tb-goodbye").hidden = true;
    $("tb-farewellText").textContent = opts.farewellDone || "Bye bye!";
    hook("onGoodbye");
  }
  function checkEndingDone() {
    if (!windingHere || restScheduled) return;
    var t = now();
    if (timer.goodbye) {
      if (!farewellAt || t - farewellAt < 3500) return;
    } else if (t - endingStartedAt < 6000) {
      return;
    }
    if (!settled && t - endingStartedAt < (opts.endingMaxMs || 15000)) return;
    restScheduled = true;
    restTimeout = setTimeout(goRest, 1200);
  }
  function goRest() {
    restTimeout = null;
    if (timer.phase !== "ending" && timer.phase !== "resting") return;
    timer.phase = "resting";
    saveTimer();
    showRest();
  }
  function showRest() {
    windingHere = false;
    restScheduled = false;
    clearTimeout(restTimeout);
    hideToast();
    closeSheet();
    document.body.classList.remove("ending");
    document.body.classList.add("resting");
    $("tb-farewell").hidden = true;
    var art = "";
    if (typeof opts.restArt === "function") { try { art = opts.restArt() || ""; } catch (e) { art = ""; } }
    var box = $("tb-restArt");
    if (typeof art === "string") box.innerHTML = art;
    else { box.innerHTML = ""; box.appendChild(art); }
    var svg = box.querySelector("svg");
    if (svg && !svg.classList.contains("rest-art")) svg.classList.add("rest-art");
    var next = timer.next.trim();
    $("tb-restNext").hidden = !next;
    $("tb-restNextText").textContent = next;
    $("tb-rest").hidden = false;
    redraw(true);
    updateTimerUI();
    hook("onRest");
  }
  // Back to idle visuals after ending or rest (stopped, unlocked, or changed in another page).
  function leaveWindDown() {
    var was = windingHere || !$("tb-rest").hidden || document.body.classList.contains("ending");
    windingHere = false;
    restScheduled = false;
    clearTimeout(restTimeout);
    farewellAt = 0;
    document.body.classList.remove("ending", "resting");
    $("tb-farewell").hidden = true;
    $("tb-rest").hidden = true;
    if (was) hook("onWake");
  }
  function stopTimer() {
    timer.phase = "idle";
    saveTimer();
    leaveWindDown();
    redraw(true);
    updateTimerUI();
    closeSheet();
  }
  function unlock() {
    timer.phase = "idle";
    saveTimer();
    leaveWindDown();
    redraw(true);
    updateTimerUI();
  }

  function tick() {
    if (timer.phase === "ending") { if (!windingHere) beginEnding(); checkEndingDone(); return; }
    if (timer.phase !== "running") return;
    var rem = remainingMs();
    if (timer.warnings) {
      if (!timer.warned5 && rem <= 5 * 60000 && rem > 60000) { timer.warned5 = true; saveTimer(); toast("5 more minutes"); }
      if (!timer.warned1 && rem <= 60000 && rem > 0) { timer.warned1 = true; timer.warned5 = true; saveTimer(); toast("1 more minute"); }
    }
    if (rem <= 0) { beginEnding(); return; }
    redraw();
    if (sheetOpen()) $("tb-left").textContent = minutesText(rem) + " left";
  }

  // Bring this page in line with the stored timer (at start, and when another page changed it).
  function sync() {
    if (timer.phase === "idle" || timer.phase === "running") {
      if (windingHere || document.body.classList.contains("resting")) leaveWindDown();
      if (timer.phase === "running" && remainingMs() <= 0) beginEnding();
    } else if (timer.phase === "ending") {
      if (document.body.classList.contains("resting")) leaveWindDown();
      beginEnding();
    } else if (timer.phase === "resting") {
      if ($("tb-rest").hidden) showRest();
    }
    redraw(true);
    updateTimerUI();
  }

  // ---------- Old per-app keys ----------
  function migrate(legacy) {
    if (!legacy) return;
    if (legacy.timer) {
      var oldRaw = get(legacy.timer);
      if (oldRaw !== null) {
        var old = parseTimer(oldRaw), curRaw = get(TKEY);
        if (curRaw === null) put(TKEY, JSON.stringify(old));
        else if (parseTimer(curRaw).phase === "idle" && old.phase !== "idle") put(TKEY, JSON.stringify(old));
        drop(legacy.timer);
      }
    }
    if (legacy.sound && get(SKEY) === null) {
      var s = get(legacy.sound), on = false;
      if (s === "1" || s === "true" || s === "on") on = true;
      else { try { var o = JSON.parse(s || "null"); on = !!(o && o[legacy.soundField || "sound"] === true); } catch (e) { /* ignore */ } }
      if (on) put(SKEY, "1");
    }
    if (legacy.big && get(bigKey()) === null) {
      var b = get(legacy.big);
      if (b !== null) put(bigKey(), b === "1" ? "1" : "0");
    }
  }

  // ---------- Init ----------
  function init(o) {
    if (inited) return;
    opts = o || {};
    migrate(opts.legacy);
    timer = parseTimer(get(TKEY));
    soundOn = get(SKEY) === "1";
    build();
    inited = true;
    if (opts.big) setBig(get(bigKey()) === "1", false);
    updateSoundUI();
    sync();
    setInterval(tick, 250);

    // While sound is on, any touch, click or key press starts/resumes audio (iOS needs a gesture).
    ["pointerdown", "click", "keydown"].forEach(function (ev) {
      document.addEventListener(ev, function () { if (soundOn) audioContext(); }, true);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheetOpen()) { e.preventDefault(); closeSheet(); }
    });
    // Restored by the Back button: the timer may have moved on while the page was frozen.
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      timer = parseTimer(get(TKEY));
      var on = get(SKEY) === "1";
      if (on !== soundOn) setSound(on, true);
      sync();
    });
    // Another open Toybox page changed the shared timer or sound.
    window.addEventListener("storage", function (e) {
      if (e.key === TKEY || e.key === null) { timer = parseTimer(get(TKEY)); sync(); }
      if (e.key === SKEY || e.key === null) { var on = get(SKEY) === "1"; if (on !== soundOn) setSound(on, true); }
      if (opts.big && (e.key === bigKey() || e.key === null)) { var big = get(bigKey()) === "1"; if (big !== isBig()) setBig(big, false); }
    });
  }

  // ---------- Fresh visits ----------
  // Opening an app from the Toybox home screen starts it fresh. The home screen stores a new launch
  // id ("toybox-launch") in sessionStorage when a tile is tapped. The first time a page loads under a
  // launch id is a fresh visit; reloading it, or coming back to it from another page of the same app
  // (a Workshop station and the Tool Wall), is not. Apps reset their play state on a fresh visit and
  // keep the child's collections and the grown-up settings.
  var freshVisit = (function () {
    try {
      var id = sessionStorage.getItem("toybox-launch");
      if (!id) return false;
      var key = "toybox-seen:" + location.pathname.replace(/index\.html$/, "");
      if (sessionStorage.getItem(key) === id) return false;
      sessionStorage.setItem(key, id);
      return true;
    } catch (e) { return false; }
  })();

  window.Toybox = {
    init: init,
    fresh: function () { return freshVisit; },
    timer: {
      phase: function () { return timer.phase; },
      locked: function () { return timer.phase === "ending" || timer.phase === "resting"; },
      remainingMs: function () { return timer.phase === "running" ? remainingMs() : 0; }
    },
    sound: {
      on: function () { return soundOn; },
      onChange: function (fn) { if (typeof fn === "function") soundListeners.push(fn); },
      unlock: unlockSound,
      context: audioContext,
      ready: function () { return soundOn && actx && actx.state === "running" ? actx : null; }
    },
    setBig: function (on) { setBig(on); },
    isBig: isBig,
    makeHold: makeHold,
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    sheetOpen: sheetOpen
  };
})();
