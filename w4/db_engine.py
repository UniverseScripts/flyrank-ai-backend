from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_async_engine(url=settings.SUPABASE_URL, echo=True)

AsyncLocalSession = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False

)

Base = declarative_base()

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncLocalSession() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()