# Challenge 5 - Policy Summary Generator

Open `index.html` and choose either sample policy. The renderer reads JSON dynamically and formats overview, members, benefits, copays, waiting periods, exclusions, network information, and quick reference totals.

## Run

Use a static/local server because the app loads sample policy JSON with `fetch()`.

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/Challenge_5/`.

## Submission

- Provide a live URL for the generator.
- Include both sample policy JSON files under `policies/`.

## Approach

- Converts nested policy JSON into a readable member-facing summary.
- Shows a quick reference card with high-signal totals and counts.
- Preserves waiting periods, exclusions, copay terms, and network details.
