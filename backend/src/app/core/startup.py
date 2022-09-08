from loguru import logger


def startup(sql_echo: bool = False,
            reset_data: bool = False) -> None:
    """
    System Start Up Process
    """
    logger.info("Booting D-WISE Tool Suite Backend ...")
    # noinspection PyUnresolvedReferences
    from config import conf
    try:
        # start and init services
        __init_services__(sql_echo=sql_echo,
                          reset_database=reset_data,
                          reset_repo=reset_data,
                          reset_elasticsearch=reset_data)
        __create_system_user__()

    except Exception as e:
        msg = f"Error while starting the API! Exception: {str(e)}"
        logger.error(msg)
        raise SystemExit(msg)

    logger.info("Started D-WISE Tool Suite Backend!")


# noinspection PyUnresolvedReferences,PyProtectedMember
def __init_services__(sql_echo: bool = False,
                      reset_database: bool = False,
                      reset_repo: bool = False,
                      reset_elasticsearch: bool = False) -> None:
    # import celery workers to configure
    from app.docprepro.celery.celery_worker import celery_prepro_worker
    # import and init RepoService
    from app.core.data.repo.repo_service import RepoService
    RepoService()._create_root_repo_directory_structure(remove_if_exists=reset_repo)
    # create SQL DBs and Tables # TODO Flo: Alembic
    from app.core.db.sql_service import SQLService
    SQLService(echo=sql_echo)._create_database_and_tables(drop_if_exists=reset_database)
    # import and init ElasticSearch
    from app.core.search.elasticsearch_service import ElasticSearchService
    ElasticSearchService(remove_all_indices=reset_elasticsearch)
    # import and init RedisService
    from app.core.db.redis_service import RedisService
    RedisService()


def __create_system_user__() -> None:
    from app.core.db.sql_service import SQLService
    from app.core.data.crud.user import crud_user
    from app.core.data.dto.user import UserCreate
    from pydantic import EmailStr
    with SQLService().db_session() as db_session:
        if not crud_user.exists(db=db_session, id=1):
            # TODO Flo: this is not nice.. make sure system user cannot be changed, seen from outside, login, etc
            create_dto = UserCreate(email=EmailStr("SYSTEM@DWTS.ORG"),
                                    first_name="SYSTEM",
                                    last_name="USER",
                                    password="SYSTEM")
            crud_user.create(db=db_session, create_dto=create_dto)
