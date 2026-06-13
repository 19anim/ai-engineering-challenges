
POLICIES={
 'POL-A':{'active':True,'member':'MBR-1','coverage':['OUTPATIENT'],'limit':20000,'copay':0.2,'effective':'2024-01-01','expiry':'2024-12-31','clauses':{'coverage':'C1 outpatient covered','limit':'C2 annual outpatient limit','documents':'C3 receipts and prescriptions required'}},
 'POL-B':{'active':True,'member':'MBR-2','coverage':['DENTAL'],'limit':5000,'copay':0.3,'effective':'2024-01-01','expiry':'2024-12-31','exclusions':['cosmetic'],'clauses':{'exclusion':'E1 cosmetic dental excluded','documents':'E2 dental receipt required'}},
 'POL-C':{'active':True,'member':'MBR-3','coverage':['INPATIENT'],'limit':100000,'copay':0,'effective':'2024-01-01','expiry':'2024-12-31','clauses':{'documents':'D1 inpatient discharge summary and receipt required','limit':'D2 inpatient limit'}}}
DOCS={'D1':{'document_type':'receipt','complete':True,'issues':[]},'D2':{'document_type':'prescription','complete':True,'issues':[]},'D3':{'document_type':'receipt','complete':False,'issues':['image is blurry and total is unreadable']}}

def lookupPolicy(policyId): return POLICIES[policyId]
def calculateBenefit(policyId, claimType, amount):
    p=lookupPolicy(policyId); allowed=min(amount,p['limit']); copay=round(allowed*p.get('copay',0),2); return {'submitted_amount':amount,'covered_amount':round(allowed-copay,2),'copay':copay,'remaining_limit':p['limit']-allowed}
def verifyDocument(documentId): return DOCS.get(documentId,{'document_type':'missing','complete':False,'issues':['document not submitted']})
def checkMedicalNecessity(diagnosis, procedures): return {'appropriate':'cosmetic' not in diagnosis.lower(),'reason':'Treatment is mapped to diagnosis' if 'cosmetic' not in diagnosis.lower() else 'Cosmetic treatment is not medically necessary'}

def assess(case):
    log=[]; review=[]
    for doc_id in case.get('documents', []) + case.get('missing_documents', []):
        out=verifyDocument(doc_id); log.append({'tool':'verifyDocument','input':doc_id,'output':out}); review.append({'document_id':doc_id,**out})
    policy=lookupPolicy(case['policy_id']); log.append({'tool':'lookupPolicy','input':case['policy_id'],'output':policy})
    medical=checkMedicalNecessity(case['diagnosis'],case['procedures']); log.append({'tool':'checkMedicalNecessity','input':{'diagnosis':case['diagnosis'],'procedures':case['procedures']},'output':medical})
    benefit=calculateBenefit(case['policy_id'],case['claim_type'],case['amount']); log.append({'tool':'calculateBenefit','input':{'policy_id':case['policy_id'],'claim_type':case['claim_type'],'amount':case['amount']},'output':benefit})
    member_ok=case['member_id']==policy['member']
    policy_ok=policy['active'] and member_ok and policy['effective'] <= case['treatment_date'] <= policy['expiry'] and case['claim_type'] in policy['coverage']
    if any(not d['complete'] for d in review): rec='REQUEST_MORE_INFO'; reason='Required documents are missing or incomplete; cite '+policy['clauses'].get('documents','documents')
    elif not policy_ok: rec='REJECT'; reason='Claim is outside active policy coverage; cite '+policy['clauses'].get('coverage','coverage')
    elif not medical['appropriate'] or any(x in case['diagnosis'].lower() for x in policy.get('exclusions', [])): rec='REJECT'; reason='Treatment is excluded or not medically necessary; cite '+policy['clauses'].get('exclusion','medical necessity')
    elif benefit['covered_amount'] <= 0: rec='REJECT'; reason='No payable benefit remains; cite '+policy['clauses'].get('limit','limit')
    else: rec='APPROVE'; reason='Documents complete, policy active, treatment necessary, and benefit is within limit; cite '+', '.join(policy['clauses'].values())
    return {'document_review':review,'policy_verification':{'active':policy['active'],'member_covered':case['member_id']==policy['member'],'claim_type_included':case['claim_type'] in policy['coverage']},'medical_necessity':medical,'benefit_calculation':benefit,'recommendation':rec,'reasoning':reason,'policy_citations':policy['clauses'],'tool_log':log}
