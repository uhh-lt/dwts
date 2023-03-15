from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType, ActionCreate
from app.core.data.orm.action import ActionORM


class CRUDAction(CRUDBase[ActionORM, ActionCreate, None]):
    def create(self, db: Session, *, create_dto: ActionCreate) -> ActionORM:
        # we have to override this to avoid recursion
        dto_obj_data = jsonable_encoder(create_dto)
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def update(self, db: Session, *, id: int, update_dto) -> Optional[ActionORM]:
        raise NotImplementedError()

    def remove(self, db: Session, *, id: int) -> Optional[ActionORM]:
        raise NotImplementedError()

    def read_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[ActionORM]:
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.project_id == proj_id)
            .all()
        )

    def read_by_user_and_project_and_action_type(
        self, db: Session, user_id: int, proj_id: int, action_type: ActionType
    ) -> List[ActionORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.user_id == user_id,
                self.model.project_id == proj_id,
                self.model.action_type == action_type,
            )
            .all()
        )


crud_action = CRUDAction(ActionORM)
