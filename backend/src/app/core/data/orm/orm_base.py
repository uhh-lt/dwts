from typing import Any, Optional, Set

from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase, declared_attr


class ORMBase(DeclarativeBase):
    id: Any
    __name__: str
    __allow_unmapped__ = True

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.replace("ORM", "").lower()

    def as_dict(self, exclude: Optional[Set] = None):
        if not exclude:
            exclude = {}
        return {
            c.key: getattr(self, c.key)
            for c in inspect(self).mapper.column_attrs
            if c.key not in exclude
        }
