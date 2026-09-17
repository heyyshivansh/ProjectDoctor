# CHECKPOINT 2 IMPLEMENTATION PLAN (REVISED & HARDENED)
# Project Creation, Metadata Persistence & Artifact Upload Foundation

**Project:** Project Doctor  
**Stage:** Checkpoint 2 (Planning Only — Reviewed & Hardened)  
**Date:** 2026-09-17  
**Author:** AI Software Engineering Agent  
**Status:** Approved for Implementation Awaiting Human Review  

---

## 1. Executive Summary & Context

According to `PROJECT_CONTEXT.md` (Sections 7, 28, 29, 34), the MVP development workflow begins with **Project Upload + Database**:

```text
Project Upload
      ↓
Document Analysis
      ↓
Requirement Extraction
      ↓
GitHub Analysis
      ↓
Requirement Traceability
      ↓
Evidence-Based Findings
      ↓
Project Evaluation
      ↓
Improvement Plan
      ↓
Jury Simulation
      ↓
Final Readiness Report
```

Checkpoint 1 established the baseline application skeleton: a running FastAPI backend with a `/api/health` endpoint, a React 19/Vite/Tailwind/shadcn frontend that communicates with the backend, and basic test/config infrastructure.

Checkpoint 2 establishes the data and storage foundation for the entire platform:
1. Creating technical projects with rich metadata (title, problem statement, description, requirements, tech stack, architecture info, GitHub URL).
2. Persisting project records in a relational database (PostgreSQL via SQLAlchemy 2.0 & Alembic).
3. Providing an artifact upload foundation to accept project documents (PDF proposals, architecture diagrams, Markdown/text specifications, reports, code archives).
4. Storing uploaded files in a safe, isolated local MVP storage hierarchy.
5. Providing typed REST APIs for project management and artifact ingestion.
6. Providing a minimal, functional frontend UI to create projects, view project details, and upload artifacts.
7. Automated unit and integration testing to ensure data integrity and security.

This document presents the revised, hardened technical implementation plan for Checkpoint 2 following rigorous engineering review. **No application code, dependencies, or database migrations have been executed.**

---

## 2. Repository Status & Checkpoint 1 Baseline Verification

A thorough inspection of the repository was conducted:

### 2.1 Backend (`backend/`)
- **Framework:** FastAPI 0.141.1, Uvicorn 0.53.0, Pydantic 2.13.5, Starlette 1.6.0.
- **Python Version:** Python 3.14.7 in local `.venv`.
- **Existing Routes:**
  - `GET /api/health` (implemented in `app/api/routes/health.py`, mounted via `app/api/router.py` onto `app/main.py`).
- **Existing Configuration:**
  - `app/core/config.py` defines `Settings` with `PROJECT_NAME`, `API_PREFIX`, `CORS_ORIGINS`.
- **Existing Tests:**
  - `backend/tests/test_health.py` passes 100% (verifies 200 OK and `{"status": "ok"}`).
- **Existing Empty Directories:**
  - `backend/app/db/` (empty)
  - `backend/app/models/` (empty)
  - `backend/app/schemas/` (contains only `health.py` and `__init__.py`)
  - `backend/app/services/` (contains empty subdirectories: `analysis/`, `documents/`, `evaluation/`, `evidence/`, `github/`, `jury/`, `security/`)
  - `backend/app/agents/` (empty)
  - `backend/app/workflows/` (empty)
  - `backend/app/utils/` (empty)
- **Database & Storage:**
  - No database engine, ORM models, session generators, or migration scripts currently exist.
  - `storage/uploads/` and `storage/processed/` exist in repository root with `.gitkeep` files, excluded by `.gitignore`.

### 2.2 Frontend (`frontend/`)
- **Framework:** React 19.0.0, TypeScript 5.7.3, Vite 6.1.0, Tailwind CSS 3.4.17.
- **UI Components:** `shadcn/ui` initialized; base components available in `src/components/ui/` (`badge.tsx`, `button.tsx`, `card.tsx`).
- **Routing:** `react-router-dom` 7.2.0 configured in `src/App.tsx` with `AppLayout` wrapper.
- **Pages:**
  - `src/pages/HomePage.tsx` displays live system status (backend online/offline polling) and tech stack cards.
- **API Client:**
  - `src/services/api.ts` contains `getBackendHealth()`.
- **Environment:**
  - `frontend/.env` and `frontend/.env.example` set `VITE_API_BASE_URL=http://localhost:8000`.

### 2.3 Operating Environment & Prerequisites
- `psql`, `docker`, and `postgres` commands are **not found in system PATH** on the Windows development machine.
- Windows services inspect shows **no active PostgreSQL or Docker service**.
- The repository is on `master` branch with working tree clean (commit `4b8dc81`).

---

## 3. Checkpoint 2 Scope & Non-Goals

### 3.1 In-Scope Items
1. **Project Creation:** Accept project metadata from user/API.
2. **Project Persistence:** Store project records in a relational database with strict validation.
3. **Project Retrieval:** Endpoints to list projects and fetch project details.
4. **Artifact Upload Foundation:** Endpoints to upload project artifacts (proposals, diagrams, specifications).
5. **Local Storage System:** Safe filesystem storage in `storage/uploads/{project_id}/` with path traversal defense, file size limits, and MIME type validation.
6. **Artifact Metadata Persistence:** Store uploaded file metadata (original filename, storage path, size, MIME type, category, timestamp) linked to the project.
7. **Database Infrastructure:** SQLAlchemy 2.0 ORM models, database session management, and Alembic migrations.
8. **Minimal Frontend UI:**
   - Create Project form with client-side validation.
   - Project Detail page displaying metadata and attached artifacts.
   - Artifact Upload component with loading and error states.
   - Project listing on HomePage to navigate to existing projects.
9. **Automated Verification:** Comprehensive backend unit/integration tests and frontend build validation.

### 3.2 Explicit Non-Goals (Deferred to Later Checkpoints)
To preserve the MVP progression defined in `AI_INSTRUCTIONS.md` and `PROJECT_CONTEXT.md`, the following **must NOT be implemented in Checkpoint 2**:
- **Document Text Extraction / OCR:** (Belongs to Checkpoint 3) — No PDF parsing, chunking, or text extraction. Files are stored as raw artifacts.
- **AI / Gemini API Integration:** (Belongs to Checkpoint 3+) — No LLM calls or prompt templates.
- **LangGraph Workflows:** (Belongs to Checkpoint 3+) — No agentic pipelines.
- **Requirement Extraction & Traceability:** (Belongs to Checkpoint 4) — No structured R1-RN requirement breakdown.
- **GitHub Integration:** (Belongs to Checkpoint 5) — No cloning, GitHub API calls, or commit parsing.
- **Code & Security Scanning:** (Belongs to Checkpoint 6) — No Semgrep, Bandit, or Trivy execution.
- **Evaluation Engine & Scoring:** (Belongs to Checkpoint 7) — No evaluation criteria or score calculations.
- **Evidence Graph & Improvement Planner:** (Belongs to Checkpoint 8) — No evidence linkages or task planning.
- **Jury Simulator:** (Belongs to Checkpoint 9) — No jury persona generation or defense questions.
- **Vector Database / pgvector:** (Belongs to Checkpoints 3 & 8) — Not needed for basic relational project and file metadata.
- **User Authentication / Multi-Tenancy:** Deferred until required by product roadmap.

---

## 4. Database Architecture & Schema Design

Checkpoint 2 requires exactly **two** relational entities: `projects` and `artifacts`.

```text
┌─────────────────────────────────────────┐
│                projects                 │
├─────────────────────────────────────────┤
│ id: UUID [PK]                           │
│ title: VARCHAR(255)                     │
│ problem_statement: TEXT                 │
│ description: TEXT                       │
│ requirements: TEXT [Nullable]           │
│ tech_stack: JSON [Nullable]             │
│ architecture_summary: TEXT [Nullable]   │
│ github_repo_url: VARCHAR(500) [Nullable]│
│ status: VARCHAR(50)                     │
│ created_at: TIMESTAMP WITH TIME ZONE    │
│ updated_at: TIMESTAMP WITH TIME ZONE    │
└───────────────────┬─────────────────────┘
                    │ 1
                    │
                    │ has many (0..*)
                    │
                    ▼ N
┌─────────────────────────────────────────┐
│                artifacts                │
├─────────────────────────────────────────┤
│ id: UUID [PK]                           │
│ project_id: UUID [FK -> projects.id]    │
│ original_filename: VARCHAR(255)         │
│ stored_filename: VARCHAR(255)           │
│ storage_path: VARCHAR(500)              │
│ file_type: VARCHAR(50)                  │
│ mime_type: VARCHAR(100)                 │
│ file_size_bytes: BIGINT                 │
│ status: VARCHAR(50)                     │
│ created_at: TIMESTAMP WITH TIME ZONE    │
└─────────────────────────────────────────┘
```

### 4.1 Table 1: `projects`
- **Purpose:** Primary entity representing a student or team technical project submitted for evaluation.
- **Fields (SQLAlchemy 2.0 type-annotated mapped columns):**
  - `id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)`
  - `title: Mapped[str] = mapped_column(sa.String(255), nullable=False, index=True)`
  - `problem_statement: Mapped[str] = mapped_column(sa.Text, nullable=False)`
  - `description: Mapped[str] = mapped_column(sa.Text, nullable=False)`
  - `requirements: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)`
  - `tech_stack: Mapped[Optional[list[str]]] = mapped_column(sa.JSON, nullable=True, default=list)`
  - `architecture_summary: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)`
  - `github_repo_url: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)`
  - `status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="created")`
  - `created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True)`
  - `updated_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now())`
- **Relationships:**
  - `artifacts: Mapped[list["Artifact"]] = relationship("Artifact", back_populates="project", cascade="all, delete-orphan", lazy="selectin")`
- **Constraints & Indexes:**
  - Primary Key on `id`.
  - Index on `title` (supports search/sorting).
  - Index on `created_at` (supports reverse chronological listing).

### 4.2 Table 2: `artifacts`
- **Purpose:** Tracks files uploaded as evidence or documentation for a project.
- **Fields (SQLAlchemy 2.0 type-annotated mapped columns):**
  - `id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)`
  - `project_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)`
  - `original_filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)`
  - `stored_filename: Mapped[str] = mapped_column(sa.String(255), nullable=False, unique=True)`
  - `storage_path: Mapped[str] = mapped_column(sa.String(500), nullable=False)`
  - `file_type: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="other", index=True)`
  - `mime_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)`
  - `file_size_bytes: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)`
  - `status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="uploaded")`
  - `created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())`
- **Relationships:**
  - `project: Mapped["Project"] = relationship("Project", back_populates="artifacts")`
- **Constraints & Indexes:**
  - Primary Key on `id`.
  - Foreign Key on `project_id` referencing `projects.id` with `ON DELETE CASCADE`.
  - Index on `project_id`.
  - Index on `file_type`.

### 4.3 Why Other Tables Should NOT Be Created Yet
- **`requirements` / `traceability_matrix`:** Checkpoint 4 feature. Defining it now would be premature before document extraction (Checkpoint 3) specifies how requirements are parsed.
- **`vector_embeddings` / `document_chunks`:** Checkpoint 3 feature. Requires text extraction and chunking pipeline.
- **`github_repositories` / `commits` / `contributors`:** Checkpoint 5 feature.
- **`security_findings` / `code_quality_metrics`:** Checkpoint 6 feature.
- **`evaluation_scores` / `findings`:** Checkpoint 7 feature.
- **`improvement_tasks`:** Checkpoint 8 feature.
- **`jury_questions` / `jury_answers`:** Checkpoint 9 feature.
- **`users` / `roles`:** Authentication is explicitly deferred.

---

## 5. Database Technology & Execution Model

### 5.1 Technology Choice & Driver
- **ORM:** **SQLAlchemy 2.0** (`DeclarativeBase`, `Mapped`, `mapped_column`).
- **Migration Tool:** **Alembic**.
- **PostgreSQL Driver:** **`psycopg` (version 3, binary wheel)** (`psycopg[binary]>=3.1.18`).
  - *Rationale:* Precompiled C-extensions compatible with Python 3.14 on Windows; avoids compilation issues common to legacy `psycopg2-binary`.

### 5.2 Synchronous Execution Model in FastAPI
To avoid complex async greenlet lifecycle issues, ensure 100% SQLite test compatibility, and maintain clean database transactions:
- The database engine and session are **synchronous** (`sqlalchemy.orm.Session`, `sessionmaker(bind=engine)`).
- Route handlers that perform database queries or disk writes are defined as standard **`def`** functions (e.g. `def create_project(..., db: Session = Depends(get_db))`).
- *Rationale:* In FastAPI, endpoints declared with `def` are automatically executed inside Starlette’s high-performance worker threadpool (`anyio.to_thread.run_sync`), preventing blocking operations from stalling the main async event loop while keeping code simple, synchronous, and robust.

### 5.3 pgvector Evaluation
- **Determination:** `pgvector` is **NOT required for Checkpoint 2**.
- *Reasoning:* pgvector is used for vector similarity search over embedded document chunks. Checkpoint 2 only requires standard relational schema for project headers and file metadata.

### 5.4 Development Environment Findings & Resilient Fallback Strategy
- **Inspection Result:**
  - Neither `psql`, `postgres`, nor `docker` are currently in PATH on the Windows development host.
  - Windows services inspect shows no active PostgreSQL or Docker service.
- **Developer Prerequisite (Production / Staging):**
  - Developer will need a running PostgreSQL 16 instance (native Windows or Docker container: `docker run -d --name project-doctor-db -p 5432:5432 -e POSTGRES_DB=project_doctor -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:16`).
- **Resilient Architectural Development Approach:**
  - `backend/app/db/session.py` inspects `settings.DATABASE_URL`.
  - If `DATABASE_URL` starts with `postgresql://` or `postgresql+psycopg://`, connect to PostgreSQL.
  - If `DATABASE_URL` starts with `sqlite://` (used in local development when PostgreSQL is not yet running, or in automated pytest suites), configure SQLite cleanly:
    ```python
    # Enforce SQLite foreign key constraints
    @sa.event.listens_for(sa.engine.Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if "sqlite" in str(connection_record._engine.url):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    ```
  - Using `sa.Uuid` and `sa.JSON` guarantees seamless cross-database compatibility: native UUID and JSON on PostgreSQL, and CHAR(36) and text-JSON on SQLite.

---

## 6. File Storage Architecture & Hardened Security Design

### 6.1 Storage Hierarchy
```text
storage/
├── uploads/
│   └── {project_id}/
│       ├── {artifact_id}_{sanitized_filename}
│       └── ...
└── processed/
    └── {project_id}/ (reserved for Checkpoint 3 text extracts)
```

- Each project receives its own isolated directory named after its `project_id` (UUID).
- The root directory path is resolved dynamically relative to the repository root via `settings.STORAGE_LOCAL_DIR`.
- Directories are created on-demand when the first upload for a project occurs.

### 6.2 Hardened Path Traversal & Filename Security
1. **Cross-Platform Basename Sanitization:**
   - User-supplied filenames may contain directory traversal sequences (`../../`), Windows backslashes (`\`), null bytes (`\x00`), absolute path indicators (`C:\` or `/`), or control characters.
   - Filename sanitization logic explicitly handles both POSIX slashes and Windows backslashes:
     ```python
     def sanitize_filename(original_filename: str) -> str:
         # Normalize backslashes to forward slashes and take base name
         base_name = original_filename.replace("\\", "/").split("/")[-1]
         # Strip null bytes and non-whitelisted characters
         clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', base_name)
         # Strip leading/trailing dots and underscores
         clean_name = clean_name.strip("._")
         # Fallback if filename becomes empty
         return clean_name if clean_name else "unnamed_artifact"
     ```
2. **Deterministic Storage Filename:**
   - Files are stored on disk using the generated `artifact_id` (UUID) as a prefix: `{artifact_id}_{clean_name}`.
   - This eliminates filesystem collisions if two files with the same name are uploaded to the same project.
3. **Strict Canonical Path Boundary Enforcement:**
   - Before writing or reading any file, the service calculates canonical paths using `os.path.realpath`:
     ```python
     canonical_base = os.path.realpath(project_upload_dir)
     canonical_target = os.path.realpath(target_file_path)
     if os.path.commonpath([canonical_base, canonical_target]) != canonical_base:
         raise PathTraversalError("Invalid file path detected.")
     ```

### 6.3 Validation, Upload Constraints & Disk Cleanup
1. **Allowed Extensions & MIME Validation:**
   - Whitelisted extensions: `.pdf`, `.md`, `.txt`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.zip`.
   - The validation checks the **final lowercase extension** (`os.path.splitext(clean_name)[1].lower()`) to prevent double-extension bypasses (e.g. `report.pdf.exe`).
   - Executable files (`.exe`, `.bat`, `.sh`, `.cmd`, `.py`, `.js`, `.dll`, `.bin`) return `HTTP 415 Unsupported Media Type`.
   - Empty files (0 bytes) return `HTTP 400 Bad Request`.
2. **Streaming Chunked Writing with Size Limits:**
   - Max file size: **25 MB per file** (configurable via `MAX_UPLOAD_SIZE_MB`).
   - Content is read and written to disk in 1 MB chunks while accumulating a running byte count.
   - If accumulated bytes exceed `MAX_UPLOAD_SIZE_MB`, writing halts immediately, the partially written file is deleted from disk, and `HTTP 413 Payload Too Large` is returned.
3. **Transactional Disk Cleanup on Failure:**
   - If database persistence fails after a file is saved to disk, an exception handler immediately deletes the newly created file from disk to prevent orphaned files.

### 6.4 Clean Modular Storage Service
- Checkpoint 2 implements `LocalStorageService` in `app/services/storage_service.py` with concrete, testable methods:
  - `save_file(project_id: UUID, file: UploadFile, original_filename: str) -> StoredFileInfo`
  - `get_file_path(project_id: UUID, stored_filename: str) -> Path`
  - `delete_file(project_id: UUID, stored_filename: str) -> bool`
  - `file_exists(project_id: UUID, stored_filename: str) -> bool`
- This avoids premature abstract class hierarchies while keeping the interface clean for future S3/MinIO adaptation.

---

## 7. Backend API Specification

All endpoints are prefixed with `/api`.

### 7.1 `POST /api/projects`
- **Purpose:** Create a new technical project.
- **Request Format:** `application/json` (`ProjectCreate` schema)
  - `title`: String, 3 to 255 characters, required.
  - `problem_statement`: String, min 10 characters, required.
  - `description`: String, min 10 characters, required.
  - `requirements`: String, optional.
  - `tech_stack`: List of strings, optional.
  - `architecture_summary`: String, optional.
  - `github_repo_url`: String, optional (validated URL format).
- **Response Format:** `201 Created`, `ProjectResponse` schema.
- **Expected Errors:** `400 Bad Request`, `422 Unprocessable Entity`.

---

### 7.2 `GET /api/projects`
- **Purpose:** List projects for dashboard navigation and selection.
- **Request Format:** Query parameters: `skip: int = 0`, `limit: int = 20` (max 100).
- **Response Format:** `200 OK`, `ProjectListResponse` schema (`items: list[ProjectListItem]`, `total: int`, `skip: int`, `limit: int`).
- **Expected Errors:** `422 Unprocessable Entity`.

---

### 7.3 `GET /api/projects/{project_id}`
- **Purpose:** Retrieve full details of a project, including attached artifacts.
- **Request Format:** Path parameter `project_id` (UUID).
- **Response Format:** `200 OK`, `ProjectDetailResponse` schema (project fields + `artifacts: list[ArtifactResponse]`).
- **Expected Errors:** `404 Not Found` (project does not exist), `422 Unprocessable Entity` (malformed UUID).

---

### 7.4 `POST /api/projects/{project_id}/artifacts`
- **Purpose:** Upload a project artifact (document, diagram, report, code archive).
- **Request Format:** `multipart/form-data`
  - `file`: `UploadFile` (required).
  - `file_type`: String (optional, form field, default `'other'`). Enum: `'proposal'`, `'architecture_diagram'`, `'requirement_doc'`, `'report'`, `'presentation'`, `'code_archive'`, `'other'`.
- **Validation Flow:**
  1. Check project exists in database; return 404 if not found.
  2. Validate file extension against allowed whitelist; return 415 if unsupported.
  3. Validate file is not 0 bytes; return 400 if empty.
  4. Stream file in chunks, enforcing 25 MB limit; return 413 if exceeded.
  5. Insert artifact record in database. If DB insert fails, cleanup saved file on disk and return 500.
- **Response Format:** `201 Created`, `ArtifactResponse` schema.
- **Expected Errors:** `400 Bad Request`, `404 Not Found`, `413 Payload Too Large`, `415 Unsupported Media Type`, `422 Unprocessable Entity`, `500 Internal Server Error`.

---

### 7.5 `GET /api/projects/{project_id}/artifacts`
- **Purpose:** List all artifacts uploaded for a given project.
- **Request Format:** Path parameter `project_id` (UUID).
- **Response Format:** `200 OK`, `list[ArtifactResponse]`.
- **Expected Errors:** `404 Not Found`, `422 Unprocessable Entity`.

---

### 7.6 `GET /api/projects/{project_id}/artifacts/{artifact_id}/download`
- **Purpose:** Download an uploaded artifact securely from the storage system.
- **Request Format:** Path parameters `project_id` (UUID), `artifact_id` (UUID).
- **Security Check:** Query artifact record verifying BOTH `id == artifact_id` AND `project_id == project_id`. Verify file exists on disk inside project upload directory.
- **Response Format:** `200 OK`, `FileResponse` with `Content-Disposition: attachment; filename="{original_filename}"` and `Content-Type: {mime_type}`.
- **Expected Errors:** `404 Not Found` (project, artifact, or file on disk missing), `422 Unprocessable Entity`.

---

## 8. Frontend Design

Preserves the existing stack: **React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Recharts**. **Zero new npm dependencies are required.**

### 8.1 Route Hierarchy
```text
/                      -> HomePage (Updated with Project List & "Create Project" action)
/projects/new          -> CreateProjectPage (Form to submit project metadata)
/projects/:projectId   -> ProjectDetailPage (Project overview + Artifact Upload + Artifacts list)
```

All routes render inside the existing `AppLayout` (`src/components/layout/AppLayout.tsx`).

### 8.2 Component Architecture & Zero Dependency Additions
```text
frontend/src/
├── components/
│   ├── projects/
│   │   ├── ProjectCard.tsx             # Summary card for project listing
│   │   ├── ProjectForm.tsx             # Creation form with validation
│   │   ├── ArtifactUploadSection.tsx   # Drag-and-drop & file picker upload widget
│   │   └── ArtifactList.tsx            # Table/list of uploaded project artifacts
│   └── ui/                             # Lightweight shadcn/ui style primitives
│       ├── badge.tsx                   # (existing)
│       ├── button.tsx                  # (existing)
│       ├── card.tsx                    # (existing)
│       ├── input.tsx                   # [NEW] Simple styled input primitive (0 new deps)
│       ├── textarea.tsx                # [NEW] Simple styled textarea primitive (0 new deps)
│       └── label.tsx                   # [NEW] Simple styled label primitive (0 new deps)
├── pages/
│   ├── HomePage.tsx                    # (existing, extended with Projects section)
│   ├── CreateProjectPage.tsx           # [NEW] Project submission page
│   └── ProjectDetailPage.tsx           # [NEW] Single project overview & upload view
├── services/
│   ├── api.ts                          # (existing health check)
│   └── projects.ts                     # [NEW] Typed API client for projects & artifacts
└── types/
    └── project.ts                      # [NEW] TypeScript interfaces (Project, Artifact, etc.)
```

### 8.3 Screen Specifications
- **`HomePage` (`/`):** Adds a "Projects" section with "New Project" button and cards for existing projects. Retains live backend status check.
- **`CreateProjectPage` (`/projects/new`):** Clean form with client-side validation, loading button state, error banners, and redirect to `/projects/:projectId` on success.
- **`ProjectDetailPage` (`/projects/:projectId`):** Displays metadata header, `ArtifactUploadSection` with category selector and indeterminate animated progress spinner, and `ArtifactList` table with download links.

---

## 9. Backend Architecture & Directory Layout

```text
backend/
├── alembic/                          # [NEW] Database migration environment
│   ├── versions/                     # Migration scripts
│   └── env.py                        # Alembic configuration connected to Base.metadata
├── alembic.ini                       # [NEW] Alembic configuration file
├── app/
│   ├── api/
│   │   ├── router.py                 # (modified: include projects router)
│   │   └── routes/
│   │       ├── health.py             # (existing)
│   │       └── projects.py           # [NEW] Project CRUD and artifact upload endpoints
│   ├── core/
│   │   ├── config.py                 # (modified: add DB_URL, storage paths, limits)
│   │   └── security.py               # [NEW] Filename sanitization & path traversal check
│   ├── db/
│   │   ├── base.py                   # [NEW] DeclarativeBase
│   │   └── session.py                # [NEW] Engine, sessionmaker, get_db dependency
│   ├── models/
│   │   ├── __init__.py               # [NEW] Export Project, Artifact models
│   │   ├── project.py                # [NEW] Project SQLAlchemy ORM model
│   │   └── artifact.py               # [NEW] Artifact SQLAlchemy ORM model
│   ├── schemas/
│   │   ├── __init__.py               # (existing)
│   │   ├── health.py                 # (existing)
│   │   ├── project.py                # [NEW] ProjectCreate, ProjectResponse, ProjectListItem
│   │   └── artifact.py               # [NEW] ArtifactResponse, ArtifactCreate
│   ├── services/
│   │   ├── project_service.py        # [NEW] Project database query & mutation logic
│   │   └── storage_service.py        # [NEW] Local storage management & file validation
│   └── main.py                       # (existing FastAPI app entry point)
└── tests/
    ├── conftest.py                   # [NEW] Test fixtures (test db, test client, temp storage)
    ├── test_health.py                # (existing)
    ├── test_projects.py              # [NEW] Project API & persistence unit/integration tests
    ├── test_storage.py               # [NEW] Path traversal, size limit, sanitization tests
    └── test_artifacts.py             # [NEW] Artifact upload & download API tests
```

---

## 10. Dependency Management Plan

### Category A: Required for Checkpoint 2 (Backend only)
1. **`sqlalchemy>=2.0.30`** (ORM and connection management)
2. **`alembic>=1.13.0`** (Database migrations)
3. **`psycopg[binary]>=3.1.18`** (PostgreSQL 3 driver with precompiled Windows wheels)
4. **`python-multipart>=0.0.9`** (FastAPI `multipart/form-data` upload parsing)

### Category B: Already Installed
- **Backend:** `fastapi`, `uvicorn[standard]`, `pydantic`, `httpx`, `pytest`, `starlette`
- **Frontend:** `react`, `react-dom`, `react-router-dom`, `recharts`, `tailwindcss`, `lucide-react`, `clsx`, `tailwind-merge`

### Category C: Zero New Frontend Dependencies
No new npm packages needed. Custom UI primitives (`Input`, `Textarea`, `Label`) will use standard Tailwind CSS classes.

### Category D: NOT Required for Checkpoint 2 (Do NOT Install)
- `pgvector`, `google-genai`, `langgraph`, `pypdf`, `pdfplumber`, `GitPython`, `semgrep`, `bandit`, `trivy`

---

## 11. Testing & Verification Strategy

### 11.1 Backend Test Matrix (`backend/tests/`)
Using `pytest` with isolated test database (SQLite with foreign keys enabled) and temporary storage directory (`tmp_path` fixture):

1. **`test_projects.py`:**
   - `test_create_project_success`: Valid payload returns 201 Created with UUID.
   - `test_create_project_validation_error`: Missing title, short description returns 422.
   - `test_get_project_by_id_success`: Retrieves full project record (200 OK).
   - `test_get_project_not_found`: Non-existent UUID returns 404 Not Found.
   - `test_get_project_malformed_uuid`: Invalid UUID format returns 422.
   - `test_list_projects_pagination`: Verifies limit, skip, and total counts.
   - `test_project_cascade_delete`: Deleting project deletes associated artifacts in database.
2. **`test_storage.py`:**
   - `test_sanitize_filename_cross_platform`: Strips Windows backslashes, Unix slashes, null bytes.
   - `test_sanitize_empty_filename_fallback`: Empty input falls back to `unnamed_artifact`.
   - `test_path_traversal_prevention`: Rejects paths attempting `../../` directory breakout.
   - `test_file_size_limit_enforced`: Writing stream beyond 25 MB aborts and deletes partial file.
3. **`test_artifacts.py`:**
   - `test_upload_artifact_success`: Valid upload returns 201, writes file, saves DB metadata.
   - `test_upload_artifact_invalid_extension`: Reject `.exe`, `.sh` with 415 Unsupported Media Type.
   - `test_upload_artifact_double_extension`: Reject `test.pdf.exe` with 415.
   - `test_upload_artifact_empty_file`: Reject 0-byte file with 400 Bad Request.
   - `test_upload_artifact_missing_project`: Uploading to non-existent project returns 404.
   - `test_duplicate_filename_upload`: Uploading identical filename twice creates distinct files on disk and unique DB records.
   - `test_download_artifact_success`: Download returns 200 with matching Content-Disposition and bytes.
   - `test_download_artifact_wrong_project`: Cannot download an artifact belonging to Project A using Project B's URL (returns 404).
   - `test_failed_upload_disk_cleanup`: If DB transaction fails during upload, file on disk is cleaned up.
4. **Regression:**
   - Verify `test_health.py` passes 100%.

### 11.2 Frontend & Integration Verification
- Build verification: `npm run build` in `frontend/` passes with 0 errors.
- End-to-end user journey: Create Project -> View Details -> Upload Artifact -> Download Artifact.

---

## 12. Database Migrations & Environment Configuration

### 12.1 Environment Configuration Template (`backend/.env.example`)
```bash
# Backend Environment Configuration
ENVIRONMENT=development
PROJECT_NAME="Project Doctor"
API_PREFIX=/api

# Database Configuration
# In production / Docker:
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/project_doctor
# In local development without PostgreSQL, fallback option:
# DATABASE_URL=sqlite:///./project_doctor.db

# Storage Configuration
STORAGE_LOCAL_DIR=storage/uploads
MAX_UPLOAD_SIZE_MB=25

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

### 12.2 Migration Strategy
1. Initialize Alembic: `alembic init --template generic backend/alembic`
2. Update `backend/alembic/env.py` with `target_metadata = Base.metadata`.
3. Configure `alembic.ini` to read `DATABASE_URL` dynamically from `app.core.config.settings`.
4. Generate migration: `alembic revision --autogenerate -m "create projects and artifacts tables"`
5. Apply migration: `alembic upgrade head`

---

## 13. Step-by-Step Implementation Sequence

1. **Step 1: Dependencies Setup** — Add required packages to `backend/requirements.txt` and install into `.venv`.
2. **Step 2: Configuration Extension** — Add `backend/.env.example` and update `app/core/config.py`.
3. **Step 3: Database Session & Base** — Create `app/db/base.py` and `app/db/session.py` (with SQLite pragma listener).
4. **Step 4: SQLAlchemy Models** — Create `app/models/project.py` and `app/models/artifact.py`.
5. **Step 5: Database Migrations** — Initialize Alembic and generate initial migration.
6. **Step 6: Pydantic Schemas** — Create `app/schemas/project.py` and `app/schemas/artifact.py`.
7. **Step 7: Storage Service & Security Utilities** — Create `app/core/security.py` and `app/services/storage_service.py`.
8. **Step 8: Project Service** — Create `app/services/project_service.py`.
9. **Step 9: Backend API Routes** — Create `app/api/routes/projects.py` and mount in `app/api/router.py`.
10. **Step 10: Backend Tests** — Create test fixtures and test suites; verify with pytest.
11. **Step 11: Frontend Types & API Client** — Create `types/project.ts` and `services/projects.ts`.
12. **Step 12: Frontend UI Primitives & Components** — Add `Input`, `Textarea`, `Label` primitives and project components.
13. **Step 13: Frontend Pages & Routing** — Create `CreateProjectPage.tsx`, `ProjectDetailPage.tsx`, and update routes.
14. **Step 14: End-to-End & Build Verification** — Run frontend build and full round-trip tests.
15. **Step 15: Documentation & Context Handoff** — Update `PROJECT_CONTEXT.md`.

---

## 14. Acceptance Criteria & Verification Mapping

| # | Acceptance Criterion | Implementation Component | Verification Test |
| :-: | :--- | :--- | :--- |
| **1** | Project creation via API | `POST /api/projects`, `ProjectCreate` schema | `test_create_project_success` |
| **2** | Validation rejection on bad input | `ProjectCreate` Pydantic validators | `test_create_project_validation_error` |
| **3** | Project persistence in database | `Project` model, `session.py` | `test_create_project_success` + DB query |
| **4** | Project retrieval by ID | `GET /api/projects/{id}` | `test_get_project_by_id_success` |
| **5** | Project listing with pagination | `GET /api/projects` | `test_list_projects_pagination` |
| **6** | Artifact upload with size limit | `POST /api/projects/{id}/artifacts` | `test_upload_artifact_success`, `test_file_size_limit_enforced` |
| **7** | Rejection of dangerous file types | `storage_service.py` extension whitelist | `test_upload_artifact_invalid_extension` |
| **8** | Safe local storage & isolation | `storage/uploads/{project_id}/` | `test_path_traversal_prevention` |
| **9** | Artifact metadata persistence | `Artifact` model, `ondelete="CASCADE"` | `test_upload_artifact_success`, `test_project_cascade_delete` |
| **10**| Artifact download endpoint | `GET /api/projects/{id}/artifacts/{id}/download` | `test_download_artifact_success` |
| **11**| Frontend creation & upload UI | `CreateProjectPage`, `ProjectDetailPage` | `npm run build` + browser walkthrough |
| **12**| Zero regressions on health check | `app/api/routes/health.py` | `test_health.py` |

---

## 15. Risk Analysis & Mitigation Matrix

| Risk / Uncertainty | Reason | Impact | Mitigation Strategy | Blocks Implementation? |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL availability on dev machine** | `psql` and Docker are not currently installed/running in the Windows environment. | Backend cannot connect to a live PostgreSQL service without setup. | 1. Document prerequisite for user to run PostgreSQL (native or Docker).<br>2. Build dual-mode DB engine (`session.py`) supporting SQLite fallback for local test/dev suites, enabling automated tests to pass immediately. | **No** (with dual-mode fallback) |
| **Python 3.14 driver compatibility** | Python 3.14 is a very modern Python release. Older drivers like `psycopg2-binary` often lack prebuilt wheels and require local C compilers. | Pip install failure during dependency installation. | Use `psycopg[binary]>=3.1.18` (psycopg v3) which has robust pure-Python/modern wheel support across Windows platforms. | **No** |
| **Large file upload memory exhaustion (DoS)** | Reading large files into RAM at once with `.read()` can exhaust backend server memory. | Server crash or high memory usage. | Stream uploads in fixed chunks (e.g. 1MB) directly to disk while maintaining a running byte counter. Abort if limit exceeded. | **No** |
| **Path traversal via maliciously named files** | Untrusted filenames containing `../../` or absolute path separators. | Overwriting critical system or application files. | Sanitize basename with regex whitelist and verify that the canonical resolved path (`os.path.commonpath`) remains inside the project's designated upload directory. | **No** |
| **Breaking Checkpoint 1 functionality** | Changes to FastAPI router, dependencies, or frontend layout could break health checks. | Regressing baseline application foundation. | Keep `/api/health` and `test_health.py` untouched; run regression test on every step. Mount new routes under `/api/projects`. | **No** |
| **Premature architectural complexity** | Temptation to implement document parsing or LLM evaluation in Checkpoint 2. | Scope explosion, fragile codebase, violation of project instructions. | Strictly enforce Checkpoint 2 boundaries: storage and metadata only. Defer AI/workflows to Checkpoint 3+. | **No** |

---

## 16. Confirmation

**NO IMPLEMENTATION WAS PERFORMED.**  
No application code was created or modified. No dependencies were installed. No database migrations were executed. No Git commits were made. This document serves solely as the reviewed and hardened blueprint awaiting human review.
