import os
import random
import string

# Allow app to detect if it's running inside tests
import sys

import pytest
from app.core.startup import startup

sys._called_from_test = True

# Flo: just do it once. We have to check because if we start the main function, unvicorn will import this
# file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
if not STARTUP_DONE:
    startup(reset_data=True, enable_ray=False)
    os.environ["STARTUP_DONE"] = "1"

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import crud_user
from app.core.data.dto.code import CodeCreate, CodeRead
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserCreate, UserRead
from app.core.db.sql_service import SQLService


# Always use the asyncio backend for async tests
@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def code(session: SQLService, project: int, user: int) -> int:
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

    with session.db_session() as sess:
        db_code = crud_code.create(db=sess, create_dto=code)
        code_obj = CodeRead.from_orm(db_code)

    yield code_obj.id

    with session.db_session() as sess:
        crud_code.remove(db=sess, id=code_obj.id)


@pytest.fixture
def session() -> SQLService:
    return SQLService()


@pytest.fixture
def project(session: int, user: int) -> int:
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        id = crud_project.create(
            db=sess, create_dto=ProjectCreate(title=title, description=description)
        ).id
        crud_project.associate_user(db=sess, proj_id=id, user_id=user)

    yield id

    with session.db_session() as sess:
        crud_project.remove(db=sess, id=id)


@pytest.fixture
def user(session: SQLService) -> int:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    with session.db_session() as sess:
        # create user
        db_user = crud_user.create(db=sess, create_dto=user)
        user = UserRead.from_orm(db_user)

    yield user.id

    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user.id)
