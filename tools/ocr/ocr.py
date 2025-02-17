"""Module for PDF table extraction tools.

This module defines tools for extracting tables from PDFs, converting them to HTML.
"""

from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import typer
from docling.backend.docling_parse_v2_backend import DoclingParseV2DocumentBackend
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    EasyOcrOptions,
    PdfPipelineOptions,
    TableFormerMode,
)
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc.document import TableItem
from gmft.auto import AutoFormatConfig, AutoTableFormatter
from gmft.detectors.common import CroppedTable
from gmft.detectors.tatr import TATRDetector
from gmft_pymupdf import PyMuPDFDocument
from img2table.document import PDF
from img2table.ocr import TesseractOCR
from unstructured.documents.elements import Table
from unstructured.partition.pdf import partition_pdf

app = typer.Typer()


class ToolBase(ABC):
    """Abstract base class for PDF table extraction tools.

    Defines the interface that all tools must implement.
    """

    @abstractmethod
    def extract_tables(self, pdf_file: str) -> Any:
        """Extract tables from a PDF file and return them in a raw, tool-specific format."""
        pass

    @abstractmethod
    def convert_to_html(self, tables: Any) -> Optional[str]:
        """Convert the extracted table data to HTML format."""
        pass


class UnstructuredTool(ToolBase):
    """Tool for extracting tables from PDFs using the Unstructured library."""

    def __init__(self) -> None:
        pass

    def extract_tables(self, pdf_file: str) -> list[Table]:
        """Uses Unstructured Tool to extract tables from a PDF file."""
        elements = partition_pdf(
            filename=pdf_file,
            infer_table_structure=True,
            strategy="hi_res",
            languages=["eng"],
            model_name="yolox",
        )
        tables: list[Table] = []
        for el in elements:
            if isinstance(el, Table):
                tables.append(el)
        return tables

    def convert_to_html(self, tables: Table) -> Optional[str]:
        """Convert extracted table data using Unstructured Tool to HTML format."""
        try:
            tables_html = tables.metadata.text_as_html
        except Exception as e:
            print(f"Error processing table: {e}")
            tables_html = None
        return tables_html


class GMFTTool(ToolBase):
    """Tool for extracting tables using the GMFT library."""

    def __init__(self) -> None:
        self.detector = TATRDetector()
        config = AutoFormatConfig()
        config.semantic_spanning_cells = True
        config.enable_multi_header = True
        self.formatter = AutoTableFormatter(config)

    def ingest_pdf(self, pdf_path: str) -> list[CroppedTable]:
        """Opens the PDF with PyMuPDFDocument, iterates over each page.

        Uses GMFT Tool and the TATRDetector to extract tables.
        """
        doc = PyMuPDFDocument(pdf_path)
        tables = []
        for page in doc:
            tables.extend(self.detector.extract(page))
        return tables

    def extract_tables(self, pdf_file: str) -> list[CroppedTable]:
        """Extract tables from a PDF file using GMFT."""
        return self.ingest_pdf(pdf_file)

    def convert_to_html(self, tables: list[CroppedTable]) -> Optional[str]:
        """Convert extracted table data using GMFT Tool to HTML format."""
        ft = self.formatter.extract(tables)
        try:
            tables_html = ft.df().fillna("").to_html()
        except Exception as e:
            print(f"Error processing table: {e}")
            tables_html = None
        return tables_html


class Img2TableTool(ToolBase):
    """Tool for extracting tables from PDFs using the Img2Table library."""

    def __init__(self) -> None:
        self.ocr = TesseractOCR(n_threads=1, lang="eng")

    def extract_tables(self, pdf_file: str) -> Any:
        """Uses Img2Table Tool to extract tables from a PDF file."""
        pdf = PDF(pdf_file, detect_rotation=False, pdf_text_extraction=True)
        extracted_tables = pdf.extract_tables(
            ocr=self.ocr, implicit_rows=True, borderless_tables=True, min_confidence=50
        )
        return extracted_tables[0]

    def convert_to_html(self, tables: Any) -> Optional[str]:
        """Convert extracted table data using Img2Table Tool to HTML format."""
        try:
            tables_html = tables.html_repr()
        except Exception as e:
            print(f"Error processing table: {e}")
            tables_html = None
        return tables_html


class DoclingTool(ToolBase):
    """Tool for extracting tables from PDFs using the Docling library."""

    def __init__(self) -> None:
        self.pipeline_options = PdfPipelineOptions(
            do_table_structure=True, ocr_options=EasyOcrOptions()
        )
        self.pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE

        self.doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=self.pipeline_options,
                    backend=DoclingParseV2DocumentBackend,
                )
            }
        )

    def extract_tables(self, pdf_file: str) -> list[TableItem]:
        """Uses Docling tool to extract tables from the given PDF file.

        Returns a list of table objects (Docling-specific).
        """
        result = self.doc_converter.convert(pdf_file)

        tables = result.document.tables

        return tables

    def convert_to_html(self, tables: Any) -> Any:
        """Convert the Docling table objects to HTML strings."""
        try:
            tables_html = tables.export_to_html()
        except Exception as e:
            print(f"Error processing tables: {e}")
            return []
        return tables_html


class OCRMethod(str, Enum):
    """Enum for specifying the OCR method to use for table extraction."""

    unstructured = "unstructured"
    gmft = "gmft"
    img2table = "img2table"
    docling = "docling"


def initialize_tool(tool: OCRMethod) -> ToolBase:
    """Initialize and return selected table extraction tools. Default is all tools."""

    match tool:
        case OCRMethod.unstructured:
            return UnstructuredTool()
        case OCRMethod.gmft:
            return GMFTTool()
        case OCRMethod.img2table:
            return Img2TableTool()
        case OCRMethod.docling:
            return DoclingTool()
        case _:
            raise ValueError(f"Invalid tool: {tool}")


@app.command()
def main(method: OCRMethod, input_dir: Path, output_dir: Path):
    tool = initialize_tool(method)

    # ensure input dir is a directory
    if not input_dir.is_dir():
        raise ValueError(f"{input_dir} is not a directory")

    # ensure output dir exists
    output_dir.mkdir(exist_ok=True)

    # iterate over all pdf files in input_dir
    for pdf_file in input_dir.glob("*.pdf"):
        tables = tool.extract_tables(str(pdf_file.absolute()))
        tables_html = tool.convert_to_html(tables)

        if tables_html is None:
            print(f"Error processing {pdf_file.stem}")
            continue

        # write html to file
        with open(output_dir / f"{pdf_file.stem}.html", "w") as f:
            f.write(tables_html)


if __name__ == "__main__":
    app()
