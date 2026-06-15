from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import json
import os
import re
from typing import Iterable, Protocol

from PIL import Image


DOCUMENT_TYPES = ("receipt", "discharge_summary", "lab_report", "prescription")
LOW_CONFIDENCE = 0.22


def field(value, confidence: float) -> dict:
    return {"value": value, "confidence": round(float(confidence), 2)}


@dataclass(frozen=True)
class VisionObservation:
    text: str
    provider: str
    confidence: float


class VisionProvider(Protocol):
    def read_document(self, path: Path) -> VisionObservation:
        """Return visible document text from a PDF/image input."""


class LocalVisionSimulator:
    """Deterministic offline vision adapter for generated PNG fixtures.

    The production-facing seam is the VisionProvider protocol. In a real
    deployment, this class is replaced by an OpenAI/Gemini/Claude vision
    adapter that sends the PDF/image bytes and asks for strict JSON. For local
    tests, the generated PNGs include OCR text in metadata so the pipeline can
    exercise classification, extraction, confidence, and validation without
    network credentials.
    """

    def read_document(self, path: Path) -> VisionObservation:
        suffix = path.suffix.lower()
        if suffix != ".png":
            raise ValueError(f"Unsupported local fixture type: {suffix}. Use PNG fixtures or a real vision provider.")

        with Image.open(path) as image:
            text = image.info.get("ocr_text")

        if not text:
            return VisionObservation("", "local-vision-simulator", 0.1)
        return VisionObservation(text.strip(), "local-vision-simulator", 0.93)


class OpenAIVisionProvider:
    """Optional adapter stub for real multimodal extraction.

    It is intentionally lightweight because the repository should run without
    secrets. Set OPENAI_API_KEY and replace this stub with a call to the chosen
    vision model if live AI extraction is needed.
    """

    def read_document(self, path: Path) -> VisionObservation:
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY is required for OpenAIVisionProvider")
        raise NotImplementedError("Wire this adapter to a vision LLM in production.")


def extract_many(paths: Iterable[Path], provider: VisionProvider | None = None) -> list[dict]:
    return [extract(path, provider=provider) for path in sorted(paths, key=lambda p: str(p))]


def extract(path, provider: VisionProvider | None = None) -> dict:
    doc_path = Path(path)
    vision = provider or LocalVisionSimulator()
    observation = vision.read_document(doc_path)
    doc_type, doc_confidence = classify(observation.text)

    if doc_type == "receipt":
        fields = parse_receipt(observation.text)
    elif doc_type == "discharge_summary":
        fields = parse_discharge_summary(observation.text)
    elif doc_type == "lab_report":
        fields = parse_lab_report(observation.text)
    else:
        fields = parse_prescription(observation.text)

    confidence = min(doc_confidence, observation.confidence)
    result = {
        "source_file": doc_path.name,
        "vision_provider": observation.provider,
        "document_type": doc_type,
        "confidence": round(confidence, 2),
        "fields": fields,
        "validation_errors": [],
    }
    result["validation_errors"] = validate(result)
    return result


def classify(text: str) -> tuple[str, float]:
    lower = text.lower()
    scores = {
        "receipt": score_keywords(lower, ["receipt", "grand total", "payment method", "items:", "unit price"]),
        "discharge_summary": score_keywords(
            lower,
            ["discharge summary", "discharge note", "admission date", "discharge date", "procedures performed"],
        ),
        "lab_report": score_keywords(lower, ["lab report", "laboratory report", "reference range", "specimen", "tests:"]),
        "prescription": score_keywords(lower, ["prescription", "medication order", "medications:", "dosage", "frequency"]),
    }
    doc_type = max(scores, key=scores.get)
    confidence = 0.45 + min(scores[doc_type], 5) * 0.1
    return doc_type, min(confidence, 0.96)


def score_keywords(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword in text)


def parse_receipt(text: str) -> dict:
    hospital = first_value(text, ["Hospital Name"]) or infer_provider_from_heading(text, ["tax receipt", "receipt", "tax"])
    items = parse_table(
        text,
        start_label="Items:",
        columns=("description", "quantity", "unit_price", "total"),
        numeric_columns={"quantity", "unit_price", "total"},
    )
    return {
        "hospital_name": field(hospital, confidence_for(hospital, 0.95)),
        "patient_name": field(first_value(text, ["Patient Name", "Patient"]), confidence_for(first_value(text, ["Patient Name", "Patient"]), 0.93)),
        "date": field(first_value(text, ["Visit Date", "Date of Service", "Date"]), confidence_for(first_value(text, ["Visit Date", "Date of Service", "Date"]), 0.9)),
        "items": field(items, 0.84 if items else LOW_CONFIDENCE),
        "grand_total": field(parse_amount(first_value(text, ["Grand Total", "Total Amount"])), confidence_for(first_value(text, ["Grand Total", "Total Amount"]), 0.95)),
        "payment_method": field(
            first_value(text, ["Payment Method", "Paid By"]),
            confidence_for(first_value(text, ["Payment Method", "Paid By"]), 0.88),
        ),
    }


def parse_discharge_summary(text: str) -> dict:
    procedures = parse_bullets_after(text, "Procedures Performed:")
    secondary = first_value(text, ["Secondary Diagnosis"])
    return {
        "hospital_name": field(first_value(text, ["Hospital Name"]), confidence_for(first_value(text, ["Hospital Name"]), 0.95)),
        "patient_name": field(first_value(text, ["Patient Name"]), confidence_for(first_value(text, ["Patient Name"]), 0.93)),
        "admission_date": field(first_value(text, ["Admission Date"]), confidence_for(first_value(text, ["Admission Date"]), 0.9)),
        "discharge_date": field(first_value(text, ["Discharge Date"]), confidence_for(first_value(text, ["Discharge Date"]), 0.9)),
        "diagnosis": field(
            {
                "primary": first_value(text, ["Primary Diagnosis", "Diagnosis"]),
                "secondary": [secondary] if secondary else [],
            },
            0.86,
        ),
        "procedures_performed": field(procedures, 0.82 if procedures else LOW_CONFIDENCE),
        "attending_physician": field(first_value(text, ["Attending Physician", "Doctor Name", "Doctor"]), confidence_for(first_value(text, ["Attending Physician", "Doctor Name", "Doctor"]), 0.84)),
        "discharge_instructions": field(
            first_value(text, ["Discharge Instructions"]),
            confidence_for(first_value(text, ["Discharge Instructions"]), 0.78),
        ),
    }


def parse_lab_report(text: str) -> dict:
    tests = parse_table(
        text,
        start_label="Tests:",
        columns=("test_name", "result", "unit", "reference_range", "flag"),
        numeric_columns=set(),
    )
    for row in tests:
        row["flag"] = str(row["flag"]).lower()

    return {
        "lab_name": field(first_value(text, ["Lab Name"]), confidence_for(first_value(text, ["Lab Name"]), 0.93)),
        "patient_name": field(first_value(text, ["Patient Name"]), confidence_for(first_value(text, ["Patient Name"]), 0.92)),
        "date": field(first_value(text, ["Report Date", "Date"]), confidence_for(first_value(text, ["Report Date", "Date"]), 0.9)),
        "tests": field(tests, 0.82 if tests else LOW_CONFIDENCE),
    }


def parse_prescription(text: str) -> dict:
    medications = parse_table(
        text,
        start_label="Medications:",
        columns=("name", "dosage", "frequency", "duration", "quantity"),
        numeric_columns=set(),
    )
    return {
        "doctor_name": field(first_value(text, ["Doctor Name", "Doctor"]), confidence_for(first_value(text, ["Doctor Name", "Doctor"]), 0.9)),
        "patient_name": field(first_value(text, ["Patient Name"]), confidence_for(first_value(text, ["Patient Name"]), 0.92)),
        "date": field(first_value(text, ["Prescription Date", "Date"]), confidence_for(first_value(text, ["Prescription Date", "Date"]), 0.9)),
        "medications": field(medications, 0.84 if medications else LOW_CONFIDENCE),
    }


def first_value(text: str, labels: list[str]) -> str | None:
    for label in labels:
        pattern = re.compile(rf"^\s*{re.escape(label)}\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE)
        match = pattern.search(text)
        if match:
            value = match.group(1).strip()
            return value if value else None
    return None


def infer_provider_from_heading(text: str, remove_words: list[str]) -> str | None:
    for line in text.splitlines():
        clean = line.strip()
        if clean:
            value = clean
            for word in remove_words:
                value = re.sub(re.escape(word), "", value, flags=re.IGNORECASE)
            value = re.sub(r"\s*-\s*official\s*$", "", value, flags=re.IGNORECASE)
            value = re.sub(r"\s+", " ", value).strip(" -")
            return value or None
    return None


def parse_table(text: str, start_label: str, columns: tuple[str, ...], numeric_columns: set[str]) -> list[dict]:
    lines = text.splitlines()
    rows: list[dict] = []
    in_table = False
    header_seen = False

    for line in lines:
        stripped = line.strip()
        if stripped.lower() == start_label.lower():
            in_table = True
            continue
        if not in_table:
            continue
        if not stripped:
            continue
        if ":" in stripped and "|" not in stripped:
            break
        if "|" not in stripped:
            continue
        parts = [part.strip() for part in stripped.split("|")]
        if not header_seen:
            header_seen = True
            continue
        if len(parts) != len(columns):
            continue
        row = {}
        for key, value in zip(columns, parts):
            row[key] = parse_amount(value) if key in numeric_columns else value
        rows.append(row)
    return rows


def parse_bullets_after(text: str, label: str) -> list[str]:
    lines = text.splitlines()
    items: list[str] = []
    in_section = False
    for line in lines:
        stripped = line.strip()
        if stripped.lower() == label.lower():
            in_section = True
            continue
        if not in_section:
            continue
        if not stripped:
            continue
        if re.match(r"^[A-Za-z ]+:", stripped):
            break
        items.append(stripped.lstrip("- ").strip())
    return items


def parse_amount(value) -> float | None:
    if value is None:
        return None
    text = str(value)
    found = re.search(r"-?\d+(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?", text)
    if not found:
        return None
    return float(found.group(0).replace(",", ""))


def confidence_for(value, high: float) -> float:
    return high if value not in (None, "", []) else LOW_CONFIDENCE


def validate(result: dict) -> list[str]:
    errors: list[str] = []
    fields = result.get("fields", {})

    if not is_confidence(result.get("confidence")):
        errors.append("Confidence out of range: document")

    for name, payload in fields.items():
        if isinstance(payload, dict) and "confidence" in payload and not is_confidence(payload["confidence"]):
            errors.append(f"Confidence out of range: {name}")

    for name, payload in fields.items():
        if "date" in name and isinstance(payload, dict):
            value = payload.get("value")
            if value is not None:
                try:
                    date.fromisoformat(str(value))
                except ValueError:
                    errors.append(f"Invalid date: {name}")

    for name, payload in fields.items():
        if name.endswith("amount") or name in {"grand_total", "unit_price", "total"}:
            amount = payload.get("value") if isinstance(payload, dict) else payload
            if amount is not None and amount <= 0:
                errors.append(f"Amount must be positive: {name}")

    if result.get("document_type") == "receipt":
        total = fields.get("grand_total", {}).get("value")
        items = fields.get("items", {}).get("value") or []
        for item in items:
            for key in ("quantity", "unit_price", "total"):
                value = item.get(key)
                if value is not None and value <= 0:
                    errors.append(f"Amount must be positive: item.{key}")
        item_sum = sum(item.get("total") or 0 for item in items)
        if total is None:
            errors.append("Missing amount: grand_total")
        elif total <= 0:
            errors.append("Amount must be positive: grand_total")
        elif items and abs(item_sum - total) / total > 0.05:
            errors.append("Receipt item totals differ from grand_total by more than 5%")

    return errors


def is_confidence(value) -> bool:
    return isinstance(value, (int, float)) and 0.0 <= float(value) <= 1.0


def main() -> None:
    doc_dir = Path("documents")
    results = extract_many(doc_dir.glob("*.png"))
    Path("extraction_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {len(results)} extraction results")


if __name__ == "__main__":
    main()
