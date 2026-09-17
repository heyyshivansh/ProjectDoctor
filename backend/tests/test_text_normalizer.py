import hashlib
import pytest
from app.services.documents.normalizer import TextNormalizer, MAX_EXTRACTED_CHAR_LIMIT


def test_normalizer_crlf_to_lf():
    raw = "Line 1\r\nLine 2\r\nLine 3\r"
    normalized, was_truncated = TextNormalizer.normalize_text(raw)

    assert "\r" not in normalized
    assert normalized == "Line 1\nLine 2\nLine 3"
    assert was_truncated is False


def test_normalizer_control_characters_removed():
    raw = "Hello\x00 World\x07!\x1b[31mRed\x1b[0m"
    normalized, _ = TextNormalizer.normalize_text(raw)

    assert "\x00" not in normalized
    assert "\x07" not in normalized
    assert "Hello World" in normalized


def test_normalizer_whitespace_handling():
    raw = "   Heading   Title    \n\n\n\n\n   Paragraph text with    extra    spaces.   "
    normalized, _ = TextNormalizer.normalize_text(raw)

    assert "Heading Title" in normalized
    assert "Paragraph text with extra spaces." in normalized
    # Max consecutive blank lines should be 2
    assert "\n\n\n\n" not in normalized


def test_normalizer_metrics():
    text = "Word one two three four five.\nSecond line with words."
    metrics = TextNormalizer.calculate_metrics(text, page_count=3)

    assert metrics["word_count"] == 10
    assert metrics["character_count"] == len(text)
    assert metrics["line_count"] == 2
    assert metrics["page_count"] == 3
    assert metrics["sha256_hash"] == hashlib.sha256(text.encode("utf-8")).hexdigest()


def test_normalizer_empty_text():
    normalized, was_truncated = TextNormalizer.normalize_text("")
    assert normalized == ""
    assert was_truncated is False

    metrics = TextNormalizer.calculate_metrics("")
    assert metrics["word_count"] == 0
    assert metrics["character_count"] == 0
    assert metrics["line_count"] == 0


def test_normalizer_character_limit():
    large_raw = "A" * (MAX_EXTRACTED_CHAR_LIMIT + 500)
    normalized, was_truncated = TextNormalizer.normalize_text(large_raw)

    assert len(normalized) == MAX_EXTRACTED_CHAR_LIMIT
    assert was_truncated is True
