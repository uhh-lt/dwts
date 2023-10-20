# ignore unorganized imports for this file
# ruff: noqa: E402

import os
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import PlainTextResponse
from fastapi.routing import APIRoute
from loguru import logger
from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from uvicorn.main import uvicorn

from api.validation import InvalidError
from app.core.authorization.authz_user import ForbiddenError

from app.core.startup import startup  # isort: skip

# Flo: just do it once. We have to check because if we start the main function,
#  unvicorn will import this file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
if not STARTUP_DONE:
    startup(reset_data=False, sql_echo=False)
    os.environ["STARTUP_DONE"] = "1"

from api.endpoints import (
    analysis,
    analysis_table,
    annotation_document,
    authentication,
    bbox_annotation,
    code,
    concept_over_time_analysis,
    crawler,
    document_tag,
    export,
    feedback,
    general,
    memo,
    prepro,
    project,
    project_metadata,
    search,
    source_document,
    source_document_metadata,
    span_annotation,
    span_group,
    timeline_analysis,
    trainer,
    user,
    whiteboard,
)
from app.core.data.crawler.crawler_service import (
    CrawlerJobPreparationError,
    NoDataToCrawlError,
    NoSuchCrawlerJobError,
)
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.source_document import (
    SourceDocumentPreprocessingUnfinishedError,
)
from app.core.data.dto.project import ProjectReadAction
from app.core.data.dto.source_document import SourceDocumentReadAction
from app.core.data.export.export_service import (
    ExportJobPreparationError,
    NoDataToExportError,
    NoSuchExportFormatError,
    NoSuchExportJobError,
)
from app.core.data.repo.repo_service import (
    FileAlreadyExistsInRepositoryError,
    FileNotFoundInRepositoryError,
    RepoService,
    SourceDocumentNotFoundInRepositoryError,
)
from app.core.search.elasticsearch_service import (
    NoSuchMemoInElasticSearchError,
    NoSuchSourceDocumentInElasticSearchError,
)
from config import conf


# custom method to generate OpenApi function names
def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting D-WISE Tool Suite FastAPI!")
    yield
    # Shutdown
    logger.info("Stopping D-WISE Tool Suite FastAPI!")
    RepoService().purge_temporary_files()


# create the FastAPI app
app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)


# customize openapi schema
# we need to add some DTOs manually, because they are not used in any endpoint, but needed in the frontend nonetheless
def custom_openapi():
    openapi_schema = get_openapi(
        title="Discourse Analysis Tool Suite API",
        version=conf.api.version,
        routes=app.routes,
    )
    openapi_schema["components"]["schemas"]["SourceDocumentReadAction"] = (
        SourceDocumentReadAction.model_json_schema(
            ref_template="#/components/schemas/{model}"
        )
    )
    openapi_schema["components"]["schemas"]["ProjectReadAction"] = (
        ProjectReadAction.model_json_schema(ref_template="#/components/schemas/{model}")
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# Handle CORS
# TODO Flo: Handle CORS via ReverseProxy in FrontEnd!
origins = [
    "http://localhost",
    "http://localhost:8080",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to return GZip for results over a certain number of bytes
app.add_middleware(GZipMiddleware, minimum_size=500)


# add custom exception handlers
# TODO Flo: find a better place for this! (and Exceptions in general. move into own file)
@app.exception_handler(NoSuchElementError)
async def no_such_element_error_handler(_, exc: NoSuchElementError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoDataToCrawlError)
async def no_data_to_crawl_handler(_, exc: NoDataToCrawlError):
    return PlainTextResponse(str(exc), status_code=400)


@app.exception_handler(NoSuchCrawlerJobError)
async def no_such_crawler_job_handler(_, exc: NoSuchCrawlerJobError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(CrawlerJobPreparationError)
async def crawler_job_preparation_error_handler(_, exc: CrawlerJobPreparationError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoDataToExportError)
async def no_data_to_export_handler(_, exc: NoDataToExportError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoSuchExportJobError)
async def no_such_export_job_handler(_, exc: NoSuchExportJobError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoSuchExportFormatError)
async def no_such_export_format_handler(_, exc: NoSuchExportFormatError):
    return PlainTextResponse(str(exc), status_code=400)


@app.exception_handler(ExportJobPreparationError)
async def export_job_preparation_error_handler(_, exc: ExportJobPreparationError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchSourceDocumentInElasticSearchError)
async def no_such_sdoc_in_es_error_handler(
    _, exc: NoSuchSourceDocumentInElasticSearchError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchMemoInElasticSearchError)
async def no_such_memo_in_es_error_handler(_, exc: NoSuchMemoInElasticSearchError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentNotFoundInRepositoryError)
async def source_document_not_found_in_repository_error_handler(
    _, exc: SourceDocumentNotFoundInRepositoryError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentPreprocessingUnfinishedError)
async def source_document_preprocessing_unfinished_error_handler(
    _, exc: SourceDocumentPreprocessingUnfinishedError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(FileNotFoundInRepositoryError)
async def file_not_found_in_repository_error_handler(
    _, exc: FileNotFoundInRepositoryError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(FileAlreadyExistsInRepositoryError)
async def file_already_exists_in_repository_error_handler(
    _, exc: FileAlreadyExistsInRepositoryError
):
    return PlainTextResponse(str(exc), status_code=406)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_, exc: IntegrityError):
    if isinstance(exc.orig, UniqueViolation):
        msg = str(exc.orig.pgerror).split("\n")[1]
        return PlainTextResponse(msg, status_code=409)
    else:
        return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(ForbiddenError)
def forbidden_error_handler(_, exc: ForbiddenError):
    return PlainTextResponse(str(exc), status_code=403)


@app.exception_handler(InvalidError)
def invalid_error_handler(_, exc: InvalidError):
    return PlainTextResponse(str(exc), status_code=HTTPStatus.BAD_REQUEST)


# include the endpoint routers
app.include_router(general.router)
app.include_router(authentication.router)
app.include_router(user.router)
app.include_router(project.router)
app.include_router(source_document.router)
app.include_router(document_tag.router)
app.include_router(annotation_document.router)
app.include_router(span_annotation.router)
app.include_router(span_group.router)
app.include_router(bbox_annotation.router)
app.include_router(code.router)
app.include_router(memo.router)
app.include_router(search.router)
app.include_router(source_document_metadata.router)
app.include_router(feedback.router)
app.include_router(analysis.router)
app.include_router(prepro.router)
app.include_router(export.router)
app.include_router(crawler.router)
app.include_router(analysis_table.router)
app.include_router(whiteboard.router)
app.include_router(project_metadata.router)
app.include_router(timeline_analysis.router)
app.include_router(trainer.router)
app.include_router(concept_over_time_analysis.router)


def main() -> None:
    # read port from config
    port = int(conf.api.port)
    assert (
        port is not None and isinstance(port, int) and port > 0
    ), "The API port has to be a positive integer! E.g. 8081"

    is_debug = conf.api.production_mode == "0"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level=conf.logging.level.lower(),
        reload=is_debug,
    )


if __name__ == "__main__":
    main()
