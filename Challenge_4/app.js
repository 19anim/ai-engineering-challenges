let terms = [];
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
function draw() {
  const q = $("#q").value.toLowerCase();
  const filtered = terms.filter((t) =>
    (t.name + " " + t.definition).toLowerCase().includes(q),
  );
  const groups = groupBy(filtered, "category");
  $("#list").innerHTML = Object.entries(groups)
    .map(
      ([c, ts]) =>
        `<details open><summary><strong>${c}</strong> (${ts.length})</summary>${ts.map((t) => `<div class="term" data-name="${t.name}"><b>${hi(t.name, q)}</b><br>${hi(t.definition, q)}</div>`).join("")}</details>`,
    )
    .join("");
  document
    .querySelectorAll(".term")
    .forEach((el) => (el.onclick = () => select(el.dataset.name)));
}
function select(name) {
  const t = terms.find((x) => x.name === name);
  $("#detail").innerHTML =
    `<h2>${t.name}</h2><span class="pill">${t.category}</span><p>${t.definition}</p><h3>Related terms</h3>${t.related.map((r) => `<button data-r="${r}">${r}</button>`).join("")}`;
  document
    .querySelectorAll("[data-r]")
    .forEach((b) => (b.onclick = () => select(b.dataset.r)));
}
function init() {
  terms = window.GLOSSARY_TERMS;
  $("#az").innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .map((a) => `<a href="#" data-a="${a}">${a}</a>`)
    .join("<br>");
  $("#az").onclick = (e) => {
    if (e.target.dataset.a) {
      const t = terms.find((x) => x.name.startsWith(e.target.dataset.a));
      if (t) select(t.name);
    }
  };
  $("#q").oninput = draw;
  draw();
  select(terms[0].name);
}

init();
