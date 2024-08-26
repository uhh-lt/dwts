from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    pass


class SpanTextEntityLinkORM(ORMBase):
    id = mapped_column(Integer, primary_key=True, index=True)
    linked_entity_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("entity.id", ondelete="CASCADE"), index=True
    )
    linked_span_text_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("spantext.id", ondelete="CASCADE"), index=True
    )
    is_human: Mapped[Boolean] = mapped_column(Boolean, default=False, index=True)
