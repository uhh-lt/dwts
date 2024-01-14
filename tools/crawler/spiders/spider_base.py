from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

import scrapy
from scrapy.http import Response

from crawler.items import GenericWebsiteItem
from crawler.spiders.utils import slugify, validate_output_dir


class SpiderBase(scrapy.Spider):
    # provide arguments using the -a option

    def __init__(
        self,
        output_dir: Optional[str] = None,
        prefix: Optional[str] = None,
        cookies: Optional[str] = None,
        use_playwright: bool = False,
        *args,
        **kwargs,
    ):
        super(SpiderBase, self).__init__(*args, **kwargs)
        self.prefix = prefix if prefix else ""
        self.output_dir = validate_output_dir(output_dir)
        # this is the raw cookie string from an http request (e.g. "Cookie: a=b; c=d;")
        self.cookies = self._create_cookies_dict(cookies) if cookies else None
        self.use_playwright = use_playwright

    # add cookies to each request if set
    # see https://docs.scrapy.org/en/latest/topics/spiders.html#scrapy.Spider.start_requests
    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                cookies=self.cookies,
                meta={"playwright": True} if self.use_playwright else None,
            )

    def generate_filename(self, response: Response) -> str:
        parsed_url = urlparse(response.url)
        article_slug = Path(parsed_url.path).stem
        filename = slugify(f"{self.prefix}-{article_slug}")
        return filename

    def write_raw_response(
        self, response: Response, filename: Optional[str] = None
    ) -> None:
        if not filename:
            filename = self.generate_filename(response=response)

        filename_with_extension = f"{filename}.html"
        try:
            with open(
                self.output_dir / filename_with_extension, "w", encoding="UTF-8"
            ) as f:
                f.write(response.body.decode(response.encoding))
        except UnicodeDecodeError:
            with open(self.output_dir / filename_with_extension, "wb") as f2:
                f2.write(response.body)
        self.log(f"Saved raw html {filename_with_extension}")

    def _create_cookies_dict(self, cookie: str) -> Dict[str, str]:
        if cookie.startswith("Cookie: "):
            cookie = cookie[8:]
        cookies = cookie.replace(" ", "").split(";")
        cookies_dict = {}
        for c in cookies:
            kv = c.split("=")
            if len(kv) == 2:
                cookies_dict[kv[0]] = kv[1]
            elif len(kv) > 2:
                # some cookies have = in their value
                cookies_dict[kv[0]] = "=".join(kv[1])
            else:
                self.log(f"Invalid cookie: {c}")

        return cookies_dict

    def init_item(
        self,
        response: Response,
        html: Optional[str] = None,
        filename: Optional[str] = None,
        **kwargs,
    ) -> GenericWebsiteItem:
        item = GenericWebsiteItem()

        item["url"] = response.url
        item["file_name"] = (
            filename if filename else self.generate_filename(response=response)
        )

        try:
            item["raw_html"] = response.body.decode(response.encoding)
        except UnicodeDecodeError:
            item["raw_html"] = response.body

        item["extracted_html"] = html if html else ""
        item["html"] = html if html else item["raw_html"]
        item["output_dir"] = str(self.output_dir)

        for key, value in kwargs.items():
            item[key] = value

        return item

    def parse(self, response, **kwargs):
        pass
