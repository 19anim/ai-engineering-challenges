// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value) {
  if (value === -1) return "Unlimited";
  return "$" + value.toLocaleString("en-US");
}

function formatDays(value) {
  if (value === -1) return "Unlimited";
  if (value === 0) return "None";
  return value + " days";
}

function formatVisits(value) {
  if (value === -1) return "Unlimited";
  return value + " visits";
}

function formatCopay(value) {
  if (value === 0) return "0% (Free)";
  return value + "%";
}

// For comparison: treat -1 (unlimited) as Infinity
function compareVal(v) {
  return v === -1 ? Infinity : v;
}

// Returns array of indices that have the best (highest) value
function bestHighest(values) {
  const max = Math.max(...values.map(compareVal));
  return values.map((v, i) => compareVal(v) === max);
}

// Returns array of booleans for the best (lowest) value
function bestLowest(values) {
  const min = Math.min(...values);
  return values.map((v) => v === min);
}

// ============================================================
// RECOMMENDED PLAN LOGIC
// Value-for-money: annual_limit / monthly_premium
// Silver = 4285, Gold = 7142, Bronze = 3333
// Silver is recommended as the best balance for most users
// (Gold has highest ratio but is 2x the price of Silver)
// ============================================================
function getRecommendedIndex(plans) {
  // Score: normalize annual_limit/premium, penalize very high premium
  const scores = plans.map((p) => {
    const ratio = p.annual_limit / p.monthly_premium;
    // Diminishing returns on very high premiums
    const affordability = 1 / Math.log(p.monthly_premium + 1);
    return ratio * affordability;
  });
  const maxScore = Math.max(...scores);
  return scores.indexOf(maxScore);
}

// ============================================================
// BUILD COMPARISON TABLE (DESKTOP)
// ============================================================
function buildTable(plans, recommendedIdx) {
  const table = document.createElement("table");
  table.className = "comparison-table";

  const tierClass = ["bronze", "silver", "gold"];
  const tierIcon = ["🥉", "🥈", "🥇"];

  // ── THEAD ──────────────────────────────────────────────────
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Label column header
  const labelTh = document.createElement("th");
  labelTh.className = "label-header-cell";
  labelTh.innerHTML = `<span>Coverage Details</span>`;
  headerRow.appendChild(labelTh);

  plans.forEach((plan, i) => {
    const th = document.createElement("th");
    th.className = `plan-header-cell ${tierClass[i]}`;

    const isRec = i === recommendedIdx;
    th.innerHTML = `
      ${isRec ? `<div class="recommended-badge">⭐ Recommended</div>` : ""}
      <div class="plan-icon ${tierClass[i]}">${tierIcon[i]}</div>
      <div class="plan-name ${tierClass[i]}">${plan.name}</div>
      <div class="plan-price">${formatCurrency(plan.monthly_premium)}<span>/mo</span></div>
      <ul class="plan-highlights">
        ${plan.highlights.map((h) => `<li>${h}</li>`).join("")}
      </ul>
    `;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ── TBODY ──────────────────────────────────────────────────
  const tbody = document.createElement("tbody");

  // Helper to add a section divider
  function addDivider(label) {
    const tr = document.createElement("tr");
    tr.className = "section-divider";
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = label;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  // Helper to add a data row
  function addRow(labelHtml, values, bestFlags) {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.className = "row-label";
    labelTd.innerHTML = labelHtml;
    tr.appendChild(labelTd);

    values.forEach((val, i) => {
      const td = document.createElement("td");
      td.className = "data-cell" + (bestFlags[i] ? " best-value" : "");
      td.innerHTML = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  // ── PRICING ────────────────────────────────────────────────
  addDivider("Pricing");

  // Monthly Premium (lowest is best)
  addRow(
    `<span class="row-category">Cost</span>Monthly Premium`,
    plans.map((p) => formatCurrency(p.monthly_premium)),
    bestLowest(plans.map((p) => p.monthly_premium)),
  );

  // Annual Limit (highest is best)
  addRow(
    `<span class="row-category">Coverage</span>Annual Limit`,
    plans.map((p) => formatCurrency(p.annual_limit)),
    bestHighest(plans.map((p) => p.annual_limit)),
  );

  // Copay (lowest is best)
  addRow(
    `<span class="row-category">Cost Sharing</span>Copay`,
    plans.map((p) => formatCopay(p.copay_percentage)),
    bestLowest(plans.map((p) => p.copay_percentage)),
  );

  // Waiting Period (lowest is best)
  addRow(
    `<span class="row-category">Waiting Period</span>Before Coverage Starts`,
    plans.map((p) => formatDays(p.waiting_period_days)),
    bestLowest(plans.map((p) => p.waiting_period_days)),
  );

  // ── OUTPATIENT ─────────────────────────────────────────────
  addDivider("Outpatient Care");

  addRow(
    `<span class="row-category">Outpatient</span>Limit per Visit`,
    plans.map((p) => formatCurrency(p.benefits.outpatient.limit_per_visit)),
    bestHighest(plans.map((p) => p.benefits.outpatient.limit_per_visit)),
  );

  addRow(
    `<span class="row-category">Outpatient</span>Visits per Year`,
    plans.map((p) => formatVisits(p.benefits.outpatient.visits_per_year)),
    bestHighest(plans.map((p) => p.benefits.outpatient.visits_per_year)),
  );

  // ── INPATIENT ──────────────────────────────────────────────
  addDivider("Inpatient / Hospitalization");

  addRow(
    `<span class="row-category">Inpatient</span>Limit per Day`,
    plans.map((p) => formatCurrency(p.benefits.inpatient.limit_per_day)),
    bestHighest(plans.map((p) => p.benefits.inpatient.limit_per_day)),
  );

  addRow(
    `<span class="row-category">Inpatient</span>Days per Year`,
    plans.map((p) => formatDays(p.benefits.inpatient.days_per_year)),
    bestHighest(plans.map((p) => p.benefits.inpatient.days_per_year)),
  );

  // ── DENTAL ────────────────────────────────────────────────
  addDivider("Dental");

  addRow(
    `<span class="row-category">Dental</span>Annual Dental Limit`,
    plans.map((p) =>
      p.benefits.dental
        ? `<span class="included">${formatCurrency(p.benefits.dental.limit_per_year)}/yr</span>`
        : `<span class="not-included">✕</span><br><span class="not-included-text">Not covered</span>`,
    ),
    plans.map(
      (p) =>
        p.benefits.dental !== null &&
        p.benefits.dental.limit_per_year ===
          Math.max(
            ...plans
              .filter((x) => x.benefits.dental)
              .map((x) => x.benefits.dental.limit_per_year),
          ),
    ),
  );

  // ── MATERNITY ─────────────────────────────────────────────
  addDivider("Maternity");

  addRow(
    `<span class="row-category">Maternity</span>Limit per Pregnancy`,
    plans.map((p) =>
      p.benefits.maternity
        ? `<span class="included">${formatCurrency(p.benefits.maternity.limit_per_pregnancy)}/pregnancy</span>`
        : `<span class="not-included">✕</span><br><span class="not-included-text">Not covered</span>`,
    ),
    plans.map((p) => p.benefits.maternity !== null),
  );

  // ── CTA ROW ───────────────────────────────────────────────
  const ctaRow = document.createElement("tr");
  ctaRow.className = "cta-row";

  const ctaLabel = document.createElement("td");
  ctaLabel.innerHTML = "Ready to enroll?";
  ctaRow.appendChild(ctaLabel);

  plans.forEach((plan, i) => {
    const td = document.createElement("td");
    td.innerHTML = `<button class="btn btn-${tierClass[i]}">Choose ${plan.name}</button>`;
    ctaRow.appendChild(td);
  });

  tbody.appendChild(ctaRow);
  table.appendChild(tbody);

  return table;
}

// ============================================================
// BUILD MOBILE CARDS
// ============================================================
function buildMobileCards(plans, recommendedIdx) {
  const wrapper = document.createElement("div");
  wrapper.className = "mobile-cards";

  const tierClass = ["bronze", "silver", "gold"];
  const tierIcon = ["🥉", "🥈", "🥇"];

  plans.forEach((plan, i) => {
    const card = document.createElement("div");
    card.className = "plan-card";

    const isRec = i === recommendedIdx;

    // Header
    const header = document.createElement("div");
    header.className = `plan-card-header ${tierClass[i]}`;
    header.innerHTML = `
      ${isRec ? `<div class="recommended-badge">⭐ Recommended</div>` : ""}
      <div class="plan-icon ${tierClass[i]}">${tierIcon[i]}</div>
      <div class="plan-name ${tierClass[i]}">${plan.name}</div>
      <div class="plan-price">${formatCurrency(plan.monthly_premium)}<span>/mo</span></div>
      <ul class="plan-highlights">
        ${plan.highlights.map((h) => `<li>${h}</li>`).join("")}
      </ul>
    `;
    card.appendChild(header);

    // Body
    const body = document.createElement("div");
    body.className = "plan-card-body";

    function addCardSection(title) {
      const div = document.createElement("div");
      div.className = "card-section-title";
      div.textContent = title;
      body.appendChild(div);
    }

    function addCardRow(label, value, isBest) {
      const row = document.createElement("div");
      row.className = "card-row" + (isBest ? " best-value-row" : "");
      row.innerHTML = `
        <span class="card-label">${label}</span>
        <span class="card-value${isBest ? " best" : ""}">${value}${isBest ? " ★" : ""}</span>
      `;
      body.appendChild(row);
    }

    // Pricing
    addCardSection("Pricing");
    addCardRow("Monthly Premium", formatCurrency(plan.monthly_premium), false);
    addCardRow(
      "Annual Limit",
      formatCurrency(plan.annual_limit),
      plan.annual_limit === Math.max(...plans.map((p) => p.annual_limit)),
    );
    addCardRow(
      "Copay",
      formatCopay(plan.copay_percentage),
      plan.copay_percentage ===
        Math.min(...plans.map((p) => p.copay_percentage)),
    );
    addCardRow(
      "Waiting Period",
      formatDays(plan.waiting_period_days),
      plan.waiting_period_days ===
        Math.min(...plans.map((p) => p.waiting_period_days)),
    );

    // Outpatient
    addCardSection("Outpatient Care");
    addCardRow(
      "Limit per Visit",
      formatCurrency(plan.benefits.outpatient.limit_per_visit),
      compareVal(plan.benefits.outpatient.limit_per_visit) ===
        Math.max(
          ...plans.map((p) =>
            compareVal(p.benefits.outpatient.limit_per_visit),
          ),
        ),
    );
    addCardRow(
      "Visits per Year",
      formatVisits(plan.benefits.outpatient.visits_per_year),
      compareVal(plan.benefits.outpatient.visits_per_year) ===
        Math.max(
          ...plans.map((p) =>
            compareVal(p.benefits.outpatient.visits_per_year),
          ),
        ),
    );

    // Inpatient
    addCardSection("Inpatient / Hospitalization");
    addCardRow(
      "Limit per Day",
      formatCurrency(plan.benefits.inpatient.limit_per_day),
      compareVal(plan.benefits.inpatient.limit_per_day) ===
        Math.max(
          ...plans.map((p) => compareVal(p.benefits.inpatient.limit_per_day)),
        ),
    );
    addCardRow(
      "Days per Year",
      formatDays(plan.benefits.inpatient.days_per_year),
      compareVal(plan.benefits.inpatient.days_per_year) ===
        Math.max(
          ...plans.map((p) => compareVal(p.benefits.inpatient.days_per_year)),
        ),
    );

    // Dental
    addCardSection("Dental");
    if (plan.benefits.dental) {
      const maxDental = Math.max(
        ...plans
          .filter((p) => p.benefits.dental)
          .map((p) => p.benefits.dental.limit_per_year),
      );
      addCardRow(
        "Annual Dental Limit",
        `<span class="included">${formatCurrency(plan.benefits.dental.limit_per_year)}/yr</span>`,
        plan.benefits.dental.limit_per_year === maxDental,
      );
    } else {
      addCardRow(
        "Annual Dental Limit",
        `<span class="not-included-text">Not covered</span>`,
        false,
      );
    }

    // Maternity
    addCardSection("Maternity");
    if (plan.benefits.maternity) {
      addCardRow(
        "Limit per Pregnancy",
        `<span class="included">${formatCurrency(plan.benefits.maternity.limit_per_pregnancy)}/pregnancy</span>`,
        true,
      );
    } else {
      addCardRow(
        "Limit per Pregnancy",
        `<span class="not-included-text">Not covered</span>`,
        false,
      );
    }

    card.appendChild(body);

    // CTA
    const cta = document.createElement("div");
    cta.className = "card-cta";
    cta.innerHTML = `<button class="btn btn-${tierClass[i]} btn-full">Choose ${plan.name}</button>`;
    card.appendChild(cta);

    wrapper.appendChild(card);
  });

  return wrapper;
}

// ============================================================
// INIT
// ============================================================
(function init() {
  const root = document.getElementById("comparison-root");
  if (!root) return;

  const recommendedIdx = getRecommendedIndex(plans);

  const table = buildTable(plans, recommendedIdx);
  const mobileCards = buildMobileCards(plans, recommendedIdx);

  root.appendChild(table);
  root.appendChild(mobileCards);
})();
