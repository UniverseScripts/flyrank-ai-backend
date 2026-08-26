import os
import time
import re
import json
from bs4 import BeautifulSoup
from typing import Optional
from requests import request
from urllib.parse import urljoin
from datetime import datetime, timezone
from pydantic import ValidationError

from schema.books import Books

IDENTITY = "FlyRankInternship-A9/1.0 (https://github.com/UniverseScripts/flyrank-ai-backend)"
HEADERS = {"User-Agent": IDENTITY}

CACHE_FILE = "w5/cache/catalogue-page-1.html"
TARGET_URL = "https://books.toscrape.com/catalogue/page-1.html"

BASE_URL = "https://books.toscrape.com"

def fetch_and_save_page(url: str, method: str = "GET", headers: dict = None, cache_file: str = None, delay: float = 0.5) -> BeautifulSoup:
    if cache_file and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                content = f.read()
                print(f"CACHE HIT: {cache_file} ({len(content.encode('utf-8'))} bytes)")
                return BeautifulSoup(content, "html.parser")
        except Exception as e:
            print(f"Error: {e}")
            return None

    time.sleep(delay)

    try:
        page = request(method=method, url=url, headers=headers, timeout=5.0)
        if page.status_code != 200:
            print(f"Fetch failed with status code: {page.status_code}")
            return None

        content = page.text
        if cache_file:
            save_page(content=content, filename=cache_file)
            print(f"FETCH: {url} -> {cache_file} ({len(content.encode('utf-8'))} bytes)")
        return BeautifulSoup(content, "html.parser")
    except Exception as e:
        print(f"Error: {e}")
        return None


def save_page(filename: str, content: str) -> None:
    if not content:
        print("No page or content to save\n")
        return

    if not os.path.exists(filename):
        try:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
        except Exception as e:
            print(f"Error: {e}")
            return
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"Error: {e}")


def extract_book_detail(soup: BeautifulSoup, product_url: str, source_page: str) -> dict:
    product_main = soup.select_one("div.product_main")
    if not product_main:
        return None

    # Title
    title_el = product_main.select_one("h1")
    title = title_el.get_text(strip=True) if title_el else ""

    # Price
    price_el = product_main.select_one("p.price_color")
    price_text = price_el.get_text(strip=True) if price_el else ""
    price_gbp = float(re.sub(r'[^\d.]', '', price_text))

    # Availability
    avail_el = product_main.select_one("p.instock.availability")
    availability_text = re.sub(r'\s+', ' ', avail_el.get_text()).strip() if avail_el else ""

    # Star Rating
    rating_el = product_main.select_one("p.star-rating")
    rating_classes = rating_el.get("class", []) if rating_el else []
    rating_text = next((c for c in rating_classes if c != "star-rating"), None)

    # Description (null if not on page)
    desc_header = soup.select_one("#product_description")
    if desc_header:
        desc_p = desc_header.find_next_sibling("p")
        description = desc_p.get_text(strip=True) if desc_p else None
    else:
        description = None

    try:
        validate = Books(
            title=title,
            product_url=product_url,
            price_text=price_text,
            price_gbp=price_gbp,
            availability_text=availability_text,
            rating_text=rating_text,
            description=description,
            source_page=source_page,
            fetched_at=datetime.now(timezone.utc).isoformat()
        )
        return validate.model_dump(mode="json")
    except ValidationError as e:
        print(f"Validation Error for {product_url}\n{e}")
        return None
    except Exception as e:
        print(f"Error for {product_url}: {e}")
        return None


def get_multiple_categories(start_url: str, max_pages: int = 5, in_detail: bool = False) -> list[str]:
    current_url = start_url
    discovered_books = []
    book_details = []
    pages_crawled = 0

    for page_num in range(1, max_pages + 1):
        cache_path = f"w5/cache/catalogue-page-{page_num}.html"

        page_soup = fetch_and_save_page(url=current_url, headers=HEADERS, cache_file=cache_path)

        if not page_soup:
            print(f"Failed to fetch page {page_num}")
            break
        
        pages_crawled += 1

        book_tags = page_soup.select("article.product_pod h3 a")

        for book in book_tags:
            href = book.get("href")
            if href:
                link = urljoin(current_url, href)
                if in_detail:
                    slug = link.split("/")[-2]
                    book_cache_file = f"w5/cache/{slug}.html"
                    book_soup = fetch_and_save_page(url=link, headers=HEADERS, cache_file=book_cache_file)
                    if book_soup:
                        record = extract_book_detail(soup=book_soup, product_url=link, source_page=current_url)
                    book_details.append(record)
                discovered_books.append(link)
            
        if page_num < max_pages:
            next_tag = page_soup.select_one("li.next a")
            if next_tag and next_tag.get("href"):
                current_url = urljoin(current_url, next_tag.get("href"))
            else:
                break
    
    unique_books = list(dict.fromkeys(discovered_books))
    print(f"catalogue_pages={pages_crawled} , discovered={len(unique_books)} , book_details={len(book_details)}")
    return book_details

if __name__ == "__main__":
    # page = fetch_and_save_page(url=TARGET_URL, headers=HEADERS, cache_file=CACHE_FILE)
    # if not page:
    #     print("No page fetched")

    # categories_page_soup = fetch_and_save_page(url=BASE_URL, headers=HEADERS, cache_file="w5/cache/all-categories.html")
    
    records = get_multiple_categories(start_url=TARGET_URL, max_pages=3, in_detail=True)
    
    save_page("w5/output/books.json", json.dumps(records, indent=2))
    print(f"✅ Successfully saved {len(records)} records to w5/output/books.json")