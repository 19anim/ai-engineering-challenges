
from datetime import date

def _days_after(expense_date, start_date):
    return (date.fromisoformat(expense_date) - date.fromisoformat(start_date)).days

def calculate_claims(policy, expenses):
    remaining = {name: benefit.get('annual_limit', 0) for name, benefit in policy['benefits'].items()}
    visits = {}
    results = []
    for expense in sorted(expenses, key=lambda row: row['date']):
        benefit = policy['benefits'][expense['benefit_type']]
        submitted = expense['amount']
        key = (expense['benefit_type'], expense['sub_benefit'])
        if any(term in expense.get('diagnosis', '').lower() for term in policy.get('exclusions', [])):
            covered = 0
            copay = 0
            decision = 'DENIED'
            reason = 'Denied: diagnosis or treatment matches a policy exclusion.'
        elif _days_after(expense['date'], policy['effective_date']) < benefit.get('waiting_period_days', 0):
            covered = 0
            copay = 0
            decision = 'DENIED'
            reason = f"Denied: {benefit.get('waiting_period_days', 0)} day waiting period has not elapsed."
        elif remaining[expense['benefit_type']] <= 0:
            covered = 0
            copay = 0
            decision = 'DENIED'
            reason = 'Denied: annual limit exhausted.'
        else:
            sub_limit = benefit.get('sub_limits', {}).get(expense['sub_benefit'], {})
            allowed = submitted
            if 'per_visit' in sub_limit:
                allowed = min(allowed, sub_limit['per_visit'])
            if 'per_year' in sub_limit:
                already = visits.get(key + ('amount',), 0)
                allowed = min(allowed, max(0, sub_limit['per_year'] - already))
            allowed = min(allowed, remaining[expense['benefit_type']])
            deductible = min(benefit.get('deductible', 0), allowed)
            after_deductible = max(0, allowed - deductible)
            copay = round(after_deductible * benefit.get('copay_percent', 0) / 100, 2)
            covered = round(after_deductible - copay, 2)
            remaining[expense['benefit_type']] -= covered
            visits[key] = visits.get(key, 0) + 1
            visits[key + ('amount',)] = visits.get(key + ('amount',), 0) + allowed
            decision = 'COVERED' if covered == submitted else 'PARTIALLY_COVERED'
            reason = f"Applied deductible {deductible} and {benefit.get('copay_percent', 0)}% copay. Covered {covered} {policy.get('currency', '')}."
        results.append({
            'expense_id': expense['expense_id'],
            'submitted_amount': submitted,
            'covered_amount': covered,
            'copay_amount': copay,
            'member_pays': round(submitted - covered, 2),
            'decision': decision,
            'reason': reason,
            'remaining_annual_limit': remaining[expense['benefit_type']],
            'remaining_visit_limit': benefit.get('sub_limits', {}).get(expense['sub_benefit'], {}).get('visits'),
        })
    return {'results': results, 'summary': remaining}
