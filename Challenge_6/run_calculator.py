import json
from calculator import calculate_claims
policy=json.load(open('policy.json'))
expenses=json.load(open('expenses.json'))
out=calculate_claims(policy, expenses)
json.dump(out, open('expected_outputs.json','w'), indent=2)
print(len(out['results']))
