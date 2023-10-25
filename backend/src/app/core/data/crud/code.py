from typing import Any, Dict, List, Optional, Union

import srsly
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
from app.core.data.dto.current_code import CurrentCodeCreate, CurrentCodeUpdate
from app.core.data.dto.memo import AttachedObjectType
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.db.sql_service import SQLService
from app.util.color import get_next_color
from config import conf
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

sqls: SQLService = SQLService()


class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):
    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        # first create the code
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()

        # second create a CurrentCode that links to the code
        ccc = CurrentCodeCreate(code_id=db_obj.id)
        crud_current_code.create(db=db, create_dto=ccc)

        db.refresh(db_obj)

        # create the action manually since we are not using the crud base create
        after_state = self._get_action_state_from_orm(db_obj=db_obj)
        self._create_action(
            db_obj=db_obj,
            action_type=ActionType.CREATE,
            after_state=after_state,
        )

        return db_obj

    def create_system_codes_for_project(
        self, db: Session, proj_id: int
    ) -> List[CodeORM]:
        created: List[CodeORM] = []

        def __create_recursively(
            code_dict: Dict[str, Dict[str, Any]], parent_code_id: Optional[int] = None
        ):
            for code_name in code_dict.keys():
                create_dto = CodeCreate(
                    name=str(code_name),
                    color=get_next_color(),
                    description=code_dict[code_name]["desc"],
                    project_id=proj_id,
                    user_id=SYSTEM_USER_ID,
                    parent_code_id=parent_code_id,
                )

                if not self.exists_by_name_and_user_and_project(
                    db,
                    code_name=create_dto.name,
                    proj_id=create_dto.project_id,
                    user_id=create_dto.user_id,
                ):
                    db_code = self.create(db=db, create_dto=create_dto)
                    created.append(db_code)

                    if "children" in code_dict[code_name]:
                        __create_recursively(
                            code_dict[code_name]["children"], parent_code_id=db_code.id
                        )

        __create_recursively(conf.system_codes)

        return created

    def merge_codes(
        self,
        db: Session,
        *,
        codes_to_merge: List[int],
        merge_into_code: Union[int, CodeCreate],
        remove_merged_codes: bool = True,
    ) -> CodeORM:
        if isinstance(merge_into_code, CodeCreate):
            merge_into_code_db_obj = self.create(db=db, create_dto=merge_into_code)
        else:
            merge_into_code_db_obj = self.read(db=db, id=merge_into_code)

        current_codes_to_merge: List[CurrentCodeORM] = []
        for code_id in codes_to_merge:
            code_to_merge = self.read(db, id=code_id)
            cc = code_to_merge.current_code
            if cc is not None:
                current_codes_to_merge.append(cc)

        # first move the memos of the codes to be merged to the code to merge into
        # create or get the object handle for the code to merge into. (we have to do
        # this first because after the current code pointer is moved we cannot directlz
        # access the memos of the code to merge into)
        from app.core.data.crud.object_handle import (
            crud_object_handle,  # avoid circular imports.
        )

        with sqls.db_session() as nested:
            oh_db_obj = crud_object_handle.create(
                db=nested,
                create_dto=ObjectHandleCreate(code_id=merge_into_code_db_obj.id),
            )
            for cc in current_codes_to_merge:
                code_db_obj = crud_code.read(db=nested, id=cc.code_id)
                memos = crud_memo.get_object_memos(db_obj=code_db_obj)
                for memo in memos:
                    crud_memo.reattach_memo(
                        db=nested,
                        memo_id=memo.id,
                        attach_to_oh=oh_db_obj,
                        attach_to_object_id=merge_into_code_db_obj.id,
                        attach_to_object_type=AttachedObjectType.code,
                    )

            # merge the codes by moving the current code pointer to the code to merge into
            for cc in current_codes_to_merge:
                update_dto = CurrentCodeUpdate(code_id=merge_into_code_db_obj.id)
                crud_current_code.update(db=nested, id=cc.id, update_dto=update_dto)

            if remove_merged_codes:
                # remove the codes to be merged
                for cid in codes_to_merge:
                    self.remove(db=nested, id=cid)

            return merge_into_code_db_obj

    def read_by_name(self, db: Session, code_name: str) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_by_name_and_project(
        self, db: Session, code_name: str, proj_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .all()
        )

    def read_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.project_id == proj_id)
            .all()
        )

    def read_by_name_and_user(
        self, db: Session, code_name: str, user_id: int
    ) -> List[CodeORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == code_name, self.model.user_id == user_id)
            .all()
        )

    def read_by_name_and_user_and_project(
        self, db: Session, code_name: str, user_id: int, proj_id: int
    ) -> CodeORM:
        return (
            db.query(self.model)
            .filter(
                self.model.name == code_name,
                self.model.user_id == user_id,
                self.model.project_id == proj_id,
            )
            .first()
        )

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return (
            db.query(self.model.id).filter(self.model.name == code_name).first()
            is not None
        )

    def exists_by_name_and_project(
        self, db: Session, *, code_name: str, proj_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.project_id == proj_id)
            .first()
            is not None
        )

    def exists_by_name_and_user(
        self, db: Session, *, code_name: str, user_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(self.model.name == code_name, self.model.user_id == user_id)
            .first()
            is not None
        )

    def exists_by_name_and_user_and_project(
        self, db: Session, *, code_name: str, user_id: int, proj_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(
                self.model.name == code_name,
                self.model.user_id == user_id,
                self.model.project_id == proj_id,
            )
            .first()
            is not None
        )

    def remove_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[int]:
        # find all codes to be removed
        query = db.query(self.model).filter(
            self.model.user_id == user_id, self.model.project_id == proj_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the adocs
        query.delete()
        db.commit()

        return ids

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        # find all codes to be removed
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the adocs
        query.delete()
        db.commit()

        return ids

    def _get_action_user_id_from_orm(self, db_obj: CodeORM) -> int:
        return db_obj.user_id

    def _get_action_state_from_orm(self, db_obj: CodeORM) -> Optional[str]:
        return srsly.json_dumps(
            CodeRead.from_orm(db_obj).dict(),
        )


crud_code = CRUDCode(CodeORM)
