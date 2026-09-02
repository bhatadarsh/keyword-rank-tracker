from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class KeywordStatus(str, enum.Enum):
    pending = "pending"
    found = "found"
    not_found = "not_found"
    api_error = "api_error"
    rate_limited = "rate_limited"
    timeout = "timeout"
    invalid = "invalid"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    status = Column(String, default=JobStatus.queued.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company_name = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    country = Column(String, nullable=False)
    language = Column(String, nullable=False)
    device = Column(String, nullable=False)
    depth = Column(Integer, nullable=False, default=100)

    tasks = relationship("KeywordTask", back_populates="job", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Job id={self.id!r} status={self.status!r} domain={self.domain!r}>"


class KeywordTask(Base):
    __tablename__ = "keyword_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    keyword = Column(String, nullable=False, index=True)
    country = Column(String, nullable=False)
    language = Column(String, nullable=False)
    device = Column(String, nullable=False)

    # Result columns — populated after processing
    rank = Column(Integer, nullable=True)
    ranking_url = Column(String, nullable=True)
    page_title = Column(String, nullable=True)  # NEW: page title from SERP result
    status = Column(String, default=KeywordStatus.pending.value, nullable=False)

    job = relationship("Job", back_populates="tasks")

    def __repr__(self):
        return f"<KeywordTask id={self.id} keyword={self.keyword!r} rank={self.rank} status={self.status!r}>"
