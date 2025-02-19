from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationJobCreateIntern,
    DocumentTagRecommendationJobUpdate,
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationLinkUpdate,
)
from app.core.data.orm.document_tag_recommendation import (
    DocumentTagRecommendationJobORM,
    DocumentTagRecommendationLinkORM,
)


class CRUDDocumentTagRecommendationJob(
    CRUDBase[
        DocumentTagRecommendationJobORM,
        DocumentTagRecommendationJobCreateIntern,
        DocumentTagRecommendationJobUpdate,
    ]
):
    # use base class update, read, create functions

    def set_recommendation_job_model(self, db: Session, task_id: int, model_name: str):
        db.query(self.model).filter(self.model.task_id == task_id).update(
            {"model_name": model_name}
        )
        db.commit()


crud_document_tag_recommendation = CRUDDocumentTagRecommendationJob(
    DocumentTagRecommendationJobORM
)


class CrudDocumentTagRecommendationLink(
    CRUDBase[
        DocumentTagRecommendationLinkORM,
        DocumentTagRecommendationLinkCreate,
        DocumentTagRecommendationLinkUpdate,
    ]
):
    def read_by_task_id(
        self,
        db: Session,
        *,
        task_id: int,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
        exclude_reviewed: bool = False,
    ) -> List[DocumentTagRecommendationLinkORM]:
        query = db.query(self.model)
        query = query.filter(self.model.recommendation_task_id == task_id)

        if exclude_reviewed:
            query = query.filter(self.model.is_accepted == None)  # noqa: E711
        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()


crud_document_tag_recommendation_link = CrudDocumentTagRecommendationLink(
    DocumentTagRecommendationLinkORM
)
