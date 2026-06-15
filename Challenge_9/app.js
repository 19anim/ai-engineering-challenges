/*
 * Claims Analytics Dashboard — app.js
 *
 * Performance: CSV is parsed once; all aggregations run on the in-memory
 * array; Chart.js instances are updated (not recreated) on filter changes.
 * Target: first meaningful paint + interactive < 3 s on a typical connection.
 *
 * Security: all user-visible strings come from the developer-controlled CSV
 * column values (no free-text HTML input). Values are set via textContent /
 * DOM properties rather than innerHTML where possible; the few innerHTML
 * usages are on developer-controlled constant strings or escaped values.
 */

/* ── Palette ───────────────────────────────────────────── */
const COLORS = {
  APPROVED:  '#16a34a',
  REJECTED:  '#dc2626',
  IN_REVIEW: '#d97706',
  PENDING:   '#64748b',
};
const CHART_PALETTE = ['#0891b2','#7c3aed','#16a34a','#d97706','#dc2626',
                       '#0369a1','#6d28d9','#15803d','#b45309','#b91c1c'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── State ─────────────────────────────────────────────── */
let ALL = [];              // parsed rows (immutable after load)
let diagFilter = null;     // active ICD-10 drill-down filter
let sortKey = 'submitted_date';
let sortDir = -1;
let page = 1;
const PAGE_SIZE = 50;

/* Chart instances — kept so we can call .update() instead of recreating */
const charts = {};

/* ── Fast CSV parser ──────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  const result = new Array(lines.length - 1);
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = vals[j] || '';
    // Pre-cast numerics for speed
    row._sub  = +row.submitted_amount  || 0;
    row._appr = +row.approved_amount   || 0;
    row._days = row.processed_date
      ? Math.round((new Date(row.processed_date) - new Date(row.submitted_date)) / 86400000)
      : null;
    row._month = row.submitted_date ? +row.submitted_date.slice(5, 7) : 0; // 1-12
    result[i - 1] = row;
  }
  return result;
}

/* ── Filter logic ─────────────────────────────────────── */
function filtered() {
  const fFrom   = document.getElementById('from').value;
  const fTo     = document.getElementById('to').value;
  const fType   = document.getElementById('type').value;
  const fStatus = document.getElementById('status').value;
  const fIns    = document.getElementById('insurer').value;
  const fCtry   = document.getElementById('country').value;

  return ALL.filter(r =>
    (!fFrom   || r.submitted_date >= fFrom) &&
    (!fTo     || r.submitted_date <= fTo)   &&
    (!fType   || r.claim_type === fType)    &&
    (!fStatus || r.status === fStatus)      &&   // exact match — no trim needed (CSV has no spaces)
    (!fIns    || r.insurer === fIns)        &&
    (!fCtry   || r.country === fCtry)       &&
    (!diagFilter || r.diagnosis_icd10 === diagFilter)
  );
}

/* ── Aggregation helpers ──────────────────────────────── */
function groupBy(data, key) {
  const map = {};
  for (const r of data) {
    const k = r[key];
    if (!map[k]) map[k] = [];
    map[k].push(r);
  }
  return map;
}

function topDiag(data, n, sortFn) {
  const g = groupBy(data, 'diagnosis_icd10');
  return Object.entries(g)
    .map(([code, rows]) => ({
      code,
      count: rows.length,
      cost:  rows.reduce((s, r) => s + r._appr, 0),
    }))
    .sort(sortFn)
    .slice(0, n);
}

/* ── KPI render ───────────────────────────────────────── */
function renderKPIs(data) {
  const approved = data.filter(r => r.status === 'APPROVED');
  const approvalRate = data.length ? ((approved.length / data.length) * 100).toFixed(1) : '0.0';
  const totalApproved = approved.reduce((s, r) => s + r._appr, 0);
  const avgClaim = data.length ? Math.round(data.reduce((s, r) => s + r._sub, 0) / data.length) : 0;
  const daysVals = data.filter(r => r._days !== null).map(r => r._days);
  const avgDays = daysVals.length ? (daysVals.reduce((a, b) => a + b, 0) / daysVals.length).toFixed(1) : '—';

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = `
    <div class="kpi-card kpi-teal">
      <div class="kpi-label">Total Claims</div>
      <div class="kpi-value">${data.length.toLocaleString()}</div>
      <div class="kpi-sub">in filtered view</div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-label">Approval Rate</div>
      <div class="kpi-value">${approvalRate}%</div>
      <div class="kpi-sub">${approved.length.toLocaleString()} approved</div>
    </div>
    <div class="kpi-card kpi-amber">
      <div class="kpi-label">Avg Processing</div>
      <div class="kpi-value">${avgDays}</div>
      <div class="kpi-sub">days to process</div>
    </div>
    <div class="kpi-card kpi-purple">
      <div class="kpi-label">Total Approved</div>
      <div class="kpi-value">${totalApproved.toLocaleString()}</div>
      <div class="kpi-sub">approved amount</div>
    </div>
    <div class="kpi-card kpi-red">
      <div class="kpi-label">Avg Claim</div>
      <div class="kpi-value">${avgClaim.toLocaleString()}</div>
      <div class="kpi-sub">submitted amount</div>
    </div>`;
}

/* ── Chart helpers ────────────────────────────────────── */
function upsertChart(id, type, data, options) {
  const canvas = document.getElementById(id);
  if (charts[id]) {
    charts[id].data = data;
    Object.assign(charts[id].options, options);
    charts[id].update('none'); // skip animation on update for speed
  } else {
    charts[id] = new Chart(canvas, { type, data, options });
  }
}

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
};

/* ── Chart: Claims by Status (Doughnut) ───────────────── */
function renderStatusChart(data) {
  const g = groupBy(data, 'status');
  const labels  = Object.keys(g);
  const counts  = labels.map(k => g[k].length);
  const bgColors = labels.map(k => COLORS[k] || '#94a3b8');

  document.getElementById('statusTotal').textContent =
    labels.map(k => `${k}: ${g[k].length}`).join(' · ');

  upsertChart('chartStatus', 'doughnut', {
    labels,
    datasets: [{ data: counts, backgroundColor: bgColors, borderWidth: 2, borderColor: '#fff' }],
  }, {
    ...BASE_OPTS,
    plugins: {
      legend: { display: true, position: 'right',
        labels: { font: { size: 11, family: 'DM Sans' }, boxWidth: 12, padding: 8 },
      },
      tooltip: { callbacks: {
        label: ctx => ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${((ctx.raw/data.length)*100).toFixed(1)}%)`
      }},
    },
    cutout: '65%',
  });
}

/* ── Chart: Claims Over Time (Line) ───────────────────── */
function renderTimeChart(data) {
  // Bucket by month
  const monthly = Array(12).fill(0);
  for (const r of data) if (r._month) monthly[r._month - 1]++;

  upsertChart('chartTime', 'line', {
    labels: MONTHS,
    datasets: [{
      label: 'Claims',
      data: monthly,
      borderColor: '#0891b2',
      backgroundColor: 'rgba(8,145,178,.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointBackgroundColor: '#0891b2',
    }],
  }, {
    ...BASE_OPTS,
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { title: ctx => MONTHS[ctx[0].dataIndex] } },
    },
  });
}

/* ── Chart: Top 10 Diagnoses by Frequency (Horizontal Bar) */
function renderDiagFreqChart(data) {
  const top = topDiag(data, 10, (a, b) => b.count - a.count);
  const labels = top.map(d => d.code);
  const counts = top.map(d => d.count);

  upsertChart('chartDiagFreq', 'bar', {
    labels,
    datasets: [{
      label: 'Claims',
      data: counts,
      backgroundColor: CHART_PALETTE.slice(0, 10),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }, {
    ...BASE_OPTS,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: '#f1f5f9' } },
      y: { ticks: { font: { size: 11, family: 'DM Sans' } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        label: ctx => ` ${ctx.raw.toLocaleString()} claims`,
        afterLabel: ctx => {
          const code = labels[ctx.dataIndex];
          const pct = data.length ? ((ctx.raw / data.length) * 100).toFixed(1) : 0;
          return ` ${pct}% of total`;
        },
      }},
    },
    onClick: (_e, elements) => {
      if (!elements.length) return;
      const code = labels[elements[0].index];
      diagFilter = diagFilter === code ? null : code;
      updateDiagFilterUI();
      page = 1;
      renderTable(filtered());
    },
  });
}

/* ── Chart: Top 10 Diagnoses by Cost (Horizontal Bar) ──── */
function renderDiagCostChart(data) {
  const top = topDiag(data, 10, (a, b) => b.cost - a.cost);
  const labels = top.map(d => d.code);
  const costs  = top.map(d => d.cost);

  upsertChart('chartDiagCost', 'bar', {
    labels,
    datasets: [{
      label: 'Approved Amount',
      data: costs,
      backgroundColor: CHART_PALETTE.map(c => c + 'cc'),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }, {
    ...BASE_OPTS,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
          callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M'
                       : v >= 1_000 ? (v/1_000).toFixed(0)+'K'
                       : v,
        },
        grid: { color: '#f1f5f9' },
      },
      y: { ticks: { font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        label: ctx => ` Approved: ${ctx.raw.toLocaleString()}`,
      }},
    },
  });
}

/* ── Chart: Approval Rate by Insurer (Bar) ─────────────── */
function renderApprovalChart(data) {
  const g = groupBy(data, 'insurer');
  const labels = Object.keys(g).sort();
  const rates  = labels.map(k => {
    const rows = g[k];
    const appr = rows.filter(r => r.status === 'APPROVED').length;
    return +((appr / rows.length) * 100).toFixed(1);
  });
  const counts = labels.map(k => g[k].length);

  upsertChart('chartApproval', 'bar', {
    labels,
    datasets: [{
      label: 'Approval rate (%)',
      data: rates,
      backgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      borderRadius: 6,
      borderSkipped: false,
    }],
  }, {
    ...BASE_OPTS,
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { font: { size: 11 }, callback: v => v + '%' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        label: ctx => ` Approval: ${ctx.raw}%`,
        afterLabel: ctx => ` (${counts[ctx.dataIndex].toLocaleString()} claims)`,
      }},
    },
  });
}

/* ── Chart: Processing Time Histogram (Bar) ────────────── */
function renderHistChart(data) {
  const daysArr = data.filter(r => r._days !== null && r._days >= 0).map(r => r._days);
  // Buckets: 0, 1, 2, 3, 4, 5, 6-10, 11-20, 21+
  const buckets = [0,0,0,0,0,0,0,0,0];
  const labels  = ['0','1','2','3','4','5','6–10','11–20','21+'];
  for (const d of daysArr) {
    if      (d <= 5)  buckets[d]++;
    else if (d <= 10) buckets[6]++;
    else if (d <= 20) buckets[7]++;
    else              buckets[8]++;
  }

  upsertChart('chartHist', 'bar', {
    labels,
    datasets: [{
      label: 'Claims',
      data: buckets,
      backgroundColor: '#0891b2',
      borderRadius: 4,
      borderSkipped: false,
    }],
  }, {
    ...BASE_OPTS,
    scales: {
      x: { ticks: { font: { size: 11 } }, grid: { display: false },
           title: { display: true, text: 'Days', font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toLocaleString()} claims` } },
    },
  });
}

/* ── Diagnosis filter UI ──────────────────────────────── */
function updateDiagFilterUI() {
  const btn = document.getElementById('clearDiagFilter');
  if (diagFilter) {
    btn.textContent = `✕ Clear: ${diagFilter}`;
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

/* ── Table render ─────────────────────────────────────── */
const TABLE_COLS = [
  { key: 'claim_id',        label: 'Claim ID' },
  { key: 'member_name',     label: 'Member' },
  { key: 'claim_type',      label: 'Type' },
  { key: 'diagnosis_icd10', label: 'ICD-10' },
  { key: 'status',          label: 'Status' },
  { key: 'submitted_date',  label: 'Submitted' },
  { key: 'processed_date',  label: 'Processed' },
  { key: 'submitted_amount',label: 'Submitted Amt' },
  { key: 'approved_amount', label: 'Approved Amt' },
  { key: 'insurer',         label: 'Insurer' },
  { key: 'country',         label: 'Country' },
  { key: 'assessor',        label: 'Assessor' },
];

function renderTable(data) {
  // Sort
  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] || '', bv = b[sortKey] || '';
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  // Pagination
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, pages);
  const slice = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Count
  document.getElementById('tableCount').textContent =
    `(${total.toLocaleString()} rows${diagFilter ? ` · ${diagFilter}` : ''})`;

  // Header
  const thead = document.getElementById('tblHead');
  thead.innerHTML = '<tr>' + TABLE_COLS.map(c => {
    const cls = c.key === sortKey ? (sortDir === 1 ? 'sort-asc' : 'sort-desc') : '';
    return `<th class="${cls}" data-sort="${c.key}">${c.label}</th>`;
  }).join('') + '</tr>';

  // Rows — build with DOM to avoid innerHTML XSS on user-data values
  const tbody = document.getElementById('tblBody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const r of slice) {
    const tr = document.createElement('tr');
    for (const c of TABLE_COLS) {
      const td = document.createElement('td');
      if (c.key === 'status') {
        const badge = document.createElement('span');
        badge.className = `badge badge-${r.status.replace(/\s/g,'_')}`;
        badge.textContent = r.status;
        td.appendChild(badge);
      } else if (c.key === 'submitted_amount' || c.key === 'approved_amount') {
        td.textContent = (+r[c.key] || 0).toLocaleString();
        td.style.textAlign = 'right';
      } else {
        td.textContent = r[c.key] || '—';
      }
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);

  // Sort click handlers
  thead.querySelectorAll('[data-sort]').forEach(th => {
    th.onclick = () => {
      if (sortKey === th.dataset.sort) sortDir *= -1;
      else { sortKey = th.dataset.sort; sortDir = -1; }
      renderTable(data);
    };
  });

  // Pagination
  renderPagination(pages, total, data);
}

function renderPagination(pages, total, data) {
  const pg = document.getElementById('pagination');
  if (pages <= 1) { pg.innerHTML = ''; return; }

  const showing = Math.min(page * PAGE_SIZE, total);
  const start   = (page - 1) * PAGE_SIZE + 1;

  let html = `<button class="pg-btn" ${page===1?'disabled':''} id="pgPrev">‹ Prev</button>`;
  // Show at most 7 page buttons
  const range = pageRange(page, pages);
  for (const p of range) {
    if (p === '…') html += `<span style="padding:5px 4px;color:var(--muted)">…</span>`;
    else html += `<button class="pg-btn${p===page?' active':''}" data-p="${p}">${p}</button>`;
  }
  html += `<button class="pg-btn" ${page===pages?'disabled':''} id="pgNext">Next ›</button>`;
  html += `<span class="pg-info">${start.toLocaleString()}–${showing.toLocaleString()} of ${total.toLocaleString()}</span>`;
  pg.innerHTML = html;

  pg.querySelector('#pgPrev').onclick = () => { page--; renderTable(data); };
  pg.querySelector('#pgNext').onclick = () => { page++; renderTable(data); };
  pg.querySelectorAll('[data-p]').forEach(btn => {
    btn.onclick = () => { page = +btn.dataset.p; renderTable(data); };
  });
}

function pageRange(cur, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  if (cur <= 4)   return [1,2,3,4,5,'…',total];
  if (cur >= total - 3) return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',cur-1,cur,cur+1,'…',total];
}

/* ── Full draw ─────────────────────────────────────────── */
function draw() {
  const data = filtered();
  renderKPIs(data);
  renderStatusChart(data);
  renderTimeChart(data);
  renderDiagFreqChart(data);
  renderDiagCostChart(data);
  renderApprovalChart(data);
  renderHistChart(data);
  page = 1;
  renderTable(data);
}

/* ── Populate filter dropdowns ─────────────────────────── */
function populateFilter(selectId, key) {
  const el = document.getElementById(selectId);
  const vals = [...new Set(ALL.map(r => r[key]))].filter(Boolean).sort();
  vals.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
  el.onchange = () => { diagFilter = null; updateDiagFilterUI(); page = 1; draw(); };
}

/* ── Reset filters ─────────────────────────────────────── */
document.getElementById('resetBtn').onclick = () => {
  ['from','to','type','status','insurer','country'].forEach(id => {
    document.getElementById(id).value = '';
  });
  diagFilter = null;
  updateDiagFilterUI();
  page = 1;
  draw();
};

/* ── Date filter change ─────────────────────────────────── */
['from','to'].forEach(id => {
  document.getElementById(id).onchange = () => { page = 1; draw(); };
});

/* ── Diagnosis drill-down clear ─────────────────────────── */
document.getElementById('clearDiagFilter').onclick = () => {
  diagFilter = null;
  updateDiagFilterUI();
  page = 1;
  renderTable(filtered());
};

/* ── Export CSV ────────────────────────────────────────── */
document.getElementById('exportBtn').onclick = () => {
  const data = filtered();
  if (!data.length) return;
  const headers = Object.keys(ALL[0]).filter(k => !k.startsWith('_'));
  const lines = [
    headers.join(','),
    ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'filtered_claims.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ── Bootstrap ─────────────────────────────────────────── */
const t0 = performance.now();

fetch('claims.csv')
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
  .then(text => {
    ALL = parseCSV(text);

    // Populate dropdowns
    populateFilter('type',    'claim_type');
    populateFilter('status',  'status');
    populateFilter('insurer', 'insurer');
    populateFilter('country', 'country');

    // First draw
    draw();

    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 350);

    console.log(`Dashboard ready in ${(performance.now() - t0).toFixed(0)} ms`);
  })
  .catch(err => {
    // Build error UI via DOM — err.message is untrusted, never inject into innerHTML
    const overlay = document.getElementById('loadingOverlay');
    overlay.innerHTML = ''; // clear spinner
    const wrap = document.createElement('div');
    wrap.style.cssText = 'color:#f87171;text-align:center;padding:20px';
    const title = document.createElement('strong');
    title.textContent = 'Failed to load claims.csv';
    const msg = document.createElement('p');
    msg.style.marginTop = '8px';
    msg.textContent = err.message;
    wrap.appendChild(title);
    wrap.appendChild(msg);
    overlay.appendChild(wrap);
  });
