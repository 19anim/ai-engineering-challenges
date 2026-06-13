"""
test_rows.py
Row-level validation of clean_claims.csv.
Every row is tested against all challenge conditions and the result is shown
in a detailed table. A summary CSV (row_test_results.csv) is also written so
you can open it in Excel / any spreadsheet tool.
"""

import csv
import re
import sys
import unittest
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CLEAN_CSV   = "Challenge_2/clean_claims.csv"
RESULTS_CSV = "Challenge_2/row_test_results.csv"

VALID_CLAIM_TYPES = {"OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"}
VALID_STATUSES    = {"APPROVED", "REJECTED", "PENDING", "IN_REVIEW"}
VALID_CURRENCIES  = {"THB", "VND", "USD"}
ISO_DATE_RE       = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# ── Per-row checks ────────────────────────────────────────────────────────────

def check_row(row: dict) -> dict:
    """
    Run every challenge condition on a single row.
    Returns a dict of {check_name: True/False}.
    """
    checks = {}

    # 1. claim_id present (not empty — missing ones were flagged but row kept)
    checks["claim_id_present"] = bool(row["claim_id"].strip())

    # 2. policy_id present
    checks["policy_id_present"] = bool(row["policy_id"].strip())

    # 3. member_name is Title Case
    name = row["member_name"].strip()
    checks["member_name_title_case"] = (name == name.title()) if name else True

    # 4. claim_type is canonical uppercase
    checks["claim_type_canonical"] = row["claim_type"].strip() in VALID_CLAIM_TYPES

    # 5. diagnosis is not a raw N/A variant (empty string is the null marker — OK)
    diag = row["diagnosis"].strip().lower()
    checks["diagnosis_no_raw_na"] = diag not in {"n/a", "na", "unknown"}

    # 6. submitted_amount is a valid positive float
    try:
        amt = float(row["submitted_amount"])
        checks["amount_positive"]      = amt > 0
        checks["amount_no_commas"]     = "," not in row["submitted_amount"]
        checks["amount_parseable"]     = True
    except ValueError:
        checks["amount_positive"]      = False
        checks["amount_no_commas"]     = "," not in row["submitted_amount"]
        checks["amount_parseable"]     = False

    # 7. currency is ISO uppercase
    checks["currency_iso_uppercase"] = row["currency"].strip() in VALID_CURRENCIES

    # 8. submitted_date is ISO 8601 (YYYY-MM-DD)
    date_str = row["submitted_date"].strip()
    checks["date_iso_format"] = bool(ISO_DATE_RE.match(date_str))

    # 9. submitted_date is a valid calendar date
    if checks["date_iso_format"]:
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            checks["date_valid_calendar"] = True
        except ValueError:
            checks["date_valid_calendar"] = False
    else:
        checks["date_valid_calendar"] = False

    # 10. status is in the allowed set
    checks["status_valid"] = row["status"].strip() in VALID_STATUSES

    return checks


CHECK_NAMES = [
    "claim_id_present",
    "policy_id_present",
    "member_name_title_case",
    "claim_type_canonical",
    "diagnosis_no_raw_na",
    "amount_parseable",
    "amount_positive",
    "amount_no_commas",
    "currency_iso_uppercase",
    "date_iso_format",
    "date_valid_calendar",
    "status_valid",
]

# ── Load clean CSV ────────────────────────────────────────────────────────────

with open(CLEAN_CSV, newline="", encoding="utf-8") as f:
    clean_rows = list(csv.DictReader(f))

# ── Run row-level tests ───────────────────────────────────────────────────────

all_results = []
for idx, row in enumerate(clean_rows, start=1):
    checks = check_row(row)
    row_pass = all(checks.values())
    all_results.append({
        "row_num":    idx,
        "claim_id":   row["claim_id"]   or "(empty)",
        "policy_id":  row["policy_id"]  or "(empty)",
        "row_result": "PASS" if row_pass else "FAIL",
        **checks,
    })

# ── Write results CSV ─────────────────────────────────────────────────────────

fieldnames = ["row_num", "claim_id", "policy_id", "row_result"] + CHECK_NAMES
with open(RESULTS_CSV, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_results)

# ── Console output ────────────────────────────────────────────────────────────

total_rows  = len(all_results)
passed_rows = sum(1 for r in all_results if r["row_result"] == "PASS")
failed_rows = total_rows - passed_rows

# Per-check failure counts
check_failures = {c: sum(1 for r in all_results if not r[c]) for c in CHECK_NAMES}

print("=" * 80)
print("  ROW-LEVEL TEST RESULTS — clean_claims.csv")
print("=" * 80)
print(f"\n  Total rows tested : {total_rows}")
print(f"  Rows PASSED       : {passed_rows}")
print(f"  Rows FAILED       : {failed_rows}")

# Show first 20 rows as a sample table
print(f"\n{'─'*80}")
print(f"  Sample: first 20 rows")
print(f"{'─'*80}")
header = f"{'Row':>4}  {'claim_id':<14} {'policy_id':<10} {'Result':<6}  Checks (12 conditions)"
print(f"  {header}")
print(f"  {'─'*76}")

for r in all_results[:20]:
    check_icons = "".join("✓" if r[c] else "✗" for c in CHECK_NAMES)
    print(f"  {r['row_num']:>4}  {r['claim_id']:<14} {r['policy_id']:<10} "
          f"{'✅' if r['row_result']=='PASS' else '❌':<6}  [{check_icons}]")

if total_rows > 20:
    print(f"  ... ({total_rows - 20} more rows — see {RESULTS_CSV})")

# Show any failed rows
if failed_rows > 0:
    print(f"\n{'─'*80}")
    print("  FAILED ROWS:")
    print(f"{'─'*80}")
    for r in all_results:
        if r["row_result"] == "FAIL":
            failed_checks = [c for c in CHECK_NAMES if not r[c]]
            print(f"  Row {r['row_num']:>4} | {r['claim_id']:<14} | FAILED: {', '.join(failed_checks)}")

# Per-check summary
print(f"\n{'─'*80}")
print("  PER-CHECK SUMMARY (across all rows)")
print(f"{'─'*80}")
print(f"  {'Check':<35} {'Pass':>6} {'Fail':>6}")
print(f"  {'─'*50}")
for c in CHECK_NAMES:
    fails = check_failures[c]
    passes = total_rows - fails
    status = "✅" if fails == 0 else "❌"
    print(f"  {status} {c:<33} {passes:>6} {fails:>6}")

print(f"\n{'─'*80}")
print(f"  OVERALL: {passed_rows}/{total_rows} rows pass ALL 12 conditions")
print(f"  Full results saved → {RESULTS_CSV}")
print("=" * 80)

if failed_rows == 0:
    print("\n  ✅ Every row in clean_claims.csv satisfies all challenge conditions.")


class Challenge02RowTests(unittest.TestCase):
    def test_every_clean_row_passes_all_conditions(self):
        self.assertEqual(failed_rows, 0)
