from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class DocumentSection:
    """A detected outline heading and section within an extracted document."""
    title: str
    level: int = 1
    start_char: int = 0
    end_char: int = 0
    text_preview: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "level": self.level,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "text_preview": self.text_preview,
        }


@dataclass
class ExtractionResult:
    """The result of extracting text from a single artifact file."""
    status: str  # "completed", "failed", "skipped_unsupported_type"
    extractor_name: str
    raw_text: str = ""
    page_count: Optional[int] = None
    sections: List[DocumentSection] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None


class BaseDocumentExtractor(ABC):
    """Abstract interface for all document text extractors."""

    @abstractmethod
    def extract(self, file_path: str) -> ExtractionResult:
        """Extract text and structural sections from the physical document file."""
        pass
