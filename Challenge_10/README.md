# Challenge 10 - Fraud Detection Scoring Engine

Run `python run_fraud.py` to generate `scored_output.json` and `metrics_report.json`. Run `python -m unittest test_fraud_engine.py`.

## Submission

Include `claims.csv`, `scored_output.json`, `metrics_report.json`, the engine source, runner, and tests.

## Rule/Weight Approach

- `fraud_engine.py` implements all 8 challenge rules with configurable weights and evidence strings.
- Rules are composable so one claim can receive multiple evidence-backed flags.
- Output is ranked by risk score for investigation prioritization.
- Evidence strings include concrete values such as duplicate keys, timing windows, and statistical outliers.
