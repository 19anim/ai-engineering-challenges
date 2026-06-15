# Challenge 8 - Medical Document Extractor

This submission implements a reusable medical document extraction pipeline for PNG image inputs. It classifies each document, extracts schema-specific fields, assigns confidence scores, and runs deterministic validation after extraction.

## Run

```bash
python generate_documents.py
python extractor.py
python -m unittest test_extractor.py
```

Generated artifacts:

- `documents/*.png` - 10 realistic image documents.
- `extraction_results.json` - extracted JSON for all 10 documents.
- `test_extractor.py` - requirement and edge-case tests.

## Document Set

The 10 generated test documents match the required mix:

- 3 receipts/invoices
- 3 discharge summaries
- 2 lab reports
- 2 prescriptions

They use different providers, patients, dates, line items, diagnoses, lab rows, and medication rows. The samples avoid a visible `Document Type:` answer line, so classification uses document content signals such as `Grand Total`, `Admission Date`, `Reference Range`, and `Medications`.

## Pipeline Design

`extractor.py` separates the extraction flow into these steps:

1. `VisionProvider.read_document(path)` reads the image/PDF input and returns visible text.
2. `classify(text)` predicts one of `receipt`, `discharge_summary`, `lab_report`, or `prescription`.
3. A schema-specific parser extracts only fields visible in the document.
4. `validate(result)` checks dates, positive amounts, receipt total mismatch, and confidence ranges.

The default `LocalVisionSimulator` reads OCR text embedded in the generated PNG metadata. This keeps tests deterministic without requiring API credentials. The provider boundary is explicit, so a real OpenAI/Gemini/Claude vision adapter can replace it in production by sending the document image/PDF to a multimodal model and returning the observed text or model JSON.

## Prompt Engineering Approach

The intended LLM vision prompt follows this structure:

1. Classify the document before extracting fields.
2. Extract only fields visible in the image.
3. Return strict JSON with `{ "value": ..., "confidence": ... }` for every field.
4. Use `null` and low confidence for missing or unreadable fields.
5. Never infer or fabricate invisible data.
6. Calibrate confidence by evidence quality:
   - high confidence for clear printed labels and exact table rows
   - medium confidence for multi-line sections or noisy OCR
   - low confidence for missing or uncertain fields
7. Run deterministic validation after the model response instead of relying on the model to catch math/date errors.

## Validation Coverage

Tests cover:

- correct classification for all 10 documents
- schema extraction for receipts, discharge summaries, lab reports, and prescriptions
- valid date enforcement
- positive amount enforcement
- receipt item-total mismatch over 5%
- confidence score range checks
- meaningful confidence variation, not uniform high scores
- no hallucinated payment method when the field is not visible
- reusable extraction on a new unseen receipt image

## Submission

Include this folder in the repository with:

- source code: `extractor.py`, `generate_documents.py`
- test documents: `documents/*.png`
- extraction outputs: `extraction_results.json`
- tests and writeup: `test_extractor.py`, this README
