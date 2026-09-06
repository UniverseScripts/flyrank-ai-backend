from pydantic import BaseModel

class BookReport(BaseModel):
    total_books: int
    average_price: float
    top_5_expensive_books: list[tuple[str, float]]
    books_per_rating: list[tuple[int, int]]