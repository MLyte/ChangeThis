from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

settings = get_settings()

# pool_pre_ping + pool_recycle guard against a network device on the DB path
# dropping idle TCP flows; connect_args keeps any broken connection from hanging
# a worker indefinitely (see the 2026-09 firewall incident). Drop the kwargs to
# go back to a bare pool if you ever want to.
CONNECT_ARGS = {"timeout": 10, "command_timeout": 30}
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=CONNECT_ARGS,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
