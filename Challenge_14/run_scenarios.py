
import json
from workflow import Engine, WorkflowError

def user(role): return {'id': role+'-1', 'role': role}
def attempt(engine, claim, to, role, ctx):
    try: return engine.transition(claim, to, user(role), ctx)
    except WorkflowError as exc: return {'error': str(exc)}

e=Engine(); results={}
e.create('happy')
for to, role, ctx in [('DOCUMENTS_VERIFIED','document_clerk',{'documents_present':1}),('UNDER_ASSESSMENT','team_lead',{'assessor_assigned':1}),('APPROVED','assessor',{'report_complete':1,'within_limit':1}),('PAYMENT_INITIATED','finance',{'payment_request_created':1}),('CLOSED','finance',{'payment_confirmed':1})]: attempt(e,'happy',to,role,ctx)
results['happy_path']=e.audit_for('happy')
e.create('rejected')
for to, role, ctx in [('DOCUMENTS_VERIFIED','document_clerk',{'documents_present':1}),('UNDER_ASSESSMENT','team_lead',{'assessor_assigned':1}),('REJECTED','assessor',{'report_complete':1,'rejection_reason':1}),('CLOSED','system',{'appeal_period_expired':1})]: attempt(e,'rejected',to,role,ctx)
results['rejection_path']=e.audit_for('rejected')
e.create('info')
for to, role, ctx in [('DOCUMENTS_VERIFIED','document_clerk',{'documents_present':1}),('UNDER_ASSESSMENT','team_lead',{'assessor_assigned':1}),('PENDING_INFO','assessor',{'missing_info_description':1}),('DOCUMENTS_VERIFIED','document_clerk',{'new_info_received':1}),('UNDER_ASSESSMENT','team_lead',{'assessor_assigned':1}),('APPROVED','assessor',{'report_complete':1,'within_limit':1}),('PAYMENT_INITIATED','finance',{'payment_request_created':1}),('CLOSED','finance',{'payment_confirmed':1})]: attempt(e,'info',to,role,ctx)
results['info_loop']=e.audit_for('info')
e.create('invalid'); results['invalid_transition']=attempt(e,'invalid','APPROVED','assessor',{})
e.create('unauthorized'); results['unauthorized_role']=attempt(e,'unauthorized','DOCUMENTS_VERIFIED','assessor',{'documents_present':1})
json.dump(results,open('scenario_results.json','w'),indent=2); json.dump(e.audit,open('audit_trail_output.json','w'),indent=2); print('scenarios written')
