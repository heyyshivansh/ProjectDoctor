import hashlib
import re
from typing import Dict, List, Optional, Tuple, Any

MAX_EXTRACTED_CHAR_LIMIT = 5_000_000


class TextNormalizer:
    """Deterministic text normalizer and metric calculator."""

    # Regex to strip non-printable ASCII control characters except \t, \n, \r
    CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
    
    # Regex for multiple horizontal spaces/tabs within a single line
    HORIZONTAL_WHITESPACE_REGEX = re.compile(r"[^\S\n\r]+")

    @classmethod
    def normalize_text(cls, raw_text: str) -> Tuple[str, bool]:
        """Normalize raw text deterministically.
        
        Returns:
            Tuple of (normalized_text, was_truncated)
        """
        if not raw_text:
            return "", False

        # 1. Line ending normalization (CRLF / CR -> LF)
        text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

        # 2. Control character removal (null bytes, bell, etc.)
        text = cls.CONTROL_CHAR_REGEX.sub("", text)

        # 3. Clean up excessive horizontal whitespace on individual lines
        lines = []
        for line in text.split("\n"):
            # Collapse multiple horizontal whitespace characters to a single space
            cleaned_line = cls.HORIZONTAL_WHITESPACE_REGEX.sub(" ", line).strip()
            lines.append(cleaned_line)

        # 4. Collapse more than 2 consecutive blank lines to 2
        collapsed_lines = []
        blank_counter = 0
        for line in lines:
            if not line:
                blank_counter += 1
                if blank_counter <= 2:
                    collapsed_lines.append(line)
            else:
                blank_counter = 0
                collapsed_lines.append(line)

        normalized = "\n".join(collapsed_lines).strip()

        # 5. Output limit ceiling (5,000,000 characters)
        was_truncated = False
        if len(normalized) > MAX_EXTRACTED_CHAR_LIMIT:
            normalized = normalized[:MAX_EXTRACTED_CHAR_LIMIT]
            was_truncated = True

        return normalized, was_truncated

    @classmethod
    def calculate_metrics(
        cls,
        text: str,
        page_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Compute deterministic text metrics and SHA-256 hash."""
        if not text:
            return {
                "word_count": 0,
                "character_count": 0,
                "line_count": 0,
                "page_count": page_count,
                "sha256_hash": hashlib.sha256(b"").hexdigest(),
            }

        words = text.split()
        lines = text.splitlines()
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

        return {
            "word_count": len(words),
            "character_count": len(text),
            "line_count": len(lines),
            "page_count": page_count,
            "sha256_hash": content_hash,
        }
