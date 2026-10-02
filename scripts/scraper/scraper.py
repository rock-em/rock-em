#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urlparse

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
PAGE_SIZE = 100

QUESTION_QUERY = """
query question($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    isPaidOnly
    content
    topicTags { name slug }
    hints
    exampleTestcaseList
    codeSnippets { lang langSlug code }
    solution { id canSeeDetail paidOnly content }
  }
}
"""

PLAYGROUND_QUERY = """
query playground($uuid: String!) {
  allPlaygroundCodes(uuid: $uuid) { code langSlug }
}
"""

COMMUNITY_LIST_QUERY = """
query solutions($questionSlug: String!, $skip: Int, $first: Int, $orderBy: ArticleOrderByEnum) {
  ugcArticleSolutionArticles(questionSlug: $questionSlug, orderBy: $orderBy, skip: $skip, first: $first) {
    edges { node { title slug topicId author { userName } reactions { count reactionType } } }
  }
}
"""

COMMUNITY_ARTICLE_QUERY = """
query article($topicId: ID!) {
  ugcArticleSolutionArticle(topicId: $topicId) { content }
}
"""

STUDY_PLAN_QUERY = """
query studyPlan($slug: String!) {
  studyPlanV2Detail(planSlug: $slug) {
    planSubGroups { name questions { titleSlug } }
  }
}
"""

FAVORITE_LIST_QUERY = """
query favoriteList($favoriteSlug: String!, $skip: Int, $limit: Int) {
  favoriteQuestionList(favoriteSlug: $favoriteSlug, skip: $skip, limit: $limit) {
    questions { titleSlug }
    hasMore
  }
}
"""

QUESTION_LIST_QUERY = """
query questionList($categorySlug: String, $skip: Int, $limit: Int, $filters: QuestionListFilterInput) {
  questionList(categorySlug: $categorySlug, skip: $skip, limit: $limit, filters: $filters) {
    totalNum
    data { titleSlug }
  }
}
"""

PLAYGROUND_IFRAME_RE = re.compile(
    r'<iframe[^>]+src="https?://[^/"]+/playground/([A-Za-z0-9]+)/shared"[^>]*>\s*</iframe>'
)


class ScrapeError(Exception):
    pass


@dataclass
class Target:
    origin: str
    kind: str
    slug: str = ""


def parse_url(url: str) -> Target:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    if not parsed.netloc:
        raise ScrapeError(f"URL has no host: {url}")
    origin = f"{parsed.scheme}://{parsed.netloc}"

    parts = [p for p in parsed.path.split("/") if p]
    if not parts:
        raise ScrapeError(f"URL has no path: {url}")

    head = parts[0]
    if head == "problemset":
        return Target(origin, "problemset")
    if len(parts) < 2:
        raise ScrapeError(f"URL is missing a slug: {url}")
    if head == "problems":
        return Target(origin, "problem", parts[1])
    if head == "problem-list":
        return Target(origin, "problem-list", parts[1])
    if head == "studyplan":
        return Target(origin, "studyplan", parts[1])
    if head == "tag":
        return Target(origin, "tag", parts[1])
    raise ScrapeError(f"unsupported URL: {url}")


class Client:
    def __init__(self, base_url: str, delay: float, cookie: str | None, retries: int = 4):
        self.base_url = base_url
        self.delay = delay
        self.cookie = cookie
        self.retries = retries
        self._last_request = 0.0

    def query(self, query: str, variables: dict) -> dict:
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

            request = urllib.request.Request(f"{self.base_url}/graphql", data=body, headers=headers)
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    payload = json.load(response)
            except urllib.error.HTTPError as err:
                if (err.code == 429 or err.code >= 500) and attempt < self.retries:
                    time.sleep(2**attempt * 2)
                    continue
                raise ScrapeError(f"HTTP {err.code} from {self.base_url}") from err
            except urllib.error.URLError as err:
                if attempt < self.retries:
                    time.sleep(2**attempt * 2)
                    continue
                raise ScrapeError(f"network error: {err.reason}") from err

            if payload.get("errors"):
                messages = "; ".join(e.get("message", "?") for e in payload["errors"])
                raise ScrapeError(f"GraphQL error: {messages}")
            return payload["data"]

        raise ScrapeError("exhausted retries")
