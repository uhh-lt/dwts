from typing import List, Optional

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError
from app.core.data.dto.source_document import (
    SDocStatus,
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from app.core.data.dto.source_document_data import SourceDocumentDataRead
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.elasticsearch_service import ElasticSearchService


class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")


class CRUDSourceDocument(
    CRUDBase[SourceDocumentORM, SourceDocumentCreate, SourceDocumentUpdate]
):
    def update_status(
        self, db: Session, *, sdoc_id: int, sdoc_status: SDocStatus
    ) -> SourceDocumentORM:
        sdoc_db_obj = self.read(db=db, id=sdoc_id)
        sdoc_db_obj.status = sdoc_status.value
        db.add(sdoc_db_obj)
        db.commit()
        db.refresh(sdoc_db_obj)
        return sdoc_db_obj

    def get_status(
        self, db: Session, *, sdoc_id: int, raise_error_on_unfinished: bool = False
    ) -> SDocStatus:
        if not self.exists(db=db, id=sdoc_id, raise_error=raise_error_on_unfinished):
            return SDocStatus.unfinished_or_erroneous
        status = SDocStatus(
            db.query(self.model.status).filter(self.model.id == sdoc_id).scalar()
        )
        if not status == SDocStatus.finished and raise_error_on_unfinished:
            raise SourceDocumentPreprocessingUnfinishedError(sdoc_id=sdoc_id)
        return status

    def read_data(self, db: Session, *, id: int) -> SourceDocumentDataRead:
        db_obj = (
            db.query(SourceDocumentDataORM)
            .filter(SourceDocumentDataORM.id == id)
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return SourceDocumentDataRead.model_validate(db_obj)

    def read_data_batch(
        self, db: Session, *, ids: List[int]
    ) -> List[Optional[SourceDocumentDataORM]]:
        db_objs = (
            db.query(SourceDocumentDataORM)
            .filter(SourceDocumentDataORM.id.in_(ids))
            .all()
        )
        # create id, data map
        id2data = {db_obj.id: db_obj for db_obj in db_objs}
        return [id2data.get(id) for id in ids]

    def remove(self, db: Session, *, id: int) -> SourceDocumentORM:
        # Import SimSearchService here to prevent a cyclic dependency
        from app.core.db.simsearch_service import SimSearchService

        sdoc_db_obj = super().remove(db=db, id=id)

        # remove file from repo
        RepoService().remove_sdoc_file(
            sdoc=SourceDocumentRead.model_validate(sdoc_db_obj)
        )

        # remove from elasticsearch
        ElasticSearchService().delete_document_from_index(
            sdoc_db_obj.project_id, sdoc_id=sdoc_db_obj.id
        )

        # remove from simsearch
        SimSearchService().remove_sdoc_from_index(sdoc_db_obj.doctype, sdoc_db_obj.id)

        return sdoc_db_obj

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        # Import SimSearchService here to prevent a cyclic dependency
        from app.core.db.simsearch_service import SimSearchService

        # find all sdocs to be removed
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()

        # remove files from repo
        RepoService().remove_all_project_sdoc_files(proj_id=proj_id)

        # remove from elasticsearch
        for sdoc in removed_orms:
            ElasticSearchService().delete_document_from_index(
                proj_id=proj_id, sdoc_id=sdoc.id
            )

            SimSearchService().remove_sdoc_from_index(sdoc.doctype, sdoc.id)

        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the sdocs
        query.delete()
        db.commit()

        return ids

    def read_by_project_and_document_tag(
        self,
        db: Session,
        *,
        proj_id: int,
        tag_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentORM]:
        query = db.query(self.model).join(
            SourceDocumentORM, DocumentTagORM.source_documents
        )
        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.status == SDocStatus.finished,
                DocumentTagORM.id == tag_id,
            )
        else:
            query = query.filter(
                self.model.project_id == proj_id, DocumentTagORM.id == tag_id
            )

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def read_by_project(
        self,
        db: Session,
        *,
        proj_id: int,
        only_finished: bool = True,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.status == SDocStatus.finished,
            )
        else:
            query = query.filter(self.model.project_id == proj_id)

        if skip is not None:
            query = query.offset(skip)
        if limit is not None:
            query = query.limit(limit)

        return query.all()

    def read_by_filename(
        self, db: Session, *, proj_id: int, only_finished: bool = True, filename: str
    ) -> Optional[SourceDocumentORM]:
        query = db.query(self.model)

        if only_finished:
            query = query.filter(
                self.model.project_id == proj_id,
                self.model.filename == filename,
                self.model.status == SDocStatus.finished,
            )
        else:
            query = query.filter(
                self.model.project_id == proj_id, self.model.filename == filename
            )
        return query.first()

    def count_by_project(
        self, db: Session, *, proj_id: int, status: Optional[SDocStatus] = None
    ) -> int:
        query = db.query(self.model)
        if status is not None:
            query = query.filter(
                self.model.project_id == proj_id, self.model.status == status
            )
        else:
            query = query.filter(self.model.project_id == proj_id)
        return query.with_entities(func.count()).scalar()

    def collect_linked_sdoc_ids(self, db: Session, *, sdoc_id: int) -> List[int]:
        # SELECT * FROM sourcedocumentlink sl
        # WHERE (sl.linked_source_document_id = 1 OR
        #       sl.parent_source_document_id = 1) and sl.linked_source_document_id IS NOT NULL

        query = db.query(
            SourceDocumentLinkORM.parent_source_document_id,
            SourceDocumentLinkORM.linked_source_document_id,
        )

        # noinspection PyUnresolvedReferences
        query = query.filter(
            and_(
                or_(
                    SourceDocumentLinkORM.parent_source_document_id == sdoc_id,
                    SourceDocumentLinkORM.linked_source_document_id == sdoc_id,
                ),
                SourceDocumentLinkORM.linked_source_document_id.is_not(None),
            )
        )
        query = query.order_by(desc(SourceDocumentLinkORM.parent_source_document_id))

        res = query.all()
        return [
            linked_sdoc_id if parent_sdoc_id == sdoc_id else parent_sdoc_id
            for (parent_sdoc_id, linked_sdoc_id) in res
            if linked_sdoc_id is not None
        ]

    def read_all_without_tags(
        self, db: Session, *, project_id: int
    ) -> List[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id)
            .outerjoin(SourceDocumentORM.document_tags)
            .filter(SourceDocumentORM.document_tags == None)  # noqa: E711
            .all()
        )

    def read_all_with_tags(
        self, db: Session, *, project_id: int
    ) -> List[SourceDocumentORM]:
        return (
            db.query(SourceDocumentORM)
            .filter(SourceDocumentORM.project_id == project_id)
            .join(SourceDocumentORM.document_tags)
            .filter(SourceDocumentORM.document_tags != None)  # noqa: E711
            .all()
        )


crud_sdoc = CRUDSourceDocument(SourceDocumentORM)
