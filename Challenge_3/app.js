const templates = {
  submitted: {
    title: "Claim Submitted",
    subject: "Your claim {{claim_number}} has been received",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      claim_type: "Outpatient",
      submitted_date: "12 Jun 2026",
    },
    body: `<p>Hi {{member_name}},</p><p>We received your {{claim_type}} claim <strong>{{claim_number}}</strong> on {{submitted_date}}. Our team will review it and contact you if anything else is needed.</p>`,
  },
  documents: {
    title: "Documents Received",
    subject: "Documents received for claim {{claim_number}}",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      document_count: "3",
      documents_list: "Medical receipt, prescription, lab report",
    },
    body: `<p>Hi {{member_name}},</p><p>We received {{document_count}} document(s) for claim <strong>{{claim_number}}</strong>: {{documents_list}}.</p>`,
  },
  review: {
    title: "Under Review",
    subject: "Your claim {{claim_number}} is being reviewed",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      assessor_name: "Ananda S.",
      estimated_days: "5",
    },
    body: `<p>Hi {{member_name}},</p><p>{{assessor_name}} is reviewing your claim. We expect to complete the review within {{estimated_days}} business days.</p>`,
  },
  approved: {
    title: "Approved",
    subject: "Good news! Claim {{claim_number}} has been approved",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      approved_amount: "THB 18,450",
      original_amount: "THB 20,000",
      payment_method: "bank transfer",
    },
    body: `<p>Hi {{member_name}},</p><p>Good news. Your claim <strong>{{claim_number}}</strong> has been approved.</p><p class="amount">{{approved_amount}}</p><p>Submitted amount: {{original_amount}}. Payment method: {{payment_method}}.</p>`,
  },
  rejected: {
    title: "Rejected",
    subject: "Update on claim {{claim_number}}",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      rejection_reason:
        "The treatment date is before the policy effective date.",
      appeal_deadline: "30 Jun 2026",
    },
    body: `<p>Hi {{member_name}},</p><div class="bad"><strong>Why this was not approved</strong><p>{{rejection_reason}}</p></div><p>You can appeal or send additional information before {{appeal_deadline}}.</p>`,
  },
  payment: {
    title: "Payment Sent",
    subject: "Payment for claim {{claim_number}} has been processed",
    data: {
      claim_number: "CLM-240031",
      member_name: "Mai Nguyen",
      payment_amount: "THB 18,450",
      payment_date: "13 Jun 2026",
      reference_number: "PAY-88319",
    },
    body: `<p>Hi {{member_name}},</p><p>Your payment of <strong>{{payment_amount}}</strong> was processed on {{payment_date}}.</p><p>Reference number: {{reference_number}}</p>`,
  },
};

const eventSelect = document.getElementById("event");
const subject = document.getElementById("subject");
const preview = document.getElementById("preview");

let current = templates.submitted;

function interpolate(template) {
  return template.replace(/{{(.*?)}}/g, function (match, key) {
    const cleanKey = key.trim();
    const value = current.data[cleanKey];

    return value ?? "";
  });
}

function draw() {
  current = templates[eventSelect.value];
  subject.textContent = interpolate(current.subject);
  preview.innerHTML = `
    <article class="email">
      <div class="head">Papaya Insurance</div>
      <div class="body">
        ${interpolate(current.body)}
        <p>Warmly,<br>Papaya Claims Team</p>
      </div>
      <div class="footer">Need help? support@papaya.insure | +66 02 000 0000</div>
    </article>
  `;
}

eventSelect.innerHTML = Object.entries(templates)
  .map(([key, template]) => `<option value="${key}">${template.title}</option>`)
  .join("");
eventSelect.onchange = draw;
draw();
