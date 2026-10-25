/* Workshop projects: the shared plan data for the Project page (project.html) and for the stations'
 * project mode. Plain script, no modules. Load it after ../common/toybox.js:
 *   <script src="projects.js"></script>
 * It defines window.ToyboxProjects.
 *
 * WHAT A PROJECT IS
 * A short list of VISITS (steps), one per station, each the fun core of that station done hands-on. The plan
 * page (project.html) shows the parts on the bench and one button that opens the next visit with a deep link:
 *   <station file>?project=<projectId>&step=<stepId>        (built by ToyboxProjects.stepUrl(step))
 * The station reads the step with ToyboxProjects.fromQuery() (null when not in project mode), picks the step's
 * tool, locks the material to the project board in step.job, shows step.title (the story line: which part and
 * what it is for) in a banner at the top of the stage and step.coach as the instruction, hides unrelated
 * choices, and when the job is done shows "Done! ✓" with step.done and ONE button, set up by
 * ToyboxProjects.doneLink(button, step): it records the visit and points the button back to the plan, where
 * the new part pops in and the next visit's story is told.
 *
 * NUMBERS
 * Inches with decimals ("7.5", never "7 ½"); ToyboxProjects.fmt(n) formats them. Numbers are allowed only
 * inside project steps that measure or set a machine (the Numbers rule in AGENTS.md).
 *
 * STEP SHAPE
 *   { id: "cut",                       unique within the project
 *     name: "Cut",                     the plan's chip word
 *     go: "Go cut the parts",          the plan's button
 *     station: "saw-bench",            "wall" (index.html) | "measuring" | "saw-bench" | "drill-press" |
 *                                      "sanding" | "hammer-screws"
 *     tool: "miter",                   the tool id inside that station
 *     title: "Cut the parts. ...",     the story line: the station banner and the plan's coach line
 *     coach: "Slide the line under the blade!",   the first instruction, verb first, naming the object
 *     done: "Six parts!",              the line on the Done! card and the plan's toast
 *     job: { kind: ..., ... },
 *     covers: ["back-cut", ...] }      ids from older plans that this visit replaces (old saves, old links)
 *
 * JOB KINDS (what each station does)
 *   plane     wall, tool "planer": switch on, feed job.board through; done when it comes out flat.
 *   mark      measuring, tool "tape": the board lies with its left end at the tape hook; pull the tape to
 *             job.target (readout in halves, snaps within 0.25); a pencil tick appears there, then the square
 *             line across (job.mark "line"). job.prior: lines marked earlier, drawn on the board.
 *   crosscut  saw-bench, tool "miter" (any crosscut saw may be picked): job.board with pencil lines; job.cuts
 *             = [{ part, line, say }] in order, each line in inches from the board's current left end (the
 *             piece left of the line is the part). After each cut the banner says the next part's `say`.
 *             job.line is the first cut's line (kept for code that reads one line).
 *   hole      drill-press, tool = job.bit ("holesaw" | "twist"): an X at each of job.holes (x across from the
 *             left edge, y along from the bottom end, inches); switch on, pull the handle over each X.
 *   sand      sanding (sanding.html): the cut parts lie on the bench with rough edges; rub the sanding block
 *             over every edge (a tap on a part sands it); done when all parts are smooth.
 *   assemble  hammer-screws, tool "hammer": job.joins in order, each { part, onto, say, nails: [...] }: glue
 *             on the join, the part slides into place, then nails through the part into the edge of the other
 *             one, along the join. The house goes together join by join.
 *
 * PROGRESS
 * A collection, kept across launches like the 3D Printer shelf (Toybox.fresh() must NOT clear it):
 *   localStorage "workshop-projects-v1" = { <projectId>: { done: ["plane", ...], built: 2, finishedAt } }
 * `done` may hold ids from older plans (the 22-step plan, the first 6-visit plan): each maps to the visit that
 * does its job now (step.covers), so old saves load and simply land on the nearest visit. Only New on the
 * project page resets `done` (built, the number of finished houses on the shelf, stays).
 * doneLink(step) also sets sessionStorage "workshop-project-just" = step.id so the plan can celebrate that part.
 */
(function () {
  "use strict";

  var KEY = "workshop-projects-v1", JUST = "workshop-project-just";
  var FILES = { wall: "index.html", measuring: "measuring.html", "saw-bench": "saw-bench.html",
    "drill-press": "drill-press.html", sanding: "sanding.html", "hammer-screws": "hammer-screws.html" };

  // ---------- The birdhouse: one long pine board (a nominal 1x6: 0.75 in thick, 5.5 in wide) ----------
  // Every part is a crosscut of the full board width, so there is no rip: the Sides stand outside the Front
  // and the Back, and the Floor (4 long, 5.5 wide) sits between them. The Sides are taller than the Front,
  // so the flat Roof leaves an air gap above the Front; the Back sticks up to hang the house.
  var BW = 5.5, STOCK = 60;
  var BIRDHOUSE = {
    id: "birdhouse",
    name: "Birdhouse",
    board: { name: "Pine board", thick: 0.75, w: BW, l: STOCK },
    // In the order the miter saw cuts them from the left end of the board (w across, l along the grain).
    parts: [
      { id: "back", name: "Back", w: BW, l: 12 },
      { id: "front", name: "Front", w: BW, l: 9 },
      { id: "roof", name: "Roof", w: BW, l: 7.5 },
      { id: "side1", name: "Side", w: BW, l: 10 },
      { id: "side2", name: "Side", w: BW, l: 10 },
      { id: "floor", name: "Floor", w: BW, l: 4 }
    ],
    steps: []
  };

  BIRDHOUSE.steps = [
    { id: "plane", name: "Plane", go: "Go plane the board", station: "wall", tool: "planer",
      title: "Plane the board. A bird needs a smooth new house.",
      coach: "Feed the board into the planer!",
      done: "The board is flat and smooth.",
      job: { kind: "plane", board: { l: STOCK, w: BW } },
      covers: ["plane"] },

    { id: "measure", name: "Measure", go: "Go measure the board", station: "measuring", tool: "tape",
      title: "Measure the Back. Pencil lines show where to cut.",
      coach: "Pull the tape to 12!",
      done: "The lines are on the board.",
      job: { kind: "mark", board: { l: STOCK, w: BW }, target: 12, mark: "line" },
      covers: ["back-mark", "front-mark", "roof-mark", "blank-mark", "side1-mark", "side2-mark", "floor-mark"] },

    { id: "cut", name: "Cut", go: "Go cut the parts", station: "saw-bench", tool: "miter",
      title: "Cut the Back. The Back hangs the house on a tree.",
      coach: "Slide the line under the blade!",
      done: "Six parts for the birdhouse!",
      job: { kind: "crosscut", board: { l: STOCK, w: BW }, line: 12, part: "back",
        cuts: [
          { part: "back", line: 12, say: "Cut the Back. The Back hangs the house on a tree." },
          { part: "front", line: 9, say: "Cut the Front. The Front gets the bird's door." },
          { part: "roof", line: 7.5, say: "Cut the Roof. The Roof keeps the rain off the bird." },
          { part: "side1", line: 10, say: "Cut a Side. The Sides are the walls." },
          { part: "side2", line: 10, say: "Cut the other Side. Now there are two walls." },
          { part: "floor", line: 4, say: "Cut the Floor. The bird makes its nest on the Floor." }
        ] },
      covers: ["back-cut", "front-cut", "roof-cut", "blank-cut", "strip-rip", "side1-cut", "side2-cut", "floor-cut", "side-angle"] },

    { id: "drill", name: "Drill", go: "Go drill the door", station: "drill-press", tool: "holesaw",
      title: "Drill the door. The bird goes in and out through the door.",
      coach: "Switch on the drill press!",
      done: "The Front has a door!",
      job: { kind: "hole", board: { l: 9, w: BW }, bit: "holesaw", d: 1.5, holes: [{ x: BW / 2, y: 6 }] },
      covers: ["hole-mark", "hole-drill", "floor-drill"] },

    { id: "sand", name: "Sand", go: "Go sand the parts", station: "sanding", tool: "sandingblock",
      title: "Sand the parts. Smooth edges keep the bird safe from splinters.",
      coach: "Rub the sanding block on the rough edges!",
      done: "Every part is smooth.",
      job: { kind: "sand" },
      covers: [] },       // the old plan's "sand" (the Tool Wall sander after the build) has this same id

    { id: "nail", name: "Nail", go: "Go nail it together", station: "hammer-screws", tool: "hammer",
      title: "Nail the house together. Glue and nails hold the parts tight.",
      coach: "Tap the glue bottle!",
      done: "The birdhouse is built!",
      job: { kind: "assemble", joins: [
        { part: "side1", onto: "back", say: "Put on a Side. Nail the Side to the Back." },
        { part: "side2", onto: "back", say: "Put on the other Side. Nail it to the Back." },
        { part: "floor", onto: "sides", say: "Put in the Floor. Nail the Side to the Floor." },
        { part: "front", onto: "sides", say: "Put on the Front. Nail the Side to the Front." },
        { part: "roof", onto: "sides", say: "Put on the Roof. Nail the Roof to the Sides." }
      ] },
      covers: ["build"] }
  ];

  var PROJECTS = [BIRDHOUSE];
  var BY = {};
  PROJECTS.forEach(function (p) {
    BY[p.id] = p;
    p.stepBy = {};
    p.partBy = {};
    p.alias = {};       // any step id, old or new -> the visit that does that job now
    p.steps.forEach(function (s, i) {
      s.project = p.id; s.index = i; p.stepBy[s.id] = s; p.alias[s.id] = s;
      s.covers.forEach(function (old) { p.alias[old] = s; });
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
  // The visits a saved list says are done; ids nobody knows any more are skipped.
  function doneSet(p, list) {
    var set = {};
    list.forEach(function (id) { var s = p.alias[id]; if (s) set[s.id] = true; });
    return set;
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }

  // Progress of a project: which visits are done, the next one (the first not done), whether it is finished.
  function progress(pid) {
    var p = BY[pid];
    if (!p) return null;
    var r = rec(readAll(), pid), done = doneSet(p, r.done), next = null, count = 0;
    p.steps.forEach(function (s) { if (done[s.id]) count++; else if (!next) next = s; });
    return { project: p, done: done, count: count, total: p.steps.length, next: next, finished: !next, built: r.built };
  }

  function complete(pid, stepId) {
    var p = BY[pid], st = p && p.alias[stepId];
    if (!st) return;
    var all = readAll(), r = rec(all, pid);
    if (r.done.indexOf(st.id) === -1) r.done.push(st.id);
    var set = doneSet(p, r.done);
    if (p.steps.every(function (s) { return set[s.id]; }) && !r.finishedAt) { r.built += 1; r.finishedAt = Date.now(); }
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

  // The visit this page was opened for (?project=..&step=..), or null when not in project mode. Old step ids
  // land on the visit that does their job now.
  function fromQuery() {
    var q = query(), p = BY[q.project];
    return p ? (p.alias[q.step] || null) : null;
  }

  function stepUrl(step) {
    return FILES[step.station] + "?project=" + encodeURIComponent(step.project) + "&step=" + encodeURIComponent(step.id) +
      (step.station === "wall" ? "&tool=" + step.tool : "");
  }
  function planUrl(pid) { return "project.html?project=" + encodeURIComponent(pid); }

  // A station calls this when its visit is done: records it and points the Done card's one button (an <a>)
  // back to the plan, which shows the new part and tells the next visit's story. Returns the plan URL.
  function doneLink(a, step) {
    complete(step.project, step.id);
    try { sessionStorage.setItem(JUST, step.id); } catch (e) { /* ignore */ }
    var href = planUrl(step.project);
    if (a) { a.setAttribute("href", href); a.textContent = "Back to the plan"; }
    return href;
  }
  // The project page: which visit was just finished (read once).
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
    doneLink: doneLink,
    justFinished: justFinished,
    fmt: fmt
  };
})();
