# CHECKPOINT 3 IMPLEMENTATION PLAN (REVISED & HARDENED)
# Document Understanding: Text Extraction, Normalization & Deterministic Structured Project Representation

**Project:** Project Doctor  
**Stage:** Checkpoint 3 (Planning Only — Revised & Architecturally Hardened)  
**Date:** 2026-09-17  
**Author:** AI Software Engineering Agent  
**Status:** Revised Implementation Plan Awaiting Human Approval  

---

## 1. Checkpoint 3 Objective

The primary objective of Checkpoint 3 is to implement the **Document Understanding** subsystem for Project Doctor. 

In Checkpoint 2, the platform established project creation, relational persistence (PostgreSQL/SQLite via SQLAlchemy 2.0 and Alembic), artifact file ingestion (PDF, DOCX, MD, TXT, images, archives), and safe chunked local storage in `storage/uploads/{project_id}/`.

Checkpoint 3 operationalizes those ingested document artifacts. It transforms raw unstructured document files into:
1. **Deterministic Document Text Extraction**: Pure-Python, encoding-safe text and outline extraction page-by-page (PDF), paragraph/table-by-paragraph (DOCX), or section-by-section (Markdown/Text).
2. **Text Normalization & Outline Detection**: Whitespace stripping, line ending normalization (CRLF -> LF), control character cleanup, outline/heading extraction, and metric computation (words, characters, pages, SHA-256 hash).
3. **Clean Storage Separation (No Duplication)**:
   - **Disk (`storage/processed/{project_id}/`)**: Authoritative, isolated store for full raw extracted text.
   - **Database (`document_extractions` table)**: Structured metadata, extractor name/version, word/page metrics, content hash, outline sections JSON, and disk file reference.
4. **Deterministic Structured Project Understanding Representation**: A consolidated, evidence-backed representation across project metadata and extracted documents representing the project's core 11 dimensions as defined in `PROJECT_CONTEXT.md` Section 11 (`problem`, `target_users`, `objectives`, `requirements_summary`, `modules`, `tech_stack`, `architecture_overview`, `dependencies`, `expected_scale`, `deployment`, `team`).
5. **Strict "No Invention" Rule & Provenance Tracking**: Every understanding field is populated *only* when supported by explicit project metadata or extracted document text; missing fields remain strictly `null` or empty (`[]`). Every populated field maintains clear provenance links back to its source artifact or project metadata.
6. **Resource-Oriented REST APIs & Frontend UI**: Endpoints and React views enabling users to trigger document text extraction, inspect extraction statuses and outline previews, stream full extracted text, and view the structured project understanding.

---

## 2. Checkpoint 3 Scope

The scope for Checkpoint 3 is derived directly from `PROJECT_CONTEXT.md` (Sections 11, 28, 29, 34) and tightened per architectural review:

### 2.1 Backend Scope
1. **Deterministic Document Text Extractors**:
   - **PDF Extractor**: Pure-Python extraction (`pypdf`) extracting text page-by-page, preserving page numbers, measuring word/character counts, and capturing document metadata (title, author, page count).
   - **DOCX Extractor**: Pure-Python extraction (`python-docx`) extracting text from paragraphs and tables, preserving document structure and paragraph counts.
   - **Markdown & Plain Text Extractor**: UTF-8 and latin-1 fallback reader parsing markdown headings (`#`, `##`, `###`), list items, and text blocks.
   - **Explicit Handling for Unsupported Artifacts**: Identifies non-extractable types (`.png`, `.jpg`, `.jpeg`, `.zip`) and marks them as `skipped_unsupported_type` with clear user feedback rather than raising errors.
   - **Resilience to Corrupt / Encrypted Documents**: Catches malformed PDFs/DOCX, encrypted files, or unreadable streams; records extraction status as `failed` with descriptive error details without crashing the server.

2. **Text Normalization & Structural Extraction Engine**:
   - Line ending normalization (`\r\n` -> `\n`).
   - Control character stripping (retaining valid whitespace, tabs, and newlines).
   - Heading and outline detection (detecting headings in markdown, bold/heading styles in docx, or title patterns in PDF).
   - Deterministic metric computation: word count, character count, line count, page count, and content SHA-256 hash.

3. **Storage Separation & Processed File Storage**:
   - Save processed text files to the reserved storage directory: `storage/processed/{project_id}/{artifact_id}_extracted.txt`.
   - Enforce canonical path boundary checks matching Checkpoint 2 security standards (`validate_path_boundary`).
   - The disk file is the single authoritative source for raw full text.

4. **Database Models & Alembic Migration**:
   - **`document_extractions` Table**: Linked 1-to-1 with `artifacts` (`artifact_id` unique FK, `CASCADE` delete) and indexed by `project_id`. Stores extraction status (`pending`, `completed`, `failed`, `skipped_unsupported_type`), extractor version, processed text file path, word count, page count, structured sections JSON, content hash, and metadata.
   - **`project_understandings` Table**: Linked 1-to-1 with `projects` (`project_id` unique FK, `CASCADE` delete). Stores synthesized project understanding fields matching Section 11 of `PROJECT_CONTEXT.md` along with field-level provenance metadata.
   - **Reversible Alembic Migration**: Script implementing `upgrade()` and `downgrade()` for both PostgreSQL and SQLite.

5. **Deterministic Project Understanding Synthesizer**:
   - Aggregates declared project metadata with structured sections extracted across all project artifacts.
   - Maps extracted text into the 11 dimensions from `PROJECT_CONTEXT.md` Section 11 using explicit section/heading matching and declared metadata.
   - **Strict No Invention Rule**: Missing or unverified fields remain strictly `null` or `[]`.
   - **Provenance Tracking**: Each populated field records its source (e.g. `{"source_type": "project_metadata", "field": "tech_stack"}` or `{"source_type": "artifact", "artifact_id": "...", "section": "Architecture"}`).

6. **Resource-Oriented REST API Endpoints**:
   - `POST /api/projects/{project_id}/artifacts/{artifact_id}/extraction`: Trigger extraction for a single artifact.
   - `POST /api/projects/{project_id}/documents/extract`: Batch trigger extraction for all project artifacts.
   - `GET /api/projects/{project_id}/documents/extractions`: List extraction statuses and summaries for all artifacts in a project.
   - `GET /api/projects/{project_id}/artifacts/{artifact_id}/extraction`: Retrieve extraction status, metrics, and structured outline sections for an artifact.
   - `GET /api/projects/{project_id}/artifacts/{artifact_id}/extracted-text`: Stream full raw extracted text from disk as a text file.
   - `POST /api/projects/{project_id}/understanding`: Generate or re-generate the structured project understanding representation.
   - `GET /api/projects/{project_id}/understanding`: Retrieve the structured project understanding representation.

### 2.2 Frontend Scope
1. **Document Understanding Section in Project Detail Page**:
   - Add a tabbed interface or dedicated section on `ProjectDetailPage.tsx`:
     - Tab 1: **Overview & Artifacts** (Project metadata, artifact upload, artifact list with extraction status badges, "Extract" action button, "View Outline & Text" modal).
     - Tab 2: **Project Understanding** (Structured view of the 11 project understanding dimensions, provenance badges, "Generate Understanding" trigger, clear display of "Not specified" for unstated fields).
2. **Components**:
   - `DocumentExtractionBadge`: Visual indicator of extraction status (`Extracted`, `Pending`, `Skipped`, `Failed`).
   - `ExtractedTextViewerModal`: Modal dialog displaying document metrics, section outline navigator, and full text viewer with download/copy actions.
   - `ProjectUnderstandingCard`: Card-based responsive view rendering Problem, Target Users, Objectives, Requirements Summary, Modules, Tech Stack, Architecture, Dependencies, Scale, Deployment, and Team with provenance indicators.
3. **Frontend Services & Types**:
   - `frontend/src/types/document.ts`: Types for `DocumentExtraction`, `DocumentSection`, `ExtractionStatus`.
   - `frontend/src/types/understanding.ts`: Types for `ProjectUnderstanding`, `FieldProvenance`.
   - `frontend/src/services/documents.ts`: Resource-oriented API client functions.

---

## 3. Explicit Out-of-Scope Items

To strictly prevent scope creep, protect future checkpoint boundaries, and adhere to `AI_INSTRUCTIONS.md`:

| Out-of-Scope Item | Scheduled Checkpoint | Rationale & Protection |
| :--- | :--- | :--- |
| **Gemini / LLM API Integration** | Checkpoint 4+ | No API keys, remote LLM calls, prompt templates, or AI text generation. Checkpoint 3 relies entirely on deterministic extraction. |
| **LangGraph / Autonomous Agent Loops** | Checkpoint 4+ | No agent graphs or autonomous execution loops. Execution is linear, deterministic service calls. |
| **Optical Character Recognition (OCR)** | Post-MVP / Future | No Tesseract, EasyOCR, or vision model dependencies. Scanned PDFs/images are marked as `skipped_unsupported_type`. |
| **ZIP Decompression / Archive Unpacking** | Post-MVP / Future | No archive unpacking, tar/zip reading, or recursive file extraction. ZIP files are marked as `skipped_unsupported_type`. |
| **pgvector & Vector Embeddings** | Post-MVP / Checkpoint 4+ | No embedding models, vector dimensions, or vector similarity queries. |
| **Requirement Entity Extraction (R1..RN)** | Checkpoint 4 | **Protected Checkpoint 4 Boundary**: No requirement IDs, no atomic requirement entities, no requirement coverage metrics, no implementation status classification (`implemented`/`missing`), no traceability matrix. Checkpoint 3 only preserves raw requirement text in `requirements_summary`. |
| **Requirement-to-Code Mapping** | Checkpoint 4 | No mapping requirements to source files, endpoints, or commits. |
| **GitHub API & Repository Cloning** | Checkpoint 5 | No git cloning, commit history parsing, or GitHub REST API integration. |
| **Static Code & Security Analysis** | Checkpoint 6 | No Semgrep, Bandit, Trivy, or Ruff scans of project source code. |
| **Evaluation Scoring & Rubrics** | Checkpoint 7 | No rubric weights, numerical grades, or scoring formulas. |
| **Diagnosis / Improvement Planner** | Checkpoint 8 | No prioritized remediation task generation or risk diagnosis. |
| **Jury Simulation & Persona Q&A** | Checkpoint 9 | No jury questions or defense answer evaluations. |
| **User Authentication / Accounts** | Later Milestone | No JWT, OAuth, session cookies, or user permissions. |
| **Generic Non-Resource Endpoints** | Never | No endpoints such as `/ai/analyze`, `/agent/run`, `/brain`, or `/diagnose`. |

---

## 4. Existing Functionality Being Reused

The Checkpoint 3 implementation directly builds on the hardened Checkpoint 2 foundation:

1. **`app.core.security.validate_path_boundary`**:
   - Reused to ensure processed text cache files cannot escape `storage/processed/{project_id}`.
2. **`app.services.storage_service.storage_service`**:
   - Reused to access raw artifact files via `get_file_path(project_id, stored_filename)`.
3. **`app.db.session.get_db`**:
   - Reused for database session lifecycle with automatic exception rollback and connection closure.
4. **`app.models.project.Project` & `app.models.artifact.Artifact`**:
   - Direct parent models establishing foreign keys and cascade delete lifecycles.
5. **FastAPI Modular Routing (`app.api.router`)**:
   - Reused to mount new document and understanding route modules under `/api/projects`.
6. **Frontend UI Primitives (`Card`, `Badge`, `Button`, `Input`, `Textarea`)**:
   - Reused directly with zero new npm package installations.

---

## 5. Proposed Architecture

```text
                                 HTTP Client / React Frontend
                                               │
                                               ▼
                                 FastAPI Routes (/api/projects/...)
                                 ├── documents.py
                                 └── understanding.py
                                               │
                                               ▼
                                   Business Service Layer
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
             DocumentExtractionService                    ProjectUnderstandingService
                        │                                             │
      ┌─────────────────┴─────────────────┐                           │
      ▼                                   ▼                           │
Document Extractors               Text Normalizer                     │
├── PdfExtractor (pypdf)          ├── Clean & Normalize text          │
├── DocxExtractor (python-docx)   ├── Section / Outline detection     │
├── TextExtractor (.md/.txt)      └── Metric calculation (words, etc) │
└── FallbackExtractor (non-text)                                      ▼
      │                                                   Deterministic Synthesizer
      ▼                                                   (Strict No-Invention Aggregator)
File System Storage                                       ├── Project Metadata
├── storage/uploads/{project_id}/ (read raw)              ├── Extracted Document Sections
└── storage/processed/{project_id}/ (write full text)    └── Provenance Builder
                                               │                      │
                                               ▼                      ▼
                                     SQLAlchemy 2.0 ORM & Database
                                     ├── document_extractions table (metadata, metrics, outline)
                                     └── project_understandings table (11 dimensions + provenance)
```

### 5.1 Document Extraction Pipeline Flow
1. API receives request: `POST /api/projects/{project_id}/artifacts/{artifact_id}/extraction`.
2. Service verifies project and artifact existence and ownership (`artifact.project_id == project_id`).
3. Service obtains physical file path from `storage_service.get_file_path()`.
4. Extractor registry routes file based on extension:
   - `.pdf` -> `PdfExtractor` using `pypdf.PdfReader` (extracts text page-by-page, captures page counts)
   - `.docx` -> `DocxExtractor` using `docx.Document` (extracts text from paragraphs and tables)
   - `.md`, `.txt` -> `TextExtractor` using UTF-8/latin-1 decoding (extracts markdown headings and body)
   - `.png`, `.jpg`, `.jpeg`, `.zip` -> `FallbackExtractor` (records `skipped_unsupported_type`, 0 words)
5. `TextNormalizer` cleans text, strips non-printable control characters, normalizes whitespace, extracts top-level headings/sections, and computes token/word statistics.
6. Full extracted text is written to `storage/processed/{project_id}/{artifact_id}_extracted.txt` (authoritative disk copy).
7. `DocumentExtraction` database record is created or updated atomically with metadata, metrics, outline sections JSON, and storage path (status `completed`).

### 5.2 Deterministic Project Understanding Synthesis Flow
1. API receives request: `POST /api/projects/{project_id}/understanding`.
2. Service fetches `Project` metadata and all `completed` extractions from `DocumentExtraction`.
3. Synthesizer evaluates each of the 11 dimensions using **strict evidence-only rules**:
   - If information was explicitly declared in project metadata, populate it with provenance `{"source_type": "project_metadata", "field": ...}`.
   - If information is explicitly detected in extracted document sections (e.g. section heading matches "Objectives", "Architecture", "Target Users"), populate it with provenance `{"source_type": "artifact", "artifact_id": ..., "section": ...}`.
   - **CRITICAL**: If no explicit metadata or document evidence exists for a dimension, the field remains strictly `null` (or `[]` for lists). No default guesses, no generic assumptions.
4. Persists the result in `project_understandings` table atomically.

---

## 6. The 11-Dimensional Project Understanding Model

The 11 dimensions defined in `PROJECT_CONTEXT.md` Section 11 are strictly mapped as follows:

| Field Name | Type | Source & Extraction Behavior | Behavior When Missing |
| :--- | :--- | :--- | :--- |
| `problem` | `Text` | Project `problem_statement` input, supplemented by document sections explicitly titled "Problem", "Problem Statement", or "Background". | Must remain `null` if not stated in metadata or documents. |
| `target_users` | `JSON (List[str])` | Extracted from document sections explicitly titled "Target Users", "Target Audience", "User Personas", or "Stakeholders". | Must remain `[]` (empty list). Never inferred from domain assumptions. |
| `objectives` | `JSON (List[str])` | Extracted from document sections explicitly titled "Objectives", "Goals", "Scope", or "Project Objectives". | Must remain `[]` (empty list). Never inferred. |
| `requirements_summary` | `Text` | Raw requirements text from project `requirements` metadata or document sections explicitly titled "Requirements" or "System Requirements". Preserved as text only. **No R1/RN entity decomposition**. | Must remain `null` if not stated. |
| `modules` | `JSON (List[str])` | Extracted from document sections explicitly titled "Modules", "Components", "System Modules", or "Functional Decomposition". | Must remain `[]` (empty list). Never inferred from tech stack. |
| `tech_stack` | `JSON (List[str])` | Explicit union of project `tech_stack` metadata and technologies explicitly named in document sections titled "Technology Stack", "Tech Stack", or "Tools Used". | Must remain `[]` if not explicitly stated. |
| `architecture_overview` | `Text` | Project `architecture_summary` metadata, supplemented by document sections explicitly titled "Architecture", "System Architecture", or "Design Overview". | Must remain `null` if not stated. |
| `dependencies` | `JSON (List[str])` | Extracted from document sections explicitly titled "Dependencies", "Third-Party Services", "External APIs", or "Prerequisites". | Must remain `[]` (empty list). Never inferred from tech stack. |
| `expected_scale` | `Text` | Populated **only** when documents or metadata explicitly state scale/throughput/user capacity expectations (e.g. section titled "Scale", "Non-Functional Requirements", "Capacity"). | Must remain `null` if no scale metrics are explicitly stated. |
| `deployment` | `Text` | Extracted from document sections explicitly titled "Deployment", "Hosting", "Infrastructure", or "DevOps". | Must remain `null` if no deployment details are stated. |
| `team` | `JSON (List[dict])` | Extracted from document sections explicitly titled "Team", "Team Members", "Contributors", or "Authors" (capturing name, role if provided). | Must remain `[]` (empty list). Never inferred from Git or assumptions. |

### Provenance Metadata Structure
Along with the 11 fields, `project_understandings` stores a `provenance` JSON object mapping each populated field to its exact evidence source:
```json
{
  "problem": {
    "source_type": "project_metadata",
    "field": "problem_statement"
  },
  "tech_stack": [
    {"value": "FastAPI", "source_type": "project_metadata"},
    {"value": "PostgreSQL", "source_type": "artifact", "artifact_id": "123e4567-e89b-12d3-a456-426614174000", "section": "Technology Stack"}
  ],
  "architecture_overview": {
    "source_type": "artifact",
    "artifact_id": "123e4567-e89b-12d3-a456-426614174000",
    "section": "System Architecture"
  },
  "expected_scale": null,
  "team": []
}
```

---

## 7. Storage Architecture: Elimination of Duplication

### 7.1 Single Authoritative Copy Strategy
In Checkpoint 2, raw artifacts are stored in `storage/uploads/{project_id}/{stored_filename}`.
In Checkpoint 3, raw extracted text will be stored **exclusively on disk**:
- **Authoritative Raw Extracted Text**: `storage/processed/{project_id}/{artifact_id}_extracted.txt`.
- **Database Table (`document_extractions`)**:
  - Does NOT store multi-megabyte `extracted_text` blobs in a SQL column.
  - Stores `text_storage_path` (relative or canonical path to the processed text file).
  - Stores `text_preview` (first 500 characters for quick UI card preview).
  - Stores `sections` JSON (array of detected outline headings and their start line numbers/offsets).
  - Stores metrics: `word_count`, `character_count`, `page_count`, `sha256_hash`.
  - Stores operational metadata: `extractor_name`, `extractor_version`, `status`, `error_message`.

### 7.2 Benefits
1. Zero database bloat: Relational queries for artifact listings and status badges remain lightweight and fast.
2. Direct streaming: Full extracted text can be streamed directly from disk via `FileResponse` using the dedicated endpoint `GET /api/projects/{project_id}/artifacts/{artifact_id}/extracted-text`.
3. Clean transactional cleanup: If an artifact is deleted, its database record is removed via `CASCADE`, and its processed disk file is cleaned up via the storage service.

---

## 8. Files to Create

### 8.1 Backend (`backend/app/`)
1. [`backend/app/models/document_extraction.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/models/document_extraction.py):
   - SQLAlchemy model for `document_extractions` table.
2. [`backend/app/models/project_understanding.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/models/project_understanding.py):
   - SQLAlchemy model for `project_understandings` table.
3. [`backend/app/schemas/document.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/schemas/document.py):
   - Pydantic schemas: `DocumentExtractionResponse`, `DocumentExtractionSummary`, `DocumentSectionSchema`, `BatchExtractionResponse`.
4. [`backend/app/schemas/understanding.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/schemas/understanding.py):
   - Pydantic schemas: `ProjectUnderstandingResponse`, `FieldProvenanceSchema`.
5. [`backend/app/services/documents/base.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/base.py):
   - Abstract `BaseDocumentExtractor` protocol, `ExtractionResult`, and `DocumentSection` dataclasses.
6. [`backend/app/services/documents/pdf_extractor.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/pdf_extractor.py):
   - Pure-Python `PdfExtractor` using `pypdf`.
7. [`backend/app/services/documents/docx_extractor.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/docx_extractor.py):
   - Pure-Python `DocxExtractor` using `python-docx`.
8. [`backend/app/services/documents/text_extractor.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/text_extractor.py):
   - `TextExtractor` for `.md` and `.txt`.
9. [`backend/app/services/documents/fallback_extractor.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/fallback_extractor.py):
   - Safe skip handler for `.png`, `.jpg`, `.jpeg`, `.zip` returning `skipped_unsupported_type`.
10. [`backend/app/services/documents/normalizer.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/normalizer.py):
    - Text cleaning, line ending normalization, heading detection, and metric calculation.
11. [`backend/app/services/documents/extraction_service.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/documents/extraction_service.py):
    - Orchestrator managing extraction jobs, disk text writing, and database persistence.
12. [`backend/app/services/analysis/understanding_service.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/services/analysis/understanding_service.py):
    - Deterministic project understanding synthesizer enforcing the strict "no invention" rule and building provenance.
13. [`backend/app/api/routes/documents.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/api/routes/documents.py):
    - Resource endpoints for artifact document extraction and status retrieval.
14. [`backend/app/api/routes/understanding.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/api/routes/understanding.py):
    - Resource endpoints for generating and viewing project understanding representations.
15. [`backend/alembic/versions/2a8b9c0d1e2f_create_document_extractions_and_project_understandings_tables.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/alembic/versions/):
    - Reversible Alembic migration script.

### 8.2 Backend Tests (`backend/tests/`)
16. [`backend/tests/test_document_extractors.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/tests/test_document_extractors.py):
    - Unit tests for PDF, DOCX, Markdown, Text, unsupported image/ZIP handlers, and corrupted documents.
17. [`backend/tests/test_text_normalizer.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/tests/test_text_normalizer.py):
    - Unit tests for whitespace normalization, line ending normalization, control character cleanup, outline detection, and metrics.
18. [`backend/tests/test_document_extraction_api.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/tests/test_document_extraction_api.py):
    - API tests for extraction endpoints, raw text streaming, error conditions, cascade deletion, and cross-project isolation.
19. [`backend/tests/test_project_understanding_api.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/tests/test_project_understanding_api.py):
    - API and service tests verifying the 11-dimensional model, the strict "no invention" rule (missing info remains null), provenance tracking, and absence of Checkpoint 4 R1/RN entities.

### 8.3 Frontend (`frontend/src/`)
20. [`frontend/src/types/document.ts`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/types/document.ts):
    - TypeScript definitions for extraction results, status, and document sections.
21. [`frontend/src/types/understanding.ts`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/types/understanding.ts):
    - TypeScript definitions for structured project understanding and provenance.
22. [`frontend/src/services/documents.ts`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/services/documents.ts):
    - Resource-oriented API client functions.
23. [`frontend/src/components/documents/DocumentExtractionBadge.tsx`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/components/documents/DocumentExtractionBadge.tsx):
    - Extraction status indicator badge.
24. [`frontend/src/components/documents/ExtractedTextViewerModal.tsx`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/components/documents/ExtractedTextViewerModal.tsx):
    - Modal for inspecting outline tree and streaming/viewing raw extracted text.
25. [`frontend/src/components/understanding/ProjectUnderstandingCard.tsx`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/components/understanding/ProjectUnderstandingCard.tsx):
    - Component rendering the 11 dimensions of structured project understanding with provenance badges and clear "Not specified" indicators.

---

## 9. Files to Modify

1. [`backend/requirements.txt`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/requirements.txt):
   - Add `pypdf>=5.0.0`
   - Add `python-docx>=1.1.0`
2. [`backend/app/models/__init__.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/models/__init__.py):
   - Export `DocumentExtraction` and `ProjectUnderstanding`.
3. [`backend/app/models/project.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/models/project.py):
   - Add relationships:
     - `extractions: Mapped[List["DocumentExtraction"]]`
     - `understanding: Mapped[Optional["ProjectUnderstanding"]]`
4. [`backend/app/models/artifact.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/models/artifact.py):
   - Add relationship:
     - `extraction: Mapped[Optional["DocumentExtraction"]]`
5. [`backend/app/api/router.py`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/backend/app/api/router.py):
   - Include `documents.router` and `understanding.router`.
6. [`frontend/src/pages/ProjectDetailPage.tsx`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/pages/ProjectDetailPage.tsx):
   - Add tabbed layout (`Overview & Artifacts` vs `Project Understanding`), extraction action hooks, and understanding view.
7. [`frontend/src/components/projects/ArtifactList.tsx`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/frontend/src/components/projects/ArtifactList.tsx):
   - Add extraction status column and "View Text" / "Extract" button actions.
8. [`PROJECT_CONTEXT.md`](file:///c:/Users/Lenovo/Desktop/ProjectDoctor/PROJECT_CONTEXT.md):
   - Update with Checkpoint 3 completion details upon successful verification.

---

## 10. Database Changes

### 10.1 Schema Definition

#### `document_extractions` Table
```sql
CREATE TABLE document_extractions (
    id UUID PRIMARY KEY,
    artifact_id UUID NOT NULL UNIQUE REFERENCES artifacts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    extractor_name VARCHAR(100) NOT NULL,
    text_storage_path VARCHAR(500),
    text_preview VARCHAR(500),
    page_count INTEGER,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    sha256_hash VARCHAR(64),
    sections JSON DEFAULT '[]',
    metadata JSON DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX ix_document_extractions_project_id ON document_extractions (project_id);
CREATE INDEX ix_document_extractions_status ON document_extractions (status);
```

#### `project_understandings` Table
```sql
CREATE TABLE project_understandings (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    problem TEXT,
    target_users JSON DEFAULT '[]',
    objectives JSON DEFAULT '[]',
    requirements_summary TEXT,
    modules JSON DEFAULT '[]',
    tech_stack JSON DEFAULT '[]',
    architecture_overview TEXT,
    dependencies JSON DEFAULT '[]',
    expected_scale TEXT,
    deployment TEXT,
    team JSON DEFAULT '[]',
    provenance JSON DEFAULT '{}',
    source_artifact_ids JSON DEFAULT '[]',
    extracted_sections_count INTEGER DEFAULT 0,
    total_words_analyzed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX ix_project_understandings_project_id ON project_understandings (project_id);
CREATE INDEX ix_project_understandings_status ON project_understandings (status);
```

### 10.2 Alembic Migration Safety
- Migration script implements both `upgrade()` and `downgrade()`.
- Dual-mode support for both PostgreSQL (`UUID`, `JSON`, `DateTime(timezone=True)`) and SQLite fallback (reusing `GUIDTypeDecorator` and `JSON` patterns from Checkpoint 2).

---

## 11. API Changes

### 11.1 Resource-Oriented Endpoints

| Method | Path | Request Body | Response Status | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/projects/{project_id}/artifacts/{artifact_id}/extraction` | None | `200 OK` | `DocumentExtractionResponse` | Extracts text from a specific artifact and saves to disk |
| `POST` | `/api/projects/{project_id}/documents/extract` | None | `200 OK` | `BatchExtractionResponse` | Batch triggers extraction for all extractable artifacts |
| `GET` | `/api/projects/{project_id}/documents/extractions` | Query: `status` (opt) | `200 OK` | `List[DocumentExtractionSummary]` | Lists extraction status/metadata for all artifacts |
| `GET` | `/api/projects/{project_id}/artifacts/{artifact_id}/extraction` | None | `200 OK` | `DocumentExtractionResponse` | Gets extraction status, metrics, outline sections, preview |
| `GET` | `/api/projects/{project_id}/artifacts/{artifact_id}/extracted-text` | None | `200 OK` | `FileResponse (text/plain)` | Streams the full raw extracted text file from disk |
| `POST` | `/api/projects/{project_id}/understanding` | None | `200 OK` | `ProjectUnderstandingResponse` | Synthesizes deterministic representation from metadata & documents |
| `GET` | `/api/projects/{project_id}/understanding` | None | `200 OK` | `ProjectUnderstandingResponse` | Gets the current structured project understanding |

### 11.2 Error Handling Contracts
- `404 Not Found`: If `project_id` or `artifact_id` does not exist, or if an artifact does not belong to the specified project.
- `422 Unprocessable Entity`: For malformed UUIDs or invalid parameters.
- Extraction errors for corrupted/unreadable files do NOT return HTTP 500; they return `200 OK` with `status: "failed"` and `error_message: "..."` in the extraction record, preserving operational observability.

---

## 12. Frontend Changes

1. **`ArtifactList.tsx` Enhancement**:
   - Add an **Extraction Status** badge column:
     - `Extracted` (Emerald badge + word count)
     - `Pending` (Amber badge)
     - `Skipped` (Slate badge for images/zips)
     - `Failed` (Rose badge with error tooltip)
   - Add action buttons: "Extract Text" and "View Outline / Text".
2. **`ExtractedTextViewerModal.tsx` Component**:
   - Modal displaying:
     - Document metadata: File name, extractor used, word count, character count, page count, content hash.
     - Section Navigator / Outline tree on the left.
     - Extracted text preview / full text streaming viewer with copy and download actions.
3. **`ProjectUnderstandingCard.tsx` Component**:
   - Responsive card-based display of the 11 dimensions:
     - **Problem & Target Users**: Problem statement, Target user groups.
     - **Objectives & Scope**: Core objectives, System modules.
     - **Requirements**: Preserved raw requirements text (explicitly labeled as summary, no R1/RN entities).
     - **Technical Architecture**: Architecture overview, Expected scale.
     - **Engineering Stack**: Consolidated tech stack, External dependencies, Deployment model.
     - **Team**: Explicit team members and roles.
   - For every dimension without explicit evidence, renders a clear, subdued **"Not specified"** indicator.
   - Each populated field features a clickable provenance badge displaying its source (e.g. `Source: Project Metadata` or `Source: Proposal.pdf -> Architecture`).
   - Top action bar includes a "Regenerate Representation" button with loading spinner.
4. **`ProjectDetailPage.tsx` Updates**:
   - Clean tabbed layout: `Overview & Artifacts` | `Project Understanding`.
   - Polling / refresh trigger after triggering batch extraction.

---

## 13. Validation and Security Considerations

1. **Storage Sandboxing & Path Traversal Prevention**:
   - Processed text files must strictly reside within `storage/processed/{project_id}/`.
   - Verified via `validate_path_boundary` before any file write or read operation.
2. **Resource Exhaustion & Bomb Prevention**:
   - **Decompression Ceiling (DOCX)**: Check uncompressed XML size against a 50MB safety ceiling; abort if exceeded.
   - **PDF Infinite Loop / Memory Exhaustion**: `pypdf` extraction capped at maximum 500 pages per document to prevent memory denial-of-service on massive documents.
   - **Extracted Text Cap**: Raw extracted text truncated at a maximum of 5,000,000 characters per document with a `truncated: true` flag in metadata if exceeded.
3. **Cross-Project Isolation**:
   - All extraction and understanding endpoints explicitly query `Artifact.project_id == project_id` and `ProjectUnderstanding.project_id == project_id`.
4. **Database Rollback Integrity**:
   - All extraction and understanding database writes wrapped in `try...except Exception: db.rollback(); raise` to ensure transactions are never left dirty.

---

## 14. Test Strategy

A comprehensive automated test suite will be implemented using `pytest` and `FastAPI TestClient`:

### 14.1 Extraction Unit Tests (`test_document_extractors.py`)
- **PDF Extraction**: Multi-page PDF text extraction using `pypdf`, verifying page counts, text fidelity, and page breaks.
- **DOCX Extraction**: Multi-paragraph and table text extraction using `python-docx`.
- **Plain Text & Markdown Extraction**: UTF-8 and latin-1 fallback text extraction with special characters.
- **Unsupported Image Handling**: Verify `.png`, `.jpg`, `.jpeg` return `skipped_unsupported_type` without error.
- **Unsupported ZIP Handling**: Verify `.zip` returns `skipped_unsupported_type` without attempting archive decompression.
- **Corrupted / Malformed Handling**: Verify truncated/corrupted PDF bytes return `failed` status with descriptive error without server crash.
- **Empty Documents**: Verify 0-byte or whitespace-only documents are handled cleanly.
- **Unicode Text**: Verify non-ASCII characters, symbols, and multilingual text survive extraction intact.

### 14.2 Text Normalization Unit Tests (`test_text_normalizer.py`)
- Line ending normalization (CRLF -> LF).
- Control character stripping (retaining valid whitespace, tabs, newlines).
- Outline detection and heading hierarchy extraction.
- Accurate calculation of word, character, line counts, and SHA-256 hash.

### 14.3 Understanding & No-Invention Tests (`test_project_understanding_api.py`)
- **Strict "No Invention" Rule**: Verify that for a project with minimal metadata and no documents, all unstated fields (`target_users`, `objectives`, `modules`, `expected_scale`, `deployment`, `team`) remain strictly `null` or `[]`.
- **Explicit Metadata Preservation**: Verify that declared `problem_statement`, `tech_stack`, etc., are faithfully preserved.
- **Document Evidence Representation**: Verify that sections extracted from documents are mapped into the understanding fields.
- **Checkpoint 4 Boundary Verification**: Verify that requirements text is NOT decomposed into R1/R2/R3 entities, requirement IDs, or coverage statuses.
- **Provenance Verification**: Verify that every populated field contains a valid source provenance record.

### 14.4 API & Security Integration Tests (`test_document_extraction_api.py`)
- Trigger single extraction -> verify disk file written and DB record created.
- Batch extraction -> verify all extractable documents processed and non-text artifacts skipped.
- Stream full extracted text -> verify `GET /artifacts/{id}/extracted-text` streams exact disk contents.
- Path traversal attack prevention -> attempt to write/read processed text outside `storage/processed/{project_id}/`.
- Cross-project isolation -> verify project A cannot access, trigger extraction for, or stream text of project B's artifacts.
- Cascade deletion -> verify deleting an artifact deletes its DB extraction record and processed disk file.

### 14.5 Frontend Build Verification
- `npm run build` (`tsc -b && vite build`) must pass with 0 errors.

---

## 15. Acceptance Criteria

Checkpoint 3 is complete and ready for audit only when:
- [ ] Pure-Python PDF, DOCX, Markdown, and TXT extractors successfully extract readable text.
- [ ] Unsupported files (`.png`, `.jpg`, `.jpeg`, `.zip`) are marked as `skipped_unsupported_type` without archive unpacking or OCR.
- [ ] Extracted text is normalized, measured, and stored authoritatively on disk at `storage/processed/{project_id}/{artifact_id}_extracted.txt`.
- [ ] `document_extractions` and `project_understandings` tables are created via a reversible Alembic migration without duplicating full raw text in the database.
- [ ] The 11-dimensional project understanding model is deterministically synthesized with strict adherence to the "no invention" rule (missing fields remain `null` or `[]`).
- [ ] Every populated understanding field includes explicit source provenance.
- [ ] No Checkpoint 4+ functionality (R1/RN requirements, coverage scoring, AI prompts, LangGraph, pgvector, GitHub cloning) is present.
- [ ] All 7 REST API endpoints are functional, validated, and enforce cross-project isolation.
- [ ] Frontend allows users to trigger extraction, view status badges, inspect outline & text in a modal, and view the structured project understanding card with provenance.
- [ ] All new and existing backend automated tests pass 100%.
- [ ] Frontend passes production build (`npm run build`) with zero TypeScript errors.

---

## 16. Implementation Sequence

1. **Step 1: Install & Record Dependencies**:
   - Add `pypdf>=5.0.0` and `python-docx>=1.1.0` to `backend/requirements.txt` and install in `.venv`.
2. **Step 2: Implement Database Models**:
   - Create `DocumentExtraction` and `ProjectUnderstanding` models.
   - Update `Project` and `Artifact` relationships.
3. **Step 3: Generate & Apply Alembic Migration**:
   - Generate migration script and verify upgrade & downgrade on SQLite.
4. **Step 4: Implement Text Extraction & Normalization Services**:
   - Create `BaseDocumentExtractor`, `PdfExtractor`, `DocxExtractor`, `TextExtractor`, and `FallbackExtractor`.
   - Create `TextNormalizer` and `DocumentExtractionService`.
5. **Step 5: Implement Deterministic Project Understanding Synthesizer**:
   - Create `ProjectUnderstandingService` to aggregate metadata and extracted document sections into the 11 dimensions with provenance and strict "no invention" enforcement.
6. **Step 6: Implement Resource REST API Endpoints & Schemas**:
   - Implement `backend/app/api/routes/documents.py` and `backend/app/api/routes/understanding.py`.
   - Mount routes in `backend/app/api/router.py`.
7. **Step 7: Implement Automated Backend Tests**:
   - Create `test_document_extractors.py`, `test_text_normalizer.py`, `test_document_extraction_api.py`, and `test_project_understanding_api.py`.
   - Run full test suite to verify 100% pass rate.
8. **Step 8: Implement Frontend Types, Services & Components**:
   - Create `types/document.ts` and `types/understanding.ts`.
   - Create `services/documents.ts`.
   - Create `DocumentExtractionBadge.tsx`, `ExtractedTextViewerModal.tsx`, and `ProjectUnderstandingCard.tsx`.
   - Update `ArtifactList.tsx` and `ProjectDetailPage.tsx`.
9. **Step 9: Frontend Build & End-to-End Verification**:
   - Run `npm run build` to confirm zero compilation errors.
   - Run full end-to-end round trip test.
10. **Step 10: Update `PROJECT_CONTEXT.md` & Prepare Audit Report**:
    - Record verified facts, new endpoints, and schemas.

---

## 17. Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Malformed or Encrypted PDF/DOCX** | Server crash or unhandled 500 error | Extractors catch `pypdf.errors.PdfReadError` and package errors; record status as `failed` with user-facing message. |
| **Decompression Bomb or Massive PDF** | Process OOM or excessive heap allocation | Enforce 500-page limit on PDFs, 50MB uncompressed XML ceiling for DOCX, and 5,000,000 character output cap. |
| **Accidental Fact Invention in Understanding** | Hallucinated or speculative project data | Strict algorithmic rule: if field has no explicit metadata or extracted section match, it MUST be set to `null` or `[]`. Verified via automated tests. |
| **Checkpoint 4 Boundary Leakage** | Premature requirement decomposition | Requirements are stored purely as raw summary text in `requirements_summary`. No R1..RN entity models, IDs, or coverage logic. |
| **Path Traversal on Processed Text Files** | Unauthorized file write or read | Use `validate_path_boundary` on all reads and writes in `storage/processed/{project_id}/`. |

---

## 18. Definition of Done

Checkpoint 3 is considered **Done** when:
1. `pypdf` and `python-docx` dependencies are installed and documented in `backend/requirements.txt`.
2. Database migration cleanly applies and downgrades.
3. PDF, DOCX, Markdown, and TXT artifacts are successfully extracted and normalized without duplicate text in the database.
4. Non-text artifacts (images, ZIPs) are gracefully marked as `skipped_unsupported_type`.
5. 11-dimensional structured project representation is deterministically synthesized with provenance and zero fact invention.
6. All 7 resource-oriented REST API endpoints return documented schemas and status codes.
7. Frontend displays extraction statuses, allows viewing outlines and streaming extracted text, and renders the structured project understanding card.
8. 100% of automated backend tests pass.
9. `npm run build` succeeds with zero errors.
10. `PROJECT_CONTEXT.md` is updated.
11. A full pre-commit audit is performed and approved before committing.
