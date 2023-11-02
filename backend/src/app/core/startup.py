import os
import random
import time
import traceback

from loguru import logger


def startup(sql_echo: bool = False, reset_data: bool = False) -> None:
    progress_indicator_file = "/tmp/DWTS_START_UP_IN_PROGRESS"

    def is_startup_in_progress() -> bool:
        # Flo: sleep for some random time so that an eventual other process can create the file
        time.sleep(random.uniform(1, 2))
        if not os.path.exists(progress_indicator_file):
            with open(progress_indicator_file, "w") as f:
                # Flo: write the PID, so we know which process created it
                f.write(f"{os.getpid()}")
            logger.debug(
                f"Created startup indicator file at: {progress_indicator_file}!"
            )
            return False

        logger.debug(
            f"Startup indicator file already exists at: {progress_indicator_file}!"
        )
        return True

    def delete_progress_indicator_file():
        if os.path.exists(progress_indicator_file):
            with open(progress_indicator_file, "r") as f:
                pid = int(f.readline().strip())
            if pid == os.getpid() and os.path.exists(progress_indicator_file):
                logger.debug(
                    f"Removing startup indicator file at: {progress_indicator_file}"
                )
                os.remove(progress_indicator_file)

    """
    System Start Up Process
    """
    logger.info("Booting D-WISE Tool Suite Backend ...")

    startup_in_progress = is_startup_in_progress()
    if startup_in_progress:
        logger.debug("Waiting for API startup process to be completed...")
        while os.path.exists(progress_indicator_file):
            time.sleep(1)

    # noinspection PyUnresolvedReferences
    try:
        # start and init services
        __init_services__(
            create_database_and_tables=not startup_in_progress,
            create_root_repo_directory_structure=not startup_in_progress,
            sql_echo=sql_echo,
            reset_database=reset_data,
            reset_repo=reset_data,
            reset_elasticsearch=reset_data,
            reset_weaviate=reset_data,
        )
        if not startup_in_progress:
            __create_system_user__()

    except Exception as e:
        msg = f"Error while starting the API! Exception: {str(e)}"
        logger.error(msg)
        logger.error(traceback.format_exc())
        raise SystemExit(msg)
    finally:
        delete_progress_indicator_file()

    delete_progress_indicator_file()
    logger.info("Started D-WISE Tool Suite Backend!")


# noinspection PyUnresolvedReferences,PyProtectedMember
def __init_services__(
    create_database_and_tables: bool = False,
    create_root_repo_directory_structure: bool = False,
    sql_echo: bool = False,
    reset_database: bool = False,
    reset_repo: bool = False,
    reset_elasticsearch: bool = False,
    reset_weaviate: bool = False,
) -> None:
    # import celery workers to configure
    # import and init RepoService
    from app.celery.celery_worker import celery_worker
    from app.core.data.repo.repo_service import RepoService

    repos = RepoService()
    if create_root_repo_directory_structure:
        repos._create_root_repo_directory_structure(remove_if_exists=reset_repo)
    # create SQL DBs and Tables # TODO Flo: Alembic
    from app.core.db.sql_service import SQLService

    sqls = SQLService(echo=sql_echo)
    if create_database_and_tables:
        sqls._create_database_and_tables(drop_if_exists=reset_database)
    # import and init ElasticSearch
    from app.core.search.elasticsearch_service import ElasticSearchService

    ElasticSearchService(remove_all_indices=reset_elasticsearch)
    # import and init RedisService
    from app.core.db.redis_service import RedisService

    RedisService(flush_all_clients=reset_database)

    # import and init AnalysisService
    from app.core.analysis.analysis_service import AnalysisService

    AnalysisService()
    # import and init MailService
    from app.core.mail.mail_service import MailService

    MailService()
    # import and init RayModelService
    from app.preprocessing.ray_model_service import RayModelService

    RayModelService()

    # import and init SimSearchService
    from app.core.search.simsearch_service import SimSearchService

    SimSearchService(flush=reset_database)


def __create_system_user__() -> None:
    from app.core.data.crud.user import crud_user
    from app.core.data.dto.user import UserCreate
    from app.core.db.sql_service import SQLService
    from config import conf
    from pydantic import EmailStr

    with SQLService().db_session() as db_session:
        if not crud_user.exists(db=db_session, id=1):
            # TODO Flo: this is not nice.. make sure system user cannot be changed, seen from outside, login, etc
            create_dto = UserCreate(
                email=EmailStr(str(conf.system_user.email)),
                first_name=str(conf.system_user.first_name),
                last_name=str(conf.system_user.last_name),
                password=str(conf.system_user.password),
            )
            crud_user.create(db=db_session, create_dto=create_dto)
