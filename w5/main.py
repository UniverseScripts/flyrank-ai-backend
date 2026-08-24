import os
from bs4 import BeautifulSoup
from requests import request

IDENTITY = "FlyRankInternship-A9/1.0 (https://github.com/UniverseScripts/flyrank-ai-backend)"
HEADERS = {"User-Agent": IDENTITY}

CACHE_FILE = "w5/cache/catalogue-page-1.html"
TARGET_URL = "https://books.toscrape.com/catalogue/page-1.html"

def fetch_and_save_page(url: str, method: str = "GET", headers: dict = None, cache_file: str = None) -> BeautifulSoup:
    if cache_file and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                content = f.read()
                print(f"CACHE HIT: {cache_file} ({len(content.encode('utf-8'))} bytes)")
                return BeautifulSoup(content, "html.parser")
        except Exception as e:
            print(f"Error: {e}")
            return None
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
    

if __name__ == "__main__":
    page = fetch_and_save_page(url=TARGET_URL, headers=HEADERS, cache_file=CACHE_FILE)
    if not page:
        print("No page fetched")