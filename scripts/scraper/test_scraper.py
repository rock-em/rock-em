import json
import os
import tempfile
import unittest

import scraper
from scraper import ScrapeError, batch_query, fetch_batch, html_to_text, parse_slug, to_problem


def question(slug, content="<p>Do it.</p>", paid=False):
    return {
        "questionFrontendId": "1",
        "title": slug.title(),
        "titleSlug": slug,
        "difficulty": "Easy",
        "isPaidOnly": paid,
        "content": content,
        "hints": ["think"],
        "topicTags": [{"name": "Array"}],
        "exampleTestcaseList": ["[1]\n2"],
        "codeSnippets": [{"langSlug": "python3", "code": "class Solution: ..."}],
    }


class FakeClient:
    def __init__(self, data, errors=()):
        self.data, self.errors, self.calls = data, list(errors), []

    def query(self, query, variables):
        self.calls.append((query, variables))
        return self.data, self.errors


class ParseSlugTest(unittest.TestCase):
    def test_accepts_slugs_and_urls(self):
        for arg in ["two-sum", "https://leetcode.com/problems/two-sum/", "leetcode.com/problems/two-sum/description/?x=1"]:
            with self.subTest(arg=arg):
                self.assertEqual(parse_slug(arg), "two-sum")

    def test_rejects_garbage(self):
        for arg in ["", "Two Sum", 'a") { x }']:
            with self.subTest(arg=arg):
                with self.assertRaises(ScrapeError):
                    parse_slug(arg)


class HtmlToTextTest(unittest.TestCase):
    def test_html_to_text(self):
        html = "<p>Given <code>n</code>&nbsp;items.</p><ul><li>1 &lt;= n &lt;= 10<sup>4</sup></li></ul>"
        self.assertEqual(html_to_text(html), "Given `n` items.\n\n- 1 <= n <= 10^4")

    def test_code_becomes_backticks_outside_example_blocks(self):
        html = (
            "<p>Return <code>nums[i]</code> and <code> a`b\n c </code><code></code>.</p>"
            "<pre><strong>Output:</strong> <code>[0,1]</code></pre>"
            "<ul><li><code>1 &lt;= n &lt;= 10<sup>4</sup></code></li></ul>"
        )
        self.assertEqual(
            html_to_text(html),
            "Return `nums[i]` and `ab c`.\n\nOutput: [0,1]\n\n- `1 <= n <= 10^4`",
        )


class BatchTest(unittest.TestCase):
    def test_query_passes_slugs_as_variables(self):
        q = batch_query(2)
        self.assertIn("$s0: String!, $s1: String!", q)
        self.assertIn("q1: question(titleSlug: $s1)", q)

    def test_fetch_batch_splits_successes_and_failures(self):
        client = FakeClient(
            {"q0": question("two-sum"), "q1": None, "q2": question("locked", content=None, paid=True)},
            [{"message": "That question does not exist", "path": ["q1"]}],
        )
        got, failed = fetch_batch(client, ["two-sum", "nope", "locked"])
        self.assertEqual([p["slug"] for p in got], ["two-sum"])
        self.assertEqual(failed[0], {"slug": "nope", "error": "That question does not exist"})
        self.assertEqual(failed[1]["slug"], "locked")
        self.assertEqual(client.calls[0][1], {"s0": "two-sum", "s1": "nope", "s2": "locked"})

    def test_to_problem_matches_import_format(self):
        p = to_problem(question("two-sum"))
        self.assertEqual(p["difficulty"], "easy")
        self.assertEqual(p["topics"], ["Array"])
        self.assertEqual(p["description"], "Do it.")
        self.assertEqual(p["code_snippets"], {"python3": "class Solution: ..."})
        self.assertEqual(p["example_testcases"], ["[1]\n2"])


class ResumeTest(unittest.TestCase):
    def test_skips_problems_already_in_the_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "out.json")
            done = to_problem(question("two-sum"))
            with open(path, "w") as f:
                json.dump({"problems": [done], "failures": []}, f)

            fetched = []

            def fake_fetch(client, slugs):
                fetched.extend(slugs)
                q = question(slugs[0])
                q["questionFrontendId"] = "2"
                return [to_problem(q)], []

            original = scraper.fetch_batch
            scraper.fetch_batch = fake_fetch
            try:
                self.assertEqual(scraper.main(["two-sum", "add-two-numbers", "-o", path, "--delay", "0"]), 0)
            finally:
                scraper.fetch_batch = original

            self.assertEqual(fetched, ["add-two-numbers"])
            with open(path) as f:
                slugs = [p["slug"] for p in json.load(f)["problems"]]
            self.assertEqual(slugs, ["two-sum", "add-two-numbers"])


if __name__ == "__main__":
    unittest.main()
