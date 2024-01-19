import datetime
import random
from typing import List, Set

import scrapy
import srsly

from crawler.items import GenericWebsiteItem
from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify


class NewsSearchResultsSpiderBase(SpiderBase):
    def __str_to_bool(self, s: str | bool) -> bool:
        if isinstance(s, bool):
            return s
        return s.lower() in ["true", "1", "yes", "y"]

    @classmethod
    def update_settings(cls, settings):
        # see https://docs.scrapy.org/en/latest/topics/settings.html#settings-per-spider
        super().update_settings(settings)
        settings.set(
            "DOWNLOAD_HANDLERS",
            {
                "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
                "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            },
            priority="spider",
        )
        settings.set("PLAYWRIGHT_BROWSER_TYPE", "firefox", priority="spider")
        settings.set(
            "PLAYWRIGHT_LAUNCH_OPTIONS",
            {
                "headless": True,
            },
            priority="spider",
        )
        settings.set(
            "TWISTED_REACTOR",
            "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
            priority="spider",
        )
        settings.set(
            "USER_AGENT",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.3",
            priority="spider",
        )

    # provide arguments using the -a option (they will be passed as strings!)
    def __init__(
        self,
        search_terms_csv: str,
        max_pages: int = 3,
        scrape_articles: bool = True,
        random_page_traversal: bool = False,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        if search_terms_csv == "":
            print("search_terms_csv not provided!")
            exit()
        self.search_terms = search_terms_csv.split(",")
        self.max_pages = int(max_pages)
        self.start_urls = [self._build_current_search_results_url(results_page=1)]
        self.scrape_articles = self.__str_to_bool(scrape_articles)
        self.random_page_traversal = self.__str_to_bool(random_page_traversal)
        self.all_article_urls: Set[str] = set()

    def _build_current_search_results_url(self, results_page: int) -> str:
        raise NotImplementedError

    def _get_num_result_pages(self, response) -> int:
        raise NotImplementedError

    def _is_search_results_page(self, response) -> bool:
        raise NotImplementedError

    def _get_article_urls(self, response) -> List[str]:
        raise NotImplementedError

    def _get_article_title(self, response) -> str:
        raise NotImplementedError

    def _get_article_author(self, response) -> str:
        raise NotImplementedError

    def _get_published_date(self, response) -> str:
        raise NotImplementedError

    def _parse_article(self, response) -> GenericWebsiteItem:
        article_title = self._get_article_title(response)
        author = self._get_article_author(response)
        published_date = self._get_published_date(response)
        visited_date: str = datetime.datetime.now().isoformat()
        filename = slugify(article_title)

        # write raw html, but use custom filename
        self.write_raw_response(response=response, filename=filename)

        item = self.init_item(
            response=response,
            filename=filename,
            title=article_title,
            author=author,
            published_date=published_date,
            visited_date=visited_date,
        )
        return item

    def parse(self, response, **kwargs):
        # if on the first search results page
        if response.url in self.start_urls:
            # get the number of search results pages
            num_result_pages = self._get_num_result_pages(response)
            self.log(f"Found {num_result_pages} search results pages.")

            # find the urls of the articles of the first results page
            article_urls = self._get_article_urls(response)
            self.all_article_urls.update(article_urls)

            # visit every article of the fist results page
            if self.scrape_articles:
                for url in article_urls:
                    yield scrapy.Request(
                        url,
                        callback=self.parse,
                        cookies=self.cookies,
                        meta={"playwright": True} if self.use_playwright else None,
                    )

            # visit every other search results page
            page_urls = list(range(2, num_result_pages + 1))
            if self.random_page_traversal:
                random.shuffle(page_urls)
            for page in page_urls:
                if page > self.max_pages:
                    break
                next_page_url = self._build_current_search_results_url(
                    results_page=page
                )
                yield scrapy.Request(
                    next_page_url,
                    callback=self.parse,
                    cookies=self.cookies,
                    meta={"playwright": True} if self.use_playwright else None,
                )

        # if on a search results page
        if self._is_search_results_page(response):
            # find the urls of the articles of the this results page
            article_urls = self._get_article_urls(response)
            self.all_article_urls.update(article_urls)

            # visit every article of the this results page
            if self.scrape_articles:
                for url in article_urls:
                    yield scrapy.Request(
                        url,
                        callback=self.parse,
                        cookies=self.cookies,
                        meta={"playwright": True} if self.use_playwright else None,
                    )

        # if on an article page
        else:
            yield self._parse_article(response)

    def __del__(self):
        fn = self.output_dir / "all_article_urls.json"
        print(f"Saving {len(self.all_article_urls)} articles to {fn}.")
        srsly.write_json(fn, list(self.all_article_urls))
