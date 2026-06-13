
import unittest
from workflow import Engine, WorkflowError

class WorkflowTests(unittest.TestCase):
    def setUp(self): self.e=Engine(); self.e.create('c')
    def test_valid_transition(self): self.e.transition('c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'},{'documents_present':1}); self.assertEqual(self.e.claims['c']['state'],'DOCUMENTS_VERIFIED')
    def test_invalid_transition(self): self.assertRaises(WorkflowError,self.e.transition,'c','APPROVED',{'id':'u','role':'assessor'}, {})
    def test_unauthorized_role(self): self.assertRaises(WorkflowError,self.e.transition,'c','DOCUMENTS_VERIFIED',{'id':'u','role':'assessor'}, {'documents_present':1})
    def test_precondition_failure(self): self.assertRaises(WorkflowError,self.e.transition,'c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'}, {})
    def test_audit_written(self): self.e.transition('c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'},{'documents_present':1}); self.assertEqual(len(self.e.audit_for('c')),1)
    def test_audit_immutable(self): self.assertRaises(TypeError,self.e.audit.append,{})
    def test_valid_transitions_include_role(self): self.assertEqual(self.e.valid_transitions('c')[0]['roles'], ['document_clerk'])
    def test_cycle_limit(self):
        self.e.claims['c']['state']='UNDER_ASSESSMENT'
        for _ in range(3):
            self.e.transition('c','PENDING_INFO',{'id':'u','role':'assessor'},{'missing_info_description':1}); self.e.claims['c']['state']='UNDER_ASSESSMENT'
        self.assertRaises(WorkflowError,self.e.transition,'c','PENDING_INFO',{'id':'u','role':'assessor'},{'missing_info_description':1})
    def test_rejection_to_closed_role(self): self.e.claims['c']['state']='REJECTED'; self.e.transition('c','CLOSED',{'id':'sys','role':'system'},{'appeal_period_expired':1}); self.assertEqual(self.e.claims['c']['state'],'CLOSED')
    def test_payment_to_closed(self): self.e.claims['c']['state']='PAYMENT_INITIATED'; self.e.transition('c','CLOSED',{'id':'f','role':'finance'},{'payment_confirmed':1}); self.assertEqual(self.e.claims['c']['state'],'CLOSED')
    def test_side_effects_returned(self): entry=self.e.transition('c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'},{'documents_present':1}); self.assertIn('notify_assessor_team',entry['side_effects'])
    def test_specific_error_message(self):
        with self.assertRaisesRegex(WorkflowError,'Invalid transition from SUBMITTED to APPROVED'): self.e.transition('c','APPROVED',{'id':'u','role':'assessor'}, {})
    def test_user_recorded(self): entry=self.e.transition('c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'},{'documents_present':1}); self.assertEqual(entry['triggered_by']['id'],'u')
    def test_reason_recorded(self): entry=self.e.transition('c','DOCUMENTS_VERIFIED',{'id':'u','role':'document_clerk'},{'documents_present':1,'reason':'ok'}); self.assertEqual(entry['reason'],'ok')
    def test_create_initial_state(self): self.assertEqual(self.e.claims['c']['state'],'SUBMITTED')

if __name__ == '__main__': unittest.main()
