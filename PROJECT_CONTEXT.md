# PROJECT CONTEXT

# Project Doctor

AI-Powered Technical Project Evaluation, Diagnosis, Improvement, and Jury Readiness Platform.

---

# 1. PROJECT STATUS

**Status:** Development

**Current Stage:** Checkpoint 4 - Requirement Extraction & Requirement Traceability

**MVP Status:** In Progress (Project creation, artifact storage, deterministic text extraction, outline detection, structured project understanding, and deterministic requirement extraction & traceability completed)

**Last Updated:** 2026-09-17


---

# 2. PROJECT VISION

Project Doctor is an AI-assisted platform that evaluates technical projects using their available artifacts, implementation evidence, and configurable evaluation criteria.

The system is intended to help:

* students
* project teams
* faculty/project guides
* hackathon and competition organizers

The platform should identify:

* weaknesses
* missing requirements
* architecture/implementation inconsistencies
* security issues
* unsupported technical claims
* documentation gaps
* implementation gaps
* scalability concerns
* project risks

It should then provide:

* evidence-backed findings
* improvement recommendations
* prioritized action plans
* project-specific jury questions
* final project readiness information

Project Doctor is a decision-support system.

It must not claim to replace human evaluators or judges.

---

# 3. CORE PRINCIPLE

The central product principle is:

> Analyze → Explain → Improve → Defend

The system should help a project team understand:

1. What is working?
2. What is weak?
3. Why is it weak?
4. What evidence supports that conclusion?
5. What should be improved?
6. Can the team defend the technical decisions during evaluation?

---

# 4. PROBLEM

Students often complete projects without a rigorous technical evaluation process.

Typical problems include:

* weak problem definition
* unrealistic requirements
* architecture/implementation mismatch
* incomplete functionality
* insufficient testing
* security vulnerabilities
* exposed credentials
* unsupported scalability claims
* weak technical documentation
* unclear team contribution
* weak technical justification
* inability to answer jury questions

Faculty and competition evaluators may not have sufficient time to deeply inspect every project.

Project Doctor aims to provide structured technical analysis before human evaluation.

---

# 5. TARGET USERS

## Students / Project Teams

Use Project Doctor to determine whether their project is technically ready.

## Faculty / Project Guides

Use it to identify weaknesses and monitor project progress.

## Hackathon / Competition Organizers

Use it to assist with standardized preliminary evaluation and judge preparation.

The system should assist evaluators, not automatically replace them.

---

# 6. INPUTS

The platform may accept:

## Core MVP Inputs

* project title
* problem statement
* project description
* project requirements
* technology stack
* architecture diagram
* GitHub repository

## Optional Inputs

* README
* source code
* database schema
* API documentation
* project report
* presentation
* screenshots
* deployment information
* test reports
* team information
* hardware information
* demo video/transcript

The system must handle missing artifacts.

If implementation evidence is unavailable, the system must not pretend implementation was verified.

---

# 7. MVP

The MVP must support this workflow:

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

The MVP should not attempt to solve every possible project-evaluation problem.

---

# 8. EVALUATION CRITERIA

Default evaluation criteria:

| Criterion                | Weight |
| ------------------------ | -----: |
| Problem Definition       |    15% |
| Technical Feasibility    |    15% |
| Technical Depth          |    15% |
| Architecture & Design    |    15% |
| Implementation Quality   |    15% |
| Innovation / Originality |    10% |
| Scalability              |     5% |
| Security & Reliability   |     5% |
| Completeness             |     5% |

Weights should eventually be configurable.

Scores must not be presented as absolute truth.

Important evaluations should contain:

* explanation
* evidence
* confidence
* limitations

---

# 9. REQUIREMENT TRACEABILITY

Requirements should become structured entities.

Example:

```text
R1 → User authentication
R2 → AI recommendation engine
R3 → Admin dashboard
R4 → Real-time notification
R5 → Analytics
```

Each requirement should be classified using available evidence.

Possible statuses:

```text
implemented
partially_implemented
missing
unable_to_verify
```

Example:

| Requirement | Evidence                   | Status                |
| ----------- | -------------------------- | --------------------- |
| R1          | auth module                | Implemented           |
| R2          | recommendation service     | Implemented           |
| R3          | dashboard components       | Implemented           |
| R4          | no implementation evidence | Missing               |
| R5          | partial implementation     | Partially Implemented |

Requirement coverage should be explainable.

---

# 10. EVIDENCE SYSTEM

Evidence is a core differentiating feature.

Major findings should point to their source.

Possible evidence sources:

* proposal
* PDF page
* document section
* README
* source file
* source-code line
* GitHub commit
* GitHub issue
* architecture diagram
* test result
* security scanner result
* dependency scanner result

Example:

```text
Finding:
Scalability claim is insufficiently supported.

Evidence:
Proposal claims 10,000 concurrent users.

Repository evidence:
Single backend process.
No documented load-balancing strategy.
SQLite database detected.

Limitation:
No production benchmark has been performed.
```

The system must distinguish observed evidence from AI interpretation.

---

# 11. PROJECT ANALYSIS

The project understanding layer should extract:

```text
Problem
Target Users
Objectives
Requirements
Modules
Technology Stack
Architecture
Dependencies
Expected Scale
Deployment
Team
```

The system should compare information across artifacts.

Example:

```text
Proposal:
PostgreSQL

Repository:
SQLite
```

Potential finding:

```text
Documentation/implementation mismatch.
```

---

# 12. ARCHITECTURE ANALYSIS

Analyze:

* architecture diagrams
* modules
* APIs
* databases
* services
* infrastructure
* dependencies

Identify:

* missing components
* unnecessary complexity
* bottlenecks
* single points of failure
* architectural inconsistencies
* implementation mismatches

The system should not infer architectural facts without evidence.

---

# 13. CODE ANALYSIS

When a repository is available, analyze:

## Code Quality

* structure
* complexity
* duplication
* error handling
* maintainability

## Engineering Practices

* testing
* documentation
* dependency management
* version control
* code organization

## Security

* exposed credentials
* insecure configuration
* dependency vulnerabilities
* authentication weaknesses
* authorization weaknesses
* risky endpoints

Deterministic tools should be used whenever possible.

---

# 14. DETERMINISTIC ANALYSIS

Project Doctor follows:

> Deterministic tools establish facts. AI interprets facts.

Potential tools:

### Python

* Ruff
* Bandit
* pytest
* coverage.py

### JavaScript / TypeScript

* ESLint
* npm audit
* Vitest or Jest

### General

* Semgrep
* Trivy

Example:

```text
Semgrep
   ↓
Finding
   ↓
Evidence
   ↓
AI Interpretation
```

---

# 15. FEASIBILITY ANALYSIS

Consider:

* team size
* development time
* project scope
* hardware
* APIs
* compute requirements
* deployment environment
* expected users
* technical complexity
* budget where relevant

Feasibility outputs should be framed as risk assessments supported by evidence.

---

# 16. TEAM CONTRIBUTION ANALYSIS

If team information and GitHub history are available, the system may analyze:

* commits
* pull requests
* issues
* code ownership
* activity distribution

However:

> Git activity alone cannot establish total individual contribution.

Non-code contributions may include:

* research
* hardware
* design
* documentation
* testing
* presentations
* project management

The system should flag patterns for human review rather than make accusations.

---

# 17. INNOVATION ANALYSIS

Innovation should not be reduced to a blind numerical score.

The system should analyze:

1. Existing approach
2. Proposed approach
3. Difference
4. Technical significance
5. Evidence
6. Limitations

If external research is used, the sources must be identified.

If external comparison is unavailable:

```text
Innovation could not be fully verified from the available evidence.
```

---

# 18. RISK ENGINE

Findings can use:

### Critical

Potentially blocks project readiness.

### Major

Significant weakness requiring attention.

### Minor

Recommended improvement.

### Strength

Positive evidence.

Severity must be justified.

---

# 19. IMPROVEMENT PLANNER

Convert findings into actionable tasks.

Each improvement may contain:

```text
Title
Description
Priority
Severity
Dependencies
Estimated Effort
Reason
Expected Outcome
```

Priority should consider:

* severity
* dependencies
* effort
* deadline

---

# 20. JURY SIMULATOR

Jury simulation should be generated from the actual project.

Jury categories:

### Technical

Focus on:

* architecture
* implementation
* algorithms
* scalability

### Security

Focus on:

* authentication
* authorization
* privacy
* threats

### Innovation

Focus on:

* novelty
* differentiation
* technical significance

### Industry

Focus on:

* deployment
* cost
* users
* scalability
* operational concerns

Questions should be connected to detected project weaknesses.

---

# 21. JURY ANSWER EVALUATION

Evaluate answers using:

* relevance
* technical correctness
* completeness
* evidence
* clarity

Example:

Weak answer:

> We use FastAPI because it is fast.

Possible feedback:

```text
Relevant: Yes
Technical depth: Low
Evidence: Missing
Completeness: Low
```

The system should explain what a stronger answer would need.

---

# 22. FINAL READINESS REPORT

A final report may contain:

```text
Project Overview

Strengths

Critical Findings

Major Findings

Requirement Coverage

Architecture Assessment

Implementation Assessment

Security Assessment

Documentation Assessment

Innovation Assessment

Improvement Plan

Jury Readiness

Remaining Risks

Evidence
```

Readiness must be explained rather than treated as unquestionable truth.

---

# 23. TECH STACK

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* React Router
* Recharts

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic

## Database

* PostgreSQL
* pgvector

## AI

* Gemini API
* LangGraph

## Repository

* GitHub API / GitHub App

## Security / Analysis

* Semgrep
* Trivy
* Ruff
* Bandit
* pytest
* coverage.py
* ESLint
* npm audit

## Infrastructure

* Docker
* Docker Compose

---

# 24. ARCHITECTURE

Current intended architecture:

```text
                        USER
                          │
                          ▼
                 React + TypeScript
                          │
                          ▼
                      FastAPI
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   Project Service   Document Service   GitHub Service
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  Analysis Workflow
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
 Requirement         Code/Security     Architecture
 Analysis             Analysis           Analysis
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                    Evidence Layer
                          │
                          ▼
                   Evaluation Engine
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
         Findings     Improvements    Jury
             │            │            │
             └────────────┼────────────┘
                          ▼
                    Final Report
                          │
                          ▼
                     PostgreSQL
```

---

# 25. AGENT ARCHITECTURE

The project should use workflows and agents where useful.

Conceptual structure:

```text
Manager / Workflow
       │
       ├── Project Analysis
       ├── Requirement Analysis
       ├── Architecture Analysis
       ├── Code Analysis
       ├── Security Analysis
       ├── Evidence Collection
       ├── Evaluation
       ├── Improvement Planning
       └── Jury Simulation
```

Not every component needs to be an independent LLM agent.

Deterministic services should remain deterministic.

---

# 26. FRONTEND STRUCTURE

Current intended structure:

```text
frontend/
├── public/
└── src/
    ├── assets/
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   ├── dashboard/
    │   ├── projects/
    │   ├── analysis/
    │   ├── jury/
    │   └── common/
    ├── pages/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    └── utils/
```

---

# 27. BACKEND STRUCTURE

Current intended structure:

```text
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── analysis/
│   │   ├── documents/
│   │   ├── evaluation/
│   │   ├── evidence/
│   │   ├── github/
│   │   ├── jury/
│   │   └── security/
│   ├── agents/
│   ├── workflows/
│   └── utils/
└── tests/
```

This is the intended starting structure, not a claim that all components are already implemented.

---

# 28. STORAGE

MVP:

```text
storage/
├── uploads/
└── processed/
```

Local storage may be used during development.

Future production storage may use S3-compatible storage or MinIO.

---

# 29. DEVELOPMENT PHASES

## Checkpoint 0

Project foundation.

Status:

```text
COMPLETED
```

Tasks:

* repository structure
* AI instructions
* project context
* Git initialization
* README
* `.gitignore`

---

## Checkpoint 1

Application skeleton.

Status:

```text
COMPLETED
```

Tasks:

* initialize React/Vite
* initialize FastAPI
* frontend shell
* backend health endpoint
* environment configuration
* basic Docker setup if required

---

## Checkpoint 2

Project creation and uploads.

Status:

```text
COMPLETED
```

Tasks:

* project creation
* project metadata
* document upload
* artifact storage
* basic database schema

---

## Checkpoint 3

Document understanding.

Tasks:

* document extraction
* text processing
* project understanding
* initial structured project representation

---

## Checkpoint 4

Requirements and traceability.

Tasks:

* requirement extraction
* requirement storage
* implementation evidence
* coverage calculation
* traceability UI

---

## Checkpoint 5

GitHub integration.

Tasks:

* repository connection
* repository metadata
* file inspection
* commit information
* contributor information

---

## Checkpoint 6

Code and security analysis.

Tasks:

* language detection
* static analysis
* security scans
* dependency analysis
* test analysis
* structured analysis results

---

## Checkpoint 7

Evaluation engine.

Tasks:

* evaluation criteria
* scoring
* explanations
* confidence
* limitations
* findings

---

## Checkpoint 8

Evidence and improvement planner.

Tasks:

* evidence model
* evidence references
* finding/evidence relationships
* prioritized improvement tasks

---

## Checkpoint 9

Jury simulator.

Tasks:

* jury profiles
* project-specific questions
* answer evaluation
* weakness-driven questioning

---

## Checkpoint 10

Dashboard and integration.

Tasks:

* project health dashboard
* findings UI
* requirement matrix
* evidence viewer
* improvement roadmap
* jury dashboard
* final report

---

# 30. CURRENTLY IMPLEMENTED

### Checkpoint 0 - Project Foundation
- Basic repository folder structure established and verified.
- Git repository initialized locally.
- Core configuration and guidelines established (`PROJECT_CONTEXT.md`, `AI_INSTRUCTIONS.md`, `.gitignore`).

### Checkpoint 1 - Application Foundation (Completed)
- React/Vite frontend initialized with TypeScript.
- Tailwind CSS configured and verified working.
- shadcn/ui initialized correctly (`components.json`, `cn` helper, `Card`, `Badge`, `Button` UI primitives).
- React Router initialized with layout and root route (`/`).
- Recharts foundation installed and available for future dashboard work.
- FastAPI backend initialized with separated modular routing (`app/main.py`, `app/api/router.py`, `app/api/routes/health.py`, `app/schemas/health.py`, `app/core/config.py`).
- `/api/health` endpoint implemented, response typed with Pydantic (`{"status": "ok"}`).
- Frontend ↔ Backend communication implemented: UI fetches real-time health from `/api/health` and displays live connection state (`Frontend: Running`, `Backend: Connected` / `Backend: Disconnected`) with graceful error handling and retry mechanism.
- Backend automated unit test implemented in `backend/tests/test_health.py` and passing 100%.

### Checkpoint 2 - Project Creation & Artifact Uploads (Completed)
- Relational database foundation initialized with SQLAlchemy 2.0 and Alembic migrations.
- Created ORM models: `Project` (metadata, UUID primary key, indexed title and creation date) and `Artifact` (file metadata, project foreign key, ON DELETE CASCADE, unique stored filename) in `backend/app/models/`.
- Dual-mode database session engine configured in `backend/app/db/session.py` supporting PostgreSQL (via `psycopg` v3 binary driver) for production/Docker and SQLite fallback for local development/testing with automated `PRAGMA foreign_keys=ON;` enforcement.
- Initial Alembic migration `1f5a7e40f7fe_create_projects_and_artifacts_tables.py` generated and applied successfully.
- Hardened cross-platform filename sanitization and canonical boundary verification implemented in `backend/app/core/security.py` (stripping Windows/POSIX path traversal sequences, null bytes, double extensions).
- Local storage service implemented in `backend/app/services/storage_service.py` with bounded 1MB chunked streaming directly to disk, strict 25 MB size quota enforcement, zero-byte rejection, and transactional cleanup of orphaned files upon database failure.
- Business service layer created in `backend/app/services/project_service.py` handling project CRUD, pagination, artifact counts, and cross-project download ownership enforcement.
- REST endpoints implemented and mounted in `backend/app/api/routes/projects.py`:
  - `POST /api/projects` (201 Created with UUID, 422 validation)
  - `GET /api/projects` (200 OK with pagination `skip`, `limit`, and `artifact_count`)
  - `GET /api/projects/{project_id}` (200 OK, 404 not found, returns project metadata and attached artifacts list)
  - `POST /api/projects/{project_id}/artifacts` (201 Created, 400 empty file, 404 project missing, 413 file too large, 415 unsupported media type)
  - `GET /api/projects/{project_id}/artifacts` (200 OK, lists project artifacts)
  - `GET /api/projects/{project_id}/artifacts/{artifact_id}/download` (200 OK file stream with original filename, 404 cross-project access rejection)
- Frontend UI implemented (0 new npm dependencies added):
  - Added UI primitives (`Input`, `Textarea`, `Label`) matching shadcn/ui design tokens in `frontend/src/components/ui/`.
  - Added `ProjectCard`, `ProjectForm`, `ArtifactUploadSection`, and `ArtifactList` in `frontend/src/components/projects/`.
  - Created `CreateProjectPage` (`/projects/new`) with client-side validation and loading states.
  - Created `ProjectDetailPage` (`/projects/:projectId`) rendering project metadata, drag-and-drop artifact upload with progress indicators, and artifact list with direct file downloads.
  - Updated `HomePage` (`/`) with an evaluated projects grid and "New Project" call-to-action alongside real-time system health checks.
  - Updated global layout navigation in `frontend/src/components/layout/AppLayout.tsx`.
- Test suite expanded to 25 automated unit/integration tests passing 100% across projects, storage security, artifacts, and health regression.
- Frontend production build (`npm run build`) passing with 0 TypeScript or bundler errors.

### Dependencies Installed
- **Frontend Dependencies (0 new dependencies added in Checkpoint 2):**
  - `react`: ^19.0.0
  - `react-dom`: ^19.0.0
  - `react-router-dom`: ^7.2.0
  - `recharts`: ^2.15.1
  - `clsx`: ^2.1.1
  - `tailwind-merge`: ^3.0.1
  - `class-variance-authority`: ^0.7.1
  - `lucide-react`: ^0.475.0
  - `tailwindcss-animate`: ^1.0.7
- **Frontend Dev Dependencies:**
  - `vite`: ^6.1.0
  - `@vitejs/plugin-react`: ^4.3.4
  - `typescript`: ~5.7.3
  - `@types/react`: ^19.0.10
  - `@types/react-dom`: ^19.0.4
  - `@types/node`: ^22.13.4
  - `tailwindcss`: ^3.4.17
  - `postcss`: ^8.5.2
  - `autoprefixer`: ^10.4.20
- **Backend Dependencies (in `.venv` / `backend/requirements.txt`):**
  - `fastapi`: 0.141.1
  - `uvicorn`: 0.53.0
  - `pydantic`: 2.13.5
  - `starlette`: 1.6.0
  - `httpx`: 0.28.1
  - `pytest`: 9.1.1
  - `sqlalchemy`: 2.0.54 (Added in Checkpoint 2)
  - `alembic`: 1.20.0 (Added in Checkpoint 2)
  - `psycopg`: 3.3.5 / `psycopg-binary`: 3.3.5 (Added in Checkpoint 2)
  - `python-multipart`: 0.0.32 (Added in Checkpoint 2)

### Tests Executed & Results
- Backend test suite: `$env:PYTHONPATH="backend"; .venv\Scripts\pytest.exe backend\tests -v` -> 25 passed in 0.69s (100% pass rate: 1 health test, 8 project API/persistence tests, 6 storage security/sanitization tests, 10 artifact upload/download/isolation tests).
- Frontend production build: `npm.cmd run build` -> passed with 0 errors (built in 4.76s).
- Full live round-trip check via TestClient (health check -> create project -> upload artifact -> list projects with artifact count -> fetch details -> stream download artifact) -> 100% verified.

### Known Issues
- None unresolved.

---

# 31. CURRENTLY NOT IMPLEMENTED

At this checkpoint, the following are not yet implemented unless verified in the repository:

* authentication
* document text extraction & OCR
* document chunking & vector embeddings
* pgvector integration
* Gemini / LLM analysis integration
* LangGraph agent workflows
* requirement AI extraction
* requirement traceability matrix
* GitHub repository cloning & analysis
* code quality & static analysis (Semgrep, Bandit, Trivy)
* evaluation engine & scoring formulas
* evidence graph
* improvement planner
* jury simulator
* final readiness report dashboard

---

# 32. IMPORTANT ARCHITECTURAL DECISIONS

## Decision 1

Use deterministic analysis tools for facts and AI for interpretation.

Status:

Accepted.

## Decision 2

Keep evidence attached to important findings.

Status:

Accepted.

## Decision 3

Do not build a giant multi-agent architecture before the basic workflow works.

Status:

Accepted.

## Decision 4

MVP first, future scope later.

Status:

Accepted.

## Decision 5

Dual-mode relational database architecture (SQLAlchemy 2.0 + Alembic) with synchronous threadpool execution, supporting PostgreSQL in production and SQLite in testing with automated foreign key enforcement.

Status:

Accepted (Implemented in Checkpoint 2).

## Decision 6

Strict storage boundary enforcement with canonical path validation, cross-platform filename sanitization, 25 MB chunked upload limits, and transactional cleanup of orphaned disk files.

Status:

Accepted (Implemented in Checkpoint 2).

## Decision 7

Deterministic pure-Python document extraction (pypdf, python-docx, UTF-8/latin-1 plain text & markdown) with non-extractable types gracefully marked as `skipped_unsupported_type` without server errors.

Status:

Accepted (Implemented in Checkpoint 3).

## Decision 8

Single-copy raw text storage on disk (`storage/processed/{project_id}/{artifact_id}_extracted.txt`) with relational persistence of metadata, metrics, and outline sections; physical disk cleanup on artifact/project deletion.

Status:

Accepted (Implemented in Checkpoint 3).

## Decision 9

Strict "No Invention" rule for initial structured project understanding representation: fields default to `null` or `[]` unless explicitly backed by declared metadata or extracted document evidence, with explicit field-level provenance tracking.

Status:

Accepted (Implemented in Checkpoint 3).

---

# 33. KNOWN LIMITATIONS

At this stage:

* Starlette's multipart parser buffers uploads exceeding 1MB to OS temporary files before the route handler receives the stream; application-level chunking and size limits are actively enforced from that point.
* OCR is not implemented; scanned image-only PDFs yield empty text or skipped status as per Checkpoint 3 specification.
* ZIP archive decompression is intentionally out-of-scope for Checkpoint 3; archives are marked as `skipped_unsupported_type`.
* innovation cannot always be objectively verified
* Git activity does not represent total team contribution
* missing project artifacts limit evaluation accuracy
* AI interpretation can still be imperfect
* project readiness is an assessment, not certification
* external claims require appropriate sources
* security analysis depends partly on the tools and repository contents available

These limitations must remain visible in the system design.

---

# 34. CHECKPOINT 3 COMPLETION RECORD & NEXT ACTION

### Checkpoint 3 Record:
* **Current Stage**: Checkpoint 3 - Document Understanding & Deterministic Project Representation
* **Completed Features**:
  * Pure-Python deterministic document text extractors (`pypdf`, `python-docx`, UTF-8/latin-1 plain text / markdown reader).
  * Safe handling of unsupported artifact types (`.png`, `.jpg`, `.jpeg`, `.zip`) as `skipped_unsupported_type`.
  * Text normalization (CRLF -> LF, control character stripping, whitespace trimming, 5M character ceiling).
  * Structural heading and outline detection (`DocumentSection`).
  * Deterministic document metrics computation (character count, word count, line count, page count, SHA-256 hash).
  * Single-copy authoritative text storage on disk (`storage/processed/{project_id}/{artifact_id}_extracted.txt`).
  * Physical filesystem cleanup on artifact and project deletion (removing both raw uploads and processed texts).
  * Relational database models (`DocumentExtraction`, `ProjectUnderstanding`) and Alembic migration `20a05a1dd259`.
  * Deterministic structured project understanding synthesizer implementing the 11 dimensions defined in Section 11 (`problem`, `target_users`, `objectives`, `requirements_summary`, `modules`, `tech_stack`, `architecture_overview`, `dependencies`, `expected_scale`, `deployment`, `team`).
  * Strict "No Invention" rule: missing fields remain strictly `null` or `[]`.
  * Field-level provenance tracking referencing project metadata or source artifact sections.
  * 7 Resource-oriented REST APIs for single extraction, batch extraction, extractions listing, extraction details, raw text streaming, understanding generation, and understanding retrieval.
  * React frontend integration: Tabbed navigation (`Overview & Artifacts` vs `Structured Understanding`), extraction status badges, batch extraction trigger, raw text viewer modal with outline navigator, and full 11-dimension understanding card with provenance badges.
* **Files/Systems Added**:
  * `backend/app/models/document_extraction.py`, `backend/app/models/project_understanding.py`
  * `backend/alembic/versions/20a05a1dd259_create_document_extractions_and_project_.py`
  * `backend/app/services/documents/base.py`, `pdf_extractor.py`, `docx_extractor.py`, `text_extractor.py`, `fallback_extractor.py`, `normalizer.py`, `extraction_service.py`
  * `backend/app/services/analysis/understanding_service.py`
  * `backend/app/schemas/document.py`, `backend/app/schemas/understanding.py`
  * `backend/app/api/routes/documents.py`, `backend/app/api/routes/understanding.py`
  * `frontend/src/types/document.ts`, `frontend/src/types/understanding.ts`
  * `frontend/src/services/documents.ts`
  * `frontend/src/components/documents/DocumentExtractionBadge.tsx`, `ExtractedTextViewerModal.tsx`
  * `frontend/src/components/understanding/ProjectUnderstandingCard.tsx`
* **Tests**:
  * 45 passed backend tests (`pytest backend/tests -v`) covering all extractors, normalizer, API routes, permissions, isolation, and filesystem lifecycle cleanup.
  * TypeScript & Vite production build passed (`tsc -b && vite build`) with 0 errors.
* **Known Issues / Limitations**:
  * Remote repository has not been updated (commit pending user approval).
### Checkpoint 4 Record:
* **Current Stage**: Checkpoint 4 - Requirement Extraction & Requirement Traceability
* **Completed Features**:
  * Relational database models `Requirement` and `RequirementEvidence` with UUID primary keys, cascade behavior, and Alembic migration `7d91c33b40c7`.
  * Deterministic requirement extraction engine (`RequirementService`) implementing 3-pass extraction:
    - Pass 1: Project declared metadata requirements parsing.
    - Pass 2: Section-scoped outline matching under requirement headings.
    - Pass 3: RFC 2119 modal verb scanning ("shall", "must", "needs to") in prose documents.
  * Deterministic two-tier requirement identity:
    - Normalized SHA-256 content hashing (`content_hash`).
    - Stable human-readable sequential code assignment (`REQ-001`, `REQ-002`, ...).
    - Re-extraction state preservation: existing IDs remain stable without churn across re-runs.
  * Fine-grained M:N provenance tracking via `requirement_evidence` preserving source type, artifact ID, filename, section heading, page number, verbatim quote snippet, and confidence score without duplicating document bodies.
  * Strict "No Invention" rule: priority and actor remain strictly `None` unless explicitly supported in source evidence.
  * Deterministic categorization (`functional`, `non_functional`, `security`, `performance`, `interface`).
  * Exact duplicate consolidation and near-duplicate Jaccard similarity grouping.
  * Inter-document technical contradiction detection flagging conflicting specifications with `status="conflicted"`, `is_ambiguous=True`, and explanatory conflict summary.
  * 4 REST API endpoints mounted under `/api/projects/{project_id}/requirements`:
    - `POST /extract` (triggers deterministic extraction and returns summary)
    - `GET /` (lists requirements with category, status, ambiguity, and search filters)
    - `GET /{requirement_id}` (retrieves single requirement by UUID or REQ code with full provenance evidence)
    - `GET /summary` (calculates KPI distribution across categories, priorities, and conflicts)
  * React frontend integration:
    - Tab 3: `Requirements & Traceability` with live count badge.
    - `RequirementSummaryHeader` KPI cards and extraction trigger.
    - Filterable, searchable `RequirementList` with status badges and evidence links.
    - Interactive `RequirementEvidenceDrawer` modal displaying verbatim source citations and metadata.
* **Files/Systems Added**:
  * `backend/app/models/requirement.py`
  * `backend/alembic/versions/7d91c33b40c7_create_requirements_and_requirement_.py`
  * `backend/app/schemas/requirement.py`
  * `backend/app/services/analysis/requirement_service.py`
  * `backend/app/api/routes/requirements.py`
  * `backend/tests/test_requirements.py`
  * `frontend/src/types/requirement.ts`
  * `frontend/src/services/requirements.ts`
  * `frontend/src/components/requirements/RequirementSummaryHeader.tsx`
  * `frontend/src/components/requirements/RequirementList.tsx`
  * `frontend/src/components/requirements/RequirementEvidenceDrawer.tsx`
* **Tests**:
  * 56 passed backend tests (`pytest backend/tests -v`, 100% pass rate) covering metadata parsing, section parsing, modal verbs, determinism, stable identity, deduplication, conflict detection, isolation, cascade delete, and API endpoints.
  * TypeScript & Vite production build passed (`tsc -b && vite build`) with 0 errors.
* **Next Checkpoint**:
  * Checkpoint 5: GitHub Integration (Repository connection, repository metadata, file inspection, commit history, contributor activity).

```text
CHECKPOINT 3 (COMPLETED)
↓
CHECKPOINT 4 (COMPLETED)
↓
CHECKPOINT 5
GitHub Integration:
- Repository connection & authentication
- Repository metadata & file structure inspection
- Commit history & contributor activity analysis
```


---

# 35. CONTEXT UPDATE RULE

When a checkpoint is completed, update this file with:

```text
Current Stage
Completed Features
Files/Systems Added
Architecture Changes
Database Changes
Known Issues
Tests
Git Commit
Next Checkpoint
```

Keep this document accurate.

If something is uncertain, explicitly mark it as uncertain.

Never rewrite historical facts to make the project appear more complete than it is.
