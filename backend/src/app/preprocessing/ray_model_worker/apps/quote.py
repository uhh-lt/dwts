import logging

from dto.quote import QuoteJobInput, QuoteJobOutput
from fastapi import FastAPI
from models.quote import QuoteModel
from ray import serve
from ray.serve.handle import DeploymentHandle

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, route_prefix="/quote")
@serve.ingress(api)
class QuoteApi:
    def __init__(self, quote_model_handle: DeploymentHandle) -> None:
        self.quotect = quote_model_handle

    @api.post("/predict", response_model=QuoteJobOutput)
    async def predict(self, input: QuoteJobInput) -> QuoteJobOutput:
        predict_result = await self.quotect.predict.remote(input)
        return predict_result


app = QuoteApi.bind(
    quote_model_handle=QuoteModel.bind(),
)
