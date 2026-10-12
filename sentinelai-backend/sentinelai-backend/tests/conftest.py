"""
Integration test fixtures. These require a real Postgres instance with the
pgvector extension available (set TEST_DATABASE_URL, e.g.
postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinelai_test) —
vector columns and cosine_distance() have no meaningful sqlite/mock
equivalent, so these tests are not run in this sandbox (no local Postgres
available here). Run them yourself with `pytest` after `docker compose up
postgres` or equivalent.
"""
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinelai_test"))
os.environ.setdefault("APP_SECRET", "test-secret")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("STORAGE_DIR", "./test_storage")
os.environ.setdefault("PROCESS_DOCUMENTS_INLINE", "true")

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(TEST_DATABASE_URL, future=True)
TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(scope="session", autouse=True)
async def _setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session
        # Clean all rows between tests, in FK-safe reverse order, so each
        # test starts from a blank slate without re-creating the schema.
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


@pytest.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
