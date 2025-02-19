from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase
from app.core.data.orm.timeline_analysis import TimelineAnalysisORM

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.concept_over_time_analysis import ConceptOverTimeAnalysisORM
    from app.core.data.orm.document_tag_recommendation import (
        DocumentTagRecommendationJobORM,
    )
    from app.core.data.orm.memo import MemoORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.refresh_token import RefreshTokenORM
    from app.core.data.orm.whiteboard import WhiteboardORM


class UserORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    last_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String, nullable=False)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM", uselist=False, back_populates="user", passive_deletes=True
    )

    # one to many
    annotation_documents: Mapped[List["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM", back_populates="user", passive_deletes=True
    )

    memos: Mapped[List["MemoORM"]] = relationship(
        "MemoORM", back_populates="user", passive_deletes=True
    )

    timeline_analysis: Mapped[List["TimelineAnalysisORM"]] = relationship(
        "TimelineAnalysisORM", back_populates="user", passive_deletes=True
    )

    whiteboards: Mapped[List["WhiteboardORM"]] = relationship(
        "WhiteboardORM", back_populates="user", passive_deletes=True
    )

    cotas: Mapped[List["ConceptOverTimeAnalysisORM"]] = relationship(
        "ConceptOverTimeAnalysisORM", back_populates="user", passive_deletes=True
    )

    refresh_tokens: Mapped[List["RefreshTokenORM"]] = relationship(
        "RefreshTokenORM", back_populates="user", passive_deletes=True
    )

    document_tag_recommendations: Mapped[List["DocumentTagRecommendationJobORM"]] = (
        relationship(
            "DocumentTagRecommendationJobORM",
            back_populates="user",
            passive_deletes=True,
        )
    )

    # many to many
    projects: Mapped[List["ProjectORM"]] = relationship(
        "ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users"
    )
