import time
from typing import Callable, Dict, List, Optional

from loguru import logger

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.step import PipelineStep
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.concept_over_time_analysis import (
    COTARefinementJobRead,
    COTARefinementJobUpdate,
)
from app.core.db.redis_service import RedisService


class COTARefinementPipeline:
    def __init__(
        self,
    ):
        self._steps_by_ordering: Dict[int, PipelineStep] = dict()
        self._steps_by_name: Dict[str, PipelineStep] = dict()
        self.redis: RedisService = RedisService()

        self.__is_frozen = False

    def _register_pipeline_step(self, step: PipelineStep) -> None:
        if step.ordering < 1:
            raise ValueError(
                f"Cannot add step {step.name}! "
                f"Due to ivalid step ordering {step.ordering}!"
                "Task orderings must be positive integers!"
            )
        elif step.ordering in self._steps_by_ordering:
            raise KeyError(
                f"Cannot add step {step.name} to COTARefinementPipeline!"
                f"There is already a step {self.get_step_by_ordering(step.ordering)}"
                f" with the same ordering: {step.ordering}!"
            )
        elif step.name in self._steps_by_name:
            raise KeyError(
                f"There is already a step with the same name: {step.name}"
                f" in COTARefinementPipeline!"
            )

        self._steps_by_ordering[step.ordering] = step
        self._steps_by_name[step.name] = step

        logger.info(f"Registered PipelineStep {step} in COTARefinementPipeline")

    def get_step_by_ordering(self, ordering: int) -> PipelineStep:
        return self._steps_by_ordering[ordering]

    def execute(self, job: COTARefinementJobRead) -> COTARefinementJobRead:
        if not self.__is_frozen:
            raise ValueError(
                "Cannot execute COTARefinementPipeline"
                " since it has not been frozen yet!"
            )
        # initialize the cargo
        cargo = Cargo(job=job)
        cargo = self._set_next_steps_of_cargo(cargo=cargo)

        start_t = time.perf_counter()

        logger.info(
            f"Executing COTARefinementPipeline sequentially"
            f" for COTA {cargo.job.cota.id}!"
        )

        for ordering in sorted(self._steps_by_ordering.keys()):
            cargo = self._run_step(
                cargo=cargo, step=self.get_step_by_ordering(ordering)
            )

        if cargo.job.status == BackgroundJobStatus.RUNNING:
            cargo = self._update_cota_job(
                cargo=cargo,
                current_step_name="None",
                status=BackgroundJobStatus.FINISHED,
            )

        stop_t = time.perf_counter()

        logger.info(
            f"Executing the COTARefinementPipeline took"
            f" {stop_t - start_t:0.4f} seconds"
        )

        return job

    def _update_cota_job(
        self,
        cargo: Cargo,
        status: BackgroundJobStatus,
        current_step_name: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Cargo:
        update_dto = COTARefinementJobUpdate(
            status=status,
            current_pipeline_step=current_step_name,
            error_message=error_message,
        )
        logger.info(f"Updating COTARefinementJob {cargo.job.id}!")
        cargo.job = self.redis.update_cota_job(key=cargo.job.id, update=update_dto)
        return cargo

    def _set_next_steps_of_cargo(self, cargo: Cargo) -> Cargo:
        logger.debug(
            f"Setting next PipelineSteps for COTARefinementPipelineJob {cargo.job.id}!"
        )
        # set the next steps
        cargo.next_steps = list(
            map(
                lambda i: i[1],
                sorted(self._steps_by_ordering.items(), key=lambda i: i[0]),
            )
        )
        return cargo

    def _run_step(self, cargo: Cargo, step: PipelineStep) -> Cargo:
        if cargo.job.status == BackgroundJobStatus.ABORTED:
            logger.warning(
                (
                    f"Skipping the COTARefinementPipelineStep {step}"
                    f"for COTARefinementJob {cargo.job.id} "
                    "since it has been aborted by a user!"  # IDK if we want this. probably not
                )
            )
            return cargo
        elif cargo.job.status == BackgroundJobStatus.ERROR:
            logger.warning(
                (
                    f"Skipping the COTARefinementPipelineStep {step}"
                    f"for COTARefinementJob {cargo.job.id} "
                    f"since there was an error in a previou step!"
                )
            )
            return cargo

        try:
            if cargo.job.status == BackgroundJobStatus.WAITING:
                cargo = self._update_cota_job(
                    cargo=cargo,
                    current_step_name=step.name,
                    status=BackgroundJobStatus.RUNNING,
                )
            if step in cargo.finished_steps:
                logger.warning(
                    (
                        f"Skipping: {step} for "
                        f"for COTARefinementJob {cargo.job.id} "
                        "it has been executed already!"
                    )
                )
                return cargo
            for required_data in step.required_data:
                if required_data not in cargo.data:
                    msg = (
                        f"Skipping: {step} for "
                        f"COTARefinementJob {cargo.job.id} "
                        f"required data: '{required_data}'!"
                    )
                    logger.error(msg)
                    raise ValueError(msg)

            logger.info((f"Running: {step} for " f"COTARefinementJob {cargo.job.id} "))
            cargo = self._update_cota_job(
                cargo=cargo,
                current_step_name=step.name,
                status=BackgroundJobStatus.RUNNING,
            )

            cargo = step.run(cargo)

            cargo.finished_steps.append(step)
            if len(cargo.next_steps) > 0:
                cargo.next_steps.pop(0)

            logger.debug(f"Finished: {step} !")

        except Exception as e:
            msg = (
                f"An error occurred while executing the COTARefinementPipelineStep {step}"
                f"for COTARefinementJob {cargo.job.id} "
                f"Error: {e}"
            )
            logger.error(msg)
            cargo = self._update_cota_job(
                cargo=cargo,
                status=BackgroundJobStatus.ERROR,
                error_message=msg,
            )
        finally:
            return cargo

    def freeze(self) -> None:
        logger.info("Freezing the COTARefinementPipeline!")
        self.__is_frozen = True

    def register_step(
        self,
        func: Callable[[Cargo], Cargo],
        required_data: List[str] = [],
    ):
        if self.__is_frozen:
            msg = (
                f"Cannot register new PipelineStep {func.__name__} "
                f"since the COTARefinementPipeline is already frozen!"
            )
            logger.error(msg)
            raise ValueError(msg)
        step_instance = PipelineStep(
            name=func.__name__,
            ordering=len(self) + 1,
            required_data=required_data,
            run=func,
        )
        self._register_pipeline_step(step_instance)

    def __str__(self) -> str:
        steps_str = "\n\t".join(
            map(
                lambda i: str(i[1]),
                sorted(self._steps_by_ordering.items(), key=lambda i: i[0]),
            )
        )
        return f"COTARefinementPipeline{{\n\t{steps_str}\n}}"

    def __repr__(self) -> str:
        return str(self)

    def __len__(self) -> int:
        return len(self._steps_by_ordering)
