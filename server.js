/* ==========================================================================
   POLYSAFE — Express server
   Serves the static site from /public and exposes the curated dataset
   through a small JSON API. data.js is the single source of truth —
   the frontend no longer has the data baked in, it fetches it here.
   ========================================================================== */

const express = require("express");
const path = require("path");
const { INTERACTIONS, DRUG_LIST, CLASS_ALIASES, ITEM_KINDS } = require("./data.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve index.html, styles.css, app.js from /public
app.use(express.static(path.join(__dirname, "public")));

// GET /api/drugs -> the medicine/condition/food/drink/lab list for the search box
app.get("/api/drugs", (req, res) => {
  res.json({ drugs: DRUG_LIST, classAliases: CLASS_ALIASES, itemKinds: ITEM_KINDS });
});

// GET /api/interactions -> the full curated dataset
app.get("/api/interactions", (req, res) => {
  res.json({ interactions: INTERACTIONS });
});

// GET /api/interactions/:id -> a single record (used by the pharmacist panel)
app.get("/api/interactions/:id", (req, res) => {
  const record = INTERACTIONS.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "No record with that ID." });
  res.json(record);
});

// POST /api/analyze  { medicines: ["Warfarin", "Amiodarone", ...] }
// Does the pairing + matching server-side, so the frontend can stay thin.
app.use(express.json());
app.post("/api/analyze", (req, res) => {
  const meds = Array.isArray(req.body.medicines) ? req.body.medicines : [];
  const pairs = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) pairs.push([meds[i], meds[j]]);
  }

  const findings = [];
  const clearPairs = []; // pairs with NO curated interaction on file

  pairs.forEach(([a, b]) => {
    const hit = findInteraction(a, b);
    if (hit) findings.push(hit); else clearPairs.push({ drugA: a, drugB: b });
  });

  const rank = { critical: 4, major: 3, moderate: 2, minor: 1 };
  findings.sort((x, y) => rank[y.record.severity] - rank[x.record.severity]);

  res.json({ totalPairs: pairs.length, findings, clearPairs });
});

function findInteraction(drugA, drugB) {
  const a = drugA.toLowerCase();
  const b = drugB.toLowerCase();

  let record = INTERACTIONS.find(r =>
    (r.drugA.toLowerCase() === a && r.drugB.toLowerCase() === b) ||
    (r.drugA.toLowerCase() === b && r.drugB.toLowerCase() === a)
  );
  if (record) return { record, displayA: drugA, displayB: drugB, classMatch: false };

  const classNameA = CLASS_ALIASES[a];
  const classNameB = CLASS_ALIASES[b];
  if (classNameA) {
    record = INTERACTIONS.find(r => r.drugB === classNameA || r.drugA === classNameA);
    if (record) return { record, displayA: drugB, displayB: drugA, classMatch: true };
  }
  if (classNameB) {
    record = INTERACTIONS.find(r => r.drugB === classNameB || r.drugA === classNameB);
    if (record) return { record, displayA: drugA, displayB: drugB, classMatch: true };
  }
  return null;
}

app.listen(PORT, () => {
  console.log(`PolySafe running at http://localhost:${PORT}`);
});
