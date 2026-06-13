# Challenge 8 - Medical Document Extractor

Run `python extractor.py` to classify 10 generated medical documents and write `extraction_results.json`. Run `python -m unittest test_extractor.py`.

## Submission

Include all 10 documents in `documents/`, `extraction_results.json`, the extractor implementation, tests, and this prompt-engineering writeup.

## Prompt Engineering Approach

- Classify the document type first, then extract only fields that are visible in the document.
- Return null or low confidence for missing/uncertain fields instead of inventing data.
- Calibrate confidence per field so reviewers can triage uncertain extractions.
- Run deterministic validation for dates, receipt totals, and schema completeness after extraction.

## Approach

- The deterministic extractor mirrors the intended LLM workflow while remaining reproducible for tests.
- Output keeps document type, extracted fields, validation notes, and confidence together.
- Tests cover classification and representative field extraction behavior.
