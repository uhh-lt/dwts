from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
)
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.analysis.duplicate_finder_service import DuplicateFinderService
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.action import crud_action
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.entity import crud_entity
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.action import ActionQueryParameters, ActionRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.entity import EntityRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.preprocessing_job import PreprocessingJobRead
from app.core.data.dto.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.user import UserRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.search.elasticsearch_service import ElasticSearchService
from app.preprocessing.preprocessing_service import PreprocessingService

router = APIRouter(
    prefix="/project",
    dependencies=[Depends(get_current_user)],
    tags=["project"],
)


@router.put(
    "",
    response_model=ProjectRead,
    summary="Creates a new Project",
)
def create_new_project(
    *,
    db: Session = Depends(get_db_session),
    proj: ProjectCreate,
    current_user: UserRead = Depends(get_current_user),
) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj, creating_user=current_user)

    try:
        # create the ES Indices
        ElasticSearchService().create_project_indices(proj_id=db_obj.id)
    except Exception:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(
            status_code=500,
            detail="Cannot create ElasticSearch Indices for the Project!",
        )
    return ProjectRead.model_validate(db_obj)


@router.get(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Returns the Project with the given ID if it exists",
)
def read_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    return ProjectRead.model_validate(db_obj)


@router.patch(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Updates the Project with the given ID.",
)
def update_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    proj: ProjectUpdate,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)
    db_obj = crud_project.update(db=db, id=proj_id, update_dto=proj)
    return ProjectRead.model_validate(db_obj)


@router.delete(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Removes the Project with the given ID.",
)
def delete_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.remove(db=db, id=proj_id)

    try:
        # remove the ES Indices # Flo Do we want this?!
        ElasticSearchService().remove_project_indices(proj_id=db_obj.id)
    except Exception:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(
            status_code=500,
            detail="Cannot create ElasticSearch Indices for the Project!",
        )

    return ProjectRead.model_validate(db_obj)


@router.put(
    "/{proj_id}/sdoc",
    response_model=PreprocessingJobRead,
    summary="Uploads one or multiple SourceDocument to the Project with the given ID if it exists",
)
# Flo: Since we're uploading a file we have to use multipart/form-data directly in the router method
#  see: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
#  see: https://fastapi.tiangolo.com/tutorial/request-files/#multiple-file-uploads-with-additional-metadata
def upload_project_sdoc(
    *,
    proj_id: int,
    uploaded_files: List[UploadFile] = File(
        ...,
        description=(
            "File(s) that get uploaded and " "represented by the SourceDocument(s)"
        ),
    ),
    authz_user: AuthzUser = Depends(),
) -> PreprocessingJobRead:
    authz_user.assert_in_project(proj_id)

    pps: PreprocessingService = PreprocessingService()
    return pps.prepare_and_start_preprocessing_job_async(
        proj_id=proj_id, uploaded_files=uploaded_files
    )


@router.delete(
    "/{proj_id}/sdoc",
    response_model=List[int],
    summary="Removes all SourceDocuments of the Project with the given ID if it exists",
)
def delete_project_sdocs(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_project(proj_id)

    return crud_sdoc.remove_by_project(db=db, proj_id=proj_id)


@router.patch(
    "/{proj_id}/user/{user_id}",
    response_model=UserRead,
    summary="Associates an existing User to the Project with the given ID if it exists",
)
def associate_user_to_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_project.associate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.model_validate(user_db_obj)


@router.delete(
    "/{proj_id}/user/{user_id}",
    response_model=UserRead,
    summary="Dissociates the Users with the Project with the given ID if it exists",
)
def dissociate_user_from_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_project.dissociate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.model_validate(user_db_obj)


@router.get(
    "/{proj_id}/user",
    response_model=List[UserRead],
    summary="Returns all Users of the Project with the given ID",
)
def get_project_users(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[UserRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [UserRead.model_validate(user) for user in proj_db_obj.users]


@router.get(
    "/{proj_id}/code",
    response_model=List[CodeRead],
    summary="Returns all Codes of the Project with the given ID",
)
def get_project_codes(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[CodeRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    result = [CodeRead.model_validate(code) for code in proj_db_obj.codes]
    result.sort(key=lambda c: c.id)
    return result


@router.delete(
    "/{proj_id}/code",
    response_model=List[int],
    summary="Removes all Codes of the Project with the given ID if it exists",
)
def delete_project_codes(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_project(proj_id)

    return crud_code.remove_by_project(db=db, proj_id=proj_id)


@router.get(
    "/{proj_id}/tag",
    response_model=List[DocumentTagRead],
    summary="Returns all DocumentTags of the Project with the given ID",
)
def get_project_tags(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[DocumentTagRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [DocumentTagRead.model_validate(tag) for tag in proj_db_obj.document_tags]


@router.delete(
    "/{proj_id}/tag",
    response_model=List[int],
    summary="Removes all DocumentTags of the Project with the given ID if it exists",
)
def delete_project_tags(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_project(proj_id)

    return crud_document_tag.remove_by_project(db=db, proj_id=proj_id)


@router.get(
    "/{proj_id}/user/{user_id}/code",
    response_model=List[CodeRead],
    summary="Returns all Codes of the Project from a User",
)
def get_user_codes_of_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[CodeRead]:
    authz_user.assert_in_project(proj_id)

    return [
        CodeRead.model_validate(code_db_obj)
        for code_db_obj in crud_code.read_by_user_and_project(
            db=db, user_id=user_id, proj_id=proj_id
        )
    ]


@router.delete(
    "/{proj_id}/user/{user_id}/code",
    response_model=int,
    summary="Removes all Codes of the Project from a User. Returns the number of removed Codes.",
)
def remove_user_codes_of_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_project(proj_id)

    return crud_code.remove_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id)


@router.get(
    "/{proj_id}/user/{user_id}/memo",
    response_model=List[MemoRead],
    summary="Returns all Memos of the Project from a User",
)
def get_user_memos_of_project(
    *,
    proj_id: int,
    user_id: int,
    only_starred: Optional[bool] = Query(
        title="Only Starred",
        description="If true only starred Memos are returned",
        default=False,
    ),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_project(proj_id)

    db_objs = crud_memo.read_by_user_and_project(
        db=db, user_id=user_id, proj_id=proj_id, only_starred=only_starred
    )
    return [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]


@router.get(
    "/{proj_id}/user/{user_id}/action",
    response_model=List[ActionRead],
    summary="Returns all Actions of the Project from a User",
)
def get_user_actions_of_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[ActionRead]:
    authz_user.assert_in_project(proj_id)

    return [
        ActionRead.model_validate(ar)
        for ar in crud_action.read_by_user_and_project(
            db=db, proj_id=proj_id, user_id=user_id
        )
    ]


@router.post(
    "/{proj_id}/actions",
    response_model=List[ActionRead],
    summary="Returns all Actions of the Project",
)
def query_actions_of_project(
    *,
    query_params: ActionQueryParameters,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[ActionRead]:
    authz_user.assert_in_project(query_params.proj_id)

    return [
        ActionRead.model_validate(action)
        for action in crud_action.read_by(
            db=db,
            proj_id=query_params.proj_id,
            user_ids=query_params.user_ids,
            action_types=query_params.action_types,
            action_targets=query_params.action_targets,
            timestamp_from=query_params.timestamp_from,
            timestamp_to=query_params.timestamp_to,
        )
    ]


@router.put(
    "/{proj_id}/memo",
    response_model=MemoRead,
    summary="Adds a Memo of the current User to the Project with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    authz_user.assert_is_same_user(memo.user_id)
    authz_user.assert_in_project(proj_id)
    authz_user.assert_in_project(memo.project_id)
    validate.validate_condition(proj_id == memo.project_id)

    db_obj = crud_memo.create_for_project(db=db, project_id=proj_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=proj_id,
        attached_object_type=AttachedObjectType.project,
    )


@router.get(
    "/{proj_id}/memo",
    response_model=List[MemoRead],
    summary="Returns the Memos of the current User for the Project with the given ID.",
)
def get_memos(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{proj_id}/memo/{user_id}",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the Project with the given ID of the User with the"
        " given ID if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=user_id)


@router.get(
    "/{proj_id}/resolve_filename/{filename}",
    response_model=int,
    summary=(
        "Returns the Id of the SourceDocument identified by project_id and filename if it exists"
    ),
)
def resolve_filename(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    filename: str,
    only_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_project(proj_id)

    sdoc = crud_sdoc.read_by_filename(
        db=db, proj_id=proj_id, only_finished=only_finished, filename=filename
    )
    if sdoc is None:
        raise NoSuchElementError(
            SourceDocumentORM, project_id=proj_id, filename=filename
        )
    return sdoc.id


@router.get(
    "/{proj_id}/metadata",
    response_model=List[ProjectMetadataRead],
    summary="Returns all ProjectMetadata of the SourceDocument with the given ID if it exists",
)
def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ProjectMetadataRead]:
    authz_user.assert_in_project(proj_id)

    db_objs = crud_project_meta.read_by_project(db=db, proj_id=proj_id)
    metadata = [ProjectMetadataRead.model_validate(meta) for meta in db_objs]
    return metadata


@router.post(
    "/{proj_id}/find_duplicate_text_sdocs",
    response_model=List[List[int]],
    summary="Returns groups of duplicate sdoc ids.",
)
def find_duplicate_text_sdocs(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    max_different_words: int,
    authz_user: AuthzUser = Depends(),
) -> List[List[int]]:
    authz_user.assert_in_project(proj_id)
    return DuplicateFinderService().find_duplicate_text_sdocs(
        project_id=proj_id, max_different_words=max_different_words
    )


@router.get(
    "/{proj_id}/entity",
    response_model=List[EntityRead],
    summary="Returns all Entities of the Project with the given ID",
)
def get_project_entities(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[EntityRead]:
    authz_user.assert_in_project(proj_id)

    result = crud_entity.read_by_project(db=db, proj_id=proj_id)
    result = [EntityRead.model_validate(entity) for entity in result]
    result.sort(key=lambda c: c.id)
    return result
