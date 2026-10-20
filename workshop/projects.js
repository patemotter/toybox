/* Workshop projects: the shared plan data for the Project page (project.html) and for the stations'
 * project mode. Plain ES5 script, no modules. Load it after ../common/toybox.js:
 *   <script src="projects.js"></script>
 * It defines window.ToyboxProjects.
 *
 * WHAT A PROJECT IS
 * A list of STEPS. Each step is one short visit to one station, opened with a deep link:
 *   <station file>?project=<projectId>&step=<stepId>        (built by ToyboxProjects.stepUrl(step))
 * The station: reads the step with ToyboxProjects.fromQuery() (null when not in project mode), picks the
 * step's tool, locks the material to the project board described in step.job, shows step.title in a banner
 * at the top of the stage and step.coach in the coach pill, hides unrelated choices, and when the job is
 * done shows "Done! ✓" with step.done and ONE button, set up by ToyboxProjects.doneLink(button, step): it
 * records the progress and points the button at the next step. When the next step is on the same machine
 * the page moves on by itself 3 s after the card shows (the dad, 2026-10-18: no green button to press between
 * steps); otherwise the button says where to go next ("Go to the miter saw"). The plan stays one tap away
 * through the station's Back button.
 *
 * NUMBERS
 * Inches with decimals ("7.5", never "7 ½"); ToyboxProjects.fmt(n) formats them. Numbers are allowed only
 * inside project steps that measure or set a machine (the Numbers rule in AGENTS.md); the stations show
 * nothing else numeric in project mode.
 *
 * STEP SHAPE
 *   { id: "back-cut",                  unique within the project
 *     part: "back",                    a part id from project.parts, or "" (plane, build, sand)
 *     station: "saw-bench",            "wall" (index.html) | "measuring" | "saw-bench" | "drill-press" | "hammer-screws"
 *     tool: "miter",                   the tool id inside that station (see JOB KINDS)
 *     title: "Cut the Back on the line",   the step banner and the checklist line
 *     coach: "Slide the line under the blade!",   one action, naming the object
 *     done: "The Back is cut!",        the line on the Done! card
 *     job: { kind: ..., board: { l: inches long, w: inches wide }, ... } }
 *
 * JOB KINDS (what each station must do)
 *   plane     wall, tool "planer": switch on, feed job.board through; done when it comes out flat.
 *   mark      measuring, tool "tape" or "combosquare": the project board lies with its left end at the tape
 *             hook (or the square's head); pull the tape / slide the rule to job.target, measured from the left
 *             end (readout in halves, snaps within 0.25); a pencil tick appears there. job.prior: lines marked
 *             earlier on the same board, drawn on it.
 *             job.mark === "line": then the speed square hooks on the edge at the tick and a line is drawn
 *             by dragging along its edge (across the board). job.mark === "x": an X is drawn at the tick,
 *             centred across the width (the entrance hole). Done when the line / X is drawn.
 *   crosscut  saw-bench, tool "miter": job.board with a pencil line job.line inches from its left end;
 *             the board slides left/right under the blade (soft snap when the line is under the blade);
 *             pull the saw down; the cut counts when the line is within the kerf. The piece to the LEFT
 *             of the line is the part (job.part); the rest is the stock that stays. job.others: the board's
 *             other pencil lines (cut on the next steps), drawn lighter.
 *   angle     saw-bench, tool "miter": the saw is already swung to job.angle degrees; job.count pieces
 *             (the two Sides) get their top end cut one after the other. The banner says "roof angle";
 *             no degree readout is shown.
 *   rip       saw-bench, tool "table": slide the fence to job.fence inches (a readout at the fence shows
 *             the number in project mode), switch on, push the board through; done when the fence is at
 *             job.fence ± 0.25 and the board is through. The strip between fence and blade is the keeper.
 *   hole      drill-press, tool = job.bit ("holesaw" | "twist"): the board shows an X at each of job.holes
 *             (x across the width from the left edge, y along the length from the bottom end, inches);
 *             switch on, pull the handle; a hole must land on each X (big tolerance; after two misses the
 *             board slides itself under the bit). job.d is the hole diameter in inches (for drawing).
 *   assemble  hammer-screws, tool "hammer": job.joins in order; each join = a glue line, then job.nails
 *             nails hammered in; the birdhouse grows with every join. Done after the last join.
 *   sand      wall, tool "orbital": switch on, move the sander over every edge of the finished house.
 *
 * PROGRESS
 * A collection, kept across launches like the 3D Printer shelf (Toybox.fresh() must NOT clear it):
 *   localStorage "workshop-projects-v1" = { <projectId>: { done: ["plane", ...], built: 2 } }
 * Only New on the project page resets `done` (built, the number of finished houses on the shelf, stays).
 * ToyboxProjects.finish(step) also sets sessionStorage "workshop-project-just" = step.id so the project
 * page can celebrate that part when it comes back.
 */
(function () {
  "use strict";

  var KEY = "workshop-projects-v1", JUST = "workshop-project-just";
  var FILES = { wall: "index.html", measuring: "measuring.html", "saw-bench": "saw-bench.html",
    "drill-press": "drill-press.html", "hammer-screws": "hammer-screws.html" };

  // ---------- The birdhouse: one long pine board (a nominal 1x6: 0.75 in thick, 5.5 in wide) ----------
  var BW = 5.5;             // board width, inches
  var STOCK = 60;           // the long board, inches
  var BIRDHOUSE = {
    id: "birdhouse",
    name: "Birdhouse",
    board: { name: "Pine board", thick: 0.75, w: BW, l: STOCK },
    // Parts in the order they are made. w across, l along the grain (inches).
    parts: [
      { id: "back", name: "Back", w: BW, l: 12 },
      { id: "front", name: "Front", w: BW, l: 9 },
      { id: "roof", name: "Roof", w: BW, l: 7.5 },
      { id: "blank", name: "Side blank", w: BW, l: 26, stock: true },
      { id: "strip", name: "Strip", w: 4, l: 26, stock: true },
      { id: "side1", name: "Side", w: 4, l: 10 },
      { id: "side2", name: "Side", w: 4, l: 10 },
      { id: "floor", name: "Floor", w: 4, l: 4 }
    ],
    steps: []
  };

  // job.prior: lines already marked on this board in the same run (inches from its left end), drawn on it.
  function mark(id, part, l, w, target, how, title, coach, done, tool, prior) {
    var tl = tool || (target <= 10 ? "combosquare" : "tape");
    return { id: id, part: part, station: "measuring", tool: tl, title: title, coach: coach, done: done,
      job: { kind: "mark", board: { l: l, w: w }, target: target, mark: how, prior: prior || [] } };
  }
  // job.others: the other pencil lines still on the board (inches from its left end), cut on later steps.
  function cut(id, part, l, w, line, title, coach, done, others) {
    return { id: id, part: part, station: "saw-bench", tool: "miter", title: title, coach: coach, done: done,
      job: { kind: "crosscut", board: { l: l, w: w }, line: line, part: part, others: others || [] } };
  }
  var CUT_COACH = "Slide the line under the blade!";

  // Like a real shop: plane the board, measure and mark every part the miter saw will cut, cut them one after
  // another, rip the strip on the table saw, mark and cut the Sides and the Floor, then the angle, the holes,
  // the build and the sanding. Each mark is measured from the board's end (the banner shows the sum), and
  // steps at the same station run on by themselves (ToyboxProjects.after).
  BIRDHOUSE.steps = [
    { id: "plane", part: "", station: "wall", tool: "planer",
      title: "Plane the board flat", coach: "Feed the board into the planer!",
      done: "The board is flat and smooth.", job: { kind: "plane", board: { l: STOCK, w: BW } } },

    mark("back-mark", "back", STOCK, BW, 12, "line", "Mark the Back: 12 inches", "Pull the tape to 12!", "The Back is marked.", "tape"),
    mark("front-mark", "front", STOCK, BW, 21, "line", "Mark the Front: 12 + 9 = 21", "Pull the tape to 21!", "The Front is marked.", "tape", [12]),
    mark("roof-mark", "roof", STOCK, BW, 28.5, "line", "Mark the Roof: 21 + 7.5 = 28.5", "Pull the tape to 28.5!", "The Roof is marked.", "tape", [12, 21]),
    mark("blank-mark", "blank", STOCK, BW, 54.5, "line", "Mark the Side blank: 28.5 + 26 = 54.5", "Pull the tape to 54.5!", "Every line is marked. Off to the miter saw!", "tape", [12, 21, 28.5]),

    cut("back-cut", "back", STOCK, BW, 12, "Cut the Back on the line", CUT_COACH, "The Back is cut!", [21, 28.5, 54.5]),
    cut("front-cut", "front", 48, BW, 9, "Cut the Front on the line", CUT_COACH, "The Front is cut!", [16.5, 42.5]),
    cut("roof-cut", "roof", 39, BW, 7.5, "Cut the Roof on the line", CUT_COACH, "The Roof is cut!", [33.5]),
    cut("blank-cut", "blank", 31.5, BW, 26, "Cut the Side blank on the line", CUT_COACH, "The Side blank is cut!"),

    { id: "strip-rip", part: "strip", station: "saw-bench", tool: "table",
      title: "Rip the Side blank to 4 inches", coach: "Slide the fence to 4!",
      done: "A long strip, 4 inches wide!", job: { kind: "rip", board: { l: 26, w: BW }, fence: 4, part: "strip" } },

    mark("side1-mark", "side1", 26, 4, 10, "line", "Mark a Side: 10 inches", "Slide the rule out to 10!", "One Side is marked.", "combosquare"),
    mark("side2-mark", "side2", 26, 4, 20, "line", "Mark the other Side: 10 + 10 = 20", "Pull the tape to 20!", "The other Side is marked.", "tape", [10]),
    mark("floor-mark", "floor", 26, 4, 24, "line", "Mark the Floor: 20 + 4 = 24", "Pull the tape to 24!", "Every line is marked. Off to the miter saw!", "tape", [10, 20]),

    cut("side1-cut", "side1", 26, 4, 10, "Cut a Side on the line", CUT_COACH, "One Side is cut!", [20, 24]),
    cut("side2-cut", "side2", 16, 4, 10, "Cut the other Side on the line", CUT_COACH, "Both Sides are cut!", [14]),
    cut("floor-cut", "floor", 6, 4, 4, "Cut the Floor on the line", CUT_COACH, "The Floor is cut!"),

    { id: "side-angle", part: "side1", station: "saw-bench", tool: "miter",
      title: "Cut the roof angle on both Sides", coach: "Slide the Side under the blade!",
      done: "Both Sides have a sloped top.", job: { kind: "angle", board: { l: 10, w: 4 }, angle: 15, count: 2 } },

    mark("hole-mark", "front", 9, BW, 6, "x", "Mark the door: 6 inches up", "Slide the rule out to 6!", "The door is marked.", "combosquare"),

    { id: "hole-drill", part: "front", station: "drill-press", tool: "holesaw",
      title: "Drill the door hole", coach: "Switch on the drill press!",
      done: "The door is drilled!", job: { kind: "hole", board: { l: 9, w: BW }, bit: "holesaw", d: 1.5, holes: [{ x: BW / 2, y: 6 }] } },

    { id: "floor-drill", part: "floor", station: "drill-press", tool: "twist",
      title: "Drill four drain holes in the Floor", coach: "Pull the handle over each X!",
      done: "Rain can drip out now.", job: { kind: "hole", board: { l: 4, w: 4 }, bit: "twist", d: 0.25,
        holes: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }] } },

    { id: "build", part: "", station: "hammer-screws", tool: "hammer",
      title: "Put the birdhouse together", coach: "Squeeze wood glue on the joint!",
      done: "The birdhouse stands!", job: { kind: "assemble", glue: true, nails: 2,
        joins: [["back", "side1"], ["back", "side2"], ["sides", "floor"], ["sides", "front"], ["box", "roof"]] } },

    { id: "sand", part: "", station: "wall", tool: "orbital",
      title: "Sand the edges smooth", coach: "Sand every edge smooth!",
      done: "Smooth all over. The birdhouse is finished!", job: { kind: "sand" } }
  ];

  var PROJECTS = [BIRDHOUSE];
  var BY = {};
  PROJECTS.forEach(function (p) {
    BY[p.id] = p;
    p.stepBy = {};
    p.partBy = {};
    p.steps.forEach(function (s, i) { s.project = p.id; s.index = i; p.stepBy[s.id] = s; });
    p.parts.forEach(function (q) { p.partBy[q.id] = q; });
  });

  // ---------- storage ----------
  function readAll() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && typeof o === "object" ? o : {}; }
    catch (e) { return {}; }
  }
  function writeAll(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* ignore */ } }
  function rec(all, pid) {
    var r = all[pid];
    if (!r || typeof r !== "object") r = all[pid] = { done: [], built: 0 };
    if (!Array.isArray(r.done)) r.done = [];
    if (typeof r.built !== "number") r.built = 0;
    return r;
  }

  function fmt(n) {
    var s = (Math.round(n * 100) / 100).toString();
    return s;
  }

  // Progress of a project: which steps are done, the next step, whether it is finished.
  function progress(pid) {
    var p = BY[pid];
    if (!p) return null;
    var r = rec(readAll(), pid), done = {}, next = null, count = 0, i;
    r.done.forEach(function (id) { if (p.stepBy[id]) done[id] = true; });
    for (i = 0; i < p.steps.length; i++) {
      if (done[p.steps[i].id]) count++;
      else if (!next) next = p.steps[i];
    }
    return { project: p, done: done, count: count, total: p.steps.length, next: next, finished: !next, built: r.built };
  }

  function complete(pid, stepId) {
    var p = BY[pid];
    if (!p || !p.stepBy[stepId]) return;
    var all = readAll(), r = rec(all, pid);
    if (r.done.indexOf(stepId) === -1) r.done.push(stepId);
    var allDone = p.steps.every(function (s) { return r.done.indexOf(s.id) !== -1; });
    if (allDone && !r.finishedAt) { r.built += 1; r.finishedAt = Date.now(); }
    writeAll(all);
  }

  function reset(pid) {
    var all = readAll(), r = rec(all, pid);
    r.done = [];
    delete r.finishedAt;
    writeAll(all);
  }

  function query() {
    var q = {}, s = location.search.replace(/^\?/, "");
    s.split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) { try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* ignore */ } }
    });
    return q;
  }

  // The step this page was opened for (?project=..&step=..), or null when not in project mode.
  function fromQuery() {
    var q = query(), p = BY[q.project];
    if (!p) return null;
    var s = p.stepBy[q.step];
    return s || null;
  }

  function stepUrl(step) {
    return FILES[step.station] + "?project=" + encodeURIComponent(step.project) + "&step=" + encodeURIComponent(step.id) +
      (step.station === "wall" ? "&tool=" + step.tool : "");
  }
  function planUrl(pid) { return "project.html?project=" + encodeURIComponent(pid); }

  var PLACE = { measuring: "measuring bench", "drill-press": "drill press", "hammer-screws": "nail bench",
    planer: "planer", orbital: "sander", miter: "miter saw", table: "table saw" };
  // Where the Done card's one button goes after a step: the next step (at the same station it opens by
  // itself after a few seconds, so he never has to tap through), another station, or the finished birdhouse.
  function after(step) {
    var p = BY[step.project], n = p ? p.steps[step.index + 1] : null;
    if (!n) return { href: planUrl(step.project), label: "See the birdhouse!", auto: false };
    var sameMachine = n.station === step.station && (n.station !== "saw-bench" || n.tool === step.tool);
    if (sameMachine) return { href: stepUrl(n), label: "Next step", auto: true };
    return { href: stepUrl(n), label: "Go to the " + (PLACE[n.tool] || PLACE[n.station]), auto: false };
  }
  // Record the step and point the Done card's button (an <a>) on: its label, its link and, when the next step
  // is at the same station, the move on by itself delayMs after the card shows (default 3 s; results stay
  // on screen a while). A tap on the button goes at once.
  function doneLink(a, step, delayMs) {
    complete(step.project, step.id);
    try { sessionStorage.setItem(JUST, step.id); } catch (e) { /* ignore */ }
    var n = after(step);
    if (!a) return n.href;
    a.setAttribute("href", n.href);
    a.textContent = n.label;
    if (n.auto) {
      setTimeout(function () {
        if (!document.body.contains(a)) return;
        var go = function () { location.href = n.href; };
        if (window.Toybox && Toybox.beforeLeave) Toybox.beforeLeave(go); else go();
      }, delayMs == null ? 3000 : delayMs);
    }
    return n.href;
  }

  // A station calls this when the job is done: records it and returns the "Back to the plan" URL.
  function finish(step) {
    complete(step.project, step.id);
    try { sessionStorage.setItem(JUST, step.id); } catch (e) { /* ignore */ }
    return planUrl(step.project);
  }
  // The project page: which step was just finished (read once).
  function justFinished() {
    var v = null;
    try { v = sessionStorage.getItem(JUST); sessionStorage.removeItem(JUST); } catch (e) { v = null; }
    return v;
  }

  window.ToyboxProjects = {
    list: PROJECTS,
    get: function (id) { return BY[id] || null; },
    progress: progress,
    complete: complete,
    reset: reset,
    fromQuery: fromQuery,
    stepUrl: stepUrl,
    planUrl: planUrl,
    finish: finish,
    after: after,
    doneLink: doneLink,
    justFinished: justFinished,
    fmt: fmt
  };
})();
