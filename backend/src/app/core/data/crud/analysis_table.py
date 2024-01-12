from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.analysis_table import (
    AnalysisTableUpdate,
    InternalAnalysisTableCreate,
)
from app.core.data.orm.analysis_table import AnalysisTableORM


class CRUDAnalysisTable(
    CRUDBase[AnalysisTableORM, InternalAnalysisTableCreate, AnalysisTableUpdate]
):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[AnalysisTableORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        return db_obj


crud_analysis_table = CRUDAnalysisTable(AnalysisTableORM)
