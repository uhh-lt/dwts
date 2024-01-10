from typing import TYPE_CHECKING, Callable, List

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.core.analysis.cota.pipeline.cargo import Cargo


class PipelineStep(BaseModel):
    name: str = Field(description="Name of the PipelineStep")
    ordering: int = Field(description="Ordering of the PipelineStep")
    required_data: List[str] = Field(
        description="Required data the PipelineStep needs to access.",
        default_factory=list,
    )
    run: Callable[["Cargo"], "Cargo"]

    def __lt__(self, other: "PipelineStep"):
        return self.ordering < other.ordering

    def __str__(self):
        return (
            f"PipelineStep({self.name}, "
            f"ordering={self.ordering}, "
            f"required_data={self.required_data})"
        )

    def __repr__(self):
        return str(self)
