import io
import os
import pypdf
import docx
import pytest
from app.services.documents.pdf_extractor import PdfExtractor
from app.services.documents.docx_extractor import DocxExtractor
from app.services.documents.text_extractor import TextExtractor
from app.services.documents.fallback_extractor import FallbackExtractor


def create_synthetic_pdf(tmp_path, filename="test.pdf", pages_content=None):
    """Helper to generate a valid PDF file in memory for testing."""
    if pages_content is None:
        pages_content = ["Page 1 content: Problem Statement and Overview.", "Page 2 content: Architecture and Tech Stack."]
    
    writer = pypdf.PdfWriter()
    for content in pages_content:
        writer.add_blank_page(width=200, height=200)
    
    file_path = tmp_path / filename
    with open(file_path, "wb") as f:
        writer.write(f)
    return file_path


def create_synthetic_docx(tmp_path, filename="test.docx"):
    """Helper to generate a valid DOCX file with headings and tables for testing."""
    doc = docx.Document()
    doc.add_heading("Project Overview", level=1)
    doc.add_paragraph("This is an AI project evaluation platform.")
    doc.add_heading("Technology Stack", level=2)
    doc.add_paragraph("FastAPI, React, PostgreSQL.")
    
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Component"
    table.cell(0, 1).text = "Tech"
    table.cell(1, 0).text = "Backend"
    table.cell(1, 1).text = "FastAPI"

    file_path = tmp_path / filename
    doc.save(str(file_path))
    return file_path


def test_pdf_extractor_success(tmp_path):
    pdf_path = create_synthetic_pdf(tmp_path)
    extractor = PdfExtractor()
    result = extractor.extract(str(pdf_path))

    assert result.status == "completed"
    assert result.extractor_name == "pypdf"
    assert result.page_count == 2
    assert len(result.sections) == 2
    assert result.sections[0].title == "Page 1"
    assert result.metadata["total_pages"] == 2


def test_pdf_extractor_corrupted_file(tmp_path):
    corrupted_pdf = tmp_path / "corrupted.pdf"
    corrupted_pdf.write_bytes(b"%PDF-1.4 this is not a valid pdf content")
    extractor = PdfExtractor()
    result = extractor.extract(str(corrupted_pdf))

    assert result.status == "failed"
    assert result.extractor_name == "pypdf"
    assert "corrupted" in result.error_message.lower() or "failed" in result.error_message.lower()


def test_docx_extractor_success(tmp_path):
    docx_path = create_synthetic_docx(tmp_path)
    extractor = DocxExtractor()
    result = extractor.extract(str(docx_path))

    assert result.status == "completed"
    assert result.extractor_name == "python-docx"
    assert "Project Overview" in result.raw_text
    assert "FastAPI, React, PostgreSQL" in result.raw_text
    assert "Component | Tech" in result.raw_text

    # Sections should include detected headings and table
    section_titles = [s.title for s in result.sections]
    assert any("Project Overview" in t for t in section_titles)
    assert any("Technology Stack" in t for t in section_titles)
    assert any("Table" in t for t in section_titles)


def test_docx_extractor_corrupted_file(tmp_path):
    corrupted_docx = tmp_path / "corrupted.docx"
    corrupted_docx.write_bytes(b"PK\x03\x04 fake zip but invalid docx xml")
    extractor = DocxExtractor()
    result = extractor.extract(str(corrupted_docx))

    assert result.status == "failed"
    assert result.extractor_name == "python-docx"
    assert result.error_message is not None


def test_markdown_extractor_success(tmp_path):
    md_file = tmp_path / "README.md"
    content = """# Project Doctor
## Problem Statement
Students lack rigorous project diagnosis.
## Architecture Overview
Modular backend with React frontend.
### Team
- Alice (Lead)
- Bob (Developer)
"""
    md_file.write_text(content, encoding="utf-8")
    extractor = TextExtractor()
    result = extractor.extract(str(md_file))

    assert result.status == "completed"
    assert result.extractor_name == "text_reader"
    assert result.metadata["format"] == "markdown"
    assert "Project Doctor" in result.raw_text

    section_titles = [s.title for s in result.sections]
    assert "Project Doctor" in section_titles
    assert "Problem Statement" in section_titles
    assert "Architecture Overview" in section_titles
    assert "Team" in section_titles


def test_text_extractor_utf8_and_latin1_fallback(tmp_path):
    txt_file = tmp_path / "notes.txt"
    # Write latin-1 bytes that are invalid in UTF-8
    latin1_bytes = b"Cafe resume - \xe9\xe8\xe0"
    txt_file.write_bytes(latin1_bytes)

    extractor = TextExtractor()
    result = extractor.extract(str(txt_file))

    assert result.status == "completed"
    assert result.extractor_name == "text_reader"
    assert result.metadata["encoding"] == "latin-1"
    assert "Cafe resume" in result.raw_text


def test_fallback_extractor_unsupported_types():
    png_extractor = FallbackExtractor(".png")
    png_result = png_extractor.extract("fake/path.png")

    assert png_result.status == "skipped_unsupported_type"
    assert png_result.raw_text == ""
    assert png_result.metadata["skipped"] is True
    assert "OCR and archive unpacking are intentionally not performed" in png_result.error_message

    zip_extractor = FallbackExtractor(".zip")
    zip_result = zip_extractor.extract("fake/path.zip")

    assert zip_result.status == "skipped_unsupported_type"
    assert zip_result.raw_text == ""
