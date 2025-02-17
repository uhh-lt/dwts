from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
)
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.sentence_annotation import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
)

router = APIRouter(
    prefix="/sentence",
    dependencies=[Depends(get_current_user)],
    tags=["sentenceAnnotation"],
)


@router.put(
    "",
    response_model=SentenceAnnotationRead,
    summary="Creates a SentenceAnnotation",
)
def add_sentence_annotation(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotation: SentenceAnnotationCreate,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(
        Crud.SOURCE_DOCUMENT, sentence_annotation.sdoc_id
    )
    authz_user.assert_in_same_project_as(Crud.CODE, sentence_annotation.code_id)

    db_obj = crud_sentence_anno.create(
        db=db, user_id=authz_user.user.id, create_dto=sentence_annotation
    )
    return SentenceAnnotationRead.model_validate(db_obj)


@router.put(
    "/bulk/create",
    response_model=List[SentenceAnnotationRead],
    summary="Creates SentenceAnnotations in Bulk",
)
def add_sentence_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sentence_annotations: List[SentenceAnnotationCreate],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> List[SentenceAnnotationRead]:
    for sa in sentence_annotations:
        authz_user.assert_in_same_project_as(Crud.CODE, sa.code_id)
        authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sa.sdoc_id)
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, sa.code_id),
                (Crud.SOURCE_DOCUMENT, sa.sdoc_id),
            ]
        )

    db_objs = crud_sentence_anno.create_bulk(
        db=db, user_id=authz_user.user.id, create_dtos=sentence_annotations
    )
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Returns the SentenceAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    db_obj = crud_sentence_anno.read(db=db, id=sentence_anno_id)
    return SentenceAnnotationRead.model_validate(db_obj)


@router.patch(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Updates the SentenceAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    sentence_annotation_anno: SentenceAnnotationUpdate,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)
    authz_user.assert_in_same_project_as(Crud.CODE, sentence_annotation_anno.code_id)

    db_obj = crud_sentence_anno.update(
        db=db, id=sentence_anno_id, update_dto=sentence_annotation_anno
    )
    return SentenceAnnotationRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=List[SentenceAnnotationRead],
    summary="Updates SentenceAnnotation in Bulk",
)
def update_sent_anno_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sent_annos: List[SentenceAnnotationUpdateBulk],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> List[SentenceAnnotationRead]:
    for sent_anno in sent_annos:
        authz_user.assert_in_same_project_as(Crud.CODE, sent_anno.code_id)
        authz_user.assert_in_same_project_as(
            Crud.SENTENCE_ANNOTATION, sent_anno.sent_annotation_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, sent_anno.code_id),
                (Crud.SENTENCE_ANNOTATION, sent_anno.sent_annotation_id),
            ]
        )

    db_objs = crud_sentence_anno.update_bulk(db=db, update_dtos=sent_annos)
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{sentence_anno_id}",
    response_model=SentenceAnnotationRead,
    summary="Deletes the SentenceAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    db_obj = crud_sentence_anno.remove(db=db, id=sentence_anno_id)
    return SentenceAnnotationRead.model_validate(db_obj)


@router.delete(
    "/bulk/delete",
    response_model=List[SentenceAnnotationRead],
    summary="Deletes all SentenceAnnotations with the given IDs.",
)
def delete_bulk_by_id(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_ids: List[int],
    authz_user: AuthzUser = Depends(),
) -> List[SentenceAnnotationRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SENTENCE_ANNOTATION, sentence_anno_ids
    )

    db_objs = crud_sentence_anno.remove_bulk(db=db, ids=sentence_anno_ids)
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{sentence_anno_id}/code",
    response_model=CodeRead,
    summary="Returns the Code of the SentenceAnnotation with the given ID if it exists.",
)
def get_code(
    *,
    db: Session = Depends(get_db_session),
    sentence_anno_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.SENTENCE_ANNOTATION, sentence_anno_id)

    sentence_annotation_db_obj = crud_sentence_anno.read(db=db, id=sentence_anno_id)
    return CodeRead.model_validate(sentence_annotation_db_obj.code)


@router.get(
    "/code/{code_id}/user",
    response_model=List[SentenceAnnotationRead],
    summary=("Returns SentenceAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SentenceAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_sentence_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [SentenceAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
