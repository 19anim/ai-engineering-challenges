"""
clean_data.py
Reads dirty_claims.csv, applies all cleaning rules, writes clean_claims.csv,
and produces a data quality report (report.md).
"""

import csv
import re
from datetime import datetime
from collections import Counter, defaultdict

# ── Paths ────────────────────────────────────────────────────────────────────

DIRTY_CSV  = "Challenge_2/dirty_claims.csv"
CLEAN_CSV  = "Challenge_2/clean_claims.csv"
REPORT_MD  = "Challenge_2/report.md"

FIELDNAMES = [
    "claim_id", "policy_id", "member_name", "claim_type",
    "diagnosis", "submitted_amount", "currency", "submitted_date", "status",
]

# ── Lookup tables ─────────────────────────────────────────────────────────────

# Canonical claim_type mapping (lowercase key → canonical value)
CLAIM_TYPE_MAP = {
    "outpatient":  "OUTPATIENT",
    "outpateint":  "OUTPATIENT",
    "out patient": "OUTPATIENT",
    "op":          "OUTPATIENT",
    "inpatient":   "INPATIENT",
    "inpateint":   "INPATIENT",
    "in patient":  "INPATIENT",
    "ip":          "INPATIENT",
    "dental":      "DENTAL",
    "dentall":     "DENTAL",
    "dnt":         "DENTAL",
    "maternity":   "MATERNITY",
    "maternty":    "MATERNITY",
    "mat":         "MATERNITY",
}

# Canonical currency mapping (lowercase key → ISO code)
CURRENCY_MAP = {
    "thb":    "THB",
    "baht":   "THB",
    "vnd":    "VND",
    "dong":   "VND",
    "usd":    "USD",
    "dollar": "USD",
}

VALID_STATUSES = {"APPROVED", "REJECTED", "PENDING", "IN_REVIEW"}

NULL_MARKER = ""   # We use empty string as the consistent null marker in CSV


# ── Cleaning helpers ──────────────────────────────────────────────────────────

def normalize_claim_type(value: str) -> tuple[str, bool]:
    """Return (canonical_value, was_changed)."""
    stripped = value.strip()
    canonical = CLAIM_TYPE_MAP.get(stripped.lower())
    if canonical:
        return canonical, (canonical != stripped)
    # Already canonical?
    if stripped.upper() in {"OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"}:
        return stripped.upper(), (stripped.upper() != stripped)
    return stripped, False   # unknown — leave as-is, flag separately


def normalize_currency(value: str) -> tuple[str, bool]:
    """Return (ISO_code, was_changed)."""
    stripped = value.strip()
    canonical = CURRENCY_MAP.get(stripped.lower())
    if canonical:
        return canonical, (canonical != stripped)
    upper = stripped.upper()
    return upper, (upper != stripped)


def parse_date(value: str) -> tuple[str | None, bool]:
    """
    Try to parse value into YYYY-MM-DD.
    Returns (iso_string_or_None, was_changed).
    """
    stripped = value.strip()
    formats = [
        ("%Y-%m-%d", False),       # already ISO
        ("%d/%m/%Y", True),        # DD/MM/YYYY
        ("%B %d, %Y", True),       # Month DD, YYYY
        ("%b %d, %Y", True),       # Mon DD, YYYY
    ]
    for fmt, changed in formats:
        try:
            dt = datetime.strptime(stripped, fmt)
            iso = dt.strftime("%Y-%m-%d")
            return iso, (iso != stripped)
        except ValueError:
            continue
    return None, True   # unparseable


def parse_amount(value: str) -> tuple[float | None, str]:
    """
    Parse submitted_amount.
    Returns (float_or_None, issue_tag).
    issue_tag: 'ok' | 'comma_string' | 'negative' | 'zero' | 'unparseable'
    """
    stripped = value.strip()
    # Remove commas (e.g. "15,000.00")
    cleaned = stripped.replace(",", "")
    try:
        amount = float(cleaned)
    except ValueError:
        return None, "unparseable"

    if amount < 0:
        return amount, "negative"
    if amount == 0:
        return amount, "zero"
    if "," in stripped:
        return amount, "comma_string"
    return amount, "ok"


def normalize_diagnosis(value: str) -> tuple[str, bool]:
    """Replace N/A variants and empty strings with NULL_MARKER."""
    stripped = value.strip()
    if stripped.lower() in {"n/a", "na", "unknown", ""}:
        return NULL_MARKER, True
    return stripped, False


def normalize_name(value: str) -> tuple[str, bool]:
    """Title-case the member name."""
    stripped = value.strip()
    titled = stripped.title()
    return titled, (titled != stripped)


def normalize_status(value: str) -> tuple[str, bool]:
    """Uppercase and validate status."""
    stripped = value.strip().upper()
    return stripped, (stripped != value.strip())


# ── Issue tracking ────────────────────────────────────────────────────────────

class IssueTracker:
    def __init__(self):
        self.counts: dict[str, int] = defaultdict(int)

    def flag(self, issue: str):
        self.counts[issue] += 1

    def summary(self) -> dict[str, int]:
        return dict(self.counts)


# ── Main pipeline ─────────────────────────────────────────────────────────────

def load_csv(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def clean(rows: list[dict]) -> tuple[list[dict], IssueTracker, int]:
    tracker = IssueTracker()

    # ── Step 1: Remove exact duplicates ──────────────────────────────────────
    seen = set()
    deduped = []
    for row in rows:
        key = tuple(row[f] for f in FIELDNAMES)
        if key in seen:
            tracker.flag("duplicate_rows")
        else:
            seen.add(key)
            deduped.append(row)

    duplicates_removed = len(rows) - len(deduped)
    rows = deduped

    # ── Step 2: Clean each row ────────────────────────────────────────────────
    clean_rows = []
    flagged_rows = []   # rows removed due to invalid amounts

    for row in rows:
        row_issues = []

        # claim_id — remove rows with missing claim_id
        if not row["claim_id"].strip():
            tracker.flag("missing_claim_id")
            row_issues.append("missing_claim_id")
            flagged_rows.append(row)
            continue

        # policy_id — remove rows with missing policy_id
        if not row["policy_id"].strip():
            tracker.flag("missing_policy_id")
            row_issues.append("missing_policy_id")
            flagged_rows.append(row)
            continue

        # member_name
        name, name_changed = normalize_name(row["member_name"])
        if name_changed:
            tracker.flag("inconsistent_name_casing")
            row_issues.append("inconsistent_name_casing")
        row["member_name"] = name

        # claim_type
        ct, ct_changed = normalize_claim_type(row["claim_type"])
        if ct_changed:
            tracker.flag("claim_type_typo_or_variant")
            row_issues.append("claim_type_typo_or_variant")
        row["claim_type"] = ct

        # diagnosis
        diag, diag_changed = normalize_diagnosis(row["diagnosis"])
        if diag_changed:
            tracker.flag("missing_or_invalid_diagnosis")
            row_issues.append("missing_or_invalid_diagnosis")
        row["diagnosis"] = diag

        # submitted_amount
        amount, amount_issue = parse_amount(row["submitted_amount"])
        if amount_issue == "comma_string":
            tracker.flag("amount_comma_string")
            row_issues.append("amount_comma_string")
            row["submitted_amount"] = f"{amount:.2f}"
        elif amount_issue == "negative":
            tracker.flag("amount_negative")
            row_issues.append("amount_negative")
            # Flag and remove
            row["submitted_amount"] = f"{amount:.2f}"
            flagged_rows.append(row)
            continue
        elif amount_issue == "zero":
            tracker.flag("amount_zero")
            row_issues.append("amount_zero")
            # Flag and remove
            row["submitted_amount"] = "0.00"
            flagged_rows.append(row)
            continue
        elif amount_issue == "unparseable":
            tracker.flag("amount_unparseable")
            row_issues.append("amount_unparseable")
            flagged_rows.append(row)
            continue
        else:
            row["submitted_amount"] = f"{amount:.2f}"

        # currency
        curr, curr_changed = normalize_currency(row["currency"])
        if curr_changed:
            tracker.flag("currency_non_standard")
            row_issues.append("currency_non_standard")
        row["currency"] = curr

        # submitted_date
        iso_date, date_changed = parse_date(row["submitted_date"])
        if iso_date is None:
            tracker.flag("date_unparseable")
            row_issues.append("date_unparseable")
            # Keep original but mark
        else:
            if date_changed:
                tracker.flag("date_non_iso_format")
                row_issues.append("date_non_iso_format")
            row["submitted_date"] = iso_date

        # status
        status, status_changed = normalize_status(row["status"])
        if status not in VALID_STATUSES:
            tracker.flag("invalid_status")
            row_issues.append("invalid_status")
        elif status_changed:
            tracker.flag("status_casing")
            row_issues.append("status_casing")
        row["status"] = status

        clean_rows.append(row)

    return clean_rows, tracker, duplicates_removed


def write_clean_csv(rows: list[dict], path: str):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(
    dirty_rows: list[dict],
    clean_rows: list[dict],
    tracker: IssueTracker,
    duplicates_removed: int,
    path: str,
):
    total_before = len(dirty_rows)
    total_after  = len(clean_rows)
    rows_removed = total_before - duplicates_removed - total_after

    # Summary stats on clean data
    claims_by_type   = Counter(r["claim_type"] for r in clean_rows)
    claims_by_status = Counter(r["status"]     for r in clean_rows)

    # Average amount by claim type
    amounts_by_type: dict[str, list[float]] = defaultdict(list)
    for r in clean_rows:
        try:
            amounts_by_type[r["claim_type"]].append(float(r["submitted_amount"]))
        except ValueError:
            pass
    avg_by_type = {
        ct: sum(vals) / len(vals)
        for ct, vals in amounts_by_type.items()
        if vals
    }

    # Top 5 diagnoses (exclude null marker)
    diag_counter = Counter(
        r["diagnosis"] for r in clean_rows if r["diagnosis"] != NULL_MARKER
    )
    top5_diagnoses = diag_counter.most_common(5)

    lines = []
    lines.append("# Data Quality Report — Insurance Claims")
    lines.append("")
    lines.append(f"_Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")
    lines.append("")

    # ── Row counts ────────────────────────────────────────────────────────────
    lines.append("## 1. Row Counts")
    lines.append("")
    lines.append(f"| Metric | Count |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Total rows in dirty CSV | {total_before} |")
    lines.append(f"| Exact duplicate rows removed | {duplicates_removed} |")
    lines.append(f"| Rows removed (invalid amount) | {rows_removed} |")
    lines.append(f"| **Total rows in clean CSV** | **{total_after}** |")
    lines.append("")

    # ── Issue counts ──────────────────────────────────────────────────────────
    lines.append("## 2. Data Quality Issues Found")
    lines.append("")
    lines.append("| Issue Type | Rows Affected |")
    lines.append("|------------|---------------|")

    issue_labels = {
        "duplicate_rows":               "Exact duplicate rows",
        "missing_claim_id":             "Missing claim_id",
        "missing_policy_id":            "Missing policy_id",
        "inconsistent_name_casing":     "Inconsistent member_name casing",
        "claim_type_typo_or_variant":   "claim_type typo / non-standard variant",
        "missing_or_invalid_diagnosis": "Missing or invalid diagnosis (N/A / empty)",
        "amount_comma_string":          "submitted_amount as comma-formatted string",
        "amount_negative":              "submitted_amount is negative (flagged & removed)",
        "amount_zero":                  "submitted_amount is zero (flagged & removed)",
        "amount_unparseable":           "submitted_amount unparseable (flagged & removed)",
        "currency_non_standard":        "currency non-standard (e.g. 'Baht', 'vnd')",
        "date_non_iso_format":          "submitted_date in non-ISO format (converted)",
        "date_unparseable":             "submitted_date unparseable",
        "invalid_status":               "status value not in allowed set",
        "status_casing":                "status casing corrected",
    }

    summary = tracker.summary()
    for key, label in issue_labels.items():
        count = summary.get(key, 0)
        if count > 0:
            lines.append(f"| {label} | {count} |")

    lines.append("")

    # ── Claims by type ────────────────────────────────────────────────────────
    lines.append("## 3. Claims by Type")
    lines.append("")
    lines.append("| Claim Type | Count |")
    lines.append("|------------|-------|")
    for ct, cnt in sorted(claims_by_type.items()):
        lines.append(f"| {ct} | {cnt} |")
    lines.append("")

    # ── Claims by status ──────────────────────────────────────────────────────
    lines.append("## 4. Claims by Status")
    lines.append("")
    lines.append("| Status | Count |")
    lines.append("|--------|-------|")
    for st, cnt in sorted(claims_by_status.items()):
        lines.append(f"| {st} | {cnt} |")
    lines.append("")

    # ── Average amount by type ────────────────────────────────────────────────
    lines.append("## 5. Average Submitted Amount by Claim Type")
    lines.append("")
    lines.append("| Claim Type | Average Amount |")
    lines.append("|------------|----------------|")
    for ct, avg in sorted(avg_by_type.items()):
        lines.append(f"| {ct} | {avg:,.2f} |")
    lines.append("")

    # ── Top 5 diagnoses ───────────────────────────────────────────────────────
    lines.append("## 6. Top 5 Most Common Diagnoses")
    lines.append("")
    lines.append("| Rank | Diagnosis | Count |")
    lines.append("|------|-----------|-------|")
    for rank, (diag, cnt) in enumerate(top5_diagnoses, start=1):
        lines.append(f"| {rank} | {diag} | {cnt} |")
    lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Report written → {path}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    print(f"Loading dirty data from {DIRTY_CSV} ...")
    dirty_rows = load_csv(DIRTY_CSV)
    print(f"  {len(dirty_rows)} rows loaded.")

    print("Cleaning data ...")
    clean_rows, tracker, duplicates_removed = clean(dirty_rows)
    print(f"  {len(clean_rows)} rows after cleaning.")

    print(f"Writing clean CSV → {CLEAN_CSV} ...")
    write_clean_csv(clean_rows, CLEAN_CSV)

    print("Generating report ...")
    generate_report(dirty_rows, clean_rows, tracker, duplicates_removed, REPORT_MD)

    print("\nDone!")
    print(f"  Dirty CSV  : {DIRTY_CSV}")
    print(f"  Clean CSV  : {CLEAN_CSV}")
    print(f"  Report     : {REPORT_MD}")


if __name__ == "__main__":
    main()