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
        sections: List[DocumentSection] = []
        current_char_offset = 0

        for page_idx in range(pages_to_extract):
            try:
                page = reader.pages[page_idx]
                page_text = page.extract_text() or ""
            except Exception as e:
                page_text = f"[Error extracting text from page {page_idx + 1}: {str(e)}]"

            page_header = f"--- Page {page_idx + 1} ---\n"
            full_page_content = page_header + page_text + "\n\n"

            start_char = current_char_offset
            end_char = start_char + len(full_page_content)

            section_preview = page_text.strip()[:100] if page_text.strip() else f"Page {page_idx + 1}"
            sections.append(
                DocumentSection(
                    title=f"Page {page_idx + 1}",
                    level=1,
                    start_char=start_char,
                    end_char=end_char,
                    text_preview=section_preview,
                )
            )

            extracted_pages.append(full_page_content)
            current_char_offset = end_char

        raw_text = "".join(extracted_pages)

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
