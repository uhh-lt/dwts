from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_text import crud_span_text
from app.core.data.crud.span_text_entity_link import crud_span_text_entity_link
from app.core.data.dto.entity import (
    EntityCreate,
    EntityMerge,
    EntityRelease,
    EntityUpdate,
)
from app.core.data.dto.span_text_entity_link import (
    SpanTextEntityLinkCreate,
)
from app.core.data.orm.entity import EntityORM
from app.core.data.orm.span_text_entity_link import SpanTextEntityLinkORM


class CRUDEntity(CRUDBase[EntityORM, EntityCreate, EntityUpdate]):
    def create(
        self, db: Session, *, create_dto: EntityCreate, force: bool = True
    ) -> EntityORM:
        result = self.create_multi(db=db, create_dtos=[create_dto], force=force)
        return result[0] if len(result) > 0 else None

    def create_multi(
        self, db: Session, *, create_dtos: List[EntityCreate], force: bool = True
    ) -> List[EntityORM]:
        if len(create_dtos) == 0:
            return []

        # assumption all entities belong to the same project
        project_id = create_dtos[0].project_id

        # duplicate assignments to the same span text are filtered out here
        span_text_dict = {}
        for i, create_dto in enumerate(create_dtos):
            for span_text_id in create_dto.span_text_ids:
                span_text_dict[span_text_id] = i

        ids = list(span_text_dict.keys())
        existing_links = crud_span_text_entity_link.read_multi_span_text_and_project_id(
            db=db, span_text_ids=ids, project_id=project_id
        )
        existing_link_ids = [link.linked_span_text_id for link in existing_links]
        old_entities = [link.linked_entity_id for link in existing_links]

        if not force:
            # if a span text is already assigned it should not be reassigned
            for id in existing_link_ids:
                del span_text_dict[id]

        # recompute create dtos
        indexes_to_use = list(set(span_text_dict.values()))
        reversed_span_text_dict = {}
        for key, value in span_text_dict.items():
            if value not in reversed_span_text_dict:
                reversed_span_text_dict[value] = []
            reversed_span_text_dict[value].append(key)

        def map_index_to_new_dto(index):
            create_dto = create_dtos[index]
            create_dto.span_text_ids = reversed_span_text_dict[index]
            return create_dto

        create_dtos = list(map(map_index_to_new_dto, indexes_to_use))

        # create entity db_objs
        def create_db_obj(create_dto):
            data = jsonable_encoder(create_dto, exclude={"span_text_ids"})
            return self.model(**data)

        db_objs = list(map(create_db_obj, create_dtos))
        db.add_all(db_objs)
        db.flush()
        db.commit()

        links = []
        for db_obj, create_dto in zip(db_objs, create_dtos):
            for span_text_id in create_dto.span_text_ids:
                links.append(
                    SpanTextEntityLinkCreate(
                        linked_entity_id=db_obj.id, linked_span_text_id=span_text_id
                    )
                )
        crud_span_text_entity_link.create_multi(db=db, create_dtos=links)
        db.commit()
        if force:
            self.__remove_unused_entites(db=db, ids=list(set(old_entities)))
        return db_objs

    def read_by_project(self, db: Session, proj_id: int) -> List[EntityORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).all()

    def __remove_multi(self, db: Session, *, ids: List[int]) -> List[EntityORM]:
        removed = db.query(EntityORM).filter(EntityORM.id.in_(ids)).all()
        db.query(EntityORM).filter(EntityORM.id.in_(ids)).delete(
            synchronize_session=False
        )
        db.commit()
        return removed

    def remove(self, db: Session, *, id: int) -> EntityORM:
        pass

    def __remove_unused_entites(self, db: Session, ids: List[int]) -> List[EntityORM]:
        linked_ids_result = (
            db.query(SpanTextEntityLinkORM.linked_entity_id)
            .filter(SpanTextEntityLinkORM.linked_entity_id.in_(ids))
            .distinct()
            .all()
        )
        linked_ids = {item[0] for item in linked_ids_result}
        ids = list(set(ids) - set(linked_ids))
        return self.__remove_multi(db=db, ids=ids)

    def merge(self, db: Session, entity_merge: EntityMerge) -> EntityORM:
        new_entity = EntityCreate(
            name=entity_merge.name,
            project_id=entity_merge.project_id,
            span_text_ids=entity_merge.spantext_ids,
            is_human=True,
            knowledge_base_id=entity_merge.knowledge_base_id,
        )
        return self.create(db=db, create_dto=new_entity, force=True)

    def release(self, db: Session, entity_release: EntityRelease) -> List[EntityORM]:
        new_entities = []
        for span_text_id in entity_release.spantext_ids:
            span_text = crud_span_text.read(db=db, id=span_text_id)
            new_entity = EntityCreate(
                name=span_text.text,
                project_id=entity_release.project_id,
                span_text_ids=[span_text_id],
            )
            new_entities.append(new_entity)
        db_objs = self.create_multi(db=db, create_dtos=new_entities, force=True)
        return db_objs


crud_entity = CRUDEntity(EntityORM)
