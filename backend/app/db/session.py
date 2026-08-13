"""Engine y sesión de SQLAlchemy, más la dependencia `get_db` para FastAPI."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping evita el clásico error "MySQL server has gone away" cuando
# una conexión quedó inactiva demasiado tiempo (frecuente en desarrollo).
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
