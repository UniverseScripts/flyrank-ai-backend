from w3.db_engine import AsyncLocalSession
from sqlalchemy import select
from w3.db_models.tasks import Task


async def seed_3_examples():
    async with AsyncLocalSession() as db:
        try:
            stmt = select(Task)
            result = await db.execute(stmt)
            existing_tasks = result.scalars().all()
            if existing_tasks:
                return "Tasks already seeded"

            tasks = [
                Task(title="Task 1", done=False),
                Task(title="Task 2", done=False),
                Task(title="Task 3", done=False),
            ]

            db.add_all(tasks)
            await db.commit()
            return "Successfully inserted 3 tasks"
        except Exception as e:
            await db.rollback()
            return "Task failed to seed"