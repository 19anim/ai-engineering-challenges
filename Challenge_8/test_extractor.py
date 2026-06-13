
import glob
import unittest
from extractor import extract

class ExtractorTests(unittest.TestCase):
    def test_all_documents_classified(self):
        results = [extract(path) for path in glob.glob('documents/*.txt')]
        self.assertEqual(len(results), 10)
        self.assertEqual({r['document_type'] for r in results}, {'receipt', 'discharge_summary', 'lab_report', 'prescription'})

    def test_receipt_has_positive_total(self):
        result = extract('documents/DOC-01-receipt.txt')
        self.assertEqual(result['fields']['grand_total']['value'], 1000)
        self.assertEqual(result['validation_errors'], [])

    def test_confidence_scores_are_ranges(self):
        result = extract('documents/DOC-10-prescription.txt')
        self.assertGreaterEqual(result['confidence'], 0)
        self.assertLessEqual(result['confidence'], 1)
        self.assertLess(result['fields']['medications']['confidence'], 1)

if __name__ == '__main__':
    unittest.main()
