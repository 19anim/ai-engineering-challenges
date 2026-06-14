# Challenge 4 - Insurance Glossary Search App

Open `index.html`. The app bundles 42 terms client-side, groups by category, searches name/definition, highlights matches, supports A-Z jump and clickable related terms.

## Run

Open `index.html` directly or deploy the folder to a static host. The browser does not need to `fetch()` local files because `terms-data.js` defines `window.GLOSSARY_TERMS`.

## Submission

- Live URL: https://19anim.github.io/ai-engineering-challenges/Challenge_4/
- Include `terms-data.js` as the bundled runtime data.
- Keep `terms.json` as a readable source/reference copy of the glossary data.

## Approach

- Terms cover 6 categories and exceed the 40-term requirement.
- Search filters across names and definitions as the user types.
- Matches are highlighted in the visible result list.
- Navigation stays smooth across category grouping, alphabet jump, and related term links.
- Related term links clear temporary filters, select the linked term, and scroll the term into view.
- A-Z navigation shows a toast when no term exists for a selected letter.
- If multiple terms start with the selected letter, the list filters to those matching terms, selects the first match, scrolls it into view, and shows a toast with the match count.

## Edge Cases Covered

- Alphabet letters with no matching term do not fail silently; the user receives a visible notification.
- Alphabet letters with multiple matching terms show all matching terms instead of hiding the extra matches.
- Related term navigation works after search or alphabet filtering by resetting temporary filters before jumping.
