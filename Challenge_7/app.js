const state = {
  type: "OUTPATIENT",
  member: {
    name: "Mai Nguyen",
    policy: "POL-2024-TH-00789",
    id: "MBR-001",
    dob: "1990-02-12",
  },
  docs: {},
  confirm: false,
};
const required = {
  OUTPATIENT: [
    ["medical receipt", 1],
    ["prescription", 0],
  ],
  INPATIENT: [
    ["discharge summary", 1],
    ["itemized bill", 1],
    ["medical receipt", 1],
  ],
  DENTAL: [
    ["dental receipt", 1],
    ["treatment plan", 1],
  ],
};
let step = 1;
function save() {
  document
    .querySelectorAll("[id^=m_]")
    .forEach((i) => (state.member[i.id.slice(2)] = i.value));
  ["diag", "icd", "provider", "date1", "date2", "admission"].forEach((k) => {
    let e = document.getElementById(k);
    if (e) state[k] = e.value;
  });
  let c = document.getElementById("confirm");
  if (c) state.confirm = c.checked;
}
function validate() {
  save();
  if (step === 3 && (!state.diag || !state.icd || !state.date1))
    return "Diagnosis, ICD-10, and treatment date are required";
  if (step === 4) {
    let miss = required[state.type]
      .filter(([d, r]) => r && !state.docs[d])
      .map((x) => x[0]);
    if (miss.length) return "Missing required documents: " + miss.join(", ");
  }
  if (step === 5 && !state.confirm) return "Please confirm accuracy";
  return "";
}
function draw() {
  steps.innerHTML = [1, 2, 3, 4, 5]
    .map((i) => `<span class="${i === step ? "active" : ""}">Step ${i}</span>`)
    .join("");
  content.innerHTML = {
    1: `<h2>Claim Type</h2>${["OUTPATIENT", "INPATIENT", "DENTAL"].map((t) => `<label><input type="radio" name="type" value="${t}" ${state.type === t ? "checked" : ""}> ${t}</label>`).join("")}`,
    2: `<h2>Member & Policy</h2>${Object.entries(state.member)
      .map(([k, v]) => `<label>${k}<input id="m_${k}" value="${v}"></label>`)
      .join(
        "",
      )}<label><input type="checkbox" id="dep"> Claim is for a dependent</label><select><option>Spouse - Linh Nguyen</option><option>Child - An Nguyen</option></select>`,
    3: `<h2>Diagnosis & Treatment</h2><textarea id="diag" placeholder="Diagnosis description">${state.diag || ""}</textarea><input id="icd" list="icds" placeholder="ICD-10" value="${state.icd || ""}"><datalist id="icds">${Array.from({ length: 120 }, (_, i) => `<option value="J${String(i).padStart(2, "0")}.${i % 10} Common condition ${i}">`).join("")}</datalist><input id="provider" list="providers" placeholder="Provider" value="${state.provider || ""}"><datalist id="providers"><option>Bangkok Hospital</option><option>FV Hospital</option><option>Queen Mary Hospital</option></datalist><input id="date1" type="date" value="${state.date1 || ""}">${state.type === "INPATIENT" ? `<input id="date2" type="date" value="${state.date2 || ""}"><input id="admission" placeholder="Admission reason" value="${state.admission || ""}"><p id="los"></p>` : ""}`,
    4: `<h2>Document Upload</h2>${required[state.type].map(([d, r]) => `<div class="doc"><strong>${d} ${r ? "(required)" : "(optional)"}</strong><input type="file" data-doc="${d}" accept=".pdf,.jpg,.jpeg,.png"></div>`).join("")}<progress max="100" value="${Object.keys(state.docs).length * 25}"></progress>`,
    5: `<h2>Review & Submit</h2><pre>${JSON.stringify(state, null, 2)}</pre><label><input id="confirm" type="checkbox" ${state.confirm ? "checked" : ""}> I confirm this information is accurate</label><p id="success"></p>`,
  }[step];
  bind();
}
function bind() {
  document.querySelectorAll("[name=type]").forEach(
    (r) =>
      (r.onchange = () => {
        state.type = r.value;
        state.docs = {};
        draw();
      }),
  );
  document.querySelectorAll("[type=file]").forEach(
    (f) =>
      (f.onchange = () => {
        let file = f.files[0];
        if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
          alert("PDF, JPG, PNG only");
          f.value = "";
          return;
        }
        if (file && file.size > 10 * 1024 * 1024) {
          alert("Max 10MB");
          f.value = "";
          return;
        }
        state.docs[f.dataset.doc] = file ? file.name : null;
        draw();
      }),
  );
  let d2 = document.getElementById("date2");
  if (d2)
    d2.onchange = () => {
      save();
      los.textContent =
        "Length of stay: " +
        ((new Date(state.date2) - new Date(state.date1)) / 86400000 + 1) +
        " days";
    };
}
prev.onclick = () => {
  save();
  step = Math.max(1, step - 1);
  draw();
};
next.onclick = () => {
  let err = validate();
  if (err) {
    alert(err);
    return;
  }
  if (step === 5) {
    success.textContent = "Submitted. Mock payload logged to console.";
    console.log(state);
    return;
  }
  step++;
  draw();
};
draw();
