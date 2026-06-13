const fmt = (n, c) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c || "THB",
    maximumFractionDigits: 0,
  }).format(n || 0);
const label = (s) => s.replaceAll("_", " ");
function table(obj) {
  return `<table>${Object.entries(obj)
    .map(
      ([k, v]) =>
        `<tr><th>${label(k)}</th><td>${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}</td></tr>`,
    )
    .join("")}</table>`;
}
function render(p) {
  const c = p.plan.currency,
    total = p.benefits.reduce(
      (s, b) => s + (b.annual_limit || b.lifetime_limit || 0),
      0,
    );
  out.innerHTML = `<section class="hero"><div class="card"><h2>${p.plan.name} ${p.plan.tier}</h2><p>${p.policyholder.name} ? ${p.policy_number}</p><p>${p.plan.effective_date} to ${p.plan.expiry_date}</p></div><div class="card quick"><h3>Quick reference</h3><p><b>${fmt(total, c)}</b> total listed limits</p><p>${p.benefits.length} benefit groups ? ${p.network.hospital_count} network hospitals</p></div></section><h2>Member Count</h2>${table(p.members)}<h2>Benefits</h2>${p.benefits
    .map(
      (b) =>
        `<section class="card ${b.waiting_period_days ? "warn" : ""}"><h3>${b.type}: ${fmt(b.annual_limit || b.lifetime_limit, c)}</h3>${b.waiting_period_days ? `<p>Waiting period: ${b.waiting_period_days} days</p>` : ""}<table>${b.sub_benefits
          .map(
            (s) =>
              `<tr><td>${s.name}</td><td>${Object.entries(s)
                .filter(([k]) => k !== "name")
                .map(
                  ([k, v]) =>
                    `${label(k)}: ${typeof v === "number" ? fmt(v, c) : v}`,
                )
                .join("<br>")}</td></tr>`,
          )
          .join("")}</table></section>`,
    )
    .join(
      "",
    )}<h2>Copay</h2>${table(p.copay)}<h2>Exclusions</h2><ul class="card bad">${p.exclusions.map((e) => `<li>${e}</li>`).join("")}</ul><h2>Network</h2>${table(p.network)}`;
}
function load() {
  fetch(policy.value)
    .then((r) => r.json())
    .then(render);
}
policy.onchange = load;
load();
