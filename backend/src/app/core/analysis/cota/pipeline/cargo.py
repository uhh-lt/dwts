from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field, SkipValidation

from app.core.data.dto.concept_over_time_analysis import COTARefinementJobRead

# if TYPE_CHECKING:
#     from app.core.analysis.cota.pipeline.step import PipelineStep


class Cargo(BaseModel):
    job: COTARefinementJobRead = Field(description="The COTARefinementJob")

    next_steps: List[
        SkipValidation
    ] = Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
        description="Next Tasks to be executed.", default_factory=list
    )

    finished_steps: List[
        SkipValidation
    ] = Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
        description="Tasks that have been executed.", default_factory=list
    )

    data: Dict[str, Any] = Field(description="data", default_factory=dict)

    model_config = ConfigDict(arbitrary_types_allowed=True)
