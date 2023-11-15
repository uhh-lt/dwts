from datetime import datetime
from enum import Enum
from typing import Optional, Union

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field


class ExportFormat(str, Enum):
    CSV = "CSV"
    JSON = "JSON"


class ExportJobType(str, Enum):
    SINGLE_PROJECT_ALL_DATA = "SINGLE_PROJECT_ALL_DATA"
    SINGLE_PROJECT_ALL_TAGS = "SINGLE_PROJECT_ALL_TAGS"

    SINGLE_USER_ALL_DATA = "SINGLE_USER_ALL_DATA"
    SINGLE_USER_ALL_CODES = "SINGLE_USER_ALL_CODES"
    SINGLE_USER_ALL_MEMOS = "SINGLE_USER_ALL_MEMOS"
    SINGLE_USER_LOGBOOK = "SINGLE_USER_LOGBOOK"

    SINGLE_DOC_ALL_USER_ANNOTATIONS = "SINGLE_DOC_ALL_USER_ANNOTATIONS"
    SINGLE_DOC_SINGLE_USER_ANNOTATIONS = "SINGLE_DOC_SINGLE_USER_ANNOTATIONS"


class SpecificExportJobParameters(BaseModel):
    project_id: int = Field(description="The ID of the Project to export from")
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )


class SingleProjectAllDataExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_PROJECT_ALL_DATA,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )


class SingleProjectAllTagsExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_PROJECT_ALL_TAGS,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )


class SingleUserAllDataExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_USER_ALL_DATA,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleUserAllCodesExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_USER_ALL_CODES,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleUserAllMemosExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_USER_ALL_MEMOS,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleUserLogbookExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_USER_LOGBOOK,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    user_id: int = Field(description="The ID of the User to get the data from.")


class SingleDocAllUserAnnotationsExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    sdoc_id: int = Field(description="The ID of the SDocument to get the data from.")


class SingleDocSingleUserAnnotationsExportJobParams(SpecificExportJobParameters):
    export_job_type: ExportJobType = Field(
        default=ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS,
        # Literal=True, #TODO: What else?
        description="The type of the export job (what to export)",
    )
    sdoc_id: int = Field(description="The ID of the SDocument to get the data from.")
    user_id: int = Field(description="The ID of the User to get the data from.")


class ExportJobParameters(BaseModel):
    export_job_type: ExportJobType = Field(
        description="The type of the export job (what to export)"
    )
    export_format: Optional[ExportFormat] = Field(
        description="The format of the exported data.",
        default=ExportFormat.CSV,
    )
    specific_export_job_parameters: Union[
        SingleProjectAllDataExportJobParams,
        SingleProjectAllTagsExportJobParams,
        SingleUserAllDataExportJobParams,
        SingleUserAllCodesExportJobParams,
        SingleUserAllMemosExportJobParams,
        SingleUserLogbookExportJobParams,
        SingleDocAllUserAnnotationsExportJobParams,
        SingleDocSingleUserAnnotationsExportJobParams,
    ] = Field(description="Specific parameters for the export job w.r.t it's type")


# Properties shared across all DTOs
class ExportJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the ExportJob"
    )
    results_url: Optional[str] = Field(
        default=None, description="URL to download the results when done."
    )


# Properties to create
class ExportJobCreate(ExportJobBaseDTO):
    parameters: ExportJobParameters = Field(
        description="The parameters of the export job that defines what to export!"
    )


# Properties to update
class ExportJobUpdate(ExportJobBaseDTO, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the ExportJob"
    )
    results_url: Optional[str] = Field(
        default=None, description="URL to download the results when done."
    )


# Properties to read
class ExportJobRead(ExportJobBaseDTO):
    id: str = Field(description="ID of the ExportJob")
    parameters: ExportJobParameters = Field(
        description="The parameters of the export job that defines what to export!"
    )
    created: datetime = Field(description="Created timestamp of the ExportJob")
