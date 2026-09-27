import pytest
from app.services.documents.base import DocumentSection
from app.services.documents.section_detector import detect_headings
from app.services.analysis.understanding_service import ProjectUnderstandingService


def test_numbered_heading_detection():
    text = """
1. Problem Statement
Legal teams often manage files across disconnected folders.

2. Proposed Solution
LegalVault is a searchable document workspace.

3. Target Users
Legal professionals
Students and legal researchers
Individuals maintaining personal records

4. Core Features
Document upload
Metadata management
Search and retrieval
"""
    sections = detect_headings(text)
    titles = [s.title for s in sections]

    assert "1. Problem Statement" in titles
    assert "2. Proposed Solution" in titles
    assert "3. Target Users" in titles
    assert "4. Core Features" in titles
    assert len(sections) == 4

    # Verify content slice for Target Users does not bleed into Core Features
    target_users_sec = next(s for s in sections if "Target Users" in s.title)
    assert "Legal professionals" in text[target_users_sec.start_char:target_users_sec.end_char]
    assert "Document upload" not in text[target_users_sec.start_char:target_users_sec.end_char]


def test_unnumbered_standalone_heading_detection():
    text = """
System Overview
An enterprise document management system.

Target Users
Lawyers
Legal assistants
Corporate compliance officers

Functional Requirements
Upload legal documents.
Assign security classification.
"""
    sections = detect_headings(text)
    titles = [s.title for s in sections]

    assert "Target Users" in titles
    assert "Functional Requirements" in titles


def test_underlined_heading_detection():
    text = """
Project metadata
----------------
Name: SampleProject
Version: 1.0.0

Core Features
=============
Feature Alpha
Feature Beta
"""
    sections = detect_headings(text)
    titles = [s.title for s in sections]

    assert "Project metadata" in titles
    assert "Core Features" in titles


def test_inline_colon_value_preservation():
    text = """
Users: Legal professionals, students/researchers, individuals
Suggested stack: React, FastAPI, PostgreSQL
"""
    sections = detect_headings(text)
    assert len(sections) >= 1

    users_sec = next(s for s in sections if s.title == "Users")
    content = text[users_sec.start_char:users_sec.end_char]
    assert "Legal professionals" in content
    assert "students/researchers" in content

    # Verify _extract_list_items parses the comma-separated inline items
    items = ProjectUnderstandingService._extract_list_items(content, heading_title="Users")
    assert "Legal professionals" in items
    assert "students/researchers" in items
    assert "individuals" in items


def test_cross_page_continuity_and_page_provenance():
    # Page 1 has heading near bottom; content continues on Page 2
    page1 = "--- Page 1 ---\nSome intro text.\n\n3. Target Users\nSenior attorneys\n"
    page2 = "--- Page 2 ---\nJunior paralegals\nResearch associates\n\n4. Core Features\nFull text search\n"
    full_text = page1 + page2

    page_offsets = [
        (1, 0, len(page1)),
        (2, len(page1), len(full_text)),
    ]

    sections = detect_headings(full_text, page_offsets=page_offsets)
    tu_sec = next(s for s in sections if "Target Users" in s.title)

    # Verify start_page is 1
    assert tu_sec.page == 1
    # Verify content spans across into page 2 up to the next heading
    content = full_text[tu_sec.start_char:tu_sec.end_char]
    assert "Senior attorneys" in content
    assert "Junior paralegals" in content
    assert "Full text search" not in content


def test_realistic_prose_false_positive_anti_fabrication():
    """Verify that narrative prose mentioning keywords does NOT create false-positive headings."""
    prose_text = """
The system allows users to upload documents. Users can search documents using keywords.
The application includes several features for metadata management.
These constraints may change during implementation.
We should ensure that beneficiaries receive notifications promptly.
Note: This project is still under development and may change.
Important: Always back up data before running migrations.
"""
    sections = detect_headings(prose_text)
    # None of these narrative prose sentences should become headings
    assert len(sections) == 0


def test_generic_extraction_semantics():
    """Verify that extraction operates on whatever text the source contains, without hardcoded values."""
    dynamic_text = """
3. Target Users
Doctors and clinicians
Pharmacists in rural health centers

4. Core Features
Prescription routing
Dosage calculation engine
Drug interaction alerts
"""
    sections = detect_headings(dynamic_text)
    tu_sec = next(s for s in sections if "Target Users" in s.title)
    cf_sec = next(s for s in sections if "Core Features" in s.title)

    tu_items = ProjectUnderstandingService._extract_list_items(
        dynamic_text[tu_sec.start_char:tu_sec.end_char], heading_title="Target Users"
    )
    cf_items = ProjectUnderstandingService._extract_list_items(
        dynamic_text[cf_sec.start_char:cf_sec.end_char], heading_title="Core Features"
    )

    assert tu_items == ["Doctors and clinicians", "Pharmacists in rural health centers"]
    assert cf_items == [
        "Prescription routing",
        "Dosage calculation engine",
        "Drug interaction alerts",
    ]


def test_extract_list_items_strips_heading_and_deduplicates():
    section_text = """3. Target Users
- Legal professionals
- Legal professionals
- Students or researchers
"""
    items = ProjectUnderstandingService._extract_list_items(section_text, heading_title="3. Target Users")
    assert "3. Target Users" not in items
    assert "Target Users" not in items
    assert len(items) == 2
    assert items == ["Legal professionals", "Students or researchers"]


def test_pdf_extractor_hybrid_fallback_preserves_unstructured_pages(tmp_path):
    """Verify that unstructured pages retain Page X fallback sections."""
    import pypdf
    from app.services.documents.pdf_extractor import PdfExtractor

    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.add_blank_page(width=200, height=200)
    pdf_path = tmp_path / "blank_two_page.pdf"
    with open(pdf_path, "wb") as f:
        writer.write(f)

    extractor = PdfExtractor()
    result = extractor.extract(str(pdf_path))
    assert result.status == "completed"
    assert len(result.sections) == 2
    assert result.sections[0].title == "Page 1"
    assert result.sections[0].page == 1
    assert result.sections[1].title == "Page 2"
    assert result.sections[1].page == 2
