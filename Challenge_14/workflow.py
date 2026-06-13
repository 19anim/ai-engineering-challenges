
import datetime
import json

class WorkflowError(Exception): pass

class AuditTrail(tuple):
    def append(self, value): raise TypeError('audit trail is immutable')
    def clear(self): raise TypeError('audit trail is immutable')

class Engine:
    def __init__(self, config='workflow.json'):
        with open(config) as f:
            self.config=json.load(f)
        self.claims={}; self._audit=[]
    @property
    def audit(self): return AuditTrail(self._audit)
    def create(self, claim_id): self.claims[claim_id]={'state':self.config['initial'],'info_cycles':0}; return self.claims[claim_id]
    def valid_transitions(self, claim_id):
        state=self.claims[claim_id]['state']; return [t for t in self.config['transitions'] if t['from']==state]
    def transition(self, claim_id, to_state, user, context):
        claim=self.claims.setdefault(claim_id, {'state':self.config['initial'],'info_cycles':0})
        matches=[t for t in self.config['transitions'] if t['from']==claim['state'] and t['to']==to_state]
        if not matches: raise WorkflowError(f"Invalid transition from {claim['state']} to {to_state}")
        t=matches[0]
        if user['role'] not in t['roles']: raise WorkflowError(f"Role {user['role']} is not authorized; requires {', '.join(t['roles'])}")
        missing=[p for p in t['preconditions'] if not context.get(p)]
        if missing: raise WorkflowError('Precondition failed: '+', '.join(missing))
        if claim['state']=='UNDER_ASSESSMENT' and to_state=='PENDING_INFO':
            claim['info_cycles'] += 1
            if claim['info_cycles'] > 3: raise WorkflowError('Maximum information requests exceeded - escalate to team lead')
        old=claim['state']; claim['state']=to_state
        entry={'timestamp':datetime.datetime.now(datetime.UTC).isoformat(),'claim_id':claim_id,'from_state':old,'to_state':to_state,'triggered_by':dict(user),'reason':context.get('reason',''),'notes':context.get('notes',''),'side_effects':list(t['side_effects'])}
        self._audit.append(entry)
        return entry
    def audit_for(self, claim_id): return [a for a in self._audit if a['claim_id']==claim_id]
