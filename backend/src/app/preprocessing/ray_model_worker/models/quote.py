import logging
from typing import Dict, List

import spacy
from dto.quote import (
    QuoteInputDoc,
    QuoteJobInput,
    QuoteJobOutput,
    QuoteOutputDoc,
    QuoteTuple,
)
from quotect import Quotect, QuotectArguments, QuoteInput
from ray import serve
from ray_config import build_ray_model_deployment_config, conf

args = QuotectArguments(
    model_name_or_path="fynnos/quotect-mt5-base",
    output_dir="/tmp",
    predict_with_generate=True,
    generation_max_length=4096,
    generation_num_beams=1,
)


logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("quote"))
class QuoteModel:
    def __init__(self):
        self.model = Quotect(args)

    def predict(self, input: QuoteJobInput) -> QuoteJobOutput:
        results = []
        for doc in input.documents:
            qi = QuoteInput(
                name=str(doc.id),
                tokens=doc.tokens,  # type: ignore
                sentences=doc.sentences,  # type: ignore
                text=None,
            )
            json = self.model.predict(qi)
            quotes = []
            for anno in json["annotations"]:
                quote = [
                    (span["begin"], span["end"]) for span in anno["quote"]["spans"]
                ]
                frame = [
                    (span["begin"], span["end"]) for span in anno["frame"]["spans"]
                ]
                cue = [(span["begin"], span["end"]) for span in anno["cue"]["spans"]]
                addr = [(span["begin"], span["end"]) for span in anno["addr"]["spans"]]
                speaker = [
                    (span["begin"], span["end"]) for span in anno["speaker"]["spans"]
                ]
                tp = anno["type"]
                qt = QuoteTuple(
                    speaker=speaker,
                    frame=frame,
                    cue=cue,
                    addressee=addr,
                    quote=quote,
                    typ=tp,
                )
                quotes.append(qt)
            od = QuoteOutputDoc(id=doc.id, quotes=quotes)
            results.append(od)
        return QuoteJobOutput(
            id=input.id, project_id=input.project_id, documents=results
        )
