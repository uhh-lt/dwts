"""add sdoc job table

Revision ID: 2fd1c3268db3
Revises: f3108bb5e496
Create Date: 2025-02-10 15:29:01.274571

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2fd1c3268db3"
down_revision: Union[str, None] = "f3108bb5e496"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "sourcedocumentjob",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quotation_attribution_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["id"], ["sourcedocument.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sourcedocumentjob_id"), "sourcedocumentjob", ["id"], unique=False
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_sourcedocumentjob_id"), table_name="sourcedocumentjob")
    op.drop_table("sourcedocumentjob")
    # ### end Alembic commands ###
