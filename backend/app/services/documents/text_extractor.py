import os
import re
from typing import List
from app.services.documents.base import BaseDocumentExtractor, ExtractionResult, DocumentSection


class TextExtractor(BaseDocumentExtractor):
    """Deterministic plain text and Markdown extractor."""

    HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

    def extract(self, file_path: str) -> ExtractionResult:
        if not os.path.exists(file_path):
            return ExtractionResult(
                status="failed",
                extractor_name="text_reader",
                error_message=f"File not found: {file_path}",
            )

        raw_bytes = None
        try:
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
        except Exception as e:
            return ExtractionResult(
                status="failed",
                extractor_name="text_reader",
                error_message=f"Could not read file: {str(e)}",
            )

        # Attempt UTF-8 decoding first, then fallback to latin-1
        encoding_used = "utf-8"
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = raw_bytes.decode("latin-1")
                encoding_used = "latin-1"
            except Exception as e:
                return ExtractionResult(
                    status="failed",
                    extractor_name="text_reader",
                    error_message=f"Encoding error reading text file: {str(e)}",
                )

        sections: List[DocumentSection] = []
        is_markdown = file_path.lower().endswith(".md")

        if is_markdown:
            for match in self.HEADING_REGEX.finditer(text):
                hashes, title = match.groups()
                level = len(hashes)
                start_char = match.start()
                end_char = match.end()
                sections.append(
                    DocumentSection(
                        title=title.strip()[:150],
                        level=level,
                        start_char=start_char,
                        end_char=end_char,
                        text_preview=title.strip()[:100],
                    )
                )

        metadata = {
            "encoding": encoding_used,
            "format": "markdown" if is_markdown else "plain_text",
            "byte_size": len(raw_bytes),
        }

        return ExtractionResult(
            status="completed",
            extractor_name="text_reader",
            raw_text=text,
            page_count=None,
            sections=sections,
            metadata=metadata,
        )
