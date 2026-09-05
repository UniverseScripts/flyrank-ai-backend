import datetime
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from playwright.async_api import async_playwright

from db.config import create_tables, dispose_engine, get_db_session
from models import Books, Reports
from render_pdf import render_pdf_report


VERSION = "v1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server Starting...")

    await create_tables()
    
    print("Databases created")

    print("Server is online!")

    yield

    await dispose_engine()
    
    print("Server Stopped...")

app = FastAPI(version="0.0.1", description="PDF Generator with Playwright", title="PDF Generator", lifespan=lifespan)


@app.get("/")
async def root():
    return {"message": "Welcome to the PDF Generator API"}

@app.get("/health", status_code=200)
async def health():
    return {"status": "ok"}

@app.post("/reports", status_code=201)
@app.post(f"/{VERSION}/reports", status_code=201)
async def generate_report(db: AsyncSession = Depends(get_db_session)):
    try:
        # fetch all books, avg_price
        stmt = select(Books)
        result = await db.execute(stmt)
        all_rows = result.scalars().all()
        if not all_rows:
            raise HTTPException(status_code=404, detail="No books found")
        
        # get top 5 books by price
        stmt_top5 = select(Books).order_by(Books.price.desc()).limit(5)
        result_top5 = await db.execute(stmt_top5)
        top_5_rows = result_top5.scalars().all()

        # get average price
        avg_price_row = await db.execute(select(func.avg(Books.price)))
        avg_price = avg_price_row.scalar_one()

        # Build data dict for report
        data = {
            "date": datetime.date.today().isoformat(),
            "total_books": len(all_rows),
            "average_price": round(avg_price, 2) if avg_price is not None else 0.0,
            "top_5_books": [
                {"title": b.title, "price": f"£{b.price:.2f}"}
                for b in top_5_rows
            ],
            "all_books": [
                {"title": b.title, "price": f"£{b.price:.2f}"}
                for b in all_rows
            ]
        }

        # Get id based on incremental ids on reports
        stmt_id = select(Reports.id).order_by(Reports.id.desc()).limit(1)
        result_id = await db.execute(stmt_id)
        last_id = result_id.scalar_one_or_none()
        report_id = (last_id or 0) + 1
        path = f"reports/{report_id}.pdf"
        
        # generate PDF async
        await render_pdf_report(data=data, report_id=report_id)
        
        report = Reports(path=path)
        db.add(report)
        await db.commit()
        await db.refresh(report)

        return {"id": report_id, "file": f"/reports/{report_id}/file"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/reports/{id}", status_code=200)
@app.get(f"/{VERSION}/reports/{{id}}", status_code=200)
async def get_report(id: int, db: AsyncSession = Depends(get_db_session)):
    try:
        # get report
        stmt = select(Reports).where(Reports.id == id)
        result = await db.execute(stmt)
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # return row and file path
        return {"id": report.id, "path": report.path, "file": f"/reports/{report.id}/file"}
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{id}/file", status_code=200)
@app.get(f"/{VERSION}/reports/{{id}}/file", status_code=200)
async def get_report_file(id: int, db: AsyncSession = Depends(get_db_session)):
    header = {'Content-Disposition': f'attachment; filename="{id}.pdf"'}
    try:
        # get report
        stmt = select(Reports).where(Reports.id == id)
        result = await db.execute(stmt)
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        file_path = Path(__file__).resolve().parent / report.path if not Path(report.path).exists() else Path(report.path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # return as file response with binary stream
        return FileResponse(file_path, media_type="application/pdf", filename=f"{id}.pdf", headers=header)
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)