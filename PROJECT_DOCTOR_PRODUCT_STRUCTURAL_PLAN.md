# Project Doctor — Product Structural Plan

## 1. Product Direction

Project Doctor is an AI-assisted technical project evaluator for college students.

The product is organized around the student's journey:

> Understand → Investigate → Diagnose → Improve → Defend → Readiness

Checkpoints are internal implementation milestones only. They are not the student's mental model of the product.

### Product definition

> Project Doctor examines a student's project documents and GitHub repository, compares what the project claims with what can actually be evidenced, explains technical weaknesses and uncertainties, suggests concrete improvements, and prepares the student for technical evaluation or jury questions.

### Product north star

> Project Doctor investigates your project the way a technical evaluator would, then explains what it found, what you should fix, and how you should defend it.

### Core architectural principle

> Deterministic systems establish facts. AI reasons over structured evidence.

The student should experience one coherent evaluator, not a collection of backend systems exposed through a UI.

---

# 2. Student Problem

Students often know what they intended to build but do not know whether:

- their implementation actually supports their claims
- important functionality is missing
- technical weaknesses exist
- evidence is sufficient to prove a claim
- a reviewer could challenge an assumption
- a weakness matters technically
- they know enough to defend the project
- the project is ready for evaluation

Project Doctor should answer:

1. What does my project actually appear to be?
2. Does my implementation support what I claim?
3. What is weak, missing, inconsistent, or unverified?
4. Why does it matter?
5. What should I fix?
6. What evidence should I be ready to show?
7. What questions could a reviewer or jury ask?
8. Am I ready to defend this project?

Internal mechanisms such as requirement IDs, evidence hashes, traceability records, diagnostic IDs, and AI analysis records should not become the primary student experience.

Student-facing concepts should be:

- capabilities
- claims
- strengths
- problems
- risks
- unknowns
- evidence
- fixes
- jury questions
- readiness

---

# 3. Product Model

```text
                    PROJECT
                       |
          +------------+------------+
          |                         |
      DOCUMENTS                  GITHUB
          |                         |
          +------------+------------+
                       |
                PROJECT MODEL
                       |
          +------------+------------+
          |            |            |
        CLAIMS     CAPABILITIES   EVIDENCE
          |            |            |
          +------------+------------+
                       |
                 INVESTIGATION
                       |
                    DIAGNOSIS
                       |
              +--------+--------+
              |                 |
           IMPROVE            DEFEND
              |                 |
              +--------+--------+
                       |
                 READINESS
```

---

# 4. Final Student Journey

## Understand

The student sees what Project Doctor believes their project is.

It should explain:

- project purpose
- problem being solved
- target users
- major capabilities
- technologies
- architecture summary

Important interaction:

> "This is what I think your project is."

The student should be able to identify misunderstandings before deeper analysis.

## Investigate

The student starts one coherent project investigation through:

> Analyze Project

Project Doctor investigates documentation, GitHub, deterministic analysis, traceability, and AI reasoning.

## Diagnose

Diagnosis is the central product experience.

The student should see:

- Strengths
- Problems
- Risks
- Unknowns

Important conclusions should be explainable through evidence.

The intended reasoning chain is:

```text
Claim
  ↓
Evidence
  ↓
Interpretation
  ↓
Impact
```

## Improve

Each important problem should eventually become an actionable improvement containing:

- Problem
- Why it matters
- What to do
- Priority
- Evidence to add
- Possible jury question

## Defend

Project Doctor should eventually provide a project-specific defense simulator based on actual project evidence.

## Readiness

The final readiness experience should summarize:

- what is strong
- what still needs attention
- what should be fixed
- what questions should be prepared for
- what evidence remains missing

Do not reduce readiness to a meaningless single score.

---

# 5. Evidence Model

Evidence is a first-class product concept.

### Specification evidence

- project metadata
- proposal
- SRS
- README
- architecture documents

### Implementation evidence

- source files
- routes
- components
- configuration
- schema code
- entrypoints

### Test evidence

- automated tests
- test reports
- reproducible verification

A requirement quote is not implementation evidence.

A repository file containing a similar word is not automatically proof that the requirement is implemented.

A directory tree proves that a path exists. It does not prove that the implementation works.

The system must preserve these distinctions.

---

# 6. AI Responsibilities

AI is a reasoning layer, not the source of deterministic facts.

AI should help with:

- synthesizing project purpose
- interpreting cross-document/repository relationships
- comparing claims with implementation evidence
- explaining technical implications
- interpreting deterministic findings
- identifying nuanced inconsistencies
- expressing uncertainty
- identifying evidence gaps
- suggesting evidence that would reduce uncertainty
- proposing improvements
- generating project-specific jury questions
- eventually evaluating student defense answers

AI must not:

- invent evidence
- invent files
- invent UUIDs
- invent implementation
- invent tests
- establish deterministic facts
- provide unsupported claims
- repeat requirements unnecessarily
- summarize the entire repository
- provide generic software advice
- praise without evidence
- criticize without evidence
- fill schema fields with irrelevant content
- behave like a generic chatbot
- create arbitrary project-quality scores

When evidence is insufficient:

> I cannot verify this from the available evidence.

---

# 7. Current Technical Foundation

The current system already contains:

- project onboarding
- document/artifact processing
- document extraction
- project understanding
- requirement extraction and provenance
- GitHub integration
- repository snapshots
- repository classification
- implementation evidence
- traceability
- deterministic diagnosis
- AI evidence selection
- AI reasoning
- AI provider abstraction
- Pydantic AI output validation
- citation validation
- AI persistence
- retry/error handling
- student-facing project/diagnosis frontend

The current AI provider is Groq.

Current model:

> `openai/gpt-oss-120b`

The provider is configurable and existing Gemini/OpenRouter support should be preserved unless deliberately changed.

---

# 8. AI Processing Architecture

```text
Project
   ↓
Documents + GitHub
   ↓
Deterministic extraction
   ↓
Requirements / Claims
   ↓
Repository evidence
   ↓
Deterministic findings
   ↓
Traceability
   ↓
Evidence Selection
   ↓
Bounded AI Evidence Package
   ↓
Canonical Project Doctor Prompt
   ↓
AI Provider
   ↓
Structured AIAnalysisResult
   ↓
Pydantic Validation
   ↓
Citation Validation
   ↓
Persistence
   ↓
Diagnosis UI
```

---

# 9. Evidence Selection and Context Quality

The AI should reason over a bounded, high-value evidence package.

The system should prefer:

- important deterministic findings
- relevant claims/requirements
- requirement-to-implementation relationships
- implementation evidence
- test evidence
- relevant repository structure
- project context

The goal is:

> Better evidence, not simply more evidence.

Evidence selection should remain deterministic, bounded, reproducible, and citation-safe.

---

# 10. Frontend Direction

The established visual direction is:

- modern AI technical diagnostic platform
- dark/obsidian visual language
- polished cards
- glassmorphism where appropriate
- strong hierarchy
- progressive disclosure
- concise explanations
- guided sections
- meaningful visual summaries
- subtle motion
- premium but technical presentation

It must not feel like:

- CRUD software
- spreadsheet software
- generic enterprise software
- document management
- GitHub analytics
- generic chatbot UI

The student should feel:

> I am getting my project evaluated.

not:

> I am managing project records.

The frontend should evolve incrementally. Do not perform another large frontend rewrite unless explicitly approved.

---

# 11. Product Navigation

```text
Project
├── Overview
├── Understand
├── Analyze
├── Diagnosis
├── Improve
├── Jury
└── Readiness
```

Documents, repository evidence, requirements, and traceability remain supporting evidence rather than competing top-level destinations.

---

# 12. Development Principles

For every feature:

1. Start with the student problem.
2. Define the student goal.
3. Reuse existing systems.
4. Establish facts deterministically.
5. Add AI only where reasoning helps.
6. Keep evidence traceable.
7. Use progressive disclosure.
8. Avoid arbitrary scoring.
9. Update frontend and backend together when the feature is student-facing.
10. Test automatically and verify manually.

---

# 13. Current Development Focus

The current product-quality focus is:

> Evidence Selection & Context Quality

The purpose is to ensure the AI receives the right deterministic evidence before reasoning.

The expected student-facing benefit is:

- more specific diagnosis
- stronger claim-to-implementation comparisons
- better evidence references
- better identification of missing functionality
- better handling of uncertainty
- more useful improvement guidance
- more project-specific jury questions

---

# 14. Roadmap

## Phase A — Foundation

- Project Overview
- Project Understanding
- Analyze Project

## Phase B — Diagnosis

- Strengths
- Problems
- Risks
- Unknowns
- Evidence inspection

## Phase C — Improvement

- prioritized fixes
- concrete recommendations
- evidence needed
- verification after fixes

## Phase D — Defense

- project-specific jury questions
- student answers
- answer evaluation
- weak-area drilling

## Phase E — Readiness

- final project review
- remaining risks
- remaining evidence gaps
- jury preparation
- final report

---

# 15. Non-Goals

Do not turn Project Doctor into:

- generic document management
- generic requirement management
- generic GitHub analytics
- generic chatbot
- enterprise project management
- metric-heavy dashboards
- leaderboards
- arbitrary AI scoring
- requirement tables as the primary product
- backend-only feature collections

---

# 16. Definition of Success

A student should eventually be able to answer:

> What does my project claim to do?

> What did Project Doctor actually verify?

> What is weak or uncertain?

> Why does that matter?

> What should I fix?

> What will the jury probably ask?

> What evidence should I be ready to show?

If Project Doctor cannot answer those questions clearly, adding more technology is not the solution.

---

# 17. Product North Star

```text
MY PROJECT
    ↓
WHAT I CLAIM
    ↓
WHAT EXISTS
    ↓
WHAT CAN BE PROVEN
    ↓
WHAT IS WRONG / UNCERTAIN
    ↓
WHAT I SHOULD FIX
    ↓
WHAT I SHOULD DEFEND
```

Project Doctor exists to make that journey clear, evidence-grounded, student-friendly, and useful.
