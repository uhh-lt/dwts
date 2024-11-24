"""add sentence annotation

Revision ID: 050f9378a3e1
Revises: f3108bb5e496
Create Date: 2024-11-21 10:57:16.865538

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "050f9378a3e1"
down_revision: Union[str, None] = "f3108bb5e496"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "sentenceannotation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sentence_id_start", sa.Integer(), nullable=False),
        sa.Column("sentence_id_end", sa.Integer(), nullable=False),
        sa.Column(
            "created", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("code_id", sa.Integer(), nullable=False),
        sa.Column("annotation_document_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["annotation_document_id"], ["annotationdocument.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["code_id"], ["code.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sentenceannotation_annotation_document_id"),
        "sentenceannotation",
        ["annotation_document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sentenceannotation_code_id"),
        "sentenceannotation",
        ["code_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sentenceannotation_created"),
        "sentenceannotation",
        ["created"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sentenceannotation_id"), "sentenceannotation", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_sentenceannotation_sentence_id_end"),
        "sentenceannotation",
        ["sentence_id_end"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sentenceannotation_sentence_id_start"),
        "sentenceannotation",
        ["sentence_id_start"],
        unique=False,
    )
    op.add_column(
        "objecthandle", sa.Column("sentence_annotation_id", sa.Integer(), nullable=True)
    )
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
        [
            "user_id",
            "project_id",
            "code_id",
            "memo_id",
            "source_document_id",
            "span_annotation_id",
            "bbox_annotation_id",
            "sentence_annotation_id",
            "span_group_id",
            "document_tag_id",
        ],
    )
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.text("coalesce(user_id, 0)"),
            sa.text("coalesce(project_id, 0)"),
            sa.text("coalesce(code_id, 0)"),
            sa.text("coalesce(source_document_id, 0)"),
            sa.text("coalesce(span_annotation_id, 0)"),
            sa.text("coalesce(bbox_annotation_id, 0)"),
            sa.text("coalesce(sentence_annotation_id, 0)"),
            sa.text("coalesce(span_group_id, 0)"),
            sa.text("coalesce(document_tag_id, 0)"),
            sa.text("coalesce(memo_id, 0)"),
        ],
        unique=True,
    )
    op.create_index(
        op.f("ix_objecthandle_sentence_annotation_id"),
        "objecthandle",
        ["sentence_annotation_id"],
        unique=False,
    )
    op.create_foreign_key(
        None,
        "objecthandle",
        "sentenceannotation",
        ["sentence_annotation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # ### end Alembic commands ###
    op.drop_constraint(
        constraint_name="CC_object_handle_refers_to_exactly_one_instance",
        table_name="objecthandle",
    )

    op.create_check_constraint(
        constraint_name="CC_object_handle_refers_to_exactly_one_instance",
        table_name="objecthandle",
        condition=sa.text(
            """(
                CASE WHEN user_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN code_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN memo_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN source_document_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN span_annotation_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN bbox_annotation_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN sentence_annotation_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN span_group_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN document_tag_id IS NULL THEN 0 ELSE 1 END
            ) = 1"""
        ),
    )


def downgrade() -> None:
    pass
