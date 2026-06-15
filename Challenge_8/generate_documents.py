from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).parent
DOCUMENTS = ROOT / "documents"


SAMPLES = [
    (
        "DOC-01-citycare-receipt.png",
        """CITYCARE MEDICAL CENTER - OFFICIAL RECEIPT
Hospital Name: CityCare Medical Center
Patient Name: Anika Sharma
Visit Date: 2024-04-12
Receipt No: RC-240412-018
Items:
Description | Quantity | Unit Price | Total
General consultation | 1 | 1500.00 | 1500.00
Chest X-ray | 1 | 2100.00 | 2100.00
Dispensed medicine | 1 | 1150.00 | 1150.00
Grand Total: 4750.00
Payment Method: Visa card""",
    ),
    (
        "DOC-02-harbour-receipt.png",
        """HARBOUR WOMEN AND CHILDREN CLINIC RECEIPT
Hospital Name: Harbour Women and Children Clinic
Patient Name: Mei Lin Wong
Date of Service: 2024-05-08
Invoice: HW-0581
Items:
Description | Quantity | Unit Price | Total
Antenatal review | 1 | 1800.00 | 1800.00
Ultrasound scan | 1 | 3200.00 | 3200.00
Urine dipstick | 2 | 180.00 | 360.00
Grand Total: 5360.00""",
    ),
    (
        "DOC-03-saigon-receipt-missing-payment.png",
        """SAIGON GENERAL HOSPITAL BILLING RECEIPT
Hospital Name: Saigon General Hospital
Patient Name: Minh Tran
Visit Date: 2024-02-21
Receipt Number: SGH-240221-77
Items:
Description | Quantity | Unit Price | Total
Emergency room fee | 1 | 2500.00 | 2500.00
IV fluids | 2 | 450.00 | 900.00
Blood test panel | 1 | 1250.00 | 1250.00
Grand Total: 4650.00""",
    ),
    (
        "DOC-04-bangkok-discharge.png",
        """BANGKOK EAST HOSPITAL DISCHARGE SUMMARY
Hospital Name: Bangkok East Hospital
Patient Name: Somchai Prasert
Admission Date: 2024-06-03
Discharge Date: 2024-06-07
Primary Diagnosis: J18.9 Pneumonia, unspecified organism
Secondary Diagnosis: E11.9 Type 2 diabetes mellitus without complications
Procedures Performed:
- Chest radiography
- IV antibiotic therapy
Attending Physician: Dr. Narin Chai
Discharge Instructions: Complete antibiotics, perform breathing exercises twice daily, return if fever recurs.""",
    ),
    (
        "DOC-05-queens-discharge.png",
        """QUEENS ROAD MEDICAL CENTER - INPATIENT DISCHARGE NOTE
Hospital Name: Queens Road Medical Center
Patient Name: Grace Chan
Admission Date: 2024-07-14
Discharge Date: 2024-07-16
Primary Diagnosis: K35.80 Acute appendicitis
Secondary Diagnosis: R50.9 Fever, unspecified
Procedures Performed:
- Laparoscopic appendectomy
- Post-operative wound care
Attending Physician: Dr. Helen Ma
Discharge Instructions: Keep wound dry, avoid heavy lifting for 2 weeks, follow up in surgical clinic.""",
    ),
    (
        "DOC-06-lotus-discharge.png",
        """LOTUS INTERNATIONAL HOSPITAL DISCHARGE SUMMARY
Hospital Name: Lotus International Hospital
Patient Name: Priya Nair
Admission Date: 2024-01-25
Discharge Date: 2024-01-29
Primary Diagnosis: O80 Single spontaneous delivery
Secondary Diagnosis: D50.9 Iron deficiency anemia, unspecified
Procedures Performed:
- Normal vaginal delivery
- Newborn assessment
Attending Physician: Dr. Kanya S.
Discharge Instructions: Continue iron tablets, monitor bleeding, attend postpartum review in 7 days.""",
    ),
    (
        "DOC-07-mekong-lab.png",
        """MEKONG DIAGNOSTICS LAB REPORT
Lab Name: Mekong Diagnostics
Patient Name: Dara Nguyen
Report Date: 2024-03-18
Specimen: Whole blood
Tests:
Test Name | Result | Unit | Reference Range | Flag
Hemoglobin | 10.4 | g/dL | 12.0-15.5 | low
WBC | 7.2 | 10^9/L | 4.0-10.0 | normal
Platelets | 465 | 10^9/L | 150-400 | high""",
    ),
    (
        "DOC-08-victoria-lab.png",
        """VICTORIA PATHOLOGY LABORATORY REPORT
Lab Name: Victoria Pathology
Patient Name: Oliver Smith
Date: 2024-09-02
Panel: Liver function
Tests:
Test Name | Result | Unit | Reference Range | Flag
ALT | 66 | U/L | 7-56 | high
AST | 32 | U/L | 10-40 | normal
Bilirubin | 0.8 | mg/dL | 0.1-1.2 | normal""",
    ),
    (
        "DOC-09-family-prescription.png",
        """FAMILY HEALTH CLINIC PRESCRIPTION
Doctor Name: Dr. Lan Pham
Patient Name: Bao Nguyen
Prescription Date: 2024-10-05
Medications:
Name | Dosage | Frequency | Duration | Quantity
Amoxicillin | 500 mg | Three times daily | 5 days | 15 capsules
Paracetamol | 500 mg | Every 6 hours as needed | 3 days | 12 tablets""",
    ),
    (
        "DOC-10-harbour-prescription.png",
        """HARBOUR DENTAL CARE MEDICATION ORDER
Doctor Name: Dr. Victor Lee
Patient Name: Nur Aisyah
Date: 2024-11-11
Medications:
Name | Dosage | Frequency | Duration | Quantity
Ibuprofen | 400 mg | Twice daily after meals | 4 days | 8 tablets
Chlorhexidine mouthwash | 10 mL | Rinse twice daily | 7 days | 1 bottle""",
    ),
]


def draw_document(path: Path, ocr_text: str) -> None:
    width, height = 1300, 1700
    image = Image.new("RGB", (width, height), "#fffdfa")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    heading_font = ImageFont.load_default()

    draw.rectangle((35, 35, width - 35, height - 35), outline="#2f4858", width=3)
    draw.rectangle((35, 35, width - 35, 135), fill="#e9f3f1", outline="#2f4858")

    y = 62
    lines = ocr_text.splitlines()
    draw.text((70, y), lines[0], fill="#12343b", font=heading_font)
    y = 165
    for raw_line in lines[1:]:
        if not raw_line.strip():
            y += 18
            continue
        wrapped = wrap(raw_line, width=118) or [raw_line]
        for line in wrapped:
            draw.text((70, y), line, fill="#1f2933", font=font)
            y += 28
        if raw_line.endswith(":"):
            y += 8

    info = PngImagePlugin.PngInfo()
    info.add_text("ocr_text", ocr_text)
    image.save(path, pnginfo=info)


def main() -> None:
    DOCUMENTS.mkdir(exist_ok=True)
    for old in DOCUMENTS.glob("*.txt"):
        old.unlink()
    for name, text in SAMPLES:
        draw_document(DOCUMENTS / name, text)
    print(f"Generated {len(SAMPLES)} PNG documents in {DOCUMENTS}")


if __name__ == "__main__":
    main()
