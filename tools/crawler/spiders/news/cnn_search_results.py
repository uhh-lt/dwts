import logging
import math
import re
from typing import Any, Dict, List
from uuid import uuid4

import requests
from dateutil import parser

from crawler.spiders.news.news_search_results_spider_base import (
    NewsSearchResultsSpiderBase,
)


class CNNSearchResultsSpider(NewsSearchResultsSpiderBase):
    name = "CNNSearchResults"
    page_size = 10
    query_terms = ""
    search_api_base_url = "https://search.prod.di.api.cnn.io/content"
    web_search_base_url = "https://edition.cnn.com/search"

    def _build_current_search_results_url(self, results_page: int) -> str:
        search_terms_parameter = "%2B".join(self.search_terms)
        from_ = self.page_size * results_page
        if results_page <= 1:
            from_ = 0

        query_terms = (
            f"?q={search_terms_parameter}"
            f"&size={self.page_size}"
            f"&from={from_}"
            f"&page={results_page}"
            "&types=article&sort=newest"
        )

        return f"{self.web_search_base_url}{query_terms}"

    def _call_cnn_api(self, response) -> Dict[str, Any] | None:
        query_terms = response.url.replace(self.web_search_base_url, "")
        fake_request_id = str(uuid4())
        api_call_url = (
            f"{self.search_api_base_url}{query_terms}"
            f"&request_id=pdx-search-{fake_request_id}"
        )

        ret = requests.get(
            api_call_url,  # fake request id
        )
        if ret.status_code != 200:
            return None
        return ret.json()

    def _get_num_result_pages(self, response) -> int:
        data = self._call_cnn_api(response)
        if data is not None:
            return math.ceil(int(data["meta"]["of"]) / self.page_size)

        # this will most probably not work because the content is loaded dynamically
        self.log(
            "Trying to parse CNN Search Result content from Web, which will most probably not work because the content is loaded dynamically!",
            level=logging.WARNING,
        )
        results_string = response.xpath(
            "//div[contains(@class, 'search__results-count')]/text()"
        ).get()
        if results_string is None:
            return 0

        matches = re.search(r"out of \d+", results_string)
        if matches:
            return int(matches.group(0).split(" ")[-1])

        return 0

    def _get_article_urls(self, response) -> List[str]:
        data = self._call_cnn_api(response)
        if data is not None:
            return list(map(lambda r: r["path"], data["result"]))

        # this will most probably not work because the content is loaded dynamically
        self.log(
            "Trying to parse CNN Search Result content from Web, which will most probably not work because the content is loaded dynamically!",
            level=logging.WARNING,
        )
        urls = response.xpath(
            "//div[contains(@class, 'search__results-list')]"
            "//div[contains(@class, 'container__field-links')]"
            "/div[contains(@class, 'container__item')]/@data-open-link"
        ).getall()
        return urls

    def _get_article_title(self, response) -> str:
        title = response.xpath("//h1[contains(@class, 'headline__text')]/text()").get()
        if title is None or len(title) == 0:
            return "N/A"
        return title.strip()

    def _get_article_author(self, response) -> str:
        author = response.xpath("//span[contains(@class, 'byline__name')]/text()").get()
        if author is None or len(author) == 0:
            return "N/A"
        return author.strip()

    def _get_published_date(self, response) -> str:
        published_date = response.xpath(
            "//div[contains(@class, 'headline__footer')]"
            "//div[contains(@class, 'timestamp')]/text()"
        ).get()
        if published_date is None:
            return "1970-01-01"
        return parser.parse("".join(published_date.split(",")[-2:])).strftime(
            "%Y-%m-%d"
        )

    def _is_search_results_page(self, response) -> bool:
        return response.url.startswith(self.web_search_base_url)
