/*
 * Claims Intake Wizard — app.js
 *
 * Security: innerHTML is used throughout; all rendered content comes from
 * developer-controlled state or file metadata (name, size) only — no
 * user-supplied HTML is ever trusted or executed. Extend carefully.
 */

/* ── HTML escape ──────────────────────────────────────── */
/**
 * Escape user-supplied strings before inserting into innerHTML.
 * All state values that come from form inputs or file picks go through esc().
 */
function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── ICD-10 mock list ─────────────────────────────────── */
const ICD10 = [
  "A09 - Infectious gastroenteritis",
  "B34.9 - Viral infection, unspecified",
  "E11.9 - Type 2 diabetes without complications",
  "F32.1 - Moderate depressive episode",
  "G43.9 - Migraine, unspecified",
  "I10 - Essential hypertension",
  "I25.1 - Atherosclerotic heart disease",
  "J00 - Acute nasopharyngitis (common cold)",
  "J06.9 - Acute upper respiratory infection",
  "J18.9 - Pneumonia, unspecified",
  "J20.9 - Acute bronchitis, unspecified",
  "J45.9 - Asthma, unspecified",
  "K21.0 - Gastro-oesophageal reflux with oesophagitis",
  "K29.7 - Gastritis, unspecified",
  "K35 - Acute appendicitis",
  "K57.3 - Diverticular disease of large intestine",
  "K80.2 - Calculus of gallbladder without cholecystitis",
  "L20.9 - Atopic dermatitis, unspecified",
  "M54.5 - Low back pain",
  "M79.3 - Panniculitis",
  "N10 - Acute tubulo-interstitial nephritis",
  "N30.0 - Acute cystitis",
  "N39.0 - Urinary tract infection",
  "O09 - Supervision of high-risk pregnancy",
  "R05 - Cough",
  "R50.9 - Fever, unspecified",
  "R51 - Headache",
  "S52.5 - Fracture of lower end of radius",
  "S62.5 - Fracture of thumb",
  "S82.0 - Fracture of patella",
  "Z00.0 - General medical examination",
  "Z23 - Immunization",
  "Z30.0 - General counselling and advice on contraception",
  "K05.1 - Chronic gingivitis",
  "K08.1 - Complete loss of teeth",
  "K04.0 - Pulpitis",
  "H10.1 - Acute atopic conjunctivitis",
  "H52.1 - Myopia",
  "T14.9 - Injury, unspecified",
  "T78.1 - Other adverse food reactions",
];

const PROVIDERS = [
  "Bangkok Hospital", "FV Hospital", "Queen Mary Hospital",
  "Bumrungrad International Hospital", "Vinmec International Hospital",
  "Mount Elizabeth Hospital", "Gleneagles Hospital",
  "Medpark Hospital", "Bangkok Pattaya Hospital",
  "Raffles Medical Group",
];

/* ── State ────────────────────────────────────────────── */
const state = {
  type:      "OUTPATIENT",
  member:    { name: "Mai Nguyen", policy: "POL-2024-TH-00789", id: "MBR-001", dob: "1990-02-12" },
  dependent: false,
  depName:   "",
  diag:      "", icd: "", provider: "", date1: "", date2: "", admission: "",
  docs:      {},
  confirm:   false,
};

const REQUIRED_DOCS = {
  OUTPATIENT: [ ["Medical Receipt",    true  ], ["Prescription",   false ] ],
  INPATIENT:  [ ["Discharge Summary",  true  ], ["Itemized Bill",  true  ], ["Medical Receipt", true] ],
  DENTAL:     [ ["Dental Receipt",     true  ], ["Treatment Plan", true  ] ],
};

const STEP_META = [
  { num: 1, label: "Claim Type"  },
  { num: 2, label: "Member"      },
  { num: 3, label: "Diagnosis"   },
  { num: 4, label: "Documents"   },
  { num: 5, label: "Review"      },
];

const TYPE_INFO = {
  OUTPATIENT: { icon: "🩺", desc: "Doctor visits, medicine, tests" },
  INPATIENT:  { icon: "🏥", desc: "Hospital stays, surgery" },
  DENTAL:     { icon: "🦷", desc: "Dental treatment & checkups" },
};

let step = 1;

/* ── Helpers ──────────────────────────────────────────── */
function fmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${mon[+m - 1]} ${y}`;
}
function prettyKey(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function genRef() {
  return "CLM-" + Math.random().toString(36).slice(2,8).toUpperCase();
}
function checkIcon(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
}

/* ── Progress calculation ─────────────────────────────── */
function calcProgress() {
  const docs    = REQUIRED_DOCS[state.type];
  const total   = docs.length;
  const uploaded = docs.filter(([name]) => state.docs[name]).length;
  return total === 0 ? 100 : Math.round((uploaded / total) * 100);
}

/* ── Save form fields into state ──────────────────────── */
function save() {
  ["name","policy","id","dob"].forEach(k => {
    const el = document.getElementById("m_" + k);
    if (el) state.member[k] = el.value;
  });
  const dep = document.getElementById("dep");
  if (dep) state.dependent = dep.checked;
  const depSel = document.getElementById("depSel");
  if (depSel && state.dependent) state.depName = depSel.value;
  ["diag","icd","provider","date1","date2","admission"].forEach(k => {
    const el = document.getElementById(k);
    if (el) state[k] = el.value;
  });
  const conf = document.getElementById("confirm");
  if (conf) state.confirm = conf.checked;
}

/* ── Validation ───────────────────────────────────────── */
function validate() {
  save();
  if (step === 3) {
    if (!state.diag.trim()) return "Please enter a diagnosis description.";
    if (!state.icd)         return "Please select an ICD-10 code.";
    if (!state.date1)       return "Please enter the treatment date.";
    if (state.type === "INPATIENT" && !state.date2) return "Please enter the discharge date.";
  }
  if (step === 4) {
    const missing = REQUIRED_DOCS[state.type]
      .filter(([name, req]) => req && !state.docs[name])
      .map(([name]) => name);
    if (missing.length) return "Required documents missing: " + missing.join(", ");
  }
  if (step === 5 && !state.confirm) return "Please confirm that the information is accurate.";
  return "";
}

/* ── Stepper ──────────────────────────────────────────── */
function drawStepper() {
  document.getElementById("stepper").innerHTML = STEP_META.map(({ num, label }) => {
    const cls = num < step ? "done" : num === step ? "active" : "";
    const inner = num < step
      ? checkIcon(14)
      : `<span class="step-num">${num}</span>`;
    return `
      <div class="stepper-item ${cls}" role="listitem" aria-label="Step ${num}: ${label}">
        <div class="step-dot">${inner}</div>
        <span class="step-label">${label}</span>
      </div>`;
  }).join("");

  // next button label
  document.getElementById("next").innerHTML = step === 5
    ? `Submit Claim ${checkIcon(16)}`
    : `Continue <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>`;
  document.getElementById("prev").style.visibility = step === 1 ? "hidden" : "";
}

/* ── Step renderers ───────────────────────────────────── */
function renderStep1() {
  return `
    <h1 class="step-heading">What type of claim?</h1>
    <p class="step-sub">Select the category that best describes your medical visit.</p>
    <div class="type-grid">
      ${["OUTPATIENT","INPATIENT","DENTAL"].map(t => `
        <label class="type-card ${state.type === t ? "selected" : ""}">
          <input type="radio" name="type" value="${t}" ${state.type === t ? "checked" : ""}>
          <span class="type-icon">${TYPE_INFO[t].icon}</span>
          <span class="type-name">${t.charAt(0)+t.slice(1).toLowerCase()}</span>
          <span class="type-desc">${TYPE_INFO[t].desc}</span>
        </label>`).join("")}
    </div>`;
}

function renderStep2() {
  const { name, policy, id, dob } = state.member;
  return `
    <h1 class="step-heading">Member &amp; Policy</h1>
    <p class="step-sub">Confirm or update your details. Pre-filled from your policy record.</p>

    <div class="field-row">
      <div class="field">
        <label for="m_name">Full Name</label>
        <input id="m_name" value="${esc(name)}" autocomplete="name">
      </div>
      <div class="field">
        <label for="m_id">Member ID</label>
        <input id="m_id" value="${esc(id)}" readonly>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="m_policy">Policy Number</label>
        <input id="m_policy" value="${esc(policy)}" readonly>
      </div>
      <div class="field">
        <label for="m_dob">Date of Birth</label>
        <input id="m_dob" type="date" value="${esc(dob)}">
      </div>
    </div>

    <label class="dep-toggle" for="dep">
      <input type="checkbox" id="dep" ${state.dependent ? "checked" : ""}>
      <span>This claim is for a dependent (spouse or child)</span>
    </label>

    <div id="depSection" style="${state.dependent ? "" : "display:none"}">
      <div class="field">
        <label for="depSel">Select Dependent</label>
        <select id="depSel">
          <option value="Spouse - Linh Nguyen" ${state.depName === "Spouse - Linh Nguyen" ? "selected" : ""}>Spouse — Linh Nguyen</option>
          <option value="Child - An Nguyen"    ${state.depName === "Child - An Nguyen"    ? "selected" : ""}>Child — An Nguyen</option>
        </select>
      </div>
    </div>`;
}

function renderStep3() {
  const isIP = state.type === "INPATIENT";
  const los = (state.date1 && state.date2)
    ? Math.round((new Date(state.date2) - new Date(state.date1)) / 86400000) + 1
    : null;
  // ICD-10 datalist: values are from our developer-controlled constant array — esc as belt-and-suspenders
  const icdsOpts = ICD10.filter(c =>
    !state.icd || c.toLowerCase().includes(state.icd.toLowerCase())
  ).map(c => `<option value="${esc(c)}">`).join("");

  return `
    <h1 class="step-heading">Diagnosis &amp; Treatment</h1>
    <p class="step-sub">Describe your medical visit and enter diagnosis details.</p>

    <div class="field">
      <label for="diag">Diagnosis Description <span style="color:var(--red)">*</span></label>
      <textarea id="diag" placeholder="Describe the primary reason for the visit, symptoms, and treatment received…">${esc(state.diag)}</textarea>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="icd">ICD-10 Code <span style="color:var(--red)">*</span></label>
        <input id="icd" list="icds" placeholder="Search e.g. J06, Asthma…" value="${esc(state.icd)}">
        <datalist id="icds">${icdsOpts}</datalist>
      </div>
      <div class="field">
        <label for="provider">Healthcare Provider</label>
        <input id="provider" list="providers" placeholder="Search hospital or clinic…" value="${esc(state.provider)}">
        <datalist id="providers">${PROVIDERS.map(p => `<option value="${esc(p)}">`).join("")}</datalist>
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="date1">${isIP ? "Admission Date" : "Treatment Date"} <span style="color:var(--red)">*</span></label>
        <input id="date1" type="date" value="${esc(state.date1)}">
      </div>
      ${isIP ? `
      <div class="field">
        <label for="date2">Discharge Date <span style="color:var(--red)">*</span></label>
        <input id="date2" type="date" value="${esc(state.date2)}">
      </div>` : ""}
    </div>

    ${isIP ? `
    <div class="field">
      <label for="admission">Admission Reason</label>
      <input id="admission" placeholder="e.g. Scheduled surgery, Emergency admission…" value="${esc(state.admission)}">
    </div>` : ""}

    ${los !== null ? `<div class="los-badge">🏨 Length of stay: <strong>${los} night${los === 1 ? "" : "s"}</strong></div>` : ""}`;
}

function renderStep4() {
  const docs  = REQUIRED_DOCS[state.type];
  const total = docs.length;
  const done  = docs.filter(([n]) => state.docs[n]).length;
  const pct   = total ? Math.round((done / total) * 100) : 100;

  const docItems = docs.map(([name, req]) => {
    const uploaded = !!state.docs[name];
    // name is from our developer-controlled REQUIRED_DOCS constant
    // state.docs[name] is a file.name from the user's filesystem — must be escaped
    return `
      <div class="doc-item ${uploaded ? "uploaded" : ""}">
        <div class="doc-header">
          <span class="doc-title">${esc(name)}</span>
          <span class="req-badge ${req ? "required" : "optional"}">${req ? "Required" : "Optional"}</span>
        </div>
        <div class="upload-area" id="zone_${esc(name.replace(/\s/g,"_"))}">
          <input type="file" data-doc="${esc(name)}" accept=".pdf,.jpg,.jpeg,.png">
          <div class="upload-icon">${uploaded ? "✅" : "📄"}</div>
          <div class="upload-label">${uploaded ? "File uploaded" : "Drop file or click to browse"}</div>
          <div class="upload-hint">PDF, JPG, PNG · Max 10 MB</div>
          ${uploaded ? `<div class="file-chip">${checkIcon(12)} ${esc(state.docs[name])}</div>` : ""}
        </div>
      </div>`;
  }).join("");

  const progressItems = docs.map(([name]) =>
    `<div class="progress-item ${state.docs[name] ? "done" : ""}">
      <div class="pi-dot"></div>${name}
    </div>`
  ).join("");

  return `
    <h1 class="step-heading">Upload Documents</h1>
    <p class="step-sub">Upload supporting documents for your <strong>${state.type.charAt(0)+state.type.slice(1).toLowerCase()}</strong> claim.</p>

    ${docItems}

    <div class="progress-wrap">
      <div class="progress-header">
        <span class="progress-label">Upload progress</span>
        <span class="progress-pct">${done} / ${total} files</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-items">${progressItems}</div>
    </div>`;
}

function renderStep5() {
  const { name, policy, id, dob } = state.member;
  const docs = REQUIRED_DOCS[state.type];
  const isIP = state.type === "INPATIENT";
  const los  = (state.date1 && state.date2)
    ? Math.round((new Date(state.date2) - new Date(state.date1)) / 86400000) + 1
    : null;

  const docPills = docs.map(([n]) => state.docs[n]
    ? `<div class="doc-pill">${checkIcon(12)} ${esc(n)}: <em>${esc(state.docs[n])}</em></div>`
    : `<div class="doc-pill" style="background:#f1f5f9;color:var(--muted);border-color:var(--line)">— ${esc(n)}: not uploaded</div>`
  ).join("");

  return `
    <h1 class="step-heading">Review &amp; Submit</h1>
    <p class="step-sub">Please review all details carefully before submitting your claim.</p>

    <!-- Claim type -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-icon">${TYPE_INFO[state.type].icon}</span>
        <span class="review-section-title">Claim Type</span>
        <button class="review-edit-link" data-goto="1">Edit</button>
      </div>
      <div class="review-grid">
        <div class="review-field">
          <div class="review-field-label">Type</div>
          <div class="review-field-value">${esc(state.type.charAt(0)+state.type.slice(1).toLowerCase())}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">For</div>
          <div class="review-field-value">${esc(state.dependent ? state.depName || "Dependent" : "Self")}</div>
        </div>
      </div>
    </div>

    <!-- Member -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-icon">👤</span>
        <span class="review-section-title">Member &amp; Policy</span>
        <button class="review-edit-link" data-goto="2">Edit</button>
      </div>
      <div class="review-grid">
        <div class="review-field">
          <div class="review-field-label">Name</div>
          <div class="review-field-value">${esc(name)}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">Member ID</div>
          <div class="review-field-value">${esc(id)}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">Policy</div>
          <div class="review-field-value">${esc(policy)}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">Date of Birth</div>
          <div class="review-field-value">${esc(fmtDate(dob))}</div>
        </div>
      </div>
    </div>

    <!-- Diagnosis -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-icon">🩺</span>
        <span class="review-section-title">Diagnosis &amp; Treatment</span>
        <button class="review-edit-link" data-goto="3">Edit</button>
      </div>
      <div class="review-grid">
        <div class="review-field" style="grid-column: 1/-1">
          <div class="review-field-label">Diagnosis</div>
          <div class="review-field-value">${esc(state.diag) || "—"}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">ICD-10</div>
          <div class="review-field-value">${esc(state.icd) || "—"}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">Provider</div>
          <div class="review-field-value">${esc(state.provider) || "—"}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">${isIP ? "Admission" : "Treatment Date"}</div>
          <div class="review-field-value">${esc(fmtDate(state.date1))}</div>
        </div>
        ${isIP ? `
        <div class="review-field">
          <div class="review-field-label">Discharge</div>
          <div class="review-field-value">${esc(fmtDate(state.date2))}</div>
        </div>
        <div class="review-field">
          <div class="review-field-label">Length of Stay</div>
          <div class="review-field-value">${los !== null ? los + " night" + (los===1?"":"s") : "—"}</div>
        </div>
        ${state.admission ? `
        <div class="review-field">
          <div class="review-field-label">Admission Reason</div>
          <div class="review-field-value">${esc(state.admission)}</div>
        </div>` : ""}` : ""}
      </div>
    </div>

    <!-- Documents -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-icon">📎</span>
        <span class="review-section-title">Documents</span>
        <button class="review-edit-link" data-goto="4">Edit</button>
      </div>
      <div class="review-docs">${docPills}</div>
    </div>

    <!-- Confirm -->
    <label class="confirm-block" for="confirm">
      <input type="checkbox" id="confirm" ${state.confirm ? "checked" : ""}>
      <span>I confirm that all information and documents provided are accurate and complete. I understand that submitting false information may result in claim rejection and policy termination.</span>
    </label>`;
}

/* ── Error display ────────────────────────────────────── */
function showError(msg) {
  let el = document.getElementById("formError");
  if (!el) {
    el = document.createElement("div");
    el.id = "formError";
    el.className = "inline-error";
    document.getElementById("content").prepend(el);
  }
  // Use textContent — msg comes from our own validate() strings, but belt-and-suspenders
  el.textContent = "⚠️ " + msg;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function clearError() {
  const el = document.getElementById("formError");
  if (el) el.remove();
}

/* ── Draw step ────────────────────────────────────────── */
function draw() {
  clearError();
  const renders = { 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4, 5: renderStep5 };
  // Force re-animation
  const cb = document.getElementById("content");
  cb.style.animation = "none";
  cb.offsetHeight; // reflow
  cb.style.animation = "";
  cb.innerHTML = renders[step]();
  drawStepper();
  bind();
}

/* ── Bind events after each draw ──────────────────────── */
function bind() {
  // Step 1: type cards
  document.querySelectorAll("[name=type]").forEach(r => {
    r.addEventListener("change", () => {
      state.type = r.value;
      state.docs = {};
      draw();
    });
  });

  // Step 2: dependent toggle
  const dep = document.getElementById("dep");
  if (dep) {
    dep.addEventListener("change", () => {
      save();
      const sec = document.getElementById("depSection");
      if (sec) sec.style.display = dep.checked ? "" : "none";
    });
  }

  // Step 3: live LOS recalc
  ["date1","date2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => {
      save();
      // Re-render only the LOS badge area without full redraw
      const d1 = document.getElementById("date1");
      const d2 = document.getElementById("date2");
      if (!d1 || !d2) return;
      const existing = document.querySelector(".los-badge");
      const v1 = d1.value, v2 = d2?.value;
      if (v1 && v2) {
        const los = Math.round((new Date(v2) - new Date(v1)) / 86400000) + 1;
        // Build badge with DOM API — no innerHTML, all values are numbers/static strings
        const badge = document.createElement("div");
        badge.className = "los-badge";
        badge.textContent = `🏨 Length of stay: `;
        const strong = document.createElement("strong");
        strong.textContent = `${los} night${los===1?"":"s"}`;
        badge.appendChild(strong);
        if (existing) existing.replaceWith(badge);
        else document.getElementById("content").appendChild(badge);
      } else if (existing) existing.remove();
    });
  });

  // Step 4: file inputs
  document.querySelectorAll("[type=file]").forEach(f => {
    // drag-over styling
    const zone = f.closest(".upload-area");
    if (zone) {
      zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("drag-over"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
      zone.addEventListener("drop",      e => { e.preventDefault(); zone.classList.remove("drag-over"); });
    }
    f.addEventListener("change", () => {
      const file = f.files[0];
      if (!file) return;
      if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
        showError("Only PDF, JPG, and PNG files are accepted.");
        f.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showError("File size must not exceed 10 MB.");
        f.value = "";
        return;
      }
      state.docs[f.dataset.doc] = file.name;
      draw(); // redraw to update chip + progress bar
    });
  });

  // Step 5: edit links
  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      save();
      step = parseInt(btn.dataset.goto);
      draw();
    });
  });
}

/* ── Success overlay ──────────────────────────────────── */
function showSuccess() {
  document.getElementById("claimRef").textContent = genRef();
  const overlay = document.getElementById("successOverlay");
  overlay.classList.add("show");
  spawnConfetti();
}

function spawnConfetti() {
  const wrap = document.getElementById("confetti");
  const colors = ["#4ade80","#0891b2","#f59e0b","#ef4444","#1e3a5f","#a78bfa"];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    const angle = (i / 24) * 360;
    const dist  = 50 + Math.random() * 60;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    el.style.cssText = `
      background:${colors[i % colors.length]};
      --tx:${tx}px; --ty:${ty}px;
      --rot:${Math.random() * 360}deg;
      animation-delay:${Math.random() * .3}s;
      animation-duration:${.6 + Math.random() * .4}s;
      border-radius:${Math.random() > .5 ? "50%" : "2px"};
    `;
    wrap.appendChild(el);
  }
}

/* ── Navigation ───────────────────────────────────────── */
document.getElementById("prev").addEventListener("click", () => {
  save();
  if (step > 1) { step--; draw(); }
});

document.getElementById("next").addEventListener("click", () => {
  const err = validate();
  if (err) { showError(err); return; }

  if (step === 5) {
    save();
    console.log("Claim payload:", JSON.stringify(state, null, 2));
    showSuccess();
    return;
  }
  step++;
  draw();
});

/* ── Initial draw ─────────────────────────────────────── */
draw();
