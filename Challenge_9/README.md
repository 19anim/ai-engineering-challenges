# Challenge 9 - Claims Analytics Dashboard

Open `index.html` through any local/static server. `claims.csv` contains 5,000 generated 2024 claims with outpatient-heavy distribution and roughly 15% rejected claims. Filters update KPIs, charts, drill-down table, and CSV export.

## Run

Use a static/local server because the dashboard loads `claims.csv` with `fetch()`.

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/Challenge_9/`.

## Submission

- Live URL: https://19anim.github.io/ai-engineering-challenges/Challenge_9/
- Include the generated `claims.csv` dataset.

## Approach

- Dashboard KPIs cover claim count, approval rate, average processing days, total approved, and average submitted amount.
- Filters update every KPI, chart, and table from the same filtered dataset.
- Diagnosis bars support drill-down into the matching claims.
