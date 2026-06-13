import json
from rule_engine import validate,diff
claims=json.load(open('test_claims.json'))
out=[validate(c) for c in claims]
json.dump(out,open('validation_results.json','w'),indent=2)
json.dump(diff('TH','VN'),open('rule_diff_TH_VN.json','w'),indent=2)
print(len(out))
