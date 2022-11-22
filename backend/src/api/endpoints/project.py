from typing import List, Dict
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, HTTPException, File, Query
from sqlalchemy.orm import Session

from api.dependencies import skip_limit_params, get_db_session
from api.util import get_object_memos
from app.core.data.action_service import ActionService
from app.core.data.crud.code import crud_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import mime_type_supported
from app.core.data.dto import ProjectRead, ProjectCreate, ProjectUpdate
from app.core.data.dto.action import ActionRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoInDB, MemoCreate, AttachedObjectType, MemoRead
from app.core.data.dto.source_document import SourceDocumentRead, PaginatedSourceDocumentReads
from app.core.data.dto.user import UserRead
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.util import preprocess_uploaded_file

router = APIRouter(prefix="/project")
tags = ["project"]


@router.put("", tags=tags,
            response_model=ProjectRead,
            summary="Creates a new Project",
            description="Creates a new Project.")
async def create_new_project(*,
                             db: Session = Depends(get_db_session),
                             proj: ProjectCreate) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj)

    try:
        # create the ES Indices
        ElasticSearchService().create_project_indices(proj_id=db_obj.id)
    except Exception as e:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(status_code=500, detail="Cannot create ElasticSearch Indices for the Project!")
    return ProjectRead.from_orm(db_obj)


@router.get("", tags=tags,
            response_model=List[ProjectRead],
            summary="Returns all Projects of the current user",
            description="Returns all Projects of the current user")
async def read_all(*,
                   db: Session = Depends(get_db_session),
                   skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[ProjectRead]:
    # TODO Flo: only return the projects of the current user
    db_objs = crud_project.read_multi(db=db, **skip_limit)
    return [ProjectRead.from_orm(proj) for proj in db_objs]


@router.get("/{proj_id}", tags=tags,
            response_model=Optional[ProjectRead],
            summary="Returns the Project with the given ID",
            description="Returns the Project with the given ID if it exists")
async def read_project(*,
                       db: Session = Depends(get_db_session),
                       proj_id: int) -> Optional[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.read(db=db, id=proj_id)
    return ProjectRead.from_orm(db_obj)


@router.patch("/{proj_id}", tags=tags,
              response_model=ProjectRead,
              summary="Updates the Project",
              description="Updates the Project with the given ID.")
async def update_project(*,
                         db: Session = Depends(get_db_session),
                         proj_id: int,
                         proj: ProjectUpdate) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.update(db=db, id=proj_id, update_dto=proj)
    return ProjectRead.from_orm(db_obj)


@router.delete("/{proj_id}", tags=tags,
               response_model=ProjectRead,
               summary="Removes the Project",
               description="Removes the Project with the given ID.")
async def delete_project(*,
                         db: Session = Depends(get_db_session),
                         proj_id: int) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.remove(db=db, id=proj_id)

    try:
        # remove the ES Indices # Flo Do we want this?!
        ElasticSearchService().remove_project_indices(proj_id=db_obj.id)
    except Exception as e:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(status_code=500, detail="Cannot create ElasticSearch Indices for the Project!")

    return ProjectRead.from_orm(db_obj)


@router.get("/{proj_id}/sdoc", tags=tags,
            response_model=PaginatedSourceDocumentReads,
            summary="Returns all SourceDocuments of the Project.",
            description="Returns all SourceDocuments of the Project with the given ID.")
async def get_project_sdocs(*,
                            proj_id: int,
                            only_finished: Optional[bool] = True,
                            db: Session = Depends(get_db_session),
                            skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> PaginatedSourceDocumentReads:
    # TODO Flo: only if the user has access?
    sdocs_on_page = [SourceDocumentRead.from_orm(sdoc)
                     for sdoc in crud_sdoc.read_by_project(db=db,
                                                           proj_id=proj_id,
                                                           only_finished=only_finished,
                                                           **skip_limit)]
    total_sdocs = crud_sdoc.count_by_project(db=db, proj_id=proj_id, only_finished=only_finished)
    skip, limit = skip_limit.values()
    # FIXME skip can be None
    has_more = (int(skip) + len(sdocs_on_page)) < total_sdocs
    return PaginatedSourceDocumentReads(sdocs=sdocs_on_page,
                                        has_more=has_more,
                                        total=total_sdocs,
                                        current_page_offset=skip if skip is not None else 0,
                                        next_page_offset=(skip + limit) if skip is not None
                                                                           and limit is not None
                                                                           and has_more else 0)


@router.put("/{proj_id}/sdoc", tags=tags,
            response_model=str,
            summary="Uploads one or multiple SourceDocument to the Project",
            description="Uploads one or multiple SourceDocument to the Project with the given ID if it exists")
# Flo: Since we're uploading a file we have to use multipart/form-data directly in the router method
#  see: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
#  see: https://fastapi.tiangolo.com/tutorial/request-files/#multiple-file-uploads-with-additional-metadata
async def upload_project_sdoc(*,
                              proj_id: int,
                              doc_files: List[UploadFile] = File(...,
                                                                 description=("File(s) that get uploaded and "
                                                                              "represented by the SourceDocument(s)"))) \
        -> str:
    for doc_file in doc_files:
        if not mime_type_supported(mime_type=doc_file.content_type):
            raise HTTPException(detail=f"Document with MIME type {doc_file.content_type} not supported!",
                                status_code=406)
        preprocess_uploaded_file(proj_id=proj_id, uploaded_file=doc_file)

    # TODO Flo: How to notify user or system when done?
    return f"Upload and preprocessing of {len(doc_files)} Document(s) started in the background!"


@router.delete("/{proj_id}/sdoc", tags=tags,
               response_model=List[int],
               summary="Removes all SourceDocuments of the Project",
               description="Removes all SourceDocuments of the Project with the given ID if it exists")
async def delete_project_sdocs(*,
                               proj_id: int,
                               db: Session = Depends(get_db_session)) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_sdoc.remove_by_project(db=db, proj_id=proj_id)


@router.patch("/{proj_id}/user/{user_id}", tags=tags,
              response_model=Optional[UserRead],
              summary="Associates the User with the Project",
              description="Associates an existing User to the Project with the given ID if it exists")
async def associate_user_to_project(*,
                                    proj_id: int,
                                    user_id: int,
                                    db: Session = Depends(get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    user_db_obj = crud_project.associate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.from_orm(user_db_obj)


@router.delete("/{proj_id}/user/{user_id}", tags=tags,
               response_model=Optional[UserRead],
               summary="Dissociates the Users with the Project",
               description="Dissociates the Users with the Project with the given ID if it exists")
async def dissociate_user_from_project(*,
                                       proj_id: int,
                                       user_id: int,
                                       db: Session = Depends(get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    user_db_obj = crud_project.dissociate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.from_orm(user_db_obj)


@router.get("/{proj_id}/user", tags=tags,
            response_model=List[UserRead],
            summary="Returns all Users of the Project",
            description="Returns all Users of the Project with the given ID")
async def get_project_users(*,
                            proj_id: int,
                            db: Session = Depends(get_db_session)) -> List[UserRead]:
    # TODO Flo: only if the user has access?
    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [UserRead.from_orm(user) for user in proj_db_obj.users]


@router.get("/{proj_id}/code", tags=tags,
            response_model=List[CodeRead],
            summary="Returns all Codes of the Project",
            description="Returns all Codes of the Project with the given ID")
async def get_project_codes(*,
                            proj_id: int,
                            db: Session = Depends(get_db_session)) -> List[CodeRead]:
    # TODO Flo: only if the user has access?
    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [CodeRead.from_orm(code) for code in proj_db_obj.codes]


@router.delete("/{proj_id}/code", tags=tags,
               response_model=List[int],
               summary="Removes all Codes of the Project",
               description="Removes all Codes of the Project with the given ID if it exists")
async def delete_project_codes(*,
                               proj_id: int,
                               db: Session = Depends(get_db_session)) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_code.remove_by_project(db=db, proj_id=proj_id)


@router.get("/{proj_id}/tag", tags=tags,
            response_model=List[DocumentTagRead],
            summary="Returns all DocumentTags of the Project",
            description="Returns all DocumentTags of the Project with the given ID")
async def get_project_tags(*,
                           proj_id: int,
                           db: Session = Depends(get_db_session)) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [DocumentTagRead.from_orm(tag) for tag in proj_db_obj.document_tags]


@router.delete("/{proj_id}/tag", tags=tags,
               response_model=List[int],
               summary="Removes all DocumentTags of the Project",
               description="Removes all DocumentTags of the Project with the given ID if it exists")
async def delete_project_tags(*,
                              proj_id: int,
                              db: Session = Depends(get_db_session)) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_document_tag.remove_by_project(db=db, proj_id=proj_id)


@router.get("/{proj_id}/user/{user_id}/code", tags=tags,
            response_model=List[CodeRead],
            summary="Returns all Codes of the Project from a User",
            description="Returns all Codes of the Project from a User")
async def get_user_codes_of_project(*,
                                    proj_id: int,
                                    user_id: int,
                                    db: Session = Depends(get_db_session)) -> List[CodeRead]:
    # TODO Flo: only if the user has access?
    return [CodeRead.from_orm(code_db_obj) for code_db_obj in
            crud_code.read_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id)]


@router.delete("/{proj_id}/user/{user_id}/code", tags=tags,
               response_model=int,
               summary="Removes all Codes of the Project from a User",
               description="Removes all Codes of the Project from a User. Returns the number of removed Codes.")
async def remove_user_codes_of_project(*,
                                       proj_id: int,
                                       user_id: int,
                                       db: Session = Depends(get_db_session)) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_code.remove_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id)


@router.get("/{proj_id}/user/{user_id}/memo", tags=tags,
            response_model=List[MemoRead],
            summary="Returns all Memos of the Project from a User",
            description="Returns all Memos of the Project from a User")
async def get_user_memos_of_project(*,
                                    proj_id: int,
                                    user_id: int,
                                    only_starred: Optional[bool] = Query(title="Only Starred",
                                                                         description="If true only starred Memos are returned",
                                                                         default=False),
                                    db: Session = Depends(get_db_session)) -> List[MemoRead]:
    # TODO Flo: only if the user has access?
    db_objs = crud_memo.read_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id, only_starred=only_starred)
    return [crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs]


@router.get("/{proj_id}/user/{user_id}/action", tags=tags,
            response_model=List[ActionRead],
            summary="Returns all Actions of the Project from a User",
            description="Returns all Actions of the Project from a User")
async def get_user_actions_of_project(*,
                                      proj_id: int,
                                      user_id: int,
                                      db: Session = Depends(get_db_session)) -> List[ActionRead]:
    # TODO Flo: only if the user has access?
    return ActionService().get_user_actions_of_project(db=db, proj_id=proj_id, user_id=user_id)


@router.delete("/{proj_id}/user/{user_id}/memo", tags=tags,
               response_model=List[int],
               summary="Removes all Memos of the Project from a User",
               description="Removes all Memos of the Project from a User. Returns the number of removed Memos.")
async def remove_user_memos_of_project(*,
                                       proj_id: int,
                                       user_id: int,
                                       db: Session = Depends(get_db_session)) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_memo.remove_by_user_and_project(db=db, user_id=user_id, proj_id=proj_id)


@router.put("/{proj_id}/memo", tags=tags,
            response_model=Optional[MemoRead],
            summary="Adds a Memo of the current User to the Project.",
            description="Adds a Memo of the current User to the Project with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(get_db_session),
                   proj_id: int,
                   memo: MemoCreate) -> Optional[MemoRead]:
    db_obj = crud_memo.create_for_project(db=db, project_id=proj_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                    attached_object_id=proj_id,
                    attached_object_type=AttachedObjectType.project)


@router.get("/{proj_id}/memo", tags=tags,
            response_model=List[MemoRead],
            summary="Returns the Memo of the current User for the Project.",
            description="Returns the Memo of the current User for the Project with the given ID.")
async def get_memos(*,
                    db: Session = Depends(get_db_session),
                    proj_id: int) -> List[MemoRead]:
    db_obj = crud_project.read(db=db, id=proj_id)
    return get_object_memos(db_obj=db_obj)


@router.get("/{proj_id}/memo/{user_id}", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo attached to the Project of the User with the given ID",
            description=("Returns the Memo attached to the Project with the given ID of the User with the"
                         " given ID if it exists."))
async def get_user_memo(*,
                        db: Session = Depends(get_db_session),
                        proj_id: int,
                        user_id: int) -> Optional[MemoRead]:
    db_obj = crud_project.read(db=db, id=proj_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)


@router.get("/{proj_id}/resolve_filename/{filename}", tags=tags,
            response_model=Optional[int],
            summary="Returns the Id of the SourceDocument identified by project_id and filename if it exists",
            description=("Returns the Id of the SourceDocument identified by project_id and filename if it exists"))
async def resolve_filename(*,
                           db: Session = Depends(get_db_session),
                           proj_id: int,
                           filename: str, only_finished: Optional[bool] = True,
                           ) -> Optional[int]:
    return crud_sdoc.filename2id(db=db, proj_id=proj_id, only_finished=only_finished, filename=filename)
