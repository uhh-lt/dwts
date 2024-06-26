from typing import Dict, List, Optional

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
        # Only create when not already present
        span_texts: List[SpanTextORM] = []
        to_create: List[SpanTextCreate] = []
        span_text_idx: List[int] = []
        to_create_idx: List[int] = []
        text_create_map: Dict[str, int] = {}

        # TODO best would be "insert all (ignore existing) followed by get all"
        for i, create_dto in enumerate(create_dtos):
            db_obj = self.read_by_text(db=db, text=create_dto.text)
            span_texts.append(db_obj)
            if db_obj is None:
                if create_dto.text not in text_create_map:
                    text_create_map[create_dto.text] = len(to_create)
                    to_create.append(create_dto)
                span_text_idx.append(i)
                to_create_idx.append(text_create_map[create_dto.text])
        if len(to_create) > 0:
            created = super().create_multi(db=db, create_dtos=to_create)
            for obj_idx, pos_idx in zip(to_create_idx, span_text_idx):
                span_texts[pos_idx] = created[obj_idx]
        # Ignore types: We've made sure that no `None` values remain since we've created
        # span texts to replace them
        return span_texts  # type: ignore

    def read_by_text(self, db: Session, *, text: str) -> Optional[SpanTextORM]:
        return db.query(self.model.id).filter(self.model.text == text).first()

    def read_all_by_text(self, db: Session, *, texts: List[str]) -> List[SpanTextORM]:
        return db.query(self.model.id).filter(self.model.text in texts)


crud_span_text = CRUDSpanText(SpanTextORM)
