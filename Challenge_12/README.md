# Challenge 12 - Multi-Country Regulatory Rule Engine

Run `python run_rules.py` to generate validation results and a TH/VN diff. Run `python -m unittest test_rule_engine.py`.

## Submission

Include the TH, VN, and HK country configs, `SG-skeleton.json` as the sample fourth-country config, 15 test claims, validation results, diff output, source, runner, and tests.

## Approach

- Rule behavior is config-driven by country and effective date.
- Validation output names failed rules and preserves claims that pass, fail one rule, or fail multiple rules.
- Adding a country is a configuration-only change under `rules/*.json`.
