"""
test_solution.py
Comprehensive test suite that proves the data generation and cleaning pipeline
is correct. Runs assertions against dirty_claims.csv, clean_claims.csv, and
report.md, then prints a clear PASS / FAIL summary.
"""

import csv
import re
import sys
import unittest
from datetime import datetime
from collections import Counter, defaultdict

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DIRTY_CSV = "Challenge_2/dirty_claims.csv"
CLEAN_CSV = "Challenge_2/clean_claims.csv"
REPORT_MD = "Challenge_2/report.md"

VALID_CLAIM_TYPES = {"OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"}
VALID_STATUSES    = {"APPROVED", "REJECTED", "PENDING", "IN_REVIEW"}
VALID_CURRENCIES  = {"THB", "VND", "USD"}
ISO_DATE_RE       = re.compile(r"^\d{4}-\d{2}-\d{2}$")

results = []   # list of (test_name, passed, detail)


def check(name: str, condition: bool, detail: str = ""):
    results.append((name, condition, detail))


# ── Load files ────────────────────────────────────────────────────────────────

def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


dirty = load_csv(DIRTY_CSV)
clean = load_csv(CLEAN_CSV)

with open(REPORT_MD, encoding="utf-8") as f:
    report_text = f.read()


# ════════════════════════════════════════════════════════════════════════════
# SECTION A — Dirty CSV sanity checks
# ════════════════════════════════════════════════════════════════════════════

check("A1: dirty CSV has 500 rows", len(dirty) == 500,
      f"actual={len(dirty)}")

check("A2: dirty CSV has 9 columns",
      set(dirty[0].keys()) == {
          "claim_id","policy_id","member_name","claim_type",
          "diagnosis","submitted_amount","currency","submitted_date","status"},
      f"columns={set(dirty[0].keys())}")

# Dirty CSV should contain at least some issues in each category
missing_ids   = sum(1 for r in dirty if not r["claim_id"].strip())
missing_pols  = sum(1 for r in dirty if not r["policy_id"].strip())
bad_dates     = sum(1 for r in dirty if not ISO_DATE_RE.match(r["submitted_date"].strip()))
bad_amounts   = sum(1 for r in dirty if "," in r["submitted_amount"]
                    or (r["submitted_amount"].strip().lstrip("-").replace(".","",1).isdigit()
                        and float(r["submitted_amount"].replace(",","")) <= 0))
bad_curr      = sum(1 for r in dirty if r["currency"].strip() not in VALID_CURRENCIES)
bad_ct        = sum(1 for r in dirty if r["claim_type"].strip() not in VALID_CLAIM_TYPES)
na_diag       = sum(1 for r in dirty if r["diagnosis"].strip().lower() in {"n/a","na","unknown",""})

# Duplicate rows
seen = set()
dup_count = 0
for row in dirty:
    key = tuple(row.values())
    if key in seen:
        dup_count += 1
    seen.add(key)

check("A3: dirty CSV has ≥1 missing claim_id",   missing_ids  >= 1, f"count={missing_ids}")
check("A4: dirty CSV has ≥1 missing policy_id",  missing_pols >= 1, f"count={missing_pols}")
check("A5: dirty CSV has ≥1 non-ISO date",        bad_dates    >= 1, f"count={bad_dates}")
check("A6: dirty CSV has ≥1 invalid amount",      bad_amounts  >= 1, f"count={bad_amounts}")
check("A7: dirty CSV has ≥1 non-standard currency", bad_curr   >= 1, f"count={bad_curr}")
check("A8: dirty CSV has ≥1 non-canonical claim_type", bad_ct  >= 1, f"count={bad_ct}")
check("A9: dirty CSV has ≥1 N/A or empty diagnosis", na_diag   >= 1, f"count={na_diag}")
check("A10: dirty CSV has ≥1 exact duplicate row", dup_count   >= 1, f"count={dup_count}")

# Overall dirty rate ≥ 15%
rows_with_any_issue = sum(
    1 for r in dirty
    if not r["claim_id"].strip()
    or not r["policy_id"].strip()
    or not ISO_DATE_RE.match(r["submitted_date"].strip())
    or r["currency"].strip() not in VALID_CURRENCIES
    or r["claim_type"].strip() not in VALID_CLAIM_TYPES
    or r["diagnosis"].strip().lower() in {"n/a","na","unknown",""}
)
dirty_pct = rows_with_any_issue / len(dirty) * 100
check("A11: ≥15% of dirty rows have at least one issue",
      dirty_pct >= 15, f"{dirty_pct:.1f}%")


# ════════════════════════════════════════════════════════════════════════════
# SECTION B — Clean CSV correctness
# ════════════════════════════════════════════════════════════════════════════

check("B1: clean CSV has fewer rows than dirty CSV",
      len(clean) < len(dirty), f"dirty={len(dirty)}, clean={len(clean)}")

# No non-ISO dates
bad_dates_clean = [r for r in clean if not ISO_DATE_RE.match(r["submitted_date"].strip())]
check("B2: clean CSV has 0 non-ISO dates",
      len(bad_dates_clean) == 0,
      f"bad rows={[r['submitted_date'] for r in bad_dates_clean[:5]]}")

# No negative or zero amounts
bad_amounts_clean = []
for r in clean:
    try:
        v = float(r["submitted_amount"])
        if v <= 0:
            bad_amounts_clean.append(r)
    except ValueError:
        bad_amounts_clean.append(r)
check("B3: clean CSV has 0 invalid amounts (≤0 or unparseable)",
      len(bad_amounts_clean) == 0,
      f"bad rows={len(bad_amounts_clean)}")

# No comma-formatted amounts
comma_amounts = [r for r in clean if "," in r["submitted_amount"]]
check("B4: clean CSV has 0 comma-formatted amounts",
      len(comma_amounts) == 0,
      f"examples={[r['submitted_amount'] for r in comma_amounts[:3]]}")

# All currencies are valid ISO uppercase
bad_curr_clean = [r for r in clean if r["currency"].strip() not in VALID_CURRENCIES]
check("B5: clean CSV has 0 non-standard currencies",
      len(bad_curr_clean) == 0,
      f"bad={[r['currency'] for r in bad_curr_clean[:5]]}")

# All claim_types are canonical
bad_ct_clean = [r for r in clean if r["claim_type"].strip() not in VALID_CLAIM_TYPES]
check("B6: clean CSV has 0 non-canonical claim_types",
      len(bad_ct_clean) == 0,
      f"bad={[r['claim_type'] for r in bad_ct_clean[:5]]}")

# All statuses are valid
bad_status_clean = [r for r in clean if r["status"].strip() not in VALID_STATUSES]
check("B7: clean CSV has 0 invalid statuses",
      len(bad_status_clean) == 0,
      f"bad={[r['status'] for r in bad_status_clean[:5]]}")

# No exact duplicates in clean CSV
seen_clean = set()
dup_clean = 0
for row in clean:
    key = tuple(row.values())
    if key in seen_clean:
        dup_clean += 1
    seen_clean.add(key)
check("B8: clean CSV has 0 exact duplicate rows",
      dup_clean == 0, f"duplicates={dup_clean}")

# member_name is Title Case
bad_names = [r for r in clean
             if r["member_name"].strip() and r["member_name"].strip() != r["member_name"].strip().title()]
check("B9: all member_names in clean CSV are Title Case",
      len(bad_names) == 0,
      f"bad examples={[r['member_name'] for r in bad_names[:3]]}")

# diagnosis null marker is consistent (no "N/A", "n/a", "Unknown")
bad_diag = [r for r in clean if r["diagnosis"].strip().lower() in {"n/a","na","unknown"}]
check("B10: clean CSV has 0 N/A / Unknown diagnoses (replaced with empty string)",
      len(bad_diag) == 0,
      f"bad={[r['diagnosis'] for r in bad_diag[:3]]}")

# Dates are valid calendar dates
bad_cal = []
for r in clean:
    try:
        datetime.strptime(r["submitted_date"].strip(), "%Y-%m-%d")
    except ValueError:
        bad_cal.append(r["submitted_date"])
check("B11: all dates in clean CSV are valid calendar dates",
      len(bad_cal) == 0, f"bad={bad_cal[:5]}")


# ════════════════════════════════════════════════════════════════════════════
# SECTION C — Report completeness
# ════════════════════════════════════════════════════════════════════════════

check("C1: report contains Row Counts section",
      "## 1. Row Counts" in report_text)

check("C2: report contains Data Quality Issues section",
      "## 2. Data Quality Issues Found" in report_text)

check("C3: report contains Claims by Type section",
      "## 3. Claims by Type" in report_text)

check("C4: report contains Claims by Status section",
      "## 4. Claims by Status" in report_text)

check("C5: report contains Average Amount by Type section",
      "## 5. Average Submitted Amount by Claim Type" in report_text)

check("C6: report contains Top 5 Diagnoses section",
      "## 6. Top 5 Most Common Diagnoses" in report_text)

# Report row counts match actual files
report_before = re.search(r"Total rows in dirty CSV\s*\|\s*(\d+)", report_text)
report_after  = re.search(r"\*\*Total rows in clean CSV\*\*\s*\|\s*\*\*(\d+)\*\*", report_text)

check("C7: report 'before' count matches dirty CSV row count",
      report_before is not None and int(report_before.group(1)) == len(dirty),
      f"report={report_before.group(1) if report_before else 'N/A'}, actual={len(dirty)}")

check("C8: report 'after' count matches clean CSV row count",
      report_after is not None and int(report_after.group(1)) == len(clean),
      f"report={report_after.group(1) if report_after else 'N/A'}, actual={len(clean)}")

# Report claims-by-type matches clean CSV
actual_by_type = Counter(r["claim_type"] for r in clean)
for ct, cnt in actual_by_type.items():
    pattern = rf"\|\s*{ct}\s*\|\s*{cnt}\s*\|"
    check(f"C9: report claims-by-type correct for {ct}",
          bool(re.search(pattern, report_text)),
          f"expected {ct}={cnt}")

# Report top-5 diagnoses are actually the top 5
diag_counter = Counter(r["diagnosis"] for r in clean if r["diagnosis"].strip())
top5 = [d for d, _ in diag_counter.most_common(5)]
for diag in top5:
    check(f"C10: top-5 diagnosis '{diag}' appears in report",
          diag in report_text)

# Report has all 4 claim types listed
for ct in VALID_CLAIM_TYPES:
    check(f"C11: report lists claim type {ct}",
          ct in report_text)

# Report has all 4 statuses listed
for st in VALID_STATUSES:
    check(f"C12: report lists status {st}",
          st in report_text)


# ════════════════════════════════════════════════════════════════════════════
# SECTION D — Cross-validation
# ════════════════════════════════════════════════════════════════════════════

# Duplicates removed = dirty - deduped
seen2 = set()
deduped_count = 0
for row in dirty:
    key = tuple(row.values())
    if key not in seen2:
        seen2.add(key)
        deduped_count += 1
actual_dups_removed = len(dirty) - deduped_count

report_dups = re.search(r"Exact duplicate rows removed\s*\|\s*(\d+)", report_text)
check("D1: report duplicate count matches actual duplicates in dirty CSV",
      report_dups is not None and int(report_dups.group(1)) == actual_dups_removed,
      f"report={report_dups.group(1) if report_dups else 'N/A'}, actual={actual_dups_removed}")

# Rows removed = deduped_count - len(clean)
actual_removed = deduped_count - len(clean)
report_removed = re.search(r"Rows removed \(invalid amount\)\s*\|\s*(\d+)", report_text)
check("D2: report 'rows removed' count matches actual",
      report_removed is not None and int(report_removed.group(1)) == actual_removed,
      f"report={report_removed.group(1) if report_removed else 'N/A'}, actual={actual_removed}")

# Average amounts in report match computed averages from clean CSV
amounts_by_type = defaultdict(list)
for r in clean:
    try:
        amounts_by_type[r["claim_type"]].append(float(r["submitted_amount"]))
    except ValueError:
        pass
for ct, vals in amounts_by_type.items():
    expected_avg = sum(vals) / len(vals)
    # Find the value in the report (allow ±1 rounding)
    pattern = rf"\|\s*{ct}\s*\|\s*([\d,]+\.\d{{2}})\s*\|"
    m = re.search(pattern, report_text)
    if m:
        reported_avg = float(m.group(1).replace(",", ""))
        close_enough = abs(reported_avg - expected_avg) < 1.0
    else:
        close_enough = False
    check(f"D3: average amount for {ct} in report matches computed value",
          close_enough,
          f"expected={expected_avg:.2f}, reported={m.group(1) if m else 'N/A'}")


# ════════════════════════════════════════════════════════════════════════════
# PRINT RESULTS
# ════════════════════════════════════════════════════════════════════════════

passed = sum(1 for _, p, _ in results if p)
failed = sum(1 for _, p, _ in results if not p)
total  = len(results)

print("=" * 70)
print(f"  TEST RESULTS — AI Challenge 02 Verification")
print("=" * 70)

sections = {
    "A": "Dirty CSV sanity checks",
    "B": "Clean CSV correctness",
    "C": "Report completeness",
    "D": "Cross-validation",
}

current_section = None
for name, passed_flag, detail in results:
    section = name[0]
    if section != current_section:
        current_section = section
        print(f"\n── {sections[section]} ──")
    status = "✅ PASS" if passed_flag else "❌ FAIL"
    line = f"  {status}  {name}: {name.split(':',1)[-1] if ':' in name else name}"
    # name already contains the description after the colon
    # rebuild cleanly
    print(f"  {'✅ PASS' if passed_flag else '❌ FAIL'}  {name}" +
          (f"  [{detail}]" if detail and not passed_flag else ""))

print()
print("=" * 70)
print(f"  TOTAL: {passed}/{total} passed  |  {failed} failed")
print("=" * 70)

if failed > 0:
    print("\nFailed tests:")
    for name, passed_flag, detail in results:
        if not passed_flag:
            print(f"  ✗ {name}  →  {detail}")
else:
    print("\n  All tests passed. Solution is verified correct.")


class Challenge02SolutionTests(unittest.TestCase):
    def test_all_verification_checks_pass(self):
        self.assertEqual(failed, 0)
