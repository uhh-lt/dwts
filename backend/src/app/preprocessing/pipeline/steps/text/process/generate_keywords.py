import yake
from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from config import conf


def generate_keywords(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    if "keywords" not in pptd.metadata:
        logger.info("keywords not in pptd metadata")
        out = pptd.spacy_pipeline_output
        if out is None:
            logger.error(
                f"spaCy PipelineOutput is None for {pptd.filename}! Please run the spaCy pipeline first!"
            )
            return cargo

        language = pptd.metadata.get("language", "noLang")
        logger.info(f"language: {language}")
        if isinstance(language, list):
            language = language[0]

        assert isinstance(language, str), (
            f"Language has to be string, but was {type(language)} instead."
        )
        kw_extractor = yake.KeywordExtractor(
            lan=language,
            n=conf.keyword_extraction.max_ngram_size,
            dedupLim=conf.keyword_extraction.deduplication_threshold,
            top=conf.keyword_extraction.keyword_proposals,
        )
        keyword_proposals = kw_extractor.extract_keywords(pptd.text)
        keyword_proposals = [kw for kw, _ in keyword_proposals]

        tok2pos = {tok.text: tok.pos for tok in out.tokens}

        keep = [
            "NOUN",
            "PROPN",
            #
            ["NOUN", "NOUN"],
            ["PROPN", "PROPN"],
            ["PROPN", "NOUN"],
            ["NOUN", "PROPN"],
            #
            ["ADJ", "NOUN"],
            ["ADJ", "PROPN"],
            #
            ["NOUN", "VERB"],
            ["PROPN", "VERB"],
            ["VERB", "NOUN"],
            ["VERB", "PROPN"],
        ]
        keywords = []
        for kp in keyword_proposals:
            try:
                ws = kp.split()
                if len(ws) == 1:
                    if tok2pos[ws[0]] in keep:
                        keywords.append(kp)
                elif len(ws) == 2:
                    if [tok2pos[w] for w in ws] in keep:
                        keywords.append(kp)
                    elif tok2pos[ws[0]] in keep and tok2pos[ws[1]] == "ADJ":
                        keywords.append(ws[0])
            except Exception as e:  # noqa
                # if any of the words is not in the pos dict, we skip the keyword
                pass

        pptd.metadata["keywords"] = keywords

    return cargo
