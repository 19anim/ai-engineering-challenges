# AI Engineering Challenges Submission

This repository contains the completed Pumpkin AI Engineering challenge submissions for Challenges 1-5, 7, 8, and 9.

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

GitHub Pages URLs:

```text
https://19anim.github.io/ai-engineering-challenges/Challenge_1/
https://19anim.github.io/ai-engineering-challenges/Challenge_3/
https://19anim.github.io/ai-engineering-challenges/Challenge_4/
https://19anim.github.io/ai-engineering-challenges/Challenge_5/
https://19anim.github.io/ai-engineering-challenges/Challenge_7/
https://19anim.github.io/ai-engineering-challenges/Challenge_9/
```

## Artifact-Only Challenges

These challenges are submitted as source code, generated outputs, tests, and writeups:

| Challenge | Folder          | Primary verification                      |
| --------- | --------------- | ----------------------------------------- |
| 2         | `Challenge_2/`  | `python clean_data.py`                    |
| 8         | `Challenge_8/`  | `python -m unittest test_extractor.py`    |

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
