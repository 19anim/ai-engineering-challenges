
import csv
import unittest
from fraud_engine import score_claims, metrics

class FraudTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open('claims.csv') as f:
            cls.rows = list(csv.DictReader(f))
        cls.scored = score_claims(cls.rows)

    def test_scores_all_claims(self): self.assertEqual(len(self.scored), 2000)
    def test_duplicate_rule(self): self.assertTrue(any('duplicate' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_rapid_resubmission_rule(self): self.assertTrue(any('rapid_resubmission' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_upcoding_rule(self): self.assertTrue(any('upcoding' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_unbundling_rule(self): self.assertTrue(any('unbundling' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_phantom_billing_rule(self): self.assertTrue(any('phantom_billing' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_mismatch_rule(self): self.assertTrue(any('diagnosis_procedure_mismatch' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_amount_clustering_rule(self): self.assertTrue(any('amount_clustering' in [f['rule'] for f in r['flags']] for r in self.scored))
    def test_ranked(self): self.assertGreaterEqual(self.scored[0]['risk_score'], self.scored[-1]['risk_score'])
    def test_metrics_have_recall(self): self.assertIn('recall', metrics(self.scored))
    def test_scores_in_range(self): self.assertTrue(all(0 <= r['risk_score'] <= 100 for r in self.scored))
    def test_flags_have_evidence(self): self.assertTrue(all(f['evidence'] for r in self.scored for f in r['flags']))
    def test_weighted_flags_increase_score(self): self.assertGreater(self.scored[0]['risk_score'], 0)
    def test_known_fraud_present(self): self.assertEqual(sum(r['known_fraud']=='True' for r in self.scored), 200)
    def test_false_positive_rate_key(self): self.assertIn('false_positive_rate', metrics(self.scored))

if __name__ == '__main__': unittest.main()
