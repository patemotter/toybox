/* Workshop projects: the shared plan data for the Project page (project.html) and for the stations'
 * project mode. Plain ES5 script, no modules. Load it after ../common/toybox.js:
 *   <script src="projects.js"></script>
 * It defines window.ToyboxProjects.
 *
 * WHAT A PROJECT IS
 * A list of STEPS (at most 6: the project page shows them as the shared step row). Each step is one short
 * visit to one station, opened with a deep link:
 *   <station file>?project=<projectId>&step=<stepId>        (built by ToyboxProjects.stepUrl(step))
 * The station: reads the step with ToyboxProjects.fromQuery() (null when not in project mode), picks the
 * step's tool, locks the material to the project board described in step.job, shows step.title in a banner
 * at the top of the stage and step.coach in the coach pill, hides unrelated choices, and when the job is
 * done shows "Done! ✓" with step.done and ONE button "Back to the plan" (never automatic) whose href is
 * ToyboxProjects.finish(step) (it records the progress and returns the project page URL).
 *
 * NUMBERS
 * Inches with decimals ("7.5", never "7 ½"); ToyboxProjects.fmt(n) formats them. Numbers are allowed only
 * inside project steps that measure or set a machine (the Numbers rule in AGENTS.md); the stations show
 * nothing else numeric in project mode.
 *
 * STEP SHAPE
 *   { id: "back-cut",                  unique within the project
 *     part: "back",                    a part id from project.parts, or "" (plane, build, sand)
 *     station: "saw-bench",            "wall" (tool-wall.html) | "measuring" | "saw-bench" | "drill-press" | "hammer-screws"
 *     tool: "miter",                   the tool id inside that station (see JOB KINDS)
 *     title: "Cut the Back on the line",   the step banner and the checklist line
 *     coach: "Slide the line under the blade, then pull the saw down!",
 *     done: "The Back is cut!",        the line on the Done! card
 *     job: { kind: ..., board: { l: inches long, w: inches wide }, ... },
 *     name: "Cut", go: "Go cut!",      the project page: the step chip's word and the Go label
 *     plan: "Cut out the parts!",      the project page's coach line for this step
 *     covers: ["back-cut", ...] }      the old (22-step) step ids this visit does; old ids still work as
 *                                      ?step= links (fromQuery returns the visit) and in saved progress
 *
 * JOB KINDS (what each station must do)
 *   plane     wall, tool "planer": switch on, feed job.board through; done when it comes out flat.
 *   mark      measuring, tool "tape": the project board lies with its left end at the tape hook; pull the
 *             tape to job.target (readout in halves, snaps within 0.25); a pencil tick appears at the hook.
 *             job.mark === "line": then the speed square hooks on the edge at the tick and a line is drawn
 *             by dragging along its edge (across the board). job.mark === "x": an X is drawn at the tick,
 *             centred across the width (the entrance hole). Done when the line / X is drawn.
 *   crosscut  saw-bench, tool "miter": job.board with a pencil line job.line inches from its left end;
 *             the board slides left/right under the blade (soft snap when the line is under the blade);
 *             pull the saw down; the cut counts when the line is within the kerf. The piece to the LEFT
 *             of the line is the part (job.part); the rest is the stock that stays.
 *             Optional job.more (the Birdhouse's one cutting visit): the cuts that follow his, in order,
 *             [{ part, line } | { part, rip: inches wide } | { part: "sides", angle }]. A station may play
 *             them by itself after his cut ("the saw cuts each mark in turn"); one that ignores them is
 *             still right, because the plan shows every part cut once the step is finished.
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
 *             Optional job.also = { part, board, bit, d, holes }: a second board drilled in the same visit
 *             (the Floor's drain holes); a station that ignores it is still right (the plan draws them).
 *   assemble  hammer-screws, tool "hammer": job.joins in order; each join = a glue line, then job.nails
 *             nails hammered in; the birdhouse grows with every join. Done after the last join.
 *   sand      wall, tool "orbital": switch on, move the sander over every edge of the finished house.
 *
 * PROGRESS
 * A collection, kept across launches like the 3D Printer shelf (Toybox.fresh() must NOT clear it):
 *   localStorage "workshop-projects-v1" = { <projectId>: { done: ["plane", ...], built: 2, finishedAt } }
 * `done` holds old-style step ids: finishing a visit adds every id in its `covers`, and a visit counts as
 * done when all of them are there (so saves from the 22-step plan still load). Only New on the project
 * page resets `done` (built, the number of finished houses on the shelf, stays).
 * ToyboxProjects.finish(step) also sets sessionStorage "workshop-project-just" = step.id so the project
 * page can celebrate that part when it comes back.
 */
(function () {
  "use strict";

  var KEY = "workshop-projects-v1", JUST = "workshop-project-just";
  var FILES = { wall: "tool-wall.html", measuring: "measuring.html", "saw-bench": "saw-bench.html",
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

  var CUT_COACH = "Slide the line under the blade, then pull the saw down!";

  // Six visits (the dad, 2026-10-09: 22 was far too many). Each step keeps the id of the old step whose job it
  // still is, so the stations' project modes and old links keep working; `covers` lists the old steps it does.
  BIRDHOUSE.steps = [
    { id: "plane", part: "", station: "wall", tool: "planer", name: "Plane", go: "Go plane it!", plan: "Plane the rough board!",
      title: "Plane the board flat", coach: "Switch on the planer, then feed the board!",
      done: "The board is flat and smooth.", job: { kind: "plane", board: { l: STOCK, w: BW } },
      covers: ["plane"] },

    { id: "back-mark", part: "back", station: "measuring", tool: "tape", name: "Measure", go: "Go measure!", plan: "Measure the Back!",
      title: "Measure the Back: 12 inches", coach: "Pull the tape to 12!", done: "The Back is marked.",
      job: { kind: "mark", board: { l: STOCK, w: BW }, target: 12, mark: "line" },
      // the other marks are drawn for him on the plan (and with the square at the saw)
      covers: ["back-mark", "front-mark", "roof-mark", "blank-mark", "side1-mark", "side2-mark", "floor-mark"] },

    { id: "back-cut", part: "back", station: "saw-bench", tool: "miter", name: "Cut", go: "Go cut!", plan: "Cut out the parts!",
      title: "Cut the Back on the line", coach: CUT_COACH, done: "The saw cut all the parts!",
      job: { kind: "crosscut", board: { l: STOCK, w: BW }, line: 12, part: "back",
        // The rest of the visit, for a station that plays it: after his cut, the saw cuts these in turn by
        // itself (inches from the near end of what is left). A station that ignores it is still right: the
        // plan shows every part cut once this step is done.
        more: [{ part: "front", line: 9 }, { part: "roof", line: 7.5 }, { part: "blank", line: 26 },
          { part: "strip", rip: 4 }, { part: "side1", line: 10 }, { part: "side2", line: 10 }, { part: "floor", line: 4 },
          { part: "sides", angle: 15 }] },
      covers: ["back-cut", "front-cut", "roof-cut", "blank-cut", "strip-rip", "side1-cut", "side2-cut", "floor-cut", "side-angle"] },

    { id: "hole-drill", part: "front", station: "drill-press", tool: "holesaw", name: "Drill", go: "Go drill!", plan: "Drill the door hole!",
      title: "Drill the door hole", coach: "Switch on the drill press, then pull the handle!",
      done: "The door is drilled!", job: { kind: "hole", board: { l: 9, w: BW }, bit: "holesaw", d: 1.5, holes: [{ x: BW / 2, y: 6 }],
        // the Floor's drain holes, for a station that drills them in the same visit (else they appear on the plan)
        also: { part: "floor", board: { l: 4, w: 4 }, bit: "twist", d: 0.25,
          holes: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }] } },
      covers: ["hole-mark", "hole-drill", "floor-drill"] },

    { id: "build", part: "", station: "hammer-screws", tool: "hammer", name: "Nail", go: "Go nail it!", plan: "Nail it together!",
      title: "Put the birdhouse together", coach: "Glue, then fasten each piece!",
      done: "The birdhouse stands!", job: { kind: "assemble", glue: true, nails: 2,
        joins: [["back", "side1"], ["back", "side2"], ["sides", "floor"], ["sides", "front"], ["box", "roof"]] },
      covers: ["build"] },

    { id: "sand", part: "", station: "wall", tool: "orbital", name: "Sand", go: "Go sand it!", plan: "Sand it smooth!",
      title: "Sand the edges smooth", coach: "Switch on the sander and rub every edge!",
      done: "Smooth all over. The birdhouse is finished!", job: { kind: "sand" },
      covers: ["sand"] }
  ];

  var PROJECTS = [BIRDHOUSE];
  var BY = {};
  PROJECTS.forEach(function (p) {
    BY[p.id] = p;
    p.stepBy = {};
    p.partBy = {};
    p.alias = {};       // an old step id (from the 22-step plan) -> the visit that does its job now
    p.steps.forEach(function (s, i) {
      s.project = p.id; s.index = i; p.stepBy[s.id] = s;
      (s.covers || [s.id]).forEach(function (old) { p.alias[old] = s; });
    });
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

  // A visit is done when every old step it covers is in the saved list (complete() saves them all), so an old
  // save made halfway through a visit's old steps does that visit again. Visits are done in order: anything
  // after the first one not done counts as not done.
  function isDoneIn(list, s) {
    return (s.covers || [s.id]).every(function (old) { return list.indexOf(old) !== -1; });
  }
  // Progress of a project: which steps are done, the next step, whether it is finished.
  function progress(pid) {
    var p = BY[pid];
    if (!p) return null;
    var r = rec(readAll(), pid), done = {}, next = null, count = 0, i;
    for (i = 0; i < p.steps.length; i++) {
      if (!next && isDoneIn(r.done, p.steps[i])) { done[p.steps[i].id] = true; count++; }
      else if (!next) next = p.steps[i];
    }
    return { project: p, done: done, count: count, total: p.steps.length, next: next, finished: !next, built: r.built };
  }

  function complete(pid, stepId) {
    var p = BY[pid], st = p && p.alias[stepId];
    if (!st) return;
    var all = readAll(), r = rec(all, pid);
    (st.covers || [st.id]).forEach(function (old) { if (r.done.indexOf(old) === -1) r.done.push(old); });
    var allDone = p.steps.every(function (s) { return isDoneIn(r.done, s); });
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
    return p.stepBy[q.step] || p.alias[q.step] || null;    // old links land on the visit that does that job now
  }

  function stepUrl(step) {
    return FILES[step.station] + "?project=" + encodeURIComponent(step.project) + "&step=" + encodeURIComponent(step.id) +
      (step.station === "wall" ? "&tool=" + step.tool : "");
  }
  function planUrl(pid) { return "project.html?project=" + encodeURIComponent(pid); }

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
    justFinished: justFinished,
    fmt: fmt
  };
})();
