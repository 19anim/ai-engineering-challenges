let terms = [];
let activeLetter = "";
let selectedTerm = "";
let toastTimer;
const $ = (s) => document.querySelector(s);
function esc(s) {
  return s.replace(/[.*+?^${}()|[\\\]\\]/g, "\\$&");
}
function hi(s, q) {
  return q ? s.replace(new RegExp(`(${esc(q)})`, "ig"), "<mark>$1</mark>") : s;
}
function groupBy(xs, k) {
  return xs.reduce((a, x) => ((a[x[k]] ??= []).push(x), a), {});
}
function getVisibleTerms() {
  const q = $("#q").value.toLowerCase();
  return terms.filter((t) => {
    const matchesQuery = (t.name + " " + t.definition).toLowerCase().includes(q);
    const matchesLetter = activeLetter ? t.name.toUpperCase().startsWith(activeLetter) : true;
    return matchesQuery && matchesLetter;
  });
}
function updateFilterBar() {
  const q = $("#q").value.trim();
  const parts = [];
  if (q) parts.push(`search: "${q}"`);
  if (activeLetter) parts.push(`letter: ${activeLetter}`);

  $("#filterBar").hidden = parts.length === 0;
  $("#filterStatus").textContent = parts.length
    ? `Active filters - ${parts.join(", ")}`
    : "";
}
function showNotice(message) {
  let toast = $("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function scrollTermIntoView(name) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`.term[data-name="${CSS.escape(name)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  });
}
function draw() {
  const q = $("#q").value.toLowerCase();
  const filtered = getVisibleTerms();
  updateFilterBar();
  const groups = groupBy(filtered, "category");
  $("#list").innerHTML = Object.entries(groups)
    .map(
      ([c, ts]) =>
        `<details open><summary><strong>${c}</strong> (${ts.length})</summary>${ts.map((t) => `<div class="term${t.name === selectedTerm ? " selected" : ""}" tabindex="0" data-name="${t.name}"><b>${hi(t.name, q)}</b><br>${hi(t.definition, q)}</div>`).join("")}</details>`,
    )
    .join("") || `<div class="empty-state">No terms match the current filters.</div>`;
  document
    .querySelectorAll(".term")
    .forEach((el) => (el.onclick = () => select(el.dataset.name)));
}
function select(name, options = {}) {
  const t = terms.find((x) => x.name === name);
  selectedTerm = name;
  $("#detail").innerHTML =
    `<h2>${t.name}</h2><span class="pill">${t.category}</span><p>${t.definition}</p><h3>Related terms</h3>${t.related.map((r) => `<button data-r="${r}">${r}</button>`).join("")}`;
  document
    .querySelectorAll("[data-r]")
    .forEach((b) => (b.onclick = () => jumpToRelatedTerm(b.dataset.r)));
  draw();
  if (options.scroll) {
    scrollTermIntoView(name);
  }
}
function jumpToRelatedTerm(name) {
  activeLetter = "";
  $("#q").value = "";
  select(name, { scroll: true });
}
function resetFilters() {
  activeLetter = "";
  $("#q").value = "";
  draw();
  showNotice("Filters reset. Showing all glossary terms.");
}
function jumpToLetter(letter) {
  const result = window.GlossaryNavigation.resolveAlphabetJump(terms, letter);

  if (result.status === "empty") {
    showNotice(`No terms found for "${result.letter}".`);
    return;
  }

  activeLetter = result.letter;
  $("#q").value = "";
  select(result.matches[0].name, { scroll: true });

  if (result.status === "multiple") {
    showNotice(`Found ${result.matches.length} terms starting with "${result.letter}".`);
  } else {
    showNotice(`Jumped to ${result.matches[0].name}.`);
  }
}
function init() {
  terms = window.GLOSSARY_TERMS;
  $("#az").innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .map((a) => `<button class="az-link" type="button" data-a="${a}" aria-label="Jump to ${a} terms">${a}</button>`)
    .join("");
  $("#az").onclick = (e) => {
    if (e.target.dataset.a) {
      e.preventDefault();
      jumpToLetter(e.target.dataset.a);
    }
  };
  $("#q").oninput = () => {
    activeLetter = "";
    draw();
  };
  $("#resetFilters").onclick = resetFilters;
  draw();
  select(terms[0].name);
}

init();
