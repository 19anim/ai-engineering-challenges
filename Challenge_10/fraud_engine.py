
from collections import defaultdict
from datetime import date
import statistics
WEIGHTS={'duplicate':5,'rapid_resubmission':3,'upcoding':4,'unbundling':3,'phantom_billing':5,'weekend_anomaly':3,'diagnosis_procedure_mismatch':4,'amount_clustering':2}
BUNDLES={'BUNDLE_A':{'P1','P2'},'BUNDLE_B':{'P3','P4'},'BUNDLE_C':{'P5','P6'},'BUNDLE_D':{'P7','P8'},'BUNDLE_E':{'P9','P10'}}
VALID={f'D{i}':{f'P{i}',f'P{i+1}'} for i in range(1,11)}

def _prep(rows):
    out=[]
    for r in rows:
        x=dict(r); x['submitted_amount']=float(x['submitted_amount']); x['procedure_codes']=x['procedure_codes'].split('|'); out.append(x)
    return out

def score_claims(rows):
    rows=_prep(rows); by_key=defaultdict(list); by_provider_day=defaultdict(list); by_proc=defaultdict(list); weekend=defaultdict(lambda:[0,0])
    for r in rows:
        by_key[(r['member_id'],r['provider_id'],r['claim_date'],r['diagnosis_code'])].append(r); by_provider_day[(r['provider_id'],r['claim_date'])].append(r)
        for proc in r['procedure_codes']: by_proc[proc].append(r['submitted_amount'])
        weekend[r['provider_id']][1]+=1; weekend[r['provider_id']][0]+=r['is_weekend']=='True'
    scored=[]
    for r in rows:
        flags=[]
        def add(rule, severity, evidence): flags.append({'rule':rule,'severity':severity,'evidence':evidence})
        if len(by_key[(r['member_id'],r['provider_id'],r['claim_date'],r['diagnosis_code'])])>1: add('duplicate',5,'Same member, provider, date, and diagnosis appears more than once.')
        rd=date.fromisoformat(r['claim_date'])
        for other in rows:
            if other is not r and other['member_id']==r['member_id'] and other['diagnosis_code']==r['diagnosis_code'] and 0 <= (rd-date.fromisoformat(other['claim_date'])).days <= 7:
                add('rapid_resubmission',3,'Same member and diagnosis resubmitted within 7 days.'); break
        for proc in r['procedure_codes']:
            vals=by_proc[proc]
            if len(vals)>2 and statistics.pstdev(vals)>0 and r['submitted_amount'] > statistics.mean(vals)+2*statistics.pstdev(vals): add('upcoding',4,f"Amount {r['submitted_amount']:.0f} is >2 standard deviations above mean for {proc}.")
        for bundle, parts in BUNDLES.items():
            if parts.issubset(set(r['procedure_codes'])) and bundle not in r['procedure_codes']: add('unbundling',3,f"Procedures {sorted(parts)} should be billed as {bundle}.")
        if len(by_provider_day[(r['provider_id'],r['claim_date'])])>30: add('phantom_billing',5,'Provider submitted more than 30 claims in one day.')
        if r['is_weekend']=='True' and any(proc.startswith('SURG') for proc in r['procedure_codes']) and weekend[r['provider_id']][0]/weekend[r['provider_id']][1] < .05: add('weekend_anomaly',3,'Weekend surgery from provider with <5% historical weekend volume.')
        if not set(r['procedure_codes']) & VALID.get(r['diagnosis_code'],set()) and not any(proc.startswith('SURG') for proc in r['procedure_codes']): add('diagnosis_procedure_mismatch',4,'Procedure is not clinically associated with diagnosis mapping.')
        if 47500 <= r['submitted_amount'] <= 49999: add('amount_clustering',2,'Amount is within 5% below the 50,000 auto-approval threshold.')
        score=min(100, round(sum(WEIGHTS[f['rule']]*f['severity'] for f in flags)/70*100))
        scored.append({'claim_id':r['claim_id'],'risk_score':score,'flags':flags,'known_fraud':r.get('known_fraud','False')})
    return sorted(scored,key=lambda r:r['risk_score'],reverse=True)

def metrics(scored, threshold=15):
    pred={r['claim_id'] for r in scored if r['risk_score']>=threshold}; actual={r['claim_id'] for r in scored if r.get('known_fraud')=='True'}
    tp=len(pred&actual); fp=len(pred-actual); fn=len(actual-pred); tn=len(scored)-tp-fp-fn
    return {'precision':tp/(tp+fp or 1),'recall':tp/(tp+fn or 1),'false_positive_rate':fp/(fp+tn or 1),'threshold':threshold}
