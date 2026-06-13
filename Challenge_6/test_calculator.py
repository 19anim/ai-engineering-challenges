
import json
import unittest
from calculator import calculate_claims

class CalculatorTests(unittest.TestCase):
    def setUp(self):
        with open('policy.json') as f:
            self.policy = json.load(f)
        with open('expenses.json') as f:
            self.expenses = json.load(f)

    def calc(self, rows):
        return calculate_claims(self.policy, rows)['results']

    def test_normal_coverage_with_copay(self):
        self.assertEqual(self.calc([self.expenses[0]])[0]['covered_amount'], 2400)

    def test_per_visit_limit_reduces_claim(self):
        self.assertEqual(self.calc([{**self.expenses[0], 'amount': 9000}])[0]['covered_amount'], 2400)

    def test_waiting_period_denial(self):
        early_dental = {**self.expenses[2], 'date': '2024-02-15'}
        self.assertEqual(self.calc([early_dental])[0]['decision'], 'DENIED')

    def test_exclusion_denial(self):
        self.assertEqual(self.calc([self.expenses[8]])[0]['decision'], 'DENIED')

    def test_chronological_processing_consumes_limit(self):
        out = self.calc(self.expenses)
        self.assertLess(out[-1]['remaining_annual_limit'], 100000)

    def test_limit_exhaustion(self):
        rows = [{**self.expenses[0], 'expense_id': str(i), 'amount': 90000} for i in range(60)]
        self.assertEqual(self.calc(rows)[-1]['decision'], 'DENIED')

    def test_summary_present(self):
        self.assertIn('OUTPATIENT', calculate_claims(self.policy, self.expenses)['summary'])

    def test_member_pays_balances(self):
        r = self.calc([self.expenses[0]])[0]
        self.assertEqual(r['submitted_amount'], r['covered_amount'] + r['member_pays'])

    def test_partial_decision_for_limited_visit(self):
        self.assertEqual(self.calc([{**self.expenses[0], 'amount': 9000}])[0]['decision'], 'PARTIALLY_COVERED')

    def test_reusable_no_policy_mutation(self):
        self.calc([self.expenses[0]])
        self.assertEqual(self.policy['benefits']['OUTPATIENT']['annual_limit'], 100000)

if __name__ == '__main__':
    unittest.main()
