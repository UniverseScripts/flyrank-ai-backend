import unittest
from bs4 import BeautifulSoup
from schema.books import Books
from main import extract_book_detail

class TestScraperEdgeCases(unittest.TestCase):

    def test_missing_description(self):
        """Test extraction when product description section is completely absent in HTML."""
        html_without_desc = """
        <div class="product_main">
            <h1>Test Book Without Description</h1>
            <p class="price_color">£19.99</p>
            <p class="instock availability">In stock (5 available)</p>
            <p class="star-rating Four"></p>
        </div>
        """
        soup = BeautifulSoup(html_without_desc, "html.parser")
        record = extract_book_detail(
            soup=soup,
            product_url="https://books.toscrape.com/catalogue/test-book_1/index.html",
            source_page="https://books.toscrape.com/catalogue/page-1.html"
        )
        self.assertIsNotNone(record)
        self.assertIsNone(record["description"])
        self.assertEqual(record["price_gbp"], 19.99)
        self.assertEqual(record["rating_text"], "Four")

    def test_price_normalization_variations(self):
        """Test price strings with encoding artifacts or whitespace."""
        test_prices = ["£51.77", "Â£51.77", "  £0.99  ", "£123.45"]
        for p in test_prices:
            html = f"""
            <div class="product_main">
                <h1>Pricing Test Book</h1>
                <p class="price_color">{p}</p>
                <p class="instock availability">In stock</p>
                <p class="star-rating One"></p>
            </div>
            """
            soup = BeautifulSoup(html, "html.parser")
            record = extract_book_detail(
                soup=soup,
                product_url="https://books.toscrape.com/catalogue/price-test/index.html",
                source_page="https://books.toscrape.com/catalogue/page-1.html"
            )
            self.assertIsNotNone(record)
            self.assertIsInstance(record["price_gbp"], float)

    def test_broken_product_html(self):
        """Test completely malformed product HTML (missing .product_main container)."""
        malformed_html = "<html><body><div>Error 500: Database connection failure</div></body></html>"
        soup = BeautifulSoup(malformed_html, "html.parser")
        record = extract_book_detail(
            soup=soup,
            product_url="https://books.toscrape.com/catalogue/malformed/index.html",
            source_page="https://books.toscrape.com/catalogue/page-1.html"
        )
        self.assertIsNone(record)

    def test_schema_validation_rejection(self):
        """Test Pydantic schema validation when required field types are violated."""
        with self.assertRaises(Exception):
            Books(
                title="Bad Record",
                product_url="https://books.toscrape.com",
                price_text="£10.00",
                price_gbp="NOT_A_FLOAT",  # Should raise ValidationError
                availability_text="In stock",
                rating_text="Two",
                description=None,
                source_page="https://books.toscrape.com",
                fetched_at="2026-08-26T00:00:00Z"
            )

if __name__ == "__main__":
    unittest.main()
