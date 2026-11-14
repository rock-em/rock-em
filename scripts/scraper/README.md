# Scraper

Scrapes coding problems, the official editorial and the top community solutions into JSON. Uses only the Python 3.10+ standard library.

## Usage

```bash
# A single problem
python3 scraper.py https://example.com/problems/two-sum/ -o two-sum.json

# A study plan, problem list, tag or the whole problemset (mix freely; duplicates are removed)
python3 scraper.py https://example.com/studyplan/top-interview-150/ -o top150.json
python3 scraper.py https://example.com/problem-list/array/ --limit 50 -o array.json
python3 scraper.py https://example.com/tag/dynamic-programming/ --limit 20
python3 scraper.py https://example.com/problemset/ --limit 100 -n 0 --no-official
```

| Flag | Meaning |
| --- | --- |
| `-o, --output` | Write to a file instead of stdout |
| `-n, --community` | Top community solutions per problem, by votes (default 3, `0` to skip) |
| `--no-official` | Skip the official editorial |
| `--limit` | Max problems per list URL |
| `--delay` | Seconds between requests (default 0.5) |

The site to scrape is taken from each URL's host, and requests go to its `/graphql` endpoint. Progress is written to stderr. Set `SCRAPER_COOKIE` to the `Cookie` header from a logged-in browser session (e.g. `name=value`) to access premium problems, premium editorials and private or curated lists.

## Output

```jsonc
{
  "problems": [
    {
      "id": "1",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": "easy",
      "url": "https://example.com/problems/two-sum/",
      "paid_only": false,
      "topics": ["Array", "Hash Table"],
      "description_html": "<p>...</p>",
      "description": "plain-text version",
      "hints": ["..."],
      "example_testcases": ["[2,7,11,15]\n9"],
      "code_snippets": { "python3": "class Solution: ..." },
      "answers": {
        "official": {
          "available": true,
          "paid_only": false,
          "content_markdown": "... <!-- code: WTVGRyeD --> ...",
          "code_blocks": [{ "id": "WTVGRyeD", "code": { "python3": "...", "cpp": "..." } }]
        },
        "community": [
          { "title": "...", "author": "...", "upvotes": 12171, "url": "...", "content_markdown": "..." }
        ]
      }
    }
  ],
  "failures": [{ "slug": "...", "error": "..." }]
}
```

The `<!-- code: ID -->` markers in the editorial show where each entry in `code_blocks` belongs. `official` is `null` if the problem has no editorial, and `{"available": false}` if it is premium-only.

## Importing into the backend

`backend/cmd/import` loads scraper output into the problems table. Run it from `backend/` with `DATABASE_URL` set:

```bash
go run ./cmd/import ../scripts/scraper/sample.json
go run ./cmd/import -dry-run top150.json   # just report what would be imported
```

Each problem gets its signature from the `python3` snippet and its example tests from `example_testcases`, paired with the `Output:` lines in the description. In-place problems are imported too: a method that returns `None` is checked on the argument its docstring says to modify, and the common "return k, then check the first k items of nums" custom judge is checked on those k items. Anything else is skipped with a reason, like other custom judges, design classes and unsupported types. Slugs that already exist are left untouched, so rerunning an import is safe.

## Tests

```bash
python3 -m unittest test_scraper
```
