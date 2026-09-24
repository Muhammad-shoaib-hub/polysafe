/* ==========================================================================
   POLYSAFE APP LOGIC
   Detect -> Prioritize -> Understand
   (severity display, escapeHtml, and favorites helpers come from shared.js)
   ========================================================================== */

let selectedMeds = []; // array of item name strings, as entered/selected
let DRUG_LIST = [];     // fetched from GET /api/drugs
let CLASS_ALIASES = {}; // fetched from GET /api/drugs
let ITEM_KINDS = {};    // fetched from GET /api/drugs — name -> "medicine"|"condition"|"food"|"drink"|"lab test"
let INTERACTIONS = [];  // fetched from GET /api/interactions (cached for the detail panel)

// ---------- DOM refs ----------
const medInput = document.getElementById("med-input");
const medSuggestions = document.getElementById("med-suggestions");
const medChips = document.getElementById("med-chips");
const analyzeBtn = document.getElementById("analyze-btn");
const resultsSection = document.getElementById("results-section");
const resultsSummary = document.getElementById("results-summary");
const priorityList = document.getElementById("priority-list");
const otherList = document.getElementById("other-list");
const otherToggle = document.getElementById("other-toggle");
const otherCount = document.getElementById("other-count");
const clearSection = document.getElementById("clear-section");
const emptyState = document.getElementById("empty-state");
const panel = document.getElementById("pharmacist-panel");
const panelBackdrop = document.getElementById("panel-backdrop");
const panelClose = document.getElementById("panel-close");
const panelBody = document.getElementById("panel-body");
const miniModal = document.getElementById("mini-modal");
const miniModalBackdrop = document.getElementById("mini-modal-backdrop");
const miniModalClose = document.getElementById("mini-modal-close");
const miniModalBody = document.getElementById("mini-modal-body");

// ---------- init ----------
async function init() {
  bindEvents();
  renderChips();
  try {
    const [drugsRes, interactionsRes] = await Promise.all([
      fetch("/api/drugs").then(r => r.json()),
      fetch("/api/interactions").then(r => r.json()),
    ]);
    DRUG_LIST = drugsRes.drugs;
    CLASS_ALIASES = drugsRes.classAliases;
    ITEM_KINDS = drugsRes.itemKinds || {};
    INTERACTIONS = interactionsRes.interactions;

    populateDatalist();
  } catch (err) {
    console.error("Could not reach the PolySafe API:", err);
    resultsSummary.innerHTML = `<p class="summary-note">Couldn't load the dataset from the server. Make sure "npm start" is running.</p>`;
    resultsSection.removeAttribute("hidden");
    emptyState.setAttribute("hidden", "");
  }
}

function populateDatalist() {
  medSuggestions.innerHTML = DRUG_LIST.map(d => `<option value="${d}"></option>`).join("");
}

function bindEvents() {
  medInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMedicine(medInput.value);
    }
  });
  document.getElementById("add-med-btn").addEventListener("click", () => addMedicine(medInput.value));
  analyzeBtn.addEventListener("click", runAnalysis);
  otherToggle.addEventListener("click", () => {
    const isHidden = otherList.hasAttribute("hidden");
    if (isHidden) otherList.removeAttribute("hidden"); else otherList.setAttribute("hidden", "");
    otherToggle.setAttribute("aria-expanded", String(isHidden));
    otherToggle.querySelector(".chevron").textContent = isHidden ? "▾" : "▸";
  });
  panelClose.addEventListener("click", closePanel);
  panelBackdrop.addEventListener("click", closePanel);
  miniModalClose.addEventListener("click", closeMiniModal);
  miniModalBackdrop.addEventListener("click", closeMiniModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePanel(); closeMiniModal(); }
  });
}

// ---------- medicine chips ----------
function addMedicine(raw) {
  const name = (raw || "").trim();
  if (!name) return;
  const normalized = normalizeDrugName(name);
  if (!normalized) {
    flashInputWarning(`"${name}" isn't in the curated PolySafe list yet.`);
    return;
  }
  if (selectedMeds.some(m => m.toLowerCase() === normalized.toLowerCase())) {
    medInput.value = "";
    return;
  }
  if (selectedMeds.length >= 10) {
    flashInputWarning("PolySafe's prototype supports up to 10 items at once.");
    return;
  }
  selectedMeds.push(normalized);
  medInput.value = "";
  renderChips();
}

function normalizeDrugName(name) {
  const lower = name.trim().toLowerCase();
  const match = DRUG_LIST.find(d => d.toLowerCase() === lower);
  if (match) return match;
  // loose contains-match, e.g. user typed part of a longer name
  const loose = DRUG_LIST.find(d => d.toLowerCase().includes(lower) && lower.length >= 3);
  return loose || null;
}

function flashInputWarning(msg) {
  medInput.setAttribute("placeholder", msg);
  medInput.classList.add("input-warning");
  setTimeout(() => {
    medInput.setAttribute("placeholder", "Search medicine…");
    medInput.classList.remove("input-warning");
  }, 2200);
}

function removeMedicine(name) {
  selectedMeds = selectedMeds.filter(m => m !== name);
  renderChips();
}

function renderChips() {
  medChips.innerHTML = selectedMeds.map(name => {
    const kind = ITEM_KINDS[name] || "medicine";
    const kindTag = kind !== "medicine" ? `<span class="chip-kind">${kind}</span>` : "";
    return `
    <span class="chip">
      ${escapeHtml(name)}${kindTag}
      <button type="button" class="chip-remove" data-name="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)}">×</button>
    </span>
  `;
  }).join("");
  medChips.querySelectorAll(".chip-remove").forEach(btn => {
    btn.addEventListener("click", () => removeMedicine(btn.dataset.name));
  });
  analyzeBtn.disabled = selectedMeds.length < 2;
  analyzeBtn.textContent = selectedMeds.length < 2 ? "Add at least 2 items" : "Analyze";
}

// ---------- analysis (server does the pairing + matching) ----------
async function runAnalysis() {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing…";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicines: selectedMeds }),
    });
    const data = await res.json();

    const priority = data.findings.filter(f => f.record.severity === "critical" || f.record.severity === "major");
    const other = data.findings.filter(f => f.record.severity === "moderate" || f.record.severity === "minor");

    renderResults(priority, other, data.clearPairs, data.totalPairs);
  } catch (err) {
    console.error("Analyze request failed:", err);
    resultsSummary.innerHTML = `<p class="summary-note">The analysis request failed. Check that the server is running and try again.</p>`;
    resultsSection.removeAttribute("hidden");
  } finally {
    analyzeBtn.disabled = selectedMeds.length < 2;
    analyzeBtn.textContent = "Analyze";
  }
}

function renderResults(priority, other, clearPairs, totalPairs) {
  resultsSection.removeAttribute("hidden");
  emptyState.setAttribute("hidden", "");

  const needsAttention = priority.length;
  resultsSummary.innerHTML = `
    <p><strong>${selectedMeds.length} items analyzed</strong> · ${totalPairs} pair${totalPairs === 1 ? "" : "s"} checked</p>
    <p class="summary-highlight">${needsAttention === 0
      ? "No high-priority interactions found in the curated dataset."
      : `${needsAttention} interaction${needsAttention === 1 ? "" : "s"} need${needsAttention === 1 ? "s" : ""} attention.`}</p>
  `;

  priorityList.innerHTML = priority.map(rowTemplate).join("") ||
    `<li class="row row-empty">No Critical or High priority findings.</li>`;

  otherCount.textContent = other.length;
  otherList.innerHTML = other.map(rowTemplate).join("");
  otherList.setAttribute("hidden", "");
  otherToggle.querySelector(".chevron").textContent = "▸";
  otherToggle.setAttribute("aria-expanded", "false");
  otherToggle.style.display = other.length ? "flex" : "none";

  renderClearPairs(clearPairs);
  bindRowEvents();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderClearPairs(clearPairs) {
  if (!clearPairs.length) {
    clearSection.innerHTML = "";
    return;
  }
  clearSection.innerHTML = `
    <h2 class="clear-title">No known interaction found</h2>
    <p class="clear-subtitle">These pairs have no curated record in PolySafe's dataset — that means "not yet reviewed," not a guarantee of safety.</p>
    <div class="clear-grid">
      ${clearPairs.map(p => `
        <div class="clear-card">
          <h3 class="clear-heading">✓ ${escapeHtml(p.drugA)} &nbsp;+&nbsp; ${escapeHtml(p.drugB)}</h3>
          <p class="clear-text">No curated interaction on file between these two.</p>
        </div>
      `).join("")}
    </div>
  `;
}

function rowTemplate({ record, displayA, displayB, classMatch }) {
  const sev = record.severity;
  const contraBadge = record.contraindicated === "conditional"
    ? `<span class="badge badge-conditional">Conditional contraindication</span>`
    : "";
  const aiBadge = record.source === "ai-supplemented"
    ? `<span class="badge badge-ai">AI-supplemented — pending review</span>`
    : "";
  const kindA = ITEM_KINDS[displayA] || "medicine";
  const kindB = ITEM_KINDS[displayB] || "medicine";
  const pairLabel = `${escapeHtml(displayA)}${kindA !== "medicine" ? ` <span class="row-kind">(${kindA})</span>` : ""} + ${escapeHtml(displayB)}${kindB !== "medicine" ? ` <span class="row-kind">(${kindB})</span>` : ""}`;
  const favOn = isFavorite(record.id);

  return `
    <li class="row row-${sev}">
      <span class="row-bar"></span>
      <div class="row-main">
        <div class="row-top">
          <span class="row-pair">${pairLabel}</span>
          <span class="row-top-right">
            <button type="button" class="btn-fav ${favOn ? "is-fav" : ""}" data-id="${record.id}" aria-label="Toggle favorite" title="Save to Favorites">${favOn ? "★" : "☆"}</button>
            <span class="row-severity sev-${sev}">${severityText(sev)}</span>
          </span>
        </div>
        <div class="row-desc">${escapeHtml(record.risk)}</div>
        <div class="row-meta">
          ${contraBadge}
          ${aiBadge}
          ${classMatch ? `<span class="badge badge-class">Class-level record — verify against the specific drug</span>` : ""}
          <span class="row-id">${record.id}</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn-act" data-id="${record.id}">
            <span class="btn-icon">🩺</span> Act Like a Pharmacist
          </button>
          <div class="row-subactions">
            <button type="button" class="btn-sub btn-monitor" data-id="${record.id}" data-kind="monitoring">
              <span class="btn-icon">📋</span> Monitoring
            </button>
            <button type="button" class="btn-sub btn-consider" data-id="${record.id}" data-kind="considerations">
              <span class="btn-icon">🧑‍⚕️</span> Pharmacist Considerations
            </button>
          </div>
        </div>
      </div>
    </li>
  `;
}

function bindRowEvents() {
  document.querySelectorAll(".btn-act[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openPanel(btn.dataset.id));
  });
  document.querySelectorAll(".btn-sub[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openMiniModal(btn.dataset.id, btn.dataset.kind));
  });
  document.querySelectorAll(".btn-fav[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const nowOn = toggleFavorite(btn.dataset.id);
      btn.textContent = nowOn ? "★" : "☆";
      btn.classList.toggle("is-fav", nowOn);
      showToast(nowOn ? "Saved to Favorites" : "Removed from Favorites");
    });
  });
}

// ---------- Act Like a Pharmacist panel (full breakdown) ----------
function openPanel(id) {
  const record = INTERACTIONS.find(r => r.id === id);
  if (!record) return;

  const bullets = (str) => str.split("•").map(s => s.trim()).filter(Boolean).map(s => `<li>${escapeHtml(s)}</li>`).join("");

  panelBody.innerHTML = `
    <div class="panel-header sev-bg-${record.severity}">
      <span class="row-severity sev-${record.severity}">${severityText(record.severity)}</span>
      <h2>${escapeHtml(record.drugA)} + ${escapeHtml(record.drugB)}</h2>
      <p class="panel-type">${escapeHtml(record.type)}</p>
      <p class="panel-id">${record.id}</p>
    </div>

    <section class="panel-block">
      <h3>Contraindication status</h3>
      <p>${record.contraindicated === true ? "Contraindicated." : record.contraindicated === "conditional" ? "Conditionally contraindicated — read the note below." : "Not routinely contraindicated — use with caution and monitoring."}</p>
    </section>

    <section class="panel-block">
      <h3>Risk</h3>
      <p>${escapeHtml(record.risk)}</p>
    </section>

    <section class="panel-block">
      <h3>Mechanism</h3>
      <p>${escapeHtml(record.mechanism)}</p>
    </section>

    <section class="panel-block">
      <h3>Clinical effect</h3>
      <p>${escapeHtml(record.effect)}</p>
    </section>

    <section class="panel-block">
      <h3><span class="btn-icon">📋</span> Monitoring</h3>
      <ul>${bullets(record.monitoring)}</ul>
    </section>

    <section class="panel-block">
      <h3><span class="btn-icon">🧑‍⚕️</span> Pharmacist considerations</h3>
      <ul>${bullets(record.action)}</ul>
    </section>

    ${record.note ? `<section class="panel-block panel-note"><h3>Note</h3><p>${escapeHtml(record.note)}</p></section>` : ""}

    <section class="panel-block">
      <h3>Evidence</h3>
      <p>${escapeHtml(record.evidence)}</p>
    </section>
  `;

  panel.classList.add("open");
  panelBackdrop.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  panel.scrollTop = 0;
  panelClose.focus();
}

function closePanel() {
  panel.classList.remove("open");
  panelBackdrop.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
}

// ---------- standalone Monitoring / Considerations popup ----------
// Independent of the big panel — opens directly to just this one section.
function openMiniModal(id, kind) {
  const record = INTERACTIONS.find(r => r.id === id);
  if (!record) return;

  const isMonitoring = kind === "monitoring";
  const content = isMonitoring ? record.monitoring : record.action;
  const bullets = content.split("•").map(s => s.trim()).filter(Boolean).map(s => `<li>${escapeHtml(s)}</li>`).join("");
  const headingClass = isMonitoring ? "kind-monitor" : "kind-consider";
  const headingIcon = isMonitoring ? "📋" : "🧑‍⚕️";
  const headingText = isMonitoring ? "Monitoring" : "Pharmacist Considerations";

  miniModalBody.innerHTML = `
    <p class="mini-modal-eyebrow">${record.id} · ${severityText(record.severity)}</p>
    <h2 class="mini-modal-pair">${escapeHtml(record.drugA)} + ${escapeHtml(record.drugB)}</h2>
    <span class="mini-modal-heading ${headingClass}">${headingIcon} ${headingText}</span>
    <ul>${bullets}</ul>
  `;

  miniModal.classList.add("open");
  miniModalBackdrop.classList.add("open");
  miniModal.setAttribute("aria-hidden", "false");
  miniModalClose.focus();
}

function closeMiniModal() {
  miniModal.classList.remove("open");
  miniModalBackdrop.classList.remove("open");
  miniModal.setAttribute("aria-hidden", "true");
}

document.addEventListener("DOMContentLoaded", init);
