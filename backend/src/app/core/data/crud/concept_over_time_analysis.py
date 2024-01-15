from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTAUpdateAsInDB,
)
from app.core.data.orm.concept_over_time_analysis import ConceptOverTimeAnalysisORM


class CRUDConceptOverTimeAnalysis(
    CRUDBase[ConceptOverTimeAnalysisORM, COTACreate, COTAUpdateAsInDB]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int, raise_error: bool = True
    ) -> List[ConceptOverTimeAnalysisORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        if raise_error and not db_obj:
            raise NoSuchElementError(self.model, project_id=project_id, user_id=user_id)
        return db_obj


crud_cota = CRUDConceptOverTimeAnalysis(ConceptOverTimeAnalysisORM)
