import logging

from deployments.dbert import DistilBertDeployment
from deployments.dbert import router as dbert_router
from deployments.spacy import SpacyDeployment
from deployments.spacy import router as spacy_router
from deployments.whisper import WhisperDeployment
from deployments.whisper import router as whisper_router
from dto.dbert import DbertInput, DbertOutput
from fastapi import FastAPI
from ray import serve
from ray.serve.deployment import Application

logger = logging.getLogger("ray.serve")

api = FastAPI()

api.include_router(whisper_router, prefix="/whisper")
api.include_router(spacy_router, prefix="/spacy")
api.include_router(dbert_router, prefix="/dbert")


@serve.deployment(
    num_replicas=1,
    route_prefix="/",
)
@serve.ingress(api)
class APIIngress:
    def __init__(self, **kwargs) -> None:
        logger.info(f"{kwargs=}")
        self.whisper: Application = kwargs["whisper_model_handle"]
        self.dbert: Application = kwargs["dbert_model_handle"]
        self.spacy: Application = kwargs["spacy_model_handle"]

    @api.get("/classify", response_model=DbertOutput)
    async def classify(self, dbert_input: DbertInput):
        predict_ref = await self.dbert.classify.remote(dbert_input.sentence)
        predict_result = await predict_ref
        return predict_result


Whisper: Application = WhisperDeployment.bind()
DBert: Application = DistilBertDeployment.bind()
Spacy: Application = SpacyDeployment.bind()

app = APIIngress.bind(
    whisper_model_handle=Whisper,
    dbert_model_handle=DBert,
    spacy_model_handle=Spacy,
)
