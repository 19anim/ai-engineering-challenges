
import json
import unittest
from agent import assess

def load_cases():
    with open('test_cases.json') as f:
        return json.load(f)

class AgentTests(unittest.TestCase):
    def test_expected_outcomes(self):
        for case in load_cases():
            self.assertEqual(assess(case)['recommendation'], case['expected'])
    def test_all_tools_are_used(self):
        report = assess(load_cases()[0])
        self.assertEqual({x['tool'] for x in report['tool_log']}, {'verifyDocument','lookupPolicy','checkMedicalNecessity','calculateBenefit'})
    def test_all_documents_checked(self):
        case = load_cases()[2]
        report = assess(case)
        self.assertEqual(len([x for x in report['tool_log'] if x['tool']=='verifyDocument']), 2)
    def test_rejects_member_mismatch(self):
        case = {**load_cases()[0], 'member_id': 'MBR-WRONG'}
        self.assertEqual(assess(case)['recommendation'], 'REJECT')

if __name__ == '__main__': unittest.main()
