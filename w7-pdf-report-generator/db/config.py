from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, AsyncSession
from settings import settings
from sqlalchemy.orm import sessionmaker, declarative_base


async_engine = create_async_engine(url=settings.database_url, echo=True)

AsyncLocalSession = sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()

async def create_tables():
    import models  # noqa: F401
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db_session():
    async with AsyncLocalSession() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()

async def dispose_engine():
    await async_engine.dispose()
