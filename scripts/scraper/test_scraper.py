import unittest

from scraper import ScrapeError, html_to_text, parse_url, unescape_article, PLAYGROUND_IFRAME_RE


class ParseUrlTest(unittest.TestCase):
    def test_supported_urls(self):
        cases = {
            "https://example.com/problems/two-sum/": ("problem", "two-sum"),
            "https://example.com/problems/two-sum/description/?envType=x": ("problem", "two-sum"),
            "example.com/problems/two-sum": ("problem", "two-sum"),
            "https://example.com/problem-list/array/": ("problem-list", "array"),
            "https://example.com/studyplan/top-interview-150/": ("studyplan", "top-interview-150"),
            "https://example.com/tag/dynamic-programming/": ("tag", "dynamic-programming"),
            "https://example.com/problemset/all/": ("problemset", ""),
        }
        for url, (kind, slug) in cases.items():
            with self.subTest(url=url):
                target = parse_url(url)
                self.assertEqual((target.origin, target.kind, target.slug), ("https://example.com", kind, slug))

    def test_rejects_unsupported_urls(self):
        for url in ["https:///problems/two-sum/", "https://example.com/", "https://example.com/discuss/123"]:
            with self.subTest(url=url):
                with self.assertRaises(ScrapeError):
                    parse_url(url)


class HelpersTest(unittest.TestCase):
    def test_html_to_text(self):
        html = "<p>Given <code>n</code>&nbsp;items.</p><ul><li>1 &lt;= n &lt;= 10<sup>4</sup></li></ul>"
        self.assertEqual(html_to_text(html), "Given n items.\n\n- 1 <= n <= 10^4")

    def test_unescape_article(self):
        self.assertEqual(unescape_article('a\\nb\\t\\"c\\"'), 'a\nb\t"c"')

    def test_playground_iframe_regex(self):
        content = '<iframe src="https://example.com/playground/WTVGRyeD/shared" frameBorder="0" width="100%"></iframe>'
        self.assertEqual(PLAYGROUND_IFRAME_RE.findall(content), ["WTVGRyeD"])


if __name__ == "__main__":
    unittest.main()
