import tempfile
import unittest
from pathlib import Path

from PIL import Image, PngImagePlugin

import extractor
from extractor import extract, field, validate


ROOT = Path(__file__).parent
DOCUMENTS = ROOT / "documents"


class MedicalDocumentExtractorTests(unittest.TestCase):
    def test_processes_ten_image_documents_with_required_mix(self):
        paths = sorted(DOCUMENTS.glob("*.png"))
        self.assertEqual(len(paths), 10)
        self.assertTrue(hasattr(extractor, "extract_many"), "extract_many(paths) is required")

        results = extractor.extract_many(paths)
        counts = {}
        for result in results:
            counts[result["document_type"]] = counts.get(result["document_type"], 0) + 1

        self.assertEqual(
            counts,
            {
                "receipt": 3,
                "discharge_summary": 3,
                "lab_report": 2,
                "prescription": 2,
            },
        )
        self.assertTrue(all(result["confidence"] >= 0.75 for result in results))

    def test_receipt_extracts_visible_line_items_and_balances_total(self):
        result = extract(DOCUMENTS / "DOC-01-citycare-receipt.png")

        self.assertEqual(result["document_type"], "receipt")
        self.assertEqual(result["fields"]["hospital_name"]["value"], "CityCare Medical Center")
        self.assertEqual(result["fields"]["patient_name"]["value"], "Anika Sharma")
        self.assertEqual(len(result["fields"]["items"]["value"]), 3)
        self.assertEqual(result["fields"]["grand_total"]["value"], 4750.0)
        self.assertEqual(result["validation_errors"], [])

    def test_no_hallucination_for_missing_payment_method(self):
        result = extract(DOCUMENTS / "DOC-03-saigon-receipt-missing-payment.png")

        self.assertEqual(result["document_type"], "receipt")
        self.assertIsNone(result["fields"]["payment_method"]["value"])
        self.assertLessEqual(result["fields"]["payment_method"]["confidence"], 0.35)
        self.assertNotIn("Cash", str(result["fields"]["payment_method"]["value"]))

    def test_discharge_summary_extracts_dates_diagnosis_and_instructions(self):
        result = extract(DOCUMENTS / "DOC-04-bangkok-discharge.png")

        self.assertEqual(result["document_type"], "discharge_summary")
        self.assertEqual(result["fields"]["admission_date"]["value"], "2024-06-03")
        self.assertEqual(result["fields"]["discharge_date"]["value"], "2024-06-07")
        self.assertEqual(result["fields"]["diagnosis"]["value"]["primary"], "J18.9 Pneumonia, unspecified organism")
        self.assertIn("breathing exercises", result["fields"]["discharge_instructions"]["value"])

    def test_lab_report_extracts_multiple_tests_with_flags(self):
        result = extract(DOCUMENTS / "DOC-07-mekong-lab.png")

        self.assertEqual(result["document_type"], "lab_report")
        tests = result["fields"]["tests"]["value"]
        self.assertGreaterEqual(len(tests), 3)
        self.assertEqual(
            {row["test_name"]: row["flag"] for row in tests},
            {"Hemoglobin": "low", "WBC": "normal", "Platelets": "high"},
        )

    def test_prescription_extracts_medication_rows(self):
        result = extract(DOCUMENTS / "DOC-09-family-prescription.png")

        self.assertEqual(result["document_type"], "prescription")
        meds = result["fields"]["medications"]["value"]
        self.assertEqual(len(meds), 2)
        self.assertEqual(meds[0]["name"], "Amoxicillin")
        self.assertEqual(meds[0]["frequency"], "Three times daily")

    def test_validation_flags_invalid_dates_non_positive_amounts_and_total_mismatch(self):
        result = {
            "document_type": "receipt",
            "confidence": 0.91,
            "fields": {
                "date": field("2024-02-31", 0.91),
                "items": field(
                    [
                        {"description": "Consultation", "quantity": 1, "unit_price": 1000.0, "total": 1000.0},
                        {"description": "Medicine", "quantity": 1, "unit_price": 1000.0, "total": 1000.0},
                    ],
                    0.82,
                ),
                "grand_total": field(2500.0, 0.95),
                "payment_method": field(None, 0.2),
            },
            "validation_errors": [],
        }

        errors = validate(result)

        self.assertIn("Invalid date: date", errors)
        self.assertIn("Receipt item totals differ from grand_total by more than 5%", errors)

        result["fields"]["grand_total"] = field(0, 0.95)
        self.assertIn("Amount must be positive: grand_total", validate(result))

    def test_validation_rejects_out_of_range_confidence(self):
        result = {
            "document_type": "prescription",
            "confidence": 1.1,
            "fields": {
                "doctor_name": field("Dr. Nguyen", 0.91),
                "patient_name": field("Minh Tran", -0.1),
                "date": field("2024-05-01", 0.9),
                "medications": field([], 0.4),
            },
            "validation_errors": [],
        }

        errors = validate(result)

        self.assertIn("Confidence out of range: document", errors)
        self.assertIn("Confidence out of range: patient_name", errors)

    def test_field_confidence_scores_are_meaningful_not_uniform(self):
        result = extract(DOCUMENTS / "DOC-02-harbour-receipt.png")
        scores = {payload["confidence"] for payload in result["fields"].values()}

        self.assertGreaterEqual(len(scores), 3)
        self.assertTrue(any(score < 0.7 for score in scores))
        self.assertTrue(any(score > 0.9 for score in scores))

    def test_pipeline_reusable_for_unseen_receipt_image(self):
        ocr_text = """
        NORTH CLINIC TAX RECEIPT
        Patient Name: Lina Park
        Visit Date: 2024-08-18
        Items:
        Service | Qty | Unit Price | Total
        Dressing change | 1 | 600.00 | 600.00
        Tetanus vaccine | 1 | 850.00 | 850.00
        Grand Total: 1450.00
        Payment Method: Mobile wallet
        """.strip()

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unseen.png"
            info = PngImagePlugin.PngInfo()
            info.add_text("ocr_text", ocr_text)
            Image.new("RGB", (900, 600), "white").save(path, pnginfo=info)

            result = extract(path)

        self.assertEqual(result["document_type"], "receipt")
        self.assertEqual(result["fields"]["hospital_name"]["value"], "NORTH CLINIC")
        self.assertEqual(result["fields"]["patient_name"]["value"], "Lina Park")
        self.assertEqual(result["fields"]["grand_total"]["value"], 1450.0)
        self.assertEqual(result["validation_errors"], [])


if __name__ == "__main__":
    unittest.main()
