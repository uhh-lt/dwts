from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_text_entity_link import (
    SpanTextEntityLinkCreate,
    SpanTextEntityLinkUpdate,
)
from app.core.data.orm.entity import EntityORM
from app.core.data.orm.span_text_entity_link import SpanTextEntityLinkORM

# we need:
# create
# update
# delete
# read:
# by id, we can define the rest as it is needed


class CRUDSpanTextEntityLink(
    CRUDBase[SpanTextEntityLinkORM, SpanTextEntityLinkCreate, SpanTextEntityLinkCreate]
):
    def create(
        self, db: Session, *, create_dto: SpanTextEntityLinkCreate
    ) -> SpanTextEntityLinkORM:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanTextEntityLinkCreate]
    ) -> List[SpanTextEntityLinkORM]:
        if len(create_dtos) == 0:
            return []
        # One assumption is that all entities have the same project_id
        project_id = (
            db.query(EntityORM)
            .filter(EntityORM.id == create_dtos[0].linked_entity_id)
            .first()
            .project_id
        )
        all_ids = [link.linked_span_text_id for link in create_dtos]
        existing_links = self.read_multi_span_text_and_project_id(
            db=db, span_text_ids=all_ids, project_id=project_id
        )
        existing_ids = [d.linked_span_text_id for d in existing_links]
        to_create = {
            dto.linked_span_text_id: dto
            for dto in create_dtos
            if dto.linked_span_text_id not in existing_ids
        }
        to_create = to_create.values()

        if len(to_create) > 0:
            db_objs = [self.model(**jsonable_encoder(dto)) for dto in to_create]
            db.bulk_save_objects(db_objs)
            db.commit()
        if len(existing_links) > 0:
            existing_links_map = {
                link.linked_span_text_id: link for link in existing_links
            }
            for create_dto in create_dtos:
                if create_dto.linked_span_text_id in existing_links_map:
                    existing_links_map[
                        create_dto.linked_span_text_id
                    ].linked_entity_id = create_dto.linked_entity_id
            ids = [dto.id for dto in existing_links]
            update_dtos = [
                SpanTextEntityLinkUpdate(
                    linked_entity_id=dto.linked_entity_id,
                    linked_span_text_id=dto.linked_span_text_id,
                )
                for dto in existing_links
            ]
            self.update_multi(db, ids=ids, update_dtos=update_dtos)

    def update(
        self, db: Session, *, id: int, update_dto: SpanTextEntityLinkUpdate
    ) -> SpanTextEntityLinkORM:
        return super().update(db, id=id, update_dto=update_dto)

    def update_multi(
        self,
        db: Session,
        *,
        ids: List[int],
        update_dtos: List[SpanTextEntityLinkUpdate],
    ) -> SpanTextEntityLinkORM:
        if len(ids) != len(update_dtos):
            raise ValueError("The number of IDs must match the number of update DTOs")

        update_mappings = []
        for id, dto in zip(ids, update_dtos):
            dto_data = jsonable_encoder(dto)
            dto_data["id"] = id
            update_mappings.append(dto_data)

        db.bulk_update_mappings(self.model, update_mappings)
        db.commit()

        updated_records = db.query(self.model).filter(self.model.id.in_(ids)).all()
        return updated_records

    def read_multi_span_text_and_project_id(
        self, db: Session, *, span_text_ids: List[int], project_id: int
    ) -> List[SpanTextEntityLinkORM]:
        query = (
            db.query(SpanTextEntityLinkORM)
            .join(EntityORM, SpanTextEntityLinkORM.linked_entity_id == EntityORM.id)
            .filter(
                SpanTextEntityLinkORM.linked_span_text_id.in_(span_text_ids),
                EntityORM.project_id == project_id,
            )
            .distinct()
        )
        return query.all()


crud_span_text_entity_link = CRUDSpanTextEntityLink(SpanTextEntityLinkORM)
