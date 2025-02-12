from datetime import datetime
from typing import List, NamedTuple, Tuple

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document_job import crud_sdoc_job
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.source_document_job import (
    SourceDocumentJobCreate,
    SourceDocumentJobUpdate,
)
from app.core.data.dto.span_annotation import SpanAnnotationCreateIntern
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_job import SourceDocumentJobORM
from app.core.db.sql_service import SQLService
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.quote import (
    QuoteInputDoc,
    QuoteJobInput,
    Span,
    Token,
)
from app.util.singleton_meta import SingletonMeta
from sqlalchemy import or_
from sqlalchemy.orm import InstrumentedAttribute, Session


class _CodeQuoteId(NamedTuple):
    quote: int
    direct: int
    indirect: int
    reported: int
    frin: int
    infr: int
    frame: int
    speaker: int
    addr: int
    cue: int


class QuoteService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()
        return super(QuoteService, cls).__new__(cls)

    def perform_quotation_detection(
        self, project_id: int, filter_column: InstrumentedAttribute
    ):
        with self.sqls.db_session() as db:
            codes = _CodeQuoteId(
                quote=self._get_code_id(db, "QUOTE", project_id),
                direct=self._get_code_id(db, "DIRECT", project_id),
                indirect=self._get_code_id(db, "INDIRECT", project_id),
                reported=self._get_code_id(db, "REPORTED", project_id),
                frin=self._get_code_id(db, "FREE_INDIRECT", project_id),
                infr=self._get_code_id(db, "INDIRECT_FREE_INDIRECT", project_id),
                frame=self._get_code_id(db, "FRAME", project_id),
                speaker=self._get_code_id(db, "SPEAKER", project_id),
                addr=self._get_code_id(db, "ADDRESSEE", project_id),
                cue=self._get_code_id(db, "CUE", project_id),
            )

        start_time = datetime.now()
        num_processed = -1
        while num_processed != 0:
            num_processed = self._process_batch(
                filter_column, start_time, project_id, codes
            )

    def _process_batch(
        self,
        filter_column: InstrumentedAttribute,
        start_time: datetime,
        project_id: int,
        code: _CodeQuoteId,
    ):
        with self.sqls.db_session() as db:
            query = (
                db.query(SourceDocumentDataORM)
                .join(
                    SourceDocumentJobORM,
                    SourceDocumentJobORM.id == SourceDocumentDataORM.id,
                    isouter=True,
                )
                # TODO remove OR, only filter for null
                .filter(or_(filter_column < start_time, filter_column == None))
                # .filter(filter_column == None)
                .limit(10)
            )
            sdoc_data = query.all()
        num_docs = len(sdoc_data)

        if num_docs == 0:
            return num_docs

        quote_input = QuoteJobInput(
            id=1,
            project_id=project_id,
            documents=[
                QuoteInputDoc(
                    id=sd.id,
                    text=sd.content,
                    tokens=[
                        Token(start=start, end=end, sent=sid, text=text)
                        for start, end, sid, text in zip(
                            sd.token_starts,
                            sd.token_ends,
                            sd.token_sentence_ids,
                            sd.tokens,
                        )
                    ],
                    sentences=[
                        Span(start=start, end=end + 1, text=text)
                        for start, end, text in zip(
                            sd.sentence_token_starts,
                            sd.sentence_token_ends,
                            sd.sentences,
                        )
                    ],
                )
                for sd in sdoc_data
            ],
        )

        sdoc_by_id = {sdoc.id: sdoc for sdoc in sdoc_data}

        quote_output = self.rms.quote_prediction(quote_input)

        with self.sqls.db_session() as db:
            dtos: List[SpanAnnotationCreateIntern] = []
            for doc in quote_output.documents:
                adoc = crud_adoc.exists_or_create(
                    db, user_id=SYSTEM_USER_ID, sdoc_id=doc.id
                )
                sdoc = sdoc_by_id[doc.id]
                for quote in doc.quotes:
                    qt = self._get_quote_type(quote.typ, code)
                    self._make_span_anno(qt, quote.quote, adoc.id, sdoc, dtos)
                    self._make_span_anno(code.frame, quote.frame, adoc.id, sdoc, dtos)
                    self._make_span_anno(
                        code.addr, quote.addressee, adoc.id, sdoc, dtos
                    )
                    self._make_span_anno(code.cue, quote.cue, adoc.id, sdoc, dtos)
                    self._make_span_anno(
                        code.speaker, quote.speaker, adoc.id, sdoc, dtos
                    )
            crud_span_anno.create_multi(db, create_dtos=dtos)
            crud_sdoc_job.create_multi(
                db,
                # ids=[doc.id for doc in quote_output.documents],
                create_dtos=[
                    SourceDocumentJobCreate(
                        id=doc.id, quotation_attribution_at=datetime.now()
                    )
                    for doc in quote_output.documents
                ],
            )
        return num_docs

    def _make_span_anno(
        self,
        code_id: int,
        spans: List[Tuple[int, int]],
        adoc_id: int,
        sdoc: SourceDocumentDataORM,
        dtos: List[SpanAnnotationCreateIntern],
    ):
        for start, end in spans:
            dto = SpanAnnotationCreateIntern(
                begin_token=start,
                end_token=end,
                begin=sdoc.token_starts[start],
                end=sdoc.token_ends[end],
                span_text=sdoc.content[start:end],
                code_id=code_id,
                annotation_document_id=adoc_id,
            )
            dtos.append(dto)

    def _get_quote_type(self, typ: str, code: _CodeQuoteId):
        match typ:
            case "Direct":
                return code.direct
            case "Indirect":
                return code.indirect
            case "Reported":
                return code.reported
            case "FreeIndirect":
                return code.frin
            case "IndirectFreeIndirect":
                return code.infr
        print(f"cannot find code for quote type {typ}, using fallback")
        return code.quote

    def _get_code_id(self, db: Session, name: str, project_id) -> int:
        db_code = crud_code.read_by_name_and_project(
            db,
            code_name=name,
            proj_id=project_id,
        )
        if db_code is None:
            raise ValueError(f"Code '{name}' not found for project {project_id}")
        return db_code.id
        return db_code.id
