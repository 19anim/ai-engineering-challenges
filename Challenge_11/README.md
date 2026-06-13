# Challenge 11 - Claim Assessment AI Agent

Run `python run_agent.py` to generate `assessment_reports.json` and `tool_call_logs.json`. Run `python -m unittest test_agent.py`.

## Submission

Include `test_cases.json`, `assessment_reports.json`, `tool_call_logs.json`, source, runner, tests, and this prompt/tool design note.

## System Prompt Design

- Require tool use before reasoning.
- Forbid invented policy clauses or unsupported document facts.
- Check every submitted document before making a recommendation.
- Cite policy clauses for each approval, rejection, or request-for-information recommendation.

## Tool Design

- Policy, document, benefit, and report steps are represented as explicit logged tool calls.
- The deterministic implementation models the requested tool-using agent sequence and report structure.
- Reports include recommendation, calculation details, document findings, and cited policy rationale.
