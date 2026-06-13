# Challenge 2 - Claims Data Cleanup & Report

This project generates a messy CSV of 500 insurance claims, cleans the data, and produces a data quality report.

## Run

```bash
python generate_data.py
python clean_data.py
```

Generated outputs:

- `dirty_claims.csv`
- `clean_claims.csv`
- `row_test_results.csv`
- `report.md`

## Verification

```bash
python test_solution.py
python test_rows.py
```

## Submission

Include the generator, cleaning script, dirty dataset, cleaned dataset, row-level test output, and `report.md`.

## Approach

- Removes exact duplicate rows.
- Normalizes member names, claim types, currencies, statuses, and dates.
- Flags and removes invalid submitted amounts.
- Replaces invalid diagnosis markers with a consistent null marker.
- Summarizes row counts, issue counts, claims by type/status, average amount by type, and top diagnoses.
