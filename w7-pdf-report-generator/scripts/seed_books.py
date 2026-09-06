import json
from pathlib import Path
from db.config import get_db_session, create_tables
from models import *

async def seed_books():
    # create tables if not exist
    await create_tables()

    # get path of the json file
    json_file = Path(__file__).parent.parent.parent / "w5-the-polite-scraper" / "output" / "books.json"
    if not json_file.exists():
        json_file = Path(__file__).parent.parent.parent / "w5" / "output" / "books.json"

    with open(json_file, "r", encoding="utf-8") as f:
        books = json.load(f)
    
    # get session
    async for session in get_db_session():
        # normalize data
        # format: [dict]
        # remove _sa_instance_state key
        rating_map = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}
        books = [
            {
                "title": book["title"],
                "price": book.get("price_gbp", 0.0),
                "rating": rating_map.get(book.get("rating_text"), 0),
                "url": book.get("product_url", ""),
            }
            for book in books
        ]

        # insert data
        await session.execute(Books.__table__.delete())
        await session.execute(Books.__table__.insert(), books)

        await session.commit()

        print(f"Inserted {len(books)} books")

if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_books())