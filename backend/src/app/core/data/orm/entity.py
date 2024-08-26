from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.span_text import SpanTextORM


class EntityORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )
    is_human: Mapped[Boolean] = mapped_column(Boolean, default=False, index=True)
    knowledge_base_id: Mapped[str] = mapped_column(String, default="", index=True)

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    span_texts: Mapped[List["SpanTextORM"]] = relationship(
        "SpanTextORM", secondary="spantextentitylink"
    )


#    __table_args__ = (
#        UniqueConstraint(
#            "project_id",
#            "name",
#            name="UC_name_unique_per_project",
#        ),
#    )
