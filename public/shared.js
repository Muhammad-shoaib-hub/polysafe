/* ==========================================================================
   POLYSAFE — shared helpers (severity display, favorites & custom entries)
   Loaded before app.js / favorites.js on any page that needs them.

   IMPORTANT SCOPE NOTE: Favorites and custom interactions are stored in this
   browser's localStorage only. There are no real user accounts yet (the
   Login/Sign Up button is a preview), so "for himself only" currently means
   "on this browser/device only" — not synced across devices. When real
   accounts are added later, this is the code to swap for a server-backed
   per-user store.
   ========================================================================== */

const SEVERITY_RANK = { critical: 4, major: 3, moderate: 2, minor: 1 };
const SEVERITY_META = {
  critical: { code: "C1", label: "Contraindicated", icon: "🚫" },
  major:    { code: "C2", label: "Major",           icon: "🔴" },
  moderate: { code: "C3", label: "Moderate",        icon: "🟠" },
  minor:    { code: "C4", label: "Mild",            icon: "🟡" },
};
function severityText(sev) {
  const m = SEVERITY_META[sev] || SEVERITY_META.moderate;
  return `${m.icon} ${m.label} (${m.code})`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------- favorites (star an existing curated/AI-supplemented interaction) ---------- */
const FAVORITES_KEY = "polysafe_favorites_v1";

function getFavoriteIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function isFavorite(id) {
  return getFavoriteIds().includes(id);
}
function toggleFavorite(id) {
  const ids = getFavoriteIds();
  const idx = ids.indexOf(id);
  if (idx === -1) ids.push(id); else ids.splice(idx, 1);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  return ids.includes(id);
}

/* ---------- custom interactions (the user's own added entries) ---------- */
const CUSTOM_KEY = "polysafe_custom_v1";

function getCustomInteractions() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveCustomInteractions(list) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}
function addCustomInteraction({ drugA, drugB, severity, risk, note }) {
  const list = getCustomInteractions();
  const record = {
    id: `custom-${Date.now()}`,
    drugA, drugB,
    type: "Custom entry (added by you)",
    severity,
    contraindicated: severity === "critical",
    direction: "Not specified",
    risk: risk || "No details provided.",
    mechanism: "Not provided — this is a custom entry you added yourself, not part of the curated dataset.",
    effect: "Not provided.",
    monitoring: "Not provided — edit this entry's notes above with your own monitoring plan if useful.",
    action: "Not provided.",
    evidence: "None — self-added entry, not reviewed.",
    note: note || null,
    kind: "drug-drug",
    source: "custom",
  };
  list.push(record);
  saveCustomInteractions(list);
  return record;
}
function deleteCustomInteraction(id) {
  saveCustomInteractions(getCustomInteractions().filter(r => r.id !== id));
}
