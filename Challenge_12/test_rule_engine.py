
import json
import unittest
from rule_engine import validate, diff

def load_claims():
    with open('test_claims.json') as f:
        return json.load(f)

class RuleEngineTests(unittest.TestCase):
    def test_all_claims_validate(self): self.assertEqual(len([validate(c) for c in load_claims()]), 15)
    def test_document_failure_is_actionable(self): self.assertIn('Missing required document', validate(load_claims()[1])['results'][0]['explanation'])
    def test_diff_identifies_sla_difference(self): self.assertIn('sla_check', diff('TH','VN'))
    def test_masking_applied(self): self.assertTrue(validate(load_claims()[0])['masked_fields'])
    def test_status_values(self): self.assertIn(validate(load_claims()[0])['status'], {'COMPLIANT','PARTIALLY_COMPLIANT','NON_COMPLIANT'})

if __name__ == '__main__': unittest.main()
