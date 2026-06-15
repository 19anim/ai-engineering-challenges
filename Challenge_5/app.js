/*
 * Policy Summary Generator — app.js
 *
 * Security note: innerHTML is used intentionally here. All content is
 * derived exclusively from developer-controlled policy JSON files served
 * from the same origin. No user-supplied text is ever injected. If you
 * extend this to accept user input, sanitize it with DOMPurify first.
 */

/* ── helpers ─────────────────────────────────────────── */
const CURRENCY_SYMBOLS = { THB: "฿", VND: "₫", USD: "$", SGD: "S$", MYR: "RM" };

function fmtMoney(n, currency) {
  if (n == null || n === "" || isNaN(n)) return "—";
  const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
  return sym + Number(n).toLocaleString("en-US");
}

function fmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function prettyKey(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function icon(name) {
  const icons = {
    INPATIENT: "🏥", OUTPATIENT: "🩺", DENTAL: "🦷", MATERNITY: "🤱",
    VISION: "👁️", MENTAL_HEALTH: "🧠", LIFE: "❤️", ACCIDENT: "🚑",
  };
  return icons[name] || "💊";
}

/* ── limit label ─────────────────────────────────────── */
function limitLabel(b, currency) {
  if (b.annual_limit)   return fmtMoney(b.annual_limit,   currency) + " / year";
  if (b.lifetime_limit) return fmtMoney(b.lifetime_limit, currency) + " lifetime";
  return "See sub-benefits";
}

/* ── sub-benefit detail rows ─────────────────────────── */
function subBenefitRows(subs, currency) {
  const isMoneyKey = (k) =>
    k.startsWith("limit") || k === "copay_amount" || k === "max_per_visit";
  const isCountKey = (k) =>
    k.includes("days") || k.includes("visits") || k.includes("nights");

  return subs.map(s => {
    const details = Object.entries(s)
      .filter(([k]) => k !== "name")
      .map(([k, v]) => {
        const label = prettyKey(k);
        if (isMoneyKey(k))  return `<span class="detail-chip money">${label}: ${fmtMoney(v, currency)}</span>`;
        if (isCountKey(k))  return `<span class="detail-chip count">${label}: ${v}</span>`;
        return                      `<span class="detail-chip">${label}: ${v}</span>`;
      }).join("");

    return `<tr>
      <td class="sub-name">${s.name}</td>
      <td class="sub-details">${details || "—"}</td>
    </tr>`;
  }).join("");
}

/* ── copay section ───────────────────────────────────── */
function renderCopay(copay, currency) {
  if (!copay || !Object.keys(copay).length) return "<p class='muted'>No copay data.</p>";

  const rows = Object.entries(copay).map(([type, info]) => {
    const pct   = info.percentage != null ? `${info.percentage}%` : null;
    const maxV  = info.max_per_visit != null ? `max ${fmtMoney(info.max_per_visit, currency)} / visit` : null;
    const fixed = info.fixed_amount   != null ? fmtMoney(info.fixed_amount, currency) : null;
    const parts = [pct, fixed, maxV].filter(Boolean).join(" · ");

    const badge = info.percentage === 0
      ? `<span class="badge badge-green">FREE</span>`
      : `<span class="badge badge-amber">${parts || "—"}</span>`;

    return `<tr>
      <td>${icon(type.toUpperCase())} ${prettyKey(type)}</td>
      <td>${badge}</td>
    </tr>`;
  }).join("");

  return `<table class="data-table"><tbody>${rows}</tbody></table>`;
}

/* ── main render ─────────────────────────────────────── */
function render(p) {
  const c = p.plan?.currency || "USD";

  /* quick-ref numbers */
  const totalLimit = p.benefits.reduce((s, b) => s + (b.annual_limit || b.lifetime_limit || 0), 0);
  const benefitCount = p.benefits.length;
  const freeCopay = Object.values(p.copay || {}).filter(v => v.percentage === 0).length;

  /* tier badge colour */
  const tierClass = { Gold: "tier-gold", Silver: "tier-silver", Bronze: "tier-bronze" }[p.plan.tier] || "tier-default";

  /* benefits HTML */
  const benefitsHTML = p.benefits.map(b => {
    const hasWait = !!b.waiting_period_days;
    return `
    <div class="benefit-card ${hasWait ? "benefit-warn" : ""}">
      <div class="benefit-header">
        <span class="benefit-icon">${icon(b.type)}</span>
        <div>
          <div class="benefit-type">${prettyKey(b.type)}</div>
          <div class="benefit-limit">${limitLabel(b, c)}</div>
        </div>
        ${hasWait ? `<span class="wait-badge">⏳ ${b.waiting_period_days}-day waiting period</span>` : ""}
      </div>
      <table class="data-table sub-table">
        <thead><tr><th>Benefit</th><th>Details</th></tr></thead>
        <tbody>${subBenefitRows(b.sub_benefits || [], c)}</tbody>
      </table>
    </div>`;
  }).join("");

  /* network countries */
  const countries = Array.isArray(p.network?.countries)
    ? p.network.countries.map(ct => `<span class="country-tag">${ct}</span>`).join("")
    : "—";

  /* exclusions */
  const exclusions = (p.exclusions || []).map(e => `<li>${e}</li>`).join("");

  /* member rows */
  const memberRows = Object.entries(p.members || {}).map(([k, v]) =>
    `<tr><td>${prettyKey(k)}</td><td class="num">${Number(v).toLocaleString()}</td></tr>`
  ).join("");

  out.innerHTML = `
  <!-- ── HERO ── -->
  <div class="hero-grid">
    <div class="card policy-overview">
      <div class="overview-top">
        <div>
          <div class="plan-name">${p.plan.name}</div>
          <div class="holder-name">${p.policyholder.name}</div>
          <div class="policy-num">${p.policy_number}</div>
        </div>
        <span class="tier-badge ${tierClass}">${p.plan.tier}</span>
      </div>
      <div class="meta-row">
        <div class="meta-item">
          <span class="meta-label">Effective</span>
          <span class="meta-value">${fmtDate(p.plan.effective_date)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Expires</span>
          <span class="meta-value">${fmtDate(p.plan.expiry_date)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Currency</span>
          <span class="meta-value">${c}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Holder Type</span>
          <span class="meta-value">${p.policyholder.type}</span>
        </div>
      </div>
    </div>

    <div class="quick-ref card">
      <div class="qr-title">Quick Reference</div>
      <div class="qr-grid">
        <div class="qr-item">
          <div class="qr-val">${fmtMoney(totalLimit, c)}</div>
          <div class="qr-label">Total Listed Limits</div>
        </div>
        <div class="qr-item">
          <div class="qr-val">${benefitCount}</div>
          <div class="qr-label">Benefit Groups</div>
        </div>
        <div class="qr-item">
          <div class="qr-val">${p.network?.hospital_count?.toLocaleString() || "—"}</div>
          <div class="qr-label">Network Hospitals</div>
        </div>
        <div class="qr-item">
          <div class="qr-val">${freeCopay}</div>
          <div class="qr-label">Zero-Copay Benefits</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── MEMBERS ── -->
  <section class="section">
    <h2 class="section-title">👥 Member Breakdown</h2>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Category</th><th class="num">Count</th></tr></thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>
  </section>

  <!-- ── BENEFITS ── -->
  <section class="section">
    <h2 class="section-title">💼 Benefits</h2>
    ${benefitsHTML}
  </section>

  <!-- ── COPAY ── -->
  <section class="section">
    <h2 class="section-title">💳 Copay Schedule</h2>
    <div class="card">${renderCopay(p.copay, c)}</div>
  </section>

  <!-- ── EXCLUSIONS ── -->
  <section class="section">
    <h2 class="section-title">🚫 Exclusions</h2>
    <div class="card excl-card">
      <p class="excl-note">⚠️ The following are not covered under this policy:</p>
      <ul class="excl-list">${exclusions}</ul>
    </div>
  </section>

  <!-- ── NETWORK ── -->
  <section class="section">
    <h2 class="section-title">🌐 Provider Network</h2>
    <div class="card network-card">
      <div class="net-row">
        <div class="net-item">
          <span class="net-label">Network Type</span>
          <span class="net-val">${prettyKey(p.network?.type || "—")}</span>
        </div>
        <div class="net-item">
          <span class="net-label">Hospitals</span>
          <span class="net-val">${p.network?.hospital_count?.toLocaleString() || "—"}</span>
        </div>
      </div>
      <div class="countries-wrap">
        <span class="net-label">Coverage Countries</span>
        <div class="countries">${countries}</div>
      </div>
    </div>
  </section>
  `;
}

/* ── load ─────────────────────────────────────────────── */
function load() {
  fetch(policy.value)
    .then(r => {
      if (!r.ok) throw new Error("Failed to load policy: " + r.status);
      return r.json();
    })
    .then(render)
    .catch(err => {
      out.innerHTML = `<div class="card error-card">⚠️ ${err.message}</div>`;
    });
}

policy.onchange = load;
load();
