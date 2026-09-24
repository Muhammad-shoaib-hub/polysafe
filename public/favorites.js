/* ==========================================================================
   POLYSAFE — Favorites page logic
   Loads curated interactions (for star-matching), merges in the user's own
   custom entries, and renders both with full panel/popup support reused
   from the same interaction model as the Home page checker.
   ========================================================================== */

let ALL_INTERACTIONS = []; // curated + AI-supplemented, fetched once
let ITEM_KINDS = {};

const favoritesList = document.getElementById("favorites-list");
const emptyFavorites = document.getElementById("empty-favorites");
const customForm = document.getElementById("custom-form");

const panel = document.getElementById("pharmacist-panel");
const panelBackdrop = document.getElementById("panel-backdrop");
const panelClose = document.getElementById("panel-close");
const panelBody = document.getElementById("panel-body");
const miniModal = document.getElementById("mini-modal");
const miniModalBackdrop = document.getElementById("mini-modal-backdrop");
const miniModalClose = document.getElementById("mini-modal-close");
const miniModalBody = document.getElementById("mini-modal-body");

async function init() {
  panelClose.addEventListener("click", closePanel);
  panelBackdrop.addEventListener("click", closePanel);
  miniModalClose.addEventListener("click", closeMiniModal);
  miniModalBackdrop.addEventListener("click", closeMiniModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePanel(); closeMiniModal(); }
  });
  customForm.addEventListener("submit", handleCustomSubmit);

  try {
    const [drugsRes, interactionsRes] = await Promise.all([
      fetch("/api/drugs").then(r => r.json()),
      fetch("/api/interactions").then(r => r.json()),
    ]);
    ITEM_KINDS = drugsRes.itemKinds || {};
    ALL_INTERACTIONS = interactionsRes.interactions;
  } catch (err) {
    console.error("Could not reach the PolySafe API:", err);
  }

  render();
}

function render() {
  const favIds = getFavoriteIds();
  const favorited = ALL_INTERACTIONS.filter(r => favIds.includes(r.id));
  const custom = getCustomInteractions();
  const all = [...favorited, ...custom];

  if (all.length === 0) {
    favoritesList.innerHTML = "";
    emptyFavorites.removeAttribute("hidden");
    return;
  }
  emptyFavorites.setAttribute("hidden", "");

  all.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  favoritesList.innerHTML = `<ul class="priority-list">${all.map(cardTemplate).join("")}</ul>`;
  bindCardEvents();
}

function cardTemplate(record) {
  const sev = record.severity;
  const isCustom = record.source === "custom";
  const kindA = ITEM_KINDS[record.drugA] || "medicine";
  const kindB = ITEM_KINDS[record.drugB] || "medicine";
  const pairLabel = `${escapeHtml(record.drugA)}${kindA !== "medicine" ? ` <span class="row-kind">(${kindA})</span>` : ""} + ${escapeHtml(record.drugB)}${kindB !== "medicine" ? ` <span class="row-kind">(${kindB})</span>` : ""}`;

  return `
    <li class="row row-${sev}">
      <span class="row-bar"></span>
      <div class="row-main">
        <div class="row-top">
          <span class="row-pair">${pairLabel}</span>
          <span class="row-top-right">
            ${isCustom
              ? `<span class="badge badge-custom">Your entry</span>`
              : `<button type="button" class="btn-fav is-fav" data-id="${record.id}" aria-label="Remove from favorites" title="Remove from Favorites">★</button>`}
            <span class="row-severity sev-${sev}">${severityText(sev)}</span>
          </span>
        </div>
        <div class="row-desc">${escapeHtml(record.risk)}</div>
        <div class="row-meta">
          <span class="row-id">${record.id}</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn-act" data-id="${record.id}" data-custom="${isCustom}">
            <span class="btn-icon">🩺</span> Act Like a Pharmacist
          </button>
          <div class="row-subactions">
            <button type="button" class="btn-sub btn-monitor" data-id="${record.id}" data-kind="monitoring" data-custom="${isCustom}">
              <span class="btn-icon">📋</span> Monitoring
            </button>
            <button type="button" class="btn-sub btn-consider" data-id="${record.id}" data-kind="considerations" data-custom="${isCustom}">
              <span class="btn-icon">🧑‍⚕️</span> Pharmacist Considerations
            </button>
            ${isCustom ? `<button type="button" class="btn-sub btn-delete" data-id="${record.id}"><span class="btn-icon">🗑️</span> Delete</button>` : ""}
          </div>
        </div>
      </div>
    </li>
  `;
}

function bindCardEvents() {
  document.querySelectorAll(".btn-fav[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleFavorite(btn.dataset.id);
      showToast("Removed from Favorites");
      render();
    });
  });
  document.querySelectorAll(".btn-act[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openPanel(btn.dataset.id, btn.dataset.custom === "true"));
  });
  document.querySelectorAll(".btn-sub.btn-monitor[data-id], .btn-sub.btn-consider[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openMiniModal(btn.dataset.id, btn.dataset.kind, btn.dataset.custom === "true"));
  });
  document.querySelectorAll(".btn-delete[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteCustomInteraction(btn.dataset.id);
      showToast("Deleted");
      render();
    });
  });
}

function findRecord(id, isCustom) {
  if (isCustom) return getCustomInteractions().find(r => r.id === id);
  return ALL_INTERACTIONS.find(r => r.id === id);
}

// ---------- Act Like a Pharmacist panel ----------
function openPanel(id, isCustom) {
  const record = findRecord(id, isCustom);
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
    <section class="panel-block"><h3>Risk</h3><p>${escapeHtml(record.risk)}</p></section>
    <section class="panel-block"><h3>Mechanism</h3><p>${escapeHtml(record.mechanism)}</p></section>
    <section class="panel-block"><h3>Clinical effect</h3><p>${escapeHtml(record.effect)}</p></section>
    <section class="panel-block"><h3><span class="btn-icon">📋</span> Monitoring</h3><ul>${bullets(record.monitoring)}</ul></section>
    <section class="panel-block"><h3><span class="btn-icon">🧑‍⚕️</span> Pharmacist considerations</h3><ul>${bullets(record.action)}</ul></section>
    ${record.note ? `<section class="panel-block panel-note"><h3>Note</h3><p>${escapeHtml(record.note)}</p></section>` : ""}
    <section class="panel-block"><h3>Evidence</h3><p>${escapeHtml(record.evidence)}</p></section>
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
function openMiniModal(id, kind, isCustom) {
  const record = findRecord(id, isCustom);
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

// ---------- add-your-own form ----------
function handleCustomSubmit(e) {
  e.preventDefault();
  const drugA = document.getElementById("custom-drugA").value.trim();
  const drugB = document.getElementById("custom-drugB").value.trim();
  const severity = document.getElementById("custom-severity").value;
  const risk = document.getElementById("custom-risk").value.trim();
  if (!drugA || !drugB) return;

  addCustomInteraction({ drugA, drugB, severity, risk });
  customForm.reset();
  showToast("Added to your list");
  render();
}

document.addEventListener("DOMContentLoaded", init);
