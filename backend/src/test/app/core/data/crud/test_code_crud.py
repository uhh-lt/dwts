import random
import string

import pytest
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.db.sql_service import SQLService


def test_create_get_delete_code(session: SQLService, project: int, user: int) -> None:
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"
    code = CodeCreate(
        name=name,
        color=color,
        description=description,
        project_id=project,
        user_id=user,
    )

    # create code
    with session.db_session() as sess:
        db_code = crud_code.create(db=sess, create_dto=code)
        new_code = CodeRead.from_orm(db_code)
    code_id = new_code.id

    # get code
    with session.db_session() as sess:
        db_obj = crud_code.read(db=sess, id=code_id)
        get_code = [CodeRead.from_orm(db_obj)]

    assert len(get_code) == 1
    assert get_code[0].name == name
    assert get_code[0].description == description
    assert get_code[0].color == color

    # delete code
    with session.db_session() as sess:
        crud_code.remove(db=sess, id=code_id)

    # try to get already removed code
    with session.db_session() as sess:
        with pytest.raises(NoSuchElementError):
            db_obj = crud_code.read(db=sess, id=code_id)


def test_update_code(session: SQLService, code: int) -> None:
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"

    # update all fields
    code_new = CodeUpdate(name=name, description=description, color=color)
    with session.db_session() as sess:
        db_obj = crud_code.update(db=sess, id=code, update_dto=code_new)
        get_code = [CodeRead.from_orm(db_obj)]

    assert len(get_code) == 1
    assert get_code[0].name == name
    assert get_code[0].description == description
    assert get_code[0].color == color

    # update nothing
    code_new2 = CodeUpdate()
    with session.db_session() as sess:
        db_obj = crud_code.update(db=sess, id=code, update_dto=code_new2)
        get_code2 = [CodeRead.from_orm(db_obj)]

    assert len(get_code2) == 1
    assert get_code2[0].name == name
    assert get_code2[0].description == description
    assert get_code2[0].color == color


def test_add_get_memo(session: SQLService, code: int, project: int, user: int) -> None:
    title = "".join(random.choices(string.ascii_letters, k=15))
    content = "".join(random.choices(string.ascii_letters, k=30))
    starred = False

    memo = MemoCreate(
        title=title, content=content, user_id=user, project_id=project, starred=starred
    )
    with session.db_session() as sess:
        db_obj = crud_memo.create_for_code(db=sess, code_id=code, create_dto=memo)
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        memo_new = [
            MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=db_obj.id,
                attached_object_type=AttachedObjectType.code,
            )
        ]

    assert len(memo_new) == 1
    assert memo_new[0].title == title
    assert memo_new[0].content == content
    assert memo_new[0].starred == starred

    # get memo
    with session.db_session() as sess:
        db_obj = crud_code.read(db=sess, id=code)
        memos = crud_memo.get_object_memos(db_obj=db_obj)

    assert len(memos) == 1
    assert memos[0].title == title
    assert memos[0].content == content
    assert memos[0].starred == starred

    # get not existing memo
    with pytest.raises(NoSuchElementError):
        with session.db_session() as sess:
            db_obj = crud_code.read(db=sess, id=31337)

    # get user memo
    with session.db_session() as sess:
        db_obj = crud_code.read(db=sess, id=code)
        memos_user = crud_memo.get_object_memos(db_obj=db_obj, user_id=user)

    assert len(memos_user) == 1
    assert memos_user[0].title == title
    assert memos_user[0].content == content
    assert memos_user[0].starred == starred
