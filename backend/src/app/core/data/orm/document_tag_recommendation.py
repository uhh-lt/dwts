from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.user import UserORM


class DocumentTagRecommendationJobORM(ORMBase):
    task_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    model_name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )

    # many to one
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user: Mapped["UserORM"] = relationship(
        "UserORM", back_populates="document_tag_recommendations"
    )
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="document_tag_recommendations"
    )

    document_tag_recommendation_links: Mapped[
        List["DocumentTagRecommendationLinkORM"]
    ] = relationship(
        "DocumentTagRecommendationLinkORM",
        back_populates="recommendation",
        passive_deletes=True,
    )


class DocumentTagRecommendationLinkORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recommendation_task_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documenttagrecommendationjob.task_id", ondelete="CASCADE"),
        primary_key=False,
    )
    source_document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=False
    )
    predicted_tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documenttag.id", ondelete="CASCADE"), primary_key=False
    )
    prediction_score: Mapped[float] = mapped_column(Float, index=True, nullable=True)
    is_accepted: Mapped[bool] = mapped_column(Boolean, index=True, nullable=True)

    # relationships
    recommendation: Mapped["DocumentTagRecommendationJobORM"] = relationship(
        "DocumentTagRecommendationJobORM",
        back_populates="document_tag_recommendation_links",
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="document_tag_recommendation_link"
    )
    predicted_tag: Mapped["DocumentTagORM"] = relationship(
        "DocumentTagORM",
        back_populates="document_tag_recommendation_links",
        foreign_keys="[DocumentTagRecommendationLinkORM.predicted_tag_id]",
    )
