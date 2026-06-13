# AI Engineering Challenges Submission

This repository contains one submission folder per Pumpkin AI Engineering challenge.

## Live UI Challenges

Deploy these folders as static pages through GitHub Pages, Netlify, Vercel, or any static host:

| Challenge | Folder          | Notes                                                                 |
| --------- | --------------- | --------------------------------------------------------------------- |
| 1         | `Challenge_1/`  | Insurance plan comparison page                                        |
| 3         | `Challenge_3/`  | Claim notification email preview                                      |
| 4         | `Challenge_4/`  | Glossary search app; data is bundled client-side for offline/file use |
| 5         | `Challenge_5/`  | Policy summary generator; open through a static server                |
| 7         | `Challenge_7/`  | Claims intake wizard                                                  |
| 9         | `Challenge_9/`  | Claims analytics dashboard; includes `claims.csv`                     |
| 15        | `Challenge_15/` | Multi-tenant admin UI; open through a static server                   |

Suggested GitHub Pages URLs after publishing this repository:

```text
https://<user>.github.io/<repo>/Challenge_1/
https://<user>.github.io/<repo>/Challenge_3/
https://<user>.github.io/<repo>/Challenge_4/
https://<user>.github.io/<repo>/Challenge_5/
https://<user>.github.io/<repo>/Challenge_7/
https://<user>.github.io/<repo>/Challenge_9/
https://<user>.github.io/<repo>/Challenge_15/
```

## Artifact-Only Challenges

These challenges are submitted as source code, generated outputs, tests, and writeups:

| Challenge | Folder          | Primary verification                      |
| --------- | --------------- | ----------------------------------------- |
| 2         | `Challenge_2/`  | `python clean_data.py`                    |
| 6         | `Challenge_6/`  | `python -m unittest test_calculator.py`   |
| 8         | `Challenge_8/`  | `python -m unittest test_extractor.py`    |
| 10        | `Challenge_10/` | `python -m unittest test_fraud_engine.py` |
| 11        | `Challenge_11/` | `python -m unittest test_agent.py`        |
| 12        | `Challenge_12/` | `python -m unittest test_rule_engine.py`  |
| 13        | `Challenge_13/` | `npm.cmd run build && npm.cmd test`       |
| 14        | `Challenge_14/` | `python -m unittest test_workflow.py`     |

## Local Static Server

From this folder:

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/Challenge_4/` or the relevant challenge folder.

## Submission Notes

- Do not include dependency folders such as `node_modules`.
- Keep generated outputs in the repository when the challenge asks for them.
- Add the deployed live URLs to the final submission message after publishing.
