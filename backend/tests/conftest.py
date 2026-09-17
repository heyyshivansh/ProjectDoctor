import os
import shutil
import tempfile
import uuid
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings
from app.services.storage_service import storage_service, LocalStorageService


@pytest.fixture(scope="session")
def test_engine():
    """Create a temporary SQLite in-memory engine with foreign keys enabled."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    """Provide a transactional database session for testing."""
    connection = test_engine.connect()
    transaction = connection.begin()
    SessionTest = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = SessionTest()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def temp_storage(tmp_path, monkeypatch) -> LocalStorageService:
    """Create a temporary isolated storage directory for tests."""
    storage_dir = tmp_path / "uploads"
    storage_dir.mkdir(parents=True, exist_ok=True)
    custom_storage = LocalStorageService(base_storage_dir=str(storage_dir))

    # Monkeypatch the global storage_service and settings
    monkeypatch.setattr("app.api.routes.projects.storage_service", custom_storage)
    monkeypatch.setattr("app.services.storage_service.storage_service", custom_storage)
    monkeypatch.setattr(settings, "STORAGE_LOCAL_DIR", str(storage_dir))

    return custom_storage


@pytest.fixture
def client(db_session, temp_storage) -> Generator[TestClient, None, None]:
    """TestClient with overridden get_db dependency and temporary storage."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
