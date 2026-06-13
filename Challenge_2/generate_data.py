"""
generate_data.py
Generates a dirty CSV of 500 insurance claims with intentional data quality issues.
Approximately 15-20% of rows will have at least one issue.
"""

import csv
import random
import string
from datetime import date, timedelta

random.seed(42)

# ── Base data pools ──────────────────────────────────────────────────────────

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
    "Linda", "William", "Barbara", "David", "Susan", "Richard", "Jessica",
    "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Lisa", "Nguyen",
    "Tran", "Le", "Pham", "Hoang", "Somchai", "Malee", "Prasert", "Niran",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Nguyen", "Tran", "Le", "Pham",
    "Charoenwong", "Srisuk", "Tanaka", "Yamamoto",
]

CLAIM_TYPES_CLEAN = ["OUTPATIENT", "INPATIENT", "DENTAL", "MATERNITY"]

# Dirty variants for claim_type
CLAIM_TYPE_DIRTY_MAP = {
    "OUTPATIENT": ["OUTPATIENT", "outpatient", "Outpateint", "OP", "Out Patient"],
    "INPATIENT":  ["INPATIENT",  "inpatient",  "In Patient",  "IP", "Inpateint"],
    "DENTAL":     ["DENTAL",     "dental",     "Dentall",     "DNT"],
    "MATERNITY":  ["MATERNITY",  "maternity",  "Maternty",    "MAT"],
}

DIAGNOSES = [
    "Flu", "Hypertension", "Diabetes", "Back Pain", "Fracture",
    "Appendicitis", "Migraine", "Asthma", "COVID-19", "Pneumonia",
    "Gastritis", "Kidney Stone", "Dengue Fever", "Anemia", "Arthritis",
    "Pregnancy", "Tooth Decay", "Gum Disease", "Root Canal", "Wisdom Tooth",
    "Chest Pain", "Urinary Infection", "Skin Rash", "Allergy", "Anxiety",
]

CURRENCIES_CLEAN = ["THB", "VND", "USD"]

# Dirty variants for currency
CURRENCY_DIRTY_MAP = {
    "THB": ["THB", "thb", "Baht", "baht", "BAHT"],
    "VND": ["VND", "vnd", "Dong", "dong"],
    "USD": ["USD", "usd", "Dollar"],
}

STATUSES = ["APPROVED", "REJECTED", "PENDING", "IN_REVIEW"]


# ── Helper functions ─────────────────────────────────────────────────────────

def random_date(start_year=2023, end_year=2024) -> date:
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    return start + timedelta(days=random.randint(0, (end - start).days))


def format_date_clean(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def format_date_dirty(d: date) -> str:
    """Return one of three date formats at random."""
    fmt = random.choice(["iso", "dmy", "long"])
    if fmt == "iso":
        return d.strftime("%Y-%m-%d")
    elif fmt == "dmy":
        return d.strftime("%d/%m/%Y")
    else:
        return d.strftime("%B %d, %Y")


def make_claim_id(n: int) -> str:
    return f"CLM-{n:05d}"


def make_policy_id() -> str:
    return f"POL-{random.randint(100, 999)}"


def random_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def dirty_name(name: str) -> str:
    style = random.choice(["upper", "lower", "title"])
    if style == "upper":
        return name.upper()
    elif style == "lower":
        return name.lower()
    return name  # title case (already default)


def random_amount() -> float:
    return round(random.uniform(500, 150000), 2)


def dirty_amount(amount: float) -> str:
    """Return amount as a comma-formatted string, negative, or zero."""
    choice = random.choice(["comma_str", "negative", "zero"])
    if choice == "comma_str":
        return f"{amount:,.2f}"
    elif choice == "negative":
        return str(-abs(amount))
    else:
        return "0"


# ── Main generation ──────────────────────────────────────────────────────────

def generate_rows(n: int = 500) -> list[dict]:
    rows = []
    claim_counter = 1

    for i in range(n):
        # Base clean values
        claim_id = make_claim_id(claim_counter)
        claim_counter += 1
        policy_id = make_policy_id()
        name = random_name()
        claim_type_key = random.choice(CLAIM_TYPES_CLEAN)
        diagnosis = random.choice(DIAGNOSES)
        amount = random_amount()
        currency_key = random.choice(CURRENCIES_CLEAN)
        d = random_date()
        status = random.choice(STATUSES)

        # Decide whether this row gets dirty (target ~18% of rows)
        make_dirty = random.random() < 0.18

        row = {
            "claim_id": claim_id,
            "policy_id": policy_id,
            "member_name": name,
            "claim_type": random.choice(CLAIM_TYPE_DIRTY_MAP[claim_type_key]),
            "diagnosis": diagnosis,
            "submitted_amount": str(amount),
            "currency": random.choice(CURRENCY_DIRTY_MAP[currency_key]),
            "submitted_date": format_date_dirty(d) if make_dirty else format_date_clean(d),
            "status": status,
        }

        if make_dirty:
            # Pick 1–3 additional issues to inject
            issues = random.sample([
                "missing_claim_id",
                "missing_policy_id",
                "dirty_name",
                "dirty_diagnosis",
                "dirty_amount",
            ], k=random.randint(1, 3))

            for issue in issues:
                if issue == "missing_claim_id":
                    row["claim_id"] = ""
                elif issue == "missing_policy_id":
                    row["policy_id"] = ""
                elif issue == "dirty_name":
                    row["member_name"] = dirty_name(name)
                elif issue == "dirty_diagnosis":
                    row["diagnosis"] = random.choice(["N/A", "n/a", "", "Unknown"])
                elif issue == "dirty_amount":
                    row["submitted_amount"] = dirty_amount(amount)

        rows.append(row)

    # Inject ~3% exact duplicate rows (replace some rows with copies of earlier rows)
    num_dupes = int(n * 0.03)
    dupe_sources = random.sample(range(len(rows) // 2), k=num_dupes)
    dupe_targets = random.sample(range(len(rows) // 2, len(rows)), k=num_dupes)
    for src, tgt in zip(dupe_sources, dupe_targets):
        rows[tgt] = dict(rows[src])

    random.shuffle(rows)
    return rows


FIELDNAMES = [
    "claim_id", "policy_id", "member_name", "claim_type",
    "diagnosis", "submitted_amount", "currency", "submitted_date", "status",
]


def main():
    rows = generate_rows(500)
    output_path = "Challenge_2/dirty_claims.csv"
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows → {output_path}")


if __name__ == "__main__":
    main()