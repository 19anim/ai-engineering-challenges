# Data Quality Report — Insurance Claims

_Generated: 2026-06-12 00:02:00_

## 1. Row Counts

| Metric | Count |
|--------|-------|
| Total rows in dirty CSV | 500 |
| Exact duplicate rows removed | 15 |
| Rows removed (invalid amount) | 67 |
| **Total rows in clean CSV** | **418** |

## 2. Data Quality Issues Found

| Issue Type | Rows Affected |
|------------|---------------|
| Exact duplicate rows | 15 |
| Missing claim_id | 34 |
| Missing policy_id | 20 |
| Inconsistent member_name casing | 10 |
| claim_type typo / non-standard variant | 345 |
| Missing or invalid diagnosis (N/A / empty) | 18 |
| submitted_amount as comma-formatted string | 6 |
| submitted_amount is negative (flagged & removed) | 8 |
| submitted_amount is zero (flagged & removed) | 5 |
| currency non-standard (e.g. 'Baht', 'vnd') | 296 |
| submitted_date in non-ISO format (converted) | 9 |

## 3. Claims by Type

| Claim Type | Count |
|------------|-------|
| DENTAL | 112 |
| INPATIENT | 106 |
| MATERNITY | 102 |
| OUTPATIENT | 98 |

## 4. Claims by Status

| Status | Count |
|--------|-------|
| APPROVED | 103 |
| IN_REVIEW | 100 |
| PENDING | 111 |
| REJECTED | 104 |

## 5. Average Submitted Amount by Claim Type

| Claim Type | Average Amount |
|------------|----------------|
| DENTAL | 78,119.82 |
| INPATIENT | 77,321.71 |
| MATERNITY | 72,242.03 |
| OUTPATIENT | 85,244.96 |

## 6. Top 5 Most Common Diagnoses

| Rank | Diagnosis | Count |
|------|-----------|-------|
| 1 | Arthritis | 29 |
| 2 | Anxiety | 25 |
| 3 | Fracture | 22 |
| 4 | Diabetes | 21 |
| 5 | COVID-19 | 18 |
