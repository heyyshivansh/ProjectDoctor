import os
import pypdf
from typing import List
from app.services.documents.base import BaseDocumentExtractor, ExtractionResult, DocumentSection

MAX_PDF_PAGES = 500


class PdfExtractor(BaseDocumentExtractor):
    """Deterministic PDF text extractor using pypdf."""

    def extract(self, file_path: str) -> ExtractionResult:
        if not os.path.exists(file_path):
            return ExtractionResult(
                status="failed",
                extractor_name="pypdf",
                error_message=f"File not found: {file_path}",
            )

        try:
            reader = pypdf.PdfReader(file_path)
        except pypdf.errors.PdfReadError as e:
            return ExtractionResult(
                status="failed",
                extractor_name="pypdf",
                error_message=f"Failed to read PDF file (corrupted or malformed): {str(e)}",
            )
        except Exception as e:
            return ExtractionResult(
                status="failed",
                extractor_name="pypdf",
                error_message=f"Error opening PDF: {str(e)}",
            )

        if reader.is_encrypted:
            try:
                # Try decrypting with empty password
                decrypt_success = reader.decrypt("")
                if decrypt_success == pypdf.PasswordType.NOT_DECRYPTED:
                    return ExtractionResult(
                        status="failed",
                        extractor_name="pypdf",
                        error_message="PDF is encrypted with a password and cannot be read.",
                    )
            except Exception as e:
                return ExtractionResult(
                    status="failed",
                    extractor_name="pypdf",
                    error_message=f"Encrypted PDF could not be decrypted: {str(e)}",
                )

        total_pages = len(reader.pages)
        pages_to_extract = min(total_pages, MAX_PDF_PAGES)
        extracted_pages: List[str] = []
        page_offsets = []
        page_previews = {}
        current_char_offset = 0

        for page_idx in range(pages_to_extract):
            p_num = page_idx + 1
            try:
                page = reader.pages[page_idx]
                page_text = page.extract_text() or ""
            except Exception as e:
                page_text = f"[Error extracting text from page {p_num}: {str(e)}]"

            page_header = f"--- Page {p_num} ---\n"
            full_page_content = page_header + page_text + "\n\n"

            start_char = current_char_offset
            end_char = start_char + len(full_page_content)

            section_preview = page_text.strip()[:100] if page_text.strip() else f"Page {p_num}"
            page_offsets.append((p_num, start_char, end_char))
            page_previews[p_num] = (section_preview, start_char, end_char)

            extracted_pages.append(full_page_content)
            current_char_offset = end_char

        raw_text = "".join(extracted_pages)

        # Detect semantic headings across document with page awareness
        from app.services.documents.section_detector import detect_headings
        detected_sections = detect_headings(raw_text, page_offsets=page_offsets)

        # Hybrid policy: Semantic sections coexist with page-level fallback coverage
        # Pages lacking semantic headings retain their Page X fallback section
        pages_with_headings = {s.page for s in detected_sections if s.page is not None}
        final_sections: List[DocumentSection] = list(detected_sections)

        for p_num, p_start, p_end in page_offsets:
            if p_num not in pages_with_headings:
                preview, s_char, e_char = page_previews[p_num]
                final_sections.append(
                    DocumentSection(
                        title=f"Page {p_num}",
                        level=1,
                        start_char=s_char,
                        end_char=e_char,
                        text_preview=preview,
                        page=p_num,
                    )
                )

        final_sections.sort(key=lambda s: s.start_char)
        sections = final_sections

        # Document metadata
        pdf_metadata = {}
        try:
            if reader.metadata:
                for k, v in reader.metadata.items():
                    if isinstance(v, (str, int, float, bool)):
                        # Clean key name e.g. "/Title" -> "Title"
                        clean_key = k.lstrip("/")
                        pdf_metadata[clean_key] = str(v)
        except Exception:
            pass

        pdf_metadata["total_pages"] = total_pages
        pdf_metadata["pages_extracted"] = pages_to_extract
        if total_pages > MAX_PDF_PAGES:
            pdf_metadata["truncated_page_limit"] = True

        return ExtractionResult(
            status="completed",
            extractor_name="pypdf",
            raw_text=raw_text,
            page_count=total_pages,
            sections=sections,
            metadata=pdf_metadata,
        )
