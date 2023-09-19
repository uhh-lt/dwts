from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class SpanTextORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    # FIXME: index row size X exceeds btree version 4 maximum 2704 for index ... (Problem with very large annotations)
    text = Column(String, index=True)

    # one to many
    span_annotations: List["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM", back_populates="span_text", passive_deletes=True
    )
