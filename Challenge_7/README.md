# Challenge 7 - Claims Intake Wizard

Open `index.html`. The wizard implements 5 steps, claim-type conditional fields/documents, ICD-10 autocomplete with 120 options, file validation, progress, review, back navigation, and mock submission.

## Run

Open `index.html` directly or deploy the folder to a static host.

## Submission

- Provide a live URL for the wizard.
- Include `index.html`, `styles.css`, and `app.js`.

## Approach

- Claim type drives conditional document requirements and inpatient-only fields.
- Validation blocks missing required fields, missing required documents, invalid file types, and oversized files.
- Final review shows the mock payload before submit.
