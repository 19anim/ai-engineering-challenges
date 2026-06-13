let rows = [],
  sortKey = "submitted_date",
  sortDir = -1;
function csv(t) {
  const [h, ...ls] = t.trim().split(/\r?\n/);
  const heads = h.split(",");
  return ls.map((l) =>
    Object.fromEntries(l.split(",").map((v, i) => [heads[i], v])),
  );
}
function filtered() {
  return rows.filter(
    (r) =>
      (!from.value || r.submitted_date >= from.value) &&
      (!to.value || r.submitted_date <= to.value) &&
      (!type.value || r.claim_type === type.value) &&
      (!status.value || r.status === status.value) &&
      (!insurer.value || r.insurer === insurer.value) &&
      (!country.value || r.country === country.value),
  );
}
function avgDays(d) {
  const vals = d
    .filter((r) => r.processed_date)
    .map(
      (r) =>
        (new Date(r.processed_date) - new Date(r.submitted_date)) / 86400000,
    );
  return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}
function group(d, k) {
  return d.reduce((a, r) => ((a[r[k]] = (a[r[k]] || []).concat(r)), a), {});
}
function draw() {
  const d = filtered();
  const sum = (k) => d.reduce((s, r) => s + Number(r[k] || 0), 0);
  const approved = d.filter((r) => r.status === "APPROVED").length;
  kpis.innerHTML = `<div class="card kpi"><strong>${d.length}</strong>Total claims</div><div class="card kpi"><strong>${d.length ? Math.round((approved / d.length) * 100) : 0}%</strong>Approval rate</div><div class="card kpi"><strong>${avgDays(d)}</strong>Avg processing days</div><div class="card kpi"><strong>${sum("approved_amount").toLocaleString()}</strong>Total approved</div><div class="card kpi"><strong>${Math.round(sum("submitted_amount") / (d.length || 1)).toLocaleString()}</strong>Avg claim</div>`;
  let diag = Object.entries(group(d, "diagnosis_icd10"))
    .map(([k, v]) => [
      k,
      v.length,
      v.reduce((s, r) => s + Number(r.approved_amount), 0),
    ])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  let max = diag[0]?.[1] || 1;
  charts.innerHTML = `<div class="card"><h3>Claims by status</h3>${Object.entries(
    group(d, "status"),
  )
    .map(([k, v]) => `<p>${k}: ${v.length}</p>`)
    .join(
      "",
    )}</div><div class="card"><h3>Top diagnoses by frequency</h3><div class="bars">${diag.map(([k, v]) => `<div title="${v} claims" data-diag="${k}" style="width:${Math.max(8, (v / max) * 100)}%">${k} ${v}</div>`).join("")}</div></div><div class="card"><h3>Top diagnoses by cost</h3>${diag
    .sort((a, b) => b[2] - a[2])
    .map((x) => `<p>${x[0]}: ${x[2].toLocaleString()}</p>`)
    .join(
      "",
    )}</div><div class="card"><h3>Approval rate by insurer</h3>${Object.entries(
    group(d, "insurer"),
  )
    .map(
      ([k, v]) =>
        `<p>${k}: ${Math.round((v.filter((r) => r.status === "APPROVED").length / v.length) * 100)}%</p>`,
    )
    .join("")}</div>`;
  document
    .querySelectorAll("[data-diag]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          table(d.filter((r) => r.diagnosis_icd10 === b.dataset.diag))),
    );
  table(d);
}
function table(d) {
  d = [...d]
    .sort(
      (a, b) => String(a[sortKey]).localeCompare(String(b[sortKey])) * sortDir,
    )
    .slice(0, 50);
  tbl.innerHTML =
    "<tr>" +
    Object.keys(rows[0])
      .map((h) => `<th data-sort="${h}">${h}</th>`)
      .join("") +
    "</tr>" +
    d
      .map(
        (r) =>
          "<tr>" +
          Object.values(r)
            .map((v) => `<td>${v}</td>`)
            .join("") +
          "</tr>",
      )
      .join("");
  document.querySelectorAll("[data-sort]").forEach(
    (th) =>
      (th.onclick = () => {
        sortKey = th.dataset.sort;
        sortDir *= -1;
        draw();
      }),
  );
}
fetch("claims.csv")
  .then((r) => r.text())
  .then((t) => {
    rows = csv(t);
    ["claim_type", "status", "insurer", "country"].forEach((k) => {
      const el = document.getElementById(k === "claim_type" ? "type" : k);
      el.innerHTML =
        '<option value="">All</option>' +
        [...new Set(rows.map((r) => r[k]))]
          .map((v) => `<option>${v}</option>`)
          .join("");
      el.onchange = draw;
    });
    from.onchange = to.onchange = draw;
    draw();
  });
exportBtn.onclick = () => {
  const d = filtered();
  const out = [
    Object.keys(d[0]).join(","),
    ...d.map((r) => Object.values(r).join(",")),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([out]));
  a.download = "filtered_claims.csv";
  a.click();
};
