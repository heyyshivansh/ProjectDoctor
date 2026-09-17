from app.services.documents.base import BaseDocumentExtractor, ExtractionResult


class FallbackExtractor(BaseDocumentExtractor):
    """Extractor for non-text artifacts (images, archives).
    
    Marks artifacts as skipped_unsupported_type cleanly without raising errors.
    """

    def __init__(self, file_extension: str):
        self.file_extension = file_extension.lower()

    def extract(self, file_path: str) -> ExtractionResult:
        message = (
            f"File type '{self.file_extension}' does not support text extraction. "
            "OCR and archive unpacking are intentionally not performed in this checkpoint."
        )
        return ExtractionResult(
            status="skipped_unsupported_type",
            extractor_name="fallback",
            raw_text="",
            page_count=None,
            sections=[],
            metadata={"file_extension": self.file_extension, "skipped": True},
            error_message=message,
        )
