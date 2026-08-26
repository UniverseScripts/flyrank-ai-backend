from pydantic import BaseModel
from datetime import datetime, timedelta

class RunReports(BaseModel):
    start_time: datetime
    duration: timedelta
    pages_crawled: int
    discovered_books: int
    cache_hits: int
    valid_records: int
    invalid_records: int
    failed_pages: int
