Below is a **master project context** you can give to another AI at the
beginning of a coding session. It is written so that an AI with zero
previous conversation can understand the project.

------------------------------------------------------------------------

# Project Specification

# **Project Doctor**

### AI-Powered Technical Project Evaluation, Diagnosis, Improvement, and Jury Readiness Platform

------------------------------------------------------------------------

# 1. Problem Statement

Students frequently develop software, AI, hardware, and
interdisciplinary projects for college evaluations, technical expos,
hackathons, Smart India Hackathon-style competitions, semester projects,
and final-year projects.

However, most student teams do not have access to a reliable technical
evaluation process before presenting their projects.

A project may appear complete while containing problems such as:

-   poorly defined or weakly justified problem statements
-   unrealistic technical requirements
-   architecture that does not match the proposed system
-   missing functionality
-   mismatch between documentation and actual implementation
-   insecure code or exposed credentials
-   scalability claims unsupported by the architecture
-   insufficient testing
-   weak technical novelty
-   poor requirement coverage
-   uneven or unclear team contribution
-   inability to explain technical decisions during evaluation
-   inability to answer likely jury questions

Faculty members and competition judges face the opposite problem. They
may need to evaluate a large number of projects within limited time,
making detailed technical inspection of every project difficult.

Existing AI tools can generate code, summarize repositories, or answer
questions, but they generally do not provide a **structured,
evidence-backed evaluation of an entire technical project from proposal
through implementation**.

Therefore, the proposed system, **Project Doctor**, will act as an
AI-assisted technical project evaluator and improvement platform.

It will analyze a project's proposal, requirements, architecture,
documentation, and source repository; evaluate the project against a
configurable rubric; identify inconsistencies and risks; provide
evidence supporting its findings; generate an improvement plan; and
simulate technical jury questioning based on the project's actual
weaknesses.

The system is intended to **assist students and evaluators, not replace
human judges**.

------------------------------------------------------------------------

# 2. Core Objective

The goal is not simply to give a project a score.

The primary objective is:

> **To determine whether a technical project is coherent, feasible,
> sufficiently implemented, technically sound, well documented, and
> ready to be presented or evaluated, while identifying concrete
> weaknesses and explaining the evidence behind each finding.**

The system should answer five questions:

### 1. What is good about the project?

### 2. What is wrong or incomplete?

### 3. Why does the system believe something is wrong?

### 4. How should the team improve it?

### 5. Can the team defend the project when questioned?

------------------------------------------------------------------------

# 3. Target Users

## A. Student / Project Team

Primary user.

Use cases:

-   semester projects
-   mini projects
-   major/final-year projects
-   Tech Expo
-   hackathons
-   SIH-style competitions
-   startup prototypes
-   research prototypes

Typical question:

> "Is our project actually ready?"

------------------------------------------------------------------------

## B. Faculty / Project Guide

Faculty can use the system to:

-   evaluate project proposals
-   identify technically weak projects
-   monitor project progress
-   compare projects against a common rubric
-   identify missing requirements
-   review evidence before project presentations

------------------------------------------------------------------------

## C. Hackathon / Competition Organizer

Organizers can use the system for:

-   large-scale preliminary screening
-   standardized evaluation
-   identifying incomplete submissions
-   generating evaluation reports for judges
-   preparing judges with project-specific questions

The AI should **not make the final competition decision automatically**.

------------------------------------------------------------------------

# 4. Core Concept

The system follows this lifecycle:

``` text
Project Submission
        ↓
Project Understanding
        ↓
Evidence Collection
        ↓
Technical Evaluation
        ↓
Requirement Traceability
        ↓
Inconsistency Detection
        ↓
Risk & Weakness Diagnosis
        ↓
Improvement Plan
        ↓
Jury Simulation
        ↓
Final Readiness Report
```

------------------------------------------------------------------------

# 5. Inputs

A project may provide some or all of the following:

### Required for MVP

-   Project title
-   Problem statement
-   Project description
-   Project requirements
-   Technology stack
-   Architecture diagram

### Optional

-   GitHub repository
-   README
-   source code
-   database schema
-   API documentation
-   project report
-   presentation/PPT
-   screenshots
-   deployment information
-   test reports
-   team member information
-   hardware requirements
-   demo video/transcript

The system must handle projects where some artifacts are unavailable.

For example:

> A student may upload only a proposal before implementation.

The system should then perform a **proposal-stage evaluation**, rather
than falsely judging implementation quality.

------------------------------------------------------------------------

# 6. Major Features

# Feature 1: Project Understanding Engine

The system first builds a structured representation of the project.

It extracts:

``` text
Problem
Target users
Objectives
Requirements
Modules
Technologies
Architecture
Expected scale
Dependencies
Team structure
```

It should identify contradictions between different inputs.

Example:

> Proposal claims PostgreSQL.

But repository uses:

> SQLite.

The system reports:

> **Implementation mismatch detected.**

------------------------------------------------------------------------

# Feature 2: Multi-Criterion Project Evaluation

The project is evaluated against a configurable rubric.

### Default rubric

  Criterion                    Weight
  -------------------------- --------
  Problem Definition              15%
  Technical Feasibility           15%
  Technical Depth                 15%
  Architecture & Design           15%
  Implementation Quality          15%
  Innovation / Originality        10%
  Scalability                      5%
  Security & Reliability           5%
  Completeness                     5%

The weights must be configurable by the administrator.

### Important requirement

The AI must **never treat the score as absolute truth**.

Every score must be accompanied by:

-   explanation
-   evidence
-   detected limitations
-   confidence level

------------------------------------------------------------------------

# Feature 3: Evidence-Based Diagnosis

This is a core differentiating feature.

Every important AI finding should be traceable to evidence.

Example:

### Finding

> **Scalability concern**

### Evidence

``` text
Project documentation:
"Supports 10,000 concurrent users."

Detected architecture:
Single backend instance
SQLite database
No caching
No load-balancing strategy
```

### Diagnosis

> The current architecture does not provide sufficient evidence for the
> stated scalability claim.

### Recommendation

> Introduce a production-grade database, define horizontal scaling
> strategy, and benchmark expected concurrency.

The user should be able to click the evidence and inspect its source.

------------------------------------------------------------------------

# Feature 4: Requirement Traceability

Requirements should be transformed into structured entities.

Example:

``` text
R1 → User authentication
R2 → AI recommendation engine
R3 → Admin dashboard
R4 → Real-time notification
R5 → Analytics
```

The system then searches available project artifacts for implementation
evidence.

Output:

  Requirement   Evidence                  Status
  ------------- ------------------------- ----------------
  R1            `auth/`                   ✅ Implemented
  R2            `recommendation.py`       ✅ Implemented
  R3            `dashboard/`              ✅ Implemented
  R4            No implementation found   ❌ Missing
  R5            Partial evidence          ⚠️ Partial

This feature should calculate:

> **Requirement Coverage = implemented requirements / total
> requirements**

The system must explain how each status was determined.

------------------------------------------------------------------------

# Feature 5: Architecture Analysis

The system analyzes:

-   architecture diagrams
-   module relationships
-   APIs
-   databases
-   services
-   infrastructure
-   technology choices

It should identify:

-   missing components
-   unnecessary components
-   bottlenecks
-   single points of failure
-   architectural inconsistencies
-   mismatches between architecture and implementation

Example:

> Documentation shows a microservice architecture.

But repository contains:

> One monolithic Flask application.

The system reports:

> **Architecture/implementation inconsistency.**

------------------------------------------------------------------------

# Feature 6: Code & Repository Analysis

When GitHub or a repository is available, the system analyzes:

### Code quality

-   structure
-   complexity
-   duplication
-   error handling
-   maintainability

### Engineering practices

-   tests
-   documentation
-   dependency management
-   version control activity
-   code organization

### Security

-   exposed API keys
-   secrets
-   insecure configurations
-   dependency vulnerabilities
-   authentication weaknesses
-   authorization weaknesses
-   risky endpoints

Important architectural principle:

> **Use deterministic tools for deterministic checks and AI for
> interpretation.**

For example:

``` text
Static Analyzer
Security Scanner
Test Framework
        ↓
Structured Results
        ↓
AI Interpretation
```

Do not ask an LLM to guess whether an API key exists when a scanner can
check it directly.

------------------------------------------------------------------------

# Feature 7: Feasibility Analysis

The system evaluates whether the proposed project is realistic.

It considers:

-   hardware
-   software requirements
-   computing requirements
-   APIs
-   budget
-   expected users
-   deployment environment
-   development time
-   team size
-   technical complexity

Example:

> Team: 3 students Deadline: 30 days Proposed system: distributed AI +
> IoT + blockchain + mobile application + real-time analytics

The system may flag:

> **High implementation risk due to project scope relative to available
> development time.**

This should be presented as an **estimated risk**, not an objective
fact.

------------------------------------------------------------------------

# Feature 8: Team / Work Distribution Analysis

When GitHub and team information are available, the system can analyze
contribution patterns.

Example:

``` text
Member A → 63 commits
Member B → 48 commits
Member C → 6 commits
Member D → 2 commits
```

Potential finding:

> **Git activity appears highly concentrated among two members.**

Important:

The system must explicitly state:

> Git activity alone cannot establish actual contribution.

Students may contribute through:

-   research
-   hardware
-   design
-   testing
-   documentation
-   presentations

Therefore the system should **flag this for review rather than accuse a
team member of under-contributing**.

------------------------------------------------------------------------

# Feature 9: Innovation Analysis

This is one of the hardest components.

The system should NOT ask:

> "Is this innovative?"

and blindly output 9/10.

Instead it should analyze:

1.  Existing approaches
2.  Existing products/systems if supplied or discoverable
3.  Proposed approach
4.  Differences
5.  Technical significance of differences

Output:

> **Innovation assessment: Moderate**

With:

``` text
Existing approach:
X

Your approach:
Y

Difference:
Z

Technical significance:
Moderate

Limitation:
The core method is established, while the novelty primarily lies in integration.
```

This is much more defensible.

------------------------------------------------------------------------

# Feature 10: Risk Engine

The system categorizes findings:

### 🔴 Critical

Potentially blocks project readiness.

### 🟠 Major

Significant weakness that should be addressed.

### 🟡 Minor

Improvement recommended.

### 🟢 Strength

Positive evidence.

Example:

``` text
🔴 API credentials exposed
🟠 Missing requirement R7
🟠 Scalability claim unsupported
🟡 Documentation incomplete
🟢 Strong modular architecture
```

------------------------------------------------------------------------

# Feature 11: Improvement Planner

The system converts findings into an actionable roadmap.

Example:

``` text
Priority 1
Fix exposed credentials
Estimated effort: Low

Priority 2
Implement missing notification module
Estimated effort: Medium

Priority 3
Add automated tests
Estimated effort: Medium

Priority 4
Improve scalability documentation
Estimated effort: Low
```

The roadmap should be sorted based on:

-   severity
-   dependency
-   estimated effort
-   project deadline

------------------------------------------------------------------------

# Feature 12: Jury Simulator

This feature makes the project significantly more interesting.

The AI simulates different evaluator profiles.

### Technical Jury

Focus:

-   architecture
-   algorithms
-   implementation
-   scalability

### Security Jury

Focus:

-   authentication
-   authorization
-   privacy
-   threats

### Innovation Jury

Focus:

-   novelty
-   differentiation
-   problem relevance

### Industry Jury

Focus:

-   deployment
-   cost
-   users
-   scalability
-   business value

------------------------------------------------------------------------

# Feature 13: Weakness-Aware Question Generation

The jury simulator should not ask random generic questions.

It should use the **actual diagnosis**.

For example, if the system detects:

> Weak scalability justification

the jury asks:

> "How will your system handle 10,000 concurrent users?"

If the student answers:

> "We use FastAPI because it is fast."

the AI evaluates:

``` text
Relevance:  ✓
Technical depth: ❌
Evidence: ❌
Completeness: ❌
```

Then explains:

> Your answer mentions the framework but does not explain the database,
> concurrency model, caching, infrastructure, or scaling strategy.

This connects **Doctor → Diagnosis → Jury Simulation**.

------------------------------------------------------------------------

# Feature 14: Final Readiness Assessment

After improvements and jury simulation, the system generates:

``` text
PROJECT READINESS

Problem                 Ready
Requirements            Ready
Architecture            Ready
Implementation          Needs improvement
Security                Needs improvement
Documentation           Ready
Jury Preparation        Moderate

Overall status:
NOT READY

Critical actions remaining:
1. Fix authentication vulnerability
2. Implement R4
3. Add tests
```

Again, this is a **decision-support assessment**, not certification.

------------------------------------------------------------------------

# 7. What Makes It Agentic?

This is crucial because otherwise this becomes an LLM wrapper.

The system should behave as an **investigative workflow** rather than
simply responding to a prompt.

Example:

``` text
User uploads project
        ↓
Manager Agent
        ↓
"What information do I need?"
        ↓
Read proposal
        ↓
Inspect requirements
        ↓
Inspect architecture
        ↓
Inspect repository
        ↓
Detect inconsistency
        ↓
Investigate inconsistency
        ↓
Call security scanner
        ↓
Call code analyzer
        ↓
Correlate findings
        ↓
Generate diagnosis
        ↓
Create improvement plan
        ↓
Generate targeted jury questions
```

The agent should be capable of choosing **which investigation to perform
next based on what it discovers**.

------------------------------------------------------------------------

# 8. Proposed Agent Architecture

For the MVP:

``` text
                 Manager Agent
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
Project Analyst   Code Analyst     Requirement Analyst
       │               │                │
       ↓               ↓                ↓
Architecture     Security Tools    Traceability
Analyzer          + AI              Engine
       └───────────────┼────────────────┘
                       ↓
                  Risk Engine
                       ↓
             Improvement Planner
                       ↓
                Jury Simulator
```

You don't need every component to be an independent LLM agent.

Some should be deterministic services.

------------------------------------------------------------------------

# 9. MVP Scope

Given your **one-month timeframe**, the MVP should contain only:

### Inputs

-   project proposal
-   requirements
-   architecture
-   GitHub repository

### Evaluation

-   problem definition
-   feasibility
-   architecture
-   implementation
-   requirement coverage
-   security basics
-   documentation
-   basic innovation analysis

### Outputs

-   project health dashboard
-   evidence-backed findings
-   requirement matrix
-   improvement plan
-   jury simulator
-   final readiness report

That is already a substantial project.

------------------------------------------------------------------------

# 10. Future Scope

Once the MVP works:

### Version 2

-   continuous GitHub monitoring
-   automatic issue generation
-   PR analysis
-   test execution
-   deeper security analysis
-   dependency analysis
-   architecture visualization

### Version 3

-   faculty dashboard
-   multi-project comparison
-   hackathon organizer dashboard
-   configurable evaluation rubrics
-   historical project analytics

### Version 4

-   autonomous project-management agent
-   automatic GitHub task generation
-   project progress monitoring
-   team coordination
-   deployment verification

### Version 5

-   competition platform integrations
-   enterprise engineering evaluation
-   startup prototype assessment
-   research-prototype evaluation

------------------------------------------------------------------------

# 11. Tech Stack

I'd deliberately keep this relatively conventional.

## Frontend

**React + TypeScript**

-   Vite
-   Tailwind CSS
-   shadcn/ui
-   Recharts
-   React Router

Why TypeScript?

Because this project will have a lot of structured objects:

``` text
Project
Requirement
Finding
Evidence
Risk
Agent
Evaluation
```

Type safety will save you from some spectacularly stupid bugs later.

------------------------------------------------------------------------

# Backend

**Python + FastAPI**

Responsibilities:

-   authentication
-   project management
-   file processing
-   AI orchestration
-   GitHub integration
-   evaluation engine
-   report generation

------------------------------------------------------------------------

# Database

### PostgreSQL

Store:

-   users
-   projects
-   requirements
-   evaluations
-   findings
-   evidence references
-   reports
-   jury sessions
-   questions
-   answers

For the one-month MVP, you could develop locally with PostgreSQL or use
Docker.

------------------------------------------------------------------------

# AI Layer

Because you already have Google AI access, I'd use:

### Gemini API

for:

-   reasoning
-   project analysis
-   requirement extraction
-   architecture interpretation
-   report generation
-   jury simulation

You could later make the model provider configurable.

------------------------------------------------------------------------

# Agent Framework

For the MVP:

### LangGraph

This is useful because your workflow is naturally graph-like:

``` text
Analyze
  ↓
Investigate
  ↓
Need more evidence?
  ↓
Yes → retrieve
  ↓
Analyze again
```

But I would **not begin by building a giant multi-agent system**.

Start with a structured workflow and introduce agents where autonomous
branching is actually useful.

------------------------------------------------------------------------

# Repository Integration

### GitHub REST API / GitHub App

Use it for:

-   repository metadata
-   files
-   commits
-   issues
-   pull requests
-   contributors

Later:

-   GitHub Actions
-   automated testing
-   PR checks

------------------------------------------------------------------------

# Code Analysis

Use existing tools rather than reinventing them.

### Python

-   Ruff
-   Bandit
-   pytest
-   coverage.py

### JavaScript/TypeScript

-   ESLint
-   npm audit
-   Vitest/Jest

### General

-   Semgrep
-   Trivy

The exact tool set can depend on the languages detected in the
repository.

------------------------------------------------------------------------

# Security Analysis

Use:

**Semgrep**

for static security/code-pattern analysis.

**Trivy**

for dependency/container vulnerability detection.

Then give the structured results to the AI for interpretation.

------------------------------------------------------------------------

# Document Processing

For:

-   PDF
-   DOCX
-   Markdown
-   PPTX

Use Python libraries and parsers appropriate to each format.

For PDFs, extract text and preserve page references so findings can
cite:

> `proposal.pdf, page 7`

That is important for your **Evidence Graph**.

------------------------------------------------------------------------

# Vector Search / RAG

You'll probably need this.

### Option

**pgvector + PostgreSQL**

Store embeddings for:

-   project documents
-   requirements
-   README
-   source-code summaries
-   architecture descriptions

Then the AI can retrieve relevant evidence rather than putting the
entire repository into its context window.

------------------------------------------------------------------------

# Optional Object Storage

For uploaded files:

### MinIO locally

or

### S3-compatible storage

Later, for deployment.

------------------------------------------------------------------------

# Deployment

For your demo:

``` text
Frontend → Vercel
Backend  → Render/Railway
Database → PostgreSQL
```

Or Dockerize everything and run locally.

For a college demo, **local deployment is completely acceptable**. Don't
turn deployment into another project.

------------------------------------------------------------------------

# 12. Suggested Database Structure

At a high level:

``` text
users
  │
  └── projects
         │
         ├── requirements
         │
         ├── artifacts
         │      ├── proposal
         │      ├── architecture
         │      └── documentation
         │
         ├── github_repository
         │
         ├── evaluations
         │      ├── criterion_scores
         │      └── findings
         │
         ├── evidence
         │
         ├── improvement_tasks
         │
         └── jury_sessions
                ├── questions
                └── answers
```

------------------------------------------------------------------------

# 13. High-Level System Architecture

``` text
                       USER
                        │
                        ▼
               React + TypeScript
                        │
                        ▼
                    FastAPI
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
   Project Service   GitHub Service   File Service
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                 Agent Orchestrator
                     LangGraph
                        │
       ┌────────────────┼─────────────────┐
       ▼                ▼                 ▼
Project Analysis   Code Analysis   Requirement Analysis
       │                │                 │
       └────────────────┼─────────────────┘
                        ▼
                 Evaluation Engine
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
        Evidence Graph       Risk Engine
              │                    │
              └─────────┬──────────┘
                        ▼
                Improvement Planner
                        │
                        ▼
                  Jury Simulator
                        │
                        ▼
                  Final Report
                        │
                        ▼
                   PostgreSQL
```

------------------------------------------------------------------------

# 14. Recommended Project Development Order

Don't build it in the order listed above.

Build in this order:

### Phase 1

Project upload + database.

### Phase 2

Proposal/document analysis.

### Phase 3

Requirement extraction + traceability.

### Phase 4

GitHub integration.

### Phase 5

Code/security analysis.

### Phase 6

Evaluation engine.

### Phase 7

Evidence-backed findings.

### Phase 8

Improvement planner.

### Phase 9

Jury simulator.

### Phase 10

Dashboard + polish.

That gives you a usable product even if you run out of time.

------------------------------------------------------------------------

# 15. The Master Prompt / Context for an AI Coding Agent

This is the part you can paste into **Antigravity, Claude, Gemini,
Cursor, or another coding agent** before starting implementation:

``` text
PROJECT CONTEXT

Project Name:
Project Doctor

Project Type:
AI-powered technical project evaluation, diagnosis, improvement, and jury-readiness platform.

PROBLEM:
Students frequently build software, AI, hardware, and interdisciplinary projects for college evaluations, hackathons, technical expos, and project competitions without having access to a structured technical evaluation process before submission.

Projects may contain poorly defined requirements, unrealistic technical assumptions, architecture/implementation mismatches, missing functionality, security vulnerabilities, weak testing, unsupported scalability claims, insufficient documentation, or weak explanations of technical decisions.

Faculty and competition judges face the opposite challenge: they may have to evaluate many projects within limited time and cannot deeply inspect every proposal, architecture, repository, and implementation manually.

Project Doctor is designed to assist both groups.

CORE OBJECTIVE:
The system analyzes a technical project using its available artifacts, evaluates it against a configurable rubric, identifies weaknesses and inconsistencies, provides evidence supporting every major finding, generates an improvement plan, and simulates project-specific jury questions.

The system must assist human evaluation rather than replace human judges.

TARGET USERS:
1. Students/project teams
2. Faculty/project guides
3. Hackathon/competition organizers

PROJECT INPUTS:
- Project proposal
- Problem statement
- Requirements
- Architecture diagram
- Technology stack
- Documentation
- GitHub repository
- Source code
- Database schema
- Team information
- Deployment information
- Test results

MVP FEATURES:

1. Project Understanding
Extract:
- problem
- target users
- objectives
- requirements
- modules
- technologies
- architecture
- expected scale
- dependencies

2. Project Evaluation
Evaluate:
- problem definition
- technical feasibility
- technical depth
- architecture
- implementation
- security
- scalability
- innovation
- completeness
- documentation

3. Requirement Traceability
Map every requirement to implementation evidence and classify it as:
- implemented
- partially implemented
- missing
- unable to verify

4. Evidence-Based Diagnosis
Every major finding must include:
- finding
- severity
- explanation
- supporting evidence
- source location
- confidence/uncertainty
- recommendation

5. Repository Analysis
Analyze GitHub repositories for:
- code quality
- structure
- tests
- documentation
- dependency issues
- security issues
- implementation evidence
- contribution activity

6. Improvement Planner
Convert detected weaknesses into prioritized actions based on:
- severity
- dependency
- estimated effort
- project deadline

7. Jury Simulator
Generate project-specific technical questions using the actual project and detected weaknesses.

Jury categories:
- Technical
- Security
- Innovation
- Industry

The system should evaluate the student's answer based on:
- relevance
- technical correctness
- completeness
- evidence
- clarity

8. Final Readiness Report
Produce:
- criterion-level assessment
- project strengths
- critical issues
- requirement coverage
- improvement plan
- jury readiness
- final readiness status

AGENTIC BEHAVIOR:
The system should not simply send the entire project to an LLM and request a score.

It should perform an investigation workflow.

Example:
1. Read proposal.
2. Extract requirements.
3. Inspect architecture.
4. Inspect repository.
5. Compare documentation against implementation.
6. Detect inconsistencies.
7. Decide what additional evidence is needed.
8. Call deterministic analysis tools where appropriate.
9. Correlate all evidence.
10. Generate findings.
11. Generate recommendations.
12. Generate targeted jury questions.

The AI should decide what to investigate next based on earlier findings where practical.

IMPORTANT PRINCIPLES:

1. Do not invent evidence.
2. Distinguish facts from interpretations.
3. Every major finding must be evidence-backed.
4. If evidence is unavailable, explicitly state that it could not be verified.
5. Do not claim that AI evaluation is objectively correct.
6. Do not automatically accuse contributors of poor performance based solely on GitHub activity.
7. Use deterministic tools for deterministic checks.
8. Use AI for reasoning, interpretation, correlation, and natural-language analysis.
9. Keep sensitive project information private.
10. The system is decision support, not an autonomous judge.

TECH STACK:

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts

Backend:
- Python
- FastAPI

AI:
- Gemini API
- LangGraph for agent/workflow orchestration

Database:
- PostgreSQL
- pgvector

Repository integration:
- GitHub API / GitHub App

Security/code analysis:
- Semgrep
- Trivy
- Ruff
- Bandit
- ESLint
- npm audit
- pytest
- coverage.py

Storage:
- Local storage for MVP
- S3-compatible storage later

DEPLOYMENT:
- Docker
- Vercel for frontend if required
- Render/Railway for backend if required

MVP PRIORITY:
First make the following workflow work end-to-end:

Project Upload
→ Proposal Analysis
→ Requirement Extraction
→ GitHub Analysis
→ Requirement Traceability
→ Evidence-Based Findings
→ Project Evaluation
→ Improvement Plan
→ Jury Simulation
→ Final Report

Do not add unnecessary features until this workflow works reliably.

UI GOAL:
The system should feel like a professional project diagnostic platform, not a chatbot.

The dashboard should clearly show:
- project health
- strengths
- critical findings
- requirement coverage
- evidence
- improvement tasks
- jury readiness

Each AI finding should allow the user to inspect the evidence supporting it.
```

------------------------------------------------------------------------

# 16. What the MVP should look like when finished

A student opens Project Doctor.

``` text
┌──────────────────────────────────────────────┐
│ PROJECT DOCTOR                               │
├──────────────────────────────────────────────┤
│                                              │
│  LegalVault                                  │
│  Project Health: 78%                         │
│                                              │
│  ✅ Problem      Strong                      │
│  ✅ Architecture Good                       │
│  ⚠ Security      Needs work                 │
│  ⚠ Scalability   Needs evidence             │
│  ✅ Requirements 84% covered                │
│                                              │
│  🔴 2 Critical Findings                      │
│  🟠 5 Major Findings                         │
│  🟡 6 Improvements                           │
│                                              │
│  [ View Diagnosis ]                          │
│  [ Improvement Plan ]                        │
│  [ Start Jury Simulation ]                   │
│                                              │
└──────────────────────────────────────────────┘
```

Then:

**View Diagnosis**

↓

> **Finding: Blockchain justification is insufficient**

> Evidence: Proposal states blockchain is used for "security" but does
> not identify a trust requirement that requires decentralized
> verification.

↓

**Recommendation**

> Explicitly define the threat model and explain why conventional
> database integrity controls are insufficient.

↓

**Jury Simulation**

> *"Why did you use blockchain rather than PostgreSQL with cryptographic
> hashing?"*

That entire chain is the product:

**Analyze → Explain → Improve → Defend.**

------------------------------------------------------------------------

# 17. Product Direction Amendment --- 2026-09-19

This section supersedes any older assumptions about the user experience,
while preserving the technical/product scope above.

## Product North Star

Project Doctor is primarily a **college-student project evaluator and
helper**.

The product must help a student answer:

1.  Is my project coherent?
2.  Does my implementation match what I claim?
3.  What is weak, missing, risky, or inconsistent?
4.  What should I fix before my evaluation?
5.  Can I defend the project in front of a jury?

The product must NOT drift into being a generic document-management
system, legal-document system, repository browser, generic AI chatbot,
or enterprise admin dashboard.

Every feature must justify itself against the student evaluation
journey.

## User-First Product Flow

The preferred end-to-end experience is:

Create Project → Tell Project Doctor about the project in natural
language → Add optional project evidence → Project Doctor builds
structured understanding → Connect/inspect GitHub when available → Map
requirements to implementation evidence → Diagnose strengths, gaps,
inconsistencies and risks → Generate actionable improvement plan →
Practice with project-specific jury questions → Generate final
readiness/evaluation report

The UI should present this as a guided diagnostic journey rather than a
collection of database screens.

## Baseline Input UX

Project creation fields may include:

-   Project title
-   Problem statement
-   Project description
-   Rough goals/requirements
-   Technology stack
-   Architecture summary
-   GitHub URL

However, users should NOT be expected to manually type a long list of
formal FR-001/NFR-001 requirements unless they already have them.

The "Project Requirements" field is optional baseline context.

Detailed requirements should normally be extracted from project
documents such as SRS, proposal, README, architecture documents, etc.

Preferred wording for the UX is closer to:

"Known Goals & Requirements (Optional)" "Briefly describe what your
project should do. If your requirements are documented elsewhere, you
can upload them instead."

## Evidence Semantics

The product must clearly distinguish:

### Specification / Requirement Evidence

Where a requirement or project claim came from: - project metadata -
proposal - SRS - README - architecture document

### Implementation Evidence

Where the repository appears to implement or support the requirement: -
source files - API routes - components - configuration - database/schema
code - tests

### Test Evidence

Where behavior is actually tested or verified: - automated tests - test
reports - reproducible verification results

Do not visually or semantically imply that a quoted requirement from
project metadata or an SRS is GitHub implementation evidence.

A requirement being present in a document is NOT evidence that it is
implemented.

A repository file merely containing a matching word is NOT proof that a
requirement is implemented.

When traceability is introduced, use statuses such as
candidate/matched/ambiguous/unmatched only when supported by
deterministic evidence and clearly explain uncertainty.

## UX Direction

The final product should feel like a modern AI-powered technical
diagnostic platform for students.

It should NOT look like: - a CRUD admin panel - a spreadsheet/data
table - a document-management system - a generic enterprise dashboard -
a legal-document application

Design priorities: - clear hierarchy - short explanations - progressive
disclosure - visual summaries before raw evidence - cards and guided
sections where appropriate - readable evidence views - obvious next
actions - technical details available on demand rather than dominating
the first screen

The dashboard should emphasize: - project health/readiness - strengths -
critical findings - requirement coverage - evidence - improvement
tasks - jury readiness

Do not fill the interface with long technical text when a concise
explanation or visual summary is sufficient.

## Animation / Visual Design

Animation is encouraged when it improves comprehension and perceived
quality.

Potential uses: - landing-page project-analysis visual -
project-analysis progress states - scroll-based reveal of diagnostic
sections - health/finding transitions - requirement traceability
transitions - jury interaction

Use animation deliberately and keep it fast and accessible.

Higgsfield or other generated visual assets may be used for selected
hero/landing visuals, but generated visuals must support the product
story rather than become decorative clutter.

Do not add animation to every component.

## Architecture Principle

Continue to preserve:

**Deterministic systems establish facts. AI reasons over structured
evidence.**

The product should not become an LLM wrapper.

Document extraction, requirement identity, repository snapshots, file
classification, evidence provenance, hashing, idempotency, and
security-sensitive file handling should remain deterministic where
practical.

AI should later be used for: - semantic interpretation - correlation
across evidence - evaluation reasoning - natural-language findings -
improvement recommendations - jury simulation

## Scope Guardrail

Before implementing any feature, ask:

"Does this directly help a student understand, evaluate, improve, or
defend their technical project?"

If not, defer it.

Do not prioritize: - generic admin dashboards - unrelated enterprise
features - generic document management - unnecessary collaboration
features - decorative AI features - premature autonomous agents

## Current UI Bug

Known bug as of 2026-09-19:

When the user opens "View Text" after uploading a document, the
modal/window appears but scrolling affects the background project page
instead of the modal content.

Expected behavior: - modal content has its own vertical scroll -
background page scrolling is locked while the modal is open - long
extracted text remains readable - Escape closes the modal - modal layout
remains usable on smaller screens

This should be fixed before treating the affected document-viewing
experience as complete.

## Development Workflow Guardrail

For every checkpoint:

1.  Assistant gives PLAN-ONLY prompt.
2.  Antigravity inspects repository and returns its implementation plan.
3.  User brings the plan to the assistant.
4.  Assistant audits the plan against project context and scope.
5.  Assistant gives the approved implementation prompt.
6.  Antigravity implements.
7.  Antigravity returns walkthrough and tests.
8.  User manually verifies the actual UI/behavior.
9.  Assistant helps interpret the manual results and identify defects.
10. User commits/pushes only after verification passes.
11. Only then does the next checkpoint begin.

Never skip directly from a plan-only prompt to implementation. Never
start the next checkpoint before the current checkpoint is manually
verified and committed.

## Current Build State --- 2026-09-19

Completed and manually exercised: - project creation / metadata
foundation - artifact upload and deterministic document extraction -
structured project understanding - deterministic requirement extraction
and provenance - GitHub repository connection and repository evidence
foundation

Checkpoint 5 added repository evidence including: - repository
connection - commit-pinned snapshot - file catalog - language/binary
classification - ignored/sensitive-file handling - repository evidence
categories - sync/idempotency behavior - repository evidence UI

Current checkpoint state: - Checkpoint 5 implementation exists. - It
should NOT be considered committed/final until the remaining manual
verification is complete. - Current screenshots demonstrate both
document/metadata evidence and repository evidence, but
requirement-to-implementation traceability is NOT implemented yet.

## Next Checkpoint

After Checkpoint 5 manual verification and commit, the next functional
checkpoint should be:

### Checkpoint 6 --- Requirement → Implementation Traceability

Purpose: Connect structured requirements from project documents/metadata
with candidate implementation evidence from the pinned GitHub repository
snapshot.

Scope: - deterministic candidate matching - traceability records -
provenance - commit/snapshot identity -
candidate/matched/ambiguous/unmatched semantics - project isolation -
API - user-friendly traceability UI - tests

Explicitly out of scope for this checkpoint: - Gemini - LangGraph -
embeddings/vector search - pgvector - generic RAG - code-quality
scoring - security scanning - evaluation scoring - jury simulation -
improvement planning - full visual redesign

The traceability UI must be student-readable first and expose raw
evidence only when the user asks to inspect it.

## UX Evolution Plan

UX improvements should happen incrementally rather than as a giant final
rewrite.

Stage A --- immediate: - fix modal scrolling bug - remove confusing
evidence terminology - improve labels and empty states where
encountered - keep existing functionality stable

Stage B --- during core feature checkpoints: - make each new screen
user-first - show summary before technical detail - use progressive
disclosure for evidence - use clear next actions

Stage C --- dedicated product polish phase: - redesign dashboard around
project health - improve navigation around the student journey - add
meaningful animation/scroll transitions - create polished
landing/project-analysis experience - reduce CRUD/table feel - improve
responsive/mobile behavior - add visual storytelling

Do not postpone all UX until the end, but do not let visual polish block
core evidence architecture.

------------------------------------------------------------------------
