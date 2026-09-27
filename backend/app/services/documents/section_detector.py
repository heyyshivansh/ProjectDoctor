import re
from typing import Dict, List, Optional, Tuple
from app.services.documents.base import DocumentSection

# Tier 4: Controlled standalone specification headings (case-insensitive)
CONTROLLED_SPEC_HEADINGS = {
    "target users",
    "target audience",
    "user personas",
    "stakeholders",
    "beneficiaries",
    "core features",
    "features",
    "functional requirements",
    "non-functional requirements",
    "system requirements",
    "problem statement",
    "proposed solution",
    "system architecture",
    "architecture overview",
    "technical architecture",
    "technologies",
    "tech stack",
    "technology stack",
    "dependencies",
    "external dependencies",
    "constraints",
    "scope",
    "objectives",
    "project objectives",
    "expected outcome",
    "team members",
    "user groups",
    "users",
}

# Words indicating full prose sentences — lines containing these are NOT standalone headings
PROSE_VERBS = {
    "can", "should", "allows", "allow", "may", "will", "is", "are", "were",
    "have", "has", "shall", "must", "include", "includes", "provides", "provide"
}

# Tier 5: Strict controlled vocabulary for key-colon lines (e.g., "Users: ...")
CONTROLLED_COLON_KEYS = {
    "users",
    "target users",
    "audience",
    "target audience",
    "beneficiaries",
    "domain",
    "stack",
    "suggested stack",
    "tech stack",
    "technologies",
    "dependencies",
    "architecture",
    "scope",
    "objectives",
    "features",
    "core features",
}


def _is_prose_sentence(text: str) -> bool:
    """Check if text appears to be a narrative sentence rather than a heading."""
    clean = text.strip()
    if not clean:
        return False
    # If it ends with sentence punctuation, it is prose
    if clean.endswith((".", "?", "!", ";")):
        return True
    # If it contains prose verbs followed by other words, treat as prose sentence
    words = [w.lower().strip(".,;:\"'") for w in clean.split()]
    for i, w in enumerate(words):
        if w in PROSE_VERBS and i < len(words) - 1:
            return True
    return False


class DetectedHeadingMatch:
    """Intermediate representation of a matched heading before section boundary slicing."""

    def __init__(
        self,
        title: str,
        start_char: int,
        content_start_char: int,
        level: int = 1,
        tier: int = 1,
    ):
        self.title = title
        self.start_char = start_char
        self.content_start_char = content_start_char
        self.level = level
        self.tier = tier


def detect_headings(
    text: str,
    page_offsets: Optional[List[Tuple[int, int, int]]] = None,
) -> List[DocumentSection]:
    """
    Deterministic heading detection enforcing a strict 5-tier confidence hierarchy:
    1. Markdown headings (# through ######)
    2. Numbered specification headings (e.g., "1. Problem Statement", "3. Target Users")
    3. Underlined headings (e.g., "Heading\\n---" or "Heading\\n===")
    4. Controlled standalone specification headings (isolated, non-prose)
    5. Controlled key-colon headings (e.g., "Users: ...") with inline value preservation

    Returns a list of DocumentSection instances with character boundaries, preview, and start_page.
    """
    if not text or not text.strip():
        return []

    matches: List[DetectedHeadingMatch] = []

    # -------------------------------------------------------------------------
    # Tier 1: Markdown headings (# through ######)
    # -------------------------------------------------------------------------
    for m in re.finditer(r"^(#{1,6})\s+(.+)$", text, re.MULTILINE):
        hashes, title = m.groups()
        clean_title = title.strip()
        if clean_title and not _is_prose_sentence(clean_title):
            matches.append(
                DetectedHeadingMatch(
                    title=clean_title[:150],
                    start_char=m.start(),
                    content_start_char=m.end(),
                    level=len(hashes),
                    tier=1,
                )
            )

    # -------------------------------------------------------------------------
    # Tier 2: Numbered headings (e.g., "1. Problem Statement", "3. Target Users")
    # -------------------------------------------------------------------------
    numbered_regex = re.compile(
        r"^[ \t]*(\d+(?:\.\d+)*[\.\)][ \t]+([A-Za-z][A-Za-z0-9 \t/&,-]{1,80}))[ \t]*$",
        re.MULTILINE,
    )
    for m in numbered_regex.finditer(text):
        full_heading, title_part = m.groups()
        clean_full = full_heading.strip()
        clean_title = title_part.strip()
        if not _is_prose_sentence(clean_title) and len(clean_title) <= 80:
            level = clean_full.count(".") if clean_full.count(".") > 0 else 1
            matches.append(
                DetectedHeadingMatch(
                    title=clean_full[:150],
                    start_char=m.start(),
                    content_start_char=m.end(),
                    level=min(level, 4),
                    tier=2,
                )
            )

    # -------------------------------------------------------------------------
    # Tier 3: Underlined headings (Title followed by --- or ===)
    # -------------------------------------------------------------------------
    underlined_regex = re.compile(
        r"^[ \t]*([A-Za-z0-9][A-Za-z0-9 \t/&,-]{1,80})[ \t]*\n[ \t]*([-=]{3,})[ \t]*$",
        re.MULTILINE,
    )
    for m in underlined_regex.finditer(text):
        title, underline = m.groups()
        clean_title = title.strip()
        if not _is_prose_sentence(clean_title) and len(clean_title) <= 80:
            level = 1 if underline.startswith("=") else 2
            matches.append(
                DetectedHeadingMatch(
                    title=clean_title[:150],
                    start_char=m.start(),
                    content_start_char=m.end(),
                    level=level,
                    tier=3,
                )
            )

    # -------------------------------------------------------------------------
    # Tier 4: Controlled standalone specification headings
    # -------------------------------------------------------------------------
    lines = text.splitlines(keepends=True)
    current_offset = 0
    for idx, line in enumerate(lines):
        line_stripped = line.strip()
        line_len = len(line)
        line_start = current_offset
        current_offset += line_len

        if not line_stripped or len(line_stripped) > 70 or len(line_stripped) < 3:
            continue

        clean_lower = line_stripped.lower().strip(" \t#:-")
        # Check against controlled vocabulary
        if clean_lower in CONTROLLED_SPEC_HEADINGS:
            # Must not be a prose sentence
            if _is_prose_sentence(line_stripped):
                continue

            # Must be isolated: previous line empty or start, next line empty or another heading/list
            prev_line_empty = (idx == 0) or (not lines[idx - 1].strip()) or lines[idx - 1].strip().startswith("---")
            next_line_exists = (idx == len(lines) - 1) or bool(lines[idx + 1].strip())

            if prev_line_empty or next_line_exists:
                matches.append(
                    DetectedHeadingMatch(
                        title=line_stripped[:150],
                        start_char=line_start,
                        content_start_char=line_start + line_len,
                        level=1,
                        tier=4,
                    )
                )

    # -------------------------------------------------------------------------
    # Tier 5: Controlled key-colon headings with inline value preservation
    # -------------------------------------------------------------------------
    colon_regex = re.compile(
        r"^[ \t]*([A-Za-z][A-Za-z \t]{1,30}):[ \t]+([^\r\n]+)$",
        re.MULTILINE,
    )
    for m in colon_regex.finditer(text):
        key, value = m.groups()
        clean_key = key.strip().lower()
        if clean_key in CONTROLLED_COLON_KEYS and value.strip():
            # For colon headings, the content starts at the value portion!
            value_start = m.start(2)
            matches.append(
                DetectedHeadingMatch(
                    title=key.strip()[:100],
                    start_char=m.start(),
                    content_start_char=value_start,
                    level=2,
                    tier=5,
                )
            )

    if not matches:
        return []

    # Sort matches by start_char ascending, then by tier ascending (lower tier number = higher confidence)
    matches.sort(key=lambda x: (x.start_char, x.tier))

    # Deduplicate overlapping matches (prefer higher confidence / earlier tier)
    deduped_matches: List[DetectedHeadingMatch] = []
    last_end = -1
    for match in matches:
        if match.start_char >= last_end:
            deduped_matches.append(match)
            last_end = match.content_start_char
        else:
            # Overlap: if current match is strictly higher confidence (lower tier), replace
            if deduped_matches and match.tier < deduped_matches[-1].tier:
                deduped_matches[-1] = match
                last_end = match.content_start_char

    # Slice document into sections from one heading to the next
    sections: List[DocumentSection] = []
    total_len = len(text)

    for i, m in enumerate(deduped_matches):
        next_start = deduped_matches[i + 1].start_char if i + 1 < len(deduped_matches) else total_len
        section_content = text[m.content_start_char:next_start].strip()
        preview = section_content[:100] if section_content else m.title

        # Determine start page if page_offsets provided
        start_page: Optional[int] = None
        if page_offsets:
            for p_num, p_start, p_end in page_offsets:
                if p_start <= m.start_char < p_end:
                    start_page = p_num
                    break

        sections.append(
            DocumentSection(
                title=m.title,
                level=m.level,
                start_char=m.start_char,
                end_char=next_start,
                text_preview=preview,
                page=start_page,
            )
        )

    return sections
