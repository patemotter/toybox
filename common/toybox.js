/* Toybox shared layer: play timer, sound setting, Big toggle, and the shared components every app is built
 * from (Go, step row, job bar, tiles, bottom bar, coach, ghost hand, tap-or-drag, palm guard, gate, map: 6.).
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
 *        app: "peg-drop",                         // folder name; used for the Big key
 *        grownButton: el,                         // home screen only: opens the sheet. In apps it is hidden:
 *                                                 // the Grown-ups sheet lives only on the Toybox home screen.
 *        home: true,                              // only the launcher passes this (sheet + App settings)
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
 *        sections: [el],                          // extra sheet sections (e.g. offline); moved in, unhidden
 *        big: { button: el } or { into: el },     // wire an existing .bigtoggle, or create one in `into`
 *        legacy: { timer: "fishtank-timer-v1", sound: "fishtank-prefs-v1", big: "fishtank-big-v1" },
 *        orientation: "landscape",                // optional: "landscape" or "portrait". Held the other way,
 *                                                 // the app is covered by a "Turn it sideways!" / "Turn it
 *                                                 // upright!" card with a turning tablet and a small "Play
 *                                                 // like this" button (rotation lock must never trap him; the
 *                                                 // choice is kept for the session in sessionStorage
 *                                                 // "toybox-turn-ok:<app>", which tests may set to skip it).
 *                                                 // The card goes away by itself when the device is turned.
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
 *        onTimer: function (info) {},   // badge-style updates: {phase, remainingMs, fraction, minutes, showMinutes}
 *        onTurn: function (shown) {}    // the "turn the device" card was shown (true) or went away (false)
 *      });
 * 4. Ask the module instead of keeping your own state:
 *      Toybox.timer.locked()   true while ending or resting: ignore play input then
 *      Toybox.timer.phase()    "idle" | "running" | "ending" | "resting"
 *      Toybox.sound.on()       is sound on?
 *      Toybox.sound.ready()    the AudioContext if sound is on and running, else null (use it to play)
 *      Toybox.sound.unlock()   create/resume the AudioContext; call inside a user gesture. The module
 *                              already does this on every pointerdown/click/keydown while sound is on.
 *      Toybox.setBig(on), Toybox.isBig(), Toybox.makeHold(btn, ms, onDone, onPress), Toybox.toast(msg)
 *      Toybox.settings.get(id) an app setting chosen on the home screen (ids in SETTINGS below:
 *                              "mathgrid-voice", "printer-name", ...).
 *      Toybox.settings.onChange(fn(id, value)), Toybox.settings.action(id, fn) (runs fn once per
 *                              home-screen press, e.g. "printer-clear").
 *      Toybox.kind([type])     he finished something: sometimes shows a kind-words card, mostly a star
 *                              ("You did it!"); type "love" asks for "Dad loves you!". Automatic gentle ones
 *                              ("You are doing great!") also show every few minutes of play.
 *      Toybox.fresh()          true when the page was just opened from the home screen: start the
 *                              play fresh (keep collections and grown-up settings). Works before init.
 *      Toybox.turning()        true while the "turn the device" card covers the app.
 * 5. Leaving a page with a powered machine (the Workshop's big machines). Register once, after init:
 *      Toybox.offFirst({
 *        running: function () { return S.on; },            // is a machine running right now?
 *        off: function (done) { stopMotor(done); }         // switch it off
 *      });
 *    A tap on a link that leaves the page (anchors with an href other than "#...") while running() is
 *    true calls off() and goes at once; nothing is held back (the dad found the "switch it off first"
 *    card got in the way). Scripts that navigate themselves call Toybox.beforeLeave(function () { go(); }):
 *    it switches the machine off quietly and runs the function at once. name and flash are ignored now.
 * 6. Shared components (plans/redesign.md sections 1 and 2; look in toybox.css; demo: tools/shell-demo.html;
 *    pilot page: construction-site/concrete.html). Each renders into an element the page provides; the page
 *    keeps its own scene code. Pages that use them add "tb-v2" to the shell div (token sizes for the chrome).
 *    Every component ignores input while the timer locks the app, and guards against palms (Toybox.palmGuard).
 *      var go = Toybox.go(el, { label: "Drive!", icon: svg, onPress: fn(e), onIdle: fn, onBusy: fn })
 *        The green Go pill (apps without steps). el: a <button> to take over, or a container to build one in.
 *        onPress returning false = nothing to do: it wiggles and onIdle runs (say a hint). Never disabled.
 *        go.set(label, icon), go.pulse(on), go.busy(true | 0..1 | false) (a fill shows the motion running;
 *        a press then wiggles and onBusy runs), go.isBusy(), go.wiggle(), go.el.
 *      var st = Toybox.steps(el, { steps: [{ id: "pour", name: "Pour", pic: svg, go: "Pour!", coach: "Pour the
 *        concrete!" }, ...], coach: coachApi, ghost: ghostApi, onGo: fn(stepId, e), onAgain: fn, onBusy: fn,
 *        onIdle: fn, onChip: fn(id) })
 *        The step row (an <ol> or <ul>): done steps are green tick chips on the left, the current step IS the
 *        Go pill (its go label and picture), coming steps are faded chips with their word on the right. In a
 *        side column (landscape) the row wraps: ticks above Go, coming steps below. Max 6 steps.
 *        st.at(id) (current; earlier steps done; the coach says its line, the ghost is poked), st.done(id)
 *        (tick it; the next one becomes current), st.finish(label) (all ticked, Go says "Again!" and calls
 *        onAgain), st.reset(), st.current(), st.finished(), st.busy(on | 0..1), st.pulse(on), st.go (its Go).
 *        onGo returning false wiggles Go and repeats the step's coach line. Tapping a chip wiggles it and
 *        repeats the current step's line (chips are progress, not buttons).
 *      var jb = Toybox.jobs(el, { jobs: [{ id, name, pic }], value: id, onPick: fn(id) }) -> jb.set(id), jb.value()
 *        Folder tabs hanging from the stage's bottom edge: wrap the stage and el in <div class="tb-stagecol">.
 *        2 to 4 jobs; switching a job changes the scene. The page remembers it and resets it on Toybox.fresh().
 *      var tl = Toybox.tiles(el, { items: [{ id, name, pic, color }], value: id, kind: "pick" | "action" |
 *        "swatch", rows: 1 | 2, onPick: fn(id) }) -> tl.set(id), tl.items(list), tl.flash(id), tl.value(),
 *        tl.button(id). Picture + word tiles, at most 4 a row on phones and 8 in all (warns above 8). "pick":
 *        aria-pressed + a tick badge; "action": no picked state, a "+" badge; "swatch": the fill is the color.
 *      var bb = Toybox.bar(el, { shelf: fn | null, onNew: fn, onSurprise: fn }) -> bb.shelfOpen(on), bb.newBtn,
 *        bb.surprise, bb.shelf. The bottom bar: Shelf (blue, only apps with a collection), New (orange, the
 *        circular arrow), Surprise (rainbow, a gift), with their icons and the palm-safe spacing.
 *      var coach = Toybox.coach(el) -> coach.step(text) (the sticky line for the current step, with the step
 *        dot), coach.say(text, sec) (a passing line, at least 3 s, then back to the step line), coach.clear(),
 *        coach.text(). One line at a time, at most about 5 words, verb first. A new line is spoken when the
 *        home screen's App setting "coach-voice" is on and sound is on.
 *      var ghost = Toybox.ghost({ plan: fn, max: 3, idleMs: 4500, ok: fn, onShow: fn(plan, on) })
 *        The idle ghost hand (the master look). plan() returns null or { pts: [[x, y], ...] (viewport px),
 *        tap: true | hold: true | (two or more points = a drag), carry: { html, size }, dur: ms, key: "pour" }.
 *        Each key shows at most `max` times a visit. ghost.learned(key) (he did it: never again; no key = all),
 *        ghost.again(key), ghost.shown(key) (how often it showed: show the tap first, the drag after),
 *        ghost.poke(), ghost.stop(), ghost.show() (test hook). It waits while a finger is down, the sheet is
 *        open, the timer is ending or resting, or the turn card shows.
 *      var pr = Toybox.press(target, { hit: fn(x, y) -> part | null, parts: fn() -> [{ id, x, y, r }],
 *        any: false, down: fn(part, e, s), dragStart: fn(part, e, s), move: fn(part, e, s), up: fn(part, e, s),
 *        tap: fn(part, x, y, e), slop: 12, tapMs: 350, minHit: px })
 *        One press is always enough: a press that moves under 12 px and lasts under 350 ms is a tap (s.tap), and
 *        tap(part) should play the whole motion; anything longer is a drag (move after dragStart). parts are
 *        circles in viewport px; each gets at least the 2 cm key target (--tb-key) as its hit radius, nearest
 *        wins. any: true also takes presses that hit no part (part null). Several fingers at once; palms
 *        ignored. s = { part, x0, y0, x, y, dx, dy, ms, drag, tap }. pr.active() = fingers down.
 *      Toybox.palmGuard(el), Toybox.isPalm(pointerEvent)  a touch within 20 px of the bottom edge, one that
 *        lands while another rests still for over 1 s, or a very large contact: ignored (guard) / true.
 *      Toybox.nametag(text, x, y, ms)  a real part's name pops up above (x, y) for about 2 s ("Hopper").
 *      var gt = Toybox.gate({ flag: "site-gear", title: "Gear up!", viewBox: "0 0 300 400", worker: svg,
 *        items: [{ id, name: "Eye protection", art: svg, onArt: svg }], extra: { hands: fn(next, workerEl) },
 *        hint: "Tap to put it all on!", ms: 1500, done: fn })
 *        The gear-up / getting-ready screen. One tap on the worker or any item puts everything on in order
 *        (each with its name tag), then done(); dragging an item onto the worker puts just that one on. onArt
 *        layers share the worker's viewBox. Sets the sessionStorage flag and its time (the 10-minute rule).
 *        gt.dressAll(), gt.isOn(id), gt.hide(), gt.el. The page decides whether to show it (flag off).
 *      var mp = Toybox.map({ stage: el, places: [{ href, name, pic, rect: [x, y, w, h] as fractions of the stage
 *        or fn(W, H) -> px rect }], onPress: fn(place, a) }) -> mp.layout(), mp.places
 *        Station maps: the whole place is the hit area, a white picture + word label, Toybox.beforeLeave on go.
 *      Toybox.wiggle(el), Toybox.icon(name) (UI line icons: back, home, big, new, surprise, shelf, close),
 *      Toybox.pics.play / .again (Go pictures).
 * Rest timing: after time is up the module waits 6 s (or until the goodbye button was pressed and
 * 3.5 s passed) AND for done() (endingMaxMs, 15 s by default, at most), then 1.2 s more, then shows the rest screen.
 * body gets class "ending" while winding down, "resting" on the rest screen, "big" in Big mode,
 * "turn" while the turn-the-device card shows.
 */
(function () {
  "use strict";

  // This file's own address: the Toybox root (where the one service worker lives) is the folder above it.
  var SCRIPT_SRC = document.currentScript && document.currentScript.src;

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

  // ---------- Grown-up settings (kept on the home screen) ----------
  // The Grown-ups sheet lives only on the Toybox home screen. App-specific grown-up options are listed
  // here and shown there under "App settings"; apps read them with Toybox.settings.get(id).
  var SETKEY = "toybox-settings-v1", DONEKEY = "toybox-settings-done-v1";
  var SETTINGS = [
    { id: "uses-info", app: "Good to know", type: "info",
      listTitle: "Which apps ask for something special",
      list: [
        "Turn the device: only Concrete prefers upright; a card asks him to turn it, with a \"Play like this\" button to skip",
        "Sound: every app has soft sound effects, all off until you turn sound on above",
        "Motion (tilt and shake): no app uses it; the Toybox never asks for motion access",
        "Nothing uses the camera, the microphone or location; after the first visit nothing needs the internet (it only checks for updates when online)"
      ] },
    // Kind words has its own controls (kindBuildSettings below); its other ids are listed in KIND_SET.
    { id: "kind-words", app: "Kind words", type: "custom", def: true,
      build: function (row) { kindBuildSettings(row); }, refresh: function (row) { kindRefreshSettings(row); } },
    { id: "coach-voice", app: "Coach line", label: "Read the coach line out loud", type: "bool", def: false, hold: true,
      note: "In the apps built from the new layout. Uses the device's voice, so it only speaks when sound is on (headphones on the plane)." },
    { id: "mathgrid-voice", app: "Math Grid", label: "Say the numbers out loud", type: "bool", def: false, hold: true,
      note: "Uses the device's voice, so it only speaks when sound is on." },
    { id: "printer-name", app: "3D Printer", label: "Name sign letters", type: "text", def: "TOYBOX", max: 8 },
    { id: "printer-clear", app: "3D Printer", label: "Hold to clear My prints", type: "action" }
  ];
  var SET_BY = {};
  SETTINGS.forEach(function (d) { SET_BY[d.id] = d; });
  var setListeners = [];
  function readJSON(k) { try { var o = JSON.parse(get(k) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function settingGet(id) {
    var d = SET_BY[id], all = readJSON(SETKEY);
    return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : (d ? d.def : undefined);
  }
  function settingSet(id, v) {
    var all = readJSON(SETKEY);
    all[id] = v;
    put(SETKEY, JSON.stringify(all));
    setListeners.forEach(function (fn) { try { fn(id, v); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  // An action (e.g. "clear My prints") pressed on the home screen: run fn once in the app.
  function settingAction(id, fn) {
    function check() {
      var req = Number(settingGet(id)) || 0, done = readJSON(DONEKEY);
      if (req > (Number(done[id]) || 0)) { done[id] = req; put(DONEKEY, JSON.stringify(done)); fn(); }
    }
    check();
    setListeners.push(function (sid) { if (sid === id) check(); });
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
  // The Big button is gone (the dad, 2026-10-10: it rarely changed what he could see). Big mode is always off; the
  // API stays so pages that ask still work, and saved "toybox-big-<app>" values are ignored.
  function setBig(on, remember) {
    on = false; remember = false;
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
      "</div>" +
      // "Turn the device" card (only used when init got an orientation): a tablet that turns, one line, a way out.
      '<div class="tb-turn" id="tb-turn" hidden role="dialog" aria-modal="true" aria-labelledby="tb-turnTitle">' +
        '<div class="tb-turn-card">' +
          '<div class="tb-turn-art" aria-hidden="true">' +
            '<svg viewBox="0 0 160 160"><g class="tb-tablet">' +
              '<rect x="33" y="9" width="100" height="148" rx="14" fill="rgba(29,35,64,0.3)"/>' +
              '<rect x="30" y="6" width="100" height="148" rx="14" fill="#FFFFFF" stroke="#1D2340" stroke-width="5"/>' +
              '<rect x="40" y="20" width="80" height="112" rx="5" fill="#CDE9FF" stroke="#1D2340" stroke-width="3"/>' +
              '<circle cx="104" cy="44" r="11" fill="#FFC93C" stroke="#1D2340" stroke-width="3"/>' +
              '<path d="M42 110 Q 62 84 82 104 T 118 100 V 130 H 42 Z" fill="#8BD17C" stroke="#1D2340" stroke-width="3" stroke-linejoin="round"/>' +
              '<circle cx="80" cy="143" r="5" fill="#1D2340"/>' +
            "</g></svg>" +
          "</div>" +
          '<div class="tb-turn-text"><h2 id="tb-turnTitle"></h2>' +
          '<button class="btn" id="tb-turnSkip">Play like this</button></div>' +
        "</div>" +
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
    if (opts.home) {
      (opts.sections || []).forEach(function (el) {
        if (!el) return;
        el.hidden = false;
        $("tb-closeRow").parentNode.insertBefore(el, $("tb-closeRow"));
      });
      $("tb-closeRow").parentNode.insertBefore(buildAppSettings(), $("tb-closeRow"));
    } else {
      // Apps have no grown-up sheet: the Grown-ups button and its extra sections stay hidden.
      (opts.sections || []).forEach(function (el) { if (el) el.hidden = true; });
    }

    $("tb-turnSkip").addEventListener("click", function () {
      try { sessionStorage.setItem(turnKey(), "1"); } catch (e) { /* ignore */ }
      checkTurn();
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

    if (opts.grownButton) {
      if (opts.home) opts.grownButton.addEventListener("click", openSheet);
      else { opts.grownButton.hidden = true; opts.grownButton.style.display = "none"; opts.grownButton.setAttribute("aria-hidden", "true"); }
    }

    var big = opts.big;
    if (big) {
      bigBtn = big.button || null;
      if (!bigBtn && big.into) {
        bigBtn = document.createElement("button");
        big.into.appendChild(bigBtn);
      }
      if (bigBtn) {
        bigBtn.classList.add("btn", "bigtoggle");
        bigBtn.hidden = true; bigBtn.style.display = "none"; bigBtn.setAttribute("aria-hidden", "true");
      }
    }
  }

  // The home screen's "App settings" section, built from SETTINGS.
  function buildAppSettings() {
    var sec = document.createElement("section");
    sec.id = "tb-appSettings";
    var html = "<h3>App settings</h3>", lastApp = "";
    SETTINGS.forEach(function (d) {
      if (d.app && d.app !== lastApp) { html += '<h4 class="tb-app">' + esc(d.app) + "</h4>"; lastApp = d.app; }
      html += '<div class="tb-set" data-set="' + d.id + '">';
      if (d.type === "bool" && d.hold) html += '<div class="sheet-actions" style="margin-top:0">' + holdBtn("tb-set-" + d.id, d.label, "tb-setl-" + d.id) + "</div>";
      else if (d.type === "bool") html += '<label class="check"><input type="checkbox" id="tb-set-' + d.id + '"> ' + esc(d.label) + "</label>";
      else if (d.type === "choice") html += '<p class="sub">' + esc(d.label) + '</p><div class="row">' + d.choices.map(function (c) {
        return '<button class="btn" data-choice="' + c[0] + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>";
      else if (d.type === "text") html += '<p class="sub">' + esc(d.label) + '</p><input class="textin" id="tb-set-' + d.id + '" type="text" maxlength="' + (d.max || 20) + '" autocomplete="off" spellcheck="false" aria-label="' + esc(d.label) + '">';
      else if (d.type === "action") html += '<div class="sheet-actions" style="margin-top:0">' + holdBtn("tb-set-" + d.id, d.label) + "</div>";
      if (d.note) html += '<p class="sub">' + esc(d.note) + "</p>";
      if (d.list) html += '<details class="tb-uses"><summary>' + esc(d.listTitle || "More") + "</summary><ul>" +
        d.list.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></details>";
      html += "</div>";
    });
    sec.innerHTML = html;
    SETTINGS.forEach(function (d) {
      var row = sec.querySelector('[data-set="' + d.id + '"]'), el = row.querySelector("#tb-set-" + d.id);
      if (d.type === "custom") d.build(row);
      else if (d.type === "bool" && d.hold) makeHold(el, HOLD_MS, function () { settingSet(d.id, !settingGet(d.id)); refreshAppSettings(); });
      else if (d.type === "bool") el.addEventListener("change", function () { settingSet(d.id, this.checked); });
      else if (d.type === "choice") Array.prototype.forEach.call(row.querySelectorAll("[data-choice]"), function (b) {
        b.addEventListener("click", function () { settingSet(d.id, b.getAttribute("data-choice")); refreshAppSettings(); });
      });
      else if (d.type === "text" && d.free) el.addEventListener("input", function () {
        var v = this.value.slice(0, d.max || 20);
        if (v !== this.value) this.value = v;
        settingSet(d.id, v.trim());
      });
      else if (d.type === "text") el.addEventListener("input", function () {
        var v = this.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, d.max || 20);
        if (v !== this.value) this.value = v;
        if (v.trim()) settingSet(d.id, v.trim());
      });
      else if (d.type === "action") makeHold(el, HOLD_MS, function () { settingSet(d.id, Date.now()); toast("Done"); });
    });
    return sec;
  }
  function refreshAppSettings() {
    var sec = $("tb-appSettings");
    if (!sec) return;
    SETTINGS.forEach(function (d) {
      var row = sec.querySelector('[data-set="' + d.id + '"]'), v = settingGet(d.id), el = row.querySelector("#tb-set-" + d.id);
      if (d.type === "custom") d.refresh(row);
      else if (d.type === "bool" && d.hold) $("tb-setl-" + d.id).textContent = (v ? "Hold to turn off: " : "Hold to turn on: ") + d.label.toLowerCase();
      else if (d.type === "bool") el.checked = !!v;
      else if (d.type === "choice") Array.prototype.forEach.call(row.querySelectorAll("[data-choice]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-choice") === v));
      });
      else if (d.type === "text" && document.activeElement !== el) el.value = v;
    });
  }

  // ---------- Sheet ----------
  function sheetOpen() { return !!$("tb-modal") && !$("tb-modal").hidden; }
  function openSheet() { updateTimerUI(); updateSoundUI(); refreshAppSettings(); hook("onOpen"); $("tb-modal").hidden = false; }
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
    if (opts.orientation) checkTurn();
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

  // ---------- Orientation: an app may prefer landscape or portrait (opts.orientation) ----------
  // Held the other way, an opaque card covers the app: a tablet picture that turns, "Turn it sideways!" /
  // "Turn it upright!", and a small "Play like this" button (rotation lock must never trap him). The choice
  // lasts the session. The card hides itself as soon as the device is turned, and while the timer is
  // ending or resting (the goodbye and the rest screen must stay visible).
  var turnTimer = null;
  function turnKey() { return "toybox-turn-ok:" + (opts.app || "app"); }
  function wrongWay() {
    var want = opts.orientation;
    if (want !== "landscape" && want !== "portrait") return false;
    var land = window.innerWidth > window.innerHeight;
    return want === "landscape" ? !land : land;
  }
  function turnSkipped() { try { return sessionStorage.getItem(turnKey()) === "1"; } catch (e) { return false; } }
  function turning() { var el = $("tb-turn"); return !!el && !el.hidden; }
  function checkTurn() {
    var el = $("tb-turn");
    if (!el) return;
    var show = wrongWay() && !turnSkipped() && timer.phase !== "ending" && timer.phase !== "resting";
    if (show === !el.hidden) return;
    el.hidden = !show;
    document.body.classList.toggle("turn", show);
    hook("onTurn", show);
  }
  function wireTurn() {
    var want = opts.orientation;
    if (want !== "landscape" && want !== "portrait") return;
    $("tb-turnTitle").textContent = want === "landscape" ? "Turn it sideways!" : "Turn it upright!";
    $("tb-turn").classList.add(want === "landscape" ? "to-land" : "to-port");
    // iOS reports the new size a moment after the turn: check now and again shortly after.
    function later() { clearTimeout(turnTimer); turnTimer = setTimeout(checkTurn, 120); setTimeout(checkTurn, 600); }
    window.addEventListener("resize", later);
    window.addEventListener("orientationchange", later);
    checkTurn();
  }

  // ---------- Leaving a page while a machine runs (Toybox.offFirst) ----------
  // The dad: no "switch it off first" step on the way out; it only got in the way. Leaving a page (a link
  // or Toybox.beforeLeave) while a machine runs switches it off quietly and goes at once.
  var offCfg = null, offWired = false;
  function quietOff() {
    if (!offCfg) return;
    try { if (offCfg.running()) offCfg.off(function () {}); } catch (e) { /* leaving anyway */ }
  }
  function offFirst(cfg) {
    offCfg = cfg && typeof cfg.running === "function" && typeof cfg.off === "function" ? cfg : null;
    if (!offCfg || offWired) return;
    offWired = true;
    document.addEventListener("click", function (e) {
      if (!offCfg || e.defaultPrevented || e.button) return;
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank") return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) return;
      quietOff();
    }, true);
  }
  // Scripts that navigate themselves: proceed() runs at once (always returns true).
  function beforeLeave(proceed) {
    quietOff();
    proceed();
    return true;
  }

  // ---------- Kind words ----------
  // Now and then a little card with a kind line floats in at the top for a few seconds, while he plays
  // and when he comes back to the home screen. Three kinds, each with its own picture: gentle reminders
  // (a smiling sun), congratulations (a star) and love from Dad (a heart).
  // No built-in line speaks as "I": the device isn't the one talking.
  // It never takes a touch (pointer-events: none) and never shows while the timer is ending or resting,
  // the sheet is open or a card covers the app. Shared by every page: "toybox-kind-v1" remembers when
  // the last one showed and when the next may, so it stays special (one every few minutes of play).
  // Apps call Toybox.kind() when he finishes something; that shows a "You did it!" line only sometimes.
  // Grown-ups control all of it in the home screen's Grown-ups sheet (settings in KIND_SET): on/off, how
  // often, when (while playing, after finishing something, back on the home screen), how long a card
  // stays, which of the usual lines are used, and their own lines with a picture each.
  var KKEY = "toybox-kind-v1";
  var KIND_GENTLE = ["You are doing great!", "Keep going!", "You are so smart!", "You are wonderful!", "You are so kind!",
    "You are awesome!", "You can do it!", "You are a great helper!", "You are so creative!", "You are a great builder!",
    "Take your time!", "You are learning so much!"];
  var KIND_DONE = ["You did it!", "Great job!", "Wow, look at that!", "Amazing work!", "You worked so hard!",
    "High five!", "Way to go!", "You figured it out!", "Super job!"];
  var KIND_LOVE = ["Dad loves you!", "Dad loves you so much!"];
  var KIND_LISTS = { gentle: KIND_GENTLE, done: KIND_DONE, love: KIND_LOVE };
  var KIND_KINDS = ["gentle", "done", "love"];
  var KIND_NAME = { gentle: "Kind reminders", done: "Well done", love: "Love" };
  var KIND_PIC = { gentle: "Sun", done: "Star", love: "Heart" };
  var KIND_ART = {
    love: '<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 33 C6 23 2 16 2 10.5 C2 5.5 6 2 10.5 2 C14.5 2 17.5 4.5 20 8 C22.5 4.5 25.5 2 29.5 2 C34 2 38 5.5 38 10.5 C38 16 34 23 20 33 Z" fill="#FF5D8F" stroke="#1D2340" stroke-width="3" stroke-linejoin="round"/><path d="M9 9.5 Q10 6.5 13 6" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/></svg>',
    done: '<svg viewBox="0 0 40 38" aria-hidden="true"><path d="M20 2.5 L25 13.5 L37 14.8 L28 23 L30.6 35 L20 28.8 L9.4 35 L12 23 L3 14.8 L15 13.5 Z" fill="#FFC93C" stroke="#1D2340" stroke-width="3" stroke-linejoin="round"/><path d="M15.5 17 Q16 15 18 14.5" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/></svg>',
    gentle: '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#1D2340" stroke-width="3" stroke-linecap="round"><path d="M20 2.5 V7 M20 33 V37.5 M2.5 20 H7 M33 20 H37.5 M7.6 7.6 L10.8 10.8 M29.2 29.2 L32.4 32.4 M7.6 32.4 L10.8 29.2 M29.2 10.8 L32.4 7.6"/></g><circle cx="20" cy="20" r="10.5" fill="#FFD84D" stroke="#1D2340" stroke-width="3"/><circle cx="16.5" cy="18.5" r="1.6" fill="#1D2340"/><circle cx="23.5" cy="18.5" r="1.6" fill="#1D2340"/><path d="M15.5 22.5 Q20 26.5 24.5 22.5" fill="none" stroke="#1D2340" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };
  // The grown-up's choices (in toybox-settings-v1, next to "kind-words" on/off) and their defaults.
  var KIND_SET = {
    "kind-often": "some",   // how often automatic ones come: "rare", "some", "often" (KIND_GAPS)
    "kind-play": true,      // now and then while he plays
    "kind-finish": true,    // sometimes when he finishes something (Toybox.kind())
    "kind-home": true,      // sometimes when he comes back to the home screen
    "kind-stay": "medium",  // how long a card stays: "short", "medium", "long" (KIND_STAYS)
    "kind-off": [],         // the usual lines switched off (by their text)
    "kind-mine": null       // the grown-up's own lines: [{ t: text, k: "gentle" | "done" | "love" }]
  };
  var KIND_GAPS = { rare: [8, 12], some: [4, 7], often: [2, 4] };  // minutes of play between automatic ones
  var KIND_STAYS = { short: 3200, medium: 4600, long: 7000 };       // ms on screen
  var KIND_MAX = 40, KIND_MINE_MAX = 20;
  var KIND_SOON = 75000;                   // no two kind cards closer than this
  var kindTouch = 0, kindPlay = 0, kindTimer = null, kindLastLine = "";
  function kset(id) {
    var v = settingGet(id);
    return v === undefined || v === null ? KIND_SET[id] : v;
  }
  function kindGap() { var g = KIND_GAPS[kset("kind-often")] || KIND_GAPS.some; return [g[0] * 60000, g[1] * 60000]; }
  function kindOffList() { var a = kset("kind-off"); return Array.isArray(a) ? a : []; }
  // The grown-up's own lines. Older versions kept one line in "kind-own"; it becomes a love line.
  function kindMine() {
    var a = settingGet("kind-mine");
    if (!Array.isArray(a)) {
      var own = String(settingGet("kind-own") || "").trim();
      a = own ? [{ t: own, k: "love" }] : [];
    }
    return a.filter(function (m) { return m && typeof m.t === "string" && m.t.trim() && KIND_LISTS[m.k]; });
  }
  function kindSetMine(a) { settingSet("kind-mine", a.slice(0, KIND_MINE_MAX)); }
  // Every line of one kind that may show: the usual ones still on, and the grown-up's own.
  function kindPool(k) {
    var off = kindOffList();
    return {
      usual: KIND_LISTS[k].filter(function (l) { return off.indexOf(l) < 0; }),
      mine: kindMine().filter(function (m) { return m.k === k; }).map(function (m) { return m.t.trim(); })
    };
  }
  function kindReady() {
    return inited && settingGet("kind-words") !== false && timer.phase !== "ending" && timer.phase !== "resting" &&
      !sheetOpen() && !turning() && !document.hidden;
  }
  // Pick a line of one kind ("gentle", "done" or "love"), or null when every line of it is off.
  // The grown-up's own lines come up half the time (all the time when the usual ones are all off).
  function kindPick(kindOf) {
    if (!kindOf) return null;
    var pool = kindPool(kindOf), list, line, n = 0;
    if (!pool.usual.length && !pool.mine.length) return null;
    list = pool.mine.length && (!pool.usual.length || Math.random() < 0.5) ? pool.mine : pool.usual;
    do { line = list[Math.floor(Math.random() * list.length)]; n++; } while (line === kindLastLine && list.length > 1 && n < 8);
    return { line: line, art: kindOf };
  }
  // A kind at random, by weights { gentle, done, love }. A kind with no line on is left out; one with
  // the grown-up's own lines comes up a little more often. null when nothing is left.
  function kindMix(w) {
    var weights = {}, total = 0;
    KIND_KINDS.forEach(function (k) {
      var pool = kindPool(k), x = (w[k] || 0) * (pool.usual.length || pool.mine.length ? 1 : 0) * (pool.mine.length ? 1.5 : 1);
      weights[k] = x; total += x;
    });
    if (!total) return null;
    var r = Math.random() * total, acc = 0, pick = null;
    KIND_KINDS.forEach(function (k) { if (pick) return; acc += weights[k]; if (r < acc && weights[k]) pick = k; });
    return pick;
  }
  // Show a card. A preview (from the Grown-ups sheet) shows above the sheet and doesn't count as one.
  function kindShow(pick, preview) {
    if (!pick) return false;
    var line = pick.line;
    if (!preview) {
      var st = kindState(), t = now(), gap = kindGap();
      st.last = t;
      st.next = t + gap[0] + Math.random() * (gap[1] - gap[0]);
      put(KKEY, JSON.stringify(st));
    }
    kindLastLine = line;
    var el = $("tb-kind");
    if (!el) {
      el = document.createElement("div");
      el.id = "tb-kind";
      el.className = "tb-kind";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML = '<i class="tb-kind-art"></i><span></span>';
      document.body.appendChild(el);
    }
    el.querySelector(".tb-kind-art").innerHTML = KIND_ART[pick.art] || KIND_ART.gentle;
    el.querySelector("span").textContent = line;
    el.classList.remove("show", "hide");
    el.classList.toggle("preview", !!preview);
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(kindTimer);
    kindTimer = setTimeout(function () { el.classList.add("hide"); kindTimer = setTimeout(function () { el.classList.remove("show", "hide"); }, 700); },
      KIND_STAYS[kset("kind-stay")] || KIND_STAYS.medium);
    // A soft two-note chime, only when the shared sound is on and running.
    try {
      var a = soundOn && actx && actx.state === "running" ? actx : null;
      if (a) [659, 880].forEach(function (f, i) {
        var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + i * 0.14;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.55);
      });
    } catch (e) { /* no sound */ }
    return true;
  }
  function kindState() { return readJSON(KKEY); }
  function kindHide() {
    var el = $("tb-kind");
    if (el && el.classList.contains("show") && !el.classList.contains("preview")) { clearTimeout(kindTimer); el.classList.remove("show", "hide"); }
  }
  // Called by apps when he finishes something (a build, a puzzle, a job). Shows only sometimes, mostly a
  // congratulation (a star). type "love" asks for a love line instead.
  function kind(type) {
    if (!kindReady() || kset("kind-finish") === false) return false;
    var st = kindState(), t = now();
    if (st.last && t - st.last < KIND_SOON) return false;
    if (Math.random() < 0.5) return false;
    return kindShow(kindPick(type === "love" && kindPick("love") ? "love" : kindMix({ done: 8, gentle: 2 })));
  }
  // Every second: count play time (a touch in the last 30 s), and show one when it's time.
  function kindTick() {
    if (!kindReady()) { kindHide(); return; }
    var t = now();
    if (t - kindTouch < 30000) kindPlay += 1000;
    if (kset("kind-play") === false) return;
    var st = kindState();
    if (!st.next) { st.next = t + kindGap()[0] * 0.5; put(KKEY, JSON.stringify(st)); return; }
    // Never wait longer than the grown-up's choice (it may have been shortened since).
    if (st.next - t > kindGap()[1]) { st.next = t + kindGap()[0]; put(KKEY, JSON.stringify(st)); }
    // Wait for some play on this page and a touch just now, so it lands while he is there and happy.
    if (t >= st.next && kindPlay >= 40000 && t - kindTouch < 8000 && !kindShow(kindPick(kindMix({ gentle: 7, love: 3 })))) {
      st.next = t + kindGap()[0]; put(KKEY, JSON.stringify(st));  // nothing on to show: try again later
    }
  }
  function kindStart() {
    document.addEventListener("pointerdown", function () { kindTouch = now(); }, true);
    setInterval(kindTick, 1000);
    // Back on the home screen after playing in an app: sometimes a warm "between activities" line.
    if (opts.home) {
      var been = false;
      try { been = !!sessionStorage.getItem("toybox-launch"); } catch (e) { /* ignore */ }
      setTimeout(function () {
        var st = kindState();
        if (been && kset("kind-home") !== false && kindReady() && (!st.last || now() - st.last > KIND_SOON) && Math.random() < 0.6) {
          kindShow(kindPick(kindMix({ gentle: 4, done: 4, love: 2 })));
        }
      }, 1400);
    }
  }

  // The Kind words controls in the home screen's Grown-ups sheet ("App settings").
  function kindArt(k) { return '<i class="tb-kd-pic" aria-hidden="true">' + KIND_ART[k] + "</i>"; }
  function kindChoiceRow(id, choices) {
    return '<div class="row" data-kd-choice="' + id + '">' + choices.map(function (c) {
      return '<button class="btn" type="button" data-v="' + c[0] + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>";
  }
  function kindCheck(id, label) {
    return '<label class="check"><input type="checkbox" data-kd-bool="' + id + '"> ' + esc(label) + "</label>";
  }
  function kindBuildSettings(row) {
    var newKind = "love";
    var html = '<label class="check"><input type="checkbox" id="tb-set-kind-words"> Show kind words now and then</label>' +
      '<p class="sub">A little card with a picture floats in at the top for a few seconds, like "You are doing great!", "You did it!" or "Dad loves you!"</p>' +
      '<div class="tb-kd" id="tb-kd">' +
        '<p class="tb-kd-h">How often</p>' +
        kindChoiceRow("kind-often", [["rare", "Rarely"], ["some", "Sometimes"], ["often", "Often"]]) +
        '<p class="sub" id="tb-kd-oftenNote"></p>' +
        '<p class="tb-kd-h">When</p>' +
        kindCheck("kind-play", "While he plays") +
        kindCheck("kind-finish", "Sometimes when he finishes something") +
        kindCheck("kind-home", "Sometimes when he comes back to the home screen") +
        '<p class="tb-kd-h">How long a card stays</p>' +
        kindChoiceRow("kind-stay", [["short", "Short"], ["medium", "Medium"], ["long", "Long"]]) +
        '<p class="tb-kd-h">Your own words</p>' +
        '<div class="tb-kd-mine" id="tb-kd-mine"></div>' +
        '<div class="tb-kd-add">' +
          '<input class="textin" id="tb-kd-new" type="text" maxlength="' + KIND_MAX + '" autocomplete="off" placeholder="Type a kind line" aria-label="A new kind line">' +
          '<div class="row" id="tb-kd-newKind">' + KIND_KINDS.map(function (k) {
            return '<button class="btn tb-kd-kindbtn" type="button" data-k="' + k + '" aria-label="' + KIND_PIC[k] + ": " + KIND_NAME[k] + '">' + kindArt(k) + esc(KIND_PIC[k]) + "</button>"; }).join("") +
            '<button class="btn" type="button" id="tb-kd-addBtn">＋ Add</button></div>' +
        '</div>' +
        '<p class="sub">The picture goes with the line: a sun for a kind reminder, a star for well done, a heart for love. ' +
          'Words show just as typed. Write "Dad loves you!" rather than "I love you!": the card isn\'t the one talking.</p>' +
        '<details class="tb-kd-usual"><summary id="tb-kd-usualSum">The usual lines</summary>' +
          KIND_KINDS.map(function (k) {
            return '<div class="tb-kd-group"><p class="tb-kd-gh">' + kindArt(k) + esc(KIND_NAME[k]) +
              '<button class="btn small" type="button" data-kd-all="' + k + '">All</button>' +
              '<button class="btn small" type="button" data-kd-none="' + k + '">None</button></p>' +
              KIND_LISTS[k].map(function (l) {
                return '<label class="check"><input type="checkbox" data-kd-line="' + esc(l) + '"> ' + esc(l) + "</label>"; }).join("") +
              "</div>";
          }).join("") +
        "</details>" +
        '<div class="sheet-actions"><button class="btn" type="button" id="tb-kd-show">Show one now</button></div>' +
        '<p class="sub" id="tb-kd-showNote" hidden></p>' +
      "</div>";
    row.innerHTML = html;
    function q(sel) { return row.querySelector(sel); }
    function each(sel, fn) { Array.prototype.forEach.call(row.querySelectorAll(sel), fn); }
    q("#tb-set-kind-words").addEventListener("change", function () { settingSet("kind-words", this.checked); kindRefreshSettings(row); });
    each("[data-kd-choice]", function (r) {
      each('[data-kd-choice="' + r.getAttribute("data-kd-choice") + '"] [data-v]', function (b) {
        b.addEventListener("click", function () { settingSet(r.getAttribute("data-kd-choice"), b.getAttribute("data-v")); kindRefreshSettings(row); });
      });
    });
    each("[data-kd-bool]", function (c) { c.addEventListener("change", function () { settingSet(c.getAttribute("data-kd-bool"), c.checked); }); });
    each("[data-kd-line]", function (c) {
      c.addEventListener("change", function () {
        var l = c.getAttribute("data-kd-line"), off = kindOffList().filter(function (x) { return x !== l; });
        if (!c.checked) off.push(l);
        settingSet("kind-off", off); kindRefreshSettings(row);
      });
    });
    function setGroup(k, on) {
      var off = kindOffList().filter(function (x) { return KIND_LISTS[k].indexOf(x) < 0; });
      if (!on) off = off.concat(KIND_LISTS[k]);
      settingSet("kind-off", off); kindRefreshSettings(row);
    }
    each("[data-kd-all]", function (b) { b.addEventListener("click", function () { setGroup(b.getAttribute("data-kd-all"), true); }); });
    each("[data-kd-none]", function (b) { b.addEventListener("click", function () { setGroup(b.getAttribute("data-kd-none"), false); }); });
    // A new line of your own: type it, pick its picture, Add (or Enter). It shows once right away.
    each("#tb-kd-newKind [data-k]", function (b) {
      b.addEventListener("click", function () { newKind = b.getAttribute("data-k"); paintNewKind(); });
    });
    function paintNewKind() { each("#tb-kd-newKind [data-k]", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-k") === newKind)); }); }
    paintNewKind();
    function add() {
      var inp = q("#tb-kd-new"), t = inp.value.trim().slice(0, KIND_MAX), mine = kindMine();
      if (!t) { inp.focus(); return; }
      if (mine.length >= KIND_MINE_MAX) { toast("That's the most lines: remove one first"); return; }
      mine.push({ t: t, k: newKind });
      kindSetMine(mine);
      inp.value = "";
      kindRefreshSettings(row);
      kindShow({ line: t, art: newKind }, true);
    }
    q("#tb-kd-addBtn").addEventListener("click", add);
    q("#tb-kd-new").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    // Your own lines: edit the words in place, tap the picture to change it, ✕ to remove.
    var mineBox = q("#tb-kd-mine");
    mineBox.addEventListener("input", function (e) {
      var i = Number(e.target.getAttribute("data-i")), mine = kindMine();
      if (!e.target.classList.contains("textin") || !mine[i]) return;
      mine[i].t = e.target.value.slice(0, KIND_MAX);
      if (mine[i].t.trim()) kindSetMine(mine);
    });
    mineBox.addEventListener("focusout", function (e) {
      // Emptied words remove the line.
      if (e.target.classList.contains("textin") && !e.target.value.trim()) {
        var i = Number(e.target.getAttribute("data-i")), mine = kindMine();
        mine.splice(i, 1); kindSetMine(mine);
        setTimeout(function () { kindRefreshSettings(row, true); }, 0);
      }
    });
    mineBox.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      var i = Number(b.getAttribute("data-i")), mine = kindMine();
      if (!mine[i]) return;
      if (b.hasAttribute("data-kd-del")) mine.splice(i, 1);
      else if (b.hasAttribute("data-kd-pic")) mine[i].k = KIND_KINDS[(KIND_KINDS.indexOf(mine[i].k) + 1) % KIND_KINDS.length];
      kindSetMine(mine);
      kindRefreshSettings(row, true);
    });
    q("#tb-kd-show").addEventListener("click", function () {
      var note = q("#tb-kd-showNote");
      var ok = kindShow(kindPick(kindMix({ gentle: 1, done: 1, love: 1 })), true);
      note.hidden = ok;
      note.textContent = "Every line is switched off: turn some on, or add your own.";
    });
    kindRefreshSettings(row);
  }
  function kindRefreshSettings(row, force) {
    if (!row || !row.querySelector("#tb-kd")) return;
    function each(sel, fn) { Array.prototype.forEach.call(row.querySelectorAll(sel), fn); }
    var on = settingGet("kind-words") !== false;
    row.querySelector("#tb-set-kind-words").checked = on;
    row.querySelector("#tb-kd").hidden = !on;
    each("[data-kd-choice]", function (r) {
      var v = kset(r.getAttribute("data-kd-choice"));
      each('[data-kd-choice="' + r.getAttribute("data-kd-choice") + '"] [data-v]', function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === v)); });
    });
    var g = KIND_GAPS[kset("kind-often")] || KIND_GAPS.some;
    row.querySelector("#tb-kd-oftenNote").textContent = "About one every " + g[0] + " to " + g[1] + " minutes of play.";
    each("[data-kd-bool]", function (c) { c.checked = kset(c.getAttribute("data-kd-bool")) !== false; });
    var off = kindOffList(), total = 0, onCount = 0;
    each("[data-kd-line]", function (c) { total++; c.checked = off.indexOf(c.getAttribute("data-kd-line")) < 0; if (c.checked) onCount++; });
    row.querySelector("#tb-kd-usualSum").textContent = "The usual lines (" + onCount + " of " + total + " on)";
    // Don't rebuild the list under a finger that is typing in it.
    var box = row.querySelector("#tb-kd-mine");
    if (!force && box.contains(document.activeElement)) return;
    var mine = kindMine();
    box.innerHTML = mine.length ? mine.map(function (m, i) {
      return '<div class="tb-kd-line"><button class="btn tb-kd-picbtn" type="button" data-kd-pic data-i="' + i + '" aria-label="Picture: ' + KIND_PIC[m.k] + ' (tap to change)">' + kindArt(m.k) + "</button>" +
        '<input class="textin" type="text" data-i="' + i + '" maxlength="' + KIND_MAX + '" value="' + esc(m.t) + '" aria-label="Your kind line">' +
        '<button class="btn tb-kd-del" type="button" data-kd-del data-i="' + i + '" aria-label="Remove this line">✕</button></div>';
    }).join("") : '<p class="sub">None yet.</p>';
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
    if (opts.big) setBig(false, false);
    updateSoundUI();
    sync();
    wireTurn();
    setInterval(tick, 250);
    kindStart();

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
      // Settings may have changed on the home screen while this page was frozen.
      SETTINGS.forEach(function (d) { setListeners.forEach(function (fn) { try { fn(d.id, settingGet(d.id)); } catch (er) { /* ignore */ } }); });
    });
    // Another open Toybox page changed the shared timer or sound.
    window.addEventListener("storage", function (e) {
      if (e.key === TKEY || e.key === null) { timer = parseTimer(get(TKEY)); sync(); }
      if (e.key === SKEY || e.key === null) { var on = get(SKEY) === "1"; if (on !== soundOn) setSound(on, true); }
      if (e.key === SETKEY || e.key === null) SETTINGS.forEach(function (d) { setListeners.forEach(function (fn) { try { fn(d.id, settingGet(d.id)); } catch (er) { /* ignore */ } }); });
    });
  }

  // ---------- Offline (one service worker for the whole Toybox) ----------
  // Every page registers the same worker, <root>/sw.js, scoped to the whole Toybox, so one cache serves
  // every app and an update reaches every app at once. Older versions gave each app its own worker; a
  // narrower worker wins inside its folder and kept serving that app's old copy, so any registration
  // still found below the root is removed (its sw.js is now a stub that retires itself too, see marble-run/sw.js).
  // The home-screen app can sit in the background for days without a page load, so the worker is also
  // asked to check for an update whenever the page comes back to the front.
  (function () {
    if (!SCRIPT_SRC || !("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    var root;
    try { root = new URL("../", SCRIPT_SRC).href; } catch (e) { return; }
    var reg = null;
    function start() {
      // register() alone doesn't look for a newer sw.js when this page belongs to another worker (an
      // app's retired stub), so ask for an update check every time.
      navigator.serviceWorker.register(root + "sw.js", { scope: root }).then(function (r) {
        reg = r;
        if (navigator.onLine !== false) r.update().catch(function () {});
      })
        .catch(function () { /* offline install unavailable */ });
      if (navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (list) {
          list.forEach(function (r) {
            // A retired stub that serves this very page unregisters itself once the Toybox-wide worker runs.
            var ctl = navigator.serviceWorker.controller;
            if (ctl && r.active && r.active.scriptURL === ctl.scriptURL) return;
            if (r.scope !== root && r.scope.indexOf(root) === 0) r.unregister().catch(function () {});
          });
        }).catch(function () {});
      }
    }
    if (document.readyState === "complete") start(); else window.addEventListener("load", start);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && reg && navigator.onLine !== false) reg.update().catch(function () {});
    });
  })();

  // ---------- Safety gear ----------
  // The Workshop, the Construction Site and the Kitchen ask for their gear (getting ready) on the first
  // visit; their pages read the sessionStorage flags below and send him to the gear-up when the flag is off.
  // The dad: gear up when you first start, then again only every 10 minutes. So the flag is remembered with
  // the time it was put on ("toybox-gear-v1" in localStorage): it comes back when he leaves and returns (the
  // home screen, or closing and reopening the Toybox), and is taken off once it is 10 minutes old. That
  // happens as a page loads, so the gear-up comes on his next page, never in the middle of a job.
  var GEAR_FLAGS = ["workshop-gear", "site-gear", "kitchen-ready"], GEAR_KEY = "toybox-gear-v1", GEAR_MS = 10 * 60000;
  (function () {
    try {
      var on = readJSON(GEAR_KEY), t = now(), changed = false;
      GEAR_FLAGS.forEach(function (k) {
        var flag = sessionStorage.getItem(k) === "on", at = Number(on[k]) || 0;
        if (flag && !at) { on[k] = at = t; changed = true; }          // just put on: start its 10 minutes
        if (at && (t - at > GEAR_MS || at > t)) {                      // 10 minutes up: off, gear up again
          sessionStorage.removeItem(k); delete on[k]; changed = true;
        } else if (at && !flag) sessionStorage.setItem(k, "on");       // still on from before: keep it on
      });
      if (changed) put(GEAR_KEY, JSON.stringify(on));
    } catch (e) { /* storage blocked: the pages treat the gear as on */ }
  })();

  // ---------- Re-tapping the choice already picked ----------
  // A tile or tab already marked picked (aria-pressed / aria-selected "true") usually does nothing when
  // tapped again, which reads as a dead button (the dad's feedback). It gives a small wiggle instead.
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button, [role=button], [role=tab]");
    if (!b || b.classList.contains("bigtoggle") || b.classList.contains("hold")) return;
    function picked() { return b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-selected") === "true"; }
    if (!picked()) return;                    // capture phase: the state before the app's own handler
    requestAnimationFrame(function () {
      if (!picked()) return;                  // a toggle that switched off: the app answered
      b.classList.remove("tb-again"); void b.offsetWidth; b.classList.add("tb-again");
    });
  }, true);

  // ---------- Labels that fit ----------
  // A button or tile label wider than its box (a long word in a narrow tab, a panel squeezed when the iPad is
  // held sideways) is shrunk until it fits, down to 70% of its size, instead of being cut off ("oundove").
  // The element holding the text gets an inline font-size; the original is put back before each new fit, so a
  // wider screen brings the full size back. Runs on load, when the font arrives, on resize and turning, and
  // when buttons appear or tabs change. Apps need do nothing; tools/fit.js finds labels that still don't fit.
  (function () {
    var MIN = 0.7, timer = 0, touched = [];
    function boxOf(b) {
      var r = b.getBoundingClientRect(), cs = getComputedStyle(b);
      return { l: r.left + parseFloat(cs.borderLeftWidth), r: r.right - parseFloat(cs.borderRightWidth), w: r.width };
    }
    // [{el, ratio}] for every text in a visible button that runs past the button's sides or ends in "…"
    function over() {
      var out = [], bs = document.querySelectorAll("button, .btn, .tb-tile, [role=button], [role=tab]");
      var rg = document.createRange();
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], box = boxOf(b);
        if (!box.w) continue;
        var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT), n;
        while ((n = w.nextNode())) {
          var p = n.parentElement;
          if (!p || !/\S/.test(n.nodeValue) || p instanceof SVGElement) continue;
          rg.selectNodeContents(n);
          var rs = rg.getClientRects(), l = Infinity, r = -Infinity, j;
          for (j = 0; j < rs.length; j++) if (rs[j].width) { l = Math.min(l, rs[j].left); r = Math.max(r, rs[j].right); }
          if (r < l) continue;
          var ratio = 1, extra = Math.max(0, box.l - l) + Math.max(0, r - box.r);
          if (extra > 1) ratio = (r - l - extra) / (r - l);
          if (getComputedStyle(p).textOverflow === "ellipsis" && p.scrollWidth > p.clientWidth + 1) {
            ratio = Math.min(ratio, p.clientWidth / p.scrollWidth);
          }
          if (ratio < 1) out.push({ el: p, ratio: ratio });
        }
      }
      return out;
    }
    function fit() {
      timer = 0;
      var i, k, list;
      for (i = 0; i < touched.length; i++) touched[i].style.fontSize = touched[i].getAttribute("data-tbfit") || "";
      for (i = 0; i < touched.length; i++) touched[i].removeAttribute("data-tbfit");
      touched = [];
      for (k = 0; k < 4; k++) {                          // padding and icons don't shrink: a few passes
        list = over();
        if (!list.length) break;
        var sizes = list.map(function (o) { return parseFloat(getComputedStyle(o.el).fontSize); });
        for (i = 0; i < list.length; i++) {
          var el = list[i].el;
          if (!el.hasAttribute("data-tbfit")) {
            el.setAttribute("data-tbfit", el.style.fontSize || "");
            el.setAttribute("data-tbfit-px", sizes[i]);
            touched.push(el);
          }
          var min = MIN * parseFloat(el.getAttribute("data-tbfit-px"));
          el.style.fontSize = Math.max(min, sizes[i] * list[i].ratio * 0.97) + "px";
        }
      }
    }
    function soon(ms) { if (!timer) timer = setTimeout(fit, ms || 120); }
    window.addEventListener("load", function () { soon(0); });
    window.addEventListener("resize", function () { clearTimeout(timer); timer = 0; soon(150); });
    window.addEventListener("orientationchange", function () { soon(300); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { soon(0); });
    if (window.MutationObserver) {
      var start = function () {
        new MutationObserver(function () { soon(); }).observe(document.body, { subtree: true, childList: true,
          characterData: true, attributes: true, attributeFilter: ["hidden", "class", "aria-selected", "aria-pressed"] });
      };
      if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
    }
  })();

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

  // =====================================================================================================
  // Shared components (plans/redesign.md section 2; API in the header above; demo: tools/shell-demo.html)
  // =====================================================================================================
  function elOf(x) { return typeof x === "string" ? document.querySelector(x) : x; }
  function cssPx(name, fallback) {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return isFinite(v) ? v : fallback;
  }
  function call(fn) { if (typeof fn === "function") { try { return fn.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { setTimeout(function () { throw e; }); } } }
  function locked() { return timer.phase === "ending" || timer.phase === "resting"; }
  function wiggle(el) {
    if (!el) return;
    el.classList.remove("tb-wiggle"); void el.offsetWidth; el.classList.add("tb-wiggle");
    clearTimeout(el._tbWig); el._tbWig = setTimeout(function () { el.classList.remove("tb-wiggle"); }, 560);
  }
  // A picture: an SVG/HTML string, or a function returning an element (a canvas).
  function setPic(box, pic) {
    if (box._tbPic === pic) return;
    box._tbPic = pic;
    box.innerHTML = "";
    if (typeof pic === "function") { var n = pic(); if (n) box.appendChild(n); }
    else if (pic) box.innerHTML = pic;
    box.hidden = !pic;
  }
  // UI action icons (24 px grid, 2.5 px stroke, no fill), the same in every app.
  var UI = {
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5"/>',
    big: ICON_EXPAND,
    "new": '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.8v4.4h-4.4"/>',
    surprise: '<rect x="4.5" y="11" width="15" height="9.5" rx="1.5"/><path d="M3.5 7.5h17V11h-17z"/><path d="M12 7.5v13"/><path d="M12 7.5C10.5 4 7 3.6 7 5.6c0 1.4 2.4 1.9 5 1.9 2.6 0 5-.5 5-1.9 0-2-3.5-1.6-5 1.9"/>',
    shelf: '<path d="M3.5 20.5h17M4.5 20.5V4M19.5 20.5V4M4.5 12.5h15"/><path d="M7 12.5V8h3v4.5M13 12.5l1.6-4.6 2.6.9-1.3 3.7"/><path d="M7.5 20.5v-4.5h3.5v4.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function uiIcon(name) { return '<svg class="tb-ui-ic" viewBox="0 0 24 24" aria-hidden="true">' + (UI[name] || "") + "</svg>"; }
  // The generic Go picture: a play triangle (pages give the action's own picture when they have one).
  var PIC_PLAY = '<svg viewBox="0 0 40 40"><path d="M13 7.5 32 20 13 32.5Z" fill="#FFFFFF" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  var PIC_AGAIN = '<svg viewBox="0 0 40 40"><path d="M31 20a11 11 0 1 1-3.3-7.8" fill="none" stroke="#1D2340" stroke-width="7.5" stroke-linecap="round"/><path d="M31 20a11 11 0 1 1-3.3-7.8" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/><path d="M33.5 6.5v9h-9z" fill="#FFFFFF" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  var TICK_SVG = '<svg class="tb-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.4" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- Palm guard ----------
  // Preschoolers rest their wrists on the bottom edge and keep a palm on the glass. A touch is a palm when it
  // starts within 20 px of the bottom edge, when another touch has rested still for over a second, or when the
  // contact is very large. Used by press, go, steps, jobs, tiles and bar; pages may guard their own controls.
  var touchesDown = {};
  (function () {
    function d(e) { if (e.pointerType === "touch") touchesDown[e.pointerId] = { x: e.clientX, y: e.clientY, t: now(), still: true }; }
    function m(e) { var t = touchesDown[e.pointerId]; if (t && t.still && Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y) > 14) t.still = false; }
    function u(e) { delete touchesDown[e.pointerId]; }
    document.addEventListener("pointerdown", d, true);
    document.addEventListener("pointermove", m, true);
    document.addEventListener("pointerup", u, true);
    document.addEventListener("pointercancel", u, true);
  })();
  function isPalm(e) {
    if (!e || e.pointerType !== "touch") return false;
    if (e.clientY > innerHeight - 20) return true;
    if ((e.width || 0) > 60 || (e.height || 0) > 60) return true;
    for (var id in touchesDown) {
      if (Number(id) === e.pointerId) continue;
      var t = touchesDown[id];
      if (t.still && now() - t.t > 1000) return true;
    }
    return false;
  }
  function palmGuard(el) {
    el = elOf(el);
    if (!el || el._tbPalm) return;
    var block = 0;
    el._tbPalm = true;
    el.addEventListener("pointerdown", function (e) {
      if (isPalm(e)) { block = now() + 1500; e.stopImmediatePropagation(); e.preventDefault(); }
      else block = 0;
    }, true);
    el.addEventListener("click", function (e) {
      if (block && now() < block && e.detail !== 0) { block = 0; e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
  }

  // ---------- Go ----------
  function goBtn(el, o) {
    o = o || {};
    el = elOf(el);
    var btn = el.tagName === "BUTTON" ? el : document.createElement("button");
    if (btn !== el) { btn.type = "button"; el.appendChild(btn); }
    btn.classList.add("btn", "tb-go", "tb-gopill");
    btn.innerHTML = '<span class="tb-go-fill"></span><span class="tb-pic" aria-hidden="true"></span><span class="tb-go-word"></span>';
    var fill = btn.firstChild, picEl = fill.nextSibling, word = picEl.nextSibling, busyOn = false;
    function set(label, pic) {
      if (label != null) { word.textContent = label; btn.setAttribute("aria-label", label); }
      setPic(picEl, pic === undefined ? (o.icon || PIC_PLAY) : pic);
    }
    btn.addEventListener("click", function (e) {
      if (locked()) return;
      if (busyOn) { wiggle(btn); call(o.onBusy); return; }
      var r = call(o.onPress, e);
      if (r === false) { wiggle(btn); call(o.onIdle); }
    });
    palmGuard(btn);
    set(o.label || "Go!", o.icon);
    return {
      el: btn,
      set: set,
      label: function () { return word.textContent; },
      pulse: function (on) { btn.classList.toggle("is-pulse", !!on); },
      // busy(true) or busy(0..1): a motion is running (a lighter fill shows how far); a press then wiggles.
      busy: function (on) {
        busyOn = !!on || on === 0;
        btn.classList.toggle("is-busy", busyOn);
        btn.style.setProperty("--tb-go-p", typeof on === "number" ? Math.round(Math.max(0, Math.min(1, on)) * 100) + "%" : "100%");
      },
      isBusy: function () { return busyOn; },
      wiggle: function () { wiggle(btn); }
    };
  }

  // ---------- Coach line ----------
  // The optional spoken coach (App setting "coach-voice", off by default; only while sound is on).
  function speak(line) {
    if (!soundOn || !settingGet("coach-voice") || !window.speechSynthesis || locked() || document.hidden) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(line);
      u.rate = 0.95; u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice */ }
  }
  function coachLine(el) {
    el = elOf(el);
    el.classList.add("tb-coach");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = '<span class="tb-coach-dot" aria-hidden="true"></span><span class="tb-coach-text"></span>';
    var txt = el.lastChild, stepText = "", sayText = "", sayUntil = 0, t = 0, shown = null, api;
    function show() {
      clearTimeout(t);
      var saying = now() < sayUntil, line = saying ? sayText : stepText;
      if (saying) t = setTimeout(show, sayUntil - now() + 20);
      if (!line) { el.classList.add("off"); shown = ""; return; }
      el.hidden = false;
      el.classList.remove("off");
      el.classList.toggle("is-step", !saying);
      if (line !== shown) {
        shown = line;
        txt.textContent = line;
        el.classList.remove("is-new"); void el.offsetWidth; el.classList.add("is-new");
        speak(line);
      }
    }
    api = {
      el: el,
      // A passing line (a hint after a mistake, a cheer), at least 3 s, then back to the step's line.
      say: function (text, sec) { sayText = String(text || ""); sayUntil = now() + Math.max(3, sec || 3.5) * 1000; show(); },
      // The sticky line for the current step ("Pour the batter!"), with the step dot.
      step: function (text) { stepText = String(text || ""); sayUntil = 0; show(); },
      clear: function () { stepText = ""; sayUntil = 0; show(); },
      text: function () { return el.classList.contains("off") ? "" : txt.textContent; }
    };
    show();
    return api;
  }

  // ---------- Step row ----------
  function stepRow(el, o) {
    el = elOf(el); o = o || {};
    var list = (o.steps || []).slice(), cur = 0, doneSet = {}, finished = false, finLabel = "Again!", finPic = PIC_AGAIN;
    var coach = o.coach || null, ghost = o.ghost || null;
    el.innerHTML = "";
    el.classList.add("tb-steps");
    el.setAttribute("role", "list");
    el.setAttribute("aria-label", o.label || "Steps");
    var chips = list.map(function (s) {
      var li = document.createElement("li");
      li.className = "tb-chip";
      li.setAttribute("role", "listitem");
      li.innerHTML = '<span class="tb-chip-dot"><span class="tb-pic" aria-hidden="true"></span>' + TICK_SVG + '</span><span class="tb-chip-word"></span>';
      setPic(li.firstChild.firstChild, s.pic);
      li.lastChild.textContent = s.name;
      li.addEventListener("click", function () { chipTap(li, s); });
      return li;
    });
    var many = document.createElement("li");
    many.className = "tb-chip is-done is-many";
    many.setAttribute("role", "listitem");
    many.innerHTML = '<span class="tb-chip-dot">' + TICK_SVG + '</span><span class="tb-chip-word">Done</span>';
    many.addEventListener("click", function () { chipTap(many, null); });
    var goLi = document.createElement("li");
    goLi.className = "tb-st-go";
    goLi.setAttribute("role", "listitem");
    var g = goBtn(goLi, {
      onPress: function (e) {
        if (finished) return o.onAgain ? call(o.onAgain) : call(o.onGo, "again", e);
        return call(o.onGo, list[cur] && list[cur].id, e);
      },
      onIdle: function () { sayStep(); call(o.onIdle, list[cur] && list[cur].id); },
      onBusy: function () { call(o.onBusy, list[cur] && list[cur].id); }
    });
    palmGuard(el);
    function sayStep() { var s = list[cur]; if (coach && s && !finished) coach.step(s.coach || s.go || s.name); }
    function chipTap(li, s) {
      if (locked()) return;
      li.classList.remove("is-wiggle"); void li.offsetWidth; li.classList.add("is-wiggle");
      setTimeout(function () { li.classList.remove("is-wiggle"); }, 560);
      wiggle(g.el);
      sayStep();
      call(o.onChip, s && s.id);
    }
    function render(changed) {
      var s = list[cur], i, doneIdx = [], coming = [];
      for (i = 0; i < list.length; i++) {
        var isDone = finished || doneSet[list[i].id];
        chips[i].classList.toggle("is-done", !!isDone);
        chips[i].setAttribute("aria-label", list[i].name + (isDone ? ", done" : (i === cur ? ", now" : "")));
        if (i === cur && !finished) continue;
        if (isDone) doneIdx.push(i); else coming.push(i);
      }
      // Many ticks on a narrow row: one "Done" chip for all of them, so Go keeps its room.
      var collapse = doneIdx.length >= 2 && (list.length >= 5 || (doneIdx.length + coming.length >= 4 && innerWidth < 520));
      var order = [];
      if (collapse) order.push(many); else doneIdx.forEach(function (k) { order.push(chips[k]); });
      order.push(goLi);
      coming.forEach(function (k) { order.push(chips[k]); });
      el.innerHTML = "";
      order.forEach(function (n) { el.appendChild(n); });
      goLi.setAttribute("aria-current", finished ? "false" : "step");
      el.classList.toggle("is-crowded", order.length >= 4);
      el.classList.toggle("is-finished", finished);
      if (finished) g.set(finLabel, finPic);
      else if (s) g.set(s.go || s.name + "!", s.pic);
      if (changed) {
        sayStep();
        if (ghost && ghost.poke) ghost.poke();
        g.el.classList.remove("tb-pop"); void g.el.offsetWidth; g.el.classList.add("tb-pop");
      }
    }
    function idx(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }
    var api = {
      el: el,
      go: g,
      // Make a step the current one: the steps before it are done, the ones after it are coming.
      at: function (id) {
        var k = idx(id); if (k < 0) return;
        var changed = k !== cur || finished;
        cur = k; finished = false; doneSet = {};
        for (var i = 0; i < k; i++) doneSet[list[i].id] = true;
        render(changed);
        if (!changed) sayStep();
      },
      // Tick a step; if it was the current one, the next step becomes current.
      done: function (id) {
        var k = idx(id); if (k < 0) return;
        doneSet[id] = true;
        if (k === cur && cur < list.length - 1) { cur++; render(true); } else render(false);
      },
      // Every step ticked, a cheer, Go becomes label ("Again!" by default; it calls onAgain or onGo("again")).
      finish: function (label, pic) {
        finished = true; finLabel = label || "Again!"; finPic = pic || PIC_AGAIN;
        render(false);
        if (coach) coach.clear();
      },
      reset: function () { cur = 0; doneSet = {}; finished = false; render(true); },
      current: function () { return finished ? null : (list[cur] && list[cur].id); },
      finished: function () { return finished; },
      busy: function (on) { g.busy(on); },
      pulse: function (on) { el.classList.toggle("is-pulse", !!on); },
      sayStep: sayStep
    };
    render(false);
    window.addEventListener("resize", function () { render(false); });
    return api;
  }

  // ---------- Job bar ----------
  function jobBar(el, o) {
    el = elOf(el); o = o || {};
    var value = o.value, btns = {};
    el.innerHTML = "";
    el.classList.add("tb-jobs");
    el.setAttribute("role", "tablist");
    (o.jobs || []).forEach(function (j) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tb-job";
      b.setAttribute("role", "tab");
      b.innerHTML = '<span class="tb-pic" aria-hidden="true"></span><span class="tb-job-word"></span>';
      setPic(b.firstChild, j.pic);
      b.lastChild.textContent = j.name;
      b.addEventListener("click", function () {
        if (locked()) return;
        if (value === j.id) return;          // the shared re-tap wiggle answers (aria-selected)
        set(j.id); call(o.onPick, j.id);
      });
      btns[j.id] = b;
      el.appendChild(b);
    });
    palmGuard(el);
    function set(id) {
      value = id;
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-selected", String(k === id)); });
    }
    set(value === undefined && o.jobs && o.jobs[0] ? o.jobs[0].id : value);
    return { el: el, set: set, value: function () { return value; } };
  }

  // ---------- Choice tiles ----------
  function tileRow(el, o) {
    el = elOf(el); o = o || {};
    var kind = o.kind || "pick", value = o.value, list = [], btns = {};
    el.classList.add("tb-tilerow");
    palmGuard(el);
    function cols() {
      var n = list.length, rows = o.rows || Math.ceil(n / 4);
      return Math.max(1, Math.min(4, Math.ceil(n / rows)));
    }
    function items(l) {
      list = (l || []).slice();
      if (list.length > 8 && window.console) console.warn("Toybox.tiles: " + list.length + " tiles; keep it to 8 (plans/redesign.md 1.4)");
      el.innerHTML = ""; btns = {};
      el.style.setProperty("--tb-cols", cols());
      list.forEach(function (it) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn tb-tile" + (kind === "action" ? " is-action" : "") + (kind === "swatch" ? " is-swatch" : "");
        b.innerHTML = '<span class="tb-pic" aria-hidden="true"></span><span class="tb-tile-word"></span>';
        setPic(b.firstChild, it.pic);
        b.lastChild.textContent = it.name;
        b.setAttribute("aria-label", it.name);
        if (it.color) b.style.setProperty("--tb-sw", it.color);
        b.addEventListener("click", function () {
          if (locked()) return;
          if (kind === "action") { flash(it.id); call(o.onPick, it.id); return; }
          if (value === it.id) return;       // the shared re-tap wiggle answers (aria-pressed)
          set(it.id); call(o.onPick, it.id);
        });
        btns[it.id] = b;
        el.appendChild(b);
      });
      set(value);
    }
    function set(id) {
      value = id;
      if (kind === "action") return;
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", String(k === String(id))); });
    }
    function flash(id) {
      var b = btns[id]; if (!b) return;
      b.classList.remove("is-flash"); void b.offsetWidth; b.classList.add("is-flash");
    }
    items(o.items);
    return { el: el, set: set, items: items, flash: flash, value: function () { return value; }, button: function (id) { return btns[id] || null; } };
  }

  // ---------- Bottom bar ----------
  function bottomBar(el, o) {
    el = elOf(el); o = o || {};
    el.innerHTML = "";
    el.classList.add("tb-bottombar");
    function mk(cls, icon, word, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn " + cls;
      b.innerHTML = uiIcon(icon) + "<span>" + word + "</span>";
      b.addEventListener("click", function (e) { if (!locked()) call(fn, e); });
      el.appendChild(b);
      return b;
    }
    var shelf = o.shelf ? mk("tb-bb-shelf", "shelf", "Shelf", o.shelf) : null;
    if (shelf) shelf.setAttribute("aria-pressed", "false");
    var nb = o.onNew === null ? null : mk("tb-new tb-bb-new", "new", "New", o.onNew);
    var sb = o.onSurprise === null ? null : mk("tb-surprise tb-bb-surprise", "surprise", "Surprise", o.onSurprise);
    palmGuard(el);
    return {
      el: el, shelf: shelf, newBtn: nb, surprise: sb,
      shelfOpen: function (on) { if (shelf) shelf.setAttribute("aria-pressed", String(!!on)); }
    };
  }

  // ---------- Ghost hand ----------
  // The see-through hand that shows the next move after a quiet spell (look: the master copy in this file's CSS,
  // also tools/snippets/ghost-hand.css). plan() returns null or { pts: [[x, y], ...] in viewport px, tap: true |
  // hold: true | (several points: a drag), carry: { html, size }, dur: ms, key: "pour" }. Each key shows at most
  // `max` times per visit and never again once learned(key) (he did it himself).
  function ghostHand(o) {
    o = o || {};
    var plan = o.plan, IDLE = o.idleMs || 4500, MAX = o.max || 3;
    var last = now(), armed = true, run = null, el = null, counts = {}, learnedK = {}, learnedAll = false, down = {};
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var carryEl = document.createElement("div");
    carryEl.className = "gh-carry";
    function build() {
      el = document.createElement("div");
      el.className = "ghosthand";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = '<svg viewBox="-24 -18 64 84"><circle class="gh-press" cx="0" cy="0" r="17" fill="rgba(255,201,60,0.55)"/>' +
        '<g fill="#FFFFFF" stroke="#1D2340" stroke-width="3" stroke-linejoin="round">' +
        '<rect x="-9" y="-6" width="18" height="40" rx="9"/><rect x="-12" y="22" width="44" height="40" rx="16"/>' +
        '<rect x="10" y="14" width="14" height="24" rx="7"/></g>' +
        '<circle cx="0" cy="2" r="5" fill="rgba(255,201,60,0.9)"/></svg>';
      el.insertBefore(carryEl, el.firstChild);
      document.body.appendChild(el);
    }
    function stop() {
      if (run) { var p = run.p; run = null; call(o.onShow, p, false); }
      if (el) { el.style.display = "none"; carryEl.innerHTML = ""; }
    }
    function poke() { last = now(); armed = true; if (run) stop(); }
    document.addEventListener("pointerdown", function (e) { down[e.pointerId] = 1; poke(); }, true);
    ["pointerup", "pointercancel"].forEach(function (t) {
      document.addEventListener(t, function (e) { if (down[e.pointerId]) { delete down[e.pointerId]; last = now(); } }, true);
    });
    document.addEventListener("keydown", poke, true);
    function blocked() {
      if (document.hidden || Object.keys(down).length) return true;
      if (sheetOpen() || locked() || turning()) return true;
      return !!(o.ok && !o.ok());
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function at(pts, f) {
      if (pts.length < 2) return pts[0];
      var segs = [], tot = 0, i;
      for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); tot += l; }
      var d = f * tot;
      for (i = 0; i < segs.length; i++) {
        if (d <= segs[i] || i === segs.length - 1) { var t = segs[i] ? Math.min(1, d / segs[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; }
        d -= segs[i];
      }
      return pts[pts.length - 1];
    }
    function frame() {
      if (!run) return;
      var t = (now() - run.t0) / run.dur, p = run.p, s = run.s, x, y, a, press, sc = 1;
      if (t >= 1) { stop(); return; }
      if (p.hold) {
        var hp = p.pts[0]; x = hp[0]; y = hp[1];
        a = t < 0.12 ? t / 0.12 : (t > 0.88 ? (1 - t) / 0.12 : 1);
        press = t > 0.22 && t < 0.85;
        sc = press ? 0.92 : 1;
        if (t < 0.22) { var kk = 1 - t / 0.22; x += 26 * s * kk; y += 30 * s * kk; }
      } else if (p.tap || p.pts.length < 2) {
        var pt = p.pts[0];
        x = pt[0]; y = pt[1];
        a = t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1);
        press = (t > 0.3 && t < 0.42) || (t > 0.55 && t < 0.67);
        sc = press ? 0.92 : 1;
        if (t < 0.3) { var k = 1 - t / 0.3; x += 26 * s * k; y += 30 * s * k; }
      } else {
        a = t < 0.1 ? t / 0.1 : (t > 0.9 ? (1 - t) / 0.1 : 1);
        var f = reduce ? 0.5 : ease(Math.max(0, Math.min(1, (t - 0.16) / 0.66)));
        var q = at(p.pts, f); x = q[0]; y = q[1];
        press = t > 0.12 && t < 0.86;
        sc = t < 0.12 ? 1.12 - 0.12 * (t / 0.12) : 1;
      }
      el.style.opacity = (0.85 * a).toFixed(3);
      el.style.transform = "translate(" + (x - 24 * s) + "px," + (y - 18 * s) + "px) rotate(-14deg) scale(" + sc + ")";
      el.lastChild.firstChild.style.opacity = press ? "1" : "0";
      carryEl.style.opacity = press ? "0.75" : "0";
      requestAnimationFrame(frame);
    }
    function show(p) {
      if (!el) build();
      var s = Math.max(1, Math.min(1.7, Math.min(innerWidth, innerHeight) / 360));
      el.style.width = (64 * s) + "px"; el.style.height = (84 * s) + "px";
      el.style.transformOrigin = (24 * s) + "px " + (18 * s) + "px";
      el.style.display = "block";
      carryEl.innerHTML = p.carry ? p.carry.html : "";
      if (p.carry) {
        var c = p.carry.size;
        carryEl.style.cssText = "position:absolute;left:" + (24 * s - c / 2) + "px;top:" + (18 * s - c / 2) + "px;width:" + c + "px;height:" + c + "px";
      }
      run = { p: p, s: s, t0: now(), dur: p.dur || (p.hold ? 3200 : (p.tap ? 2400 : 3200)) };
      call(o.onShow, p, true);
      requestAnimationFrame(frame);
    }
    setInterval(function () {
      if (run || learnedAll || !armed || now() - last < IDLE || typeof plan !== "function") return;
      if (blocked()) { last = now(); return; }
      var p = null;
      try { p = plan(); } catch (e) { p = null; }
      if (!p || !p.pts || !p.pts.length) return;
      var key = p.key || "*";
      if (learnedK[key] || (counts[key] || 0) >= MAX) return;
      armed = false; counts[key] = (counts[key] || 0) + 1;
      show(p);
    }, 250);
    return {
      // He did the move himself: never show it again this visit (one key, or every key).
      learned: function (key) { if (key) learnedK[key] = true; else learnedAll = true; stop(); },
      // Something new to show (a new mode): allow the hint again.
      again: function (key) {
        if (key) { delete learnedK[key]; counts[key] = 0; } else { learnedK = {}; counts = {}; learnedAll = false; }
        armed = true; last = now();
      },
      shown: function (key) { return counts[key || "*"] || 0; },
      poke: poke,
      stop: stop,
      // test hook: show it now
      show: function () { var p = plan && plan(); if (p) show(p); return !!p; }
    };
  }

  // ---------- Tap or drag (one press is always enough) ----------
  function pressHelper(target, o) {
    target = elOf(target); o = o || {};
    var SLOP = o.slop || 12, TAP_MS = o.tapMs || 350, ptrs = {};
    function minR() { return (o.minHit || cssPx("--tb-key", 120)) / 2; }
    function pick(x, y) {
      var part = o.hit ? o.hit(x, y) : null;
      if (part != null) return part;
      if (o.parts) {
        var best = null, bd = Infinity;
        (o.parts() || []).forEach(function (p) {
          var d = Math.hypot(x - p.x, y - p.y), r = Math.max(p.r || 0, minR());
          if (d <= r && d < bd) { bd = d; best = p.id; }
        });
        return best;
      }
      return null;
    }
    function info(s, e) { s.x = e.clientX; s.y = e.clientY; s.dx = s.x - s.x0; s.dy = s.y - s.y0; s.ms = now() - s.t0; return s; }
    target.addEventListener("pointerdown", function (e) {
      if (o.palm !== false && isPalm(e)) return;
      if (locked()) return;
      var part = pick(e.clientX, e.clientY);
      if (part == null && !o.any) return;
      e.preventDefault();
      try { target.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      var s = ptrs[e.pointerId] = { part: part, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t0: now(), ms: 0, drag: false, tap: false };
      call(o.down, part, e, s);
    });
    target.addEventListener("pointermove", function (e) {
      var s = ptrs[e.pointerId]; if (!s) return;
      info(s, e);
      if (!s.drag && (Math.hypot(s.dx, s.dy) > SLOP || s.ms > TAP_MS)) { s.drag = true; call(o.dragStart, s.part, e, s); }
      if (s.drag) call(o.move, s.part, e, s);
    });
    function end(e, cancel) {
      var s = ptrs[e.pointerId]; if (!s) return;
      delete ptrs[e.pointerId];
      info(s, e);
      s.tap = !cancel && !s.drag && Math.hypot(s.dx, s.dy) <= SLOP && s.ms <= TAP_MS;
      s.cancel = !!cancel;
      call(o.up, s.part, e, s);
      if (s.tap && !locked()) call(o.tap, s.part, e.clientX, e.clientY, e);
    }
    target.addEventListener("pointerup", function (e) { end(e, false); });
    target.addEventListener("pointercancel", function (e) { end(e, true); });
    return {
      active: function () { return Object.keys(ptrs).length; },
      cancel: function () { ptrs = {}; }
    };
  }

  // ---------- Name tags ----------
  var tags = {};
  function nametag(text, x, y, ms) {
    var key = String(text), el = tags[key];
    if (!el) { el = document.createElement("div"); el.className = "tb-nametag"; el.setAttribute("aria-hidden", "true"); el.textContent = key; tags[key] = el; document.body.appendChild(el); }
    el.classList.remove("out");
    var w = el.offsetWidth || 80;
    x = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, x));
    y = Math.max(el.offsetHeight + 8, y);
    el.style.left = x + "px"; el.style.top = y + "px";
    clearTimeout(el._t1); clearTimeout(el._t2);
    el._t1 = setTimeout(function () { el.classList.add("out"); }, ms || 2000);
    el._t2 = setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); delete tags[key]; }, (ms || 2000) + 400);
    return el;
  }

  // ---------- Gear-up / getting-ready gate ----------
  function gearOn(flag) {
    try {
      sessionStorage.setItem(flag, "on");
      var on = readJSON(GEAR_KEY); on[flag] = now(); put(GEAR_KEY, JSON.stringify(on));
    } catch (e) { /* ignore */ }
  }
  function gate(o) {
    o = o || {};
    var items = o.items || [], onIds = {}, running = false, finished = false;
    var vb = o.viewBox || "0 0 300 400";
    var root = document.createElement("div");
    root.className = "tb-gate";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", o.title || "Gear up!");
    var layers = items.map(function (it) { return '<svg class="tb-gate-on" data-id="' + esc(it.id) + '" viewBox="' + vb + '" aria-hidden="true">' + (it.onArt || "") + "</svg>"; }).join("");
    root.innerHTML = '<h2 class="tb-gate-title">' + esc(o.title || "Gear up!") + "</h2>" +
      '<div class="tb-gate-row"><div class="tb-gate-worker" role="button" tabindex="0" aria-label="' + esc(o.workerLabel || "Put everything on") + '">' +
      '<svg viewBox="' + vb + '" aria-hidden="true">' + (o.worker || "") + "</svg>" + layers + "</div>" +
      '<div class="tb-gate-items"></div></div>' +
      '<p class="tb-gate-hint">' + esc(o.hint || "Tap to put it all on!") + "</p>";
    var worker = root.querySelector(".tb-gate-worker"), box = root.querySelector(".tb-gate-items");
    var tl = tileRow(box, { kind: "action", items: items.map(function (it) { return { id: it.id, name: it.name, pic: it.art }; }), onPick: function (id) { dressAll(id); } });
    box.classList.remove("tb-tilerow");
    box.style.setProperty("--tb-cols", Math.min(items.length, items.length > 2 ? 2 : items.length));
    function layer(id) { return root.querySelector('.tb-gate-on[data-id="' + id + '"]'); }
    function putOn(id, cb) {
      if (onIds[id]) { if (cb) cb(); return; }
      var it = null; items.forEach(function (x) { if (x.id === id) it = x; });
      if (!it) { if (cb) cb(); return; }
      onIds[id] = true;
      var b = tl.button(id); if (b) b.classList.add("is-on");
      var L = layer(id); if (L) L.classList.add("is-on");
      var r = worker.getBoundingClientRect();
      nametag(it.name, r.left + r.width / 2, r.top + r.height * 0.18, 1600);
      call(o.onPut, id);
      var next = function () { if (cb) cb(); check(); };
      if (o.extra && typeof o.extra[id] === "function") o.extra[id](next, worker);
      else setTimeout(next, Math.max(450, Math.round((o.ms || 1500) / Math.max(1, items.length))));
    }
    function check() {
      if (finished) return;
      for (var i = 0; i < items.length; i++) if (!onIds[items[i].id]) return;
      finished = true;
      if (o.flag) gearOn(o.flag);
      worker.classList.remove("tb-pop"); void worker.offsetWidth; worker.classList.add("tb-pop");
      setTimeout(function () { root.hidden = true; call(o.done); }, 700);
    }
    // One tap dresses everything, in order, starting with what was tapped.
    function dressAll(first) {
      if (locked()) return;
      if (running) { if (first) putOn(first); return; }
      running = true;
      var order = items.map(function (x) { return x.id; });
      if (first && order.indexOf(first) > 0) { order.splice(order.indexOf(first), 1); order.unshift(first); }
      (function nextOne() {
        var id = null;
        for (var i = 0; i < order.length; i++) if (!onIds[order[i]]) { id = order[i]; break; }
        if (!id) { running = false; check(); return; }
        putOn(id, nextOne);
      })();
    }
    worker.addEventListener("click", function () { dressAll(null); });
    worker.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dressAll(null); } });
    // Dragging one item onto the worker puts just that one on.
    items.forEach(function (it) {
      var b = tl.button(it.id); if (!b) return;
      var drag = null;
      b.addEventListener("pointerdown", function (e) {
        if (onIds[it.id] || locked()) return;
        drag = { x: e.clientX, y: e.clientY, moved: false };
        try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      });
      b.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 12) drag.moved = true;
        if (drag.moved) { b.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.06)"; b.style.zIndex = "5"; }
      });
      function up(e) {
        if (!drag) return;
        var moved = drag.moved; drag = null;
        b.style.transform = ""; b.style.zIndex = "";
        if (!moved) return;                   // a tap: the click dresses everything
        b._tbNoClick = now() + 400;
        var r = worker.getBoundingClientRect();
        if (e.clientX > r.left - 30 && e.clientX < r.right + 30 && e.clientY > r.top - 30 && e.clientY < r.bottom + 30) putOn(it.id);
      }
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("click", function (e) { if (b._tbNoClick && now() < b._tbNoClick) { e.stopImmediatePropagation(); } }, true);
    });
    palmGuard(root);
    var portrait = function () { root.querySelector(".tb-gate-row").style.flexDirection = innerHeight > innerWidth ? "column" : "row"; };
    portrait(); window.addEventListener("resize", portrait);
    document.body.appendChild(root);
    return {
      el: root,
      dressAll: function () { dressAll(null); },
      isOn: function (id) { return !!onIds[id]; },
      hide: function () { root.hidden = true; }
    };
  }

  // ---------- Station map ----------
  function stationMap(o) {
    o = o || {};
    var stage = elOf(o.stage), els = [];
    (o.places || []).forEach(function (pl) {
      var a = document.createElement("a");
      a.className = "tb-place";
      a.href = pl.href;
      a.setAttribute("aria-label", pl.name);
      a.innerHTML = '<span class="tb-place-label"><span class="tb-pic" aria-hidden="true"></span><span></span></span>';
      setPic(a.querySelector(".tb-pic"), pl.pic);
      a.querySelector(".tb-place-label").lastChild.textContent = pl.name;
      a.addEventListener("pointerdown", function () { a.classList.add("is-press"); });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) { a.addEventListener(t, function () { a.classList.remove("is-press"); }); });
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (locked()) return;
        a.classList.add("is-press");
        call(o.onPress, pl, a);
        setTimeout(function () { beforeLeave(function () { location.href = pl.href; }); }, 180);
      });
      stage.appendChild(a);
      els.push({ pl: pl, a: a });
    });
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      els.forEach(function (x) {
        var r = typeof x.pl.rect === "function" ? x.pl.rect(W, H) : [x.pl.rect[0] * W, x.pl.rect[1] * H, x.pl.rect[2] * W, x.pl.rect[3] * H];
        if (!r) { x.a.hidden = true; return; }
        x.a.hidden = false;
        x.a.style.left = r[0] + "px"; x.a.style.top = r[1] + "px"; x.a.style.width = r[2] + "px"; x.a.style.height = r[3] + "px";
      });
    }
    layout();
    window.addEventListener("resize", layout);
    return { layout: layout, places: els.map(function (x) { return x.a; }) };
  }

  window.Toybox = {
    init: init,
    fresh: function () { return freshVisit; },
    settings: {
      get: settingGet,
      set: settingSet,
      onChange: function (fn) { if (typeof fn === "function") setListeners.push(fn); },
      action: settingAction,
      list: function () { return SETTINGS.slice(); }
    },
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
    kind: kind,
    openSheet: openSheet,
    closeSheet: closeSheet,
    sheetOpen: sheetOpen,
    turning: turning,
    offFirst: offFirst,
    beforeLeave: beforeLeave,
    // Shared components (plans/redesign.md section 2; see the header)
    go: goBtn,
    steps: stepRow,
    jobs: jobBar,
    tiles: tileRow,
    bar: bottomBar,
    coach: coachLine,
    ghost: ghostHand,
    press: pressHelper,
    palmGuard: palmGuard,
    isPalm: isPalm,
    nametag: nametag,
    gate: gate,
    map: stationMap,
    wiggle: wiggle,
    icon: uiIcon,
    pics: { play: PIC_PLAY, again: PIC_AGAIN }
  };
})();
