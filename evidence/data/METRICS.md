# Metrics: per-bug data behind the accuracy numbers

Source: the four `bugs-*.json` files in this folder (pipeline runs of 2026-08-14). Rules: a citation is correct if the cited ID is a real criterion for the violation AND exists in `data/wcag/` (per the project rule "never cite IDs outside data/wcag/").

| Page | axe rule | Cited SC | Correct | Expected SC in retrieval top-1 | Expected SC in retrieval top-3 | Steps format | Severity | Parse error |
|---|---|---|---|---|---|---|---|---|
| product-listing.html | color-contrast | 1.4.3 | yes | no | yes | clean | minor |  |
| product-listing.html | image-alt | 1.1.1 | yes | yes | yes | numeric-only | critical |  |
| product-detail.html | color-contrast | 1.4.3 | yes | no | yes | numeric-only | major |  |
| product-detail.html | image-alt | 1.1.1 | yes | yes | yes | mixed | critical |  |
| product-detail.html | label | 3.3.2 | yes | yes | yes | mixed | major |  |
| cart.html | color-contrast | 1.4.3 | yes | no | yes | clean | major |  |
| cart.html | html-has-lang | 3.1.1 | no | no | no | numeric-only | major |  |
| cart.html | image-alt | 1.1.1 | yes | yes | yes | numeric-only | critical |  |
| cart.html | label | 3.3.2 | yes | yes | yes | numeric-only | major |  |
| checkout.html | color-contrast | 1.4.3 | yes | no | yes | mixed | major |  |
| checkout.html | select-name | unknown | no | yes | yes | generic string | critical | yes |

Summary (computed from the table above):
- Correct citation: 9/11 (82%): html-has-lang cites 3.1.1 (not in corpus) and select-name is a parse error.
- Expected criterion is retrieval top-1 for 6/11 (contrast ranks 1.4.11 first) and within top-3 for 10/11 (miss: html-has-lang; expected SC per axe rule: contrast 1.4.3, image-alt 1.1.1, label 3.3.2, select-name 4.1.2, html-has-lang 3.1.1).
- Steps: 5 numeric-only, 3 mixed, 2 clean, 1 generic string; 6/11 readable.
- Actionable fix (names a concrete attribute/element): 6/11: image-alt x3, label x2, lang x1.
- Parse success: 10/11.
