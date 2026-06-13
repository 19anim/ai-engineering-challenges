import csv,json
from fraud_engine import score_claims,metrics
rows=list(csv.DictReader(open('claims.csv')))
scored=score_claims(rows)
json.dump(scored,open('scored_output.json','w'),indent=2)
json.dump(metrics(scored),open('metrics_report.json','w'),indent=2)
print(metrics(scored))
