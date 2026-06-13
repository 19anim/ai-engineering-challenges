# Challenge 6 - Policy Benefits Calculator

Run `python run_calculator.py` to generate `expected_outputs.json`. Run `python -m unittest test_calculator.py` for 10 unit tests covering normal coverage, copay, per-visit limit, waiting periods, exclusions, chronological limit consumption, and exhaustion.

## Submission

Include `policy.json`, `expenses.json`, `expected_outputs.json`, `calculator.py`, `run_calculator.py`, and `test_calculator.py`.

## Approach

- Expenses are processed chronologically so annual limits are consumed in the same order a claims system would apply them.
- Each output explains submitted amount, covered amount, member responsibility, reason, and remaining balances.
- Tests cover the business-rule edge cases called out in the challenge.
