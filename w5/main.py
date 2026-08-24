from bs4 import BeautifulSoup
from requests import request

page = request("GET", "https://books.toscrape.com/robots.txt")
soup = BeautifulSoup(page.text, 'html.parser')

if __name__ == "__main__":
    print(soup.prettify())