from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from .config import get_settings

settings = get_settings()

# NullPool is a workaround for a firewall on the front-tool-prod -> DB path
# (10.254.98.x -> 10.253.98.x:5432) that silently reaps idle TCP flows: a
# persistent pool ends up handing out dead sockets. Once the network side is
# fixed and confirmed stable, restore pooling:
#     create_async_engine(settings.database_url, pool_pre_ping=True,
#                         pool_recycle=1800, connect_args=CONNECT_ARGS)
# Keep CONNECT_ARGS either way - unbounded DB waits are what turned the incident
# into an nginx 504 / systemd SIGKILL instead of a fast error.
CONNECT_ARGS = {"timeout": 10, "command_timeout": 30}
engine = create_async_engine(
    settings.database_url,
    poolclass=NullPool,
    connect_args=CONNECT_ARGS,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
