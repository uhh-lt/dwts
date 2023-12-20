# ignore unorganized imports for this file
# ruff: noqa: E402

import os
import random
import string

# Allow app to detect if it's running inside tests
from typing import Callable, Generator

import pytest
from fastapi import Request
from fastapi.datastructures import Headers
from sqlalchemy.orm import Session

from app.core.authorization.authz_user import AuthzUser
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.startup import startup

os.environ["RAY_ENABLED"] = "False"

# Flo: just do it once. We have to check because if we start the main function, unvicorn will import this
# file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
if not STARTUP_DONE:
    startup(reset_data=True)
    os.environ["STARTUP_DONE"] = "1"

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserCreate, UserRead
from app.core.db.sql_service import SQLService


# Always use the asyncio backend for async tests
@pytest.fixture
def anyio_backend():
    return "asyncio"


def code_fixture_base(session: SQLService, project: int, user: int) -> CodeORM:
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
    return db_code


@pytest.fixture
def code(session: SQLService, project: int, user: int) -> Generator[int, None, None]:
    code_obj = code_fixture_base(session, project, user)

    yield code_obj.id

    with session.db_session() as sess:
        crud_code.remove(db=sess, id=code_obj.id)


@pytest.fixture
def make_code(
    session: SQLService, project: int, user: int
) -> Generator[Callable[[], CodeORM], None, None]:
    created_codes = []

    def factory():
        code = code_fixture_base(session, project, user)
        created_codes.append(code)
        return code

    yield factory

    with session.db_session() as sess:
        for code in created_codes:
            crud_code.remove(db=sess, id=code.id)


@pytest.fixture
def session() -> SQLService:
    return SQLService()


@pytest.fixture
def rollbacked_session(session: SQLService) -> Generator[Session, None, None]:
    db = session.session_maker()

    yield db

    db.rollback()
    db.close()


def project_fixture_base(session: SQLService, user: int) -> ProjectORM:
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        system_user = UserRead.model_validate(crud_user.read(sess, SYSTEM_USER_ID))
        project = crud_project.create(
            db=sess,
            create_dto=ProjectCreate(
                title=title,
                description=description,
            ),
            creating_user=system_user,
        )
        crud_project.associate_user(db=sess, proj_id=project.id, user_id=user)

    return project


@pytest.fixture
def project(session: SQLService, user: int) -> Generator[int, None, None]:
    project_id = project_fixture_base(session, user).id
    yield project_id

    with session.db_session() as sess:
        crud_project.remove(db=sess, id=project_id)


@pytest.fixture
def make_project(
    session: SQLService, user: int
) -> Generator[Callable[[], ProjectORM], None, None]:
    created_projects = []

    def factory():
        project = project_fixture_base(session, user)
        created_projects.append(project)
        return project

    yield factory

    with session.db_session() as sess:
        for project in created_projects:
            crud_project.remove(db=sess, id=project.id)


def user_fixture_base(session: SQLService) -> UserRead:
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
        user = UserRead.model_validate(db_user)

        return user


@pytest.fixture
def user(session: SQLService) -> Generator[int, None, None]:
    user = user_fixture_base(session)
    yield user.id
    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user.id)


# This fixture allows a single test to easily create
# multiple users.
@pytest.fixture
def make_user(session: SQLService) -> Generator[Callable[[], UserRead], None, None]:
    created_users = []

    def func():
        user = user_fixture_base(session)
        created_users.append(user)
        return user

    yield func

    with session.db_session() as db:
        for user in created_users:
            crud_user.remove(db=db, id=user.id)


@pytest.fixture
def authz_user(
    user: int, rollbacked_session: Session, mock_request: Request
) -> AuthzUser:
    user_orm = crud_user.read(rollbacked_session, user)
    authz_user = AuthzUser(request=mock_request, user=user_orm, db=rollbacked_session)

    return authz_user


@pytest.fixture
def mock_request() -> Request:
    request = Request(
        {
            "type": "http",
            "path": "/",
            "headers": Headers({}).raw,
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "client": ("127.0.0.1", 8080),
            "server": ("localhost", 443),
        }
    )
    return request
