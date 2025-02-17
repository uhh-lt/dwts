from pathlib import Path

from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def create_pptd_from_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    caption = ppid.metadata["caption"]
    if isinstance(caption, list):
        caption = " ".join(caption)
    assert isinstance(caption, str), (
        f"Caption has to be string, but was {type(caption)} instead"
    )
    # we don't need to set the filepath and filename as they are not used for the text
    # tasks  we apply on the caption.
    pptd = PreProTextDoc(
        filepath=Path("/this/is/a/fake_path.txt"),
        filename="fake_path.txt",
        project_id=ppid.project_id,
        text=caption,
        html=f"<html><body><p>{caption}</p></body></html>",
        metadata={"language": "en"},
        mime_type="text/plain",
    )

    cargo.data["pptd"] = pptd

    return cargo
