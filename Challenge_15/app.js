let tenants = [],
  versions = [];
const sample = () => ({
  claimType: claimType.value,
  amount: Number(amount.value),
  submittedDate: "2024-06-12",
  customFields: {},
});
function byId(id) {
  return tenants.find((t) => t.id === id);
}
function validateConfig(t) {
  if (t.autoApproval < 0) return "Auto-approval threshold must be >= 0";
  if (!t.claimTypes?.length) return "At least one claim type must be enabled";
  if (Object.values(t.sla || {}).some((v) => v <= 0))
    return "SLA must be positive";
  return "";
}
function processClaim(tenantId, claim) {
  const t = byId(tenantId);
  const docs = t.documents[claim.claimType] || { required: [], optional: [] };
  const tier =
    claim.amount <= t.autoApproval
      ? "auto-approve"
      : t.tiers.find((x) => claim.amount <= x.max)?.role || "manual_review";
  const d = new Date(claim.submittedDate);
  d.setDate(d.getDate() + (t.sla[claim.claimType] || 7));
  return {
    tenant: t.name,
    requiredDocuments: docs.required,
    optionalDocuments: docs.optional,
    approvalRouting: tier,
    notifications: t.notifications.claim_submitted || [],
    slaDeadline: d.toISOString().slice(0, 10),
    customFieldsRequired: t.customFields,
    validation: t.customFields.filter((f) => !claim.customFields[f]),
  };
}
function renderSelectors() {
  tenant.innerHTML = tenants
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join("");
  compare.innerHTML = tenant.innerHTML;
  history.innerHTML = versions
    .map((v, i) => `<option value="${i}">${i + 1}: ${v.name}</option>`)
    .join("");
}
function show() {
  const t = byId(tenant.value) || tenants[0];
  tenant.value = t.id;
  editor.textContent = JSON.stringify(t, null, 2);
  preview.textContent = JSON.stringify(processClaim(t.id, sample()), null, 2);
  const b = byId(compare.value) || tenants[1] || t;
  diff.textContent = JSON.stringify(
    Object.fromEntries(
      Object.keys({ ...t, ...b })
        .filter((k) => JSON.stringify(t[k]) !== JSON.stringify(b[k]))
        .map((k) => [k, { [t.name]: t[k], [b.name]: b[k] }]),
    ),
    null,
    2,
  );
  histOut.textContent = JSON.stringify(versions.slice(-5), null, 2);
}
function commitEditor() {
  let next = JSON.parse(editor.textContent);
  let err = validateConfig(next);
  if (err) {
    alert(err);
    return false;
  }
  let i = tenants.findIndex((t) => t.id === next.id);
  if (i >= 0) tenants[i] = next;
  return true;
}
fetch("tenants.json")
  .then((r) => r.json())
  .then((d) => {
    tenants = d;
    versions = [JSON.parse(JSON.stringify(d[0]))];
    renderSelectors();
    show();
    tenant.onchange = show;
    compare.onchange = show;
    claimType.onchange = amount.oninput = show;
    save.onclick = () => {
      if (commitEditor()) {
        versions.push(JSON.parse(editor.textContent));
        renderSelectors();
        show();
      }
    };
    add.onclick = () => {
      tenants.push({
        id: "tenant" + Date.now(),
        name: nameInput.value || "New Tenant",
        logoUrl: "",
        branding: { primary: "#2563EB", secondary: "#10B981" },
        claimTypes: ["OUTPATIENT"],
        documents: {
          OUTPATIENT: { required: ["medical receipt"], optional: [] },
        },
        autoApproval: 10000,
        tiers: [{ max: 999999999, role: "assessor" }],
        notifications: { claim_submitted: ["email"] },
        sla: { OUTPATIENT: 7 },
        customFields: [],
      });
      renderSelectors();
      tenant.value = tenants.at(-1).id;
      show();
    };
    deleteBtn.onclick = () => {
      tenants = tenants.filter((t) => t.id !== tenant.value);
      renderSelectors();
      show();
    };
    rollback.onclick = () => {
      if (history.value) {
        const v = JSON.parse(JSON.stringify(versions[history.value]));
        let i = tenants.findIndex((t) => t.id === v.id);
        if (i >= 0) tenants[i] = v;
        renderSelectors();
        tenant.value = v.id;
        show();
      }
    };
  });
window.processClaim = processClaim;
