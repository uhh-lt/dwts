"""merge multi heads

Revision ID: 2930464fe287
Revises: b9de10411f61, e0a8fb361b1e
Create Date: 2024-05-28 10:32:51.812569

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "2930464fe287"
down_revision: Union[str, None] = ("b9de10411f61", "e0a8fb361b1e")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
