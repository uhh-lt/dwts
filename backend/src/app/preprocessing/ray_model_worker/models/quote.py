import logging

from dto.quote import QuoteJobInput, QuoteJobOutput, QuoteOutputDoc, QuoteTuple
from quotect import Quotect, QuoteInput
from ray import serve
from ray_config import build_ray_model_deployment_config, conf

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("quote"))
class QuoteModel:
    def __init__(self):
        self.model = Quotect(
            model_name_or_path=conf.quote.model,
            generation_max_length=conf.quote.max_length,
            generation_num_beams=conf.quote.num_beams,
        )

    def predict(self, input: QuoteJobInput) -> QuoteJobOutput:
        input_docs = [
            QuoteInput(
                name=doc.id,
                tokens=doc.tokens,  # type: ignore
                sentences=doc.sentences,  # type: ignore
                text=doc.text,
            )
            for doc in input.documents
        ]
        jsons = self.model.predict(input_docs)
        results = []
        for doc, js in zip(input.documents, jsons):
            quotes = []
            for anno in js["annotations"]:
                quote = [
                    (span["begin"], span["end"]) for span in anno["quote"]["spans"]
                ]
                frame = (
                    [(span["begin"], span["end"]) for span in anno["frame"]["spans"]]
                    if "frame" in anno
                    else []
                )
                cue = (
                    [(span["begin"], span["end"]) for span in anno["cue"]["spans"]]
                    if "cue" in anno
                    else []
                )
                addr = (
                    [(span["begin"], span["end"]) for span in anno["addr"]["spans"]]
                    if "addr" in anno
                    else []
                )
                speaker = (
                    [(span["begin"], span["end"]) for span in anno["speaker"]["spans"]]
                    if "speaker" in anno
                    else []
                )
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
            od = QuoteOutputDoc(id=js["documentName"], quotes=quotes)
            results.append(od)
        return QuoteJobOutput(
            id=input.id, project_id=input.project_id, documents=results, info=jsons
        )
