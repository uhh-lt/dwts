from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_text import SpanTextORM


class CRUDSpanText(CRUDBase[SpanTextORM, SpanTextCreate, None]):
    def update(self, db: Session, *, id: int, update_dto) -> SpanTextORM:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()

    def create(self, db: Session, *, create_dto: SpanTextCreate) -> SpanTextORM:
        # Only create when not already present
        db_obj = self.read_by_text(db=db, text=create_dto.text)
        if db_obj is None:
            return super().create(db=db, create_dto=create_dto)
        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanTextCreate]
    ) -> List[SpanTextORM]:
        span_texts: List[SpanTextORM] = []
        to_create: List[SpanTextCreate] = []

        # every span text needs to be created at most once
        span_text_dict = {}
        for create_dto in create_dtos:
            span_text_dict[create_dto.text] = create_dto

        # only create span texts when not already present
        to_create = filter(
            lambda x: self.read_by_text(db=db, text=x.text) is None,
            span_text_dict.values(),
        )
        super().create_multi(db=db, create_dtos=to_create)

        span_texts = list(
            map(lambda x: self.read_by_text(db=db, text=x.text), create_dtos)
        )
        return span_texts

    def read_by_text(self, db: Session, *, text: str) -> Optional[SpanTextORM]:
        return db.query(self.model).filter(self.model.text == text).first()

    def read_all_by_text(self, db: Session, *, texts: List[str]) -> List[SpanTextORM]:
        return db.query(self.model).filter(self.model.text in texts)


crud_span_text = CRUDSpanText(SpanTextORM)
