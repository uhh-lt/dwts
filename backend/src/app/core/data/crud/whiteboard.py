from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.whiteboard import (
    WhiteboardCreate,
    WhiteboardCreateAsInDB,
    WhiteboardUpdate,
)
from app.core.data.orm.whiteboard import WhiteboardORM


class CRUDWhiteboard(CRUDBase[WhiteboardORM, WhiteboardCreateAsInDB, WhiteboardUpdate]):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        return db_obj

    def read_by_project(self, db: Session, *, project_id: int) -> List[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_obj

    def create(self, db: Session, *, create_dto: WhiteboardCreate) -> WhiteboardORM:
        return super().create(
            db, create_dto=WhiteboardCreateAsInDB(**create_dto.model_dump())
        )

    def duplicate_by_id(
        self, db: Session, *, whiteboard_id: int, user_id: int
    ) -> WhiteboardORM:
        db_obj = self.read(db, id=whiteboard_id)
        return self.create(
            db,
            create_dto=WhiteboardCreateAsInDB(
                project_id=db_obj.project_id,
                user_id=user_id,
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
            ),
        )


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
