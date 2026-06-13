# Challenge 14 - Claims Workflow Orchestrator

Run `python run_scenarios.py` to generate `scenario_results.json` and `audit_trail_output.json`. Run `python -m unittest test_workflow.py`.

## Submission

Include `workflow.json`, scenario results, audit trail output, source, runner, and tests.

## Scenario Coverage

- Happy path through payment and closure.
- Rejection path through final closure.
- Request-more-information loop back into reassessment.
- Invalid transition from submitted directly to approved.

## Approach

- The lifecycle is configured in `workflow.json`; adding states or transitions is a config change.
- Transitions are config-defined with preconditions, authorized roles, and side effects.
- Every accepted or rejected transition writes an audit record with actor, state, action, and outcome.
