from typing import List

from bs4 import BeautifulSoup

from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

repo: RepoService = RepoService()


def extract_sdoc_links_from_html_of_mixed_documents(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    create_dtos: List[SourceDocumentLinkCreate] = []
    soup = BeautifulSoup(pptd.html, "html.parser")

    # extract and create text -> image links
    img_links = soup.findAll("img")
    img_srcs = set([img["src"].strip() for img in img_links if img.has_attr("src")])
    for img_src in img_srcs:
        create_dtos.append(
            SourceDocumentLinkCreate(
                parent_source_document_id=None,
                linked_source_document_filename=repo.truncate_filename(img_src),
            )
        )

    # extract and create text -> audio links
    audio_links = soup.findAll("audio")
    for audio in audio_links:
        sources = audio.findChildren("source")
        if len(sources) > 0:
            audio_links.append(sources[0])
    audio_srcs = set(
        [audio["src"].strip() for audio in audio_links if audio.has_attr("src")]
    )
    for audio_src in audio_srcs:
        create_dtos.append(
            SourceDocumentLinkCreate(
                parent_source_document_id=None,
                linked_source_document_filename=repo.truncate_filename(audio_src),
            )
        )

    # extract and create text -> video links
    video_links = soup.findAll("video")
    for video in video_links:
        sources = video.findChildren("source")
        if len(sources) > 0:
            video_links.append(sources[0])
    video_srcs = set(
        [video["src"].strip() for video in video_links if video.has_attr("src")]
    )
    for video_src in video_srcs:
        create_dtos.append(
            SourceDocumentLinkCreate(
                parent_source_document_id=None,
                linked_source_document_filename=repo.truncate_filename(video_src),
            )
        )
    pptd.sdoc_link_create_dtos = create_dtos

    return cargo
