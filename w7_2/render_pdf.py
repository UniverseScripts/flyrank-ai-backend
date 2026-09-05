from playwright.sync_api import sync_playwright
from pathlib import Path

# Write a function that builds an HTML page (a template string is fine) from your report object: a title with today's
# date, the two totals, a small table for the top 5, and a long table at the bottom — all orders, or all 60 books 
def render_pdf_report(data: dict):
    date = data['date']
    total_books = data.get('total_books', len(data['all_books']))
    average_price = data.get('average_price', 0.0)

    top_5_books = ""
    for book in data['top_5_books']:
        val = book.get('price', book.get('quantity', ''))
        top_5_books += f"<tr><td>{book['title']}</td><td>{val}</td></tr>"
    
    all_books = ""
    for book in data['all_books']:
        val = book.get('price', book.get('quantity', ''))
        all_books += f"<tr><td>{book['title']}</td><td>{val}</td></tr>"
        
    pdf_html = f"""
    <html>
        <body>
            <h1>Weekly Performance Report</h1>
            <p>Report Generated on: {date}</p>
            <p>Total Books: {total_books}</p>
            <p>Average Price: £{average_price}</p>

            <h2>Top 5 Books</h2>
            <style>
                table {{
                    width: 100%;
                    border-collapse: collapse;
                }}
                th, td {{
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                }}
                thead {{
                    display: table-header-group;
                }}
                tr {{
                    break-inside: avoid;
                    page-break-inside: avoid;
                }}
            </style>
            <table>
                <thead>
                    <tr>
                        <th>Book</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {top_5_books}
                </tbody>
            </table>

            <h2>All Books</h2>
            <table>
                <thead>
                    <tr>
                        <th>Book</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {all_books}
                </tbody>
            </table>
        </body>
    </html>
    """

    Path("reports").mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(pdf_html)
        page.pdf(path="reports/test.pdf", format="A4", print_background=True)
        browser.close()

if __name__ == "__main__":
    import sqlite3

    db_path = Path(__file__).parent / "report.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    all_rows = c.execute("SELECT title, price FROM books").fetchall()
    top_5_rows = c.execute("SELECT title, price FROM books ORDER BY price DESC LIMIT 5").fetchall()
    avg_price = c.execute("SELECT AVG(price) FROM books").fetchone()[0]

    data = {
        "date": "2026-09-05",
        "total_books": len(all_rows),
        "average_price": round(avg_price, 2),
        "top_5_books": [{"title": r[0], "price": f"£{r[1]:.2f}"} for r in top_5_rows],
        "all_books": [{"title": r[0], "price": f"£{r[1]:.2f}"} for r in all_rows]
    }
    render_pdf_report(data)
    print("PDF generated successfully")