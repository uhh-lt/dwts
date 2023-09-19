from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.action import ActionORM
    from app.core.data.orm.analysis_table import AnalysisTableORM
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.code import CodeORM
    from app.core.data.orm.memo import MemoORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.whiteboard import WhiteboardORM


class UserORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False, index=True)
    last_name = Column(String, nullable=False, index=True)
    password = Column(String, nullable=False)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM", uselist=False, back_populates="user", passive_deletes=True
    )

    # one to many
    codes: List["CodeORM"] = relationship(
        "CodeORM", back_populates="user", passive_deletes=True
    )

    annotation_documents: List["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="user", passive_deletes=True
    )

    memos: List["MemoORM"] = relationship(
        "MemoORM", back_populates="user", passive_deletes=True
    )

    analysis_tables: List["AnalysisTableORM"] = relationship(
        "AnalysisTableORM", back_populates="user", passive_deletes=True
    )

    whiteboards: List["WhiteboardORM"] = relationship(
        "WhiteboardORM", back_populates="user", passive_deletes=True
    )

    actions: List["ActionORM"] = relationship(
        "ActionORM", back_populates="user", passive_deletes=True
    )

    # many to many
    projects: List["ProjectORM"] = relationship(
        "ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users"
    )
