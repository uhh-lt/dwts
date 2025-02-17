from datetime import datetime
from typing import Callable, Dict, List, Type, Union

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.llm_job import (
    AnnotationLLMJobResult,
    AnnotationParams,
    AnnotationResult,
    ApproachRecommendation,
    ApproachType,
    DocumentTaggingLLMJobResult,
    DocumentTaggingParams,
    DocumentTaggingResult,
    FewShotParams,
    LLMJobCreate,
    LLMJobParameters,
    LLMJobParameters2,
    LLMJobRead,
    LLMJobResult,
    LLMJobUpdate,
    LLMPromptTemplates,
    MetadataExtractionLLMJobResult,
    MetadataExtractionParams,
    MetadataExtractionResult,
    ModelTrainingParams,
    SentenceAnnotationLLMJobResult,
    SentenceAnnotationParams,
    SentenceAnnotationResult,
    TaskType,
    TrainingParameters,
    ZeroShotParams,
)
from app.core.data.dto.sentence_annotation import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.annotation_prompt_builder import (
    AnnotationPromptBuilder,
    OllamaAnnotationResults,
)
from app.core.data.llm.prompts.metadata_prompt_builder import (
    MetadataPromptBuilder,
    OllamaMetadataExtractionResults,
)
from app.core.data.llm.prompts.prompt_builder import PromptBuilder
from app.core.data.llm.prompts.sentence_annotation_prompt_builder import (
    OllamaSentenceAnnotationResults,
    SentenceAnnotationPromptBuilder,
)
from app.core.data.llm.prompts.tagging_prompt_builder import (
    OllamaDocumentTaggingResult,
    TaggingPromptBuilder,
)
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.core.db.weaviate_service import WeaviateService
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.seqsenttagger import (
    SeqSentTaggerDoc,
    SeqSentTaggerJobInput,
)
from app.util.singleton_meta import SingletonMeta
from config import conf

lac = conf.llm_assistant

SYSTEM_USER_IDS = [
    SYSTEM_USER_ID,
    ASSISTANT_ZEROSHOT_ID,
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
]


class LLMJobPreparationError(Exception):
    def __init__(self, cause: Union[Exception, str]) -> None:
        super().__init__(f"Cannot prepare and create the LLMJob! {cause}")


class LLMJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, llm_job_id: str) -> None:
        super().__init__(f"The LLMJob with ID {llm_job_id} already started or is done!")


class NoSuchLLMJobError(Exception):
    def __init__(self, llm_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not LLMJob with ID {llm_job_id}! {cause}")


class UnsupportedLLMJobTypeError(Exception):
    def __init__(self, llm_job_type: TaskType) -> None:
        super().__init__(f"LLMJobType {llm_job_type} is not supported! ")


class LLMService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.ollamas: OllamaService = OllamaService()
        cls.rms: RayModelService = RayModelService()
        cls.sss: WeaviateService = WeaviateService()

        # map from job_type to function
        cls.llm_method_for_job_approach_type: Dict[
            TaskType, Dict[ApproachType, Callable[..., LLMJobResult]]
        ] = {
            TaskType.DOCUMENT_TAGGING: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_document_tagging,
                ApproachType.LLM_FEW_SHOT: cls._llm_document_tagging,
                ApproachType.MODEL_TRAINING: cls._llm_document_tagging,
            },
            TaskType.METADATA_EXTRACTION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_metadata_extraction,
                ApproachType.LLM_FEW_SHOT: cls._llm_metadata_extraction,
                ApproachType.MODEL_TRAINING: cls._llm_metadata_extraction,
            },
            TaskType.ANNOTATION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_annotation,
                ApproachType.LLM_FEW_SHOT: cls._llm_annotation,
                ApproachType.MODEL_TRAINING: cls._llm_annotation,
            },
            TaskType.SENTENCE_ANNOTATION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_sentence_annotation,
                ApproachType.LLM_FEW_SHOT: cls._llm_sentence_annotation,
                ApproachType.MODEL_TRAINING: cls._ray_sentence_annotation,
            },
        }

        # map from job_type to promt builder
        cls.llm_prompt_builder_for_job_type: Dict[TaskType, Type[PromptBuilder]] = {
            TaskType.DOCUMENT_TAGGING: TaggingPromptBuilder,
            TaskType.METADATA_EXTRACTION: MetadataPromptBuilder,
            TaskType.ANNOTATION: AnnotationPromptBuilder,
            TaskType.SENTENCE_ANNOTATION: SentenceAnnotationPromptBuilder,
        }

        return super(LLMService, cls).__new__(cls)

    def _assert_all_requested_data_exists(self, llm_params: LLMJobParameters) -> bool:
        # TODO check all job type specific parameters
        return True

    def prepare_llm_job(self, llm_params: LLMJobParameters2) -> LLMJobRead:
        if not self._assert_all_requested_data_exists(llm_params=llm_params):
            raise LLMJobPreparationError(
                cause="Not all requested data for the LLM job exists!"
            )

        llmj_create = LLMJobCreate(
            status=BackgroundJobStatus.WAITING,
            parameters=llm_params,
            num_steps_total=len(llm_params.specific_task_parameters.sdoc_ids)
            + 2,  # +2 for the start and end
            current_step=0,
            current_step_description="Created new LLMJob",
        )
        try:
            llmj_read = self.redis.store_llm_job(llm_job=llmj_create)
        except Exception as e:
            raise LLMJobPreparationError(cause=e)

        return llmj_read

    def get_llm_job(self, llm_job_id: str) -> LLMJobRead:
        try:
            llmj = self.redis.load_llm_job(key=llm_job_id)
        except Exception as e:
            raise NoSuchLLMJobError(llm_job_id=llm_job_id, cause=e)

        return llmj

    def get_all_llm_jobs(self, project_id: int) -> List[LLMJobRead]:
        return self.redis.get_all_llm_jobs(project_id=project_id)

    def _update_llm_job(self, llm_job_id: str, update: LLMJobUpdate) -> LLMJobRead:
        try:
            llmj = self.redis.update_llm_job(key=llm_job_id, update=update)
        except Exception as e:
            raise NoSuchLLMJobError(llm_job_id=llm_job_id, cause=e)
        return llmj

    def _next_llm_job_step(self, llm_job_id: str, description: str) -> LLMJobRead:
        llmj = self.get_llm_job(llm_job_id=llm_job_id)
        llmj = self._update_llm_job(
            llm_job_id=llm_job_id,
            update=LLMJobUpdate(
                current_step=llmj.current_step + 1, current_step_description=description
            ),
        )
        return llmj

    def _update_llm_job_description(
        self, llm_job_id: str, description: str
    ) -> LLMJobRead:
        llmj = self.get_llm_job(llm_job_id=llm_job_id)
        llmj = self._update_llm_job(
            llm_job_id=llm_job_id,
            update=LLMJobUpdate(current_step_description=description),
        )
        return llmj

    def start_llm_job_sync(self, llm_job_id: str) -> LLMJobRead:
        llmj = self.get_llm_job(llm_job_id=llm_job_id)
        if llmj.status != BackgroundJobStatus.WAITING:
            raise LLMJobAlreadyStartedOrDoneError(llm_job_id=llm_job_id)

        llmj = self._update_llm_job(
            llm_job_id=llm_job_id,
            update=LLMJobUpdate(
                status=BackgroundJobStatus.RUNNING,
                current_step=1,
                current_step_description="Starting LLMJob",
            ),
        )

        try:
            with self.sqls.db_session() as db:
                # get the llm method based on the jobtype
                llm_method = self.llm_method_for_job_approach_type[
                    llmj.parameters.llm_job_type
                ][llmj.parameters.llm_approach_type]
                if llm_method is None:
                    raise UnsupportedLLMJobTypeError(llmj.parameters.llm_job_type)

                # execute the llm_method with the provided specific parameters
                result = llm_method(
                    self=self,
                    db=db,
                    llm_job_id=llm_job_id,
                    project_id=llmj.parameters.project_id,
                    approach_parameters=llmj.parameters.specific_approach_parameters,
                    task_parameters=llmj.parameters.specific_task_parameters,
                )

            llmj = self.get_llm_job(llm_job_id=llm_job_id)
            llmj = self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(
                    result=result,
                    status=BackgroundJobStatus.FINISHED,
                    current_step=llmj.num_steps_total,
                    current_step_description="Finished LLMJob",
                ),
            )

        except Exception as e:
            logger.error(f"Cannot finish LLMJob: {e}")
            llmj = self.get_llm_job(llm_job_id=llm_job_id)
            self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(
                    status=BackgroundJobStatus.ERROR,
                    current_step_description=f"Error during LLMJob Step {llmj.current_step} {llmj.current_step_description}: {e}",
                ),
            )

        return llmj

    def determine_approach(
        self, llm_job_params: LLMJobParameters
    ) -> ApproachRecommendation:
        match llm_job_params.llm_job_type:
            case TaskType.DOCUMENT_TAGGING:
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                        ApproachType.MODEL_TRAINING: False,
                    },
                    reasoning="Only zero-shot approach is available for document tagging (yet).",
                )
            case TaskType.METADATA_EXTRACTION:
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                        ApproachType.MODEL_TRAINING: False,
                    },
                    reasoning="Only zero-shot approach is available for metadata extraction (yet).",
                )
            case TaskType.ANNOTATION:
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                        ApproachType.MODEL_TRAINING: False,
                    },
                    reasoning="Only zero-shot approach is available for annotation (yet).",
                )
            case TaskType.SENTENCE_ANNOTATION:
                assert isinstance(
                    llm_job_params.specific_task_parameters,
                    SentenceAnnotationParams,
                )
                selected_code_ids = llm_job_params.specific_task_parameters.code_ids

                # 1. Find the number of labeled sentences for each code
                with self.sqls.db_session() as db:
                    sentence_annotations = [
                        sa
                        for sa in crud_sentence_anno.read_by_codes(
                            db=db, code_ids=selected_code_ids
                        )
                        if sa.user_id
                        not in SYSTEM_USER_IDS  # Filter out annotations of the system users
                    ]

                # 2. Find the code names
                with self.sqls.db_session() as db:
                    codes = crud_code.read_by_ids(db=db, ids=selected_code_ids)
                    code_id2name = {code.id: code.name for code in codes}

                # 3. Count annotations by code_id, get the code names
                code_id2num_sent_annos = {code.id: 0 for code in codes}
                for sent_anno in sentence_annotations:
                    code_id2num_sent_annos[sent_anno.code_id] += 1

                # 4. Determine the approach based on the minimum number of labeled sentences
                # 4.1 find the code with the least labeled sentences
                code_with_min_labeled_sentences = min(
                    code_id2num_sent_annos.keys(),
                    key=lambda k: code_id2num_sent_annos[k],
                )
                min_labeled_sentences = code_id2num_sent_annos[
                    code_with_min_labeled_sentences
                ]

                # 4.2 create reasoning
                reasoning = f"You selected {len(selected_code_ids)} codes. I checked the number of labeled sentences for each code and found:\n"
                code_counts = []
                for code_id, num_labeled_sentences in code_id2num_sent_annos.items():
                    code_counts.append(
                        f"{code_id2name[code_id]}: {num_labeled_sentences}"
                    )
                reasoning += "\n".join(code_counts)
                reasoning += f"\nThe code with the least labeled sentences ({min_labeled_sentences}) is {code_id2name[code_with_min_labeled_sentences]}. Based on this, I recommend the following approach:"

                # 4.3 determine the available approaches based on thresholds
                available_approaches: Dict[ApproachType, bool] = {
                    ApproachType.LLM_ZERO_SHOT: True,
                    ApproachType.LLM_FEW_SHOT: min_labeled_sentences
                    >= lac.sentence_annotation.few_shot_threshold,
                    ApproachType.MODEL_TRAINING: min_labeled_sentences
                    >= lac.sentence_annotation.model_training_threshold,
                }

                # 4.4 determine the recommended approach based on thresholds
                if min_labeled_sentences < lac.sentence_annotation.few_shot_threshold:
                    recommended_approach = ApproachType.LLM_ZERO_SHOT
                elif (
                    min_labeled_sentences
                    < lac.sentence_annotation.model_training_threshold
                ):
                    recommended_approach = ApproachType.LLM_FEW_SHOT
                else:
                    recommended_approach = ApproachType.MODEL_TRAINING

                return ApproachRecommendation(
                    recommended_approach=recommended_approach,
                    available_approaches=available_approaches,
                    reasoning=reasoning,
                )
            case _:
                raise UnsupportedLLMJobTypeError(llm_job_params.llm_job_type)

    def create_training_parameters(
        self, llm_job_params: LLMJobParameters
    ) -> TrainingParameters:
        return TrainingParameters(
            max_epochs=20,
            batch_size=16,
            learning_rate=0.0001,
        )

    def create_prompt_templates(
        self, llm_job_params: LLMJobParameters, approach_type: ApproachType
    ) -> List[LLMPromptTemplates]:
        with self.sqls.db_session() as db:
            # get the llm method based on the jobtype
            llm_prompt_builder = self.llm_prompt_builder_for_job_type.get(
                llm_job_params.llm_job_type, None
            )
            if llm_prompt_builder is None:
                raise UnsupportedLLMJobTypeError(llm_job_params.llm_job_type)

            # execute the the prompt builder with the provided specific parameters
            prompt_builder = llm_prompt_builder(
                db=db,
                project_id=llm_job_params.project_id,
                is_fewshot=approach_type == ApproachType.LLM_FEW_SHOT,
            )
            return prompt_builder.build_prompt_templates(
                **llm_job_params.specific_task_parameters.model_dump(
                    exclude={"llm_job_type"}
                )
            )

    def construct_prompt_dict(
        self, prompts: List[LLMPromptTemplates], prompt_builder: PromptBuilder
    ) -> Dict[str, Dict[str, str]]:
        prompt_dict = {}
        for prompt in prompts:
            # validate prompts
            if not prompt_builder.is_system_prompt_valid(
                system_prompt=prompt.system_prompt
            ):
                raise ValueError("system prompt is not valid!")
            if not prompt_builder.is_user_prompt_valid(user_prompt=prompt.user_prompt):
                raise ValueError("User prompt is not valid!")

            prompt_dict[prompt.language] = {
                "system_prompt": prompt.system_prompt,
                "user_prompt": prompt.user_prompt,
            }
        return prompt_dict

    def _llm_document_tagging(
        self,
        *,
        db: Session,
        llm_job_id: str,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: DocumentTaggingParams,
    ) -> LLMJobResult:
        assert isinstance(task_parameters, DocumentTaggingParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Document Tagging, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = TaggingPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
        )

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=approach_parameters.prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=task_parameters.sdoc_ids)

        # automatic document tagging
        result: List[DocumentTaggingResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(
            zip(task_parameters.sdoc_ids, sdoc_datas)
        ):
            try:
                # update job status
                msg = f"Processing SDOC id={sdoc_id}"
                self._next_llm_job_step(
                    llm_job_id=llm_job_id,
                    description=msg,
                )
                logger.info(msg)

                if sdoc_data is None:
                    raise ValueError(
                        f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                    )

                # get current tag ids
                current_tag_ids = [
                    tag.id
                    for tag in crud_sdoc.read(db=db, id=sdoc_data.id).document_tags
                ]

                # get language
                language = crud_sdoc_meta.read_by_sdoc_and_key(
                    db=db, sdoc_id=sdoc_data.id, key="language"
                ).str_value

                if (
                    language is None
                    or language not in prompt_builder.supported_languages
                ):
                    raise ValueError("Language not supported")

                # construct prompts
                system_prompt = prompt_builder.build_system_prompt(
                    system_prompt_template=prompt_dict[language]["system_prompt"]
                )
                user_prompt = prompt_builder.build_user_prompt(
                    user_prompt_template=prompt_dict[language]["user_prompt"],
                    document=sdoc_data.content,
                )

                # prompt the model
                response = self.ollamas.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=OllamaDocumentTaggingResult,
                )
                logger.info(
                    f"Got chat response! Tags={response.categories}, Reason={response.reasoning}"
                )

                # parse result
                parsed_result = prompt_builder.parse_result(result=response)

                result.append(
                    DocumentTaggingResult(
                        status=BackgroundJobStatus.FINISHED,
                        status_message="Document tagging successful",
                        sdoc_id=sdoc_data.id,
                        suggested_tag_ids=parsed_result.tag_ids,
                        current_tag_ids=current_tag_ids,
                        reasoning=parsed_result.reasoning,
                    )
                )

            except Exception as e:
                result.append(
                    DocumentTaggingResult(
                        status=BackgroundJobStatus.ERROR,
                        status_message=str(e),
                        sdoc_id=sdoc_id,
                        suggested_tag_ids=[],
                        current_tag_ids=[],
                        reasoning="An error occurred!",
                    )
                )

        return LLMJobResult(
            llm_job_type=TaskType.DOCUMENT_TAGGING,
            specific_task_result=DocumentTaggingLLMJobResult(
                llm_job_type=TaskType.DOCUMENT_TAGGING, results=result
            ),
        )

    def _llm_metadata_extraction(
        self,
        *,
        db: Session,
        llm_job_id: str,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: MetadataExtractionParams,
    ) -> LLMJobResult:
        assert isinstance(task_parameters, MetadataExtractionParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Metadata Extraction, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = MetadataPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
        )

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=approach_parameters.prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=task_parameters.sdoc_ids)

        # automatic metadata extraction
        result: List[MetadataExtractionResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(
            zip(task_parameters.sdoc_ids, sdoc_datas)
        ):
            try:
                # update job status
                msg = f"Processing SDOC id={sdoc_id}"
                self._next_llm_job_step(
                    llm_job_id=llm_job_id,
                    description=msg,
                )
                logger.info(msg)

                if sdoc_data is None:
                    raise ValueError(
                        f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                    )

                # get current metadata values
                current_metadata = [
                    SourceDocumentMetadataReadResolved.model_validate(metadata)
                    for metadata in crud_sdoc.read(db=db, id=sdoc_data.id).metadata_
                    if metadata.project_metadata_id
                    in task_parameters.project_metadata_ids
                ]
                current_metadata_dict = {
                    metadata.project_metadata.id: metadata
                    for metadata in current_metadata
                }

                # get language
                language = crud_sdoc_meta.read_by_sdoc_and_key(
                    db=db, sdoc_id=sdoc_data.id, key="language"
                ).str_value

                if (
                    language is None
                    or language not in prompt_builder.supported_languages
                ):
                    raise ValueError("Language not supported")

                # construct prompts
                system_prompt = prompt_builder.build_system_prompt(
                    system_prompt_template=prompt_dict[language]["system_prompt"]
                )
                user_prompt = prompt_builder.build_user_prompt(
                    user_prompt_template=prompt_dict[language]["user_prompt"],
                    document=sdoc_data.content,
                )

                # prompt the model
                response = self.ollamas.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=OllamaMetadataExtractionResults,
                )
                logger.info(f"Got chat response! Response={response.data}")

                # transform the response
                parsed_response = prompt_builder.parse_result(result=response)

                # create correct suggested metadata (map the parsed response to the current metadata)
                suggested_metadata = []
                for project_metadata_id in task_parameters.project_metadata_ids:
                    current = current_metadata_dict.get(project_metadata_id)
                    suggestion = parsed_response.get(project_metadata_id)
                    if current is None or suggestion is None:
                        continue

                    suggested_metadata.append(
                        SourceDocumentMetadataReadResolved.with_value(
                            sdoc_metadata_id=current.id,
                            source_document_id=current.source_document_id,
                            project_metadata=current.project_metadata,
                            value=suggestion,
                        )
                    )
                logger.info(
                    f"Parsed the response! suggested metadata={suggested_metadata}"
                )

                result.append(
                    MetadataExtractionResult(
                        status=BackgroundJobStatus.FINISHED,
                        status_message="Metadata extraction successful",
                        sdoc_id=sdoc_data.id,
                        current_metadata=current_metadata,
                        suggested_metadata=suggested_metadata,
                    )
                )

            except Exception as e:
                result.append(
                    MetadataExtractionResult(
                        status=BackgroundJobStatus.ERROR,
                        status_message=str(e),
                        sdoc_id=sdoc_id,
                        current_metadata=[],
                        suggested_metadata=[],
                    )
                )

        return LLMJobResult(
            llm_job_type=TaskType.METADATA_EXTRACTION,
            specific_task_result=MetadataExtractionLLMJobResult(
                llm_job_type=TaskType.METADATA_EXTRACTION, results=result
            ),
        )

    def _llm_annotation(
        self,
        *,
        db: Session,
        llm_job_id: str,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: AnnotationParams,
    ) -> LLMJobResult:
        assert isinstance(task_parameters, AnnotationParams), "Wrong task parameters!"
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Annotation, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = AnnotationPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
        )
        project_codes = prompt_builder.codeids2code_dict

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=approach_parameters.prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=task_parameters.sdoc_ids)

        # automatic annotation
        annotation_id = 0
        result: List[AnnotationResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(
            zip(task_parameters.sdoc_ids, sdoc_datas)
        ):
            try:
                # update job status
                msg = f"Processing SDOC id={sdoc_id}"
                self._next_llm_job_step(
                    llm_job_id=llm_job_id,
                    description=msg,
                )
                logger.info(msg)

                if sdoc_data is None:
                    raise ValueError(
                        f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                    )

                # get language
                language = crud_sdoc_meta.read_by_sdoc_and_key(
                    db=db, sdoc_id=sdoc_data.id, key="language"
                ).str_value

                if (
                    language is None
                    or language not in prompt_builder.supported_languages
                ):
                    raise ValueError("Language not supported")

                # construct prompts
                system_prompt = prompt_builder.build_system_prompt(
                    system_prompt_template=prompt_dict[language]["system_prompt"]
                )
                user_prompt = prompt_builder.build_user_prompt(
                    user_prompt_template=prompt_dict[language]["user_prompt"],
                    document=sdoc_data.content,
                )

                # prompt the model
                response = self.ollamas.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=OllamaAnnotationResults,
                )
                logger.info(f"Got chat response! Response={response}")

                # parse the response
                parsed_response = prompt_builder.parse_result(result=response)

                # validate the response and create the suggested annotation
                suggested_annotations: List[SpanAnnotationRead] = []
                for x in parsed_response:
                    code_id = x.code_id
                    span_text = x.text

                    # check if the code_id is valid
                    if code_id not in project_codes:
                        continue

                    document_text = sdoc_data.content.lower()
                    annotation_text = span_text.lower()

                    # find start and end character of the annotation_text in the document_text
                    start = document_text.find(annotation_text)
                    end = start + len(annotation_text)
                    if start == -1:
                        continue

                    # find start and end token of the annotation_text in the document_tokens
                    # create a map of character offsets to token ids
                    document_token_map = {}  # character offset -> token id
                    last_character_offset = 0
                    for token_id, token_end in enumerate(sdoc_data.token_ends):
                        for i in range(last_character_offset, token_end):
                            document_token_map[i] = token_id
                        last_character_offset = token_end

                    begin_token = document_token_map.get(start, -1)
                    end_token = document_token_map.get(end, -1)
                    if begin_token == -1 or end_token == -1:
                        continue

                    # create the suggested annotation
                    suggested_annotations.append(
                        SpanAnnotationRead(
                            id=annotation_id,
                            sdoc_id=sdoc_data.id,
                            user_id=ASSISTANT_ZEROSHOT_ID,
                            begin=start,
                            end=end,
                            begin_token=begin_token,
                            end_token=end_token,
                            text=span_text,
                            code_id=code_id,
                            created=datetime.now(),
                            updated=datetime.now(),
                        )
                    )
                    annotation_id += 1
                logger.info(
                    f"Parsed the response! suggested annotations={suggested_annotations}"
                )

                result.append(
                    AnnotationResult(
                        status=BackgroundJobStatus.FINISHED,
                        status_message="Annotation successful",
                        sdoc_id=sdoc_data.id,
                        suggested_annotations=suggested_annotations,
                    )
                )

            except Exception as e:
                result.append(
                    AnnotationResult(
                        status=BackgroundJobStatus.ERROR,
                        status_message=str(e),
                        sdoc_id=sdoc_id,
                        suggested_annotations=[],
                    )
                )

        return LLMJobResult(
            llm_job_type=TaskType.ANNOTATION,
            specific_task_result=AnnotationLLMJobResult(
                llm_job_type=TaskType.ANNOTATION, results=result
            ),
        )

    def _llm_sentence_annotation(
        self,
        *,
        db: Session,
        llm_job_id: str,
        project_id: int,
        approach_parameters: Union[ZeroShotParams, FewShotParams],
        task_parameters: SentenceAnnotationParams,
    ) -> LLMJobResult:
        assert isinstance(task_parameters, SentenceAnnotationParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ZeroShotParams) or isinstance(
            approach_parameters, FewShotParams
        ), "Wrong approach parameters!"
        is_fewshot = isinstance(approach_parameters, FewShotParams)

        msg = f"Started LLMJob - Sentence Annotation (OLLAMA), num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = SentenceAnnotationPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
        )
        project_codes = prompt_builder.codeids2code_dict

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=approach_parameters.prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=task_parameters.sdoc_ids)

        # Delete all existing sentence annotations for the sdocs
        previous_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
            db=db,
            user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
            sdoc_ids=task_parameters.sdoc_ids,
            code_ids=task_parameters.code_ids,
        )

        msg = f"Deleting {len(previous_annotations)} previous sentence annotations."
        logger.info(msg)

        crud_sentence_anno.remove_bulk(
            db=db, ids=[sa.id for sa in previous_annotations]
        )

        # automatic annotation
        annotation_id = 0
        results: List[SentenceAnnotationResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(
            zip(task_parameters.sdoc_ids, sdoc_datas)
        ):
            try:
                # update job status
                msg = f"Processing SDOC id={sdoc_id}"
                self._next_llm_job_step(
                    llm_job_id=llm_job_id,
                    description=msg,
                )
                logger.info(msg)

                if sdoc_data is None:
                    raise ValueError(
                        f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                    )

                # get language
                language = crud_sdoc_meta.read_by_sdoc_and_key(
                    db=db, sdoc_id=sdoc_data.id, key="language"
                ).str_value

                if (
                    language is None
                    or language not in prompt_builder.supported_languages
                ):
                    raise ValueError("Language not supported")

                # construct prompts
                system_prompt = prompt_builder.build_system_prompt(
                    system_prompt_template=prompt_dict[language]["system_prompt"]
                )
                # we need to provide documents entence by sentence for sentence annotation
                document_sentences = "\n".join(
                    [
                        f"{idx + 1}: {sentence}"
                        for idx, sentence in enumerate(sdoc_data.sentences)
                    ]
                )
                num_sentences = len(sdoc_data.sentences)
                user_prompt = prompt_builder.build_user_prompt(
                    user_prompt_template=prompt_dict[language]["user_prompt"],
                    document=document_sentences,
                )

                # prompt the model
                response = self.ollamas.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=OllamaSentenceAnnotationResults,
                )
                logger.info(f"Got chat response! Response={response}")

                # parse the response
                parsed_response = prompt_builder.parse_result(result=response)

                # validate the response
                # code ids should be valid and sentence ids should be valid
                parsed_items = [
                    (
                        annotation.sent_id - 1,
                        annotation.code_id,
                    )  # LLM starts from 1, we start from 0
                    for annotation in parsed_response
                    if annotation.code_id in project_codes
                    and annotation.sent_id > 0
                    and annotation.sent_id <= num_sentences
                ]

                # create the suggested annotation
                suggested_annotations: List[SentenceAnnotationCreate] = []
                start = parsed_items[0][0]
                previous_sentence_id = parsed_items[0][0]
                previous_code_id = parsed_items[0][1]

                if len(parsed_items) > 1:
                    for sentence_id, code_id in parsed_items[1:]:
                        # create annotation if sentence ids mismatch
                        if previous_sentence_id != sentence_id - 1:
                            suggested_annotations.append(
                                SentenceAnnotationCreate(
                                    sdoc_id=sdoc_data.id,
                                    sentence_id_start=start,
                                    sentence_id_end=previous_sentence_id,
                                    code_id=previous_code_id,
                                )
                            )
                            annotation_id += 1
                            start = sentence_id

                        # create annotation if code ids mismatch
                        if previous_code_id != code_id:
                            suggested_annotations.append(
                                SentenceAnnotationCreate(
                                    sdoc_id=sdoc_data.id,
                                    sentence_id_start=start,
                                    sentence_id_end=previous_sentence_id,
                                    code_id=previous_code_id,
                                )
                            )
                            annotation_id += 1
                            start = sentence_id

                        previous_sentence_id = sentence_id
                        previous_code_id = code_id

                # create the last annotation
                suggested_annotations.append(
                    SentenceAnnotationCreate(
                        sdoc_id=sdoc_data.id,
                        sentence_id_start=start,
                        sentence_id_end=previous_sentence_id,
                        code_id=previous_code_id,
                    )
                )
                logger.info(
                    f"Parsed the response! suggested sentence annotations={suggested_annotations}"
                )

                # create the suggested annotations
                created_annos = crud_sentence_anno.create_bulk(
                    db=db,
                    user_id=ASSISTANT_FEWSHOT_ID
                    if is_fewshot
                    else ASSISTANT_ZEROSHOT_ID,
                    create_dtos=suggested_annotations,
                )

                results.append(
                    SentenceAnnotationResult(
                        status=BackgroundJobStatus.FINISHED,
                        status_message="Sentence annotation successful",
                        sdoc_id=sdoc_data.id,
                        suggested_annotations=[
                            SentenceAnnotationRead.model_validate(anno)
                            for anno in created_annos
                        ],
                    )
                )

            except Exception as e:
                results.append(
                    SentenceAnnotationResult(
                        status=BackgroundJobStatus.ERROR,
                        status_message=str(e),
                        sdoc_id=sdoc_id,
                        suggested_annotations=[],
                    )
                )

        return LLMJobResult(
            llm_job_type=TaskType.SENTENCE_ANNOTATION,
            specific_task_result=SentenceAnnotationLLMJobResult(
                llm_job_type=TaskType.SENTENCE_ANNOTATION, results=results
            ),
        )

    def _ray_sentence_annotation(
        self,
        *,
        db: Session,
        llm_job_id: str,
        project_id: int,
        approach_parameters: ModelTrainingParams,
        task_parameters: SentenceAnnotationParams,
    ) -> LLMJobResult:
        assert isinstance(task_parameters, SentenceAnnotationParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ModelTrainingParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Sentence Annotation (RAY), num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job(
            llm_job_id=llm_job_id,
            update=LLMJobUpdate(
                current_step_description=msg,
                num_steps_total=5 + 2,  # +1 for the start, end step
            ),
        )
        logger.info(msg)

        # Step: 1 - Building the training dataset
        msg = "Building training dataset."
        self._next_llm_job_step(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        # Find all relevant information for creating the training dataset
        with self.sqls.db_session() as db:
            # 1.1 - Find the labeled sentences for each code
            sentence_annotations = [
                sa
                for sa in crud_sentence_anno.read_by_codes(
                    db=db, code_ids=task_parameters.code_ids
                )
                if sa.user_id
                not in SYSTEM_USER_IDS  # Filter out annotations of the system users
            ]
            sdoc_id2sentence_annotations: Dict[int, List[SentenceAnnotationORM]] = {}
            for sa in sentence_annotations:
                if sa.sdoc_id not in sdoc_id2sentence_annotations:
                    sdoc_id2sentence_annotations[sa.sdoc_id] = []
                sdoc_id2sentence_annotations[sa.sdoc_id].append(sa)
            logger.debug(
                f"Found {len(sdoc_id2sentence_annotations)} sdocs with {len(sentence_annotations)} annotations."
            )

            # 1.2 - Find the corresponding sdocs
            training_sdocs = crud_sdoc.read_data_batch(
                db=db, ids=list(sdoc_id2sentence_annotations.keys())
            )
            # Santiy check: every sdoc has to have a corresponding sdoc data
            if len(training_sdocs) != len(sdoc_id2sentence_annotations):
                logger.error(
                    f"Number of sdoc data ({len(training_sdocs)}) and sdocs ({len(sdoc_id2sentence_annotations)}) do not match."
                )
            else:
                logger.debug(
                    f"Got data of {len(training_sdocs)} from {len(sdoc_id2sentence_annotations)} sdocs."
                )

            # 1.3 - Sanity check, number of embeddings should match the number of sentences
            for training_sdoc in training_sdocs:
                if training_sdoc is None:
                    continue

                # get embeddings
                sentence_embeddings = self.sss.get_sentence_embeddings_by_sdoc_id(
                    sdoc_id=training_sdoc.id
                ).tolist()

                if len(sentence_embeddings) != len(training_sdoc.sentences):
                    logger.error(
                        f"Number of embeddings ({len(sentence_embeddings)}) and sentences ({len(training_sdoc.sentences)}) do not match for sdoc {training_sdoc.id}."
                    )

            # 1.4 - Find the corresponding sentence embeddings
            search_tuples = [
                (sent_id, sdoc_data.id)
                for sdoc_data in training_sdocs
                if sdoc_data is not None
                for sent_id in range(len(sdoc_data.sentences))
            ]
            sentence_embeddings = self.sss.get_sentence_embeddings(
                search_tuples=search_tuples
            ).tolist()
            logger.debug(
                f"Found {len(sentence_embeddings)} corresponding sentence embeddings."
            )

            sdoc_id2sent_embs: Dict[int, List[List[float]]] = {}
            for sent_emb, (sent_id, sdoc_id) in zip(sentence_embeddings, search_tuples):
                if sdoc_id not in sdoc_id2sent_embs:
                    sdoc_id2sent_embs[sdoc_id] = []
                sdoc_id2sent_embs[sdoc_id].append(sent_emb)
            logger.debug(
                f"Mapped the embeddings to the documents. {[f'{sdoc_id}:{len(embeddings)}' for sdoc_id, embeddings in sdoc_id2sent_embs.items()]}"
            )

            # 1.5 - Find the code names
            codes = crud_code.read_by_ids(db=db, ids=task_parameters.code_ids)
            code_id2name = {code.id: code.name for code in codes}
            code_name2id = {code.name: code.id for code in codes}
            logger.debug(f"Found the {len(codes)} codes.")

        # 1.6 - Build the training data
        training_dataset: List[SeqSentTaggerDoc] = []
        for sdoc_id, annotations in sdoc_id2sentence_annotations.items():
            sentence_embeddings = sdoc_id2sent_embs.get(sdoc_id, [])

            if len(annotations) == 0 or len(sentence_embeddings) == 0:
                continue

            # build label set
            # with this code, only one label is allowed per sentence
            labels = ["O"] * len(sentence_embeddings)
            for annotation in annotations:
                for idx in range(
                    annotation.sentence_id_start, annotation.sentence_id_end + 1
                ):
                    labels[idx] = code_id2name[annotation.code_id]

            training_dataset.append(
                SeqSentTaggerDoc(
                    sent_embeddings=sentence_embeddings,
                    sent_labels=labels,
                )
            )

        msg = f"Built training dataset consisting of {len(training_dataset)} documents with a total of {len(sentence_annotations)} annotations."
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        # Step: 2 - Building the test dataset
        msg = "Building test dataset."
        self._next_llm_job_step(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        # Find all relevant information for creating the test dataset
        with self.sqls.db_session() as db:
            # 1. Find the sdocs
            test_sdocs = crud_sdoc.read_data_batch(db=db, ids=task_parameters.sdoc_ids)
            assert None not in test_sdocs, "Test sdocs contain None!"
            test_sdocs = [
                sdoc_data for sdoc_data in test_sdocs if sdoc_data is not None
            ]

            # 3. Find the corresponding sentence embeddings
            search_tuples = [
                (sent_id, sdoc_data.id)
                for sdoc_data in test_sdocs
                if sdoc_data is not None
                for sent_id in range(len(sdoc_data.sentences))
            ]
            test_sentence_embeddings = self.sss.get_sentence_embeddings(
                search_tuples=search_tuples
            ).tolist()
            test_sdoc_id2sent_embs: Dict[int, List[List[float]]] = {}
            for sent_emb, (sent_id, sdoc_id) in zip(
                test_sentence_embeddings, search_tuples
            ):
                if sdoc_id not in test_sdoc_id2sent_embs:
                    test_sdoc_id2sent_embs[sdoc_id] = []
                test_sdoc_id2sent_embs[sdoc_id].append(sent_emb)

        # Build the test data
        test_dataset: List[SeqSentTaggerDoc] = []
        for sdoc_data in test_sdocs:
            sentence_embeddings = test_sdoc_id2sent_embs.get(sdoc_data.id, [])

            if len(sentence_embeddings) == 0:
                continue

            test_dataset.append(
                SeqSentTaggerDoc(
                    sent_embeddings=sentence_embeddings,
                    sent_labels=["O"] * len(sentence_embeddings),
                )
            )
        msg = f"Built test dataset consisting of {len(test_dataset)} documents."
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        # Step: 3 - Model Training
        msg = "Started model training and application with Ray."
        self._next_llm_job_step(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        response = self.rms.seqsenttagger_train_apply(
            input=SeqSentTaggerJobInput(
                project_id=project_id,
                training_data=training_dataset,
                test_data=test_dataset,
            )
        )

        msg = "Finished model training and application with Ray."
        self._update_llm_job_description(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        # Step: 4 - Delete all existing sentence annotations for the test sdocs
        with self.sqls.db_session() as db:
            previous_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                db=db,
                user_id=ASSISTANT_TRAINED_ID,
                sdoc_ids=task_parameters.sdoc_ids,
                code_ids=task_parameters.code_ids,
            )

            msg = f"Deleting {len(previous_annotations)} previous sentence annotations."
            self._next_llm_job_step(
                llm_job_id=llm_job_id,
                description=msg,
            )
            logger.info(msg)

            crud_sentence_anno.remove_bulk(
                db=db, ids=[sa.id for sa in previous_annotations]
            )

        # Step: 5 - Apply the new predictions
        msg = "Applying suggested annotations."
        self._next_llm_job_step(
            llm_job_id=llm_job_id,
            description=msg,
        )
        logger.info(msg)

        if len(response.pred_data) != len(test_sdocs):
            raise ValueError("Prediction mismatch!")

        results: List[SentenceAnnotationResult] = []
        for prediction, sdoc_data in zip(response.pred_data, test_sdocs):
            try:
                # we have list of labels, we need to convert them to sentence annotations
                suggested_annotations: List[SentenceAnnotationCreate] = []
                start = 0
                previous_label = prediction.sent_labels[0]

                for idx, label in enumerate(prediction.sent_labels[1:], start=1):
                    if label != previous_label:
                        if previous_label != "O":
                            suggested_annotations.append(
                                SentenceAnnotationCreate(
                                    sdoc_id=sdoc_data.id,
                                    code_id=code_name2id[previous_label],
                                    sentence_id_start=start,
                                    sentence_id_end=idx - 1,
                                )
                            )
                        start = idx
                    previous_label = label

                # Add the last annotation
                if previous_label != "O":
                    suggested_annotations.append(
                        SentenceAnnotationCreate(
                            sdoc_id=sdoc_data.id,
                            sentence_id_start=start,
                            sentence_id_end=len(prediction.sent_labels) - 1,
                            code_id=code_name2id[previous_label],
                        )
                    )

                # create the suggested annotations
                created_annos = crud_sentence_anno.create_bulk(
                    db=db,
                    user_id=ASSISTANT_TRAINED_ID,
                    create_dtos=suggested_annotations,
                )

                results.append(
                    SentenceAnnotationResult(
                        status=BackgroundJobStatus.FINISHED,
                        status_message="Sentence annotation successful",
                        sdoc_id=sdoc_data.id,
                        suggested_annotations=[
                            SentenceAnnotationRead.model_validate(anno)
                            for anno in created_annos
                        ],
                    )
                )

                msg = f"Applied {len(suggested_annotations)} suggested annotations to document {sdoc_data.id}."
                self._update_llm_job_description(
                    llm_job_id=llm_job_id,
                    description=msg,
                )
                logger.info(msg)

            except Exception as e:
                results.append(
                    SentenceAnnotationResult(
                        status=BackgroundJobStatus.ERROR,
                        status_message=str(e),
                        sdoc_id=sdoc_data.id,
                        suggested_annotations=[],
                    )
                )

        return LLMJobResult(
            llm_job_type=TaskType.SENTENCE_ANNOTATION,
            specific_task_result=SentenceAnnotationLLMJobResult(
                llm_job_type=TaskType.SENTENCE_ANNOTATION, results=results
            ),
        )
