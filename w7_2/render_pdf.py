from playwright.async_api import async_playwright
from pathlib import Path

# Write a function that builds an HTML page (a template string is fine) from your report object: a title with today's
# date, the two totals, a small table for the top 5, and a long table at the bottom — all orders, or all 60 books 
async def render_pdf_report(data: dict, report_id: int | str = "test"):
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

    reports_dir = Path(__file__).resolve().parent / "reports"
    reports_dir.mkdir(exist_ok=True)
    file_path = reports_dir / f"{report_id}.pdf"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_content(pdf_html)
        await page.pdf(path=file_path, format="A4", print_background=True)
        await browser.close()