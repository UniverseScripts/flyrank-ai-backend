import os
import time
from bs4 import BeautifulSoup
from requests import request
from urllib.parse import urljoin

IDENTITY = "FlyRankInternship-A9/1.0 (https://github.com/UniverseScripts/flyrank-ai-backend)"
HEADERS = {"User-Agent": IDENTITY}

CACHE_FILE = "w5/cache/catalogue-page-1.html"
TARGET_URL = "https://books.toscrape.com/catalogue/page-1.html"

BASE_URL = "https://books.toscrape.com"

def fetch_and_save_page(url: str, method: str = "GET", headers: dict = None, cache_file: str = None, delay: float = 3.0) -> BeautifulSoup:
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
            save_page(page=content, filename=cache_file)
            print(f"FETCH: {url} -> {cache_file} ({len(content.encode('utf-8'))} bytes)")
        return BeautifulSoup(content, "html.parser")
    except Exception as e:
        print(f"Error: {e}")
        return None

def save_page(page: BeautifulSoup, filename: str) -> None:
    if not page:
        print("No page to save\n")
        return

    if not os.path.exists(filename):
        try:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
        except Exception as e:
            print(f"Error: {e}")
            return
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(page)
    except Exception as e:
        print(f"Error: {e}")

def get_multiple_categories(start_url: str, max_pages: int = 5) -> list[str]:
    current_url = start_url
    discovered_books = []
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
                discovered_books.append(link)
            
        if page_num < max_pages:
            next_tag = page_soup.select_one("li.next a")
            if next_tag and next_tag.get("href"):
                current_url = urljoin(current_url, next_tag.get("href"))
            else:
                break
    
    unique_books = list(dict.fromkeys(discovered_books))
    print(f"catalogue_pages={pages_crawled} , discovered={len(discovered_books)} , unique_urls={len(unique_books)}")
    return unique_books

if __name__ == "__main__":
    # page = fetch_and_save_page(url=TARGET_URL, headers=HEADERS, cache_file=CACHE_FILE)
    # if not page:
    #     print("No page fetched")
    categories_page_soup = fetch_and_save_page(url=BASE_URL, headers=HEADERS, cache_file="w5/cache/all-categories.html")
    get_multiple_categories(start_url=TARGET_URL, max_pages=3)