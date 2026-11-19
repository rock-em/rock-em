# Scraper

Scrapes LeetCode problems into JSON through LeetCode's GraphQL API (`https://leetcode.com/graphql`). Uses only the Python 3.10+ standard library.

It lists the problemset with `questionList`, then fetches problems 50 at a time in one aliased `question` query per request. The problem statement comes back from the API as HTML, so the script also writes a plain-text copy, `description`, which the importer parses for examples and constraints.

## Usage

```bash
# Every free problem (about 3,300, roughly 5 minutes)
python3 scraper.py -o problems.json

# The first 100 problems of the problemset
python3 scraper.py --limit 100 -o first100.json

# Specific problems, by slug or URL
python3 scraper.py two-sum https://leetcode.com/problems/add-two-numbers/ -o some.json
```

| Flag | Meaning |
| --- | --- |
| `-o, --output` | Write to a file instead of stdout. If the file exists, problems already in it are kept and skipped, so an interrupted run picks up where it stopped. |
| `--limit` | Only the first N problems of the problemset |
| `--batch` | Problems per request (default 50) |
| `--delay` | Seconds between requests (default 1) |
| `--premium` | Also fetch premium problems. Needs `SCRAPER_COOKIE` set to the `Cookie` header of a logged-in premium session. |

Premium problems are skipped by default, because without a premium session the API returns no statement for them. Progress is written to stderr, and the output file is saved after every batch.

## Output

```jsonc
{
  "problems": [
    {
      "id": "1",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": "easy",
      "url": "https://leetcode.com/problems/two-sum/",
      "paid_only": false,
      "topics": ["Array", "Hash Table"],
      "description_html": "<p>...</p>",
      "description": "plain-text version",
      "hints": ["..."],
      "example_testcases": ["[2,7,11,15]\n9"],
      "code_snippets": { "python3": "class Solution: ..." }
    }
  ],
  "failures": [{ "slug": "...", "error": "..." }]
}
```

## Importing into the backend

`backend/cmd/import` loads scraper output into the problems table. Run it from `backend/` with `DATABASE_URL` set:

```bash
go run ./cmd/import ../scripts/scraper/sample.json
go run ./cmd/import -dry-run problems.json   # just report what would be imported
```

Each problem gets its signature from the `python3` snippet and its example tests from `example_testcases`, paired with the `Output:` lines in the description. Problems that can't be checked with plain input/output tests are skipped with a reason: in-place edits, custom judges, design classes and unsupported types. Slugs that already exist are left untouched, so rerunning an import is safe.

## Tests

```bash
python3 -m unittest test_scraper
```
