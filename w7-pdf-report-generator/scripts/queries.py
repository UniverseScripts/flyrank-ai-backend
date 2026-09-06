# Write the queries that turn your rows into a report — this is aggregation: COUNT , SUM , AVG , GROUP BY . Your
# report needs four things. Bookstore: total number of
# books · average price ( AVG(price) ) · top 5 most expensive books ( ORDER BY price DESC LIMIT 5 ) · number
# of books per star rating ( GROUP BY rating ).
# Put them in one function getReportData() that returns a single object/dict with those four results.
# Print it as JSON from a tiny test script. Look at the numbers. Do they make sense against your data? (If one
# product's revenue is bigger than total revenue, the bug is in the query, not the data.)

import json
import asyncio
from sqlalchemy.future import select
from sqlalchemy.sql import func
from db.config import AsyncLocalSession
from models.books import Books
from schemas.books_report import BookReport
from sqlalchemy.ext.asyncio import AsyncSession

async def getReportData(db: AsyncSession | None = None):
    async def _execute(session: AsyncSession):
        query_aggregate = {}

        # 1. Get the total number of books
        total_res = await session.execute(
            select(func.count(Books.id))
        )
        query_aggregate['total_books'] = total_res.scalar()

        # 2. Get the average price of books
        avg_res = await session.execute(
            select(func.avg(Books.price))
        )
        query_aggregate['average_price'] = round(float(avg_res.scalar() or 0.0), 2)

        # 3. Get the top 5 most expensive books
        top5_res = await session.execute(
            select(Books.title, Books.price)
            .order_by(Books.price.desc())
            .limit(5)
        )
        query_aggregate['top_5_expensive_books'] = [
            (str(row[0]), float(row[1])) for row in top5_res.all()
        ]

        # 4. Get the number of books per star rating
        rating_res = await session.execute(
            select(Books.rating, func.count(Books.id))
            .group_by(Books.rating)
            .order_by(Books.rating.asc())
        )
        query_aggregate['books_per_rating'] = [
            (int(row[0]), int(row[1])) for row in rating_res.all()
        ]

        book_report = BookReport.model_validate({
            "total_books": query_aggregate['total_books'],
            "average_price": query_aggregate['average_price'],
            "top_5_expensive_books": query_aggregate['top_5_expensive_books'],
            "books_per_rating": query_aggregate['books_per_rating']
        })

        return book_report.model_dump()

    if db is not None:
        return await _execute(db)
    async with AsyncLocalSession() as session:
        return await _execute(session)

if __name__ == "__main__":
    print(json.dumps(asyncio.run(getReportData()), indent=4))
