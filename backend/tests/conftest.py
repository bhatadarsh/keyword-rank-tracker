"""All tests use a disposable database, never the application's SQLite file."""
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

if "database" in sys.modules:
    raise RuntimeError("Run pytest in a dedicated process before importing the application database.")

_test_directory = TemporaryDirectory(prefix="nexusrank-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(_test_directory.name) / "tests.db").as_posix()
os.environ["EXPORT_DIR"] = str(Path(_test_directory.name) / "exports")
os.environ["SERP_API_KEY"] = ""
os.environ["SEARXNG_URL"] = ""
os.environ["SERP_PROVIDER"] = "mock"
os.environ["CORS_ORIGINS"] = "http://localhost:5173,http://127.0.0.1:5173"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import Base, engine
import models  # Register tables before creating the isolated schema.


@pytest.fixture(autouse=True)
def isolated_database():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    _test_directory.cleanup()
