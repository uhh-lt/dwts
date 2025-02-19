from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.celery.background_jobs import (
    prepare_and_start_document_classification_job_async,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.classification.document_classification_service import (
    DocumentClassificationService,
)
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation,
)
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationJobCreate,
    DocumentTagRecommendationJobCreateIntern,
    DocumentTagRecommendationJobRead,
    DocumentTagRecommendationSummary,
)

dcs: DocumentClassificationService = DocumentClassificationService()

router = APIRouter(
    prefix="/doctagrecommendationjob",
    dependencies=[Depends(get_current_user)],
    tags=["documentTagRecommendationJob"],
)


@router.put(
    "",
    response_model=DocumentTagRecommendationJobRead,
    summary="Creates a new Document Tag Recommendation Task and returns it.",
)
def create_new_doc_tag_rec_task(
    *,
    db: Session = Depends(get_db_session),
    doc_tag_rec: DocumentTagRecommendationJobCreate,
    authz_user: AuthzUser = Depends(),
) -> DocumentTagRecommendationJobRead:
    authz_user.assert_in_project(doc_tag_rec.project_id)

    db_obj = crud_document_tag_recommendation.create(
        db=db,
        create_dto=DocumentTagRecommendationJobCreateIntern(
            project_id=doc_tag_rec.project_id, user_id=authz_user.user.id
        ),
    )
    response = DocumentTagRecommendationJobRead.model_validate(db_obj)
    prepare_and_start_document_classification_job_async(
        db_obj.task_id,
        doc_tag_rec.project_id,
    )

    return response


@router.get(
    "/{task_id}",
    response_model=List[DocumentTagRecommendationSummary],
    summary="Retrieve all document tag recommendations for the given task ID.",
)
def get_recommendations_from_task_endpoint(
    task_id: int,
) -> List[DocumentTagRecommendationSummary]:
    """
    Retrieves document tag recommendations based on the specified task ID.

    ### Response Format:
    The endpoint returns a list of recommendations, where each recommendation
    is represented as a DocumentTagRecommendationSummary DTO with the following structure:

    ```python
    {
        "recommendation_id": int,  # Unique identifier for the recommendation
        "source_document": str,    # Name of the source document
        "predicted_tag_id": int,   # ID of the predicted tag
        "predicted_tag": str,      # Name of the predicted tag
        "prediction_score": float  # Confidence score of the prediction
    }
    ```

    ### Error Handling:
    - Returns HTTP 404 if no recommendations are found for the given task ID.
    """
    recommendations = dcs.get_recommendations_from_task(task_id)
    if not recommendations:
        raise HTTPException(status_code=404, detail="No recommendations found.")
    return recommendations


@router.patch(
    "/update_recommendations",
    response_model=int,
    summary="The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.",
)
def update_recommendations(
    *,
    accepted_recommendation_ids: List[int],
    declined_recommendation_ids: List[int],
) -> int:
    modifications = dcs.validate_recommendations(
        accepted_recommendation_ids=accepted_recommendation_ids,
        declined_recommendation_ids=declined_recommendation_ids,
    )
    if modifications == -1:
        raise HTTPException(
            status_code=400, detail="An error occurred while updating recommendations."
        )

    return modifications
