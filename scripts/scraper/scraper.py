#!/usr/bin/env python3
"""Scrape LeetCode problems through its GraphQL API into JSON for backend/cmd/import."""

from __future__ import annotations

import argparse
import http.client
import json
import os
import re
import socket
import sys
import time
from html.parser import HTMLParser
from urllib.parse import urlparse

BASE_URL = "https://leetcode.com"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
LIST_PAGE_SIZE = 100

QUESTION_LIST_QUERY = """
query questionList($categorySlug: String, $skip: Int, $limit: Int, $filters: QuestionListFilterInput) {
  questionList(categorySlug: $categorySlug, skip: $skip, limit: $limit, filters: $filters) {
    totalNum
    data { titleSlug isPaidOnly }
  }
}
"""

QUESTION_FIELDS = """
    questionFrontendId
    title
    titleSlug
    difficulty
    isPaidOnly
    content
    hints
    topicTags { name }
    exampleTestcaseList
    codeSnippets { langSlug code }
"""

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PROBLEM_URL_RE = re.compile(r"/problems/([a-z0-9-]+)")


class ScrapeError(Exception):
    pass


class _Connection(http.client.HTTPSConnection):
    """HTTPS connection that tries IPv4 addresses first.

    socket.create_connection tries addresses in resolver order, and on machines
    without working IPv6 each IPv6 attempt stalls for seconds before failing.
    """

    def connect(self):
        infos = socket.getaddrinfo(self.host, self.port, type=socket.SOCK_STREAM)
        infos.sort(key=lambda info: info[0] != socket.AF_INET)
        last: OSError | None = None
        for family, kind, proto, _, addr in infos:
            sock = socket.socket(family, kind, proto)
            sock.settimeout(self.timeout)
            try:
                sock.connect(addr)
            except OSError as err:
                sock.close()
                last = err
                continue
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
            return
        raise last or OSError(f"could not connect to {self.host}")


class Client:
    def __init__(self, base_url: str, delay: float, cookie: str | None, retries: int = 4):
        self.base_url = base_url
        self.host = urlparse(base_url).hostname
        self.delay = delay
        self.cookie = cookie
        self.retries = retries
        self._last_request = 0.0
        self._conn: _Connection | None = None

    def _post(self, body: bytes, headers: dict) -> tuple[int, bytes]:
        # one kept-alive connection; reopened if the server drops it
        if self._conn is None:
            self._conn = _Connection(self.host, timeout=120)
        try:
            self._conn.request("POST", "/graphql", body=body, headers=headers)
            response = self._conn.getresponse()
            return response.status, response.read()
        except (OSError, http.client.HTTPException):
            self._conn.close()
            self._conn = None
            raise

    def query(self, query: str, variables: dict) -> tuple[dict, list[dict]]:
        """Run a query and return (data, errors). Raises if there is no data at all."""
        body = json.dumps({"query": query, "variables": variables}).encode()
        headers = {
            "Content-Type": "application/json",
            "Referer": self.base_url,
            "User-Agent": USER_AGENT,
        }
        if self.cookie:
            headers["Cookie"] = self.cookie

        for attempt in range(self.retries + 1):
            wait = self._last_request + self.delay - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()

            try:
                status, raw = self._post(body, headers)
            except (OSError, http.client.HTTPException) as err:
                if attempt < self.retries:
                    time.sleep(2**attempt * 2)
                    continue
                raise ScrapeError(f"network error: {err}") from err
            if status == 429 or status >= 500:
                if attempt < self.retries:
                    time.sleep(2**attempt * 2)
                    continue
            if status != 200:
                raise ScrapeError(f"HTTP {status} from {self.base_url}: {raw[:200]!r}")
            payload = json.loads(raw)

            errors = payload.get("errors") or []
            if not payload.get("data"):
                messages = "; ".join(e.get("message", "?") for e in errors) or "empty response"
                raise ScrapeError(f"GraphQL error: {messages}")
            return payload["data"], errors

        raise ScrapeError("exhausted retries")


def list_problems(client: Client) -> list[dict]:
    """Every problem in the problemset, as {titleSlug, isPaidOnly}, in problem order."""
    found: list[dict] = []
    total = None
    while total is None or len(found) < total:
        data, _ = client.query(
            QUESTION_LIST_QUERY,
            {"categorySlug": "", "skip": len(found), "limit": LIST_PAGE_SIZE, "filters": {}},
        )
        page = data["questionList"]
        total = page["totalNum"]
        if not page["data"]:
            break
        found.extend(page["data"])
        log(f"listed {len(found)}/{total}")
    return found


def batch_query(size: int) -> str:
    """One request that fetches `size` questions, aliased q0..qN, slugs passed as variables."""
    params = ", ".join(f"$s{i}: String!" for i in range(size))
    fields = "\n".join(f"  q{i}: question(titleSlug: $s{i}) {{{QUESTION_FIELDS}  }}" for i in range(size))
    return f"query questions({params}) {{\n{fields}\n}}"


def fetch_batch(client: Client, slugs: list[str]) -> tuple[list[dict], list[dict]]:
    data, errors = client.query(batch_query(len(slugs)), {f"s{i}": s for i, s in enumerate(slugs)})
    error_by_alias = {}
    for err in errors:
        path = err.get("path") or []
        if path:
            error_by_alias[path[0]] = err.get("message", "?")

    problems, failures = [], []
    for i, slug in enumerate(slugs):
        q = data.get(f"q{i}")
        if not q:
            failures.append({"slug": slug, "error": error_by_alias.get(f"q{i}", "not found")})
        elif not q.get("content"):
            failures.append({"slug": slug, "error": "no content (premium problem without a cookie?)"})
        else:
            problems.append(to_problem(q))
    return problems, failures


def to_problem(q: dict) -> dict:
    html = q["content"]
    return {
        "id": q["questionFrontendId"],
        "slug": q["titleSlug"],
        "title": q["title"],
        "difficulty": q["difficulty"].lower(),
        "url": f"{BASE_URL}/problems/{q['titleSlug']}/",
        "paid_only": q["isPaidOnly"],
        "topics": [t["name"] for t in q.get("topicTags") or []],
        "description_html": html,
        "description": html_to_text(html),
        "hints": q.get("hints") or [],
        "example_testcases": q.get("exampleTestcaseList") or [],
        "code_snippets": {s["langSlug"]: s["code"] for s in q.get("codeSnippets") or []},
    }


class _TextExtractor(HTMLParser):
    BLOCK_TAGS = {"p", "div", "pre", "li", "ul", "ol", "br", "h1", "h2", "h3", "h4"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self.pre = 0
        # Text of the <code> element being read, or None outside one.
        self.code: list[str] | None = None

    def emit(self, text: str) -> None:
        (self.chunks if self.code is None else self.code).append(text)

    def handle_starttag(self, tag, attrs):
        if tag == "pre":
            self.pre += 1
        if tag == "code":
            # Example blocks are <pre>, where the importer reads raw values.
            if self.code is None and not self.pre:
                self.code = []
        elif tag == "li":
            self.emit("\n- ")
        elif tag == "sup":
            self.emit("^")
        elif tag in self.BLOCK_TAGS:
            self.emit("\n")

    def handle_endtag(self, tag):
        if tag == "pre":
            self.pre = max(0, self.pre - 1)
        if tag == "code":
            if self.code is not None:
                text = " ".join("".join(self.code).replace("`", "").split())
                self.code = None
                if text:
                    self.chunks.append(f"`{text}`")
        elif tag in self.BLOCK_TAGS:
            self.emit("\n")

    def handle_data(self, data):
        self.emit(data)


def html_to_text(html: str) -> str:
    """LeetCode serves problem statements as HTML; the importer reads plain text.

    Inline <code> is kept as `backticks`, which the site shows as code.
    """
    parser = _TextExtractor()
    # Non-breaking spaces become plain ones; zero-width spaces are dropped.
    parser.feed(re.sub(r"\u200b|&#8203;", "", html.replace("\xa0", " ").replace("&nbsp;", " ")))
    text = "".join(parser.chunks)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def reconvert(path: str) -> int:
    """Rebuild every description in a scraped file from its saved HTML."""
    with open(path) as f:
        data = json.load(f)
    problems = data.get("problems", [])
    changed = 0
    for problem in problems:
        if not problem.get("description_html"):
            continue
        text = html_to_text(problem["description_html"])
        changed += text != problem.get("description")
        problem["description"] = text
    # Written in place and in the file's own order, so the diff is only the text.
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        f.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, path)
    log(f"done: {changed} of {len(problems)} descriptions changed")
    return 0


def parse_slug(arg: str) -> str:
    m = PROBLEM_URL_RE.search(arg)
    slug = m.group(1) if m else arg.strip().strip("/")
    if not SLUG_RE.match(slug):
        raise ScrapeError(f"not a problem slug or URL: {arg}")
    return slug


def load(path: str | None) -> tuple[dict[str, dict], list[dict]]:
    if not path or not os.path.exists(path):
        return {}, []
    with open(path) as f:
        data = json.load(f)
    return {p["slug"]: p for p in data.get("problems", [])}, data.get("failures", [])


def save(path: str | None, problems: dict[str, dict], failures: list[dict]) -> None:
    ordered = sorted(problems.values(), key=lambda p: (not p["id"].isdigit(), int(p["id"]) if p["id"].isdigit() else 0, p["id"]))
    out = json.dumps({"problems": ordered, "failures": failures}, indent=2, ensure_ascii=False)
    if not path:
        print(out)
        return
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        f.write(out + "\n")
    os.replace(tmp, path)


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("problems", nargs="*", help="problem slugs or URLs (default: every problem)")
    parser.add_argument("-o", "--output", help="write here instead of stdout; an existing file is resumed")
    parser.add_argument("--limit", type=int, help="only the first N problems of the problemset")
    parser.add_argument("--batch", type=int, default=50, help="problems per request (default 50)")
    parser.add_argument("--delay", type=float, default=1.0, help="seconds between requests (default 1)")
    parser.add_argument("--premium", action="store_true", help="also fetch premium problems (needs SCRAPER_COOKIE)")
    parser.add_argument("--reconvert", metavar="FILE", help="rebuild the descriptions in FILE from its saved HTML, without fetching")
    args = parser.parse_args(argv)
    if args.reconvert:
        return reconvert(args.reconvert)

    cookie = os.environ.get("SCRAPER_COOKIE")
    if args.premium and not cookie:
        parser.error("--premium needs SCRAPER_COOKIE set to a logged-in premium session's Cookie header")
    client = Client(BASE_URL, args.delay, cookie)

    try:
        if args.problems:
            slugs = [parse_slug(a) for a in args.problems]
        else:
            listed = list_problems(client)
            if args.limit:
                listed = listed[: args.limit]
            premium = [q for q in listed if q["isPaidOnly"]]
            if premium and not args.premium:
                log(f"skipping {len(premium)} premium problems (pass --premium with SCRAPER_COOKIE to include them)")
                listed = [q for q in listed if not q["isPaidOnly"]]
            slugs = [q["titleSlug"] for q in listed]
    except ScrapeError as err:
        log(f"error: {err}")
        return 1

    problems, _ = load(args.output)
    todo = [s for s in dict.fromkeys(slugs) if s not in problems]
    if problems:
        log(f"resuming: {len(problems)} already in {args.output}, {len(todo)} to go")
    failures: list[dict] = []

    for start in range(0, len(todo), args.batch):
        chunk = todo[start : start + args.batch]
        try:
            got, failed = fetch_batch(client, chunk)
        except ScrapeError as err:
            got, failed = [], [{"slug": s, "error": str(err)} for s in chunk]
        for p in got:
            problems[p["slug"]] = p
        failures.extend(failed)
        log(f"fetched {min(start + args.batch, len(todo))}/{len(todo)} ({len(failures)} failed)")
        if args.output:
            save(args.output, problems, failures)

    save(args.output, problems, failures)
    log(f"done: {len(problems)} problems, {len(failures)} failures")
    return 0


if __name__ == "__main__":
    sys.exit(main())
