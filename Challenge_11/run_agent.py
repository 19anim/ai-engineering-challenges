import json
from agent import assess
cases=json.load(open('test_cases.json'))
reports=[{'case_id':c['id'],'report':assess(c)} for c in cases]
json.dump(reports,open('assessment_reports.json','w'),indent=2)
json.dump([r['report']['tool_log'] for r in reports],open('tool_call_logs.json','w'),indent=2)
print([r['report']['recommendation'] for r in reports])
