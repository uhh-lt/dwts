from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.user import UserORM


class ConceptOverTimeAnalysisORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # JSON representation of a list of COTAConcepts (see DTO)
    concepts: Mapped[str] = mapped_column(
        String,
        server_default="[]",
        nullable=False,
        index=False,
    )

    # JSON representation of a list of COTASentences that form the searchspace (see DTO)
    search_space: Mapped[str] = mapped_column(
        String,
        server_default="[]",
        nullable=False,
        index=False,
    )

    created: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=False
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.current_timestamp(),
        index=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="cotas")
