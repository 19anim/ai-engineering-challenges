
import json
from pathlib import Path

def load_rules(country):
    with open(Path('rules') / f'{country}.json') as f:
        return json.load(f)['rules']

def active(rule, submitted_date):
    return rule['effective_date'] <= submitted_date and (not rule.get('expiry_date') or submitted_date <= rule['expiry_date'])

def mask_value(value, mode):
    value=str(value or '')
    if mode=='last4': return '*' * max(0, len(value)-4) + value[-4:]
    if mode=='initials': return value[:1] + '***' + (value.split()[-1][:1] if value.split() else '')
    if mode=='first_last': return value[:1] + '*****' + value[-1:]
    return value

def validate(claim):
    results=[]; masked={}
    for rule in [r for r in load_rules(claim['country']) if active(r, claim['submitted_date'])]:
        p=rule['parameters']; passed=True; explanation='Passed'; remediation=''
        if rule['rule_type']=='document_requirement':
            required=list(p.get('base', []))+list(p.get('by_claim_type', {}).get(claim['claim_type'], []))
            missing=[doc for doc in required if doc not in claim.get('documents', [])]
            passed=not missing; explanation='Passed' if passed else 'Missing required document: '+', '.join(missing); remediation='' if passed else 'Collect missing document before assessment'
        elif rule['rule_type']=='sla_check':
            limit=p.get(claim['claim_type'], p.get('ALL'))
            passed=claim['processing_days'] <= limit; explanation='Passed' if passed else f"Processing exceeded SLA of {limit} business days"; remediation='' if passed else 'Escalate to operations lead'
        elif rule['rule_type']=='waiting_period':
            limit=p.get(claim.get('condition_type','general'), p['general'])
            passed=claim['policy_age_days'] >= limit; explanation='Passed' if passed else f"Policy age below waiting period of {limit} days"; remediation='' if passed else 'Hold claim until waiting period is met'
        elif rule['rule_type']=='data_masking':
            masked[p['field']]=mask_value(claim.get(p['field']), p['mode'])
        elif rule['rule_type']=='coverage_mandate':
            passed=True
        results.append({'rule_id':rule['rule_id'],'rule_type':rule['rule_type'],'passed':passed,'explanation':explanation,'remediation':remediation})
    status='COMPLIANT' if all(r['passed'] for r in results) else ('NON_COMPLIANT' if not any(r['passed'] for r in results) else 'PARTIALLY_COMPLIANT')
    return {'claim_id':claim['claim_id'],'country':claim['country'],'status':status,'masked_fields':masked,'results':results}

def diff(country_a, country_b):
    a={r['rule_type']:r['parameters'] for r in load_rules(country_a)}; b={r['rule_type']:r['parameters'] for r in load_rules(country_b)}
    return {k:{country_a:a.get(k),country_b:b.get(k)} for k in sorted(set(a)|set(b)) if a.get(k)!=b.get(k)}
