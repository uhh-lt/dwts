from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.user import UserORM


class CodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, index=False)
    color: Mapped[Optional[str]] = mapped_column(String, index=False)
    created: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    current_code: Mapped["CurrentCodeORM"] = relationship(
        "CurrentCodeORM", uselist=False, back_populates="code", passive_deletes=True
    )

    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM", uselist=False, back_populates="code", passive_deletes=True
    )

    # many to one
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="codes")

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")

    # hierarchy reference
    parent_code_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE")
    )
    parent_code: Mapped["CodeORM"] = relationship("CodeORM", remote_side=[id])

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "project_id",
            "name",
            "parent_code_id",
            name="UC_name_unique_per_user_parent_and_project",
        ),
    )


class CurrentCodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="current_code",
        passive_deletes=True,
    )

    code_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped["CodeORM"] = relationship("CodeORM", back_populates="current_code")

    # one to many
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM", back_populates="current_code", passive_deletes=True
    )

    # one to many
    bbox_annotations: Mapped[List["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM", back_populates="current_code", passive_deletes=True
    )
